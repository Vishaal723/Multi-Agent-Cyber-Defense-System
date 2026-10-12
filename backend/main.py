"""
Multi-Agent Cyber Defense System (MACDS) - FastAPI Backend
Implements the full REST API Specification (FR-001 through FR-050) and real-time WebSocket telemetry.
"""
import os
import json
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, PlainTextResponse

from database import init_db, get_db
from models import (
    LoginRequest, LoginResponse, UserCreateRequest, UserResponse, PasswordChangeRequest,
    AgentModel, AgentControlRequest, ThreatModel, IncidentModel, IncidentRespondRequest,
    RuleModel, RuleCreateRequest, RuleUpdateRequest, ResponseModel, AuditLogModel,
    DeviceModel, FirewallRuleModel, FirewallRuleCreate, SimulateAttackRequest,
    FeedbackRequest, BFSDFSRequest, AStarPlanningRequest, GameTheoryRequest, FOLReasoningRequest
)
from auth import (
    create_access_token, verify_password, hash_password,
    get_current_user, require_roles
)
from agents.coordinator import CoordinatorAgent
from agents.network_monitor import NetworkMonitoringAgent
from agents.intrusion_detection import IntrusionDetectionAgent
from agents.threat_correlator import ThreatCorrelationAgent
from agents.knowledge_base import KnowledgeBaseAgent
from agents.reasoning_engine import ReasoningAgent
from agents.planning_engine import PlanningAgent
from agents.response_agent import ResponseAgent
from agents.learning_agent import LearningAgent
from agents.simulator import AttackSimulator, InvalidSimulationRequest
from reporting import ReportingEngine

# Initialize database
init_db()

app = FastAPI(
    title="Multi-Agent Cyber Defense System (MACDS) API",
    description="Agentic AI Cybersecurity Orchestration Platform",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Agents
coordinator = CoordinatorAgent(get_db)
net_monitor = NetworkMonitoringAgent(get_db, coordinator)
ids_agent = IntrusionDetectionAgent(get_db, coordinator)
correlator = ThreatCorrelationAgent(get_db, coordinator)
kb_agent = KnowledgeBaseAgent(get_db, coordinator)
reasoner = ReasoningAgent(get_db, coordinator, kb_agent)
planner = PlanningAgent(get_db, coordinator, kb_agent)
responder = ResponseAgent(get_db, coordinator)
learner = LearningAgent(get_db, coordinator, kb_agent)
simulator = AttackSimulator(net_monitor, ids_agent, correlator, reasoner, planner, responder, learner)
reporter = ReportingEngine(get_db, learner)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

# Background broadcast loop (<= 2 seconds refresh, meeting NFR-002)
@app.on_event("startup")
async def startup_event():
    async def telemetry_loop():
        while True:
            try:
                coordinator.update_agent_telemetry()
                packet = net_monitor.generate_live_packet()
                traffic = net_monitor.get_traffic_statistics()
                kpis = learner.calculate_performance_kpis()

                # Get latest active threats and agent status
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM agents")
                agents = [dict(r) for r in cursor.fetchall()]
                
                cursor.execute("SELECT * FROM threats ORDER BY timestamp DESC LIMIT 10")
                threats = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT * FROM incidents ORDER BY created_at DESC LIMIT 5")
                incidents = [dict(r) for r in cursor.fetchall()]
                conn.close()

                telemetry = {
                    "type": "TELEMETRY_UPDATE",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "live_packet": packet,
                    "traffic_stats": traffic,
                    "agents": agents,
                    "recent_threats": threats,
                    "recent_incidents": incidents,
                    "kpis": kpis,
                    "agent_messages": coordinator.get_communication_logs(10)
                }

                await ws_manager.broadcast(telemetry)
            except Exception as e:
                print(f"Error in telemetry loop: {e}")
            await asyncio.sleep(1.8)

    asyncio.create_task(telemetry_loop())

# Request & API Logging Middleware (FR-047)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    # Avoid write-lock churn on high frequency polling endpoints
    path = request.url.path
    if path not in ["/api/dashboard/stats", "/api/monitoring/traffic-stats", "/ws/live"] and not path.startswith("/assets"):
        try:
            now = datetime.now(timezone.utc).isoformat()
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO audit_logs (log_id, username, event_type, level, description, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    str(uuid.uuid4()),
                    "API_Client",
                    "API_REQUEST",
                    "INFO" if response.status_code < 400 else "WARNING",
                    f"{request.method} {path} -> {response.status_code}",
                    json.dumps({"status": response.status_code}),
                    now
                )
            )
            conn.commit()
            conn.close()
        except Exception:
            pass
    return response

