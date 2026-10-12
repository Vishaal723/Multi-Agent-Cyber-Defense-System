"""
Knowledge Base Agent Module (PRD Section 10.5 & Section 30)
Stores cybersecurity knowledge including:
- Detection Rules, Firewall Rules, Security Policies
- MITRE ATT&CK Matrix mappings
- Rule versioning, search, and knowledge updates
"""
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

class KnowledgeBaseAgent:
    def __init__(self, db_conn_factory, coordinator):
        self.agent_id = "agent-kb-005"
        self.name = "Knowledge Base Agent"
        self.type = "Storage"
        self.db_conn_factory = db_conn_factory
        self.coordinator = coordinator

        self.mitre_attack_matrix = [
            {
                "tactic": "Reconnaissance",
                "id": "TA0043",
                "techniques": [
                    {"id": "T1595", "name": "Active Scanning", "description": "Scanning network IP ranges and ports to identify targets."},
                    {"id": "T1592", "name": "Gather Victim Host Information", "description": "Enumerating host specs, services, and software versions."}
                ]
            },
            {
                "tactic": "Initial Access",
                "id": "TA0001",
                "techniques": [
                    {"id": "T1190", "name": "Exploit Public-Facing Application", "description": "Exploiting SQL injection, buffer overflows, or SSRF in web apps."},
                    {"id": "T1133", "name": "External Remote Services", "description": "Leveraging exposed VPNs, RDP or SSH gateways."}
                ]
            },
            {
                "tactic": "Credential Access",
                "id": "TA0006",
                "techniques": [
                    {"id": "T1110", "name": "Brute Force", "description": "Password guessing, credential stuffing, and spray attacks."},
                    {"id": "T1003", "name": "OS Credential Dumping", "description": "Dumping LSASS memory or SAM registry hashes."}
                ]
            },
            {
                "tactic": "Command and Control",
                "id": "TA0011",
                "techniques": [
                    {"id": "T1071.004", "name": "DNS Tunneling", "description": "Exfiltrating data or receiving commands via DNS queries."},
                    {"id": "T1071.001", "name": "Web Protocols (HTTP/S)", "description": "Using encrypted HTTPS sessions to hide C2 communication."}
                ]
            },
            {
                "tactic": "Impact",
                "id": "TA0040",
                "techniques": [
                    {"id": "T1486", "name": "Data Encrypted for Impact", "description": "Ransomware encryption of enterprise file systems."},
                    {"id": "T1498", "name": "Network Denial of Service", "description": "Flooding network links or routers with volumetric traffic."}
                ]
            }
        ]

    def get_all_rules(self, category: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = self.db_conn_factory()
        cursor = conn.cursor()
        query = "SELECT * FROM rules WHERE 1=1"
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)
        if search:
            query += " AND (name LIKE ? OR condition LIKE ? OR action LIKE ? OR mitre_mapping LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term, term])

        query += " ORDER BY created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        return [dict(r) for r in rows]

    def create_rule(self, rule_data: Dict[str, Any], author: str = "SecOps") -> Dict[str, Any]:
        conn = self.db_conn_factory()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        rule_id = str(uuid.uuid4())

        cursor.execute(
            """INSERT INTO rules 
            (rule_id, name, condition, action, category, severity, version, author, enabled, mitre_mapping, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rule_id,
                rule_data["name"],
                rule_data["condition"],
                rule_data["action"],
                rule_data["category"],
                rule_data.get("severity", "Medium"),
                1,
                author,
                1,
                rule_data.get("mitre_mapping", "N/A"),
                now,
                now
            )
        )
        conn.commit()
        conn.close()

        self.coordinator.register_message(
            sender=self.name,
            recipient="Coordinator Agent",
            message_type="RULE_CREATED",
            payload={"rule_id": rule_id, "name": rule_data["name"], "version": 1}
        )

        return {"rule_id": rule_id, "version": 1, "status": "Created"}

    def update_rule(self, rule_id: str, updates: Dict[str, Any], author: str = "SecOps") -> Dict[str, Any]:
        conn = self.db_conn_factory()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rules WHERE rule_id = ?", (rule_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            return {"error": "Rule not found"}

        new_version = existing["version"] + 1
        now = datetime.now(timezone.utc).isoformat()

        name = updates.get("name", existing["name"])
        condition = updates.get("condition", existing["condition"])
        action = updates.get("action", existing["action"])
        category = updates.get("category", existing["category"])
        severity = updates.get("severity", existing["severity"])
        enabled = updates.get("enabled", existing["enabled"])
        mitre = updates.get("mitre_mapping", existing["mitre_mapping"])

        cursor.execute(
            """UPDATE rules SET name = ?, condition = ?, action = ?, category = ?, severity = ?, 
               version = ?, author = ?, enabled = ?, mitre_mapping = ?, updated_at = ?
               WHERE rule_id = ?""",
            (name, condition, action, category, severity, new_version, author, enabled, mitre, now, rule_id)
        )
        conn.commit()
        conn.close()

        self.coordinator.register_message(
            sender=self.name,
            recipient="Coordinator Agent",
            message_type="RULE_UPDATED",
            payload={"rule_id": rule_id, "version": new_version, "name": name}
        )

        return {"rule_id": rule_id, "version": new_version, "status": "Updated"}

    def delete_rule(self, rule_id: str) -> Dict[str, Any]:
        conn = self.db_conn_factory()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM rules WHERE rule_id = ?", (rule_id,))
        conn.commit()
        conn.close()
        return {"status": "Deleted", "rule_id": rule_id}

    def get_mitre_matrix(self) -> List[Dict[str, Any]]:
        return self.mitre_attack_matrix
