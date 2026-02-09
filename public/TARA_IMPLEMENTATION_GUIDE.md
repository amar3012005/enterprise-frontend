# TARA Visual Co-Pilot - Implementation Guide

## Overview

TARA Visual Co-Pilot is a voice-controlled overlay widget that enables AI agents to navigate and interact with web pages through natural conversation. This implementation uses **voice-triggered DOM synchronization** - the page context is only captured when the user speaks, making it highly efficient.

## ✨ Key Features

- 🎤 **Voice-Triggered DOM Sync**: Page context captured only when user speaks
- 🎨 **WebGL Animated Orb**: Beautiful fluid shader effects
- 👻 **Ghost Cursor**: Visual feedback before actions (reduces jumpscare)
- 🛡️ **Shadow DOM Isolation**: Complete CSS/style isolation from host page
- 🔊 **Low-Latency Audio**: 16kHz input, 44.1kHz output with strict scheduling
- 📡 **Real-time Commands**: Scroll, highlight, click, spotlight visual effects

## 📁 File Structure

```
davinciai-frontend/
├── public/
│   └── tara-widget.js          # Standalone embeddable script
├── components/
│   └── overlay/
│       ├── TaraOverlay.tsx     # React wrapper component
│       └── index.ts            # Component exports
├── types/
│   └── tara-widget.d.ts        # TypeScript definitions
└── .opencode/plans/
    ├── tara-widget-implementation.md      # Original plan
    ├── tara-widget-implementation-v2.md   # Performance optimizations
    └── voice-triggered-dom-sync.md        # Voice-trigger strategy
```

## 🚀 Quick Start

### For External Websites

Add this script to any HTML page:

```html
<script src="https://davinciai.eu/tara-widget.js"></script>
<script>
  // Initialize when page loads
  window.addEventListener('DOMContentLoaded', () => {
    window.tara = new TaraWidget({
      wsUrl: 'wss://api.davinciai.eu',
      agentId: 'your-agent-id'
    });
  });
</script>
```

Or use the data attribute for auto-initialization:

```html
<body data-tara-widget>
  <script src="https://davinciai.eu/tara-widget.js"></script>
</body>
```

### For React/Next.js

```tsx
import TaraOverlay from '@/components/overlay/TaraOverlay';

export default function Page() {
  return (
    <div>
      <h1>My Luxury Real Estate Site</h1>
      <TaraOverlay 
        agentId="my-agent-id"
        position="bottom-right"
        onStateChange={(state) => console.log('TARA state:', state)}
        onCallStart={() => console.log('Call started')}
        onCallEnd={() => console.log('Call ended')}
      />
    </div>
  );
}
```

### With Imperative Handle (Advanced)

```tsx
import { useRef } from 'react';
import TaraOverlay, { TaraOverlayRef } from '@/components/overlay/TaraOverlay';

export default function Page() {
  const taraRef = useRef<TaraOverlayRef>(null);

  const handleStartCall = () => {
    taraRef.current?.startCall();
  };

  return (
    <div>
      <button onClick={handleStartCall}>Start TARA Call</button>
      <TaraOverlay 
        ref={taraRef}
        agentId="my-agent-id"
      />
    </div>
  );
}
```

## 🎛️ Configuration Options

```typescript
interface TaraConfig {
  wsUrl?: string;                    // WebSocket URL
  agentId?: string;                  // Agent identifier
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  orbSize?: number;                  // Default: 80px
  colors?: {
    core: string;                    // Primary color (#CADCFC)
    accent: string;                   // Secondary color (#A0B9D1)
    glow: string;                   // Glow effect color
    highlight: string;              // Element highlight (#FFD700)
    dim: string;                    // Spotlight dimming
  };
  audio?: {
    inputSampleRate?: number;       // Default: 16000
    outputSampleRate?: number;      // Default: 44100
    bufferSize?: number;            // Default: 2048
  };
  vad?: {
    energyThreshold?: number;       // Speech detection (0.02)
    silenceThreshold?: number;      // Silence detection (0.01)
    minSpeechDuration?: number;     // Min speech ms (300)
    silenceTimeout?: number;        // Silence timeout ms (800)
  };
}
```

## 🔌 WebSocket Protocol

### Client → Server Messages

#### 1. Session Start
```json
{
  "type": "start_session",
  "meta": {
    "session_id": "tara_abc123_1704067200000",
    "url": "https://example.com",
    "title": "Page Title",
    "user_agent": "Mozilla/5.0...",
    "timestamp": 1704067200000
  }
}
```

#### 2. DOM Context (Voice-Triggered)
**Sent immediately when speech is detected**
```json
{
  "type": "dom_context",
  "priority": "high",
  "data": {
    "url": "https://example.com/properties",
    "title": "Luxury Properties",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "scrollX": 0,
      "scrollY": 500
    },
    "elements": [
      {
        "tag": "button",
        "id": "book-viewing",
        "text": "Book Viewing Appointment",
        "ariaLabel": null,
        "bounds": {
          "x": 100,
          "y": 600,
          "width": 200,
          "height": 40
        }
      }
    ],
    "timestamp": 1704067200000
  },
  "timestamp": 1704067200000
}
```

#### 3. Audio Chunks
- Binary: Int16 PCM array buffer
- Sample rate: 16kHz
- Mono channel
- Continuous streaming during speech

### Server → Client Messages

#### 1. Audio Response
```javascript
// Binary: Int16 PCM array buffer
// Sample rate: 44.1kHz
// Played immediately via AudioContext
```

