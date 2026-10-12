import React, { useState, useEffect } from 'react';
import { Shield, LogOut, LogIn, Clock } from 'lucide-react';

export default function Header({ currentUser, onOpenLogin, onLogout, wsStatus }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isConnected = wsStatus === 'connected';

  return (
    <header style={{
      height: '60px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 20,
      flexShrink: 0
    }}>
      {/* Brand & System Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: 'rgba(0, 240, 255, 0.12)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Shield style={{ color: '#00f0ff', width: '18px', height: '18px' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.3px', color: 'var(--text-primary)' }}>
            MACDS
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Multi-Agent Cyber Defense System
          </div>
        </div>
      </div>

      {/* Telemetry status and clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* WS Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            display: 'inline-block',
            background: isConnected ? '#60a5fa' : '#fbbf24',
          }} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            Telemetry:{' '}
            <span style={{ color: isConnected ? '#60a5fa' : '#fbbf24', fontWeight: 600 }}>
              {isConnected ? 'Connected' : wsStatus === 'connecting' ? 'Connecting' : 'Unavailable'}
            </span>
          </span>
        </div>

        {/* Live Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <Clock style={{ width: '14px', height: '14px' }} />
          <span>{time}</span>
        </div>
      </div>

      {/* User & Auth Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentUser.username}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {currentUser.role}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="btn-cyber-outline"
              style={{ padding: '5px 10px', fontSize: '0.75rem', gap: '5px' }}
              title="Logout"
            >
              <LogOut style={{ width: '13px', height: '13px' }} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="btn-cyber-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <LogIn style={{ width: '14px', height: '14px' }} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
