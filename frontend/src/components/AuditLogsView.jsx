import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Shield,
  Clock
} from 'lucide-react';
import { api } from '../api/client';

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [eventTypeFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(eventTypeFilter, 100);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.description.toLowerCase().includes(q) ||
      (l.username && l.username.toLowerCase().includes(q)) ||
      l.event_type.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScrollText style={{ color: '#00f0ff' }} />
            System & Security Audit Logs
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            Recorded operator logins, agent actions, API requests, and system events
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '8px', width: '14px', height: '14px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '6px 12px 6px 30px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.78rem' }}
            />
          </div>

          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#94a3b8', fontSize: '0.78rem' }}
          >
            <option value="">All Event Types</option>
            <option value="DEFENSIVE_ACTION_EXECUTED">Defensive Actions</option>
            <option value="AUTH_SUCCESS">Auth Success</option>
            <option value="AUTH_FAILURE">Auth Failures</option>
            <option value="AGENT_CONTROL">Agent Lifecycle</option>
            <option value="API_REQUEST">API Traffic</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Timestamp</th>
                <th style={{ padding: '10px' }}>Actor</th>
                <th style={{ padding: '10px' }}>Event Type</th>
                <th style={{ padding: '10px' }}>Level</th>
                <th style={{ padding: '10px' }}>Description</th>
                <th style={{ padding: '10px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((l) => (
                <tr key={l.log_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '10px', color: '#94a3b8' }}>{l.created_at.slice(11, 19)}</td>
                  <td style={{ padding: '10px', color: '#00f0ff', fontWeight: 600 }}>{l.username || 'System'}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1' }}>
                      {l.event_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span className={l.level === 'SECURITY' ? 'badge-critical' : (l.level === 'WARNING' ? 'badge-high' : 'badge-low')} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                      {l.level}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#f1f5f9' }}>{l.description}</td>
                  <td style={{ padding: '10px', color: '#64748b', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
