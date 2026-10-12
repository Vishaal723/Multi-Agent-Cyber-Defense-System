/**
 * MACDS API & WebSocket Client
 * Connects to FastAPI Backend and provides live WebSocket telemetry updates.
 */

const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('macds_token');
export const setAuthToken = (token) => localStorage.setItem('macds_token', token);
export const removeAuthToken = () => localStorage.removeItem('macds_token');
export const getCurrentUserStored = () => {
  const u = localStorage.getItem('macds_user');
  return u ? JSON.parse(u) : null;
};
export const setCurrentUserStored = (user) => localStorage.setItem('macds_user', JSON.stringify(user));

async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // If unauthorized, clear token
    // removeAuthToken();
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'API Request Failed');
  }

  // If response is a file download (PDF/CSV)
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('text/csv'))) {
    return response.blob();
  }

  return response.json();
}

export const api = {
  // Auth & RBAC
  login: async (username, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setAuthToken(data.access_token);
    setCurrentUserStored(data);
    return data;
  },
  getMe: () => apiFetch('/auth/me'),
  getUsers: () => apiFetch('/auth/users'),
  createUser: (userData) => apiFetch('/auth/users', { method: 'POST', body: JSON.stringify(userData) }),
  deleteUser: (userId) => apiFetch(`/auth/users/${userId}`, { method: 'DELETE' }),

  // Dashboard & Telemetry
  getDashboardStats: () => apiFetch('/dashboard/stats'),

  // Network Monitoring
  getDevices: () => apiFetch('/monitoring/devices'),
  getTrafficStats: () => apiFetch('/monitoring/traffic-stats'),
  getBfsTopology: (root = 'Router-Core') => apiFetch(`/monitoring/topology/bfs?root=${root}`),
  getDfsTopology: (root = 'Router-Core') => apiFetch(`/monitoring/topology/dfs?root=${root}`),

  // Threats & Detection
  getThreats: (category = '', severity = '', limit = 50) => {
    let url = `/threats?limit=${limit}`;
    if (category) url += `&category=${category}`;
    if (severity) url += `&severity=${severity}`;
    return apiFetch(url);
  },
  getThreatDetails: (id) => apiFetch(`/threats/${id}`),

  // Incidents & Correlation
  getIncidents: (status = '') => apiFetch(`/incidents${status ? `?status_filter=${status}` : ''}`),
  getIncidentDetails: (id) => apiFetch(`/incidents/${id}`),
  respondToIncident: (id, action, target, reason) => apiFetch(`/incidents/${id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action, target, reason })
  }),

  // Knowledge Base & Rules
  getRules: (category = '', search = '') => {
    let url = '/rules?';
    if (category) url += `category=${category}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    return apiFetch(url);
  },
  createRule: (rule) => apiFetch('/rules', { method: 'POST', body: JSON.stringify(rule) }),
  updateRule: (id, rule) => apiFetch(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(rule) }),
  deleteRule: (id) => apiFetch(`/rules/${id}`, { method: 'DELETE' }),
  getMitreMatrix: () => apiFetch('/kb/mitre-matrix'),

  // AI Algorithms Workbench
  runForwardChaining: (facts) => apiFetch('/reasoning/forward-chaining', { method: 'POST', body: JSON.stringify({ facts }) }),
  runBackwardChaining: (facts, goal) => apiFetch('/reasoning/backward-chaining', { method: 'POST', body: JSON.stringify({ facts, goal }) }),
  runResolutionProof: (goal = 'Threat_Confirmed') => apiFetch('/reasoning/resolution', { method: 'POST', body: JSON.stringify({ facts: [], goal }) }),
  getGreedySearchPrioritization: () => apiFetch('/detection/greedy-search'),
  runAStarPlanning: () => apiFetch('/planning/astar'),
  runGameTheory: (attackerAction) => apiFetch('/planning/game-theory', { method: 'POST', body: JSON.stringify({ attacker_action: attackerAction }) }),
  solveFirewallCSP: () => apiFetch('/planning/csp-firewall'),
  runHillClimbing: (threshold = 0.5) => apiFetch(`/planning/hill-climbing?threshold=${threshold}`),

  // Response Agent & Firewall
  getFirewallRules: () => apiFetch('/firewall/rules'),
  addFirewallRule: (rule) => apiFetch('/firewall/rules', { method: 'POST', body: JSON.stringify(rule) }),
  deleteFirewallRule: (id) => apiFetch(`/firewall/rules/${id}`, { method: 'DELETE' }),
  toggleDeviceIsolation: (deviceId) => apiFetch(`/devices/${deviceId}/isolate`, { method: 'POST' }),

  // Learning Agent
  submitFeedback: (incidentId, feedbackType, notes) => apiFetch('/learning/feedback', {
    method: 'POST',
    body: JSON.stringify({ incident_id: incidentId, feedback_type: feedbackType, notes })
  }),
  getKPIs: () => apiFetch('/learning/kpis'),
  getRecommendations: () => apiFetch('/learning/recommendations'),

  // Reporting & Export
  getIncidentReport: (id) => apiFetch(`/reports/incident/${id}`),
  getDailyReport: () => apiFetch('/reports/daily'),
  getWeeklyReport: () => apiFetch('/reports/weekly'),
  exportCsv: async () => {
    const res = await fetch('/api/reports/export/csv');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'macds_threats_export.csv';
    a.click();
  },
  exportPdf: async (incidentId) => {
    const res = await fetch(`/api/reports/export/pdf/${incidentId}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident_${incidentId}_report.pdf`;
    a.click();
  },

  // Audit Logs & Administration
  getAuditLogs: (eventType = '', limit = 100) => apiFetch(`/logs/audit?limit=${limit}${eventType ? `&event_type=${eventType}` : ''}`),
  getAgents: () => apiFetch('/agents'),
  controlAgent: (id, action, config) => apiFetch(`/agents/${id}/control`, {
    method: 'POST',
    body: JSON.stringify({ action, config })
  }),
  getSettings: () => apiFetch('/settings'),
  updateSetting: (key, value) => apiFetch(`/settings/${key}`, { method: 'POST', body: JSON.stringify({ value }) }),

  // Simulation
  runSimulation: (scenario, customParams = {}) => apiFetch('/simulation/run', {
    method: 'POST',
    body: JSON.stringify({ scenario, ...customParams })
  })
};

/**
 * WebSocket Live Feed Subscriber
 */
export class LiveTelemetrySocket {
  constructor(onMessageCallback, onStatusCallback) {
    this.onMessage = onMessageCallback;
    this.onStatus = onStatusCallback;
    this.ws = null;
    this.reconnectTimer = null;
    this.connect();
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.onStatus) this.onStatus('connected');
      };

      this.ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (this.onMessage) this.onMessage(data);
        } catch (e) {
          console.error('WS JSON parse error:', e);
        }
      };

      this.ws.onerror = () => {
        if (this.onStatus) this.onStatus('error');
      };

      this.ws.onclose = () => {
        if (this.onStatus) this.onStatus('disconnected');
        this.reconnectTimer = setTimeout(() => this.connect(), 2500);
      };
    } catch (e) {
      if (this.onStatus) this.onStatus('error');
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }
  }

  destroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
  }
}
