# TARA Widget Persistence — "Zero-Disruption Session Handoff"
## The add-on approach: No iframe shell. No client site modifications. Just works.

---

## WHY THE IFRAME PORTAL APPROACH IS WRONG

The document you uploaded proposes wrapping client sites in an iframe shell.
This is invasive and breaks the fundamental promise: "TARA is a drop-in widget."

Problems with iframe approach:
- Client must restructure their entire app to load inside YOUR shell
- Breaks their SEO, deep linking, browser history, back button
- Auth cookies scoped to the child origin won't work transparently
- Client CSP headers will block iframe embedding of their own site
- Some sites (banking, enterprise) explicitly prevent framing via X-Frame-Options
- You're building a browser-inside-a-browser — fragile and slow

**The real question is: How do Intercom, Zendesk, Drift persist across page loads?**

Answer: **They don't keep the WebSocket alive. They do fast session resumption.**

---

## HOW THE INDUSTRY ACTUALLY DOES IT

### Intercom's Approach (proven at scale)
Intercom sets a first-party cookie (`intercom-session-{app_id}`) on the client's domain.
On every page load, the widget script re-initializes, reads the cookie, calls `boot()`
with the session identity, and the server restores the conversation state. The user
sees continuity — same conversation, same context — even though the WebSocket
connection was dropped and re-established.

Key insight: **Session state lives on the server. The WebSocket is stateless and
disposable. The cookie is the continuity mechanism.**

### Zendesk Chat's Approach
Uses `__zlcmid` cookie for visitor identity. On page reload, the widget reconnects
and the server replays the chat history. The connection is new, but the experience
is continuous.

### What SharedWorker / Service Worker Can't Do
SharedWorkers can theoretically persist a WebSocket across same-origin page loads.
But they have critical limitations: they die when the last tab closes during navigation
(the brief gap between old page unloading and new page loading kills the worker),
they don't work cross-subdomain, and browser support is inconsistent. Service Workers
can't hold WebSocket connections at all.

**Bottom line: Fast session resumption is the only robust approach.**

---

## THE PLAN: "ZERO-DISRUPTION SESSION HANDOFF"

### Architecture Overview

```
PAGE LOAD (any page, any subdomain)
  │
  ├─ 1. Widget JS loads (cached by browser, ~5KB)
  ├─ 2. Check cookie: tara_session_id exists?
  │     ├─ YES → Resume mode
  │     └─ NO  → Fresh mode
  │
  ├─ 3. Connect WebSocket with session_id
  │     Server: "I know this session. Here's the state."
  │     Returns: {
  │       goal_in_progress: "Show me the best reasoning model",
  │       step: 3,
  │       conversation_history: [...],
  │       page_graph: <cached in Redis>,
  │       voice_state: "was_speaking" | "was_listening" | "idle"
  │     }
  │
  ├─ 4. Widget restores UI state instantly
  │     - Show conversation history
  │     - Resume orb animation state
  │     - Re-scan DOM (new page, new elements)
  │     - Send updated PageGraph to server
  │
  ├─ 5. If mission was in progress:
  │     - Server receives new DOM from new page
  │     - TARA adapts: "I see we're on a new page now."
  │     - Continues mission OR re-plans based on new context
  │
  └─ 6. Voice: Re-establish audio WebSocket
        - If was_speaking: resume TTS from last position
        - If was_listening: re-activate STT immediately
        - Gap: ~300-500ms (imperceptible with fade animation)
```

### What the User Experiences

**Without persistence (current):**
> User: "Show me reasoning models"
> TARA: "Heading to the docs..." *clicks Docs link*
> *Page navigates to /docs* → **Widget dies. Session gone. User must start over.**

**With session handoff (new):**
> User: "Show me reasoning models"
> TARA: "Heading to the docs..." *clicks Docs link*
> *Page navigates to /docs* → Widget reloads in ~200ms
> TARA: "I'm on the Docs page now. Looking for Reasoning..."
> *Continues the mission seamlessly*

The key insight: **The navigation IS the action the agent intended.** When TARA
clicks a link that causes a full page load, that's not an error — it's progress.
The session handoff just needs to recognize "I caused this navigation" and continue.

---

## IMPLEMENTATION: 7 CHANGES

### Change 1: Session Cookie (Widget-Side)

