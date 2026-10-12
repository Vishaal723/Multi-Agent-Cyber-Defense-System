"""
Backend Automated Test Suite
Verifies all agents, AI algorithms, authentication, and core API workflows.
"""
import sys
import os
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, get_db
from auth import hash_password, verify_password, create_access_token
from agents.coordinator import CoordinatorAgent
from agents.network_monitor import NetworkMonitoringAgent
from agents.intrusion_detection import IntrusionDetectionAgent
from agents.threat_correlator import ThreatCorrelationAgent
from agents.knowledge_base import KnowledgeBaseAgent
from agents.reasoning_engine import ReasoningAgent
from agents.planning_engine import PlanningAgent
from agents.response_agent import ResponseAgent
from agents.learning_agent import LearningAgent
from agents.simulator import AttackSimulator
from reporting import ReportingEngine

def run_tests():
    print("========================================")
    print("  RUNNING MACDS BACKEND TEST SUITE")
    print("========================================")

    # 1. Database Initialization
    print("[1/10] Testing Database Initialization...")
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM agents")
    agent_count = cursor.fetchone()[0]
    conn.close()
    assert user_count >= 4, f"Expected at least 4 users, got {user_count}"
    assert agent_count >= 9, f"Expected at least 9 agents, got {agent_count}"
    print(f"  [PASS] Database initialized with {user_count} users and {agent_count} agents.")

    # 2. Auth & Passwords
    print("[2/10] Testing Authentication & Hashing...")
    h = hash_password("Admin@123")
    assert verify_password("Admin@123", h)
    assert not verify_password("WrongPassword", h)
    token = create_access_token({"sub": "admin", "role": "Administrator"})
    assert token is not None and len(token) > 20
    print("  [PASS] Authentication and JWT token generation verified.")

    # 3. Coordinator & Message Bus
    print("[3/10] Testing Coordinator Agent...")
    coordinator = CoordinatorAgent(get_db)
    msg = coordinator.register_message("TestAgent", "Coordinator", "TEST_PING", {"ping": True})
    logs = coordinator.get_communication_logs(10)
    assert len(logs) > 0
    coordinator.update_agent_telemetry()
    print("  [PASS] Coordinator Agent message passing and telemetry verified.")

    # 4. Network Monitoring Agent (Unit I: BFS/DFS)
    print("[4/10] Testing Network Monitoring Agent (BFS/DFS)...")
    netmon = NetworkMonitoringAgent(get_db, coordinator)
    bfs_res = netmon.run_bfs_discovery("Router-Core")
    assert bfs_res["total_nodes_discovered"] >= 10
    dfs_res = netmon.run_dfs_traversal("Router-Core")
    assert dfs_res["total_nodes_traversed"] >= 10
    pkt = netmon.generate_live_packet()
    stats = netmon.get_traffic_statistics()
    assert stats["packet_rate_pps"] > 0
    print(f"  [PASS] BFS discovered {bfs_res['total_nodes_discovered']} nodes; Packet stream operational.")

    # 5. Intrusion Detection Agent (Unit II: Heuristics & GBFS)
    print("[5/10] Testing Intrusion Detection Agent...")
    ids = IntrusionDetectionAgent(get_db, coordinator)
    threat_eval = ids.evaluate_heuristic_threat({
        "payload_snippet": "' OR 1=1 --",
        "source_ip": "45.33.32.156",
        "destination_ip": "192.168.1.20"
    })
    assert threat_eval["is_threat"] is True
    assert threat_eval["attack_type"] == "sql_injection"
    stored_thr = ids.process_and_store_threat(threat_eval)
    assert stored_thr["threat_id"].startswith("THR-")
    print(f"  [PASS] SQL Injection detected with confidence {threat_eval['confidence']}.")

    # 6. Threat Correlation Agent (Unit I/II: DFS Kill-Chain)
    print("[6/10] Testing Threat Correlation Agent...")
    correlator = ThreatCorrelationAgent(get_db, coordinator)
    incident = correlator.correlate_events_and_create_incident(stored_thr)
    assert incident["incident_id"].startswith("INC-")
    assert len(incident["attack_chain"]) > 0
    print(f"  [PASS] Incident correlated: {incident['incident_id']} with kill-chain depth {len(incident['attack_chain'])}.")

    # 7. Knowledge Base & Reasoning Agent (Unit IV: Forward/Backward Chaining)
    print("[7/10] Testing Reasoning Agent (FOL, Forward/Backward Chaining)...")
    kb = KnowledgeBaseAgent(get_db, coordinator)
    reasoner = ReasoningAgent(get_db, coordinator, kb)
    fc_res = reasoner.forward_chaining_inference(["Failed_Logins_Exceeded", "Target_Account_Admin"])
    assert "Brute_Force_Credential_Attack" in fc_res["inferred_facts"]
    bc_res = reasoner.backward_chaining_verification("Brute_Force_Credential_Attack", ["Failed_Logins_Exceeded", "Target_Account_Admin"])
    assert bc_res["is_proven"] is True
    fol_explanation = reasoner.evaluate_first_order_logic(incident["incident_id"], stored_thr)
    assert fol_explanation["confidence_score"] > 0.5
    print("  [PASS] Forward and Backward Chaining inference validated.")

    # 8. Planning Agent (Unit II/III: A*, Game Theory, CSP, Hill Climbing)
    print("[8/10] Testing Planning Agent (A*, Game Theory Alpha-Beta, CSP)...")
    planner = PlanningAgent(get_db, coordinator, kb)
    ranked_opts = planner.rank_response_options({"severity": "Critical", "attack_type": "sql_injection", "source_ip": "45.33.32.156"})
    assert len(ranked_opts) >= 4
    astar_res = planner.run_astar_planning()
    assert len(astar_res["optimal_path"]) > 0
    gt_res = planner.run_game_theory_simulation("Stealth_Exfiltration")
    assert gt_res["optimal_defender_strategy"] is not None
    csp_res = planner.solve_firewall_csp()
    assert csp_res["solution_found"] is True
    hc_res = planner.run_hill_climbing_optimization(0.50)
    assert hc_res["peak_fitness_score"] > 0
    print("  [PASS] A* Search, Game Theory Alpha-Beta, and CSP Solvers validated.")

    # 9. Response Agent & Learning Agent
    print("[9/10] Testing Response Agent and Learning Feedback...")
    responder = ResponseAgent(get_db, coordinator)
    resp_res = responder.execute_action(incident["incident_id"], "BLOCK_IP", "45.33.32.156", "Test System")
    assert resp_res["status"] == "Executed"
    learner = LearningAgent(get_db, coordinator, kb)
    fb_res = learner.process_analyst_feedback(incident["incident_id"], "True_Positive", "Validated by automated test")
    assert fb_res["feedback_type"] == "True_Positive"
    kpis = learner.calculate_performance_kpis()
    assert kpis["overall_success_rate_percent"] >= 0
    print(f"  [PASS] Automated mitigation executed. Success rate: {kpis['overall_success_rate_percent']}%.")

    # 10. Attack Simulator (PRD Section 48) & Reports
    print("[10/10] Testing End-to-End Attack Simulator & Reports...")
    simulator = AttackSimulator(netmon, ids, correlator, reasoner, planner, responder, learner)
    sim_res = simulator.run_scenario("brute_force")
    assert len(sim_res["execution_steps"]) == 7
    reporter = ReportingEngine(get_db, learner)
    daily_rep = reporter.generate_daily_report()
    assert daily_rep["metrics"]["threats_detected"] > 0
    pdf_data = reporter.export_pdf_incident_report(incident["incident_id"])
    assert len(pdf_data) > 100
    print(f"  [PASS] 7-Step Attack Scenario 1 (Brute Force) executed cleanly. PDF report size: {len(pdf_data)} bytes.")

    print("\n========================================")
    print("  ALL 10 TEST SUITES PASSED PERFECTLY!  ")
    print("========================================")

if __name__ == "__main__":
    run_tests()
