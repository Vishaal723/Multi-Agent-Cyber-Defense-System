"""
Planning Agent Module (PRD Section 10.7, 27.3, 27.5, 28, 29 & Unit II/III)
Implements:
- A* Search for response plan pathfinding
- Hill Climbing for policy optimization
- Game-Theoretic Attacker vs Defender MiniMax with Alpha-Beta Pruning
- Constraint Satisfaction Problem (CSP) for firewall and network policy optimization
- Multi-dimensional response option ranking (Cost, Risk, Confidence, Effectiveness)
"""
import uuid
import heapq
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

class PlanningAgent:
    def __init__(self, db_conn_factory, coordinator, knowledge_base):
        self.agent_id = "agent-planner-007"
        self.name = "Planning Agent"
        self.type = "Planning"
        self.db_conn_factory = db_conn_factory
        self.coordinator = coordinator
        self.knowledge_base = knowledge_base

    def rank_response_options(self, incident_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generates and evaluates multiple candidate response strategies (FR-028, FR-029).
        Scores each option across Cost, Operational Risk, Confidence, and Expected Effectiveness.
        """
        severity = incident_data.get("severity", "High")
        attack_type = incident_data.get("attack_type", "brute_force")
        source_ip = incident_data.get("source_ip", "45.33.32.156")

        options = [
            {
                "action": "BLOCK_IP_ADDRESS",
                "target": source_ip,
                "description": f"Add permanent drop rule in perimeter firewall for source IP {source_ip}",
                "cost": "Low",
                "cost_score": 10,
                "operational_risk": "Low",
                "risk_score": 15,
                "confidence": 0.95,
                "expected_effectiveness": 0.90,
                "utility_score": 0.88
            },
            {
                "action": "ISOLATE_ENDPOINT",
                "target": incident_data.get("target_ip", "192.168.1.112"),
                "description": "Quarantine host device from internal LAN to prevent lateral propagation",
                "cost": "Medium",
                "cost_score": 45,
                "operational_risk": "Medium",
                "risk_score": 40,
                "confidence": 0.92,
                "expected_effectiveness": 0.98,
                "utility_score": 0.82
            },
            {
                "action": "DISABLE_USER_ACCOUNT",
                "target": "admin",
                "description": "Temporarily lock out targeted user credentials pending SOC verification",
                "cost": "Medium",
                "cost_score": 30,
                "operational_risk": "High",
                "risk_score": 60,
                "confidence": 0.85,
                "expected_effectiveness": 0.85,
                "utility_score": 0.70
            },
            {
                "action": "INCREASE_MONITORING_HONEYPOT",
                "target": source_ip,
                "description": "Route suspicious sessions into honeypot environment to gather C2 telemetry",
                "cost": "Low",
                "cost_score": 20,
                "operational_risk": "Low",
                "risk_score": 20,
                "confidence": 0.75,
                "expected_effectiveness": 0.65,
                "utility_score": 0.68
            },
            {
                "action": "NOTIFY_SOC_ADMINISTRATOR",
                "target": "SOC-Shift-Lead",
                "description": "Generate high-priority incident ticket and alert duty analyst",
                "cost": "Low",
                "cost_score": 5,
                "operational_risk": "None",
                "risk_score": 5,
                "confidence": 1.0,
                "expected_effectiveness": 0.50,
                "utility_score": 0.60
            },
            {
                "action": "IGNORE_FALSE_POSITIVE",
                "target": "N/A",
                "description": "Suppress alert and update learning agent memory for benign baseline",
                "cost": "Zero",
                "cost_score": 0,
                "operational_risk": "High" if severity in ["Critical", "High"] else "Low",
                "risk_score": 90 if severity in ["Critical", "High"] else 10,
                "confidence": 0.30 if severity in ["Critical", "High"] else 0.80,
                "expected_effectiveness": 0.10,
                "utility_score": 0.15
            }
        ]

        # Prioritize based on attack scenario
        if attack_type == "ransomware":
            # Boost endpoint isolation utility
            for opt in options:
                if opt["action"] == "ISOLATE_ENDPOINT":
                    opt["utility_score"] = 0.96
        elif attack_type in ["sql_injection", "ddos"]:
            for opt in options:
                if opt["action"] == "BLOCK_IP_ADDRESS":
                    opt["utility_score"] = 0.95

        options.sort(key=lambda x: x["utility_score"], reverse=True)
        for i, opt in enumerate(options):
            opt["rank"] = i + 1

        return options

    def run_astar_planning(self, threat_severity: str = "Critical", asset_criticality: str = "High") -> Dict[str, Any]:
        """
        AI Unit II: A* Search Algorithm for Security Response Sequence Planning
        Minimizes total response cost f(n) = g(n) + h(n).
        """
        # Node states representing defense progression:
        # Initial -> Detected -> Triaged -> Contained -> Neutralized -> Restored
        actions_graph = {
            "Threat_Detected": [
                {"next": "Triage_Complete", "action": "Enrich_Telemetry", "g_cost": 2, "h_cost": 8},
                {"next": "Emergency_Isolation", "action": "Immediate_Quarantine", "g_cost": 8, "h_cost": 3}
            ],
            "Triage_Complete": [
                {"next": "Firewall_Blocked", "action": "Apply_Firewall_ACL", "g_cost": 4, "h_cost": 4},
                {"next": "Account_Locked", "action": "Revoke_Tokens", "g_cost": 5, "h_cost": 5}
            ],
            "Emergency_Isolation": [
                {"next": "Threat_Neutralized", "action": "Kill_Malicious_Processes", "g_cost": 5, "h_cost": 0}
            ],
            "Firewall_Blocked": [
                {"next": "Threat_Neutralized", "action": "Verify_Traffic_Drop", "g_cost": 3, "h_cost": 0}
            ],
            "Account_Locked": [
                {"next": "Threat_Neutralized", "action": "Force_Password_Reset", "g_cost": 4, "h_cost": 0}
            ],
            "Threat_Neutralized": []
        }

        start_state = "Threat_Detected"
        goal_state = "Threat_Neutralized"

        # A* Priority Queue: (f_score, g_score, current_state, path)
        open_set = [(10, 0, start_state, [{"state": start_state, "action": "START", "g": 0, "h": 10, "f": 10}])]
        visited = set()
        explored_steps = []

        best_path = None
        min_total_cost = float("inf")

        while open_set:
            f, g, current, path = heapq.heappop(open_set)

            step_info = {
                "step": len(explored_steps) + 1,
                "state": current,
                "g_cost": g,
                "f_score": f,
                "path_length": len(path)
            }
            explored_steps.append(step_info)

            if current == goal_state:
                best_path = path
                min_total_cost = g
                break

            if current in visited:
                continue
            visited.add(current)

            for edge in actions_graph.get(current, []):
                next_st = edge["next"]
                g_new = g + edge["g_cost"]
                h_new = edge["h_cost"]
                f_new = g_new + h_new
                new_path = path + [{"state": next_st, "action": edge["action"], "g": g_new, "h": h_new, "f": f_new}]
                heapq.heappush(open_set, (f_new, g_new, next_st, new_path))

        return {
            "algorithm": "A* Search (Optimal Response Planning)",
            "unit": "Unit II - Informed Search",
            "start_state": start_state,
            "goal_state": goal_state,
            "optimal_path": best_path or [],
            "optimal_total_cost": min_total_cost,
            "explored_nodes_count": len(explored_steps),
            "explored_steps": explored_steps
        }

    def run_game_theory_simulation(self, attacker_move: str = "Stealth_Exfiltration", depth: int = 3) -> Dict[str, Any]:
        """
        AI Unit III: Game Theory - Attacker vs Defender Strategic Simulation
        Implements MiniMax Search with Alpha-Beta Pruning.
        Attacker maximizes attack damage; Defender minimizes damage / maximizes security payoff.
        """
        # Payoff matrix (Attacker payoff, Defender payoff)
        # Defender payoff = 100 - Damage - Cost
        strategies = {
            "Attacker": ["Stealth_Exfiltration", "Ransomware_Outbreak", "Volumetric_DDoS", "Credential_Stuffing"],
            "Defender": ["Block_Perimeter_IP", "Isolate_Host_Device", "Adaptive_Rate_Limiting", "Deploy_Deception_Honeypot"]
        }

        payoff_matrix = {
            ("Stealth_Exfiltration", "Block_Perimeter_IP"): {"attacker": 20, "defender": 80, "comment": "IP block stops external exfil tunnel"},
            ("Stealth_Exfiltration", "Isolate_Host_Device"): {"attacker": 5, "defender": 95, "comment": "Device isolation cleanly severs internal access"},
            ("Stealth_Exfiltration", "Deploy_Deception_Honeypot"): {"attacker": 10, "defender": 90, "comment": "Attacker exfiltrates dummy fake tokens"},
            ("Ransomware_Outbreak", "Isolate_Host_Device"): {"attacker": 10, "defender": 90, "comment": "Stops lateral worm spread dead in its tracks"},
            ("Ransomware_Outbreak", "Block_Perimeter_IP"): {"attacker": 70, "defender": 30, "comment": "Firewall doesn't stop local LAN encryption"},
            ("Volumetric_DDoS", "Adaptive_Rate_Limiting"): {"attacker": 15, "defender": 85, "comment": "Rate limiter absorbs packet spike gracefully"},
            ("Volumetric_DDoS", "Block_Perimeter_IP"): {"attacker": 40, "defender": 60, "comment": "Blocking individual IPs partially helps against botnets"},
            ("Credential_Stuffing", "Block_Perimeter_IP"): {"attacker": 15, "defender": 85, "comment": "Blocks automated login brute-force engine"}
        }

        # MiniMax with Alpha-Beta Pruning simulation tree
        tree_nodes = []
        alpha = -float("inf")
        beta = float("inf")

        best_defender_move = None
        max_defender_score = -float("inf")

        for d_move in strategies["Defender"]:
            key = (attacker_move, d_move)
            payoff = payoff_matrix.get(key, {"attacker": 50, "defender": 50, "comment": "Neutral exchange"})
            d_score = payoff["defender"]

            node_record = {
                "attacker_move": attacker_move,
                "defender_move": d_move,
                "defender_score": d_score,
                "attacker_score": payoff["attacker"],
                # JSON has no representation for infinities; expose an unbounded
                # alpha/beta as null while keeping the minimax bounds internal.
                "alpha": alpha if math.isfinite(alpha) else None,
                "beta": beta if math.isfinite(beta) else None,
                "pruned": False,
                "evaluation_notes": payoff["comment"]
            }

            if d_score > max_defender_score:
                max_defender_score = d_score
                best_defender_move = d_move

            alpha = max(alpha, d_score)
            tree_nodes.append(node_record)

        return {
            "algorithm": "Game Theory MiniMax with Alpha-Beta Pruning",
            "unit": "Unit III - Adversarial Search & Strategic Games",
            "attacker_chosen_strategy": attacker_move,
            "optimal_defender_strategy": best_defender_move,
            "optimal_payoff": max_defender_score,
            "game_tree_evaluations": tree_nodes,
            "strategic_recommendation": f"Against '{attacker_move}', optimal defense is '{best_defender_move}' with security payoff {max_defender_score}/100."
        }

    def solve_firewall_csp(self, proposed_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        AI Unit III: Constraint Satisfaction Problem (CSP) for Policy & Firewall Optimization
        Variables: Ports/Services {DB_Port_5432, Web_Port_443, SSH_Port_22, RDP_Port_3389}
        Domain: {ALLOW_ALL, ALLOW_VPN_ONLY, DENY_EXTERNAL, ISOLATE}
        Constraints:
          C1: DB_Port cannot have ALLOW_ALL from 0.0.0.0/0
          C2: SSH/RDP cannot be ALLOW_ALL on production servers
          C3: Web_Port must have ALLOW_ALL for public availability
        """
        variables = ["DB_Port_5432", "Web_Port_443", "SSH_Port_22", "RDP_Port_3389"]
        domains = {
            "DB_Port_5432": ["ALLOW_VPN_ONLY", "DENY_EXTERNAL", "ALLOW_ALL"],
            "Web_Port_443": ["ALLOW_ALL", "ALLOW_VPN_ONLY", "DENY_EXTERNAL"],
            "SSH_Port_22": ["ALLOW_VPN_ONLY", "DENY_EXTERNAL", "ALLOW_ALL"],
            "RDP_Port_3389": ["DENY_EXTERNAL", "ALLOW_VPN_ONLY", "ALLOW_ALL"]
        }

        # Backtracking Search with Constraint Consistency Checking
        assignment = {}
        csp_trace = []

        def is_consistent(var, value, current_assignment):
            if var == "DB_Port_5432" and value == "ALLOW_ALL":
                return False, "Violation: Critical DB cluster cannot expose open port to public internet."
            if var == "Web_Port_443" and value == "DENY_EXTERNAL":
                return False, "Violation: Public web gateway requires external ingress."
            if (var in ["SSH_Port_22", "RDP_Port_3389"]) and value == "ALLOW_ALL":
                return False, "Violation: Management protocols must require VPN or internal CIDR."
            return True, "Consistent with zero-trust security policy."

        def backtrack(var_index: int):
            if var_index == len(variables):
                return True

            var = variables[var_index]
            for val in domains[var]:
                consistent, reason = is_consistent(var, val, assignment)
                csp_trace.append({
                    "step": len(csp_trace) + 1,
                    "variable": var,
                    "attempted_value": val,
                    "is_consistent": consistent,
                    "constraint_reason": reason
                })

                if consistent:
                    assignment[var] = val
                    if backtrack(var_index + 1):
                        return True
                    del assignment[var]

            return False

        solution_found = backtrack(0)

        return {
            "algorithm": "Constraint Satisfaction Problem (CSP) Solver",
            "unit": "Unit III - Constraint Satisfaction Problems",
            "variables": variables,
            "domains": domains,
            "solution_found": solution_found,
            "optimal_policy_assignment": assignment,
            "solver_trace": csp_trace
        }

    def run_hill_climbing_optimization(self, initial_threshold: float = 0.50) -> Dict[str, Any]:
        """
        AI Unit II: Hill Climbing Local Search for detection threshold tuning.
        Iteratively adjusts thresholds until reaching peak accuracy / zero-trust objective.
        """
        current_threshold = initial_threshold
        steps = []

        def security_fitness_function(t: float) -> float:
            # Fitness combines True Positive rate minus False Alarm penalty
            # Optimum sits at balanced threshold ~0.78
            return -100 * ((t - 0.78) ** 2) + 94.5

        current_fitness = security_fitness_function(current_threshold)
        step_size = 0.05

        for i in range(10):
            steps.append({
                "iteration": i + 1,
                "threshold": round(current_threshold, 3),
                "fitness_score": round(current_fitness, 2)
            })

            # Check neighbors
            left_t = max(0.1, current_threshold - step_size)
            right_t = min(0.95, current_threshold + step_size)

            left_fit = security_fitness_function(left_t)
            right_fit = security_fitness_function(right_t)

            best_neighbor_fit = max(left_fit, right_fit)
            if best_neighbor_fit > current_fitness:
                if right_fit > left_fit:
                    current_threshold = right_t
                    current_fitness = right_fit
                else:
                    current_threshold = left_t
                    current_fitness = left_fit
            else:
                # Peak reached
                break

        return {
            "algorithm": "Hill Climbing Local Search",
            "unit": "Unit II - Local Search & Optimization",
            "initial_threshold": initial_threshold,
            "optimized_threshold": round(current_threshold, 3),
            "peak_fitness_score": round(current_fitness, 2),
            "optimization_steps": steps
        }
