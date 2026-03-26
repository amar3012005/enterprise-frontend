import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════
// CSS PULSING ORB (replaces Three.js/shader orb)
// ═══════════════════════════════════════════════════════════

function OrbRenderer({ agentState, userVolume, agentIsSpeaking }) {
    const orbStyle = useMemo(() => {
        const base = {
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            transition: 'box-shadow 0.3s ease, transform 0.3s ease',
        };

        if (agentState === 'talking') {
            return {
                ...base,
                background: 'radial-gradient(circle at 40% 40%, #EBE5DF 0%, #A63E1B 50%, #050505 100%)',
                boxShadow: '0 0 20px rgba(166, 62, 27, 0.7), inset 0 0 15px rgba(235, 229, 223, 0.3)',
                animation: 'orbPulseTalking 0.8s ease-in-out infinite alternate',
            };
        }
        if (agentState === 'listening') {
            return {
                ...base,
                background: 'radial-gradient(circle at 40% 40%, #EBE5DF 0%, #A63E1B 55%, #050505 100%)',
                boxShadow: '0 0 15px rgba(166, 62, 27, 0.5), inset 0 0 10px rgba(235, 229, 223, 0.2)',
                animation: 'orbPulseListening 1.5s ease-in-out infinite alternate',
            };
        }
        if (agentState === 'thinking') {
            return {
                ...base,
                background: 'radial-gradient(circle at 40% 40%, #EBE5DF 0%, #A63E1B 60%, #050505 100%)',
                boxShadow: '0 0 12px rgba(166, 62, 27, 0.4)',
                animation: 'orbPulseThinking 2s ease-in-out infinite',
            };
        }
        // idle
        return {
            ...base,
            background: 'radial-gradient(circle at 40% 40%, #EBE5DF 0%, #A63E1B 65%, #050505 100%)',
            boxShadow: '0 0 8px rgba(166, 62, 27, 0.25)',
            animation: 'orbPulseIdle 3s ease-in-out infinite alternate',
        };
    }, [agentState]);

    return (
        <>
            <style>{`
                @keyframes orbPulseTalking {
                    0% { transform: scale(1); opacity: 0.9; }
                    100% { transform: scale(1.12); opacity: 1; }
                }
                @keyframes orbPulseListening {
                    0% { transform: scale(0.95); opacity: 0.85; }
                    100% { transform: scale(1.05); opacity: 1; }
                }
                @keyframes orbPulseThinking {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.06); opacity: 1; }
                }
                @keyframes orbPulseIdle {
                    0% { transform: scale(0.97); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
            <div style={orbStyle} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
// TARA VOICE WIDGET — Rust Orange Edition
// ═══════════════════════════════════════════════════════════

const getWsBaseUrl = () => {
    return 'wss://demo.davinciai.eu:8030/ws';
};

const CALL_LIMIT = 300;

const STATE_LABELS = { idle: 'Click to Start', listening: 'Listening...', talking: 'TARA Speaking', thinking: 'Connecting...' };

const BundBTaraVoiceWidget = ({ config: propConfig }) => {
    const config = useMemo(() => {
        const globalConfig = typeof window !== 'undefined' ? window.TaraWidgetConfig : {};
        return {
            tenantId: propConfig?.tenantId || globalConfig?.tenantId || 'bundb',
            agentId: propConfig?.agentId || globalConfig?.agentId || 'bundb',
            agentName: propConfig?.agentName || globalConfig?.agentName || 'BUNDB AGENT',
            language: propConfig?.language || globalConfig?.language || 'de',
            accessKey: propConfig?.accessKey || globalConfig?.accessKey || '000000',
            region: propConfig?.region || globalConfig?.region || 'EU',
            ...propConfig
        };
    }, [propConfig]);

    const [isCallActive, setIsCallActive] = useState(false);
    const [agentState, setAgentState] = useState('idle');
    const [callDuration, setCallDuration] = useState(0);
    const [userVolume, setUserVolume] = useState(0);
    const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [micStream, setMicStream] = useState(null);
    const [isMuted] = useState(false);
    const [accessError, setAccessError] = useState('');
    const [selectedCallMode] = useState('speaker');
    const [showEmailDialog, setShowEmailDialog] = useState(false);
    const [emailInput, setEmailInput] = useState('');

    const wsRef = useRef(null);
    const audioCtxRef = useRef(null);
    const wsConnectedRef = useRef(false);
    const audioWorkletRef = useRef(null);
    const binaryQueueRef = useRef([]);
    const lastPlaybackTimeRef = useRef(0);
    const playbackStartTimeRef = useRef(null);
    const audioStreamCompleteRef = useRef(false);
    const audioConfigRef = useRef({ format: 'pcm_s16le', sampleRate: 16000 });
    const currentPlaybackTurnIdRef = useRef(null);
    const minAcceptedPlaybackTurnIdRef = useRef(0);
    const activeSourcesRef = useRef(new Set());
    const outputGainRef = useRef(null);
    const telephonyHighpassRef = useRef(null);
    const telephonyLowpassRef = useRef(null);
    const callTimerRef = useRef(null);
    const animationFrameRef = useRef(null);
    const sessionIdRef = useRef(null);

    const checkPlaybackComplete = useCallback(() => {
        if (!audioCtxRef.current) {
            console.log('[TARA] Audio context not available');
            return;
        }
        const currentTime = audioCtxRef.current.currentTime;
        const threshold = lastPlaybackTimeRef.current - 0.1;

        console.log(`[TARA] Checking playback complete: currentTime=${currentTime.toFixed(3)}, lastPlaybackTime=${lastPlaybackTimeRef.current.toFixed(3)}, threshold=${threshold.toFixed(3)}`);

        if (currentTime >= threshold) {
            console.log('[TARA] Playback time threshold reached');
            setAgentIsSpeaking(false);
            if (audioStreamCompleteRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                const duration = playbackStartTimeRef.current ? Date.now() - playbackStartTimeRef.current : 0;
                console.log(`[TARA] Sending playback_done: duration=${duration}ms, turn=${currentPlaybackTurnIdRef.current}`);
                wsRef.current.send(JSON.stringify({
                    type: 'playback_done',
                    duration_ms: duration,
                    playback_turn_id: currentPlaybackTurnIdRef.current,
                    timestamp: Date.now() / 1000
                }));
                playbackStartTimeRef.current = null;
                audioStreamCompleteRef.current = false;
                currentPlaybackTurnIdRef.current = null;
            } else {
                console.log(`[TARA] Cannot send playback_done: audioStreamComplete=${audioStreamCompleteRef.current}, wsState=${wsRef.current?.readyState}`);
            }
        } else {
            console.log(`[TARA] Waiting for playback complete: need ${threshold.toFixed(3)}, have ${currentTime.toFixed(3)}`);
        }
    }, []);

    const ensureOutputChain = useCallback(() => {
        if (!audioCtxRef.current) return null;
        const ctx = audioCtxRef.current;
        if (!outputGainRef.current) outputGainRef.current = ctx.createGain();
        if (!telephonyHighpassRef.current) {
            telephonyHighpassRef.current = ctx.createBiquadFilter();
            telephonyHighpassRef.current.type = 'highpass';
            telephonyHighpassRef.current.frequency.value = 250;
        }
        if (!telephonyLowpassRef.current) {
            telephonyLowpassRef.current = ctx.createBiquadFilter();
            telephonyLowpassRef.current.type = 'lowpass';
            telephonyLowpassRef.current.frequency.value = 3400;
        }
        return { gain: outputGainRef.current, highpass: telephonyHighpassRef.current, lowpass: telephonyLowpassRef.current };
    }, []);

    const stopPlayback = useCallback(() => {
        if (Number.isFinite(currentPlaybackTurnIdRef.current)) {
            minAcceptedPlaybackTurnIdRef.current = Math.max(minAcceptedPlaybackTurnIdRef.current, currentPlaybackTurnIdRef.current + 1);
        }
        for (const source of activeSourcesRef.current) {
            try { source.onended = null; source.stop(); } catch (_) { }
        }
        activeSourcesRef.current.clear();
        binaryQueueRef.current = [];
        currentPlaybackTurnIdRef.current = null;
        audioStreamCompleteRef.current = false;
        playbackStartTimeRef.current = null;
        if (audioCtxRef.current) lastPlaybackTimeRef.current = audioCtxRef.current.currentTime;
        setAgentIsSpeaking(false);
    }, []);

    const playAudioChunk = useCallback((data, forceInt16 = false) => {
        let f32; const fmt = audioConfigRef.current.format; const sr = audioConfigRef.current.sampleRate;
        if (data instanceof ArrayBuffer) {
            if (fmt === 'pcm_s16le' || forceInt16) { const i16 = new Int16Array(data); f32 = new Float32Array(i16.length); for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768.0; }
            else f32 = new Float32Array(data);
        } else {
            const bs = atob(data); const by = new Uint8Array(bs.length); for (let i = 0; i < bs.length; i++) by[i] = bs.charCodeAt(i);
            if (fmt === 'pcm_s16le' || forceInt16) { const i16 = new Int16Array(by.buffer); f32 = new Float32Array(i16.length); for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768.0; }
            else f32 = new Float32Array(by.buffer);
        }
        if (audioCtxRef.current) {
            const buf = audioCtxRef.current.createBuffer(1, f32.length, sr); buf.copyToChannel(f32, 0);
            const s = audioCtxRef.current.createBufferSource(); s.buffer = buf;
            const chain = ensureOutputChain(); if (!chain) return;
            chain.gain.gain.value = selectedCallMode === 'telephony' ? 0.2 : 1.0;
            try { chain.gain.disconnect(); chain.highpass.disconnect(); chain.lowpass.disconnect(); s.disconnect(); } catch (_) { }
            if (selectedCallMode === 'telephony') { s.connect(chain.highpass); chain.highpass.connect(chain.lowpass); chain.lowpass.connect(chain.gain); chain.gain.connect(audioCtxRef.current.destination); }
            else { s.connect(chain.gain); chain.gain.connect(audioCtxRef.current.destination); }
            const now = audioCtxRef.current.currentTime;
            let at = lastPlaybackTimeRef.current;
            // Initial buffer offset (50ms) for first chunk — prevents glitchy start
            if (!playbackStartTimeRef.current) {
                playbackStartTimeRef.current = Date.now();
                at = now + 0.05;
            }
            // Drift correction: jump to current time if falling behind
            if (at < now) at = now;
            activeSourcesRef.current.add(s);
            s.onended = () => { activeSourcesRef.current.delete(s); checkPlaybackComplete(); };
            s.start(at); lastPlaybackTimeRef.current = at + buf.duration;
        }
    }, [checkPlaybackComplete, ensureOutputChain, selectedCallMode]);

    const endCall = useCallback(() => {
        if (wsRef.current) {
            if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'interrupt', timestamp: Date.now() / 1000 }));
            wsRef.current.close(); wsRef.current = null;
        }
        stopPlayback();
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        outputGainRef.current = null; telephonyHighpassRef.current = null; telephonyLowpassRef.current = null;
        if (callTimerRef.current) clearInterval(callTimerRef.current); callTimerRef.current = null;
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        setIsCallActive(false); setConnectionStatus(null); setAgentIsSpeaking(false);
        wsConnectedRef.current = false; setAgentState('idle'); setMicStream(null); setCallDuration(0);
        setShowEmailDialog(true);
    }, [micStream, stopPlayback]);

    const startCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
            setMicStream(stream); startVoiceCall(stream);
        } catch (err) { console.error("Mic failed:", err); alert("Please enable microphone access"); }
    };

    const handleOrbClick = () => {
        if (isCallActive) { endCall(); return; }
        startCall();
    };

    useEffect(() => {
        if (connectionStatus === 'connected') setAgentState(agentIsSpeaking ? 'talking' : 'listening');
        else if (connectionStatus === 'connecting') setAgentState('thinking');
        else if (!isCallActive) setAgentState('idle');
    }, [agentIsSpeaking, connectionStatus, isCallActive]);

    useEffect(() => {
        if (isCallActive && callDuration >= CALL_LIMIT) endCall();
    }, [callDuration, isCallActive, endCall]);

    useEffect(() => {
        if (!micStream) return;
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const an = ac.createAnalyser(); const src = ac.createMediaStreamSource(micStream);
        src.connect(an); an.fftSize = 256;
        const arr = new Uint8Array(an.frequencyBinCount);
        const up = () => { an.getByteFrequencyData(arr); let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i]; setUserVolume(Math.min(1, s / arr.length / 30)); animationFrameRef.current = requestAnimationFrame(up); };
        up();
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); ac.close(); };
    }, [micStream]);

    const sendEmailToServer = async (email) => {
        try {
            const response = await fetch('/api/session/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionIdRef.current,
                    email: email,
                    tenant_id: config.tenantId,
                    agent_id: config.agentId,
                    timestamp: Date.now() / 1000
                })
            });
            if (!response.ok) console.warn('Failed to send email to server');
        } catch (err) {
            console.warn('Error sending email:', err);
        }
    };

    const startVoiceCall = (stream) => {
        setConnectionStatus('connecting'); setCallDuration(0);
        const base = getWsBaseUrl();
        const nws = String(base).replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
        const uid = 'user_' + Date.now();
        const wsUrl = `${nws}?tenant_id=${encodeURIComponent(config.tenantId)}&agent_id=${encodeURIComponent(config.agentId)}&session_type=webcall&user_id=${encodeURIComponent(uid)}&agent_name=${encodeURIComponent(config.agentName)}`;
        const ws = new WebSocket(wsUrl); ws.binaryType = "arraybuffer"; wsRef.current = ws;
        ws.onopen = () => {
            wsConnectedRef.current = true;
            sessionIdRef.current = 'session_' + Date.now();
            const sessionConfig = {
                type: 'session_config',
                config: {
                    mode: 'voice', tenant_id: config.tenantId, agent_id: config.agentId, agent_name: config.agentName,
                    user_id: uid, stt_mode: 'audio', tts_mode: 'audio', language: config.language
                }
            };
            ws.send(JSON.stringify(sessionConfig));
            ws.send(JSON.stringify({
                type: 'start_session',
                flow_config: {
                    policy_mode: 'sales', conversation_policy: 'sales',
                    policy_flags: { enable_strategic_policy: true, enable_stage_aware_retrieval: true, enable_micro_reasoning: true }
                },
                timestamp: Date.now() / 1000
            }));
            const ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            audioCtxRef.current = ac; lastPlaybackTimeRef.current = ac.currentTime;
            const mic = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const src = mic.createMediaStreamSource(stream);
            const proc = mic.createScriptProcessor(2048, 1, 1);
            proc.onaudioprocess = (e) => {
                if (ws.readyState === WebSocket.OPEN && wsConnectedRef.current && !isMuted) {
                    const inp = e.inputBuffer.getChannelData(0); const pcm = new Int16Array(inp.length);
                    for (let i = 0; i < inp.length; i++) pcm[i] = Math.max(-1, Math.min(1, inp[i])) * 0x7FFF;
                    ws.send(pcm.buffer);
                }
            };
            src.connect(proc); proc.connect(mic.destination); audioWorkletRef.current = proc;
        };
        ws.onmessage = (e) => {
            if (e.data instanceof ArrayBuffer) { binaryQueueRef.current.push(e.data); return; }
            const d = JSON.parse(e.data);
            if (d.type === 'session_ready' || (d.type === 'state_update' && d.state === 'listening')) {
                wsConnectedRef.current = true;
                if (d.audio_format || d.format) audioConfigRef.current.format = d.audio_format || d.format;
                if (d.sample_rate) audioConfigRef.current.sampleRate = d.sample_rate;
                if (connectionStatus !== 'connected') {
                    setConnectionStatus('connected'); setIsCallActive(true);
                    if (!callTimerRef.current) callTimerRef.current = setInterval(() => setCallDuration(x => x + 1), 1000);
                }
            }

            if (d.type === 'state_update' && (d.state === 'thinking' || d.state === 'interrupt' || d.state === 'listening')) {
                stopPlayback();
            } else if (d.type === 'audio_chunk') {
                const turnId = Number(d.playback_turn_id);
                if (Number.isFinite(turnId)) {
                    if (turnId < minAcceptedPlaybackTurnIdRef.current) {
                        console.log(`[TARA] Rejected stale audio chunk: turn ${turnId} < min ${minAcceptedPlaybackTurnIdRef.current}`);
                        if (d.binary_sent && binaryQueueRef.current.length > 0) binaryQueueRef.current.shift();
                        if (d.is_final) {
                            console.log(`[TARA] Final chunk received (stale turn ${turnId})`);
                            audioStreamCompleteRef.current = true;
                            checkPlaybackComplete();
                        }
                        return;
                    }
                    currentPlaybackTurnIdRef.current = turnId;
                }
                if (d.sample_rate) audioConfigRef.current.sampleRate = d.sample_rate;
                const hasAudioData = d.binary_sent || d.data || d.audio;
                if (hasAudioData) {
                    setAgentIsSpeaking(true);
                    audioStreamCompleteRef.current = false;
                }
                if (d.binary_sent && binaryQueueRef.current.length > 0) { const c = binaryQueueRef.current.shift(); if (c) playAudioChunk(c, audioConfigRef.current.format === 'pcm_s16le'); }
                else { const a = d.data || d.audio; if (a) playAudioChunk(a); }
                if (d.is_final) {
                    console.log(`[TARA] Final chunk received (turn ${turnId})`);
                    audioStreamCompleteRef.current = true;
                    checkPlaybackComplete();
                }
            } else if (d.type === 'audio_complete' || d.is_final) { audioStreamCompleteRef.current = true; checkPlaybackComplete(); }
            else if (d.type === 'interrupt' || d.type === 'clear' || d.type === 'playback_stop') {
                stopPlayback();
            }
            else if (d.type === 'ping' && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() / 1000 }));
        };
        ws.onclose = () => endCall(); ws.onerror = () => endCall();
    };

    const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    const remaining = CALL_LIMIT - callDuration;
    const isWarning = remaining <= 30 && isCallActive;

    const handleEmailSubmit = () => {
        if (!emailInput.trim()) {
            setShowEmailDialog(false);
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput)) {
            setAccessError('Please enter a valid email address');
            return;
        }
        sendEmailToServer(emailInput);
        setEmailInput('');
        setAccessError('');
        setShowEmailDialog(false);
    };

    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '20px', zIndex: 9999, display: 'flex', alignItems: 'center' }}>
            <AnimatePresence>
                {!isCallActive && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={handleOrbClick}
                        style={{
                            background: 'rgba(10, 10, 10, 0.85)',
                            backdropFilter: 'blur(30px)',
                            border: '1px solid rgba(166, 62, 27, 0.5)',
                            borderRadius: '24px',
                            padding: '10px 20px',
                            marginRight: '12px',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Talk to TARA <span style={{ color: '#A63E1B', fontSize: '16px' }}>&#10024;</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isCallActive && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                        style={{ height: '52px', background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(166, 62, 27, 0.35)', borderRadius: '26px 0 0 26px', display: 'flex', alignItems: 'center', paddingLeft: '20px', paddingRight: '12px', overflow: 'hidden', borderRight: 'none' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 900, color: '#EBE5DF', letterSpacing: '0.02em' }}>B&B</div>
                            <div style={{ fontSize: '9px', fontWeight: 600, color: isWarning ? '#EF4444' : '#A63E1B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isWarning ? `ENDING IN ${remaining}S` : STATE_LABELS[agentState]}</div>
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(235,229,223,0.3)', marginRight: '12px' }}>{fmt(callDuration)}</div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button onClick={handleOrbClick}
                style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#050505', border: isCallActive ? '2px solid #A63E1B' : '1px solid rgba(166, 62, 27, 0.25)', boxShadow: isCallActive ? '0 0 30px rgba(166, 62, 27, 0.5)' : '0 10px 40px rgba(0,0,0,0.5)', cursor: 'pointer', padding: 0, overflow: 'hidden', position: 'relative', zIndex: 10 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <OrbRenderer agentState={isCallActive ? agentState : null} userVolume={userVolume} agentIsSpeaking={agentIsSpeaking} />
                {isCallActive && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A63E1B" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                )}
            </motion.button>
            {
                isCallActive && (
                    <a
                        href="https://davinciai.eu"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            position: 'absolute',
                            top: '-18px',
                            right: '4px',
                            fontSize: '8px',
                            fontWeight: 700,
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            whiteSpace: 'nowrap',
                            textDecoration: 'none'
                        }}
                    >
                        built by davinciai.eu
                    </a>
                )
            }

            <AnimatePresence>
                {showEmailDialog && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            bottom: '100px',
                            right: '20px',
                            width: '320px',
                            background: 'rgba(10, 10, 10, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(166, 62, 27, 0.5)',
                            borderRadius: '16px',
                            padding: '20px',
                            zIndex: 10000,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#A63E1B', marginBottom: '8px' }}>
                            Get In Touch With Us
                        </div>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={emailInput}
                            onChange={(e) => { setEmailInput(e.target.value); setAccessError(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleEmailSubmit(); }}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid ${accessError ? '#EF4444' : 'rgba(166, 62, 27, 0.35)'}`,
                                borderRadius: '8px',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                                outline: 'none'
                            }}
                        />
                        {accessError && (
                            <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>{accessError}</div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button
                                onClick={() => { setShowEmailDialog(false); setEmailInput(''); setAccessError(''); }}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(166, 62, 27, 0.3)',
                                    borderRadius: '6px',
                                    color: '#EBE5DF',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Skip
                            </button>
                            <button
                                onClick={handleEmailSubmit}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    background: '#A63E1B',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#050505',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Send
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BundBTaraVoiceWidget;
