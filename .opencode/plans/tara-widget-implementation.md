# TARA Visual Co-Pilot - Implementation Plan

## Overview
This document outlines the complete implementation plan for the TARA Visual Co-Pilot Overlay Widget that integrates with the davinciai-frontend.

## Architecture

### Core Components

1. **tara-widget.js** (standalone embeddable script)
   - Shadow DOM container for complete CSS isolation
   - WebGL-powered animated orb with fluid shader effects
   - WebSocket connection for bidirectional audio streaming
   - DOM scanner for sending page state to backend
   - Visual command executor (spotlight, highlights, scrolling)

2. **TaraOverlay.tsx** (React wrapper component)
   - Embeds tara-widget.js in Next.js/React applications
   - Provides TypeScript types and React hooks integration
   - Allows configuration through React props

### Key Features

#### 1. Shadow DOM Isolation
- Creates completely isolated environment
- Prevents CSS conflicts with host website
- Uses CSS StyleSheet API for dynamic styles
- z-index: 999999 ensures widget stays on top

#### 2. WebGL Orb Animation
- Real-time fragment shader with fluid motion
- Fractional Brownian Motion (fbm) noise for organic patterns
- Volume-reactive glow effects
- Smooth state transitions (listening/talking/thinking)

#### 3. Audio Streaming
- **Input**: 16kHz PCM via ScriptProcessorNode
- **Output**: 44.1kHz PCM with strict buffer scheduling
- Int16/Float32 conversion for WebSocket transmission
- Real-time volume visualization

#### 4. DOM Capture
- Scans interactive elements every 2 seconds
- Captures: bounds, text content, visibility state
- Sends structured JSON to WebSocket backend
- Privacy-respecting (excludes passwords)

#### 5. Visual Commands
- `scroll_to`: Smooth scroll with center alignment
- `highlight`: Golden pulse border around elements
- `click`: Programmatic element triggering
- `spotlight`: Full-page dimming overlay

## Implementation Steps

### Step 1: Create tara-widget.js

**Location**: `davinciai-frontend/public/tara-widget.js`

**Structure**:
```javascript
(function() {
  'use strict';
  
  const TARA_CONFIG = {
    wsUrl: 'wss://api.davinciai.eu',
    orbSize: 80,
    colors: {
      core: '#CADCFC',
      accent: '#A0B9D1',
      glow: 'rgba(202, 220, 252, 0.6)',
      highlight: '#FFD700',
      dim: 'rgba(0, 0, 0, 0.65)'
    },
    audio: {
      inputSampleRate: 16000,
      outputSampleRate: 44100,
      bufferSize: 2048
    }
  };

  class TaraWidget {
    // Implementation details below
  }
  
  window.TaraWidget = TaraWidget;
})();
```

### Step 2: Core Methods

#### Initialization
```javascript
init() {
  this.createShadowDOM();
  this.injectStyles();
  this.createOrb();
  this.createOverlay();
  this.setupEventListeners();
}
```

