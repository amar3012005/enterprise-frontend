'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save,
  Globe,
  Mic,
  Bell,
  Shield,
  CreditCard,
  Users,
  ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agent_id as string;
  
  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedTenant = localStorage.getItem('tenant');
    if (storedTenant) {
      setTenant(JSON.parse(storedTenant));
    }

    loadAgent();
  }, [agentId]);

  const loadAgent = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAgent(agentId);
      setAgent(data);
    } catch (err) {
      console.error('Failed to load agent:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'team', label: 'Team', icon: Users },
  ];

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
                Settings
              </h1>
              <p className="text-sm text-neutral-500">
                Manage your agent configuration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Tabs */}
          <div className="w-64 shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'text-neutral-400 hover:bg-[#1a1a1a] hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <ChevronRight size={16} className="ml-auto" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-elevated p-8"
              >
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">General Settings</h2>
                      <p className="text-sm text-neutral-500">Basic agent configuration</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-neutral-400 mb-2">Agent Name</label>
                        <input
                          type="text"
                          defaultValue={agent?.agent_name}
                          className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-400 mb-2">Language</label>
                        <select className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none">
                          <option>English</option>
                          <option>German</option>
                          <option>Spanish</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">Description</label>
                      <textarea
                        rows={3}
                        defaultValue={agent?.agent_description}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'voice' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">Voice Settings</h2>
                      <p className="text-sm text-neutral-500">Configure voice and speech parameters</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-neutral-400 mb-2">Voice Model</label>
                        <select className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none">
                          <option>Cartesia Sonic-3</option>
                          <option>Cartesia Sonic-2</option>
                          <option>ElevenLabs Multilingual</option>
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-neutral-400 mb-2">Speed</label>
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            defaultValue="1"
                            className="w-full accent-blue-500"
                          />
                          <div className="flex justify-between text-xs text-neutral-500 mt-1">
                            <span>Slow</span>
                            <span>Fast</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-neutral-400 mb-2">Pitch</label>
                          <input
                            type="range"
                            min="-10"
                            max="10"
                            step="1"
                            defaultValue="0"
                            className="w-full accent-blue-500"
                          />
                          <div className="flex justify-between text-xs text-neutral-500 mt-1">
                            <span>Low</span>
                            <span>High</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">Notifications</h2>
                      <p className="text-sm text-neutral-500">Configure alert preferences</p>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        { label: 'Email alerts for failed calls', enabled: true },
                        { label: 'Daily summary reports', enabled: true },
                        { label: 'Low balance warnings', enabled: false },
                        { label: 'New feature announcements', enabled: true },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-[#262626] last:border-0">
                          <span className="text-sm text-white">{item.label}</span>
                          <button
                            className={`w-11 h-6 rounded-full transition-colors relative ${
                              item.enabled ? 'bg-blue-500' : 'bg-[#262626]'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                                item.enabled ? 'left-6' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">Security</h2>
                      <p className="text-sm text-neutral-500">Manage access and authentication</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-neutral-400 mb-2">API Key</label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value="sk_live_••••••••••••••••"
                            readOnly
                            className="flex-1 bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white"
                          />
                          <button className="px-4 py-2.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] text-sm text-neutral-400 hover:text-white transition-colors">
                            Regenerate
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-neutral-400 mb-2">Webhook Secret</label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value="whsec_••••••••••••••••"
                            readOnly
                            className="flex-1 bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white"
                          />
                          <button className="px-4 py-2.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] text-sm text-neutral-400 hover:text-white transition-colors">
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'billing' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">Billing</h2>
                      <p className="text-sm text-neutral-500">Manage your subscription and payments</p>
                    </div>
                    
                    <div className="card-solid p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-neutral-400">Current Plan</p>
                          <p className="text-lg font-semibold text-white">Enterprise</p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-t border-[#262626]">
                        <span className="text-sm text-neutral-400">Monthly cost</span>
                        <span className="text-sm text-white">€499/month</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'team' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">Team Members</h2>
                      <p className="text-sm text-neutral-500">Manage access for your organization</p>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        { name: 'John Doe', email: 'john@company.com', role: 'Admin', status: 'active' },
                        { name: 'Jane Smith', email: 'jane@company.com', role: 'Editor', status: 'active' },
                        { name: 'Mike Johnson', email: 'mike@company.com', role: 'Viewer', status: 'pending' },
                      ].map((member, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-[#262626] last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium">{member.name}</p>
                              <p className="text-xs text-neutral-500">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-neutral-400">{member.role}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              member.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-orange-500/10 text-orange-400'
                            }`}>
                              {member.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button className="w-full py-3 rounded-lg border border-dashed border-[#404040] text-neutral-400 hover:text-white hover:border-neutral-400 transition-colors text-sm">
                      + Invite Team Member
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