# ==========================================
# MODULE 1: AUTHENTICATION & RBAC (FR-001 - FR-004)
# ==========================================

@app.post("/api/auth/login", response_model=LoginResponse)
def login(creds: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (creds.username,))
    user = cursor.fetchone()
    conn.close()

    if not user or not verify_password(creds.password, user["password_hash"]):
        # Log auth failure (FR-045)
        now = datetime.now(timezone.utc).isoformat()
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_logs (log_id, username, event_type, level, description, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), creds.username, "AUTH_FAILURE", "WARNING", f"Failed login attempt for username '{creds.username}'", json.dumps({"reason": "Invalid password"}), now)
        )
        conn.commit()
        conn.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    
    # Log auth success
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO audit_logs (log_id, username, event_type, level, description, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), user["username"], "AUTH_SUCCESS", "INFO", f"User '{user['username']}' logged in successfully", json.dumps({"role": user["role"]}), now)
    )
    conn.commit()
    conn.close()

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=user["user_id"],
        username=user["username"],
        email=user["email"],
        role=user["role"]
    )

@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/api/auth/users", response_model=List[UserResponse])
def list_users(current_user: dict = Depends(require_roles(["Administrator"]))):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, email, role, created_at FROM users ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/auth/users", response_model=UserResponse)
def create_user(req: UserCreateRequest, current_user: dict = Depends(require_roles(["Administrator"]))):
    conn = get_db()
    cursor = conn.cursor()
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    pw_hash = hash_password(req.password)
    try:
        cursor.execute(
            "INSERT INTO users (user_id, username, password_hash, email, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, req.username, pw_hash, req.email, req.role, now)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")
    conn.close()
    return UserResponse(user_id=user_id, username=req.username, email=req.email, role=req.role, created_at=now)

