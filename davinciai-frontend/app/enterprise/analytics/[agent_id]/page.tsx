'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Phone, 
  Clock, 
  TrendingUp, 
  Users, 
  Mic, 
  Volume2, 
  MessageSquare, 
  CheckCircle, 
  BarChart3,
  Wallet,
  Activity
} from 'lucide-react';
import { api } from '@/lib/api';

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agent_id as string;
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    const storedTenant = localStorage.getItem('tenant');
    if (storedTenant) {
      setTenant(JSON.parse(storedTenant));
    }

    loadAnalytics();
  }, [agentId]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAnalytics(agentId);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/enterprise/dashboard/${agentId}`)}
              className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] transition-colors"
            >
              <ArrowLeft size={18} className="text-neutral-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Analytics
              </h1>
              <p className="text-sm text-neutral-500">
                Performance metrics for {agentId.slice(0, 8)}...
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Phone size={18} />}
                label="Total Calls"
                value={analytics?.today?.calls?.toString() || '0'}
                change="+12.5%"
                positive
              />
              <StatCard
                icon={<Clock size={18} />}
                label="Avg Duration"
                value={analytics?.avg_call_duration_formatted || '0:00'}
                change="-8.2%"
                positive={false}
              />
              <StatCard
                icon={<CheckCircle size={18} />}
                label="Success Rate"
                value={`${(analytics?.success_rate || 0).toFixed(1)}%`}
                change="+2.1%"
                positive
              />
              <StatCard
                icon={<Activity size={18} />}
                label="Active Calls"
                value={analytics?.active_calls?.toString() || '0'}
                change="Live"
                live
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                icon={<Volume2 size={16} />}
                title="Total Minutes"
                value={analytics?.today?.minutes?.toString() || '0'}
                subtitle="This period"
                color="blue"
              />
              <MetricCard
                icon={<Mic size={16} />}
                title="Response Time"
                value={`${(analytics?.avg_response_time_ms || 0).toFixed(0)}ms`}
                subtitle="Average latency"
                color="orange"
              />
              <MetricCard
                icon={<Wallet size={16} />}
                title="Cost Today"
                value={`€${(analytics?.today?.cost || 0).toFixed(2)}`}
                subtitle="Total spend"
                color="green"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Call Volume Chart */}
              <div className="card-elevated p-6">
                <h3 className="text-sm font-semibold text-white mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Call Volume Trend
                </h3>
                <div className="h-48 flex items-end gap-2">
                  {[65, 78, 82, 91, 88, 95, 89, 72, 85, 93, 87, 76].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.05, duration: 0.5 }}
                      className="flex-1 bg-gradient-to-t from-blue-500/50 to-blue-500/20 rounded-t-sm hover:from-blue-500 hover:to-blue-400 transition-all cursor-pointer"
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-xs text-neutral-500">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:59</span>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="card-elevated p-6">
                <h3 className="text-sm font-semibold text-white mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Cost Breakdown
                </h3>
                <div className="space-y-4">
                  {[
                    { label: '0-5 min', cost: '€2.00', percent: 45, color: 'bg-emerald-500' },
                    { label: '5-10 min', cost: '€3.50', percent: 30, color: 'bg-blue-500' },
                    { label: '10-15 min', cost: '€5.00', percent: 15, color: 'bg-orange-500' },
                    { label: '15+ min', cost: '€7.00', percent: 10, color: 'bg-purple-500' },
                  ].map((tier, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="w-16 text-sm text-neutral-400">{tier.label}</span>
                      <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${tier.percent}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                          className={`h-full ${tier.color} rounded-full`}
                        />
                      </div>
                      <span className="w-12 text-sm text-white text-right">{tier.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, change, positive, live }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-solid p-5"
    >
      <div className="flex items-center gap-2 mb-3 text-neutral-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className={`flex items-center gap-1 text-xs ${live ? 'text-emerald-400' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {!live && <TrendingUp size={12} className={positive ? '' : 'rotate-180'} />}
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
        {change}
      </div>
    </motion.div>
  );
}

function MetricCard({ icon, title, value, subtitle, color = 'blue' }: any) {
  const colorMap: any = {
    blue: 'text-blue-400 bg-blue-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    green: 'text-emerald-400 bg-emerald-500/10'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card-solid p-5"
    >
      <div className={`w-10 h-10 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-1">{title}</p>
      <h4 className="text-xl font-mono font-bold text-white">{value}</h4>
      <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
    </motion.div>
  );
}
