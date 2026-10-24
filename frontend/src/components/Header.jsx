import React from 'react';
import { LogOut, LogIn } from 'lucide-react';

const pageNames = {
  dashboard: 'Dashboard', monitoring: 'Live Monitoring', threats: 'Threats & Feeds',
  incidents: 'Incidents & Triage', 'ai-lab': 'AI Algorithms Lab', simulator: 'Attack Simulator',
  'knowledge-base': 'Knowledge Base', rules: 'Rule Management', agents: 'Agents & Orchestrator',
  reports: 'Reports & Export', logs: 'Audit & System Logs', settings: 'System Settings', users: 'User Management'
};

export default function Header({ currentTab, currentUser, onOpenLogin, onLogout, wsStatus }) {
  const connected = wsStatus === 'connected';

  return (
    <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20, flexShrink: 0 }}>
      <div>
        <div className="header-page-title">{pageNames[currentTab] || 'MACDS'}</div>
        <div className="header-context">Multi-Agent Cyber Defense System · simulated environment</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div className="header-status" aria-live="polite">
          <span className={`status-dot${connected ? ' connected' : ''}`} aria-hidden="true" />
          <span>Demo telemetry stream: {connected ? 'Connected' : wsStatus === 'connecting' ? 'Connecting' : 'Unavailable'}</span>
        </div>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '.8rem', fontWeight: 620, color: 'var(--text-primary)' }}>{currentUser.username}</div>
              <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>{currentUser.role}</div>
            </div>
            <button type="button" onClick={onLogout} className="btn-cyber-outline" style={{ padding: '6px 10px', fontSize: '.74rem', gap: '6px' }} title="Sign out">
              <LogOut size={14} aria-hidden="true" /><span>Sign out</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={onOpenLogin} className="btn-cyber-primary" style={{ padding: '6px 12px', fontSize: '.76rem' }}>
            <LogIn size={14} aria-hidden="true" /><span>Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
}