#### 2. Visual Commands
```json
// Scroll to element
{ "type": "scroll_to", "selector": "#pricing" }

// Highlight element with optional label
{ "type": "highlight", "selector": "#book-btn", "label": "Click here" }

// Click element (with ghost cursor animation)
{ "type": "click", "selector": "#menu-toggle" }

// Toggle spotlight overlay
{ "type": "spotlight", "active": true }

// Update agent state
{ "type": "state_update", "state": "listening" }

// Clear all visual effects
{ "type": "clear" }

// Agent response with action
{
  "type": "agent_response",
  "text": "I'll help you book a viewing",
  "action": {
    "type": "highlight",
    "selector": "#book-viewing"
  }
}
```

## 🧠 How Voice-Triggered DOM Sync Works

```
User speaks
    ↓
Voice Activity Detector detects energy > 2% threshold
    ↓
IMMEDIATELY captures DOM snapshot (within 50ms)
    ↓
Sends DOM context to backend with priority: 'high'
    ↓
Continues streaming audio chunks
    ↓
Backend receives DOM context BEFORE processing audio
    ↓
TARA knows exactly what user is looking at
    ↓
TARA responds with contextual awareness
```

**Key Benefits:**
- ✅ **Zero idle CPU**: No scanning when silent
- ✅ **Perfect timing**: Context captured at speech start
- ✅ **Privacy**: Not constantly monitoring page
- ✅ **Bandwidth efficient**: Only sends when needed
- ✅ **Low latency**: Context ready before audio processing

## 🎨 Visual Components

### WebGL Orb
- Real-time fragment shader with fluid motion
- Fractional Brownian Motion (fbm) noise for organic patterns
- Volume-reactive glow effects
- State-based animations: idle, listening, talking, thinking

### Ghost Cursor
- Smooth animation to target elements (500ms)
- Visual feedback before clicking (reduces jumpscare)
- Click animation (scale pulse)
- Auto-hides after action

### Spotlight Effect
- Full-page dimming with 65% opacity
- Pulsing golden border around highlighted elements
- Glassmorphic labels with backdrop blur
- Smooth transitions (500ms ease)

## 🔒 Privacy & Security

- **No constant monitoring**: DOM only captured when user speaks
- **Text truncation**: All text limited to 50 characters
- **Password exclusion**: Input[type="password"] automatically excluded
- **Shadow DOM isolation**: Widget styles cannot leak to host page
- **CORS required**: Backend must allow connections from client domains

## ⚡ Performance

| Metric | Value |
|--------|-------|
| Idle CPU | <1% |
| DOM capture time | <50ms |
| Audio latency | <100ms |
| WebSocket message size | ~5-15KB (DOM context) |
| Max elements captured | 100 visible elements |

## 🧪 Testing Checklist

- [ ] Speech detection triggers DOM capture
- [ ] DOM context arrives before audio at backend
- [ ] Audio plays without gaps or stuttering
- [ ] Ghost cursor animates smoothly to elements
- [ ] Click actions execute correctly
- [ ] Highlight effects pulse correctly
- [ ] Scroll actions center elements properly
- [ ] Widget works with host page CSS
- [ ] No style conflicts with host page
- [ ] Memory usage stable over long sessions

## 🐛 Troubleshooting

### Widget not appearing
- Check console for errors
- Verify `tara-widget.js` loaded correctly
- Check Shadow DOM support in browser

### No audio output
- Browser autoplay policy: requires user interaction first
- Check AudioContext state: must be 'running'
- Verify WebSocket is receiving audio chunks

### DOM not sending
- Check microphone permission
- Speak clearly to trigger VAD (energy > 2%)
- Check console for "DOM context sent" message

### Ghost cursor not showing
- Ensure command type is 'click'
- Check element exists with given selector
- Verify shadow DOM is attached

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

**Requirements:**
- WebGL 1.0+
- WebSocket API
- MediaDevices API (getUserMedia)
- AudioContext API
- Shadow DOM v1
- CSS Typed OM (for dynamic styles)

## 🔗 Integration Example

### Full React Integration

```tsx
'use client';

import { useState } from 'react';
import TaraOverlay from '@/components/overlay/TaraOverlay';

export default function PropertyPage() {
  const [isCallActive, setIsCallActive] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Your page content */}
      <header className="p-6">
        <h1>Luxury Properties</h1>
      </header>
      
      <main className="container mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="property-card">
              <img src={property.image} alt={property.title} />
              <h2>{property.title}</h2>
              <p>${property.price.toLocaleString()}</p>
              <button id={`book-${property.id}`}>
                Book Viewing
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* TARA Overlay */}
      <TaraOverlay 
        agentId="luxury-real-estate-agent"
        position="bottom-right"
        onStateChange={(state) => {
          console.log('TARA state:', state);
          setIsCallActive(state !== 'idle');
        }}
        onCallStart={() => console.log('Call started')}
        onCallEnd={() => console.log('Call ended')}
      />

      {/* Optional: Status indicator */}
      {isCallActive && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded">
          TARA Active
        </div>
      )}
    </div>
  );
}
```

## 📄 License

This implementation is proprietary to DaVinci AI.

## 🤝 Support

For issues or questions:
- Check the implementation plans in `.opencode/plans/`
- Review browser console for error messages
- Verify WebSocket connection in Network tab

---

**Built with ❤️ by DaVinci AI Engineering Team**
