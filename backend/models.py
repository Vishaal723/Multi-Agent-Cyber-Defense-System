"""
MACDS Pydantic Data Models
Defines all request, response, and agent message schemas.
"""
from pydantic import BaseModel, Field, StrictStr
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

# Auth Models (FR-001 - FR-004)
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    email: str
    role: str

class UserCreateRequest(BaseModel):
    username: str
    password: str
    email: str
    role: str

class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str
    role: str
    created_at: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# Agent Models (FR-006, FR-049)
class AgentModel(BaseModel):
    agent_id: str
    name: str
    type: str
    status: str
    cpu_usage: float
    memory_usage: float
    latency_ms: float
    heartbeat: str
    config: Optional[Dict[str, Any]] = None

class AgentControlRequest(BaseModel):
    action: str  # "start", "stop", "restart", "update_config"
    config: Optional[Dict[str, Any]] = None

# Threat Models (FR-012 - FR-015)
class ThreatModel(BaseModel):
    threat_id: str
    attack_type: str
    category: str
    confidence: float
    severity: str  # Critical, High, Medium, Low, Informational
    risk_level: float
    source_ip: str
    destination_ip: str
    payload_sample: Optional[str] = None
    mitre_technique: Optional[str] = None
    status: str  # Detected, Correlated, Mitigated, False_Positive
    timestamp: str

# Incident Models (FR-016 - FR-018)
class IncidentModel(BaseModel):
    incident_id: str
    title: str
    threat_id: Optional[str] = None
    status: str  # Open, Investigating, Mitigated, Resolved, Closed
    severity: str
    assigned_to: Optional[str] = None
    attack_chain: Optional[List[Dict[str, Any]]] = None
    timeline: Optional[List[Dict[str, Any]]] = None
    evidence: Optional[Dict[str, Any]] = None
    decision_explanation: Optional[Dict[str, Any]] = None
    recommended_action: Optional[str] = None
    created_at: str
    updated_at: str

class IncidentRespondRequest(BaseModel):
    action: str  # "BLOCK_IP", "ISOLATE_DEVICE", "LOCKOUT_USER", "UPDATE_FIREWALL", "IGNORE"
    target: str
    reason: Optional[str] = None
    analyst_approved: bool = True

# Rule Models (FR-019 - FR-022)
class RuleModel(BaseModel):
    rule_id: str
    name: str
    condition: str
    action: str
    category: str
    severity: str
    version: int
    author: str
    enabled: bool
    mitre_mapping: Optional[str] = None
    created_at: str
    updated_at: str

class RuleCreateRequest(BaseModel):
    name: str
    condition: str
    action: str
    category: str
    severity: str
    author: str = "SOC Analyst"
    mitre_mapping: Optional[str] = None

class RuleUpdateRequest(BaseModel):
    name: Optional[str] = None
    condition: Optional[str] = None
    action: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    enabled: Optional[bool] = None
    mitre_mapping: Optional[str] = None

# Response Models (FR-028 - FR-036)
class ResponseModel(BaseModel):
    response_id: str
    incident_id: str
    action: str
    target: str
    cost: str
    risk: str
    confidence: float
    expected_effectiveness: float
    status: str
    executed_by: str
    details: Optional[str] = None
    executed_at: str

# Audit Log Models (FR-045 - FR-048)
class AuditLogModel(BaseModel):
    log_id: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    event_type: str
    level: str
    description: str
    details: Optional[str] = None
    created_at: str

# Network Device & Firewall Models
class DeviceModel(BaseModel):
    device_id: str
    ip_address: str
    mac_address: str
    hostname: str
    device_type: str
    status: str
    is_isolated: bool
    is_rogue: bool
    last_seen: str

class FirewallRuleModel(BaseModel):
    rule_id: str
    ip_address: str
    port: Optional[int] = None
    protocol: str
    action: str
    comment: Optional[str] = None
    added_by: str
    created_at: str

class FirewallRuleCreate(BaseModel):
    ip_address: str
    port: Optional[int] = None
    protocol: str = "ALL"
    action: str = "DENY"
    comment: Optional[str] = None

# Simulation & Feedback Models
class SimulateAttackRequest(BaseModel):
    scenario: str = Field(min_length=1, max_length=64)
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    intensity: Optional[Literal["Low", "Medium", "High"]] = "High"
    custom_payload: Optional[StrictStr] = Field(default=None, max_length=2048)

class FeedbackRequest(BaseModel):
    incident_id: str
    feedback_type: str  # "True_Positive", "False_Positive", "False_Negative"
    notes: Optional[str] = None

# AI Algorithm Sandbox Request/Response
class BFSDFSRequest(BaseModel):
    start_node: str = "Router-Core"
    target_node: Optional[str] = None
    algorithm: str = "BFS"  # "BFS" or "DFS"

class AStarPlanningRequest(BaseModel):
    threat_severity: str = "Critical"
    asset_criticality: str = "High"
    current_state: str = "Threat_Active"
    target_state: str = "Threat_Mitigated"

class GameTheoryRequest(BaseModel):
    attacker_action: str = "Stealth_Exfiltration"
    defender_action: Optional[str] = None
    depth: int = 3

class FOLReasoningRequest(BaseModel):
    facts: List[str]
    goal: Optional[str] = None
    method: str = "Forward_Chaining"  # "Forward_Chaining" or "Backward_Chaining" or "Resolution"
