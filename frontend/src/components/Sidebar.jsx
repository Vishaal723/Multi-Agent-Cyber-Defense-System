import React from 'react';
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  FolderKanban,
  BrainCircuit,
  BookOpen,
  Sliders,
  Bot,
  Zap,
  FileText,
  ScrollText,
  Settings,
  Users
} from 'lucide-react';

export default function Sidebar({ currentTab, onSelectTab, currentUser }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'Live' },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'threats', label: 'Threats & Feeds', icon: ShieldAlert },
    { id: 'incidents', label: 'Incidents & Triage', icon: FolderKanban },
    { id: 'ai-lab', label: 'AI Algorithms Lab', icon: BrainCircuit, highlight: true },
    { id: 'simulator', label: 'Attack Simulator', icon: Zap, highlight: true },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    { id: 'rules', label: 'Rule Management', icon: Sliders },
    { id: 'agents', label: 'Agents & Orchestrator', icon: Bot },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'logs', label: 'Audit & System Logs', icon: ScrollText },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'users', label: 'User Management', icon: Users, adminOnly: true }
  ];

  const userRole = currentUser?.role || 'Guest';

  return (
    <aside style={{
      width: '250px',
      background: 'rgba(9, 14, 24, 0.95)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      userSelect: 'none'
    }}>
      {/* Navigation Links */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase', padding: '6px 12px' }}>
          Operations & Feeds
        </div>

        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                color: isActive ? '#00f0ff' : '#94a3b8',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                borderLeft: isActive ? '3px solid #00f0ff' : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon style={{ width: '17px', height: '17px', color: isActive ? '#00f0ff' : '#64748b' }} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '10px',
                  background: 'rgba(0, 255, 157, 0.15)',
                  color: '#00ff9d',
                  border: '1px solid rgba(0, 255, 157, 0.3)'
                }}>{item.badge}</span>
              )}
            </button>
          );
        })}

        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase', padding: '12px 12px 6px' }}>
          AI Core & Workbenches
        </div>

        {navItems.slice(4, 9).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                color: isActive ? '#00f0ff' : '#94a3b8',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                borderLeft: isActive ? '3px solid #00f0ff' : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon style={{ width: '17px', height: '17px', color: isActive ? '#00f0ff' : (item.highlight ? '#b05cff' : '#64748b') }} />
                <span>{item.label}</span>
              </div>
              {item.highlight && !isActive && (
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '10px',
                  background: 'rgba(176, 92, 255, 0.15)',
                  color: '#b05cff',
                  border: '1px solid rgba(176, 92, 255, 0.3)'
                }}>AI</span>
              )}
            </button>
          );
        })}

        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase', padding: '12px 12px 6px' }}>
          Intelligence & Governance
        </div>

        {navItems.slice(9).map((item) => {
          if (item.adminOnly && userRole !== 'Administrator') return null;
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                color: isActive ? '#00f0ff' : '#94a3b8',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                borderLeft: isActive ? '3px solid #00f0ff' : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon style={{ width: '17px', height: '17px', color: isActive ? '#00f0ff' : '#64748b' }} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer SOC Status Card */}
      <div style={{
        padding: '14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(6, 10, 18, 0.8)'
      }}>
        <div style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>AGENT ARCHITECTURE</span>
            <span style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 700 }}>9 CONFIGURED</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Configured agent roles; live health is not measured here.</div>
        </div>
      </div>
    </aside>
  );
}
