// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  login(email: string, password: string) {
    return this.request<{ access_token: string; user: any; tenant: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(data: { organization_name: string; email: string; password: string; full_name: string }) {
    return this.request<{ access_token: string; user: any; tenant: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Agents
  getAgents(tenantId: string) {
    return this.request<any[]>(`/api/tenants/${tenantId}/agents`);
  }

  getAgent(agentId: string) {
    return this.request<any>(`/api/agents/${agentId}`);
  }

  // Metrics & Analytics
  getCalls(agentId: string, limit: number = 50) {
    return this.request<any[]>(`/api/metrics/calls?agent_id=${agentId}&limit=${limit}`);
  }

  getAnalytics(agentId: string) {
    return this.request<any>(`/api/metrics/analytics?agent_id=${agentId}`);
  }

  getRealtimeCalls(agentId: string) {
    return this.request<any[]>(`/api/metrics/realtime?agent_id=${agentId}`);
  }

  // Wallet
  getWallet(tenantId: string) {
    return this.request<any>(`/api/wallet/${tenantId}`);
  }

  getTransactions(tenantId: string) {
    return this.request<any[]>(`/api/wallet/${tenantId}/transactions`);
  }

  // Tenants
  getTenant(tenantId: string) {
    return this.request<any>(`/api/tenants/${tenantId}`);
  }
}

export const api = new ApiClient(API_BASE_URL);

// React Query Hooks
export function useAuth() {
  return {
    login: api.login.bind(api),
    register: api.register.bind(api),
  };
}

export function useAgents(tenantId: string) {
  return {
    getAgents: () => api.getAgents(tenantId),
    getAgent: (agentId: string) => api.getAgent(agentId),
  };
}

export function useMetrics(agentId: string) {
  return {
    getCalls: (limit?: number) => api.getCalls(agentId, limit),
    getAnalytics: () => api.getAnalytics(agentId),
    getRealtimeCalls: () => api.getRealtimeCalls(agentId),
  };
}

export function useWallet(tenantId: string) {
  return {
    getWallet: () => api.getWallet(tenantId),
    getTransactions: () => api.getTransactions(tenantId),
  };
}