#### WebGL Shader Setup
```javascript
initWebGL() {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  
  // Vertex shader for full-screen quad
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;
  
  // Fragment shader with fluid fbm noise
  const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_volume;
    
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * smoothNoise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    
    void main() {
      vec2 uv = v_texCoord * 2.0 - 1.0;
      float dist = length(uv);
      if (dist > 1.0) discard;
      
      float time = u_time * 0.5;
      float volume = u_volume;
      
      // Fluid motion
      vec2 q = vec2(0.0);
      q.x = fbm(uv + time * 0.3);
      q.y = fbm(uv + vec2(1.0));
      
      vec2 r = vec2(0.0);
      r.x = fbm(uv + q + vec2(1.7, 9.2) + 0.15 * time);
      r.y = fbm(uv + q + vec2(8.3, 2.8) + 0.126 * time);
      
      float f = fbm(uv + r);
      
      // Colors
      vec3 color1 = vec3(0.792, 0.863, 0.988);
      vec3 color2 = vec3(0.627, 0.725, 0.820);
      vec3 color = mix(color1, color2, clamp(f * f * 2.0, 0.0, 1.0));
      
      // Volume glow
      float glow = 1.0 - dist;
      glow = pow(glow, 2.0);
      color += vec3(volume * 0.3) * glow;
      
      float alpha = 1.0 - smoothstep(0.8, 1.0, dist);
      alpha *= glow;
      
      gl_FragColor = vec4(color, alpha);
    }
  `;
}
```

#### Audio Processing
```javascript
startAudioProcessing() {
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  const source = audioCtx.createMediaStreamSource(this.micStream);
  const processor = audioCtx.createScriptProcessor(2048, 1, 1);
  
  processor.onaudioprocess = (e) => {
    if (!this.isActive) return;
    
    const inputData = e.inputBuffer.getChannelData(0);
    
    // Convert to Int16 PCM
    const pcmData = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
    }
    
    // Send via WebSocket
    this.ws.send(pcmData.buffer);
    
    // Update visualization
    this.updateVolume(inputData);
  };
  
  source.connect(processor);
  processor.connect(audioCtx.destination);
}

playAudioChunk(arrayBuffer) {
  const int16Array = new Int16Array(arrayBuffer);
  const float32Array = new Float32Array(int16Array.length);
  
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  
  const buffer = this.audioCtx.createBuffer(1, float32Array.length, 44100);
  buffer.copyToChannel(float32Array, 0);
  
  const source = this.audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(this.audioCtx.destination);
  
  // Strict scheduling
  const now = this.audioCtx.currentTime;
  const startAt = Math.max(now, this.lastPlaybackTime);
  source.start(startAt);
  this.lastPlaybackTime = startAt + buffer.duration;
}
```

#### DOM Capture
```javascript
captureDOMSnapshot() {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
  
  const elements = [];
  const interactiveSelectors = 'button, a, input, textarea, select, [role="button"], [onclick]';
  
  document.querySelectorAll(interactiveSelectors).forEach(el => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    
    if (rect.width === 0 || rect.height === 0 || 
        style.display === 'none' || style.visibility === 'hidden') {
      return;
    }
    
    elements.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      class: el.className || null,
      text: el.textContent?.substring(0, 100) || null,
      placeholder: el.placeholder || null,
      value: el.value?.substring(0, 100) || null,
      bounds: {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
      },
      visible: true,
      interactable: !el.disabled
    });
  });
  
  return {
    url: window.location.href,
    title: document.title,
    viewport,
    elements,
    timestamp: Date.now()
  };
}
```

#### Visual Commands
```javascript
handleCommand(data) {
  switch (data.type) {
    case 'scroll_to':
      this.scrollToElement(data.selector);
      break;
    case 'highlight':
      this.highlightElement(data.selector, data.label);
      break;
    case 'click':
      this.clickElement(data.selector);
      break;
    case 'spotlight':
      this.toggleSpotlight(data.active);
      break;
    case 'state_update':
      this.setAgentState(data.state);
      break;
    case 'clear':
      this.clearHighlights();
      break;
  }
}

highlightElement(selector, label = null) {
  const element = document.querySelector(selector);
  if (!element) return;
  
  const rect = element.getBoundingClientRect();
  
  const highlight = document.createElement('div');
  highlight.className = 'tara-highlight';
  highlight.style.cssText = `
    position: fixed;
    top: ${rect.top - 4}px;
    left: ${rect.left - 4}px;
    width: ${rect.width + 8}px;
    height: ${rect.height + 8}px;
    border-radius: ${this.getBorderRadius(element)};
  `;
  
  this.highlightContainer.appendChild(highlight);
  
  if (label) {
    const labelEl = document.createElement('div');
    labelEl.className = 'tara-label';
    labelEl.textContent = label;
    labelEl.style.cssText = `
      top: ${rect.top - 40}px;
      left: ${rect.left}px;
    `;
    this.highlightContainer.appendChild(labelEl);
  }
  
  setTimeout(() => {
    highlight.remove();
    if (label) labelEl.remove();
  }, 3000);
}
```

### Step 3: Create React Wrapper Component

**Location**: `davinciai-frontend/components/overlay/TaraOverlay.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';

