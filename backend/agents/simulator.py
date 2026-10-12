"""Run deterministic synthetic attack scenarios through the agent pipeline."""
from datetime import datetime, timezone
from typing import Dict, Any, Optional


class InvalidSimulationRequest(ValueError):
    """Raised for invalid simulator inputs before any agent writes data."""


class AttackSimulator:
    INTENSITY_COUNTS = {"Low": 1, "Medium": 5, "High": 15}
    SCENARIOS = {
        "brute_force": {
            "attack_type": "brute_force",
            "title": "Scenario 1: Brute Force Credential Attack",
            "source_ip": "45.33.32.156",
            "target_ip": "192.168.1.10",
            "payload": "failed_login: synthetic repeated authentication failures for admin",
            "activity_unit": "authentication failures",
            "port": 22,
        },
        "ransomware": {
            "attack_type": "ransomware",
            "title": "Scenario 2: Ransomware Lateral Outbreak",
            "source_ip": "185.220.101.5",
            "target_ip": "192.168.1.112",
            "payload": "powershell -enc synthetic-c2-beacon-indicator",
            "activity_unit": "synthetic file-change events",
            "port": 443,
        },
        "sql_injection": {
            "attack_type": "sql_injection",
            "title": "Scenario 3: SQL Injection & Data Exfiltration",
            "source_ip": "103.251.167.22",
            "target_ip": "192.168.1.20",
            "payload": "GET /api/products?id=1' UNION SELECT synthetic_test_value--",
            "activity_unit": "synthetic HTTP requests",
            "port": 80,
        },
        "ddos": {
            "attack_type": "ddos",
            "title": "Scenario 4: Volumetric SYN-Flood DDoS",
            "source_ip": "198.51.100.0/24",
            "target_ip": "192.168.1.1",
            "payload": "syn_overload: synthetic SYN-flood indicator",
            "activity_unit": "synthetic SYN packets",
            "port": 443,
        },
        "dns_tunneling": {
            "attack_type": "dns_tunneling",
            "title": "Scenario 5: Covert DNS Tunneling & C2",
            "source_ip": "192.168.1.244",
            "target_ip": "8.8.8.8",
            "payload": "base64_dns_payload: synthetic-label.example.invalid",
            "activity_unit": "synthetic DNS queries",
            "port": 53,
        },
        "port_scan": {
            "attack_type": "port_scan",
            "title": "Scenario 6: Reconnaissance & Port Scanning",
            "source_ip": "192.168.1.244",
            "target_ip": "192.168.1.15",
            "payload": "nmap_scan: synthetic port-scan indicator",
            "activity_unit": "synthetic port probes",
            "port": 443,
        },
    }
    SCENARIO_ALIASES = {
        alias: key
        for key, aliases in {
            "brute_force": ("brute_force", "scenario_1", "scenario 1"),
            "ransomware": ("ransomware", "malware", "scenario_2", "scenario 2"),
            "sql_injection": ("sql_injection", "sqli", "scenario_3", "scenario 3"),
            "ddos": ("ddos", "syn_flood", "scenario_4", "scenario 4"),
            "dns_tunneling": ("dns_tunneling", "c2", "scenario_5", "scenario 5"),
            "port_scan": ("port_scan", "scenario_6", "scenario 6"),
        }.items()
        for alias in aliases
    }

    def __init__(self, net_monitor, ids_agent, correlator, reasoner, planner, responder, learner):
        self.net_monitor = net_monitor
        self.ids_agent = ids_agent
        self.correlator = correlator
        self.reasoner = reasoner
        self.planner = planner
        self.responder = responder
        self.learner = learner

    def run_scenario(self, scenario_type: str, custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Runs a synthetic scenario and returns its completed seven-stage agent trace.
        """
        custom_params = custom_params or {}
        if not isinstance(scenario_type, str) or not scenario_type.strip():
            raise InvalidSimulationRequest("scenario must be one of the supported simulation scenarios")
        scenario_key = scenario_type.strip().lower()
        scenario_name = self.SCENARIO_ALIASES.get(scenario_key)
        if scenario_name is None:
            supported = ", ".join(sorted(self.SCENARIOS))
            raise InvalidSimulationRequest(f"Unsupported simulation scenario '{scenario_type}'. Supported scenarios: {supported}")
        scenario = self.SCENARIOS[scenario_name]

        intensity = custom_params.get("intensity") or "High"
        if intensity not in self.INTENSITY_COUNTS:
            raise InvalidSimulationRequest("intensity must be one of: Low, Medium, High")
        custom_payload = custom_params.get("custom_payload", custom_params.get("payload"))
        if custom_payload is not None and not isinstance(custom_payload, str):
            raise InvalidSimulationRequest("custom_payload must be a string")
        if custom_payload is not None and len(custom_payload) > 2048:
            raise InvalidSimulationRequest("custom_payload must be 2048 characters or fewer")
        if custom_payload is not None and any(
            (ord(char) < 32 and char not in "\t\r\n") or 0xD800 <= ord(char) <= 0xDFFF
            for char in custom_payload
        ):
            raise InvalidSimulationRequest("custom_payload contains unsupported control characters")

        custom_payload = custom_payload.strip() if custom_payload else ""
        payload_source = "custom" if custom_payload else "scenario default"
        payload_sample = custom_payload or scenario["payload"]
        activity_count = self.INTENSITY_COUNTS[intensity]
        evidence_suffix = f" [Synthetic evidence: {activity_count} {scenario['activity_unit']} at {intensity} intensity]"
        evidence_payload = payload_sample + evidence_suffix
        src_ip = custom_params.get("source_ip") or scenario["source_ip"]
        dst_ip = custom_params.get("target_ip") or scenario["target_ip"]
        attack_type = scenario["attack_type"]
        now = datetime.now(timezone.utc).isoformat()
        exec_trace = []

        # Step 1: Ingress Observation (Perception Layer)
        raw_packet = self.net_monitor.generate_live_packet({
            "source_ip": src_ip,
            "destination_ip": dst_ip,
            "protocol": "DNS" if attack_type == "dns_tunneling" else "TCP",
            "port": scenario["port"],
            "payload_snippet": evidence_payload,
            "flag": "MALICIOUS",
            "is_suspicious": True,
        })
        raw_packet["simulation_evidence"] = {
            "intensity": intensity,
            "activity_count": activity_count,
            "activity_unit": scenario["activity_unit"],
            "payload_source": payload_source,
        }
        exec_trace.append({
            "step": 1,
            "agent": "Network Monitoring Agent",
            "phase": "Synthetic Event Input",
            "details": f"Generated synthetic suspicious network evidence from {src_ip} targeting {dst_ip}",
            "data": raw_packet
        })

        # Step 2: Intrusion Detection & Heuristic Scoring (Unit II)
        eval_result = self.ids_agent.evaluate_heuristic_threat({
            "payload_snippet": evidence_payload,
            "source_ip": src_ip,
            "destination_ip": dst_ip,
            "protocol": "DNS" if attack_type == "dns_tunneling" else "TCP",
            "forced_attack_type": attack_type
        })
        stored_threat = self.ids_agent.process_and_store_threat(eval_result)
        exec_trace.append({
            "step": 2,
            "agent": "Intrusion Detection Agent",
            "phase": "IDS Heuristic Scoring",
            "details": f"Calculated threat score {eval_result['risk_level']}/10 (Confidence: {eval_result['confidence']}) - Classified as {eval_result['severity']}",
            "data": stored_threat
        })

        # Step 3: Correlation creates a scenario-specific incident narrative; it does not run DFS here.
        correlated_incident = self.correlator.correlate_events_and_create_incident(stored_threat)
        exec_trace.append({
            "step": 3,
            "agent": "Threat Correlation Agent",
            "phase": "Incident Correlation",
            "details": f"Created incident {correlated_incident['incident_id']} with {len(correlated_incident['attack_chain'])} linked entities",
            "data": correlated_incident
        })

        # Step 4: Logical Reasoning & Knowledge Deduction (Unit IV FOL)
        reasoning_explanation = self.reasoner.evaluate_first_order_logic(
            correlated_incident["incident_id"],
            stored_threat
        )
        exec_trace.append({
            "step": 4,
            "agent": "Reasoning Agent",
            "phase": "First-Order Logic & Forward Chaining",
            "details": f"Deduced {len(reasoning_explanation['inferred_conclusions'])} facts via FOL Horn clauses; Resolution verified.",
            "data": reasoning_explanation
        })

        # Step 5: Rank response options and evaluate a scenario-matched Game Theory move.
        ranked_plans = self.planner.rank_response_options({
            "severity": stored_threat["severity"],
            "attack_type": attack_type,
            "source_ip": src_ip,
            "target_ip": dst_ip
        })
        best_plan = ranked_plans[0]
        attacker_moves = {
            "brute_force": "Credential_Stuffing",
            "ransomware": "Ransomware_Outbreak",
            "ddos": "Volumetric_DDoS",
            "sql_injection": "Stealth_Exfiltration",
            "dns_tunneling": "Stealth_Exfiltration",
            "port_scan": "Stealth_Exfiltration",
        }
        game_theory_result = self.planner.run_game_theory_simulation(attacker_move=attacker_moves[attack_type])
        exec_trace.append({
            "step": 5,
            "agent": "Planning Agent",
            "phase": "Response Ranking and Game Theory Evaluation",
            "details": f"Selected optimal mitigation '{best_plan['action']}' (Utility: {best_plan['utility_score']})",
            "data": {
                "top_plan": best_plan,
                "all_options": ranked_plans,
                "game_theory": game_theory_result
            }
        })

        # Step 6: Defensive Action Execution (Actuator)
        response_result = self.responder.execute_action(
            incident_id=correlated_incident["incident_id"],
            action=best_plan["action"],
            target=best_plan["target"],
            executed_by="Response Agent (Autonomous Engine)",
            reason=f"Automated response for {scenario['title']}"
        )
        exec_trace.append({
            "step": 6,
            "agent": "Response Agent",
            "phase": "Simulated Response Action",
            "details": f"Recorded response action '{response_result['action']}' for {response_result['target']} (status: {response_result['status']}).",
            "data": response_result
        })

        # Step 7: Feedback Loop & Learning Agent KPI updates
        feedback_res = self.learner.process_analyst_feedback(
            incident_id=correlated_incident["incident_id"],
            feedback_type="True_Positive",
            notes=f"Synthetic scenario feedback recorded for {scenario['title']}"
        )
        kpis = self.learner.calculate_performance_kpis()
        exec_trace.append({
            "step": 7,
            "agent": "Learning Agent",
            "phase": "Continuous Learning & Optimization",
            "details": f"Recorded {feedback_res['feedback_type']} synthetic feedback and returned aggregate KPI values.",
            "data": {"feedback": feedback_res, "current_kpis": kpis}
        })

        return {
            "scenario_title": scenario["title"],
            "attack_type": attack_type,
            "source_ip": src_ip,
            "target_ip": dst_ip,
            "incident_id": correlated_incident["incident_id"],
            "threat_id": stored_threat["threat_id"],
            "execution_steps": exec_trace,
            "final_outcome": f"Simulation completed. Response action '{response_result['action']}' was recorded with status '{response_result['status']}'.",
            "intensity": intensity,
            "activity_count": activity_count,
            "activity_unit": scenario["activity_unit"],
            "payload_source": payload_source,
            "timestamp": now
        }