```javascript
// tara-widget.js — Add at initialization

const COOKIE_NAME = 'tara_sid';
const COOKIE_DOMAIN = this.extractRootDomain(); // .davinciai.eu

setSessionCookie(sessionId) {
    // Set on root domain so ALL subdomains can read it
    const expires = new Date(Date.now() + 3600000).toUTCString(); // 1 hour
    document.cookie = `${COOKIE_NAME}=${sessionId}; ` +
        `domain=${COOKIE_DOMAIN}; ` +
        `path=/; ` +
        `expires=${expires}; ` +
        `SameSite=Lax; Secure`;
}

getSessionCookie() {
    const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    return match ? match[1] : null;
}

clearSessionCookie() {
    document.cookie = `${COOKIE_NAME}=; domain=${COOKIE_DOMAIN}; path=/; max-age=0`;
}

extractRootDomain() {
    // enterprise.davinciai.eu → .davinciai.eu
    // prometheus.davinciai.eu → .davinciai.eu
    // davinciai.eu → .davinciai.eu
    const parts = window.location.hostname.split('.');
    if (parts.length >= 2) {
        return '.' + parts.slice(-2).join('.');
    }
    return window.location.hostname;
}
```

### Change 2: Pre-Navigation State Snapshot (Widget-Side)

Before the page unloads, save critical state to `sessionStorage` (same-origin)
and the cookie (cross-subdomain).

```javascript
// tara-widget.js — Add to initialization

setupNavigationHandlers() {
    // Fires BEFORE the page unloads — last chance to save state
    window.addEventListener('beforeunload', () => {
        this.saveStateSnapshot();
    });

    // Also catch SPA-style navigation
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
        originalPushState.apply(history, args);
        this.onNavigationDetected();
    };
    window.addEventListener('popstate', () => this.onNavigationDetected());
}

saveStateSnapshot() {
    if (!this.sessionId) return;

    const snapshot = {
        session_id: this.sessionId,
        timestamp: Date.now(),
        was_speaking: this.isSpeaking,
        was_listening: this.isListening,
        had_active_mission: !!this.activeMission,
        mission_goal: this.activeMission?.goal || null,
        last_action: this.lastAction || null,
        last_url: window.location.href,
        ui_state: {
            orb_expanded: this.orbExpanded,
            chat_visible: this.chatVisible,
            muted: this.muted
        }
    };

    // sessionStorage: fast, same-origin only
    try {
        sessionStorage.setItem('tara_snapshot', JSON.stringify(snapshot));
    } catch(e) {}

    // Cookie: cross-subdomain, limited size (just session_id + flags)
    this.setSessionCookie(this.sessionId);

    // Signal server: "I'm about to navigate away"
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
            type: 'navigation_pending',
            session_id: this.sessionId,
            from_url: window.location.href,
            caused_by_agent: !!this.lastAction // Did TARA cause this navigation?
        }));
    }
}

onNavigationDetected() {
    // SPA navigation — no page reload, just URL change
    // Re-scan DOM and notify server of URL change
    setTimeout(() => {
        const newDom = this.scanPageBlueprint(true);
        if (newDom && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'dom_update',
                url: window.location.href,
                elements: newDom
            }));
        }
    }, 500); // Wait for new page content to render
}
```

### Change 3: Fast Resume on Load (Widget-Side)

```javascript
// tara-widget.js — Modify initialization flow

async initialize() {
    // Check for existing session
    const existingSessionId = this.getSessionCookie();
    let snapshot = null;

    try {
        const raw = sessionStorage.getItem('tara_snapshot');
        if (raw) snapshot = JSON.parse(raw);
    } catch(e) {}

    if (existingSessionId && snapshot && (Date.now() - snapshot.timestamp < 30000)) {
        // RESUME MODE: Session exists and snapshot is fresh (< 30 seconds old)
        await this.resumeSession(existingSessionId, snapshot);
    } else if (existingSessionId) {
        // RECONNECT MODE: Session exists but no recent snapshot (tab was idle)
        await this.reconnectSession(existingSessionId);
    } else {
        // FRESH MODE: No session
        await this.freshStart();
    }
}

async resumeSession(sessionId, snapshot) {
    this.sessionId = sessionId;

    // 1. Restore UI state immediately (no server round-trip needed)
    this.orbExpanded = snapshot.ui_state.orb_expanded;
    this.chatVisible = snapshot.ui_state.chat_visible;
    this.muted = snapshot.ui_state.muted;
    this.renderUI(); // Show widget instantly in previous state

    // 2. Connect WebSocket with resume flag
    await this.connectWebSocket({
        session_id: sessionId,
        resume: true,
        from_url: snapshot.last_url,
        to_url: window.location.href,
        caused_by_agent: snapshot.last_action !== null,
        had_active_mission: snapshot.had_active_mission
    });

    // 3. Scan new page DOM immediately
    const newDom = this.scanPageBlueprint(true);
    if (newDom) {
        this.ws.send(JSON.stringify({
            type: 'session_resumed',
            url: window.location.href,
            elements: newDom,
            previous_url: snapshot.last_url,
            mission_active: snapshot.had_active_mission,
            mission_goal: snapshot.mission_goal
        }));
    }

    // 4. Re-establish audio if was active
    if (snapshot.was_listening && !snapshot.muted) {
        setTimeout(() => this.startListening(), 300);
    }

    // Clean up snapshot
    sessionStorage.removeItem('tara_snapshot');
}
```

