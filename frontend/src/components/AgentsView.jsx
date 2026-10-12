import React, { useState, useEffect } from 'react';
import {
  Bot,
  Power,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Activity,
  Zap,
  BrainCircuit,
  Settings
} from 'lucide-react';
import { api } from '../api/client';

export default function AgentsView({ telemetryData }) {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchAgents = async () => {
    try {
      const data = await api.getAgents();
      setAgents(data);
      if (data.length > 0 && !selectedAgent) {
        setSelectedAgent(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleControlAgent = async (agentId, action) => {
    setActionSuccess(null);
    try {
      await api.controlAgent(agentId, action);
      setActionSuccess(`Command '${action}' dispatched to agent.`);
      fetchAgents();
    } catch (err) {
      alert('Error controlling agent: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
      
      {/* LEFT: Agent Swarm Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot style={{ color: '#00f0ff' }} />
            Multi-Agent Swarm Orchestrator (PRD Section 9, 10 & FR-049)
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            Manage lifecycle, heartbeat monitoring, and PEAS runtime parameters across all 9 autonomous agents
          </p>
        </div>

        {actionSuccess && (
          <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(0, 255, 157, 0.15)', border: '1px solid rgba(0, 255, 157, 0.4)', color: '#00ff9d', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 style={{ width: '16px', height: '16px' }} />
            <span>{actionSuccess}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {agents.map((agent) => {
            const isSelected = selectedAgent?.agent_id === agent.agent_id;
            return (
              <div
                key={agent.agent_id}
                onClick={() => setSelectedAgent(agent)}
                className={isSelected ? 'glass-panel-glow' : 'glass-panel'}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{agent.type} Agent</span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>{agent.name}</h4>
                  </div>
                  <div className="pulse-active" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '0.72rem', background: 'rgba(0, 0, 0, 0.3)', padding: '8px', borderRadius: '6px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>CPU</span>
                    <div style={{ color: '#00f0ff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{agent.cpu_usage}%</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>RAM</span>
                    <div style={{ color: '#b05cff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{agent.memory_usage}%</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Latency</span>
                    <div style={{ color: '#00ff9d', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{agent.latency_ms}ms</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                  <span>Status: <b style={{ color: agent.status === 'Active' ? '#00ff9d' : '#ff3366' }}>{agent.status}</b></span>
                  <span>{agent.heartbeat.slice(11, 19)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Agent Deep Inspector & Controls */}
      {selectedAgent && (
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#00f0ff', fontWeight: 700 }}>SELECTED ACTOR</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>{selectedAgent.name}</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>Role Type: {selectedAgent.type}</p>
          </div>

          {/* Quick Lifecycle Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleControlAgent(selectedAgent.agent_id, 'restart')}
              className="btn-cyber-primary"
              style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.75rem' }}
            >
              <RotateCcw style={{ width: '13px', height: '13px' }} />
              <span>Restart Agent (NFR-006)</span>
            </button>
            <button
              onClick={() => handleControlAgent(selectedAgent.agent_id, selectedAgent.status === 'Active' ? 'stop' : 'start')}
              className="btn-cyber-outline"
              style={{ padding: '8px', fontSize: '0.75rem' }}
            >
              <Power style={{ width: '13px', height: '13px', color: selectedAgent.status === 'Active' ? '#ff3366' : '#00ff9d' }} />
            </button>
          </div>

          {/* Agent Configuration JSON */}
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>RUNTIME CONFIGURATION:</span>
            <pre style={{
              marginTop: '6px',
              padding: '12px',
              borderRadius: '6px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#00f0ff',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              overflowX: 'auto'
            }}>
              {JSON.stringify(selectedAgent.config, null, 2)}
            </pre>
          </div>

          {/* AI Syllabus Association */}
          <div style={{ background: 'rgba(176, 92, 255, 0.08)', border: '1px solid rgba(176, 92, 255, 0.2)', padding: '12px', borderRadius: '6px', fontSize: '0.75rem' }}>
            <b style={{ color: '#b05cff' }}>AI Syllabus Integration:</b>
            <p style={{ color: '#cbd5e1', margin: '4px 0 0' }}>
              Operates rational decision algorithms, PEAS environment perception, and asynchronous message coordination.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
