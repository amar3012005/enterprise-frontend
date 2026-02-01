'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Phone, 
  Clock, 
  Calendar,
  Filter,
  Search,
  Download,
  ChevronDown,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { api } from '@/lib/api';

export default function CallsPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agent_id as string;
  
  const [calls, setCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedTenant = localStorage.getItem('tenant');
    if (storedTenant) {
      setTenant(JSON.parse(storedTenant));
    }

    loadCalls();
  }, [agentId]);

  const loadCalls = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCalls(agentId, 50);
      setCalls(data);
    } catch (err) {
      console.error('Failed to load calls:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const filteredCalls = calls.filter(call => {
    if (filter === 'completed' && call.status !== 'completed') return false;
    if (filter === 'failed' && call.status !== 'failed') return false;
    if (searchQuery && !call.caller_phone?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Call History
              </h1>
              <p className="text-sm text-neutral-500">
                {filteredCalls.length} calls recorded
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

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
            <input
              type="text"
              placeholder="Search by phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
            >
              <option value="all">All Calls</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#262626] text-sm text-neutral-400 hover:text-white transition-colors">
              <Calendar size={16} />
              <span>Last 7 Days</span>
              <ChevronDown size={14} />
            </button>
            
            <button className="p-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors">
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Calls Table */}
        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <span className="text-sm text-neutral-500">Loading calls...</span>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Phone size={24} className="text-neutral-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No calls found</h3>
              <p className="text-sm text-neutral-500">Start making calls to see them here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#111111] border-b border-[#262626]">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Phone Number</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Duration</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Cost</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Sentiment</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {filteredCalls.map((call, index) => (
                    <motion.tr
                      key={call.call_id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-[#1a1a1a]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {call.status === 'completed' ? (
                            <>
                              <CheckCircle size={16} className="text-emerald-500" />
                              <span className="text-sm text-emerald-400">Completed</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} className="text-red-500" />
                              <span className="text-sm text-red-400">Failed</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white font-mono">{call.caller_phone || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                          <Clock size={14} />
                          <span>{call.duration_formatted || '0:00'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white">€{call.cost?.toFixed(2) || '0.00'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-neutral-400">
                          {new Date(call.started_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: call.sentiment_score > 0.7 ? '#10b981' : 
                                              call.sentiment_score > 0.4 ? '#f97316' : '#ef4444'
                            }}
                          />
                          <span className="text-sm text-neutral-400">
                            {call.sentiment_score?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 rounded hover:bg-[#262626] text-neutral-500 hover:text-white transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
