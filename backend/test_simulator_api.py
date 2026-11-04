"""HTTP integration tests for the synthetic Attack Simulator endpoint.

Run with MACDS_DB_PATH set to a new file under the system temporary directory.
The test refuses to start the application if that isolation is not explicit.
"""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from jose import jwt


BACKEND_DIR = Path(__file__).resolve().parent
PRODUCTION_DB = (BACKEND_DIR / "data" / "macds.db").resolve()
SCENARIOS = {
    "brute_force": "brute_force",
    "ransomware": "ransomware",
    "sql_injection": "sql_injection",
    "ddos": "ddos",
    "dns_tunneling": "dns_tunneling",
    "port_scan": "port_scan",
}
SCENARIO_TITLES = {
    "brute_force": "Scenario 1: Brute Force Credential Attack",
    "ransomware": "Scenario 2: Ransomware Lateral Outbreak",
    "sql_injection": "Scenario 3: SQL Injection & Data Exfiltration",
    "ddos": "Scenario 4: Volumetric SYN-Flood DDoS",
    "dns_tunneling": "Scenario 5: Covert DNS Tunneling & C2",
    "port_scan": "Scenario 6: Reconnaissance & Port Scanning",
}
GAME_THEORY_MOVES = {
    "brute_force": "Credential_Stuffing",
    "ransomware": "Ransomware_Outbreak",
    "sql_injection": "Stealth_Exfiltration",
    "ddos": "Volumetric_DDoS",
    "dns_tunneling": "Stealth_Exfiltration",
    "port_scan": "Stealth_Exfiltration",
}
RESPONSE_ACTIONS = {
    "brute_force": "BLOCK_IP_ADDRESS",
    "ransomware": "ISOLATE_ENDPOINT",
    "sql_injection": "BLOCK_IP_ADDRESS",
    "ddos": "BLOCK_IP_ADDRESS",
    "dns_tunneling": "BLOCK_IP_ADDRESS",
    "port_scan": "BLOCK_IP_ADDRESS",
}


def require_isolated_database():
    configured = os.environ.get("MACDS_DB_PATH")
    if not configured:
        raise RuntimeError("Set MACDS_DB_PATH to a new temporary SQLite file before running this test.")
    database_path = Path(configured).resolve()
    temporary_root = Path(__import__("tempfile").gettempdir()).resolve()
    if database_path == PRODUCTION_DB:
        raise RuntimeError("Refusing to run simulator tests against backend/data/macds.db.")
    try:
        database_path.relative_to(temporary_root)
    except ValueError as exc:
        raise RuntimeError("MACDS_DB_PATH must be inside the system temporary directory.") from exc
    return database_path


class AttackSimulatorHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.database_path = require_isolated_database()
        cls.server_log = tempfile.TemporaryFile(mode="w+t", encoding="utf-8")
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            cls.port = probe.getsockname()[1]
        cls.base_url = f"http://127.0.0.1:{cls.port}"
        env = os.environ.copy()
        env["MACDS_DB_PATH"] = str(cls.database_path)
        env["JWT_SECRET_KEY"] = "integration-test-only-secret-key-do-not-use-outside-tests"
        env["MACDS_DEMO_MODE"] = "true"
        env["MACDS_ENV"] = "test"
        env["MACDS_ALLOWED_ORIGINS"] = "http://localhost:5174,http://127.0.0.1:5174"
        cls.server = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(cls.port), "--log-level", "error"],
            cwd=BACKEND_DIR,
            env=env,
            stdout=cls.server_log,
            stderr=cls.server_log,
        )
        deadline = time.monotonic() + 25
        while time.monotonic() < deadline:
            if cls.server.poll() is not None:
                raise RuntimeError(f"Uvicorn exited during startup with code {cls.server.returncode}.")
            try:
                with urlopen(f"{cls.base_url}/openapi.json", timeout=1) as response:
                    if response.status == 200:
                        break
            except (OSError, URLError):
                time.sleep(0.2)
        else:
            cls.server.terminate()
            cls.server.wait(timeout=5)
            cls.server_log.seek(0)
            raise RuntimeError("Uvicorn did not become ready within 25 seconds. " + cls.server_log.read())
        cls.admin_token = cls.login_admin()

    @classmethod
    def tearDownClass(cls):
        if getattr(cls, "server", None) and cls.server.poll() is None:
            cls.server.terminate()
            try:
                cls.server.wait(timeout=8)
            except subprocess.TimeoutExpired:
                cls.server.kill()
                cls.server.wait(timeout=5)
        if getattr(cls, "server_log", None):
            cls.server_log.seek(0)
            server_output = cls.server_log.read()
            if server_output.strip():
                print("\nFastAPI server log:\n" + server_output, file=sys.stderr)
            cls.server_log.close()

    @classmethod
    def request_json(cls, payload):
        token = getattr(cls, "admin_token", None)
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = Request(
            f"{cls.base_url}/api/simulation/run",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            response = urlopen(request, timeout=20)
        except HTTPError as exc:
            status = exc.code
            body = exc.read().decode("utf-8", errors="replace")
            exc.close()
            try:
                return status, json.loads(body)
            except json.JSONDecodeError:
                return status, {"raw_response": body}
        with response:
            return response.status, json.loads(response.read().decode("utf-8"))

    @classmethod
    def request_api(cls, path, payload=None, method="GET", token="__default__", extra_headers=None):
        headers = {"Content-Type": "application/json"}
        if token == "__default__":
            token = getattr(cls, "admin_token", None)
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if extra_headers:
            headers.update(extra_headers)
        request = Request(
            f"{cls.base_url}{path}",
            data=json.dumps(payload).encode("utf-8") if payload is not None else None,
            headers=headers,
            method=method,
        )
        try:
            response = urlopen(request, timeout=20)
        except HTTPError as exc:
            status = exc.code
            body = exc.read().decode("utf-8", errors="replace")
            exc.close()
            try:
                return status, json.loads(body)
            except json.JSONDecodeError:
                return status, {"raw_response": body}
        with response:
            return response.status, json.loads(response.read().decode("utf-8"))

    @classmethod
    def login_admin(cls):
        status, body = cls.request_api("/api/auth/login", {"username": "admin", "password": "Admin@123"}, "POST")
        if status != 200:
            raise AssertionError(f"Isolated database admin login failed: {status} {body}")
        return body["access_token"]

    def database_counts(self):
        import sqlite3

        conn = sqlite3.connect(self.database_path)
        try:
            return {
                table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                for table in ("threats", "incidents", "responses", "learning_metrics")
            }
        finally:
            conn.close()

    def assert_completed_trace(self, result, expected_attack):
        for field in ("scenario_title", "attack_type", "incident_id", "execution_steps", "final_outcome", "timestamp"):
            self.assertIn(field, result)
        self.assertEqual(expected_attack, result["attack_type"])
        self.assertEqual([1, 2, 3, 4, 5, 6, 7], [step["step"] for step in result["execution_steps"]])
        self.assertEqual("Executed", result["execution_steps"][5]["data"]["status"])
        self.assertEqual("True_Positive", result["execution_steps"][6]["data"]["feedback"]["feedback_type"])
        self.assertIn("recorded", result["final_outcome"].lower())

    def assert_persisted_links(self, result, expected_attack, expected_action):
        import sqlite3

        conn = sqlite3.connect(self.database_path)
        try:
            threat = conn.execute(
                "SELECT attack_type, payload_sample FROM threats WHERE threat_id = ?",
                (result["threat_id"],),
            ).fetchone()
            incident = conn.execute(
                "SELECT threat_id, status FROM incidents WHERE incident_id = ?",
                (result["incident_id"],),
            ).fetchone()
            response = conn.execute(
                "SELECT action, status FROM responses WHERE incident_id = ?",
                (result["incident_id"],),
            ).fetchone()
            feedback = conn.execute(
                "SELECT analyst_feedback FROM learning_metrics WHERE incident_id = ?",
                (result["incident_id"],),
            ).fetchone()
        finally:
            conn.close()

        self.assertEqual(expected_attack, threat[0])
        self.assertEqual(result["threat_id"], incident[0])
        self.assertEqual("Mitigated", incident[1])
        self.assertEqual((expected_action, "Executed"), response)
        self.assertEqual("True_Positive", feedback[0])

    def test_all_frontend_scenarios_and_persisted_records(self):
        before = self.database_counts()
        for scenario, expected_attack in SCENARIOS.items():
            with self.subTest(scenario=scenario):
                status, result = self.request_json({"scenario": scenario})
                self.assertEqual(200, status, result)
                self.assert_completed_trace(result, expected_attack)
                self.assertEqual(SCENARIO_TITLES[scenario], result["scenario_title"])
                self.assertEqual("Synthetic Event Input", result["execution_steps"][0]["phase"])
                self.assertEqual("Incident Correlation", result["execution_steps"][2]["phase"])
                self.assertEqual("Simulated Response Action", result["execution_steps"][5]["phase"])
                game_theory = result["execution_steps"][4]["data"]["game_theory"]
                self.assertEqual(GAME_THEORY_MOVES[scenario], game_theory["attacker_chosen_strategy"])
                response = result["execution_steps"][5]["data"]
                self.assertEqual(RESPONSE_ACTIONS[scenario], response["action"])
                self.assert_persisted_links(result, expected_attack, RESPONSE_ACTIONS[scenario])
                event = result["execution_steps"][0]["data"]["simulation_evidence"]
                self.assertEqual({"intensity": "High", "activity_count": 15}, {
                    "intensity": event["intensity"], "activity_count": event["activity_count"]
                })
                self.assertEqual("scenario default", event["payload_source"])
        after = self.database_counts()
        for table in ("threats", "incidents", "responses", "learning_metrics"):
            self.assertEqual(6, after[table] - before[table], f"Unexpected persisted {table} count")
        import sqlite3
        conn = sqlite3.connect(self.database_path)
        try:
            action_audits = conn.execute(
                "SELECT COUNT(*) FROM audit_logs WHERE event_type = 'DEFENSIVE_ACTION_EXECUTED'"
            ).fetchone()[0]
        finally:
            conn.close()
        self.assertEqual(6, action_audits)

    def test_intensity_changes_deterministic_synthetic_evidence(self):
        for intensity, expected_count in (("Low", 1), ("Medium", 5), ("High", 15)):
            with self.subTest(intensity=intensity):
                status, result = self.request_json({"scenario": "brute_force", "intensity": intensity})
                self.assertEqual(200, status, result)
                self.assertEqual(intensity, result["intensity"])
                self.assertEqual(expected_count, result["activity_count"])
                evidence = result["execution_steps"][0]["data"]["simulation_evidence"]
                self.assertEqual(expected_count, evidence["activity_count"])
                self.assertIn(f"{expected_count} authentication failures", result["execution_steps"][0]["data"]["payload_snippet"])

    def test_custom_payload_is_evidence_only_and_empty_uses_scenario_default(self):
        marker = "failed_login synthetic-custom-evidence-7f93"
        status, result = self.request_json({"scenario": "brute_force", "custom_payload": marker})
        self.assertEqual(200, status, result)
        self.assertEqual("custom", result["payload_source"])
        self.assertIn(marker, result["execution_steps"][0]["data"]["payload_snippet"])
        self.assertIn(marker, result["execution_steps"][1]["data"]["payload_snippet"])

        import sqlite3
        conn = sqlite3.connect(self.database_path)
        try:
            threat_payload = conn.execute("SELECT payload_sample FROM threats WHERE threat_id = ?", (result["threat_id"],)).fetchone()[0]
            incident_evidence = json.loads(conn.execute("SELECT evidence FROM incidents WHERE incident_id = ?", (result["incident_id"],)).fetchone()[0])
        finally:
            conn.close()
        self.assertIn(marker, threat_payload)
        self.assertTrue(any(marker in item for item in incident_evidence["indicators_of_compromise"]))

        status, empty_result = self.request_json({"scenario": "brute_force", "custom_payload": " \n\t "})
        self.assertEqual(200, status, empty_result)
        self.assertEqual("scenario default", empty_result["payload_source"])
        self.assertIn("failed_login", empty_result["execution_steps"][0]["data"]["payload_snippet"])

    def test_invalid_scenarios_and_payloads_return_422_without_writes(self):
        before = self.database_counts()
        invalid_requests = (
            {"scenario": "unknown_scenario"},
            {"scenario": " "},
            {"scenario": "brute_force", "intensity": "Extreme"},
            {"scenario": "brute_force", "custom_payload": "x" * 2049},
            {"scenario": "brute_force", "custom_payload": 42},
            {"scenario": "brute_force", "custom_payload": "bad\u0000payload"},
            {"scenario": "brute_force", "custom_payload": "bad\u0001payload"},
        )
        for payload in invalid_requests:
            with self.subTest(payload_keys=sorted(payload)):
                status, response = self.request_json(payload)
                self.assertEqual(422, status, response)
        after = self.database_counts()
        self.assertEqual(before, after, "Invalid requests must fail before simulator data writes")

    def test_existing_valid_request_shape_and_scenario_alias(self):
        status, result = self.request_json({"scenario": "scenario_1"})
        self.assertEqual(200, status, result)
        self.assert_completed_trace(result, "brute_force")
        self.assertEqual("High", result["intensity"])

    def test_investigation_reconstruction_constraints_plans_and_execution(self):
        token = self.login_admin()
        status, simulation = self.request_json({"scenario": "brute_force", "intensity": "Low"})
        self.assertEqual(200, status, simulation)
        incident_id = simulation["incident_id"]

        status, dashboard = self.request_api("/api/dashboard/stats")
        self.assertEqual(200, status, dashboard)
        import sqlite3
        conn = sqlite3.connect(self.database_path)
        try:
            expected_incidents = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
            expected_autonomous = conn.execute("SELECT COUNT(DISTINCT incident_id) FROM responses WHERE status = 'Executed' AND executed_by = 'Response Agent (Autonomous Engine)' AND incident_id IS NOT NULL").fetchone()[0]
        finally:
            conn.close()
        self.assertEqual(expected_incidents, dashboard["summary"]["total_incidents_count"])
        self.assertEqual(expected_autonomous, dashboard["summary"]["autonomous_response_incidents_count"])

        status, investigation = self.request_api(f"/api/investigations/{incident_id}")
        self.assertEqual(200, status, investigation)
        reconstruction = investigation["reconstruction"]
        self.assertEqual("inferred_route", reconstruction["status"])
        self.assertEqual(simulation["threat_id"], reconstruction["generated_events"][0]["event_id"])
        self.assertEqual(simulation["source_ip"], reconstruction["generated_events"][0]["source_ip"])
        self.assertEqual(simulation["target_ip"], reconstruction["generated_events"][0]["destination_ip"])
        self.assertIn("Auth-ActiveDirectory-Svr", [node["label"] for node in reconstruction["nodes"]])
        self.assertTrue(any(edge["inferred"] is False for edge in reconstruction["relationships"]))
        self.assertTrue(any(edge["inferred"] is True for edge in reconstruction["relationships"]))

        status, plans = self.request_api(f"/api/investigations/{incident_id}/plans", method="POST", token=token)
        self.assertEqual(200, status, plans)
        self.assertEqual(3, len(plans))
        self.assertEqual(3, len({plan["plan_key"] for plan in plans}))
        for plan in plans:
            inputs = plan["score_inputs"]
            expected = round(inputs["containment_scope_points"] - 0.25 * inputs["operational_impact_points"] - 0.10 * inputs["execution_complexity_points"], 2)
            self.assertEqual(expected, plan["containment_score"])
            self.assertIn("Heuristic points", plan["score_method"])

        auth_asset = next(asset for asset in investigation["assets"] if asset["ip_address"] == simulation["target_ip"])
        status, constrained = self.request_api(
            f"/api/investigations/{incident_id}/critical-asset",
            {"device_id": auth_asset["device_id"], "constraint_text": "Do not isolate or shut down this business-critical server."},
            "PUT", token,
        )
        self.assertEqual(200, status, constrained)
        status, refreshed_plans = self.request_api(f"/api/investigations/{incident_id}/plans", method="POST", token=token)
        self.assertEqual(200, status, refreshed_plans)
        blocked_plan = next(plan for plan in refreshed_plans if plan["plan_key"] == "isolate_target")
        self.assertFalse(blocked_plan["valid"])
        self.assertIn(auth_asset["hostname"], blocked_plan["validation"]["explanation"])
        self.assertIn("Do not isolate", blocked_plan["validation"]["explanation"])

        conn = sqlite3.connect(self.database_path)
        try:
            before_responses = conn.execute("SELECT COUNT(*) FROM responses WHERE incident_id = ?", (incident_id,)).fetchone()[0]
        finally:
            conn.close()
        status, direct_response = self.request_api(
            f"/api/incidents/{incident_id}/respond",
            {"action": "ISOLATE_ENDPOINT", "target": simulation["target_ip"], "reason": "direct API bypass attempt"},
            "POST", token,
        )
        self.assertEqual(409, status, direct_response)
        self.assertIn(auth_asset["hostname"], direct_response["detail"])
        status, direct_alias = self.request_api(
            f"/api/incidents/{incident_id}/respond",
            {"action": "ISOLATE_ENDPOINT_IMMEDIATELY", "target": simulation["target_ip"], "reason": "constraint bypass alias attempt"},
            "POST", token,
        )
        self.assertEqual(409, status, direct_alias)
        self.assertIn(auth_asset["hostname"], direct_alias["detail"])
        status, rejected = self.request_api(
            f"/api/investigations/{incident_id}/execute", {"plan_id": blocked_plan["plan_id"], "containment_score": 100000, "valid": True}, "POST", token
        )
        self.assertEqual(409, status, rejected)
        self.assertIn("Active constraint", rejected["detail"])

        status, refreshed = self.request_api(f"/api/investigations/{incident_id}")
        self.assertEqual(200, status, refreshed)
        valid_plan = next(plan for plan in refreshed["plans"] if plan["plan_key"] == "notify_analyst")
        status, execution = self.request_api(
            f"/api/investigations/{incident_id}/execute", {"plan_id": valid_plan["plan_id"]}, "POST", token
        )
        self.assertEqual(200, status, execution)
        self.assertEqual("Executed", execution["status"])
        self.assertTrue(execution["simulation_only"])
        self.assertEqual(valid_plan["plan_id"], execution["workflow_plan_id"])

        conn = sqlite3.connect(self.database_path)
        try:
            after_responses = conn.execute("SELECT COUNT(*) FROM responses WHERE incident_id = ?", (incident_id,)).fetchone()[0]
            execution_statuses = [row[0] for row in conn.execute("SELECT status FROM simulated_executions WHERE incident_id = ? ORDER BY created_at", (incident_id,)).fetchall()]
            audit_types = {row[0] for row in conn.execute("SELECT event_type FROM audit_logs WHERE details LIKE ? OR description LIKE ?", (f"%{incident_id}%", f"%{incident_id}%")).fetchall()}
        finally:
            conn.close()
        self.assertEqual(before_responses + 1, after_responses, "Rejected direct/plan actions must not create response success rows")
        self.assertIn("REJECTED", execution_statuses)
        self.assertIn("Executed", execution_statuses)
        self.assertIn("CRITICAL_ASSET_CONSTRAINT_SET", audit_types)
        self.assertIn("RESPONSE_PLAN_REJECTED", audit_types)
        self.assertIn("DEFENSIVE_ACTION_EXECUTED", audit_types)

    def test_incomplete_evidence_and_additive_migration_preserve_records(self):
        import sqlite3
        import uuid
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).isoformat()
        incident_id = f"INC-EMPTY-{uuid.uuid4().hex[:8]}"
        conn = sqlite3.connect(self.database_path)
        try:
            conn.execute("INSERT INTO incidents (incident_id, title, threat_id, status, severity, assigned_to, attack_chain, timeline, evidence, decision_explanation, recommended_action, created_at, updated_at) VALUES (?, ?, NULL, 'Investigating', 'Low', NULL, '[]', '[]', '{}', '{}', NULL, ?, ?)", (incident_id, "Evidence gap verification", now, now))
            conn.execute("INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)", ("phase5_migration_sentinel", "preserve-me", now))
            conn.commit()
        finally:
            conn.close()
        status, investigation = self.request_api(f"/api/investigations/{incident_id}")
        self.assertEqual(200, status, investigation)
        self.assertEqual("incomplete", investigation["reconstruction"]["status"])
        self.assertEqual([], investigation["reconstruction"]["generated_events"])
        status, plan_error = self.request_api(
            f"/api/investigations/{incident_id}/plans", method="POST", token=self.login_admin()
        )
        self.assertEqual(422, status, plan_error)
        self.assertIn("no stored event", plan_error["detail"])

        env = os.environ.copy()
        env["MACDS_DB_PATH"] = str(self.database_path)
        subprocess.run([sys.executable, "-c", "from database import init_db; init_db()"], cwd=BACKEND_DIR, env=env, check=True)
        conn = sqlite3.connect(self.database_path)
        try:
            preserved = conn.execute("SELECT value FROM system_settings WHERE key = 'phase5_migration_sentinel'").fetchone()[0]
        finally:
            conn.close()
        self.assertEqual("preserve-me", preserved)

    def test_ai_lab_http_operations_and_backward_chaining_goals(self):
        operations = (
            ("/api/monitoring/topology/bfs", "GET", None, ("total_nodes_discovered", "traversal_steps")),
            ("/api/monitoring/topology/dfs", "GET", None, ("total_nodes_traversed", "traversal_steps")),
            ("/api/planning/astar", "GET", None, ("optimal_path", "optimal_total_cost")),
            ("/api/planning/hill-climbing", "GET", None, ("optimized_threshold", "optimization_steps")),
            ("/api/planning/csp-firewall", "GET", None, ("solution_found", "optimal_policy_assignment")),
            ("/api/planning/game-theory", "POST", {"attacker_action": "Stealth_Exfiltration"}, ("optimal_defender_strategy", "optimal_payoff")),
            ("/api/reasoning/forward-chaining", "POST", {"facts": ["Failed_Logins_Exceeded", "Target_Account_Admin"]}, ("inferred_facts", "fired_rules")),
        )
        for path, method, payload, required_fields in operations:
            with self.subTest(path=path):
                status, result = self.request_api(path, payload, method)
                self.assertEqual(200, status, result)
                for field in required_fields:
                    self.assertIn(field, result)

        goals = {
            "Ransomware_Lateral_Outbreak": ["Rapid_File_Modifications", "Encrypted_File_Extensions", "Suspicious_Process_Spawning"],
            "SQL_Injection_Exploit": ["HTTP_Post_Request", "SQL_Syntax_Payload"],
            "Brute_Force_Credential_Attack": ["Failed_Logins_Exceeded", "Target_Account_Admin"],
            "Volumetric_DDoS_Attack": ["SYN_Flood_Packets", "Bandwidth_Spike_Threshold"],
        }
        for goal, evidence in goals.items():
            with self.subTest(goal=goal):
                status, result = self.request_api("/api/reasoning/backward-chaining", {"goal": goal, "facts": evidence}, "POST")
                self.assertEqual(200, status, result)
                self.assertTrue(result["is_proven"], result)
                self.assertEqual(goal, result["hypothesis_goal"])
                self.assertIn("proof_tree", result)

    def test_security_auth_role_cors_and_validation(self):
        status, body = self.request_api("/api/dashboard/stats", token=False)
        self.assertEqual(401, status, body)
        for name, token in (
            ("malformed", "not-a-jwt"),
            ("expired", jwt.encode({"sub": "admin", "iss": "MACDS", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}, "integration-test-only-secret-key-do-not-use-outside-tests", algorithm="HS256")),
            ("bad signature", jwt.encode({"sub": "admin", "iss": "MACDS", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, "different-test-secret-key-do-not-use", algorithm="HS256")),
        ):
            with self.subTest(token=name):
                status, body = self.request_api("/api/dashboard/stats", token=token)
                self.assertEqual(401, status, body)

        status, body = self.request_api("/api/auth/users", token=self.login_identity("analyst", "Analyst@123"))
        self.assertEqual(403, status, body)
        status, body = self.request_api("/api/logs/audit", token=self.login_identity("analyst", "Analyst@123"))
        self.assertEqual(403, status, body)
        auditor_token = self.login_identity("auditor", "Auditor@123")
        status, logs = self.request_api("/api/logs/audit", token=auditor_token)
        self.assertEqual(200, status, logs)
        self.assertIsInstance(logs, list)
        status, body = self.request_api("/api/reports/export/csv", token=False)
        self.assertEqual(401, status, body)

        netadmin_token = self.login_identity("netadmin", "NetAdmin@123")
        status, body = self.request_api("/api/simulation/run", {"scenario": "brute_force"}, "POST", netadmin_token)
        self.assertEqual(403, status, body)
        status, body = self.request_api("/api/threats?limit=10000")
        self.assertEqual(422, status, body)
        status, body = self.request_api("/api/auth/users", {"username": "weak", "password": "short", "email": "a@b.test", "role": "Root"}, "POST")
        self.assertEqual(422, status, body)

        def cors_origin(origin):
            request = Request(f"{self.base_url}/api/dashboard/stats", headers={"Authorization": f"Bearer {self.admin_token}", "Origin": origin})
            try:
                with urlopen(request, timeout=10) as response:
                    return response.headers.get("Access-Control-Allow-Origin")
            except HTTPError as exc:
                return exc.headers.get("Access-Control-Allow-Origin")
        self.assertEqual("http://localhost:5174", cors_origin("http://localhost:5174"))
        self.assertIsNone(cors_origin("http://untrusted.example"))

    @classmethod
    def login_identity(cls, username, password):
        status, body = cls.request_api("/api/auth/login", {"username": username, "password": password}, "POST", token=False)
        if status != 200:
            raise AssertionError(f"Test account login failed: {status} {body}")
        return body["access_token"]

    def test_cookie_websocket_request_limits_and_legacy_password_rehash(self):
        # The regular login response also establishes an HttpOnly same-site session cookie.
        request = Request(
            f"{self.base_url}/api/auth/login",
            data=json.dumps({"username": "admin", "password": "Admin@123"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urlopen(request, timeout=10) as response:
            cookie = response.headers.get("Set-Cookie", "")
        self.assertIn("HttpOnly", cookie)
        self.assertIn("samesite=strict", cookie.lower())

        status, _ = self.request_api("/api/auth/me", token=False, extra_headers={"Cookie": cookie.split(";", 1)[0]})
        self.assertEqual(200, status)

        def handshake(origin, cookie_header=None):
            import base64
            import os as _os
            with socket.create_connection(("127.0.0.1", self.port), timeout=5) as sock:
                headers = [
                    "GET /ws/live HTTP/1.1", f"Host: 127.0.0.1:{self.port}",
                    "Upgrade: websocket", "Connection: Upgrade", "Sec-WebSocket-Version: 13",
                    f"Sec-WebSocket-Key: {base64.b64encode(_os.urandom(16)).decode()}", f"Origin: {origin}",
                ]
                if cookie_header:
                    headers.append(f"Cookie: {cookie_header}")
                sock.sendall(("\r\n".join(headers) + "\r\n\r\n").encode("ascii"))
                return sock.recv(1024).split(b"\r\n", 1)[0]

        self.assertIn(b"101", handshake("http://localhost:5174", cookie.split(";", 1)[0]))
        self.assertIn(b"403", handshake("http://localhost:5174"))
        self.assertIn(b"403", handshake("http://untrusted.example", cookie.split(";", 1)[0]))

        oversized = b"{" + b" " * 1_048_576 + b"}"
        request = Request(f"{self.base_url}/api/simulation/run", data=oversized, headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.admin_token}"}, method="POST")
        with self.assertRaises(HTTPError) as raised:
            urlopen(request, timeout=10)
        self.assertEqual(413, raised.exception.code)

        import hashlib
        import sqlite3
        from datetime import timezone
        from uuid import uuid4
        legacy_username = "legacy_security_test"
        conn = sqlite3.connect(self.database_path)
        try:
            conn.execute("INSERT INTO users (user_id, username, password_hash, email, role, created_at) VALUES (?, ?, ?, ?, ?, ?)", (str(uuid4()), legacy_username, hashlib.sha256(b"Legacy-password-123").hexdigest(), "legacy@test.local", "Security Analyst", datetime.now(timezone.utc).isoformat()))
            conn.commit()
        finally:
            conn.close()
        status, body = self.request_api("/api/auth/login", {"username": legacy_username, "password": "Legacy-password-123"}, "POST", token=False)
        self.assertEqual(200, status, body)
        conn = sqlite3.connect(self.database_path)
        try:
            new_hash = conn.execute("SELECT password_hash FROM users WHERE username = ?", (legacy_username,)).fetchone()[0]
        finally:
            conn.close()
        self.assertTrue(new_hash.startswith("$2"), new_hash)

    def test_unsafe_startup_configuration_is_rejected_before_database_init(self):
        for mode in ("missing-secret", "production-default-origins"):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as temp_dir:
                isolated_path = Path(temp_dir) / "must-not-be-created.db"
                env = os.environ.copy()
                env["MACDS_DB_PATH"] = str(isolated_path)
                env["MACDS_DEMO_MODE"] = "false"
                env.pop("JWT_SECRET_KEY", None)
                env.pop("MACDS_ALLOWED_ORIGINS", None)
                if mode == "production-default-origins":
                    env["JWT_SECRET_KEY"] = "test-only-secret-that-is-long-enough"
                    env["MACDS_ENV"] = "production"
                else:
                    env["MACDS_ENV"] = "test"
                result = subprocess.run(
                    [sys.executable, "-c", "import main"], cwd=BACKEND_DIR, env=env,
                    capture_output=True, text=True, timeout=25,
                )
                self.assertNotEqual(0, result.returncode)
                self.assertFalse(isolated_path.exists(), "Invalid configuration initialized the database before failing.")
                expected = "JWT_SECRET_KEY" if mode == "missing-secret" else "MACDS_ALLOWED_ORIGINS"
                self.assertIn(expected, result.stderr)


if __name__ == "__main__":
    try:
        db_path = require_isolated_database()
    except RuntimeError as exc:
        print(f"ISOLATION ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
    print(f"Attack Simulator HTTP tests use isolated database: {db_path}")
    unittest.main(verbosity=2)