@app.delete("/api/auth/users/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(require_roles(["Administrator"]))):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"status": "User deleted"}

# ==========================================
# MODULE 2: DASHBOARD & TELEMETRY (FR-005 - FR-007)
# ==========================================

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM threats")
    total_threats = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE status = 'Investigating' OR status = 'Open'")
    active_incidents = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM firewall_rules WHERE action = 'DROP' OR action = 'DENY'")
    blocked_ips = cursor.fetchone()[0]
    cursor.execute("SELECT severity, COUNT(*) as count FROM threats GROUP BY severity")
    sev_counts = {r["severity"]: r["count"] for r in cursor.fetchall()}
    cursor.execute("SELECT COUNT(*) FROM network_devices WHERE is_isolated = 1")
    isolated_devices = cursor.fetchone()[0]
    conn.close()

    kpis = learner.calculate_performance_kpis()
    traffic = net_monitor.get_traffic_statistics()

    return {
        "summary": {
            "total_threats_detected": total_threats,
            "active_incidents": active_incidents,
            "blocked_firewall_ips": blocked_ips,
            "isolated_devices": isolated_devices,
            "autonomous_mitigation_rate": (
                f"{kpis['autonomous_mitigation_rate_percent']}%"
                if kpis["autonomous_mitigation_rate_percent"] is not None
                else None
            ),
            "mttd_sec": kpis["mean_time_to_detect_sec"],
            "mttr_sec": kpis["mean_time_to_respond_sec"]
        },
        "severity_distribution": {
            "Critical": sev_counts.get("Critical", 0),
            "High": sev_counts.get("High", 0),
            "Medium": sev_counts.get("Medium", 0),
            "Low": sev_counts.get("Low", 0),
            "Informational": sev_counts.get("Informational", 0)
        },
        "current_traffic": traffic
    }

# ==========================================
# MODULE 3: NETWORK MONITORING (FR-008 - FR-011)
# ==========================================

@app.get("/api/monitoring/devices", response_model=List[DeviceModel])
def get_devices():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM network_devices ORDER BY last_seen DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/monitoring/traffic-stats")
def get_traffic_stats():
    return net_monitor.get_traffic_statistics()

@app.get("/api/monitoring/topology/bfs")
def get_bfs_topology(root: str = "Router-Core"):
    return net_monitor.run_bfs_discovery(root)

@app.get("/api/monitoring/topology/dfs")
def get_dfs_topology(root: str = "Router-Core"):
    return net_monitor.run_dfs_traversal(root)

# ==========================================
# MODULE 4: INTRUSION DETECTION (FR-012 - FR-015)
# ==========================================

@app.get("/api/threats")
def list_threats(category: Optional[str] = None, severity: Optional[str] = None, limit: int = 50):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM threats WHERE 1=1"
    params = []
    if category:
        query += " AND category = ?"
        params.append(category)
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/threats/{threat_id}")
def get_threat(threat_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM threats WHERE threat_id = ?", (threat_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Threat not found")
    return dict(row)

# ==========================================
# MODULE 5: THREAT CORRELATION & INCIDENTS (FR-016 - FR-018)
# ==========================================

@app.get("/api/incidents")
def list_incidents(status_filter: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM incidents WHERE 1=1"
    params = []
    if status_filter:
        query += " AND status = ?"
        params.append(status_filter)
    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        d["attack_chain"] = json.loads(d["attack_chain"]) if d["attack_chain"] else []
        d["timeline"] = json.loads(d["timeline"]) if d["timeline"] else []
        d["evidence"] = json.loads(d["evidence"]) if d["evidence"] else {}
        d["decision_explanation"] = json.loads(d["decision_explanation"]) if d["decision_explanation"] else {}
        result.append(d)
    return result

@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Incident not found")
    d = dict(r)
    d["attack_chain"] = json.loads(d["attack_chain"]) if d["attack_chain"] else []
    d["timeline"] = json.loads(d["timeline"]) if d["timeline"] else []
    d["evidence"] = json.loads(d["evidence"]) if d["evidence"] else {}
    d["decision_explanation"] = json.loads(d["decision_explanation"]) if d["decision_explanation"] else {}
    return d

@app.post("/api/incidents/{incident_id}/respond")
def respond_incident(
    incident_id: str,
    req: IncidentRespondRequest,
    current_user: dict = Depends(require_roles(["Administrator", "Security Analyst"]))
):
    actor = f"Analyst ({current_user['username']})" if current_user else "Response Agent"
    res = responder.execute_action(
        incident_id=incident_id,
        action=req.action,
        target=req.target,
        executed_by=actor,
        reason=req.reason
    )
    return res

# ==========================================
# MODULE 6: KNOWLEDGE BASE & RULES (FR-019 - FR-022)
# ==========================================

@app.get("/api/rules")
def get_rules(category: Optional[str] = None, search: Optional[str] = None):
    return kb_agent.get_all_rules(category, search)

@app.post("/api/rules")
def create_rule(
    req: RuleCreateRequest,
    current_user: dict = Depends(require_roles(["Administrator", "Security Analyst"]))
):
    return kb_agent.create_rule(req.dict(), author=current_user["username"])

@app.put("/api/rules/{rule_id}")
def update_rule(
    rule_id: str,
    req: RuleUpdateRequest,
    current_user: dict = Depends(require_roles(["Administrator", "Security Analyst"]))
):
    return kb_agent.update_rule(rule_id, req.dict(exclude_unset=True), author=current_user["username"])

@app.delete("/api/rules/{rule_id}")
def delete_rule(
    rule_id: str,
    current_user: dict = Depends(require_roles(["Administrator"]))
):
    return kb_agent.delete_rule(rule_id)

@app.get("/api/kb/mitre-matrix")
def get_mitre():
    return kb_agent.get_mitre_matrix()

# ==========================================
# MODULE 7: REASONING AGENT & LOGIC (FR-023 - FR-027)
# ==========================================

@app.post("/api/reasoning/forward-chaining")
def test_forward_chaining(req: FOLReasoningRequest):
    return reasoner.forward_chaining_inference(req.facts)

@app.post("/api/reasoning/backward-chaining")
def test_backward_chaining(req: FOLReasoningRequest):
    return reasoner.backward_chaining_verification(req.goal or "Ransomware_Lateral_Outbreak", req.facts)

@app.post("/api/reasoning/resolution")
def test_resolution_refutation(req: Optional[FOLReasoningRequest] = None):
    query = req.goal if (req and req.goal) else "Threat_Confirmed"
    return reasoner.run_resolution_proof(query)

@app.get("/api/detection/greedy-search")
def get_greedy_search_prioritization():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT threat_id, attack_type, category, confidence, risk_level, severity, source_ip, destination_ip FROM threats ORDER BY timestamp DESC LIMIT 8")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    if not rows:
        rows = [
            {"threat_id": "THR-SAMPLE1", "attack_type": "sql_injection", "category": "Web Exploit", "confidence": 0.95, "risk_level": 9.2, "severity": "Critical", "source_ip": "103.251.167.22", "destination_ip": "192.168.1.20"},
            {"threat_id": "THR-SAMPLE2", "attack_type": "port_scan", "category": "Reconnaissance", "confidence": 0.70, "risk_level": 6.5, "severity": "High", "source_ip": "192.168.1.244", "destination_ip": "192.168.1.15"},
            {"threat_id": "THR-SAMPLE3", "attack_type": "brute_force", "category": "Credential Access", "confidence": 0.88, "risk_level": 8.5, "severity": "High", "source_ip": "45.33.32.156", "destination_ip": "192.168.1.10"},
            {"threat_id": "THR-SAMPLE4", "attack_type": "ddos", "category": "Denial of Service", "confidence": 0.91, "risk_level": 9.0, "severity": "Critical", "source_ip": "198.51.100.22", "destination_ip": "192.168.1.1"}
        ]
    return ids_agent.run_greedy_best_first_search(rows)

# ==========================================
# MODULE 8: PLANNING AGENT & GAME THEORY (FR-028 - FR-031)
# ==========================================

@app.post("/api/planning/rank-options")
def rank_options(payload: Dict[str, Any]):
    return planner.rank_response_options(payload)

@app.get("/api/planning/astar")
def get_astar_planning():
    return planner.run_astar_planning()

@app.post("/api/planning/game-theory")
def get_game_theory_simulation(req: GameTheoryRequest):
    return planner.run_game_theory_simulation(req.attacker_action, req.depth)

@app.get("/api/planning/csp-firewall")
def solve_csp():
    return planner.solve_firewall_csp()

@app.get("/api/planning/hill-climbing")
def solve_hill_climbing(threshold: float = 0.50):
    return planner.run_hill_climbing_optimization(threshold)

# ==========================================
# MODULE 9: RESPONSE AGENT & FIREWALL (FR-032 - FR-036)
# ==========================================

@app.get("/api/firewall/rules", response_model=List[FirewallRuleModel])
def get_firewall_rules():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM firewall_rules ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/firewall/rules")
def add_firewall_rule(
    req: FirewallRuleCreate,
    current_user: dict = Depends(require_roles(["Administrator", "Network Administrator"]))
):
    conn = get_db()
    cursor = conn.cursor()
    rule_id = f"FW-{str(uuid.uuid4())[:6].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """INSERT INTO firewall_rules (rule_id, ip_address, port, protocol, action, comment, added_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (rule_id, req.ip_address, req.port, req.protocol, req.action, req.comment or "Manual Firewall ACL", current_user["username"], now)
    )
    conn.commit()
    conn.close()
    return {"status": "Created", "rule_id": rule_id}

@app.delete("/api/firewall/rules/{rule_id}")
def delete_firewall_rule(
    rule_id: str,
    current_user: dict = Depends(require_roles(["Administrator", "Network Administrator"]))
):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM firewall_rules WHERE rule_id = ?", (rule_id,))
    conn.commit()
    conn.close()
    return {"status": "Firewall rule deleted", "rule_id": rule_id}

@app.post("/api/devices/{device_id}/isolate")
def toggle_device_isolation(
    device_id: str,
    current_user: dict = Depends(require_roles(["Administrator", "Security Analyst", "Network Administrator"]))
):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT is_isolated FROM network_devices WHERE device_id = ?", (device_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Device not found")
    new_state = 0 if row["is_isolated"] else 1
    cursor.execute("UPDATE network_devices SET is_isolated = ?, status = ? WHERE device_id = ?", (new_state, "Quarantined" if new_state else "Online", device_id))
    conn.commit()
    conn.close()
    return {"device_id": device_id, "is_isolated": bool(new_state)}

# ==========================================
# MODULE 10: LEARNING AGENT & KPIS (FR-037 - FR-040)
# ==========================================

@app.post("/api/learning/feedback")
def submit_feedback(
    req: FeedbackRequest,
    current_user: dict = Depends(require_roles(["Administrator", "Security Analyst"]))
):
    return learner.process_analyst_feedback(req.incident_id, req.feedback_type, req.notes)

@app.get("/api/learning/kpis")
def get_kpis():
    return learner.calculate_performance_kpis()

@app.get("/api/learning/recommendations")
def get_recommendations():
    return learner.generate_rule_recommendations()

# ==========================================
# MODULE 11: REPORTING (FR-041 - FR-044)
# ==========================================

@app.get("/api/reports/incident/{incident_id}")
def get_incident_report(incident_id: str):
    return reporter.generate_incident_report(incident_id)

@app.get("/api/reports/daily")
def get_daily_report():
    return reporter.generate_daily_report()

@app.get("/api/reports/weekly")
def get_weekly_report():
    return reporter.generate_weekly_report()

@app.get("/api/reports/export/csv")
def export_csv():
    csv_text = reporter.export_csv_threats()
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=macds_threats_export.csv"}
    )