interface TaraOverlayProps {
  agentId: string;
  wsUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onStateChange?: (state: 'idle' | 'listening' | 'talking' | 'thinking') => void;
  onError?: (error: Error) => void;
}

export default function TaraOverlay({
  agentId,
  wsUrl = 'wss://api.davinciai.eu',
  position = 'bottom-right',
  onStateChange,
  onError
}: TaraOverlayProps) {
  const widgetRef = useRef<any>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    // Load tara-widget.js
    const script = document.createElement('script');
    script.src = '/tara-widget.js';
    script.async = true;
    
    script.onload = () => {
      if (window.TaraWidget) {
        widgetRef.current = new window.TaraWidget({
          wsUrl,
          agentId,
          position
        });
        
        // Setup event listeners
        if (onStateChange) {
          // Hook into widget state changes
        }
      }
    };
    
    script.onerror = () => {
      onError?.(new Error('Failed to load TARA widget'));
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy();
      }
      script.remove();
    };
  }, [agentId, wsUrl, position, onStateChange, onError]);

  return null; // Widget renders itself via Shadow DOM
}
```

## Usage

### For External Websites
```html
<script src="https://davinciai.eu/tara-widget.js"></script>
<script>
  const tara = new TaraWidget({
    wsUrl: 'wss://api.davinciai.eu',
    agentId: 'your-agent-id'
  });
</script>
```

### For React/Next.js Applications
```tsx
import TaraOverlay from '@/components/overlay/TaraOverlay';

export default function Page() {
  return (
    <div>
      <TaraOverlay 
        agentId="your-agent-id"
        position="bottom-right"
        onStateChange={(state) => console.log('TARA state:', state)}
      />
    </div>
  );
}
```

## WebSocket Protocol

### Client → Server

#### Start Session
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

#### DOM Update
```json
{
  "type": "dom_update",
  "data": {
    "url": "https://example.com",
    "title": "Page Title",
    "viewport": { "width": 1920, "height": 1080, "scrollX": 0, "scrollY": 0 },
    "elements": [
      {
        "tag": "button",
        "id": "submit-btn",
        "text": "Submit",
        "bounds": { "x": 100, "y": 200, "width": 120, "height": 40 },
        "visible": true,
        "interactable": true
      }
    ],
    "timestamp": 1704067200000
  }
}
```

#### Audio Data
- Binary: Int16 PCM array buffer
- Sample rate: 16kHz
- Channels: 1 (mono)

### Server → Client

#### Commands
```json
{ "type": "scroll_to", "selector": "#pricing" }
{ "type": "highlight", "selector": "#submit-btn", "label": "Click here" }
{ "type": "click", "selector": "#menu-toggle" }
{ "type": "spotlight", "active": true }
{ "type": "state_update", "state": "talking" }
{ "type": "clear" }
```

#### Audio Data
- Binary: Int16 PCM array buffer
- Sample rate: 44.1kHz
- Channels: 1 (mono)

## CSS Classes (for host page)

The widget uses Shadow DOM isolation, but exposes these CSS custom properties:
```css
:root {
  --tara-orb-color: #CADCFC;
  --tara-accent-color: #A0B9D1;
  --tara-glow-color: rgba(202, 220, 252, 0.6);
  --tara-highlight-color: #FFD700;
}
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

Requirements:
- WebGL 1.0+ (falls back to CSS animations)
- WebSocket API
- MediaDevices API (getUserMedia)
- AudioContext API
- Shadow DOM v1

## Next Steps

1. Implement tara-widget.js (public folder)
2. Create TaraOverlay.tsx React wrapper
3. Add TypeScript definitions
4. Test WebSocket connection
5. Optimize shader performance
6. Add mobile touch support
7. Create documentation
8. Build embedding examples
