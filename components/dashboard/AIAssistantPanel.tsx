"use client";

import { useRef, useState, useEffect } from "react";
import { Play, PhoneOff, Activity, Zap, MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";
import { apiFetch } from "@/lib/api";

// Dynamic import to avoid SSR issues with Three.js
const Orb = dynamic<any>(() => import("@/components/ui/orb").then(mod => mod.Orb), {
    ssr: false,
    loading: () => (
        <div style={{
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }} />
    )
});

function MetricPill({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div style={{
            backgroundColor: isDark ? '#111' : '#f5f5f5',
            padding: '8px 12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            border: isDark ? '1px solid #222' : '1px solid #eee',
            boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ color, display: 'flex', alignItems: 'center' }}>{icon}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#666', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
                <span style={{ color: isDark ? '#fff' : '#1a1a1a', fontSize: '12px', fontWeight: 'bold' }}>{value}</span>
            </div>
        </div>
    );
}

export default function AIAssistantPanel({ agentId, fallbackAgent }: { agentId: string; fallbackAgent?: any }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    // Call State
    const [isCallActive, setIsCallActive] = useState(false);
    const [agentState, setAgentState] = useState<'listening' | 'talking' | 'thinking' | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [userVolume, setUserVolume] = useState(0);
    const [metrics, setMetrics] = useState({
        latency: 0,
        logprob: 0,
        noSpeech: 0,
        ratio: 0,
        chunks: 0,
        ttft: 0,
        ttfc: 0
    });
    const [micStream, setMicStream] = useState<MediaStream | null>(null);

    // Voice Agent WebSocket
    const wsRef = useRef<WebSocket | null>(null);
    const audioWsRef = useRef<WebSocket | null>(null); // Dedicated audio stream WebSocket
    const audioCtxRef = useRef<AudioContext | null>(null);
    const wsConnectedRef = useRef(false);
    const audioStreamActiveRef = useRef(false); // Track if dedicated audio stream is active
    const sessionIdRef = useRef<string | null>(null);
    const audioWorkletRef = useRef<ScriptProcessorNode | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | null>(null);
    const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
    const lastPlaybackTimeRef = useRef(0);
    const playbackStartTimeRef = useRef<number | null>(null);
    const audioStreamCompleteRef = useRef(false);
    const audioConfigRef = useRef({ format: 'pcm_f32le', sampleRate: 44100 });
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const callTimerRef = useRef<NodeJS.Timeout | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const [agentData, setAgentData] = useState<any>(null);
    const [isLoadingAgent, setIsLoadingAgent] = useState(true);

    // Turn Timing Refs (matching reference client.html)
    const turnStartTimeRef = useRef<number | null>(null);
    const hasTtftForTurnRef = useRef(false);
    const hasTtfcForTurnRef = useRef(false);
    const agentResponseBufferRef = useRef<string>("");

    // Login Mode & Demo Call Limit
    const [loginMode, setLoginMode] = useState<string>('demo');
    const DEMO_CALL_LIMIT = 300; // 5 minutes in seconds
    const DEMO_WARNING_TIME = 270; // 4:30 in seconds

    // Helper to mark turn start (called when final transcript arrives)
    const markTurnStart = () => {
        turnStartTimeRef.current = performance.now();
        hasTtftForTurnRef.current = false;
        hasTtfcForTurnRef.current = false;
        agentResponseBufferRef.current = "";
    };

    const VOICE_API_KEY = process.env.NEXT_PUBLIC_VOICE_API_KEY || "sk_car_ChbYsPTQzZjruzRRPLy2zK";

    // Fetch Agent Data from Database (falls back to prop data for demo agents)
    useEffect(() => {
        if (!agentId) return;

        const fetchAgent = async () => {
            // Optimization: Skip API call for known demo agent to avoid 404 in console
            if (agentId === "agent-demo-001") {
                setAgentData(fallbackAgent);
                setIsLoadingAgent(false);
                return;
            }

            try {
                const response = await apiFetch(`/api/agents/${agentId}`);
                if (!response.ok) {
                    // Agent not in DB — use fallback data (e.g. demo TARA agent)
                    if (fallbackAgent?.websocket_url) {
                        setAgentData(fallbackAgent);
                    }
                    return;
                }
                const data = await response.json();
                setAgentData(data);
            } catch (err) {
                // Network error — use fallback if available
                if (fallbackAgent?.websocket_url) {
                    setAgentData(fallbackAgent);
                }
            } finally {
                setIsLoadingAgent(false);
            }
        };

        fetchAgent();
    }, [agentId, fallbackAgent]);

    // Retrieve login mode from localStorage
    useEffect(() => {
        const storedLoginMode = localStorage.getItem('login_mode') || 'demo';
        setLoginMode(storedLoginMode);
    }, []);

    // Demo Mode Call Limit Enforcement
    useEffect(() => {
        if (loginMode === 'demo' && isCallActive) {
            // Warning at 4:30
            if (callDuration === DEMO_WARNING_TIME) {
                alert('⏰ Demo call will end in 30 seconds');
            }
            // Auto-disconnect at 5:00
            if (callDuration >= DEMO_CALL_LIMIT) {
                endCall();
                alert('⏱️ Demo call limit (5 minutes) reached. Upgrade to Enterprise for unlimited calls.');
            }
        }
    }, [callDuration, loginMode, isCallActive]);


    // Volume Analyzer for Responsive Orb
    useEffect(() => {
        if (!micStream) return;

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(micStream);
        source.connect(analyser);
        analyser.fftSize = 256;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            setUserVolume(Math.min(1, average / 30));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            audioContext.close();
        };
    }, [micStream]);

    // Sync agent state
    useEffect(() => {
        if (connectionStatus === 'connected') {
            // Only show talking if speaking, otherwise listening if ready
            setAgentState(agentIsSpeaking ? 'talking' : 'listening');
        } else if (connectionStatus === 'connecting') {
            setAgentState('thinking');
        } else {
            setAgentState(null);
        }
    }, [agentIsSpeaking, connectionStatus]);

    // Connect to dedicated audio WebSocket stream (matching tara-widget.js pattern)
    const connectAudioWebSocket = (sessionId: string, baseWsUrl: string) => {
        if (!sessionId || !baseWsUrl) {
            console.warn('⚠️ Cannot connect audio WebSocket: missing sessionId or baseWsUrl');
            return;
        }

        // Replace /ws with /stream and add session_id parameter
        const audioUrl = baseWsUrl.replace('/ws', '/stream') +
            '?session_id=' + encodeURIComponent(sessionId);

        console.log('🔊 Connecting dedicated audio WebSocket:', audioUrl);

        const audioWs = new WebSocket(audioUrl);
        audioWs.binaryType = 'arraybuffer';
        audioWsRef.current = audioWs;

        audioWs.onopen = () => {
            console.log('✅ Dedicated audio stream connected');
            audioStreamActiveRef.current = true;
        };

        audioWs.onmessage = (e) => {
            if (e.data instanceof ArrayBuffer) {
                // Audio chunk received on dedicated stream
                if (!playbackStartTimeRef.current) playbackStartTimeRef.current = Date.now();
                setAgentIsSpeaking(true);
                audioStreamCompleteRef.current = false;

                // Record TTFC on first audio chunk
                if (turnStartTimeRef.current && !hasTtfcForTurnRef.current) {
                    const ttfc = Math.round(performance.now() - turnStartTimeRef.current);
                    setMetrics(prev => ({ ...prev, ttfc }));
                    hasTtfcForTurnRef.current = true;
                }

                playAudioChunk(e.data);
            } else {
                // JSON message on audio stream (e.g., stream_complete)
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'stream_complete') {
                        console.log('🎵 Audio stream marked complete');
                        audioStreamCompleteRef.current = true;
                        setAgentIsSpeaking(false);
                    }
                } catch (err) {
                    console.warn('⚠️ Non-JSON message on audio stream:', e.data);
                }
            }
        };

        audioWs.onclose = (event) => {
            console.log(`🔌 Audio WebSocket closed: ${event.code}`);
            audioStreamActiveRef.current = false;
            audioWsRef.current = null;
        };

        audioWs.onerror = (event) => {
            console.error('❌ Audio WebSocket error:', event);
            audioStreamActiveRef.current = false;
        };
    };

    const startCall = async () => {
        if (!agentData) {
            alert("Agent data not loaded yet");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            setMicStream(stream);
            startVoiceCall(stream);
        } catch (err) {
            console.error("Mic access failed:", err);
            alert("Please enable microphone access");
        }
    };

    const startVoiceCall = async (stream: MediaStream) => {
        setConnectionStatus('connecting');
        setAgentState('thinking');
        setCallDuration(0);

        const customWsUrl = agentData.websocket_url;
        const cartesiaId = agentData.cartesia_agent_id;
        const isCustomProtocol = !!customWsUrl && customWsUrl !== "not_set";

        const wsUrlTemp = isCustomProtocol
            ? (customWsUrl?.endsWith('/') ? `${customWsUrl}ws` : `${customWsUrl}/ws`)
            : `wss://api.cartesia.ai/agents/stream/${cartesiaId}?api_key=${VOICE_API_KEY}&cartesia-version=2025-04-16`;

        const phone = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || "dashboard-user") : "dashboard-user";
        const wsUrl = isCustomProtocol
            ? `${wsUrlTemp}${wsUrlTemp.includes('?') ? '&' : '?'}user_id=${encodeURIComponent(phone)}`
            : wsUrlTemp;

        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
            wsConnectedRef.current = true;

            const sessionId = crypto.randomUUID();
            sessionIdRef.current = sessionId;
            const storedTenant = typeof window !== 'undefined' ? localStorage.getItem('tenant') : null;
            const tenantId = storedTenant ? JSON.parse(storedTenant).tenant_id : "unknown";

            if (isCustomProtocol) {
                // Enterprise Orchestration Handshake (aligned with reference client.html)
                ws.send(JSON.stringify({
                    type: 'start_session',
                    mode: 'conversation',
                    stt_mode: 'audio',
                    tts_mode: 'audio',
                    language: agentData.language_primary || 'en',
                    user_id: phone,
                    agent_id: agentId,
                    tenant_id: tenantId,
                    session_id: sessionId,
                    token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
                }));
                console.log(`Handshake sent for agent: ${agentId}`);

                // Connect dedicated audio WebSocket for enterprise agents
                connectAudioWebSocket(sessionId, wsUrlTemp);
            }
            else {
                ws.send(JSON.stringify({
                    event: "start",
                    config: { input_format: "pcm_44100" }
                }));
            }

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
            audioCtxRef.current = audioCtx;
            lastPlaybackTimeRef.current = audioCtx.currentTime;

            const micAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = micAudioCtx.createMediaStreamSource(stream);
            const processor = micAudioCtx.createScriptProcessor(2048, 1, 1);
            processor.onaudioprocess = (e) => {
                if (ws.readyState === WebSocket.OPEN && wsConnectedRef.current && !agentIsSpeaking) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }
                    if (isCustomProtocol) {
                        ws.send(pcmData.buffer);
                    } else {
                        const uint8 = new Uint8Array(pcmData.buffer);
                        let binary = '';
                        for (let i = 0; i < uint8.length; i++) {
                            binary += String.fromCharCode(uint8[i]);
                        }
                        const base64 = btoa(binary);
                        ws.send(JSON.stringify({
                            event: "media_input",
                            media: { payload: base64 }
                        }));
                    }
                }
            };
            source.connect(processor);
            processor.connect(micAudioCtx.destination);
            audioWorkletRef.current = processor;

            if (!isCustomProtocol) {
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping" }));
                    }
                }, 20000);
            }
        };

        ws.onmessage = async (e) => {
            if (e.data instanceof ArrayBuffer) {
                // Only handle binary audio on control WS if dedicated audio stream is NOT active
                if (isCustomProtocol && !audioStreamActiveRef.current) {
                    if (!playbackStartTimeRef.current) playbackStartTimeRef.current = Date.now();
                    setAgentIsSpeaking(true);
                    audioStreamCompleteRef.current = false;

                    // Record TTFC on first audio chunk
                    if (turnStartTimeRef.current && !hasTtfcForTurnRef.current) {
                        const ttfc = Math.round(performance.now() - turnStartTimeRef.current);
                        setMetrics(prev => ({ ...prev, ttfc }));
                        hasTtfcForTurnRef.current = true;
                    }

                    playAudioChunk(e.data);
                } else if (isCustomProtocol && audioStreamActiveRef.current) {
                    // Audio should come via dedicated stream - ignore on control WS
                    console.log('🔇 Ignoring binary audio on control WS (using dedicated stream)');
                }
                return;
            }

            const data = JSON.parse(e.data);

            if (isCustomProtocol) {
                if (data.type === 'session_ready' || (data.type === 'state_update' && data.state === 'listening')) {
                    wsConnectedRef.current = true;

                    // Capture dynamic audio format and sample rate from backend config
                    if (data.audio_format || data.format) {
                        audioConfigRef.current.format = data.audio_format || data.format;
                    }
                    if (data.sample_rate) {
                        audioConfigRef.current.sampleRate = data.sample_rate;
                    }

                    if (connectionStatus !== 'connected') {
                        setConnectionStatus('connected');
                        setIsCallActive(true);
                        setAgentState('listening');
                        if (!callTimerRef.current) {
                            callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
                        }
                    }
                } else if (data.type === 'transcript') {
                    if (data.is_final && data.text && data.text.trim()) {
                        // Mark turn start for TTFT/TTFC (matching reference client.html line 1212)
                        markTurnStart();
                    }
                    setMetrics(prev => ({
                        ...prev,
                        latency: data.latency_ms || prev.latency,
                        logprob: data.avg_logprob || prev.logprob,
                        noSpeech: data.no_speech_prob || prev.noSpeech,
                        ratio: data.compression_ratio || prev.ratio,
                        chunks: prev.chunks + 1
                    }));
                } else if (data.type === 'agent_response') {
                    if (data.text && data.text.trim()) {
                        if (data.is_streaming) {
                            // Record TTFT on first token (matching reference client.html line 1225)
                            if (turnStartTimeRef.current && !hasTtftForTurnRef.current) {
                                const ttft = Math.round(performance.now() - turnStartTimeRef.current);
                                setMetrics(prev => ({ ...prev, ttft }));
                                hasTtftForTurnRef.current = true;
                            }
                            agentResponseBufferRef.current += data.text;
                        }
                    }
                } else if (data.type === 'audio_chunk') {
                    if (!playbackStartTimeRef.current) playbackStartTimeRef.current = Date.now();
                    setAgentIsSpeaking(true);
                    audioStreamCompleteRef.current = false;
                    const audioB64 = data.data || data.audio;
                    if (audioB64) {
                        // Record TTFC on first audio chunk (matching reference client.html line 1261)
                        if (turnStartTimeRef.current && !hasTtfcForTurnRef.current) {
                            const ttfc = Math.round(performance.now() - turnStartTimeRef.current);
                            setMetrics(prev => ({ ...prev, ttfc }));
                            hasTtfcForTurnRef.current = true;
                        }
                        playAudioChunk(audioB64);
                    }
                } else if (data.type === 'audio_complete' || data.is_final) {
                    audioStreamCompleteRef.current = true;
                    checkPlaybackComplete();
                } else if (data.type === 'interrupt' || data.type === 'clear') {
                    setAgentIsSpeaking(false);
                    lastPlaybackTimeRef.current = audioCtxRef.current?.currentTime || 0;
                    playbackStartTimeRef.current = null;
                } else if (data.type === 'ping') {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() / 1000 }));
                    }
                }
            } else {
                if (data.event === 'ack') {
                    wsConnectedRef.current = true;
                    setConnectionStatus('connected');
                    setIsCallActive(true);
                    setAgentState('listening');
                    if (!callTimerRef.current) {
                        callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
                    }
                } else if (data.event === 'media_output') {
                    setAgentIsSpeaking(true);
                    if (data.media?.payload) {
                        if (turnStartTimeRef.current && !hasTtfcForTurnRef.current) {
                            const ttfc = Math.round(performance.now() - turnStartTimeRef.current);
                            setMetrics(prev => ({ ...prev, ttfc }));
                            hasTtfcForTurnRef.current = true;
                        }
                        playAudioChunk(data.media.payload, true);
                    }
                } else if (data.type === "transcript") {
                    if (data.is_final && data.text && data.text.trim()) {
                        markTurnStart();
                    }
                } else if (data.event === 'clear') {
                    setAgentIsSpeaking(false);
                    lastPlaybackTimeRef.current = audioCtxRef.current?.currentTime || 0;
                }
            }
        };

        ws.onclose = (event) => {
            console.log(`🔌 WebSocket closed: ${event.code}`);
            endCall();
        };

        ws.onerror = (event) => {
            console.error('❌ WebSocket error occurred:', event);
            alert("Connection error. Please check if the voice orchestrator is online.");
            endCall();
        };
    };

    const playAudioChunk = (data: string | ArrayBuffer, forceInt16 = false) => {
        let float32: Float32Array;
        const format = audioConfigRef.current.format;
        const sampleRate = audioConfigRef.current.sampleRate;

        if (data instanceof ArrayBuffer) {
            // Check if we need to convert from Int16 to Float32
            if (format === 'pcm_s16le' || forceInt16) {
                const int16 = new Int16Array(data);
                float32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++) {
                    float32[i] = int16[i] / 32768.0;
                }
            } else {
                float32 = new Float32Array(data);
            }
        } else {
            const binaryString = atob(data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            if (format === 'pcm_s16le' || forceInt16) {
                const int16 = new Int16Array(bytes.buffer);
                float32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++) {
                    float32[i] = int16[i] / 32768.0;
                }
            } else {
                // Default to Float32 (4 bytes per sample)
                float32 = new Float32Array(bytes.buffer);
            }
        }

        if (audioCtxRef.current) {
            const buffer = audioCtxRef.current.createBuffer(1, float32.length, sampleRate);
            buffer.copyToChannel(float32 as any, 0);

            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);

            const now = audioCtxRef.current.currentTime;

            // --- Strict Scheduling with Drift Correction ---
            // If chunks arrive slightly late, play immediately (drift correction)
            // If they arrive on time/early, queue precisely at the end of the previous chunk
            let startAt = lastPlaybackTimeRef.current;
            if (startAt < now) {
                startAt = now;
            }

            source.start(startAt);
            lastPlaybackTimeRef.current = startAt + buffer.duration;
            source.onended = () => checkPlaybackComplete();
        }
    };

    const checkPlaybackComplete = () => {
        if (!audioCtxRef.current) return;
        if (audioCtxRef.current.currentTime >= lastPlaybackTimeRef.current - 0.1) {
            setAgentIsSpeaking(false);
            if (audioStreamCompleteRef.current && wsRef.current?.readyState === WebSocket.OPEN && agentData?.websocket_url && agentData.websocket_url !== "not_set") {
                const duration = playbackStartTimeRef.current ? Date.now() - playbackStartTimeRef.current : 0;
                wsRef.current.send(JSON.stringify({
                    type: 'playback_done',
                    duration_ms: duration,
                    timestamp: Date.now() / 1000
                }));
                playbackStartTimeRef.current = null;
                audioStreamCompleteRef.current = false;
            }
        }
    };

    const endCall = async () => {
        // Capture data for backend sync before clearing state
        const finalDuration = callDuration;
        const finalMetrics = { ...metrics };
        const finalAgentId = agentId;

        if (wsRef.current) {
            if (agentData?.websocket_url && agentData.websocket_url !== "not_set" && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'interrupt', timestamp: Date.now() / 1000 }));
            }
            wsRef.current.close();
            wsRef.current = null;
        }

        // Close dedicated audio WebSocket if active
        if (audioWsRef.current) {
            audioWsRef.current.close();
            audioWsRef.current = null;
            audioStreamActiveRef.current = false;
        }

        // Sync with Backend
        if (finalDuration > 0) {
            try {
                const response = await fetch(`/api/metrics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        call_id: sessionIdRef.current,
                        agent_id: finalAgentId,
                        duration_seconds: finalDuration,
                        status: 'completed',
                        ttft_ms: finalMetrics.ttft,
                        ttfc_ms: finalMetrics.ttfc,
                        compression_ratio: finalMetrics.ratio,
                        cost_euros: (finalDuration / 60) * 0.15
                    })
                });
                if (response.ok) {
                    console.log("AIAssistantPanel: Call metrics synced successfully");
                }
            } catch (err) {
                console.error("AIAssistantPanel: Failed to sync call metrics:", err);
            }
        }

        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        if (micStream) micStream.getTracks().forEach(track => track.stop());

        setIsCallActive(false);
        setConnectionStatus(null);
        setAgentIsSpeaking(false);
        wsConnectedRef.current = false;
        setAgentState(null);
        setMicStream(null);
        setCallDuration(0);
        setMetrics({
            latency: 0,
            logprob: 0,
            noSpeech: 0,
            ratio: 0,
            chunks: 0,
            ttft: 0,
            ttfc: 0
        });
    };

    if (!isMounted || isLoadingAgent || !agentData) {
        return (
            <div style={{
                backgroundColor: isDark ? '#000' : '#fff',
                borderRadius: '32px',
                padding: '48px 32px',
                height: '600px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.05)',
                border: isDark ? '1px solid #222' : '1px solid #eee',
                position: 'relative',
                color: isDark ? '#fff' : '#1a1a1a',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!isMounted || isLoadingAgent ? "Loading..." : "Error loading agent"}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: isDark ? '#000' : '#fff',
            borderRadius: '32px',
            padding: '48px 32px',
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.05)',
            border: isDark ? '1px solid #222' : '1px solid #eee',
            position: 'relative',
            color: isDark ? '#fff' : '#1a1a1a',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <div style={{
                    width: '200px',
                    height: '200px',
                    position: 'relative',
                    marginBottom: '48px',
                    borderRadius: '50%',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Orb
                        agentState={agentState}
                        volumeMode="manual"
                        manualInput={userVolume}
                        manualOutput={agentIsSpeaking ? (0.6 + Math.random() * 0.4) : 0}
                        colors={["#CADCFC", "#A0B9D1"]}
                    />
                </div>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{
                            padding: '6px 16px',
                            backgroundColor: isDark ? '#111' : '#f5f5f5',
                            border: isDark ? '1px solid #333' : '1px solid #eee',
                            display: 'inline-block',
                            marginBottom: '12px',
                            borderRadius: '4px'
                        }}>
                            <p style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.25em', margin: 0 }}>DAVINCI</p>
                        </div>
                        <h3 style={{ fontSize: '28px', fontWeight: 700, color: isDark ? '#fff' : '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 16px 0' }}>{agentData?.agent_name || "TARA"}</h3>
                    </div>

                    {/* Always show timer */}
                    <p style={{
                        fontSize: '13px',
                        color: loginMode === 'demo' && callDuration >= DEMO_WARNING_TIME ? '#ef4444' : '#666',
                        fontFamily: 'monospace',
                        letterSpacing: '0.1em',
                        margin: 0,
                        fontWeight: 500,
                        transition: 'color 0.3s ease'
                    }}>
                        {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                        {loginMode === 'demo' && isCallActive && (
                            <span style={{ fontSize: '9px', marginLeft: '8px', opacity: 0.7 }}>
                                / 5:00
                            </span>
                        )}
                    </p>
                </div>

                {/* Voice-only interaction - no text display */}

                {/* Performance Metrics */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    width: '100%',
                    maxWidth: '320px',
                    marginTop: '32px'
                }}>
                    <MetricPill icon={<Zap size={10} />} label="TTFT" value={`${metrics.ttft}ms`} color="#22c55e" />
                    <MetricPill icon={<Activity size={10} />} label="TTFC" value={`${metrics.ttfc}ms`} color="#3b82f6" />
                    <MetricPill icon={<MessageSquare size={10} />} label="Ratio" value={metrics.ratio.toFixed(2)} color="#f59e0b" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                {!isCallActive ? (
                    <button onClick={startCall} style={{ padding: '14px 48px', backgroundColor: isDark ? '#fff' : '#000', color: isDark ? '#000' : '#fff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}>
                        <Play size={14} fill="currentColor" />
                        Start Call
                    </button>
                ) : (
                    <button onClick={endCall} style={{ padding: '14px 40px', backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}>
                        <PhoneOff size={13} />
                        End Call
                    </button>
                )}
            </div>
        </div>
    );
}
