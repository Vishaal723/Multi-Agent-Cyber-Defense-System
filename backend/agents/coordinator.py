"""
Coordinator Agent Module (PRD Section 10.1)
Acts as the central orchestrator of the entire Multi-Agent Cyber Defense System.
Manages agent registration, health monitoring, task scheduling, failure recovery, and message passing.
"""
import uuid
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import random

class CoordinatorAgent:
    def __init__(self, db_conn_factory):
        self.agent_id = "coordinator-agent-001"
        self.name = "Coordinator Agent"
        self.type = "Orchestrator"
        self.status = "Active"
        self.db_conn_factory = db_conn_factory
        self.message_bus: List[Dict[str, Any]] = []
        self.last_heartbeat = datetime.now(timezone.utc).isoformat()
        self.cpu_usage = 12.5
        self.memory_usage = 45.0
        self.latency_ms = 15.0

    def register_message(self, sender: str, recipient: str, message_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Appends structured JSON message to inter-agent communication bus (PRD Section 11)"""
        msg = {
            "message_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sender": sender,
            "recipient": recipient,
            "type": message_type,
            "payload": payload
        }
        self.message_bus.append(msg)
        if len(self.message_bus) > 200:
            self.message_bus.pop(0)
        return msg

    def get_communication_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        return list(reversed(self.message_bus[-limit:]))

    def update_agent_telemetry(self):
        """Simulates live heartbeat and resource metrics for all registered agents"""
        conn = self.db_conn_factory()
        cursor = conn.cursor()
        cursor.execute("SELECT agent_id, name, status, cpu_usage, memory_usage FROM agents")
        rows = cursor.fetchall()
        now = datetime.now(timezone.utc).isoformat()

        for r in rows:
            if r["status"] == "Active":
                # Add natural jitter
                new_cpu = max(2.0, min(95.0, r["cpu_usage"] + random.uniform(-3.5, 3.5)))
                new_mem = max(10.0, min(90.0, r["memory_usage"] + random.uniform(-1.5, 1.5)))
                new_lat = max(5.0, min(80.0, random.uniform(12.0, 35.0)))
                cursor.execute(
                    "UPDATE agents SET cpu_usage = ?, memory_usage = ?, latency_ms = ?, heartbeat = ? WHERE agent_id = ?",
                    (round(new_cpu, 1), round(new_mem, 1), round(new_lat, 1), now, r["agent_id"])
                )
        conn.commit()
        conn.close()

    def control_agent(self, agent_name_or_id: str, action: str, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Handles enable, disable, restart and configuration updates (FR-049)"""
        conn = self.db_conn_factory()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM agents WHERE agent_id = ? OR name = ?", (agent_name_or_id, agent_name_or_id))
        agent = cursor.fetchone()
        if not agent:
            conn.close()
            return {"success": False, "error": f"Agent '{agent_name_or_id}' not found"}

        new_status = agent["status"]
        if action == "stop":
            new_status = "Disabled"
        elif action == "start":
            new_status = "Active"
        elif action == "restart":
            new_status = "Active"
            self.register_message(
                sender=self.name,
                recipient=agent["name"],
                message_type="AGENT_RESTART",
                payload={"reason": "Manual administrator command", "timestamp": datetime.now(timezone.utc).isoformat()}
            )

        now = datetime.now(timezone.utc).isoformat()
        if config:
            cursor.execute(
                "UPDATE agents SET status = ?, heartbeat = ?, config = ? WHERE agent_id = ?",
                (new_status, now, json.dumps(config), agent["agent_id"])
            )
        else:
            cursor.execute(
                "UPDATE agents SET status = ?, heartbeat = ? WHERE agent_id = ?",
                (new_status, now, agent["agent_id"])
            )
        
        # Log to audit log
        cursor.execute(
            "INSERT INTO audit_logs (log_id, username, event_type, level, description, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), "System", "AGENT_CONTROL", "INFO", f"Agent {agent['name']} action: {action}", json.dumps({"new_status": new_status}), now)
        )

        conn.commit()
        conn.close()
        return {"success": True, "agent_id": agent["agent_id"], "name": agent["name"], "status": new_status}
