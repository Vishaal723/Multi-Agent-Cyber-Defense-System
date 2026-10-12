import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Layers,
  ShieldCheck,
  FileCode,
  Tag,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';

export default function KnowledgeBaseView() {
  const [mitreMatrix, setMitreMatrix] = useState([]);
  const [rules, setRules] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('mitre'); // mitre | rules
  const [selectedTechnique, setSelectedTechnique] = useState(null);

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    try {
      const [mitreData, rulesData] = await Promise.all([
        api.getMitreMatrix(),
        api.getRules('', search)
      ]);
      setMitreMatrix(mitreData);
      setRules(rulesData);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen style={{ color: '#00f0ff' }} />
            Cybersecurity Knowledge Base & MITRE ATT&CK
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            Local detection rules and version history, with a static MITRE ATT&CK reference mapping for demonstration.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('mitre')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'mitre' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
              color: activeTab === 'mitre' ? '#00f0ff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            MITRE ATT&CK Matrix
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'rules' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
              color: activeTab === 'rules' ? '#00f0ff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Knowledge Rules ({rules.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: MITRE ATT&CK MATRIX */}
      {activeTab === 'mitre' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {mitreMatrix.map((tactic) => (
              <div key={tactic.id} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#00f0ff', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{tactic.id}</span>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>{tactic.tactic}</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tactic.techniques?.map((tech) => (
                    <div
                      key={tech.id}
                      onClick={() => setSelectedTechnique({ ...tech, tacticName: tactic.tactic })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#b05cff', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{tech.id}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginTop: '2px' }}>{tech.name}</div>
                      <p style={{ fontSize: '0.68rem', color: '#64748b', margin: '4px 0 0', lineHeight: 1.2 }}>{tech.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: RULES REPOSITORY */}
      {activeTab === 'rules' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Active Knowledge Base Rules & Version History (FR-019, FR-020)</h3>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '8px', width: '14px', height: '14px', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search rules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: '6px 12px 6px 30px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.78rem' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Rule Name</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Condition Expression</th>
                  <th style={{ padding: '10px' }}>Action Trigger</th>
                  <th style={{ padding: '10px' }}>Severity</th>
                  <th style={{ padding: '10px' }}>Version</th>
                  <th style={{ padding: '10px' }}>Author</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.rule_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#f1f5f9' }}>{r.name}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', fontSize: '0.72rem' }}>
                        {r.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#00f0ff' }}>
                      {r.condition}
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#00ff9d' }}>
                      {r.action}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span className={`badge-${r.severity.toLowerCase()}`} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                        {r.severity}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                      v{r.version}
                    </td>
                    <td style={{ padding: '10px', color: '#94a3b8', fontSize: '0.72rem' }}>
                      {r.author}
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
