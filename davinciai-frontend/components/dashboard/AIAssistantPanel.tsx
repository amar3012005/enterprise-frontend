"use client";

import { useRef, useState, useEffect } from "react";
import { Play, PhoneOff, Activity, Zap, MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Three.js
const Orb = dynamic(() => import("@/components/ui/orb").then(mod => mod.Orb), {
    ssr: false,
    loading: () => (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #cbd5e1 0%, #e2e8f0 100%)',
            borderRadius: '50%'
        }} />
    )
});

function MetricPill({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#fff',
            padding: '6px 10px',
            borderRadius: '12px',
            border: '1px solid #eee',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
            <div style={{ color }}>{icon}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '8px', fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#1a1a1a' }}>{value}</span>
            </div>
        </div>
    );
}

interface AIAssistantPanelProps {
    agentId?: string;
}

export default function AIAssistantPanel({ agentId }: AIAssistantPanelProps) {
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
    const audioCtxRef = useRef<AudioContext | null>(null);
    const wsConnectedRef = useRef(false);
    const audioWorkletRef = useRef<ScriptProcessorNode | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | null>(null);
    const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
    const lastPlaybackTimeRef = useRef(0);
    const playbackStartTimeRef = useRef<number | null>(null);
    const audioStreamCompleteRef = useRef(false);
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

    // Fetch Agent Data from Database
    useEffect(() => {
        if (!agentId) return;

        const fetchAgent = async () => {
            try {
                const response = await fetch(`http://127.0.0.1:8000/api/agents/${agentId}`);
                if (!response.ok) throw new Error("Failed to fetch agent");
                const data = await response.json();
                setAgentData(data);
                console.log("Fetched Agent Data:", data);
            } catch (err) {
                console.error("Error fetching agent data:", err);
            } finally {
                setIsLoadingAgent(false);
            }
        };

        fetchAgent();
    }, [agentId]);

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

        const customWsUrl = agentData.websocket_url;
        const cartesiaId = agentData.cartesia_agent_id;
        const isCustomProtocol = !!customWsUrl && customWsUrl !== "not_set";

        const wsUrlTemp = isCustomProtocol
            ? customWsUrl
            : `wss://api.cartesia.ai/agents/stream/${cartesiaId}?api_key=${VOICE_API_KEY}&cartesia-version=2025-04-16`;

        const phone = typeof window !== 'undefined' ? (localStorage.getItem('TARA_phone_number') || "dashboard-user") : "dashboard-user";
        const wsUrl = isCustomProtocol
            ? `${wsUrlTemp}${wsUrlTemp.includes('?') ? '&' : '?'}user_id=${encodeURIComponent(phone)}`
            : wsUrlTemp;

        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
            wsConnectedRef.current = true;
            if (isCustomProtocol) {
                ws.send(JSON.stringify({
                    type: 'start_session',
                    mode: 'conversation',
                    stt_mode: 'audio',
                    tts_mode: 'audio',
                    language: agentData.language_primary === 'English' || agentData.language_primary === 'en' ? 'en' : 'de'
                }));
            } else {
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
                if (isCustomProtocol) {
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
                }
                return;
            }

            const data = JSON.parse(e.data);

            if (isCustomProtocol) {
                if (data.type === 'session_ready' || (data.type === 'state_update' && data.state === 'listening')) {
                    wsConnectedRef.current = true;
                    if (connectionStatus !== 'connected') {
                        setConnectionStatus('connected');
                        setIsCallActive(true);
                        setAgentState('listening');
                        setCallDuration(0);
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
                    setCallDuration(0);
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

    const playAudioChunk = (data: string | ArrayBuffer, isInt16 = false) => {
        let float32: Float32Array;
        if (data instanceof ArrayBuffer) {
            float32 = new Float32Array(data);
        } else {
            const binaryString = atob(data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            if (isInt16) {
                const int16 = new Int16Array(bytes.buffer);
                float32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++) {
                    float32[i] = int16[i] / 0x7FFF;
                }
            } else {
                float32 = new Float32Array(bytes.buffer as any);
            }
        }

        if (audioCtxRef.current) {
            const buffer = audioCtxRef.current.createBuffer(1, float32.length, 44100);
            buffer.copyToChannel(float32 as any, 0);
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);
            const startAt = Math.max(audioCtxRef.current.currentTime, lastPlaybackTimeRef.current);
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

    const endCall = () => {
        if (wsRef.current) {
            if (agentData?.websocket_url && agentData.websocket_url !== "not_set" && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'interrupt', timestamp: Date.now() / 1000 }));
            }
            wsRef.current.close();
            wsRef.current = null;
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
    };

    return (
        <div style={{
            backgroundColor: '#f5f5f5',
            borderRadius: '32px',
            padding: '48px 32px',
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            position: 'relative'
        }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <div style={{ width: '200px', height: '200px', position: 'relative', marginBottom: '48px' }}>
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
                            backgroundColor: '#fff',
                            border: '1px solid #e5e5e5',
                            display: 'inline-block',
                            marginBottom: '12px',
                            borderRadius: '4px'
                        }}>
                            <p style={{ fontSize: '9px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.25em', margin: 0 }}>DAVINCI</p>
                        </div>
                        <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 16px 0' }}>{agentData?.agent_name || "TARA"}</h3>
                    </div>

                    {/* Always show timer */}
                    <p style={{
                        fontSize: '13px',
                        color: loginMode === 'demo' && callDuration >= DEMO_WARNING_TIME ? '#ef4444' : '#999',
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
                    maxWidth: '400px',
                    marginTop: '32px'
                }}>
                    <MetricPill icon={<Zap size={10} />} label="TTFT" value={`${metrics.ttft}ms`} color="#22c55e" />
                    <MetricPill icon={<Activity size={10} />} label="TTFC" value={`${metrics.ttfc}ms`} color="#3b82f6" />
                    <MetricPill icon={<MessageSquare size={10} />} label="Ratio" value={metrics.ratio.toFixed(2)} color="#f59e0b" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                {!isCallActive ? (
                    <button onClick={startCall} style={{ padding: '14px 48px', backgroundColor: '#fff', color: '#000', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: '2px solid #000', borderRadius: '0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}>
                        <Play size={14} fill="currentColor" />
                        Start Call
                    </button>
                ) : (
                    <button onClick={endCall} style={{ padding: '14px 40px', backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: 'none', borderRadius: '0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}>
                        <PhoneOff size={13} />
                        End Call
                    </button>
                )}
            </div>
        </div>
    );
}
