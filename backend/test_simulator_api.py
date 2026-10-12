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
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


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
        request = Request(
            f"{cls.base_url}/api/simulation/run",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
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


if __name__ == "__main__":
    try:
        db_path = require_isolated_database()
    except RuntimeError as exc:
        print(f"ISOLATION ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
    print(f"Attack Simulator HTTP tests use isolated database: {db_path}")
    unittest.main(verbosity=2)
