import React, { useState } from 'react';
import {
  BrainCircuit,
  Network,
  GitBranch,
  Layers,
  Swords,
  Sliders,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Code2,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Cpu,
  HelpCircle,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';

export default function AIAlgorithmsLabView() {
  const [activeUnit, setActiveUnit] = useState('unit3');
  const [loading, setLoading] = useState({});
  const [operationErrors, setOperationErrors] = useState({});

  // Unit 1 State (BFS / DFS Search)
  const [unit1Data, setUnit1Data] = useState(null);
  const [searchMethod, setSearchMethod] = useState('bfs');

  // Unit 2 State (A* & Hill Climbing)
  const [astarData, setAstarData] = useState(null);
  const [hcThreshold, setHcThreshold] = useState(0.5);
  const [hcData, setHcData] = useState(null);

  // Unit 3 State (Game Theory & CSP)
  const [attackerMove, setAttackerMove] = useState('Stealth_Exfiltration');
  const [gameTheoryData, setGameTheoryData] = useState(null);
  const [cspData, setCspData] = useState(null);

  // Unit 4 State (Forward & Backward Chaining)
  const [selectedFacts, setSelectedFacts] = useState(['Failed_Logins_Exceeded', 'Target_Account_Admin']);
  const [fcData, setFcData] = useState(null);
  const [bcGoal, setBcGoal] = useState('Ransomware_Lateral_Outbreak');
  const [bcFacts, setBcFacts] = useState(['Rapid_File_Modifications', 'Encrypted_File_Extensions', 'Suspicious_Process_Spawning']);
  const [bcData, setBcData] = useState(null);

  const runOperation = async (operation, request, onSuccess, clearResult) => {
    setLoading((current) => ({ ...current, [operation]: true }));
    setOperationErrors((current) => ({ ...current, [operation]: null }));
    clearResult();
    try {
      onSuccess(await request());
    } catch (error) {
      setOperationErrors((current) => ({
        ...current,
        [operation]: error?.message || 'The request failed. Check the backend connection and try again.'
      }));
    } finally {
      setLoading((current) => ({ ...current, [operation]: false }));
    }
  };

  // Handlers
  const runTopologySearch = async (method = 'bfs') => {
    setSearchMethod(method);
    await runOperation('topology', () => method === 'bfs'
      ? api.getBfsTopology('Router-Core')
      : api.getDfsTopology('Router-Core'), setUnit1Data, () => setUnit1Data(null));
  };

  const runAStar = async () => {
    await runOperation('astar', api.runAStarPlanning, setAstarData, () => setAstarData(null));
  };

  const runHillClimbing = async () => {
    await runOperation('hillClimbing', () => api.runHillClimbing(hcThreshold), setHcData, () => setHcData(null));
  };

  const runGameTheory = async (move = attackerMove) => {
    await runOperation('gameTheory', () => api.runGameTheory(move), setGameTheoryData, () => setGameTheoryData(null));
  };

  const solveCSP = async () => {
    await runOperation('csp', api.solveFirewallCSP, setCspData, () => setCspData(null));
  };

  const runForwardChaining = async () => {
    await runOperation('forwardChaining', () => api.runForwardChaining(selectedFacts), setFcData, () => setFcData(null));
  };

  const runBackwardChaining = async () => {
    await runOperation('backwardChaining', () => api.runBackwardChaining(bcFacts, bcGoal), setBcData, () => setBcData(null));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {Object.entries(operationErrors).filter(([, message]) => message).map(([operation, message]) => (
        <div key={operation} role="alert" style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(255, 51, 102, 0.12)', border: '1px solid rgba(255, 51, 102, 0.4)', color: '#fecdd3', fontSize: '0.78rem' }}>
          <strong>{operation.replace(/([A-Z])/g, ' $1')} failed:</strong> {message}
        </div>
      ))}
      
      {/* Lab heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BrainCircuit style={{ color: '#00f0ff', width: '22px', height: '22px' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              AI Algorithms Lab
            </h2>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
              Backend algorithm demonstrations
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '3px 0 0' }}>
            Explore the configured search, optimization, constraint, and rule-inference operations. Results reflect the implemented demonstration models.
          </p>
        </div>

      {/* Units Navigation Pill Switcher */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'unit3', label: 'Game Theory & CSP', icon: Swords },
            { id: 'unit2', label: 'A* & Hill Climbing', icon: Sliders },
            { id: 'unit4', label: 'Rule Inference', icon: Layers },
            { id: 'unit1', label: 'Network Search', icon: Network }
          ].map((u) => {
            const Icon = u.icon;
            const isSel = activeUnit === u.id;
            return (
              <button
                key={u.id}
                onClick={() => setActiveUnit(u.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isSel ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                  color: isSel ? '#00f0ff' : '#94a3b8',
                  fontWeight: isSel ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon style={{ width: '14px', height: '14px' }} />
                <span>{u.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UNIT III: DEFENDER PAYOFF EVALUATION & CSP FIREWALL SOLVER */}
      {/* ========================================================================= */}
      {activeUnit === 'unit3' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          
          {/* 1. Fixed attacker action / defender payoff evaluation */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffb700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Swords style={{ width: '18px', height: '18px' }} />
                  Defender Payoff Evaluation
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  For one selected attacker action, compares the backend's fixed defender payoffs and recommends the highest-scoring available response.
                </p>
              </div>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,183,0,0.15)', color: '#ffb700', fontWeight: 700 }}>
                Fixed payoff evaluation
              </span>
            </div>

            {/* Interactive Attacker Move Selector */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#f1f5f9', fontWeight: 600 }}>Attacker action:</span>
              <select
                value={attackerMove}
                onChange={(e) => {
                  setAttackerMove(e.target.value);
                  runGameTheory(e.target.value);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-subtle)',
                  color: '#00f0ff',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  flex: 1
                }}
              >
                <option value="Stealth_Exfiltration">Stealth Exfiltration (Covert C2 Tunnel)</option>
                <option value="Ransomware_Outbreak">Ransomware Outbreak (Lateral Encryption)</option>
                <option value="Volumetric_DDoS">Volumetric SYN Flood (Gateway Saturation)</option>
                <option value="Credential_Stuffing">Credential Stuffing (Brute Force Spray)</option>
              </select>

              <button
                onClick={() => runGameTheory(attackerMove)}
                disabled={loading.gameTheory}
                className="btn-cyber-primary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                {loading.gameTheory ? 'Evaluating…' : 'Evaluate defender options'}
              </button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {gameTheoryData?.game_tree_evaluations?.length ? (
                <table className="payoff-table">
                  <thead><tr><th>Attacker action</th><th>Defender option</th><th>Defender payoff</th><th>Attacker payoff</th><th>Evaluation</th></tr></thead>
                  <tbody>
                    {gameTheoryData.game_tree_evaluations.map((entry) => (
                      <tr key={entry.defender_move}>
                        <td>{entry.attacker_move.replaceAll('_', ' ')}</td>
                        <td className={gameTheoryData.optimal_defender_strategy === entry.defender_move ? 'optimal-cell' : ''}>{entry.defender_move.replaceAll('_', ' ')}</td>
                        <td className={gameTheoryData.optimal_defender_strategy === entry.defender_move ? 'optimal-cell' : ''}>{entry.defender_score}</td>
                        <td>{entry.attacker_score}</td>
                        <td>{entry.evaluation_notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ padding: '12px', color: '#94a3b8', fontSize: '0.78rem' }}>Evaluate an attacker action to see the values returned by the backend.</p>
              )}
            </div>

            {/* Strategic Outcome Banner */}
            {gameTheoryData && (
              <div style={{ background: 'rgba(0, 255, 157, 0.08)', border: '1px solid rgba(0, 255, 157, 0.3)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00ff9d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 style={{ width: '15px', height: '15px' }} />
                  <span>Highest-scoring defender option: {gameTheoryData.optimal_defender_strategy?.replaceAll('_', ' ')}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '4px' }}>
                  Fixed payoff score: <b>{gameTheoryData.optimal_payoff}</b>. This evaluation does not calculate a Nash equilibrium or perform adversarial tree search.
                </div>
              </div>
            )}
          </div>

          {/* 2. Constraint Satisfaction Problem (CSP) Firewall Solver */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#b05cff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock style={{ width: '18px', height: '18px' }} />
                  CSP Firewall Assignment Solver
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  Searches firewall policy values with backtracking and rejects assignments that violate configured constraints.
                </p>
              </div>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(176,92,255,0.15)', color: '#b05cff', fontWeight: 700 }}>
                Backtracking constraint checks
              </span>
            </div>

            {/* Constraints Checklist */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>CONFIGURED CONSTRAINT CHECKS:</span>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 style={{ width: '12px', height: '12px', color: '#00ff9d' }} />
                <span>$C_1$: DB_Port_5432 cannot have ALLOW_ALL from 0.0.0.0/0</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 style={{ width: '12px', height: '12px', color: '#00ff9d' }} />
                <span>$C_2$: SSH_Port_22 & RDP_Port_3389 cannot be ALLOW_ALL</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 style={{ width: '12px', height: '12px', color: '#00ff9d' }} />
                <span>$C_3$: Web_Port_443 cannot be DENY_EXTERNAL</span>
              </div>
            </div>

            <button
              onClick={solveCSP}
              disabled={loading.csp}
              className="btn-cyber-primary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', justifyContent: 'center' }}
            >
              <Play style={{ width: '14px', height: '14px' }} />
              <span>{loading.csp ? 'Solving…' : 'Solve policy constraints'}</span>
            </button>

            {/* Solved Variable Assignment Cards */}
            {cspData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: cspData.solution_found ? '#00ff9d' : '#f87171', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{cspData.solution_found ? 'Valid constraint assignment' : 'No valid assignment found'}</span>
                  <span>{Object.keys(cspData.optimal_policy_assignment || {}).length} variables assigned</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Object.entries(cspData.optimal_policy_assignment || {}).map(([varName, val]) => (
                    <div key={varName} className="csp-variable-card">
                      <span style={{ fontSize: '0.72rem', color: '#b05cff', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {varName}
                      </span>
                      <span style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: val === 'ALLOW_ALL' ? '#00ff9d' : (val === 'DENY_EXTERNAL' ? '#ff3366' : '#ffb700'),
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', textAlign: 'center' }}>
                  {cspData.solution_found ? 'Assignment returned by the configured backtracking solver.' : `Solver trace entries: ${cspData.solver_trace?.length ?? 0}.`}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIT II: INFORMED SEARCH (A* SEARCH & HILL CLIMBING) */}
      {/* ========================================================================= */}
      {activeUnit === 'unit2' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          
          {/* 1. A* Pathfinder */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders style={{ width: '18px', height: '18px' }} />
                  A* Search Response Planning: f(n) = g(n) + h(n)
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  Searches a configured response-state graph using its encoded step costs and heuristics. This is a demonstration model, not a live response plan.
                </p>
              </div>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', fontWeight: 700 }}>
                Fixed response-state model
              </span>
            </div>

            <button
              onClick={runAStar}
              disabled={loading.astar}
              className="btn-cyber-primary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', width: 'fit-content' }}
            >
              <Play style={{ width: '14px', height: '14px' }} />
              <span>{loading.astar ? 'Searching…' : 'Compute response path'}</span>
            </button>

            {astarData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#00ff9d', fontWeight: 700 }}>
                  <span>Path cost in configured model: {astarData.optimal_total_cost}</span>
                  <span>Explored States: {astarData.explored_nodes_count}</span>
                </div>

                {/* Step-by-step Pathfinder Cards */}
                <div className="astar-flow">
                  {astarData.optimal_path?.map((node, i) => (
                    <div key={i} className="astar-step-card optimal">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#00ff9d',
                          color: '#040911',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800
                        }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9' }}>
                            {node.state.replace('_', ' ')}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#00f0ff', fontFamily: 'var(--font-mono)' }}>
                            Action: {node.action}
                          </div>
                        </div>
                      </div>

                      {/* Cost breakdown */}
                      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                        <span style={{ color: '#38bdf8' }}>g={node.g}</span> + <span style={{ color: '#ffb700' }}>h={node.h}</span> = <b style={{ color: '#00ff9d' }}>f={node.f}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Hill Climbing Local Search */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#00ff9d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp style={{ width: '18px', height: '18px' }} />
                Hill Climbing Threshold Optimizer
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>
                Searches the backend's synthetic fitness function from the selected starting threshold. It does not learn from observed detections or guarantee a global optimum.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Start Threshold: {hcThreshold}</span>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={hcThreshold}
                onChange={(e) => setHcThreshold(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <button onClick={runHillClimbing} disabled={loading.hillClimbing} className="btn-cyber-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                {loading.hillClimbing ? 'Tuning…' : 'Tune'}
              </button>
            </div>

            {hcData && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: '#00ff9d', fontWeight: 700 }}>
                  Best synthetic fitness found: {hcData.peak_fitness_score} at threshold {hcData.optimized_threshold}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                  {hcData.optimization_steps?.map((st) => (
                    <div key={st.iteration} style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                      Iter {st.iteration}: Threshold = {st.threshold} &rarr; Fitness = <b style={{ color: '#00ff9d' }}>{st.fitness_score}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIT IV: FIRST-ORDER LOGIC (FOL) & HORN CLAUSE DEDUCTION */}
      {/* ========================================================================= */}
      {activeUnit === 'unit4' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          
          {/* 1. Forward Chaining */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers style={{ width: '18px', height: '18px' }} />
                  Forward Chaining (Data-Driven Horn Inference)
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  Applies the backend's configured Horn rules to the selected facts: $P_1 \land P_2 \dots \Rightarrow Q$.
                </p>
              </div>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', fontWeight: 700 }}>
                Modus Ponens
              </span>
            </div>

            {/* Fact Checkboxes */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                'Failed_Logins_Exceeded',
                'Target_Account_Admin',
                'HTTP_Post_Request',
                'SQL_Syntax_Payload',
                'Rapid_File_Modifications',
                'Encrypted_File_Extensions',
                'Suspicious_Process_Spawning',
                'SYN_Flood_Packets',
                'Bandwidth_Spike_Threshold'
              ].map((f) => {
                const isSelected = selectedFacts.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => {
                      if (isSelected) setSelectedFacts(selectedFacts.filter(x => x !== f));
                      else setSelectedFacts([...selectedFacts, f]);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: isSelected ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                      color: isSelected ? '#00f0ff' : '#94a3b8',
                      fontSize: '0.7rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}{f}
                  </button>
                );
              })}
            </div>

            <button onClick={runForwardChaining} disabled={loading.forwardChaining} className="btn-cyber-primary" style={{ padding: '6px 14px', fontSize: '0.78rem', width: 'fit-content' }}>
              {loading.forwardChaining ? 'Inferring…' : 'Run forward chaining'}
            </button>

            {fcData && (
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '12px', maxHeight: '220px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.75rem', color: '#00ff9d', fontWeight: 700, marginBottom: '6px' }}>
                  Inferred Facts ({fcData.inferred_facts?.length}):
                </div>
                {fcData.inference_steps?.map((step) => (
                  <div key={step.step} style={{ padding: '6px 8px', borderRadius: '4px', background: 'rgba(0, 240, 255, 0.08)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                    <span style={{ color: '#00f0ff' }}>{step.rule_id}:</span> {step.matched_premises.join(' & ')} &rArr; <b style={{ color: '#00ff9d' }}>{step.derived_fact}</b>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Backward Chaining */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#b05cff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitBranch style={{ width: '18px', height: '18px' }} />
                Backward Chaining (Goal Verification)
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>
                Verifies an incident hypothesis by working backwards to ascertain required premise sub-goals.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={bcGoal}
                onChange={(e) => setBcGoal(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.78rem', flex: 1 }}
              >
                <option value="Ransomware_Lateral_Outbreak">Hypothesis: Ransomware Outbreak</option>
                <option value="SQL_Injection_Exploit">Hypothesis: SQL Injection</option>
                <option value="Brute_Force_Credential_Attack">Hypothesis: Brute Force</option>
                <option value="Volumetric_DDoS_Attack">Hypothesis: DDoS Attack</option>
              </select>

              <button onClick={runBackwardChaining} disabled={loading.backwardChaining} className="btn-cyber-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                {loading.backwardChaining ? 'Checking…' : 'Verify goal'}
              </button>
            </div>

            {bcData && (
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.78rem', color: bcData.is_proven ? '#00ff9d' : '#ff3366', fontWeight: 700, marginBottom: '8px' }}>
                  {bcData.is_proven ? '✓ Goal proven from the selected facts' : 'Goal not proven from the selected facts'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {bcData.proof_tree?.map((p, idx) => (
                    <div key={idx} style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                      &bull; Goal '{p.goal}' &rarr; <span style={{ color: p.status === 'Proven by Base Fact' ? '#00ff9d' : p.status === 'Sub-goals required' ? '#fbbf24' : '#ff3366', fontWeight: 700 }}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIT I: SEARCH & AGENTS (BFS / DFS & PEAS MODEL) */}
      {/* ========================================================================= */}
      {activeUnit === 'unit1' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Network style={{ width: '18px', height: '18px' }} />
                  Network Topology Discovery ({searchMethod.toUpperCase()})
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  {searchMethod === 'bfs' ? 'Breadth-first traversal of the configured network topology.' : 'Depth-first traversal of the configured network topology. DFS results do not include security-status metadata.'} This operation does not inspect live traffic or classify devices.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => runTopologySearch('bfs')} disabled={loading.topology} className="btn-cyber-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                {loading.topology ? 'Searching…' : 'Run BFS topology traversal'}
              </button>
              <button onClick={() => runTopologySearch('dfs')} disabled={loading.topology} className="btn-cyber-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                {loading.topology ? 'Searching…' : 'Run DFS traversal'}
              </button>
            </div>

            {unit1Data && (
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.75rem', color: '#00ff9d', fontWeight: 700, marginBottom: '8px' }}>
                  Total Nodes {searchMethod === 'bfs' ? 'Discovered' : 'Traversed'}: {searchMethod === 'bfs' ? unit1Data.total_nodes_discovered : unit1Data.total_nodes_traversed}
                </div>
                {unit1Data.traversal_steps?.map((s) => (
                  <div key={s.step} style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '4px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <span style={{ color: '#00f0ff' }}>Step {s.step}:</span> {s.node} (Depth: {s.depth}) &rarr; IP: {s.ip}{s.status ? ` [${s.status}]` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PEAS Specification */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#b05cff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu style={{ width: '18px', height: '18px' }} />
              Illustrative security-agent model
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem' }}>
              <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.3)' }}>
                <b style={{ color: '#00f0ff' }}>Illustrative performance goals (not measured here):</b> Detection accuracy (&ge;95%), response latency (&le;3s), false-positive reduction, and successful mitigation.
              </div>
              <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.3)' }}>
                <b style={{ color: '#00ff9d' }}>Illustrative environment (E):</b> Enterprise LAN, DMZ, identity services, database clusters, IoT devices, and external traffic.
              </div>
              <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.3)' }}>
                <b style={{ color: '#ffb700' }}>Illustrative actuators (A):</b> Firewall rule changes, VLAN quarantine, credential lockout, and notifications.
              </div>
              <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.3)' }}>
                <b style={{ color: '#b05cff' }}>Illustrative sensors (S):</b> Packet, network-flow, authentication, API, and threat-intelligence sources.
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