@app.get("/api/reports/export/pdf/{incident_id}")
def export_pdf(incident_id: str):
    try:
        pdf_bytes = reporter.export_pdf_incident_report(incident_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=incident_{incident_id}_report.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {e}")

# ==========================================
# MODULE 12: AUDIT & SYSTEM LOGS (FR-045 - FR-048)
# ==========================================

@app.get("/api/logs/audit", response_model=List[AuditLogModel])
def get_audit_logs(event_type: Optional[str] = None, limit: int = 100):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM audit_logs WHERE 1=1"
    params = []
    if event_type:
        query += " AND event_type = ?"
        params.append(event_type)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ==========================================
# MODULE 13: AGENTS & SYSTEM CONFIG (FR-049 - FR-050)
# ==========================================

@app.get("/api/agents")
def get_agents():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents")
    rows = cursor.fetchall()
    conn.close()
    agents = []
    for r in rows:
        d = dict(r)
        d["config"] = json.loads(d["config"]) if d["config"] else {}
        agents.append(d)
    return agents

@app.post("/api/agents/{agent_id}/control")
def control_agent(
    agent_id: str,
    req: AgentControlRequest,
    current_user: dict = Depends(require_roles(["Administrator"]))
):
    return coordinator.control_agent(agent_id, req.action, req.config)

@app.get("/api/settings")
def get_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM system_settings")
    rows = cursor.fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

@app.post("/api/settings/{key}")
def update_setting(
    key: str,
    value: Dict[str, Any],
    current_user: dict = Depends(require_roles(["Administrator"]))
):
    now = datetime.now(timezone.utc).isoformat()
    val_str = value.get("value", "")
    if isinstance(val_str, (dict, list)):
        val_str = json.dumps(val_str)
    else:
        val_str = str(val_str)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        (key, val_str, now)
    )
    conn.commit()
    conn.close()
    return {"status": "Updated", "key": key, "value": val_str}

# ==========================================
# MODULE 14: ATTACK SIMULATION (PRD Section 48)
# ==========================================

@app.post("/api/simulation/run")
def run_attack_simulation(req: SimulateAttackRequest):
    try:
        return simulator.run_scenario(req.scenario, {
            "source_ip": req.source_ip,
            "target_ip": req.target_ip,
            "intensity": req.intensity,
            "custom_payload": req.custom_payload
        })
    except InvalidSimulationRequest as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

# ==========================================
# WEBSOCKET REAL-TIME ENDPOINT
# ==========================================

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or handle client ping
            await websocket.send_json({"type": "PONG", "timestamp": datetime.now(timezone.utc).isoformat()})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
