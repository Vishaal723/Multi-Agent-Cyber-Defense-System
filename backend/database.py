"""
MACDS Database Module
Handles SQLite connection, schema migrations, and initial seeding.
"""
import sqlite3
import os
import json
import uuid
from datetime import datetime, timezone

DB_PATH = os.environ.get("MACDS_DB_PATH") or os.path.join(os.path.dirname(__file__), "data", "macds.db")

def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout = 10000;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    cursor = conn.cursor()

    # Users Table (FR-001 - FR-004)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # Agents Table (FR-006, FR-049)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agents (
        agent_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        cpu_usage REAL DEFAULT 0.0,
        memory_usage REAL DEFAULT 0.0,
        latency_ms REAL DEFAULT 0.0,
        heartbeat TEXT NOT NULL,
        config TEXT DEFAULT '{}'
    );
    """)

    # Threats Table (FR-012 - FR-015)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS threats (
        threat_id TEXT PRIMARY KEY,
        attack_type TEXT NOT NULL,
        category TEXT NOT NULL,
        confidence REAL NOT NULL,
        severity TEXT NOT NULL,
        risk_level REAL NOT NULL,
        source_ip TEXT NOT NULL,
        destination_ip TEXT NOT NULL,
        payload_sample TEXT,
        mitre_technique TEXT,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL
    );
    """)

    # Incidents Table (FR-016 - FR-018)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        incident_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        threat_id TEXT,
        status TEXT NOT NULL,
        severity TEXT NOT NULL,
        assigned_to TEXT,
        attack_chain TEXT,
        timeline TEXT,
        evidence TEXT,
        decision_explanation TEXT,
        recommended_action TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # Rules Table (FR-019 - FR-022)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rules (
        rule_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        condition TEXT NOT NULL,
        action TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        author TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT 1,
        mitre_mapping TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # Responses Table (FR-028 - FR-036)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS responses (
        response_id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        cost TEXT NOT NULL,
        risk TEXT NOT NULL,
        confidence REAL NOT NULL,
        expected_effectiveness REAL NOT NULL,
        status TEXT NOT NULL,
        executed_by TEXT NOT NULL,
        details TEXT,
        executed_at TEXT NOT NULL
    );
    """)

    # Audit Logs Table (FR-036, FR-045 - FR-048)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        log_id TEXT PRIMARY KEY,
        user_id TEXT,
        username TEXT,
        event_type TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'INFO',
        description TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Network Devices Table (FR-009)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS network_devices (
        device_id TEXT PRIMARY KEY,
        ip_address TEXT UNIQUE NOT NULL,
        mac_address TEXT NOT NULL,
        hostname TEXT NOT NULL,
        device_type TEXT NOT NULL,
        status TEXT NOT NULL,
        is_isolated BOOLEAN NOT NULL DEFAULT 0,
        is_rogue BOOLEAN NOT NULL DEFAULT 0,
        last_seen TEXT NOT NULL
    );
    """)

    # Firewall Rules Table (FR-032)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS firewall_rules (
        rule_id TEXT PRIMARY KEY,
        ip_address TEXT NOT NULL,
        port INTEGER,
        protocol TEXT NOT NULL,
        action TEXT NOT NULL,
        comment TEXT,
        added_by TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # Learning Metrics & Feedback Table (FR-037 - FR-040)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS learning_metrics (
        metric_id TEXT PRIMARY KEY,
        incident_id TEXT,
        response_time_sec REAL NOT NULL,
        detection_accuracy REAL NOT NULL,
        success_rate REAL NOT NULL,
        analyst_feedback TEXT,
        feedback_notes TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # System Settings Table (FR-050)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    conn.commit()
    seed_initial_data(cursor, conn)
    conn.close()

