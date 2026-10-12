import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Save,
  CheckCircle2,
  Bell,
  Cpu,
  BrainCircuit,
  Sliders
} from 'lucide-react';
import { api } from '../api/client';

export default function SettingsView() {
  const [settings, setSettings] = useState({
    detection_sensitivity: 'High',
    auto_mitigation_enabled: 'true',
    threat_correlation_window: '300',
    csp_optimization_mode: 'Strict',
    game_theory_depth: '3',
    dashboard_refresh_interval_ms: '1500',
    alert_channels: '["dashboard", "email_sim", "slack_sim"]'
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data && Object.keys(data).length > 0) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSavedSuccess(false);
    try {
      for (const [k, v] of Object.entries(settings)) {
        await api.updateSetting(k, { value: v });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Error updating system settings: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings style={{ color: '#00f0ff' }} />
          System & Swarm Configuration (PRD Module 13 FR-050)
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
          Global detection thresholds, autonomous policy safeguards, and alert delivery channels
        </p>
      </div>

      {savedSuccess && (
        <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(0, 255, 157, 0.15)', border: '1px solid rgba(0, 255, 157, 0.4)', color: '#00ff9d', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 style={{ width: '16px', height: '16px' }} />
          <span>System configuration parameters saved and synced across all 9 AI agents.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Detection Engine */}
        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <BrainCircuit style={{ width: '16px', height: '16px' }} />
            AI Detection & Inference Engine
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Detection Sensitivity</label>
              <select
                value={settings.detection_sensitivity}
                onChange={(e) => setSettings({ ...settings, detection_sensitivity: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
              >
                <option value="High">High (Strict Zero-Trust Heuristics)</option>
                <option value="Medium">Medium (Balanced)</option>
                <option value="Low">Low (Permissive)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Threat Correlation Window (seconds)</label>
              <input
                type="number"
                value={settings.threat_correlation_window}
                onChange={(e) => setSettings({ ...settings, threat_correlation_window: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#00f0ff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
              />
            </div>
          </div>
        </div>

        {/* Autonomous Mitigation Policy */}
        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#00ff9d', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Shield style={{ width: '16px', height: '16px' }} />
            Autonomous Response Policy (PRD Module 9)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Autonomous Mitigation Mode</label>
              <select
                value={settings.auto_mitigation_enabled}
                onChange={(e) => setSettings({ ...settings, auto_mitigation_enabled: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
              >
                <option value="true">Fully Autonomous (Instant Execution)</option>
                <option value="false">Human-in-the-Loop (Analyst Approval Required)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>CSP Policy Solver Constraint Mode</label>
              <select
                value={settings.csp_optimization_mode}
                onChange={(e) => setSettings({ ...settings, csp_optimization_mode: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
              >
                <option value="Strict">Strict Zero-Trust (No exceptions)</option>
                <option value="Permissive">Permissive Mode (Allows temp exemptions)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffb700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Bell style={{ width: '16px', height: '16px' }} />
            Alert Delivery & Relays (FR-035)
          </h3>

          <div style={{ display: 'flex', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              <span>SOC Dashboard WebSocket Stream</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              <span>Email Relay (Simulated)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              <span>Slack / Teams Webhook (Simulated)</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button type="submit" className="btn-cyber-primary" style={{ padding: '8px 20px' }}>
            <Save style={{ width: '15px', height: '15px' }} />
            <span>Save Settings</span>
          </button>
        </div>

      </form>

    </div>
  );
}
