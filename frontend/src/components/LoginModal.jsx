import React, { useState } from 'react';
import { Shield, Lock, User, Key, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const presets = [
    { name: 'Administrator', user: 'admin', pass: 'Admin@123', desc: 'Full root & agent control' },
    { name: 'Security Analyst', user: 'analyst', pass: 'Analyst@123', desc: 'Threat triage & incident response' },
    { name: 'Network Administrator', user: 'netadmin', pass: 'NetAdmin@123', desc: 'Topology & firewall ACL control' },
    { name: 'Read-Only Auditor', user: 'auditor', pass: 'Auditor@123', desc: 'Compliance & audit log review' }
  ];

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(username, password);
      onLoginSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (p) => {
    setUsername(p.user);
    setPassword(p.pass);
    setError(null);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel-glow" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '28px',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(0, 240, 255, 0.15)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock style={{ color: '#00f0ff', width: '22px', height: '22px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>SOC Operator Authentication</h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Select an RBAC role profile or enter credentials</p>
          </div>
        </div>

        {/* Role Presets */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Quick Role Switcher:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
            {presets.map((p) => {
              const isSelected = username === p.user;
              return (
                <button
                  key={p.user}
                  type="button"
                  onClick={() => selectPreset(p)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    textAlign: 'left',
                    background: isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isSelected ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                    color: isSelected ? '#00f0ff' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b' }}>{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(255, 51, 102, 0.15)',
            border: '1px solid rgba(255, 51, 102, 0.4)',
            color: '#ff3366',
            fontSize: '0.8rem',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: '10px', top: '10px', width: '16px', height: '16px', color: '#64748b' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Key style={{ position: 'absolute', left: '10px', top: '10px', width: '16px', height: '16px', color: '#64748b' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-cyber-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '10px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to SOC Session'}
          </button>
        </form>
      </div>
    </div>
  );
}
