import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  ShieldAlert,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  UserX,
  FileDown,
  BrainCircuit,
  Clock,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';

export default function IncidentsView({ preselectedIncidentId }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      if (preselectedIncidentId) {
        const found = data.find(i => i.incident_id === preselectedIncidentId);
        if (found) setSelectedIncident(found);
      } else if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [preselectedIncidentId]);

  const handleRespond = async (action, target, reason) => {
    if (!selectedIncident) return;
    setResponding(true);
    setActionSuccess(null);
    try {
      const res = await api.respondToIncident(selectedIncident.incident_id, action, target, reason);
      setActionSuccess(`Action '${action}' executed successfully against target '${target}'!`);
      fetchIncidents();
      // Reload current incident
      const updated = await api.getIncidentDetails(selectedIncident.incident_id);
      setSelectedIncident(updated);
    } catch (e) {
      alert('Error executing response: ' + e.message);
    } finally {
      setResponding(false);
    }
  };

  const handleFeedback = async (type) => {
    if (!selectedIncident) return;
    try {
      await api.submitFeedback(selectedIncident.incident_id, type, 'Analyst console verification');
      setActionSuccess(`Feedback recorded: Marked as ${type.replace('_', ' ')}.`);
      fetchIncidents();
    } catch (e) {
      alert('Error submitting feedback: ' + e.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
      
      {/* LEFT COLUMN: Incidents List */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderKanban style={{ color: '#00f0ff', width: '18px', height: '18px' }} />
            Correlated Incidents (FR-018)
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{incidents.length} Cases</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
          {incidents.map((inc) => {
            const isSelected = selectedIncident?.incident_id === inc.incident_id;
            return (
              <div
                key={inc.incident_id}
                onClick={() => { setSelectedIncident(inc); setActionSuccess(null); }}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.05)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isSelected ? '#00f0ff' : '#94a3b8' }}>
                    {inc.incident_id}
                  </span>
                  <span className={`badge-${inc.severity.toLowerCase()}`} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                    {inc.severity}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', marginTop: '6px' }}>
                  {inc.title}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>
                  <span>Status: <b style={{ color: inc.status === 'Mitigated' ? '#00ff9d' : '#ffb700' }}>{inc.status}</b></span>
                  <span>{inc.created_at.slice(11, 19)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Incident Investigation & Response Workbench */}
      {selectedIncident ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00f0ff', fontFamily: 'var(--font-mono)' }}>
                    {selectedIncident.incident_id}
                  </span>
                  <span className={`badge-${selectedIncident.severity.toLowerCase()}`} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                    {selectedIncident.severity}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    background: selectedIncident.status === 'Mitigated' ? 'rgba(0, 255, 157, 0.15)' : 'rgba(255, 183, 0, 0.15)',
                    color: selectedIncident.status === 'Mitigated' ? '#00ff9d' : '#ffb700',
                    border: `1px solid ${selectedIncident.status === 'Mitigated' ? 'rgba(0, 255, 157, 0.4)' : 'rgba(255, 183, 0, 0.4)'}`
                  }}>
                    {selectedIncident.status}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '6px' }}>
                  {selectedIncident.title}
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                  Triaged by: <b style={{ color: '#f1f5f9' }}>{selectedIncident.assigned_to || 'AI Coordinator Agent'}</b> | Created: {selectedIncident.created_at}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => api.exportPdf(selectedIncident.incident_id)}
                  className="btn-cyber-outline"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  <FileDown style={{ width: '14px', height: '14px', color: '#00f0ff' }} />
                  <span>Export PDF Report (FR-044)</span>
                </button>
              </div>
            </div>

            {actionSuccess && (
              <div style={{
                marginTop: '14px',
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(0, 255, 157, 0.15)',
                border: '1px solid rgba(0, 255, 157, 0.4)',
                color: '#00ff9d',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span>{actionSuccess}</span>
              </div>
            )}
          </div>

          {/* 2-Col Grid: Kill Chain & AI Reasoning */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Attack Chain & Timeline */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock style={{ width: '16px', height: '16px', color: '#00f0ff' }} />
                Kill-Chain Timeline (Threat Correlation Agent)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedIncident.timeline?.map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(0, 240, 255, 0.15)',
                      border: '1px solid #00f0ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#00f0ff',
                      flexShrink: 0
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, background: 'rgba(0, 0, 0, 0.3)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                        <span style={{ fontWeight: 700, color: '#00f0ff' }}>{t.stage}</span>
                        <span style={{ color: '#64748b' }}>{t.agent}</span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: '4px 0 0' }}>{t.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Decision Reasoning Panel (Unit IV FOL) */}
            <div className="glass-panel-glow" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BrainCircuit style={{ width: '16px', height: '16px', color: '#b05cff' }} />
                  AI Logic Inference & Resolution
                </h3>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(176, 92, 255, 0.2)', color: '#b05cff' }}>
                  Unit IV FOL Engine
                </span>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '12px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>Deduction Conclusions:</span>
                  <div style={{ color: '#00ff9d', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {selectedIncident.decision_explanation?.inferred_conclusions?.join(', ') || 'Inference pending'}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>Resolution Proof:</span>
                  <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: '2px' }}>
                    {selectedIncident.decision_explanation?.resolution_status || 'Validated: Non-conflicting zero-trust clause'}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>Autonomous Recommendation:</span>
                  <div style={{ color: '#00f0ff', fontWeight: 700, marginTop: '2px' }}>
                    {selectedIncident.recommended_action || 'BLOCK_IP_ADDRESS'}
                  </div>
                </div>
              </div>

              {/* Feedback buttons */}
              <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Analyst Verification:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleFeedback('True_Positive')}
                    className="btn-cyber-outline"
                    style={{ padding: '4px 10px', fontSize: '0.72rem', color: '#00ff9d' }}
                  >
                    <ThumbsUp style={{ width: '12px', height: '12px' }} />
                    <span>True Positive</span>
                  </button>
                  <button
                    onClick={() => handleFeedback('False_Positive')}
                    className="btn-cyber-outline"
                    style={{ padding: '4px 10px', fontSize: '0.72rem', color: '#ff3366' }}
                  >
                    <ThumbsDown style={{ width: '12px', height: '12px' }} />
                    <span>False Positive</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Response Execution Action Center (PRD Module 9) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap style={{ width: '16px', height: '16px', color: '#ffb700' }} />
              Response Agent Actuator Controls (FR-032 to FR-034)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <button
                onClick={() => handleRespond('BLOCK_IP', selectedIncident.evidence?.source_ip || '45.33.32.156', 'Attacker IP block')}
                disabled={responding}
                className="btn-cyber-danger"
                style={{ padding: '10px', justifyContent: 'center' }}
              >
                <Lock style={{ width: '14px', height: '14px' }} />
                <span>Block Ingress IP ({selectedIncident.evidence?.source_ip || '45.33.32.156'})</span>
              </button>

              <button
                onClick={() => handleRespond('ISOLATE_DEVICE', selectedIncident.evidence?.target_ip || '192.168.1.112', 'Endpoint Quarantine')}
                disabled={responding}
                className="btn-cyber-primary"
                style={{ padding: '10px', justifyContent: 'center' }}
              >
                <ShieldAlert style={{ width: '14px', height: '14px' }} />
                <span>Isolate Endpoint ({selectedIncident.evidence?.target_ip || '192.168.1.112'})</span>
              </button>

              <button
                onClick={() => handleRespond('LOCKOUT_USER', 'admin', 'Compromised account protection')}
                disabled={responding}
                className="btn-cyber-outline"
                style={{ padding: '10px', justifyContent: 'center' }}
              >
                <UserX style={{ width: '14px', height: '14px', color: '#ffb700' }} />
                <span>Lockout Targeted Account</span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Select an incident from the left queue to investigate
        </div>
      )}

    </div>
  );
}
