import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import InlineError from './InlineError';

const panelStyle = { padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' };
const subtleText = { color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.5 };

export default function InvestigationWorkbench({ incidentId }) {
  const [investigation, setInvestigation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [constraintText, setConstraintText] = useState('Do not isolate or shut down this business-critical server.');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [executionResult, setExecutionResult] = useState(null);

  const refresh = async (preserveError = false) => {
    if (!incidentId) return;
    setLoading(true);
    if (!preserveError) setError('');
    try {
      const data = await api.getInvestigation(incidentId);
      setInvestigation(data);
      setSelectedDevice((current) => current || data.assets?.[0]?.device_id || '');
    } catch (err) {
      if (!preserveError) setError(err?.message || 'Unable to load the investigation evidence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [incidentId]);

  const plans = investigation?.plans || [];
  const selectedPlan = useMemo(() => plans.find((plan) => plan.plan_id === selectedPlanId), [plans, selectedPlanId]);

  const addCriticalAsset = async () => {
    setSavingAsset(true);
    setError('');
    try {
      const data = await api.setCriticalAsset(incidentId, selectedDevice, constraintText);
      setInvestigation(data);
      setSelectedPlanId('');
      setExecutionResult(null);
    } catch (err) {
      setError(err?.message || 'Unable to save the critical-asset constraint.');
    } finally {
      setSavingAsset(false);
    }
  };

  const removeCriticalAsset = async (deviceId) => {
    setError('');
    try {
      const data = await api.clearCriticalAsset(incidentId, deviceId);
      setInvestigation(data);
      setSelectedPlanId('');
      setExecutionResult(null);
    } catch (err) {
      setError(err?.message || 'Unable to clear the constraint.');
    }
  };

  const generatePlans = async () => {
    setGenerating(true);
    setError('');
    setSelectedPlanId('');
    setExecutionResult(null);
    try {
      const generated = await api.generateInvestigationPlans(incidentId);
      setInvestigation((current) => ({ ...current, plans: generated }));
    } catch (err) {
      setError(err?.message || 'Unable to generate response plans.');
    } finally {
      setGenerating(false);
    }
  };

  const executeSelectedPlan = async () => {
    if (!selectedPlan?.valid || !selectedPlanId) return;
    setExecuting(true);
    setError('');
    setExecutionResult(null);
    try {
      const result = await api.executeInvestigationPlan(incidentId, selectedPlanId);
      setExecutionResult(result);
      await refresh(true);
    } catch (err) {
      setError(err?.message || 'The selected simulated plan was not executed.');
      await refresh(true);
    } finally {
      setExecuting(false);
    }
  };

  const formatError = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

  return (
    <section className="glass-panel" style={panelStyle} aria-labelledby="investigation-workbench-title">
      <div>
        <h3 id="investigation-workbench-title" style={{ margin: 0, fontSize: '1rem', color: '#f1f5f9' }}>
          Investigation & Simulated Response Planning
        </h3>
        <p style={{ ...subtleText, margin: '5px 0 0' }}>
          Evidence and route relationships are derived from this simulator run and the configured demo topology. All actions remain simulated.
        </p>
      </div>

      <InlineError message={error} onRetry={() => refresh()} />
      {loading && !investigation ? <div style={subtleText}>Loading persisted investigation…</div> : null}

      {investigation && (
        <>
          <div style={{ border: '1px solid rgba(148,163,184,0.18)', borderRadius: 8, padding: 14 }}>
            <h4 style={{ margin: '0 0 8px', color: '#67e8f9', fontSize: '0.86rem' }}>Simulated attack-chain reconstruction</h4>
            <div style={{ ...subtleText, marginBottom: 8 }}>
              Status: <b style={{ color: investigation.reconstruction.status === 'inferred_route' ? '#fbbf24' : '#f87171' }}>{investigation.reconstruction.status === 'inferred_route' ? 'route inferred' : 'incomplete'}</b>
              {' · '}{investigation.reconstruction.generated_events.length} generated event(s)
            </div>
            {investigation.reconstruction.generated_events.map((event) => (
              <div key={event.event_id} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#cbd5e1', padding: '7px 9px', background: 'rgba(0,0,0,0.22)', borderRadius: 6 }}>
                {event.timestamp} · {event.source_ip} → {event.destination_ip} · {event.attack_type} · evidence {event.event_id}
                <div style={{ ...subtleText, marginTop: 3, overflowWrap: 'anywhere' }}>Generated payload: {event.payload_sample || 'Unavailable'}</div>
              </div>
            ))}
            {investigation.reconstruction.nodes.length ? (
              <ol style={{ margin: '10px 0 6px', paddingLeft: 22, color: '#e2e8f0', fontSize: '0.75rem' }}>
                {investigation.reconstruction.nodes.map((node, index) => (
                  <li key={`${node.id}-${index}`} style={{ marginBottom: 4 }}>
                    <b>{node.label}</b> <span style={subtleText}>({node.basis})</span>
                  </li>
                ))}
              </ol>
            ) : <p style={subtleText}>No endpoint path can be reconstructed from the stored event.</p>}
            <p style={{ ...subtleText, margin: '5px 0 0' }}>{investigation.reconstruction.explanation}</p>
            <p style={{ ...subtleText, margin: '3px 0 0' }}>{investigation.reconstruction.evidence_scope}</p>
            {investigation.reconstruction.relationships.map((edge, index) => (
              <div key={`${edge.from}-${edge.to}-${index}`} style={{ ...subtleText, marginTop: 4 }}>
                Relationship: {edge.from} → {edge.to} · {edge.inferred ? 'inferred' : 'event-recorded'} · {edge.basis}
              </div>
            ))}
          </div>

          <div style={{ border: '1px solid rgba(148,163,184,0.18)', borderRadius: 8, padding: 14 }}>
            <h4 style={{ margin: '0 0 6px', color: '#67e8f9', fontSize: '0.86rem' }}>Business-critical assets & active constraints</h4>
            <p style={{ ...subtleText, margin: '0 0 10px' }}>Constraints apply to simulated response actions and are checked again by the backend immediately before execution.</p>
            {investigation.critical_assets.length ? investigation.critical_assets.map((asset) => (
              <div key={asset.device_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                <div style={subtleText}><b style={{ color: '#f1f5f9' }}>{asset.hostname} ({asset.ip_address})</b><br />Constraint: {asset.constraint_text}</div>
                <button type="button" className="btn-cyber-outline" onClick={() => removeCriticalAsset(asset.device_id)}>Clear</button>
              </div>
            )) : <p style={subtleText}>No critical-asset constraint is active for this investigation.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 0.8fr) minmax(220px, 1.4fr) auto', gap: 8, alignItems: 'end', marginTop: 8 }}>
              <label style={subtleText}>Simulated asset
                <select value={selectedDevice} onChange={(event) => setSelectedDevice(event.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                  {investigation.assets.map((asset) => <option key={asset.device_id} value={asset.device_id}>{asset.hostname} · {asset.ip_address}</option>)}
                </select>
              </label>
              <label style={subtleText}>Constraint
                <input value={constraintText} onChange={(event) => setConstraintText(event.target.value)} maxLength={500} style={{ display: 'block', width: '100%', marginTop: 4 }} />
              </label>
              <button type="button" className="btn-cyber" onClick={addCriticalAsset} disabled={savingAsset || !selectedDevice || constraintText.trim().length < 10}>
                {savingAsset ? 'Saving…' : 'Protect asset'}
              </button>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(148,163,184,0.18)', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ margin: 0, color: '#67e8f9', fontSize: '0.86rem' }}>Compare candidate response plans</h4>
                <p style={{ ...subtleText, margin: '4px 0 0' }}>{InvestigationWorkbench.scoreMethod}</p>
              </div>
              <button type="button" className="btn-cyber" onClick={generatePlans} disabled={generating}>
                {generating ? 'Generating…' : plans.length ? 'Regenerate plans' : 'Generate plans'}
              </button>
            </div>
            {plans.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginTop: 12 }}>
                {plans.map((plan) => (
                  <article key={plan.plan_id} style={{ border: `1px solid ${plan.valid ? 'rgba(103,232,249,0.24)' : 'rgba(251,191,36,0.5)'}`, borderRadius: 8, padding: 12, background: selectedPlanId === plan.plan_id ? 'rgba(8,145,178,0.12)' : 'rgba(0,0,0,0.18)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <b style={{ color: '#f1f5f9', fontSize: '0.8rem' }}>{plan.name}</b>
                      <span style={{ color: plan.valid ? '#34d399' : '#fbbf24', fontSize: '0.67rem', fontWeight: 700 }}>{plan.valid ? (plan.preferred_valid ? 'PREFERRED VALID' : 'VALID') : 'REJECTED'}</span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.76rem', color: '#cbd5e1' }}>{plan.action} → {plan.target}</div>
                    <div style={{ marginTop: 5, fontSize: '0.82rem', color: '#67e8f9' }}>Heuristic score: {plan.containment_score} points</div>
                    <div style={{ ...subtleText, marginTop: 6 }}>Impact: {plan.impact_text}</div>
                    <div style={{ ...subtleText, marginTop: 5 }}>Advantage: {plan.advantages}</div>
                    <div style={{ ...subtleText, marginTop: 5 }}>Trade-off: {plan.trade_offs}</div>
                    <div style={{ ...subtleText, marginTop: 6 }}>Inputs: scope {plan.score_inputs.containment_scope_points}, impact {plan.score_inputs.operational_impact_points}, complexity {plan.score_inputs.execution_complexity_points}</div>
                    <div role="status" style={{ color: plan.valid ? '#86efac' : '#fcd34d', fontSize: '0.7rem', marginTop: 7 }}>{formatError(plan.validation.explanation)}</div>
                    {plan.rejected_actions?.length > 0 && (
                      <details style={{ marginTop: 7, color: '#94a3b8', fontSize: '0.68rem' }}>
                        <summary>Other actions and exclusions ({plan.rejected_actions.length})</summary>
                        {plan.rejected_actions.map((item) => <div key={`${item.action}-${item.target}`} style={{ marginTop: 4 }}>{item.action} → {item.target}: {item.reason}</div>)}
                      </details>
                    )}
                    <button type="button" className="btn-cyber-outline" style={{ marginTop: 9, width: '100%' }} disabled={!plan.valid} onClick={() => setSelectedPlanId(plan.plan_id)}>
                      {plan.valid ? (selectedPlanId === plan.plan_id ? 'Selected' : 'Select valid plan') : 'Cannot select invalid plan'}
                    </button>
                  </article>
                ))}
              </div>
            ) : <p style={{ ...subtleText, marginTop: 10 }}>Generate plans after reviewing evidence and setting any required asset constraints.</p>}
            {selectedPlan?.valid && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={subtleText}>Selected: <b style={{ color: '#f1f5f9' }}>{selectedPlan.name}</b>. Confirm to record the simulated action.</span>
                <button type="button" className="btn-cyber" onClick={executeSelectedPlan} disabled={executing}>
                  {executing ? 'Executing simulation…' : 'Confirm simulated execution'}
                </button>
              </div>
            )}
            {executionResult && (
              <div role="status" style={{ marginTop: 12, padding: 10, borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#86efac', fontSize: '0.75rem' }}>
                Recorded simulated execution: {executionResult.action} → {executionResult.target} · {executionResult.status} · response {executionResult.response_id}
              </div>
            )}
            {(investigation.executions || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <b style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>Persisted simulated execution outcomes</b>
                {investigation.executions.map((execution) => (
                  <div key={execution.execution_id} style={{ ...subtleText, padding: '6px 0', borderTop: '1px solid rgba(148,163,184,0.12)', marginTop: 5 }}>
                    {execution.created_at} · {execution.status} · plan {execution.plan_id}{execution.response_id ? ` · response ${execution.response_id}` : ''}{execution.result?.reason ? ` · ${execution.result.reason}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

InvestigationWorkbench.scoreMethod = 'Heuristic points (not probability): containment scope − 0.25 × operational-impact points − 0.10 × execution-complexity points; inputs are fixed scenario judgments from 0–100.';
