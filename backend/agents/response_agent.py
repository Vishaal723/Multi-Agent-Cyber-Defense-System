"""
Response Agent Module (PRD Section 10.8 & Module 9 FR-032 to FR-036)
Acts as the system actuator executing defensive actions:
- Block IP Address & Update Firewall Rules
- Quarantine & Isolate Endpoints
- Disable User Accounts
- Dispatch multi-channel notifications (Dashboard, Email, Slack/Teams)
- Complete Audit Logging
"""
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional


class ProtectedAssetViolation(Exception):
    def __init__(self, detail):
        super().__init__(detail)
        self.detail = detail

class ResponseAgent:
    def __init__(self, db_conn_factory, coordinator):
        self.agent_id = "agent-responder-008"
        self.name = "Response Agent"
        self.type = "Actuator"
        self.db_conn_factory = db_conn_factory
        self.coordinator = coordinator

    def execute_action(
        self,
        incident_id: str,
        action: str,
        target: str,
        executed_by: str = "Response Agent (Autonomous)",
        reason: Optional[str] = None,
        workflow_plan_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Executes a defensive response action and logs the entire audit trail"""
        now = datetime.now(timezone.utc).isoformat()
        response_id = f"RESP-{str(uuid.uuid4())[:8].upper()}"
        conn = self.db_conn_factory()
        cursor = conn.cursor()

        # Revalidate active critical-asset constraints in the same SQLite transaction
        # as a simulated isolation so direct API calls cannot bypass the policy.
        action_upper = action.upper()
        if any(term in action_upper for term in ("ISOLAT", "QUARANTIN", "SHUTDOWN", "POWER_OFF", "DISCONNECT")):
            protected = cursor.execute(
                """SELECT d.hostname, d.ip_address, c.constraint_text FROM simulated_asset_constraints c
                   JOIN network_devices d ON d.device_id = c.device_id
                   WHERE c.incident_id = ? AND (c.device_id = ? OR d.hostname = ? OR d.ip_address = ?)
                   LIMIT 1""",
                (incident_id, target, target, target),
            ).fetchone()
            if protected:
                conn.close()
                raise ProtectedAssetViolation(
                    f"Rejected: {action} would isolate protected asset {protected['hostname']} ({protected['ip_address']}). "
                    f"Active constraint: {protected['constraint_text']}"
                )

        details = {}
        status = "Executed"
        cost = "Low"
        risk = "Low"
        confidence = 0.95
        effectiveness = 0.90

        if action in ["BLOCK_IP", "BLOCK_IP_ADDRESS"]:
            cost = "Low"
            risk = "Low"
            fw_rule_id = f"FW-{str(uuid.uuid4())[:6].upper()}"
            cursor.execute(
                """INSERT INTO firewall_rules (rule_id, ip_address, port, protocol, action, comment, added_by, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (fw_rule_id, target, None, "ALL", "DROP", f"Auto-mitigation for incident {incident_id}: {reason or 'Malicious activity'}", executed_by, now)
            )
            details = {
                "firewall_rule_id": fw_rule_id,
                "target_ip": target,
                "action": "DROP_ALL_TRAFFIC",
                "interface": "eth0_wan"
            }

        elif action in ["ISOLATE_DEVICE", "ISOLATE_ENDPOINT"]:
            cost = "Medium"
            risk = "Medium"
            cursor.execute(
                """UPDATE network_devices SET is_isolated = 1, status = 'Quarantined' WHERE ip_address = ? OR hostname = ?""",
                (target, target)
            )
            details = {
                "isolated_device": target,
                "vlan_assigned": "VLAN_999_ISOLATION",
                "switch_port_status": "RESTRICTED_REMEDIATION_ONLY"
            }

        elif action in ["LOCKOUT_USER", "DISABLE_USER_ACCOUNT"]:
            cost = "Medium"
            risk = "High"
            details = {
                "locked_username": target,
                "active_sessions_revoked": 2,
                "ldap_status": "ACCOUNT_DISABLED"
            }

        else:
            details = {"action_type": action, "target": target, "notes": reason or "Action executed"}

        # Store response execution record
        cursor.execute(
            """INSERT INTO responses 
            (response_id, incident_id, action, target, cost, risk, confidence, expected_effectiveness, status, executed_by, details, executed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                response_id,
                incident_id,
                action,
                target,
                cost,
                risk,
                confidence,
                effectiveness,
                status,
                executed_by,
                json.dumps(details),
                now
            )
        )

        if workflow_plan_id:
            execution_id = f"EXEC-{str(uuid.uuid4())[:10].upper()}"
            result = {
                "status": status,
                "response_id": response_id,
                "incident_id": incident_id,
                "action": action,
                "target": target,
                "details": details,
                "executed_at": now,
                "simulation_only": True,
            }
            cursor.execute(
                """INSERT INTO simulated_executions
                   (execution_id, incident_id, plan_id, response_id, status, result_json, created_by, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (execution_id, incident_id, workflow_plan_id, response_id, status, json.dumps(result), executed_by, now),
            )

        # Update Incident status to Mitigated
        cursor.execute(
            """UPDATE incidents SET status = 'Mitigated', updated_at = ? WHERE incident_id = ?""",
            (now, incident_id)
        )

        # Record in Audit Logs (FR-036, FR-045)
        log_id = str(uuid.uuid4())
        cursor.execute(
            """INSERT INTO audit_logs (log_id, username, event_type, level, description, details, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                log_id,
                executed_by,
                "DEFENSIVE_ACTION_EXECUTED",
                "SECURITY",
                f"Action '{action}' executed against target '{target}' for incident {incident_id}",
                json.dumps(details),
                now
            )
        )

        conn.commit()
        conn.close()

        # Send multi-channel notification dispatch
        self.dispatch_notifications(incident_id, action, target, executed_by)

        # Send message to Learning Agent
        self.coordinator.register_message(
            sender=self.name,
            recipient="Learning Agent",
            message_type="RESPONSE_EXECUTED",
            payload={
                "response_id": response_id,
                "incident_id": incident_id,
                "action": action,
                "target": target,
                "executed_at": now
            }
        )

        return {
            "response_id": response_id,
            "incident_id": incident_id,
            "action": action,
            "target": target,
            "status": status,
            "details": details,
            "executed_at": now,
            "simulation_only": True,
            "workflow_plan_id": workflow_plan_id,
        }

    def dispatch_notifications(self, incident_id: str, action: str, target: str, executed_by: str):
        """Simulates multi-channel notification dispatch (FR-035)"""
        now = datetime.now(timezone.utc).isoformat()
        notification = {
            "channels": ["Dashboard_WebSocket", "Email_Alert_Relay", "Slack_SOC_Channel"],
            "subject": f"[MACDS ALERT] Automated Mitigation: {action} on {target}",
            "incident_id": incident_id,
            "actor": executed_by,
            "timestamp": now
        }
        self.coordinator.register_message(
            sender=self.name,
            recipient="Coordinator Agent",
            message_type="ALERT_NOTIFICATION_BROADCAST",
            payload=notification
        )