### Change 4: Server-Side Session Persistence (Backend)

```python
# ws_handler.py — Modify connection handler

async def handle_websocket(websocket):
    """Handle new WebSocket connections, including resumed sessions."""

    # Read first message to determine mode
    init_msg = await websocket.recv()
    data = json.loads(init_msg)

    if data.get("resume"):
        session = await handle_session_resume(websocket, data)
    else:
        session = await handle_fresh_session(websocket, data)

    # ... continue with normal message loop


async def handle_session_resume(websocket, data):
    """Resume an existing session after page navigation."""
    session_id = data["session_id"]

    # Load session from Redis (where ALL state lives)
    session = await redis.get(f"tara:session:{session_id}")
    if not session:
        # Session expired — start fresh
        return await handle_fresh_session(websocket, data)

    session = json.loads(session)

    # Update session with new connection
    session["websocket"] = websocket
    session["current_url"] = data["to_url"]
    session["previous_url"] = data["from_url"]
    session["resume_count"] = session.get("resume_count", 0) + 1

    logger.info(f"Session {session_id} resumed "
                f"({data['from_url']} → {data['to_url']}, "
                f"mission_active={data.get('mission_active')})")

    # If agent caused this navigation (clicked a link), treat as successful action
    if data.get("caused_by_agent") and session.get("pending_action"):
        await handle_agent_navigation_success(session, data)

    # Send session state back to widget
    await websocket.send(json.dumps({
        "type": "session_restored",
        "conversation_history": session.get("conversation_history", [])[-10:],
        "active_mission": session.get("active_mission"),
        "step_number": session.get("step_number", 0)
    }))

    return session


async def handle_agent_navigation_success(session, data):
    """
    The agent clicked a link that caused a full page navigation.
    This is a SUCCESSFUL action, not an error.
    """
    pending = session.get("pending_action", {})
    old_url = data["from_url"]
    new_url = data["to_url"]

    logger.info(f"Agent-caused navigation detected: "
                f"{pending.get('type')} on {pending.get('target_id')} "
                f"caused {old_url} → {new_url}")

    # Validate: URL actually changed (the click worked)
    if new_url != old_url:
        session["validation"] = {
            "success": True,
            "reason": f"Navigation: {old_url} → {new_url}",
            "signal": "full_page_navigation"
        }

        # Advance sub-goal if this was a navigation step
        if session.get("goal_plan"):
            current_subgoal = session["goal_plan"].get("current_subgoal")
            if current_subgoal and current_subgoal.get("type") == "navigate":
                session["goal_plan"]["current_subgoal"]["status"] = "done"
                session["goal_plan"]["subgoal_index"] = \
                    session["goal_plan"].get("subgoal_index", 0) + 1

    # Clear pending action
    session["pending_action"] = None
```

### Change 5: "Pending Action" Tracking (Backend)

Before executing any click action, mark it as "pending" in Redis.
If the page reloads, the resumed session knows what action caused it.

```python
# visual_orchestrator.py — Before sending action to widget

async def execute_action(self, session, action):
    """Send action to widget, tracking it as pending."""

    if action["type"] == "click":
        # Mark this action as pending — if page navigates, we'll know why
        session["pending_action"] = {
            "type": "click",
            "target_id": action.get("target_id"),
            "expected_outcome": action.get("expected_outcome", ""),
            "timestamp": time.time()
        }
        await self.redis.set(
            f"tara:session:{session['id']}",
            json.dumps(session),
            ex=600  # 10 min TTL
        )

    # Send action to widget
    await session["websocket"].send(json.dumps({
        "type": "action",
        "payload": action
    }))
```

### Change 6: Mission Continuity After Resume (Backend)

When a session resumes with an active mission, immediately plan the next step
using the new page's DOM.

