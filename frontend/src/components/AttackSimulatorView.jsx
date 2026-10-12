import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Radio,
  Activity,
  BrainCircuit,
  Bot,
  ArrowRight,
  FileDown,
  Layers,
  ChevronRight,
  Sliders,
  Sparkles,
  Eye
} from 'lucide-react';
import { api } from '../api/client';

export default function AttackSimulatorView({ onNavigateToIncident, onNavigateToTab }) {
  const [selectedScenario, setSelectedScenario] = useState('brute_force');
  const [intensity, setIntensity] = useState('High');
  const [sourceIp, setSourceIp] = useState('45.33.32.156');
  const [targetIp, setTargetIp] = useState('192.168.1.10');
  const [customPayload, setCustomPayload] = useState('');
  const [executing, setExecuting] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Stepper / Presentation state
  const [activeStepIndex, setActiveStepIndex] = useState(0); // 0 to 6
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(1000); // 1000ms delay between agents
  const [inspectStep, setInspectStep] = useState(0);
  const playTimerRef = useRef(null);

  const scenarios = [
    {
      id: 'brute_force',
      name: 'Scenario 1: Brute Force Credential Attack',
      desc: 'Runs synthetic failed-login evidence through IDS heuristics, forward-chaining reasoning, response ranking, Game Theory evaluation, and a recorded response.',
      defaultSrc: '45.33.32.156',
      defaultDst: '192.168.1.10',
      tag: 'PRD SCENARIO 1',
      unitTag: 'Synthetic activity evidence: authentication failures'
    },
    {
      id: 'ransomware',
      name: 'Scenario 2: Ransomware Lateral Outbreak',
      desc: 'Runs synthetic file-change evidence through the shared detection, reasoning, planning, response, and feedback stages.',
      defaultSrc: '185.220.101.5',
      defaultDst: '192.168.1.112',
      tag: 'CRITICAL MALWARE',
      unitTag: 'Synthetic activity evidence: file changes'
    },
    {
      id: 'sql_injection',
      name: 'Scenario 3: SQL Injection & Data Exfiltration',
      desc: 'Runs synthetic SQL injection evidence through the shared detection, incident correlation, reasoning, planning, response, and feedback stages.',
      defaultSrc: '103.251.167.22',
      defaultDst: '192.168.1.20',
      tag: 'WEB EXPLOIT',
      unitTag: 'Synthetic activity evidence: HTTP requests'
    },
    {
      id: 'ddos',
      name: 'Scenario 4: Volumetric SYN-Flood DDoS',
      desc: 'Runs synthetic SYN-flood evidence through the shared detection, incident correlation, reasoning, planning, response, and feedback stages.',
      defaultSrc: '198.51.100.0/24',
      defaultDst: '192.168.1.1',
      tag: 'NETWORK DOS',
      unitTag: 'Synthetic activity evidence: SYN packets'
    },
    {
      id: 'dns_tunneling',
      name: 'Scenario 5: Covert DNS Tunneling & C2',
      desc: 'Runs synthetic DNS tunneling evidence through the shared detection, incident correlation, reasoning, planning, response, and feedback stages.',
      defaultSrc: '192.168.1.244',
      defaultDst: '8.8.8.8',
      tag: 'EXFILTRATION',
      unitTag: 'Synthetic activity evidence: DNS queries'
    },
    {
      id: 'port_scan',
      name: 'Scenario 6: Reconnaissance & Port Scanning',
      desc: 'Runs synthetic port-scan evidence through the shared detection, incident correlation, reasoning, planning, response, and feedback stages.',
      defaultSrc: '192.168.1.244',
      defaultDst: '192.168.1.15',
      tag: 'RECONNAISSANCE',
      unitTag: 'Synthetic activity evidence: port probes'
    }
  ];

  const agentStepsMetadata = [
    { step: 1, name: 'Network Monitoring', icon: Activity, unit: 'Synthetic event intake', role: 'Perception' },
    { step: 2, name: 'Intrusion Detection', icon: ShieldAlert, unit: 'IDS heuristic scoring', role: 'Detection' },
    { step: 3, name: 'Threat Correlation', icon: Layers, unit: 'Incident record creation', role: 'Correlation' },
    { step: 4, name: 'Reasoning Engine', icon: BrainCircuit, unit: 'FOL forward chaining', role: 'Inference' },
    { step: 5, name: 'Planning Engine', icon: Sliders, unit: 'Response ranking + Game Theory', role: 'Decision' },
    { step: 6, name: 'Response Agent', icon: Lock, unit: 'Recorded response action', role: 'Actuation' },
    { step: 7, name: 'Learning Agent', icon: Sparkles, unit: 'Feedback and KPI summary', role: 'Feedback' }
  ];

  const handleSelectScenario = (sc) => {
    setSelectedScenario(sc.id);
    setSourceIp(sc.defaultSrc);
    setTargetIp(sc.defaultDst);
    setSimulationResult(null);
    setSimulationError('');
    setActiveStepIndex(0);
    setInspectStep(0);
    setIsPlaying(false);
  };

  // Launch Attack Simulation
  const handleRunSimulation = async (autoStep = true) => {
    setExecuting(true);
    setSimulationResult(null);
    setSimulationError('');
    setActiveStepIndex(0);
    setInspectStep(0);
    setIsPlaying(false);

    try {
      const res = await api.runSimulation(selectedScenario, {
        source_ip: sourceIp,
        target_ip: targetIp,
        intensity,
        custom_payload: customPayload || undefined
      });
      setSimulationResult(res);

      if (autoStep) {
        // Start automatic playback through the steps
        setIsPlaying(true);
        setActiveStepIndex(0);
        setInspectStep(0);
      } else {
        // Show all completed immediately
        setActiveStepIndex(6);
        setInspectStep(0);
      }
    } catch (e) {
      setSimulationError(e.message || 'The simulation request failed. Please retry.');
    } finally {
      setExecuting(false);
    }
  };

  // Auto-play timer effect
  useEffect(() => {
    if (isPlaying && simulationResult) {
      playTimerRef.current = setTimeout(() => {
        setActiveStepIndex((prev) => {
          if (prev < 6) {
            const next = prev + 1;
            setInspectStep(next);
            return next;
          } else {
            setIsPlaying(false);
            return 6;
          }
        });
      }, playSpeedMs);
    }
    return () => clearTimeout(playTimerRef.current);
  }, [isPlaying, activeStepIndex, simulationResult, playSpeedMs]);

  const handleStepForward = () => {
    if (!simulationResult) return;
    setIsPlaying(false);
    setActiveStepIndex((prev) => {
      const next = Math.min(6, prev + 1);
      setInspectStep(next);
      return next;
    });
  };

  const handleStepBackward = () => {
    if (!simulationResult) return;
    setIsPlaying(false);
    setActiveStepIndex((prev) => {
      const next = Math.max(0, prev - 1);
      setInspectStep(next);
      return next;
    });
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setActiveStepIndex(0);
    setInspectStep(0);
  };

  const handleExportPdf = async () => {
    if (!simulationResult?.incident_id) return;
    setDownloadingPdf(true);
    try {
      await api.exportPdf(simulationResult.incident_id);
    } catch (e) {
      alert('Error generating PDF report: ' + e.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const currentStepData = simulationResult?.execution_steps?.[inspectStep] || null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
      
      {/* LEFT COLUMN: Attack Scenario Selector & Controls */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', height: 'fit-content' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap style={{ color: '#00f0ff', width: '18px', height: '18px' }} />
              Demo Attack Simulator
            </h3>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff' }}>
              PRD Sec 48
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' }}>
            Choose a synthetic scenario to run the seven-stage backend pipeline. Playback inspects the completed result.
          </p>
        </div>

        {/* Scenario List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '350px' }}>
          {scenarios.map((sc) => {
            const isSelected = selectedScenario === sc.id;
            return (
              <div
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.05)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? '#00f0ff' : '#f1f5f9' }}>
                    {sc.name}
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: 'rgba(255, 51, 102, 0.15)',
                    color: '#ff3366',
                    border: '1px solid rgba(255, 51, 102, 0.3)'
                  }}>
                    {sc.tag}
                  </span>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.3 }}>
                  {sc.desc}
                </p>
                <div style={{ fontSize: '0.65rem', color: '#00ff9d', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {sc.unitTag}
                </div>
              </div>
            );
          })}
        </div>

        {/* Target Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Attacker Source IP</label>
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#00f0ff', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Target Host IP</label>
              <input
                type="text"
                value={targetIp}
                onChange={(e) => setTargetIp(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#cbd5e1', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="simulation-intensity" style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Synthetic activity intensity</label>
            <select
              id="simulation-intensity"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#cbd5e1', fontSize: '0.75rem' }}
            >
              <option value="Low">Low (1 event)</option>
              <option value="Medium">Medium (5 events)</option>
              <option value="High">High (15 events)</option>
            </select>
          </div>

          <div>
            <label htmlFor="simulation-payload" style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Custom synthetic payload (optional, 2048 characters max)</label>
            <textarea
              id="simulation-payload"
              value={customPayload}
              maxLength={2048}
              onChange={(e) => setCustomPayload(e.target.value)}
              rows={2}
              placeholder="Leave empty to use the selected scenario's sample evidence"
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', resize: 'vertical', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: '#cbd5e1', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
            />
            <small style={{ fontSize: '0.65rem', color: '#64748b' }}>Stored as synthetic evidence only; never executed or sent to a target.</small>
          </div>

          {simulationError && (
            <div role="alert" style={{ padding: '8px 10px', borderRadius: '4px', color: '#fecaca', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: '0.75rem' }}>
              Simulation failed: {simulationError}
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            <button
              onClick={() => handleRunSimulation(true)}
              disabled={executing}
              className="btn-cyber-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }}
            >
              <Play style={{ width: '16px', height: '16px' }} />
              <span>{executing ? 'Running simulation...' : 'Run & Play Trace'}</span>
            </button>

            <button
              onClick={() => handleRunSimulation(false)}
              disabled={executing}
              className="btn-cyber-outline"
              style={{ width: '100%', justifyContent: 'center', padding: '6px', fontSize: '0.75rem' }}
            >
                  <span>Run Trace (Manual Step Mode)</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Agent Workflow Ribbon & Deep Dive Inspector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {simulationResult ? (
          <>
            {/* Completed simulation summary */}
            <div className="glass-panel-glow" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity style={{ color: '#00f0ff', width: '22px', height: '22px' }} />
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#00ff9d' }}>
                    {simulationResult.scenario_title}
                  </span>
                </div>
                <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  {simulationResult.final_outcome}
                </p>
              </div>

              {/* Action Buttons for Pitch */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => onNavigateToIncident && onNavigateToIncident(simulationResult.incident_id)}
                  className="btn-cyber-outline"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '6px' }}
                >
                  <Eye style={{ width: '14px', height: '14px', color: '#00f0ff' }} />
                  <span>Inspect Incident {simulationResult.incident_id}</span>
                </button>

                <button
                  onClick={handleExportPdf}
                  disabled={downloadingPdf}
                  className="btn-cyber-outline"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '6px', color: '#00ff9d', borderColor: 'rgba(0,255,157,0.3)' }}
                >
                  <FileDown style={{ width: '14px', height: '14px' }} />
                  <span>{downloadingPdf ? 'Generating...' : 'Forensic PDF'}</span>
                </button>
              </div>
            </div>

            {/* Stepper Playback Controls Toolbar */}
            <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>DEMO CONTROLS:</span>
                
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="btn-cyber-outline"
                  style={{ padding: '4px 10px', fontSize: '0.72rem', gap: '4px' }}
                >
                  {isPlaying ? <Pause style={{ width: '12px', height: '12px' }} /> : <Play style={{ width: '12px', height: '12px' }} />}
                  <span>{isPlaying ? 'Pause trace' : 'Play trace'}</span>
                </button>

                <button
                  onClick={handleStepBackward}
                  disabled={activeStepIndex === 0}
                  className="btn-cyber-outline"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                >
                  ◀ Prev Agent
                </button>

                <button
                  onClick={handleStepForward}
                  disabled={activeStepIndex === 6}
                  className="btn-cyber-outline"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                >
                  Next Agent ▶
                </button>

                <button
                  onClick={handleResetPlayback}
                  className="btn-cyber-outline"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                >
                  <RotateCcw style={{ width: '12px', height: '12px' }} />
                </button>
              </div>

              {/* Speed selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
                <span>Speed:</span>
                {[
                  { label: '0.6s', val: 600 },
                  { label: '1.0s (Demo)', val: 1000 },
                  { label: '1.8s', val: 1800 }
                ].map((sp) => (
                  <button
                    key={sp.val}
                    onClick={() => setPlaySpeedMs(sp.val)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: 'none',
                      background: playSpeedMs === sp.val ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: playSpeedMs === sp.val ? '#00f0ff' : '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. AGENT WORKFLOW PIPELINE RIBBON (The Visual Stepper) */}
            <div className="glass-panel" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bot style={{ color: '#00f0ff', width: '16px', height: '16px' }} />
                  Completed Seven-Stage Simulation Trace
                </span>
                <span style={{ fontSize: '0.7rem', color: '#00ff9d', fontFamily: 'var(--font-mono)' }}>
                  Inspecting Step {inspectStep + 1} of 7 ({agentStepsMetadata[inspectStep].name})
                </span>
              </div>

              <div className="agent-pipeline-bar">
                {agentStepsMetadata.map((ag, idx) => {
                  const Icon = ag.icon;
                  const isCompleted = idx <= activeStepIndex;
                  const isCurrent = idx === activeStepIndex;
                  const isInspected = idx === inspectStep;

                  return (
                    <React.Fragment key={ag.step}>
                      <div
                        onClick={() => setInspectStep(idx)}
                        className={`pipeline-step-node ${isCurrent ? 'active' : (isCompleted ? 'completed' : 'pending')}`}
                        style={{
                          cursor: 'pointer',
                          outline: isInspected ? '2px solid #00f0ff' : 'none',
                          outlineOffset: '2px'
                        }}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isCurrent ? '#00f0ff' : (isCompleted ? '#00ff9d' : 'rgba(255,255,255,0.1)'),
                          color: isCurrent || isCompleted ? '#040911' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800
                        }}>
                          {isCompleted && !isCurrent ? '✓' : ag.step}
                        </div>

                        <div>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: isCurrent ? '#00f0ff' : '#f1f5f9' }}>
                            {ag.name}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                            {ag.unit}
                          </div>
                        </div>
                      </div>

                      {idx < 6 && (
                        <div className={`pipeline-connector ${idx < activeStepIndex ? 'active' : ''}`}>
                          <ChevronRight style={{ width: '16px', height: '16px' }} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* 2. DEEP-DIVE INSPECTION OF CURRENT AGENT STEP */}
            {currentStepData && (
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(0, 240, 255, 0.15)',
                        color: '#00f0ff',
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}>
                        STEP {currentStepData.step} / 7
                      </span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                        {currentStepData.agent}
                      </h4>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        ({currentStepData.phase})
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '4px 0 0' }}>
                      {currentStepData.details}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>STATUS</span>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00ff9d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                      COMPLETED
                    </div>
                  </div>
                </div>

                {/* Sub-view rendering based on agent step */}
                {/* STEP 1: Network Monitor */}
                {inspectStep === 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>SYNTHETIC EVENT FRAME:</span>
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        <div>Source IP: <span style={{ color: '#ff3366' }}>{currentStepData.data?.source_ip}</span></div>
                        <div>Target IP: <span style={{ color: '#00ff9d' }}>{currentStepData.data?.destination_ip}</span></div>
                        <div>Protocol: <span style={{ color: '#00f0ff' }}>{currentStepData.data?.protocol}</span> (Port: {currentStepData.data?.port})</div>
                        <div>Classification: <span style={{ color: '#ff3366' }}>{currentStepData.data?.flag}</span></div>
                        <div>Synthetic activity: <span style={{ color: '#00f0ff' }}>{currentStepData.data?.simulation_evidence?.activity_count ?? '—'} {currentStepData.data?.simulation_evidence?.activity_unit ?? ''}</span> ({currentStepData.data?.simulation_evidence?.intensity ?? '—'} intensity)</div>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>RAW PAYLOAD SNIPPET:</span>
                      <pre style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', fontSize: '0.72rem', color: '#ffb700', overflowX: 'auto', fontFamily: 'var(--font-mono)' }}>
                        {currentStepData.data?.payload_snippet ?? 'No payload field returned'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* STEP 2: Intrusion Detection */}
                {inspectStep === 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>HEURISTIC SCORE h(n)</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ff3366', marginTop: '4px' }}>
                        {currentStepData.data?.risk_level ?? '—'} / 10
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>IDS heuristic risk score</span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>SEVERITY LEVEL</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffb700', marginTop: '4px' }}>
                        {currentStepData.data?.severity ?? '—'}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Confidence: {currentStepData.data?.confidence == null ? '—' : `${(currentStepData.data.confidence * 100).toFixed(0)}%`}</span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ATTACK CLASSIFICATION</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#00f0ff', marginTop: '6px' }}>
                        {currentStepData.data?.attack_type ?? '—'}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Matched pattern: {currentStepData.data?.matched_pattern ?? 'none returned'}</span>
                    </div>
                  </div>
                )}

                {/* STEP 3: Threat Correlation */}
                {inspectStep === 2 && (
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SYNTHETIC SCENARIO ENTITY CHAIN:</span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                      {(currentStepData.data?.attack_chain || []).map((entity, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(255, 51, 102, 0.15)',
                            border: '1px solid rgba(255, 51, 102, 0.4)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#ff3366',
                            whiteSpace: 'nowrap'
                          }}>
                            {i + 1}. {entity.stage}: {entity.node} ({entity.role})
                          </div>
                          {i < (currentStepData.data?.attack_chain?.length ?? 0) - 1 && <ArrowRight style={{ width: '14px', height: '14px', color: '#64748b' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 4: Reasoning Agent (FOL) */}
                {inspectStep === 3 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>EVIDENCE FACTS:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {(currentStepData.data?.evidence_collected || []).map((fact, idx) => (
                          <span key={idx} style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(0,240,255,0.1)', color: '#00f0ff', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                            • {fact}
                          </span>
                        ))}
                      </div>

                      <div style={{ marginTop: '12px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>FORWARD-CHAINING RULES APPLIED:</span>
                        <div style={{ marginTop: '4px', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,255,157,0.1)', color: '#00ff9d', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                          {(currentStepData.data?.rules_applied || []).join(', ') || 'No rules applied'}
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>INFERENCE RESULT:</span>
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: '#f1f5f9' }}>
                        <div>Resolution: <b style={{ color: '#00ff9d' }}>{currentStepData.data?.resolution_status ?? 'No resolution status returned'}</b></div>
                        <div>Confidence: <b style={{ color: '#00f0ff' }}>{currentStepData.data?.confidence_score ?? '—'}</b></div>
                        <div>Recommended action: <b>{currentStepData.data?.recommended_action ?? '—'}</b></div>
                        <div style={{ marginTop: '6px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>INFERRED CONCLUSIONS:</span>
                          <div style={{ color: '#ffb700', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            {(currentStepData.data?.inferred_conclusions || []).join(', ') || 'No conclusions returned'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Response ranking and Game Theory evaluation */}
                {inspectStep === 4 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>RESPONSE OPTIONS UTILITY RANKING:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                        {(currentStepData.data?.all_options || []).slice(0, 3).map((opt, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            background: i === 0 ? 'rgba(0,255,157,0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${i === 0 ? '#00ff9d' : 'transparent'}`,
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            <span style={{ color: i === 0 ? '#00ff9d' : '#f1f5f9', fontWeight: i === 0 ? 700 : 400 }}>
                              {i === 0 ? '★ SELECTED: ' : ''}{opt.action}
                            </span>
                            <span style={{ color: '#00f0ff' }}>Utility: {opt.utility_score}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>GAME THEORY MINIMAX RECOMMENDATION:</span>
                      <p style={{ fontSize: '0.75rem', color: '#ffb700', marginTop: '6px' }}>
                        {currentStepData.data?.game_theory?.strategic_recommendation ?? 'No Game Theory result returned'}
                      </p>
                      <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#94a3b8' }}>
                        Evaluated move: {currentStepData.data?.game_theory?.attacker_chosen_strategy ?? '—'}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 6: Response Agent */}
                {inspectStep === 5 && (
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SIMULATED RESPONSE RECORD:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' }}>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>ACTION</span>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#00ff9d', fontFamily: 'var(--font-mono)' }}>
                          {currentStepData.data?.action ?? '—'}
                        </div>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>TARGET</span>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#00f0ff', fontFamily: 'var(--font-mono)' }}>
                          {currentStepData.data?.target ?? '—'}
                        </div>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>EXECUTION STATUS</span>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#00ff9d' }}>
                          {currentStepData.data?.status ?? '—'}
                        </div>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>ACTION DETAILS</span>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                          {JSON.stringify(currentStepData.data?.details ?? {})}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 7: Learning Agent */}
                {inspectStep === 6 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>FEEDBACK PROCESSED:</span>
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#00ff9d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                        <span>Recorded <b>{currentStepData.data?.feedback?.feedback_type ?? 'unknown feedback'}</b> feedback for incident {currentStepData.data?.feedback?.incident_id ?? '—'}.</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>LEARNING AGENT AGGREGATE:</span>
                      <small style={{ display: 'block', marginTop: '4px', fontSize: '0.65rem', color: '#64748b' }}>Existing KPI values include fixed baselines and floors; they are not measurements for this simulation alone.</small>
                      <pre style={{ marginTop: '8px', fontSize: '0.68rem', color: '#cbd5e1', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(currentStepData.data?.current_kpis ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* 3. Completed execution trace */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio style={{ color: '#00f0ff', width: '15px', height: '15px' }} />
                  Seven-Stage Execution Trace
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {Math.min(activeStepIndex + 1, 7)} Stages Shown
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {simulationResult.execution_steps?.slice(0, activeStepIndex + 1).map((st) => (
                  <div
                    key={st.step}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.35)',
                      borderLeft: `3px solid ${st.step === 6 ? '#00ff9d' : (st.step === 2 ? '#ff3366' : '#00f0ff')}`,
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ color: '#00f0ff', fontWeight: 700 }}>[Step {st.step}]</span>{' '}
                      <span style={{ color: '#cbd5e1' }}>{st.agent}</span> &rarr;{' '}
                      <span style={{ color: '#94a3b8' }}>{st.phase}: {st.details}</span>
                    </div>
                    <span style={{ color: '#00ff9d', fontSize: '0.65rem' }}>RECORDED</span>
                  </div>
                ))}
              </div>
            </div>

          </>
        ) : (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '440px', color: '#64748b', gap: '14px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(0, 240, 255, 0.08)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap style={{ width: '32px', height: '32px', color: '#00f0ff' }} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Multi-Agent Simulation Console</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '440px', margin: '6px auto 0', lineHeight: 1.4 }}>
                Select a scenario and run it to generate a completed synthetic seven-stage trace. Playback only changes which completed stage is shown.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                IDS: Heuristics
              </span>
              <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                Reasoning: Forward Chaining
              </span>
              <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                Planning: Ranked Responses + Game Theory
              </span>
              <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                Evidence: Synthetic only
              </span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
