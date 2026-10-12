import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Play,
  FileCode,
  Shield,
  X
} from 'lucide-react';
import { api } from '../api/client';

export default function RuleManagementView() {
  const [rules, setRules] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [testPayload, setTestPayload] = useState("admin' OR 1=1 --");
  const [testResult, setTestResult] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [condition, setCondition] = useState('');
  const [action, setAction] = useState('BLOCK_IP_AND_ALERT');
  const [category, setCategory] = useState('Web Attack');
  const [severity, setSeverity] = useState('High');
  const [mitreMapping, setMitreMapping] = useState('T1190');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const data = await api.getRules();
      setRules(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      await api.createRule({
        name,
        condition,
        action,
        category,
        severity,
        mitre_mapping: mitreMapping
      });
      setIsCreating(false);
      setName('');
      setCondition('');
      fetchRules();
    } catch (err) {
      alert('Error creating rule: ' + err.message);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this detection rule?')) return;
    try {
      await api.deleteRule(ruleId);
      fetchRules();
    } catch (err) {
      alert('Error deleting rule: ' + err.message);
    }
  };

  const handleTestSandbox = () => {
    // Test sample against rules
    const matched = [];
    const p = testPayload.toLowerCase();
    for (const r of rules) {
      if (
        (r.category === 'Web Attack' && (p.includes('select') || p.includes('1=1') || p.includes('--') || p.includes('union'))) ||
        (r.category === 'Authentication' && (p.includes('failed') || p.includes('login') || p.includes('admin'))) ||
        (r.category === 'Malware' && (p.includes('powershell') || p.includes('beacon') || p.includes('enc'))) ||
        (r.category === 'Network' && (p.includes('syn') || p.includes('flood')))
      ) {
        matched.push(r);
      }
    }
    setTestResult({
      evaluated: true,
      matches: matched,
      firedCount: matched.length
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
      
      {/* LEFT: Rules Table & Creator */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders style={{ color: '#00f0ff' }} />
              Rule Management & Policy Engine
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Create, update, version, and validate security detection and firewall rules
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="btn-cyber-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <Plus style={{ width: '15px', height: '15px' }} />
            <span>Create New Rule</span>
          </button>
        </div>

        {/* Create Rule Modal / Drawer */}
        {isCreating && (
          <div className="glass-panel-glow" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#00f0ff' }}>Add New Detection Rule</h3>
              <button onClick={() => setIsCreating(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced SQLi Pattern"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
                  >
                    <option value="Web Attack">Web Attack</option>
                    <option value="Authentication">Authentication</option>
                    <option value="Malware">Malware</option>
                    <option value="Network">Network</option>
                    <option value="Exfiltration">Exfiltration</option>
                    <option value="Reconnaissance">Reconnaissance</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Condition Expression</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. payload matches (' OR 1=1|UNION SELECT)"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#00f0ff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Action Trigger</label>
                  <input
                    type="text"
                    required
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#00ff9d', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.8rem' }}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>MITRE Mapping</label>
                  <input
                    type="text"
                    value={mitreMapping}
                    onChange={(e) => setMitreMapping(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#b05cff', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsCreating(false)} className="btn-cyber-outline" style={{ padding: '6px 14px' }}>Cancel</button>
                <button type="submit" className="btn-cyber-primary" style={{ padding: '6px 16px' }}>Save Rule</button>
              </div>
            </form>
          </div>
        )}

        {/* Rules Table */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Rule Name</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Condition</th>
                  <th style={{ padding: '10px' }}>Action</th>
                  <th style={{ padding: '10px' }}>Severity</th>
                  <th style={{ padding: '10px' }}>Version</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.rule_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#f1f5f9' }}>{r.name}</td>
                    <td style={{ padding: '10px' }}>{r.category}</td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#00f0ff', fontSize: '0.74rem' }}>{r.condition}</td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#00ff9d', fontSize: '0.74rem' }}>{r.action}</td>
                    <td style={{ padding: '10px' }}>
                      <span className={`badge-${r.severity.toLowerCase()}`} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                        {r.severity}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#cbd5e1' }}>v{r.version}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteRule(r.rule_id)}
                        style={{ background: 'transparent', border: 'none', color: '#ff3366', cursor: 'pointer', padding: '4px' }}
                        title="Delete Rule"
                      >
                        <Trash2 style={{ width: '15px', height: '15px' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RIGHT: Interactive Rule Sandbox */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Play style={{ width: '16px', height: '16px', color: '#00ff9d' }} />
          Rule Testing Sandbox · Simulated Payloads
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
          Test local rule matches against simulated payload text. This check does not modify rules or deploy them to production.
        </p>

        <div>
          <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Test Payload String</label>
          <textarea
            rows={4}
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', color: '#00f0ff', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
          />
        </div>

        <button onClick={handleTestSandbox} className="btn-cyber-primary" style={{ justifyContent: 'center', padding: '8px' }}>
          <Play style={{ width: '14px', height: '14px' }} />
          <span>Execute Sandbox Test</span>
        </button>

        {testResult && (
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: testResult.firedCount > 0 ? '#00ff9d' : '#ffb700', fontWeight: 700 }}>
              {testResult.firedCount > 0 ? `✓ ${testResult.firedCount} Rules Fired Successfully` : 'No Rules Triggered for Payload'}
            </div>
            {testResult.matches.map((m) => (
              <div key={m.rule_id} style={{ padding: '6px', borderRadius: '4px', background: 'rgba(0, 255, 157, 0.08)', fontSize: '0.72rem' }}>
                <b style={{ color: '#00ff9d' }}>{m.name}</b> &rarr; Action: {m.action}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