```python
# ws_handler.py — Handle the session_resumed message from widget

async def handle_session_resumed_message(session, data):
    """Widget has loaded on new page and sent us the DOM."""

    new_url = data["url"]
    new_dom = data["elements"]
    mission_active = data.get("mission_active", False)
    mission_goal = data.get("mission_goal")

    # Update page graph with new DOM
    page_graph = await update_page_graph(session["id"], new_dom, new_url)

    if mission_active and mission_goal:
        # The mission is still going — plan next step immediately
        logger.info(f"Mission continues on new page: {mission_goal}")

        # Give TARA brief context about the navigation
        session["conversation_history"].append({
            "role": "system",
            "content": f"Page navigated to {new_url}. New DOM loaded."
        })

        # Plan next step with new page context
        plan = await orchestrator.plan_next_step(
            goal=mission_goal,
            dom_context=new_dom,
            current_url=new_url,
            session=session
        )

        # Send plan to widget
        await session["websocket"].send(json.dumps({
            "type": "plan",
            "payload": plan
        }))
    else:
        # No active mission — just acknowledge the new page
        await session["websocket"].send(json.dumps({
            "type": "context_updated",
            "url": new_url,
            "element_count": len(new_dom)
        }))
```

### Change 7: Graceful Audio Handoff (Widget-Side)

The voice connection is the most fragile part. Here's how to make it seamless:

```javascript
// tara-widget.js — Audio reconnection

async reconnectAudio(wasListening, wasSpeaking) {
    // 1. Show visual indicator that audio is reconnecting
    this.showReconnectingState(); // Subtle pulse animation on orb

    // 2. Reconnect audio WebSocket
    try {
        await this.connectAudioWebSocket();

        // 3. If was listening, restart STT with a fade-in
        if (wasListening) {
            // Brief delay so the mic doesn't catch the page-load sounds
            await this.sleep(400);
            await this.startListening();
        }

        // 4. If agent was speaking, the server will re-send any pending TTS
        // (The server buffers the last TTS chunk and replays on reconnect)

        this.hideReconnectingState();
    } catch(e) {
        console.warn('Audio reconnect failed, will retry:', e);
        // Retry with backoff
        setTimeout(() => this.reconnectAudio(wasListening, false), 2000);
    }
}

// Visual transition during handoff
showReconnectingState() {
    // Don't show "disconnected" — just show a brief subtle transition
    // The orb dims slightly and pulses, then brightens when reconnected
    this.orbElement?.classList.add('tara-reconnecting');
}

hideReconnectingState() {
    this.orbElement?.classList.remove('tara-reconnecting');
}
```

```css
/* Add to widget styles */
.tara-reconnecting {
    opacity: 0.6;
    animation: tara-reconnect-pulse 0.8s ease-in-out;
}

@keyframes tara-reconnect-pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 0.6; }
}
```

---

## THE CRITICAL INNOVATION: "AGENT-CAUSED NAVIGATION" DETECTION

This is what makes TARA different from Intercom/Zendesk. Those tools just
persist CHAT state. TARA must persist NAVIGATION state — because the agent
itself causes page loads by clicking links.

The flow:

```
1. Agent decides: "Click the 'Docs' link" (action sent to widget)
2. Widget marks: pendingAction = {type: "click", target: "docs-link"}
3. Widget clicks the element
4. Link causes full page navigation → page unloads
5. beforeunload fires → saveStateSnapshot() runs
   - Saves: caused_by_agent = true, last_action = "click docs-link"
   - Sends: navigation_pending to server (if WS still open)
6. New page loads → widget re-initializes
7. Widget reads snapshot: caused_by_agent = true
8. Widget connects WS with resume = true
9. Server sees: session has pending_action + new URL is different
   → "The agent's click worked! Advance the sub-goal."
10. Server plans next step using NEW page's DOM
11. TARA continues: "I'm on the Docs page now. Looking for Reasoning..."
```

Without this, every agent-caused navigation looks like a crash/disconnect.
With this, it looks like a successful step.

---

## SESSION STATE IN REDIS (Complete Schema)

