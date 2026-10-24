import React from 'react';
import {
  LayoutDashboard, Activity, ShieldAlert, FolderKanban, BrainCircuit,
  BookOpen, Sliders, Bot, Zap, FileText, ScrollText, Settings, Users,
  Shield
} from 'lucide-react';

const groups = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
      { id: 'threats', label: 'Threats & Feeds', icon: ShieldAlert },
      { id: 'incidents', label: 'Incidents & Triage', icon: FolderKanban }
    ]
  },
  {
    label: 'Analysis workbench',
    items: [
      { id: 'ai-lab', label: 'AI Algorithms Lab', icon: BrainCircuit },
      { id: 'simulator', label: 'Attack Simulator', icon: Zap },
      { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
      { id: 'rules', label: 'Rule Management', icon: Sliders },
      { id: 'agents', label: 'Agents & Orchestrator', icon: Bot }
    ]
  },
  {
    label: 'Governance',
    items: [
      { id: 'reports', label: 'Reports & Export', icon: FileText },
      { id: 'logs', label: 'Audit & System Logs', icon: ScrollText },
      { id: 'settings', label: 'System Settings', icon: Settings },
      { id: 'users', label: 'User Management', icon: Users, adminOnly: true }
    ]
  }
];

export default function Sidebar({ currentTab, onSelectTab, currentUser }) {
  const userRole = currentUser?.role || 'Guest';

  return (
    <aside className="app-sidebar" aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="sidebar-brand-mark"><Shield size={17} aria-hidden="true" /></span>
        <div>
          <div className="sidebar-brand-name">MACDS</div>
          <div className="sidebar-brand-subtitle">Cyber defense simulation</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '4px 10px 14px', overflowY: 'auto' }}>
        {groups.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <div className="sidebar-section-label">{group.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {group.items.map((item) => {
                if (item.adminOnly && userRole !== 'Administrator') return null;
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className="sidebar-nav-button"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '.82rem', color: 'var(--text-secondary)', background: 'transparent' }}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-configured">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '.68rem', color: 'var(--text-secondary)', fontWeight: 650 }}>Agent architecture</span>
            <span style={{ fontSize: '.68rem', color: '#b5c9d5', fontWeight: 650 }}>9 configured</span>
          </div>
          <div style={{ fontSize: '.66rem', color: 'var(--text-muted)' }}>Configured roles; runtime health is not measured here.</div>
        </div>
      </div>
    </aside>
  );
}
