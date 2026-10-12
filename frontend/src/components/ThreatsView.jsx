import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Zap,
  Terminal,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';
import { api } from '../api/client';

export default function ThreatsView({ onSelectIncident }) {
  const [threats, setThreats] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchThreats = async () => {
    setLoading(true);
    try {
      const data = await api.getThreats(categoryFilter, severityFilter, 100);
      setThreats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
  }, [categoryFilter, severityFilter]);

  const filteredThreats = threats.filter((t) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.threat_id.toLowerCase().includes(q) ||
      t.attack_type.toLowerCase().includes(q) ||
      t.source_ip.toLowerCase().includes(q) ||
      (t.payload_sample && t.payload_sample.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert style={{ color: '#00f0ff' }} />
            Threat Feeds & Intrusion Detection (PRD Module 4)
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            Real-time heuristic classification, threat prioritization, and MITRE ATT&CK mapping
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '8px', width: '14px', height: '14px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search threat, IP, payload..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '6px 12px 6px 30px',
                borderRadius: '6px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.78rem'
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-subtle)',
              color: '#94a3b8',
              fontSize: '0.78rem'
            }}
          >
            <option value="">All Categories</option>
            <option value="brute_force">Brute Force</option>
            <option value="sql_injection">SQL Injection</option>
            <option value="ransomware">Ransomware</option>
            <option value="ddos">DDoS Attack</option>
            <option value="port_scan">Port Scanning</option>
            <option value="dns_tunneling">DNS Tunneling</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-subtle)',
              color: '#94a3b8',
              fontSize: '0.78rem'
            }}
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Threat Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Threat ID</th>
                <th style={{ padding: '10px' }}>Attack Type</th>
                <th style={{ padding: '10px' }}>Severity</th>
                <th style={{ padding: '10px' }}>AI Confidence</th>
                <th style={{ padding: '10px' }}>Source IP</th>
                <th style={{ padding: '10px' }}>Target IP</th>
                <th style={{ padding: '10px' }}>MITRE Technique</th>
                <th style={{ padding: '10px' }}>Detected At</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredThreats.map((t) => (
                <tr
                  key={t.threat_id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedThreat(t)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#00f0ff', fontWeight: 600 }}>
                    {t.threat_id}
                  </td>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#f1f5f9' }}>
                    {t.category}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span className={`badge-${t.severity.toLowerCase()}`} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {t.severity}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#00ff9d', fontWeight: 600 }}>
                    {(t.confidence * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {t.source_ip}
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {t.destination_ip}
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.72rem', color: '#94a3b8' }}>
                    {t.mitre_technique}
                  </td>
                  <td style={{ padding: '10px', color: '#64748b', fontSize: '0.72rem' }}>
                    {t.timestamp.slice(11, 19)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedThreat(t);
                      }}
                      className="btn-cyber-outline"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    >
                      <Eye style={{ width: '12px', height: '12px' }} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Inspection Modal */}
      {selectedThreat && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel-glow" style={{ width: '100%', maxWidth: '640px', padding: '28px', position: 'relative' }}>
            <button
              onClick={() => setSelectedThreat(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <ShieldAlert style={{ color: '#00f0ff', width: '24px', height: '24px' }} />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Threat Analysis: {selectedThreat.threat_id}</h3>
                <span className={`badge-${selectedThreat.severity.toLowerCase()}`} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {selectedThreat.severity} Severity
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>ATTACK CATEGORY</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>{selectedThreat.category}</div>
                </div>
                <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>AI CONFIDENCE (Heuristic h(n))</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#00ff9d', fontFamily: 'var(--font-mono)' }}>
                    {(selectedThreat.confidence * 100).toFixed(1)}% (Risk: {selectedThreat.risk_level}/10)
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>SOURCE & TARGET IP:</span>
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.4)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#00f0ff', marginTop: '4px' }}>
                  {selectedThreat.source_ip} &rarr; {selectedThreat.destination_ip}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>PAYLOAD SIGNATURE SAMPLE:</span>
                <pre style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#ff3366',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  marginTop: '4px'
                }}>
                  {selectedThreat.payload_sample || 'Standard encrypted flow'}
                </pre>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>MITRE ATT&CK MAPPING:</span>
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(176, 92, 255, 0.1)', border: '1px solid rgba(176, 92, 255, 0.3)', color: '#b05cff', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px' }}>
                  {selectedThreat.mitre_technique}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => setSelectedThreat(null)}
                  className="btn-cyber-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