```python
# What gets stored in Redis for each session

session_state = {
    "id": "xFrO4A46AQY8t3wS-J_Uyw",
    "created_at": 1739540791.0,
    "last_active": 1739540850.0,
    "resume_count": 2,               # How many times this session has been resumed

    # Connection state (ephemeral — not the WebSocket itself, just metadata)
    "current_url": "https://console.groq.com/docs/reasoning",
    "previous_url": "https://console.groq.com/home",
    "current_domain": "console.groq.com",

    # Mission state (the core of persistence)
    "active_mission": True,
    "mission_goal": "Show me the best reasoning model",
    "goal_plan": {
        "subgoals": [
            {"desc": "Navigate to Docs", "status": "done"},
            {"desc": "Click Reasoning link", "status": "active", "attempts": 0},
            {"desc": "Read model table", "status": "pending"}
        ],
        "subgoal_index": 1
    },
    "step_number": 2,
    "action_history": [
        {"step": 0, "action": "click", "target": "t-10wvbq3", "outcome": "navigated to /docs"},
        {"step": 1, "action": "scroll", "target": "", "outcome": "revealed sidebar"}
    ],

    # Pending action (for agent-caused navigation detection)
    "pending_action": {
        "type": "click",
        "target_id": "t-3omgce",
        "expected_outcome": "Navigate to Reasoning docs",
        "timestamp": 1739540848.0
    },

    # Conversation history (for TTS/STT continuity)
    "conversation_history": [
        {"role": "user", "text": "Show me the best reasoning model"},
        {"role": "agent", "text": "Heading to the docs to find reasoning models."},
        {"role": "agent", "text": "I see the docs sidebar. Looking for Reasoning..."}
    ],

    # Page graph (cached DOM — see v5 architecture)
    "page_graph_key": "tara:spg:xFrO4A46AQY8t3wS-J_Uyw",

    # Voice state
    "voice_state": "listening",  # idle | listening | speaking
    "last_tts_text": "Looking for Reasoning...",

    # Reflexion memory (self-corrections)
    "reflexion_memory": [],

    # Client metadata
    "user_agent": "...",
    "client_id": "demo"
}
```

TTL: 600 seconds (10 minutes). Extended on every activity.
Size: ~2-4 KB per session. Redis can handle millions of these.

---

## WHAT THE CLIENT NEEDS TO DO (Almost Nothing)

### Minimal Integration (1 script tag):
```html
<!-- Add to every page, or to the shared layout/template -->
<script
  src="https://cdn.davinciai.eu/tara-widget.min.js"
  data-agent-id="their-agent-id"
  data-api-url="wss://api.davinciai.eu/ws"
  async
></script>
```

That's it. No iframe. No modifications to their app. No auth sharing.
The widget handles everything: cookie management, session resumption,
DOM scanning, voice reconnection.

### For subdomain persistence specifically:
The cookie is set on `.davinciai.eu`, so it works across:
- `davinciai.eu`
- `enterprise.davinciai.eu`
- `prometheus.davinciai.eu`

For EXTERNAL clients (e.g., `client-site.com`):
The cookie is set on `.client-site.com` — works across their subdomains.
Cross-domain (different root domains) would require a token-based approach
instead of cookies, which is a separate enhancement.

---

## TIMING EXPECTATIONS

| Event | Duration | User Perception |
|-------|----------|-----------------|
| Page unload → new page starts loading | ~100ms | Normal navigation |
| Widget JS loads (cached) | ~50ms | Instant (browser cache) |
| Cookie read + snapshot restore | ~5ms | Instant |
| WebSocket connect + resume handshake | ~100-200ms | Orb appears with subtle pulse |
| DOM scan of new page | ~30-50ms | Invisible |
| Server processes resume + plans next step | ~200-1500ms | TARA speaks next instruction |
| Audio WebSocket reconnect + STT restart | ~300-500ms | Brief silence, then active |
| **Total gap** | **~500-800ms** | **Feels like a brief pause** |

Compare: Full restart without persistence = 3-5 seconds + lost context.

---

## MIGRATION STEPS (Ordered)

1. **Add cookie management to tara-widget.js** (30 min)
   - `setSessionCookie`, `getSessionCookie`, `clearSessionCookie`
   - Set on root domain for cross-subdomain support

2. **Add beforeunload handler** (30 min)
   - `saveStateSnapshot` writes to sessionStorage + cookie
   - Sends `navigation_pending` to server if WS is open

3. **Add resume flow to widget initialization** (1 hour)
   - Check cookie → load snapshot → connect with `resume: true`
   - Restore UI state before server responds

4. **Add session persistence to Redis on backend** (1 hour)
   - Store full session state on every action
   - `handle_session_resume` reads from Redis, restores state

5. **Add pending_action tracking** (30 min)
   - Mark click actions as pending before execution
   - On resume: check if pending_action caused the navigation

6. **Add mission continuity** (1 hour)
   - `handle_session_resumed_message`: receive new DOM, plan next step
   - "Agent-caused navigation" detection and sub-goal advancement

7. **Add audio reconnection** (30 min)
   - Reconnect audio WS with fade-in animation
   - Re-establish STT/TTS based on previous voice state

**Total: ~5 hours of implementation for a production-ready solution.**
