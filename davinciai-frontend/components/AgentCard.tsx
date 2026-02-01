"use client";

import { motion } from "framer-motion";
import {
    Activity,
    Phone,
    MessageSquare,
    TrendingUp,
    Settings,
    Clock,
    ShieldCheck
} from "lucide-react";

interface Agent {
    agent_id: string;
    agent_name: string;
    agent_description: string;
    is_active: boolean;
    stats: {
        total_calls: number;
        total_minutes: number;
        success_rate: number;
    };
}

export default function AgentCard({ agent }: { agent: Agent }) {
    const isOnline = agent.is_active;
    const successRatePct = (agent.stats.success_rate * 100).toFixed(1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="glass-card rounded-3xl p-6 border border-white/5 relative group overflow-hidden"
        >
            {/* Background Accent Shimmer */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-[60px] group-hover:bg-primary-500/10 transition-colors" />

            {/* Card Header */}
            <div className="flex items-start justify-between mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${isOnline ? 'bg-primary-500/10 text-primary-400' : 'bg-neutral-800 text-neutral-500'}`}>
                        {isOnline ? <Activity size={24} /> : <ShieldCheck size={24} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">
                            {agent.agent_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success-500 animate-pulse' : 'bg-neutral-600'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                {isOnline ? 'Synchronized / Active' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-white/5 text-neutral-500 hover:text-white transition-colors">
                    <Settings size={18} />
                </button>
            </div>

            <p className="text-sm text-neutral-400 mb-6 line-clamp-2 min-h-[40px]">
                {agent.agent_description}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <StatMini
                    icon={<Phone size={14} />}
                    label="Total Sessions"
                    value={agent.stats.total_calls.toString()}
                />
                <StatMini
                    icon={<TrendingUp size={14} />}
                    label="Handshake Efficiency"
                    value={`${successRatePct}%`}
                    color="text-success-500"
                />
                <StatMini
                    icon={<Clock size={14} />}
                    label="Uptime Mins"
                    value={agent.stats.total_minutes.toString()}
                    color="text-accent-400"
                />
                <StatMini
                    icon={<MessageSquare size={14} />}
                    label="AI Type"
                    value="Sonic-3"
                />
            </div>

            {/* Progress Bar (Visual Performance) */}
            <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                    <span>Success Probability</span>
                    <span>{successRatePct}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${successRatePct}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 shadow-glow-primary"
                    />
                </div>
            </div>

            {/* Action Footer */}
            <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
                <button className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all">
                    View Metrics
                </button>
                <button className="flex-1 h-12 rounded-xl bg-primary-600 hover:bg-primary-500 text-[10px] font-black uppercase tracking-widest shadow-glow-primary transition-all">
                    Join Context
                </button>
            </div>
        </motion.div>
    );
}

function StatMini({ icon, label, value, color = "text-white" }: any) {
    return (
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 text-neutral-600 mb-1">
                {icon}
                <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-sm font-mono font-bold ${color}`}>{value}</div>
        </div>
    );
}
