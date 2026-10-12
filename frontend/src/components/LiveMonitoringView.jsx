import React, { useState, useEffect } from 'react';
import {
  Activity,
  Network,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  Server,
  Lock,
  Unlock,
  Play,
  RotateCcw,
  Layers,
  Filter
} from 'lucide-react';
import { api } from '../api/client';

export default function LiveMonitoringView({ telemetryData }) {
  const [devices, setDevices] = useState([]);
  const [bfsResult, setBfsResult] = useState(null);
  const [dfsResult, setDfsResult] = useState(null);
  const [activeTab, setActiveTab] = useState('topology'); // topology | packets | devices
  const [activeNode, setActiveNode] = useState(null);
  const [runningSearch, setRunningSearch] = useState(false);
  const [packetFilter, setPacketFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    try {
      const data = await api.getDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDevices();
    handleRunBFS();
  }, []);

  const handleRunBFS = async () => {
    setRunningSearch(true);
    try {
      const data = await api.getBfsTopology('Router-Core');
      setBfsResult(data);
      setDfsResult(null);
    } catch (e) {
      console.error(e);
    } finally {
      setRunningSearch(false);
    }
  };

  const handleRunDFS = async () => {
    setRunningSearch(true);
    try {
      const data = await api.getDfsTopology('Router-Core');
      setDfsResult(data);
      setBfsResult(null);
    } catch (e) {
      console.error(e);
    } finally {
      setRunningSearch(false);
    }
  };

  const handleToggleIsolation = async (deviceId) => {
    try {
      await api.toggleDeviceIsolation(deviceId);
      fetchDevices();
    } catch (e) {
      alert('Error isolating device: ' + e.message);
    }
  };

  const packets = telemetryData?.live_packet ? [telemetryData.live_packet] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header & Sub-Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity style={{ color: '#00f0ff' }} />
            Network Perception & Monitoring (PRD Module 3 & Unit I)
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            Continuous traffic inspection, device discovery, and BFS/DFS graph topology exploration
          </p>
        </div>

        {/* Sub-Tab Controls */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('topology')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'topology' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
              color: activeTab === 'topology' ? '#00f0ff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Topology & BFS/DFS
          </button>
          <button
            onClick={() => setActiveTab('packets')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'packets' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
              color: activeTab === 'packets' ? '#00f0ff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Live Packet Stream
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'devices' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
              color: activeTab === 'devices' ? '#00f0ff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Connected Devices ({devices.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: TOPOLOGY & BFS/DFS */}
      {activeTab === 'topology' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          {/* Visual Topology Canvas */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Network style={{ color: '#00f0ff', width: '18px', height: '18px' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Interactive Enterprise Network Graph</h3>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleRunBFS}
                  disabled={runningSearch}
                  className="btn-cyber-primary"
                  style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                >
                  <Play style={{ width: '13px', height: '13px' }} />
                  <span>Run BFS Discovery (Unit I)</span>
                </button>
                <button
                  onClick={handleRunDFS}
                  disabled={runningSearch}
                  className="btn-cyber-outline"
                  style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                >
                  <Layers style={{ width: '13px', height: '13px' }} />
                  <span>Run DFS Attack Path</span>
                </button>
              </div>
            </div>

            {/* Simulated Topology Node Grid */}
            <div style={{
              flex: 1,
              minHeight: '380px',
              background: 'radial-gradient(circle at center, rgba(0, 240, 255, 0.05) 0%, rgba(0, 0, 0, 0.6) 80%)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              gap: '20px'
            }}>
              {/* Level 0: Gateway Core */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  onClick={() => setActiveNode({ name: 'Router-Core', ip: '192.168.1.1', type: 'Gateway Router', status: 'Online' })}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    background: 'rgba(0, 240, 255, 0.15)',
                    border: '2px solid #00f0ff',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00f0ff' }}>Router-Core (Level 0 Root)</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>192.168.1.1</div>
                </div>
              </div>

              {/* Level 1: Subnet Switches */}
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {[
                  { name: 'Switch-DMZ', ip: '192.168.1.2', status: 'Online' },
                  { name: 'Switch-Internal-LAN', ip: '192.168.1.3', status: 'Threat Ingress' },
                  { name: 'Switch-Secure-DB', ip: '192.168.1.4', status: 'Online' }
                ].map((sw) => (
                  <div
                    key={sw.name}
                    onClick={() => setActiveNode(sw)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: sw.status === 'Threat Ingress' ? 'rgba(255, 51, 102, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      border: `1px solid ${sw.status === 'Threat Ingress' ? '#ff3366' : '#3b82f6'}`,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>{sw.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{sw.ip}</div>
                  </div>
                ))}
              </div>

              {/* Level 2: Endpoints, Servers & Rogue Nodes */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { name: 'Web-App-Gateway', ip: '192.168.1.20', type: 'Web Server' },
                  { name: 'ActiveDirectory-Svr', ip: '192.168.1.10', type: 'AD Server' },
                  { name: 'Workstation-Dev-09', ip: '192.168.1.112', type: 'Host' },
                  { name: 'Unknown-ESP32-Rogue', ip: '192.168.1.244', type: 'Rogue IoT', rogue: true },
                  { name: 'Database-Prod-01', ip: '192.168.1.15', type: 'Database' }
                ].map((ep) => (
                  <div
                    key={ep.name}
                    onClick={() => setActiveNode(ep)}
                    style={{
                      flex: '1 1 120px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: ep.rogue ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${ep.rogue ? '#ff3366' : 'rgba(255, 255, 255, 0.1)'}`,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', fontWeight: 600, color: ep.rogue ? '#ff3366' : '#cbd5e1' }}>{ep.name}</div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{ep.ip}</div>
                    {ep.rogue && <span style={{ fontSize: '0.6rem', color: '#ff3366', fontWeight: 700 }}>ROGUE DEVICE</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search Trace / Node Inspector Panel */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search style={{ width: '16px', height: '16px', color: '#00f0ff' }} />
              Algorithm Search Trace (AI Unit I)
            </h3>

            {bfsResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'rgba(0, 240, 255, 0.08)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ fontWeight: 700, color: '#00f0ff' }}>Breadth First Search (BFS)</div>
                  <div style={{ color: '#94a3b8' }}>Discovered {bfsResult.total_nodes_discovered} network assets level-by-level</div>
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {bfsResult.traversal_steps?.map((step) => (
                    <div
                      key={step.step}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '4px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderLeft: `2px solid ${step.status === 'Threat' ? '#ff3366' : '#00f0ff'}`
                      }}
                    >
                      <span>Step {step.step}: <b>{step.node}</b> (D={step.depth})</span>
                      <span style={{ color: '#94a3b8' }}>{step.ip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dfsResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'rgba(176, 92, 255, 0.08)',
                  border: '1px solid rgba(176, 92, 255, 0.2)',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ fontWeight: 700, color: '#b05cff' }}>Depth First Search (DFS)</div>
                  <div style={{ color: '#94a3b8' }}>Explored recursive attack penetration depth: {dfsResult.total_nodes_traversed} nodes</div>
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {dfsResult.traversal_steps?.map((step) => (
                    <div
                      key={step.step}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '4px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderLeft: '2px solid #b05cff'
                      }}
                    >
                      <span>Step {step.step}: {step.node}</span>
                      <span style={{ color: '#64748b' }}>Depth: {step.depth}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: LIVE PACKET STREAM */}
      {activeTab === 'packets' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Real-Time Packet Stream & Protocol Inspector (FR-008, FR-011)</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['ALL', 'TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'SSH'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPacketFilter(p)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: packetFilter === p ? '#00f0ff' : 'rgba(255, 255, 255, 0.05)',
                    color: packetFilter === p ? '#000' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Packet ID</th>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                  <th style={{ padding: '10px' }}>Source IP</th>
                  <th style={{ padding: '10px' }}>Destination IP</th>
                  <th style={{ padding: '10px' }}>Protocol</th>
                  <th style={{ padding: '10px' }}>Port</th>
                  <th style={{ padding: '10px' }}>Payload Sample</th>
                  <th style={{ padding: '10px' }}>Flag</th>
                </tr>
              </thead>
              <tbody>
                {packets.map((pkt) => (
                  <tr
                    key={pkt.packet_id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: pkt.is_suspicious ? 'rgba(255, 51, 102, 0.08)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px', color: '#00f0ff' }}>{pkt.packet_id}</td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>{pkt.timestamp.slice(11, 19)}</td>
                    <td style={{ padding: '10px' }}>{pkt.source_ip}</td>
                    <td style={{ padding: '10px' }}>{pkt.destination_ip}</td>
                    <td style={{ padding: '10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)' }}>{pkt.protocol}</span></td>
                    <td style={{ padding: '10px' }}>{pkt.port}</td>
                    <td style={{ padding: '10px', color: '#cbd5e1' }}>{pkt.payload_snippet}</td>
                    <td style={{ padding: '10px' }}>
                      <span className={pkt.is_suspicious ? 'badge-critical' : 'badge-low'} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                        {pkt.flag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: CONNECTED DEVICES INVENTORY */}
      {activeTab === 'devices' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
            Connected Network Devices & Quarantine Control (FR-009, FR-033)
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Device Hostname</th>
                  <th style={{ padding: '10px' }}>IP Address</th>
                  <th style={{ padding: '10px' }}>MAC Address</th>
                  <th style={{ padding: '10px' }}>Device Type</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Rogue Check</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Isolation Action</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.device_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#f1f5f9' }}>{d.hostname}</td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#00f0ff' }}>{d.ip_address}</td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{d.mac_address}</td>
                    <td style={{ padding: '10px' }}>{d.device_type}</td>
                    <td style={{ padding: '10px' }}>
                      <span className={d.is_isolated ? 'badge-critical' : 'badge-low'} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                        {d.is_isolated ? 'Quarantined' : d.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {d.is_rogue ? (
                        <span style={{ color: '#ff3366', fontWeight: 700, fontSize: '0.72rem' }}>⚠️ UNAUTHORIZED ROGUE</span>
                      ) : (
                        <span style={{ color: '#00ff9d', fontSize: '0.72rem' }}>✓ Authorized</span>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleIsolation(d.device_id)}
                        className={d.is_isolated ? 'btn-cyber-outline' : 'btn-cyber-danger'}
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                      >
                        {d.is_isolated ? <Unlock style={{ width: '12px', height: '12px' }} /> : <Lock style={{ width: '12px', height: '12px' }} />}
                        <span>{d.is_isolated ? 'Release' : 'Isolate'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