def seed_initial_data(cursor, conn):
    # Check if admin user exists
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        import hashlib
        def hash_pw(pw):
            return hashlib.sha256(pw.encode()).hexdigest()

        now = datetime.now(timezone.utc).isoformat()
        users = [
            (str(uuid.uuid4()), "admin", hash_pw("Admin@123"), "admin@defense.local", "Administrator", now),
            (str(uuid.uuid4()), "analyst", hash_pw("Analyst@123"), "analyst@defense.local", "Security Analyst", now),
            (str(uuid.uuid4()), "netadmin", hash_pw("NetAdmin@123"), "netadmin@defense.local", "Network Administrator", now),
            (str(uuid.uuid4()), "auditor", hash_pw("Auditor@123"), "auditor@defense.local", "Read-Only Auditor", now)
        ]
        cursor.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)", users)

    # Pre-seed agents (PRD Section 10)
    cursor.execute("SELECT COUNT(*) FROM agents")
    if cursor.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        agents_data = [
            (str(uuid.uuid4()), "Coordinator Agent", "Orchestrator", "Active", 12.4, 45.2, 18.5, now, json.dumps({"mode": "Autonomous", "heartbeat_interval": 2})),
            (str(uuid.uuid4()), "Network Monitoring Agent", "Perception", "Active", 24.8, 68.4, 22.1, now, json.dumps({"packet_rate_limit": 5000, "discovery_algo": "BFS"})),
            (str(uuid.uuid4()), "Intrusion Detection Agent", "Detection", "Active", 31.2, 82.1, 35.0, now, json.dumps({"search_algorithm": "A*", "confidence_threshold": 0.75})),
            (str(uuid.uuid4()), "Threat Correlation Agent", "Correlation", "Active", 18.9, 54.3, 28.4, now, json.dumps({"window_seconds": 300, "traversal": "DFS"})),
            (str(uuid.uuid4()), "Knowledge Base Agent", "Storage", "Active", 8.2, 38.0, 12.0, now, json.dumps({"versioning": True, "auto_sync": True})),
            (str(uuid.uuid4()), "Reasoning Agent", "Inference", "Active", 28.5, 76.5, 42.0, now, json.dumps({"inference_mode": "ForwardChaining", "logic_engine": "FOL"})),
            (str(uuid.uuid4()), "Planning Agent", "Planning", "Active", 34.1, 85.0, 48.6, now, json.dumps({"strategy_engine": "GameTheory_AlphaBeta", "optimizer": "CSP"})),
            (str(uuid.uuid4()), "Response Agent", "Actuator", "Active", 14.5, 49.0, 20.2, now, json.dumps({"auto_mitigation": True, "approval_threshold": "High"})),
            (str(uuid.uuid4()), "Learning Agent", "Optimization", "Active", 16.0, 52.0, 31.0, now, json.dumps({"learning_rate": 0.05, "feedback_loop": True}))
        ]
        cursor.executemany("INSERT INTO agents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", agents_data)

    # Pre-seed Network Devices (FR-009)
    cursor.execute("SELECT COUNT(*) FROM network_devices")
    if cursor.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        devices = [
            (str(uuid.uuid4()), "192.168.1.1", "00:1A:2B:3C:4D:01", "Gateway-Router-Core", "Router", "Online", 0, 0, now),
            (str(uuid.uuid4()), "192.168.1.10", "00:1A:2B:3C:4D:10", "Auth-ActiveDirectory-Svr", "Server", "Online", 0, 0, now),
            (str(uuid.uuid4()), "192.168.1.15", "00:1A:2B:3C:4D:15", "Database-Prod-Cluster", "Database", "Online", 0, 0, now),
            (str(uuid.uuid4()), "192.168.1.20", "00:1A:2B:3C:4D:20", "Web-App-Gateway-01", "Web Server", "Online", 0, 0, now),
            (str(uuid.uuid4()), "192.168.1.105", "70:85:C2:5E:11:05", "Workstation-Finance-04", "Workstation", "Online", 0, 0, now),
            (str(uuid.uuid4()), "192.168.1.112", "70:85:C2:5E:11:12", "Workstation-Dev-09", "Workstation", "Online", 0, 0, now),
            (str(uuid.uuid4()), "192.168.1.244", "B8:27:EB:99:4A:2F", "Unknown-ESP32-Rogue", "IoT Device", "Suspicious", 0, 1, now),
        ]
        cursor.executemany("INSERT INTO network_devices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", devices)

    # Pre-seed Detection Rules (FR-019 - FR-022)
    cursor.execute("SELECT COUNT(*) FROM rules")
    if cursor.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        rules = [
            (str(uuid.uuid4()), "Brute Force Authentication Rule", "failed_login_attempts > 5 within 60s", "ALERT_AND_PLAN_LOCKOUT", "Authentication", "High", 1, "SecOps Team", 1, "T1110 - Brute Force", now, now),
            (str(uuid.uuid4()), "SQL Injection Pattern Rule", "payload matches (' OR 1=1|UNION SELECT|DROP TABLE|--|;)", "BLOCK_IP_AND_ALERT", "Web Attack", "Critical", 2, "SOC Architect", 1, "T1190 - Exploit Public-Facing Application", now, now),
            (str(uuid.uuid4()), "Ransomware Lateral Encryption Rule", "rapid_file_modifications > 100/sec AND known_ransom_ext", "ISOLATE_ENDPOINT_IMMEDIATELY", "Malware", "Critical", 1, "AI Threat Hunter", 1, "T1486 - Data Encrypted for Impact", now, now),
            (str(uuid.uuid4()), "DDoS Syn-Flood Detection Rule", "syn_packets_per_sec > 10000 AND ack_ratio < 0.05", "RATE_LIMIT_AND_BLOCK_CIDR", "Network", "Critical", 3, "Network Admin", 1, "T1498 - Network Denial of Service", now, now),
            (str(uuid.uuid4()), "Port Scan Reconnaissance Rule", "distinct_ports_contacted > 20 within 10s", "INCREASE_MONITORING_AND_FLAG", "Reconnaissance", "Medium", 1, "SecOps Team", 1, "T1046 - Network Service Discovery", now, now),
            (str(uuid.uuid4()), "DNS Tunneling Exfiltration Rule", "dns_query_length > 120 AND entropy > 4.5", "SINKHOLE_DNS_AND_ISOLATE", "Exfiltration", "High", 1, "AI Research Lab", 1, "T1071.004 - DNS Application Layer Protocol", now, now),
            (str(uuid.uuid4()), "Unauthorized Device Access Rule", "mac_vendor == UNKNOWN AND vlan == SECURE_CORE", "QUARANTINE_PORT", "Access Control", "High", 1, "Infra Sec", 1, "T1200 - Hardware Additions", now, now)
        ]
        cursor.executemany("INSERT INTO rules VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", rules)

    # Pre-seed System Settings (FR-050)
    cursor.execute("SELECT COUNT(*) FROM system_settings")
    if cursor.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        settings = [
            ("detection_sensitivity", "High", now),
            ("auto_mitigation_enabled", "true", now),
            ("threat_correlation_window", "300", now),
            ("csp_optimization_mode", "Strict", now),
            ("game_theory_depth", "3", now),
            ("dashboard_refresh_interval_ms", "1500", now),
            ("alert_channels", json.dumps(["dashboard", "email_sim", "slack_sim"]), now)
        ]
        cursor.executemany("INSERT INTO system_settings VALUES (?, ?, ?)", settings)

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
