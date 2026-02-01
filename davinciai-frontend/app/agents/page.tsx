'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Plus, 
  BarChart3, 
  Users, 
  Wallet, 
  Bell, 
  Search, 
  LayoutDashboard, 
  LogOut, 
  RefreshCcw,
  User,
  Phone,
  Clock,
  TrendingUp,
  Activity,
  MessageSquare,
  Zap
} from 'lucide-react';
import { api } from '@/lib/api';

export default function AgentsPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    const storedTenant = localStorage.getItem('tenant');

    if (!token || !storedUser || !storedTenant) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(storedUser));
    const tenantData = JSON.parse(storedTenant);
    setTenant(tenantData);

    fetchAgent(tenantData.tenant_id);
  }, [router]);

  const fetchAgent = async (tenantId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getAgents(tenantId);
      setAgent(data[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const successRatePct = agent ? (agent.stats.success_rate * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-[#262626] bg-[#111111]">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 via-orange-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              DaVinci AI
            </h1>
          </div>
          <p className="text-[10px] uppercase font-semibold tracking-[0.2em] text-neutral-600">
            Enterprise Edition
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active />
          <NavItem icon={<Users size={18} />} label="Voice Agent" />
          <NavItem icon={<BarChart3 size={18} />} label="Analytics" />
          <NavItem icon={<Wallet size={18} />} label="Billing" />
        </nav>

        <div className="p-6 mt-auto">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="text-emerald-500" size={16} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Balance</span>
            </div>
            <div className="text-2xl font-mono font-bold text-white mb-1">€4,250.80</div>
            <p className="text-[9px] text-neutral-500 font-medium uppercase tracking-widest">
              Est. 14 Days Remaining
            </p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-3 w-full mt-6 px-4 py-3 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-all text-sm font-medium"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-[#262626] flex items-center justify-between px-8 bg-[#0a0a0a]">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-400 transition-colors" size={16} />
              <input
                placeholder="Search..."
                className="bg-[#1a1a1a] border border-[#262626] rounded-lg h-10 pl-10 pr-4 w-64 outline-none focus:border-blue-500/50 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-neutral-400 hover:text-white transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0a0a0a]" />
            </button>
            <div className="flex items-center gap-4 border-l border-[#262626] pl-6">
              <div className="text-right">
                <p className="text-xs font-medium text-white">{user?.full_name || 'Operator'}</p>
                <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
                  {tenant?.organization_name || 'System'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 p-px">
                <div className="w-full h-full rounded-[7px] bg-[#111111] flex items-center justify-center overflow-hidden">
                  <User size={16} className="text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="flex items-end justify-between">
              <div>
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-3xl font-bold text-white mb-2"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Enterprise Voice Agent
                </motion.h2>
                <p className="text-neutral-500 text-sm">
                  Powered by Cartesia Sonic-3 · Real-time monitoring
                </p>
              </div>
              <button
                onClick={() => fetchAgent(tenant?.tenant_id)}
                className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-xs font-medium"
              >
                <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
                SYNC DATA
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-6">
                <div className="h-[300px] rounded-xl bg-[#1a1a1a] border border-[#262626] loading-shimmer" />
                <div className="grid grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-[100px] rounded-xl bg-[#1a1a1a] border border-[#262626] loading-shimmer" />
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="p-12 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
                <p className="text-red-400 font-medium mb-4">{error}</p>
                <button
                  onClick={() => fetchAgent(tenant?.tenant_id)}
                  className="px-6 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] text-sm font-medium transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            ) : agent ? (
              <>
                {/* Main Agent Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-elevated p-8 relative overflow-hidden"
                >
                  {/* Background gradient */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 via-orange-500/5 to-transparent blur-3xl" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <Activity size={28} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-1">{agent.agent_name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-medium uppercase tracking-widest text-emerald-500">
                              Active · Synchronized
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#262626]">
                        <span className="text-xs text-neutral-500 font-medium uppercase">Agent ID</span>
                        <p className="text-sm font-mono text-white mt-1">{agent.agent_id}</p>
                      </div>
                    </div>

                    <p className="text-neutral-400 mb-8 max-w-3xl">
                      {agent.agent_description}
                    </p>

                    {/* Success Rate */}
                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-neutral-500">Success Rate</span>
                        <span className="font-medium text-emerald-400">{successRatePct}%</span>
                      </div>
                      <div className="h-2 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${successRatePct}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                      <button 
                        onClick={() => router.push(`/enterprise/dashboard/${agent.agent_id}`)}
                        className="flex-1 h-12 rounded-lg bg-white text-black font-semibold hover:bg-neutral-200 transition-all"
                      >
                        View Live Dashboard
                      </button>
                      <button className="flex-1 h-12 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] font-medium transition-all">
                        Agent Settings
                      </button>
                      <button className="h-12 px-4 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] transition-all">
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <MetricCard
                    icon={<Phone size={18} />}
                    label="Total Calls"
                    value={agent.stats.total_calls.toLocaleString()}
                    color="blue"
                  />
                  <MetricCard
                    icon={<Clock size={18} />}
                    label="Total Minutes"
                    value={agent.stats.total_minutes.toLocaleString()}
                    color="orange"
                  />
                  <MetricCard
                    icon={<TrendingUp size={18} />}
                    label="Success Rate"
                    value={`${successRatePct}%`}
                    color="green"
                  />
                  <MetricCard
                    icon={<Activity size={18} />}
                    label="AI Engine"
                    value="Cartesia V2"
                    color="blue"
                  />
                </div>
              </>
            ) : (
              <div className="p-12 rounded-xl border border-[#262626] bg-[#111111] text-center">
                <p className="text-neutral-500 font-medium mb-4">No agent configured for this enterprise</p>
                <button className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors">
                  <Plus size={18} className="inline mr-2" />
                  Deploy Agent
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button 
      className={`flex items-center gap-4 w-full px-4 py-3 rounded-lg transition-all group ${
        active 
          ? 'bg-blue-500/10 text-blue-400' 
          : 'text-neutral-500 hover:bg-[#1a1a1a] hover:text-white'
      }`}
    >
      <div className={`${active ? 'text-blue-400' : 'text-neutral-600 group-hover:text-blue-400'} transition-colors`}>
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
    </button>
  );
}

function MetricCard({ icon, label, value, color = 'blue' }: any) {
  const colorMap: any = {
    blue: 'text-blue-400 bg-blue-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    green: 'text-emerald-400 bg-emerald-500/10'
  };

  return (
    <div className="card-solid p-5">
      <div className={`w-10 h-10 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-1">{label}</p>
      <h4 className="text-xl font-mono font-bold text-white">{value}</h4>
    </div>
  );
}
