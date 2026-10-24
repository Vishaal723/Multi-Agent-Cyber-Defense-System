"""Evidence-led investigation and simulated response planning for Phase 5."""
import json
import uuid
from collections import deque
from datetime import datetime, timezone


class InvestigationNotFound(Exception):
    pass


class PlanNotFound(Exception):
    pass


class InvestigationEvidenceInsufficient(Exception):
    pass


class PlanConstraintViolation(Exception):
    def __init__(self, detail):
        super().__init__(detail)
        self.detail = detail


class InvestigationWorkflow:
    SCORE_METHOD = (
        "Heuristic points (not a probability): containment scope - 0.25 × operational-impact points "
        "- 0.10 × execution-complexity points. Inputs are fixed scenario-planning judgments from 0 to 100."
    )

    def __init__(self, db_conn_factory, network_monitor, responder):
        self.db_conn_factory = db_conn_factory
        self.network_monitor = network_monitor
        self.responder = responder

    @staticmethod
    def _now():
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _audit(cursor, incident_id, actor, event_type, description, details, now):
        cursor.execute(
            """INSERT INTO audit_logs
               (log_id, username, event_type, level, description, details, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (str(uuid.uuid4()), actor, event_type, "INFO", description,
             json.dumps({"incident_id": incident_id, **details}), now),
        )

    def _investigation_rows(self, incident_id):
        conn = self.db_conn_factory()
        try:
            incident = conn.execute(
                "SELECT * FROM incidents WHERE incident_id = ?", (incident_id,)
            ).fetchone()
            if not incident:
                raise InvestigationNotFound("Incident not found")
            threat = None
            if incident["threat_id"]:
                threat = conn.execute(
                    "SELECT * FROM threats WHERE threat_id = ?", (incident["threat_id"],)
                ).fetchone()
            devices = conn.execute(
                "SELECT device_id, ip_address, hostname, device_type, status FROM network_devices ORDER BY hostname"
            ).fetchall()
            constraints = conn.execute(
                """SELECT c.device_id, c.constraint_text, c.updated_by, c.updated_at,
                          d.hostname, d.ip_address, d.device_type
                   FROM simulated_asset_constraints c
                   JOIN network_devices d ON d.device_id = c.device_id
                   WHERE c.incident_id = ? ORDER BY d.hostname""", (incident_id,)
            ).fetchall()
            return dict(incident), (dict(threat) if threat else None), [dict(d) for d in devices], [dict(c) for c in constraints]
        finally:
            conn.close()

    def _topology_path(self, source_ip, target_ip, devices):
        graph = self.network_monitor.topology_graph
        metadata = self.network_monitor.node_metadata
        device_to_node = {value.get("ip"): key for key, value in metadata.items()}
        device_to_node.update({d["ip_address"]: device_to_node.get(d["ip_address"], d["hostname"]) for d in devices})
        source_node = device_to_node.get(source_ip)
        target_node = device_to_node.get(target_ip)

        def shortest(start, end):
            queue = deque([(start, [start])])
            seen = {start}
            while queue:
                node, path = queue.popleft()
                if node == end:
                    return path
                for neighbor in graph.get(node, []):
                    if neighbor not in seen:
                        seen.add(neighbor)
                        queue.append((neighbor, path + [neighbor]))
            return None

        internal_path = None
        if source_node and target_node:
            internal_path = shortest(source_node, target_node)
        elif target_node:
            internal_path = shortest("Router-Core", target_node)
            if internal_path:
                internal_path = [source_ip] + internal_path
        elif source_node:
            internal_path = shortest(source_node, "Router-Core")
            if internal_path:
                internal_path.append(target_ip)
        else:
            return [source_ip, target_ip], False, "Neither endpoint maps to the configured simulated topology."

        if not internal_path:
            return [source_ip, target_ip], False, "No route between the known endpoints exists in the configured simulated topology."
        if source_node and target_node:
            path = internal_path
        elif target_node:
            path = internal_path
        else:
            path = internal_path
        return path, True, "Intermediate hops are inferred from the configured simulated topology; endpoint values come from the generated threat event."

    def get_investigation(self, incident_id):
        incident, threat, devices, constraints = self._investigation_rows(incident_id)
        evidence = json.loads(incident["evidence"] or "{}")
        source_ip = (threat or {}).get("source_ip") or evidence.get("source_ip")
        target_ip = (threat or {}).get("destination_ip") or evidence.get("target_ip")
        event_exists = bool(threat and source_ip and target_ip)
        nodes, complete, explanation = [], False, "Stored event evidence is not sufficient to identify both endpoints."
        edges = []
        generated_events = []
        if event_exists:
            path, complete, explanation = self._topology_path(source_ip, target_ip, devices)
            labels_by_ip = {d["ip_address"]: d["hostname"] for d in devices}
            labels_by_node = {key: key for key in self.network_monitor.topology_graph}
            labels_by_node.update({key: key for key in self.network_monitor.node_metadata})
            endpoint_nodes = {source_ip, target_ip}
            endpoint_nodes.update(
                key for key, value in self.network_monitor.node_metadata.items()
                if value.get("ip") in (source_ip, target_ip)
            )
            endpoint_nodes.update(
                device["hostname"] for device in devices
                if device["ip_address"] in (source_ip, target_ip)
            )
            for node in path:
                nodes.append({
                    "id": node,
                    "label": labels_by_ip.get(node, labels_by_node.get(node, node)),
                    "kind": "event_endpoint" if node in endpoint_nodes else "inferred_topology_hop",
                    "basis": "generated threat event endpoint" if node in endpoint_nodes else "configured simulated topology",
                })
            known_internal_ips = set(labels_by_ip) | {value.get("ip") for value in self.network_monitor.node_metadata.values()}
            edges = []
            for index in range(len(path) - 1):
                edge_from, edge_to = path[index], path[index + 1]
                if edge_from == source_ip and edge_to == "Router-Core" and source_ip not in known_internal_ips:
                    basis = "external source attached to demo ingress at Router-Core by route assumption"
                elif edge_from == "Router-Core" and edge_to == target_ip and target_ip not in known_internal_ips:
                    basis = "demo egress at Router-Core attached to external destination by route assumption"
                else:
                    basis = "link from the configured simulated topology"
                edges.append({"from": edge_from, "to": edge_to, "basis": basis, "inferred": True})
            edges.append({"from": source_ip, "to": target_ip, "basis": "source and destination recorded in the same generated threat event", "inferred": False, "event_id": threat["threat_id"]})
            generated_events = [{
                "event_id": threat["threat_id"],
                "timestamp": threat["timestamp"],
                "source_ip": source_ip,
                "destination_ip": target_ip,
                "attack_type": threat["attack_type"],
                "payload_sample": threat.get("payload_sample"),
                "evidence_origin": "simulator-generated threat record",
            }]

        reconstruction = {
            "incident_id": incident_id,
            "simulation_only": True,
            "status": "inferred_route" if complete and event_exists else "incomplete",
            "evidence_scope": "One stored simulated threat event provides the endpoints; any intermediate route hops come from the configured demo topology, not observed events.",
            "generated_events": generated_events,
            "nodes": nodes,
            "relationships": edges,
            "explanation": explanation,
            "limitations": [] if complete and event_exists else [explanation],
        }
        now = self._now()
        conn = self.db_conn_factory()
        try:
            existing = conn.execute("SELECT 1 FROM investigation_records WHERE incident_id = ?", (incident_id,)).fetchone()
            conn.execute(
                """INSERT INTO investigation_records (incident_id, reconstruction_json, created_at, updated_at)
                   VALUES (?, ?, ?, ?) ON CONFLICT(incident_id) DO UPDATE SET
                   reconstruction_json = excluded.reconstruction_json, updated_at = excluded.updated_at""",
                (incident_id, json.dumps(reconstruction), now, now),
            )
            if not existing:
                self._audit(conn.cursor(), incident_id, "Investigation Workflow", "INVESTIGATION_RECONSTRUCTED", "Reconstructed simulated route from stored event endpoints and configured topology", {"event_count": len(generated_events), "relationship_count": len(edges), "status": reconstruction["status"]}, now)
            conn.commit()
        finally:
            conn.close()
        return {
            "incident_id": incident_id,
            "reconstruction": reconstruction,
            "assets": devices,
            "critical_assets": constraints,
            "plans": self._refresh_saved_plan_validation(incident_id),
            "executions": self.get_executions(incident_id),
        }

    def set_critical_asset(self, incident_id, device_id, constraint_text, actor):
        self._investigation_rows(incident_id)
        now = self._now()
        conn = self.db_conn_factory()
        try:
            device = conn.execute("SELECT hostname, ip_address FROM network_devices WHERE device_id = ?", (device_id,)).fetchone()
            if not device:
                raise InvestigationNotFound("Simulated asset was not found")
            conn.execute(
                """INSERT INTO simulated_asset_constraints (incident_id, device_id, constraint_text, updated_by, updated_at)
                   VALUES (?, ?, ?, ?, ?) ON CONFLICT(incident_id, device_id) DO UPDATE SET
                   constraint_text = excluded.constraint_text, updated_by = excluded.updated_by, updated_at = excluded.updated_at""",
                (incident_id, device_id, constraint_text.strip(), actor, now),
            )
            self._audit(conn.cursor(), incident_id, actor, "CRITICAL_ASSET_CONSTRAINT_SET", "Critical asset constraint recorded for simulated investigation", {"device_id": device_id, "hostname": device["hostname"], "ip_address": device["ip_address"], "constraint_text": constraint_text.strip()}, now)
            conn.commit()
            return self.get_investigation(incident_id)
        finally:
            conn.close()

    def clear_critical_asset(self, incident_id, device_id, actor):
        now = self._now()
        conn = self.db_conn_factory()
        try:
            cursor = conn.execute("DELETE FROM simulated_asset_constraints WHERE incident_id = ? AND device_id = ?", (incident_id, device_id))
            if not cursor.rowcount:
                raise InvestigationNotFound("No critical asset constraint was recorded for this asset and incident")
            self._audit(conn.cursor(), incident_id, actor, "CRITICAL_ASSET_CONSTRAINT_CLEARED", "Critical asset constraint cleared for simulated investigation", {"device_id": device_id}, now)
            conn.commit()
        finally:
            conn.close()
        return self.get_investigation(incident_id)

    def _make_plans(self, incident_id):
        incident, threat, devices, constraints = self._investigation_rows(incident_id)
        evidence = json.loads(incident["evidence"] or "{}")
        source_ip = (threat or {}).get("source_ip") or evidence.get("source_ip") or "unknown source"
        target_ip = (threat or {}).get("destination_ip") or evidence.get("target_ip") or "unknown target"
        if not threat or not source_ip or not target_ip or source_ip == "unknown source" or target_ip == "unknown target":
            raise InvestigationEvidenceInsufficient("Cannot generate defensible plans: this investigation has no stored event with both source and destination evidence.")
        attack_type = (threat or {}).get("attack_type") or evidence.get("attack_type", "unknown")
        severity = incident.get("severity", "Unknown")
        asset_for_ip = {d["ip_address"]: d for d in devices}
        score_profiles = [
            {"plan_key": "isolate_target", "name": "Contain at the target", "action": "ISOLATE_ENDPOINT", "target": target_ip, "scope": 90 if attack_type == "ransomware" else 76, "impact": 72, "complexity": 20, "impact_text": "May disconnect the destination device from the simulated LAN."},
            {"plan_key": "block_source", "name": "Block the observed source", "action": "BLOCK_IP_ADDRESS", "target": source_ip, "scope": 72, "impact": 15, "complexity": 10, "impact_text": "Adds a simulated deny rule for the event source; other paths may remain."},
            {"plan_key": "notify_analyst", "name": "Escalate for analyst review", "action": "NOTIFY_SOC_ADMINISTRATOR", "target": "SOC-Shift-Lead", "scope": 22, "impact": 5, "complexity": 5, "impact_text": "Does not contain the simulated traffic; it requests human review."},
        ]
        for profile in score_profiles:
            profile["containment_score"] = round(profile["scope"] - 0.25 * profile["impact"] - 0.10 * profile["complexity"], 2)
            profile["score_inputs"] = {"containment_scope_points": profile["scope"], "operational_impact_points": profile["impact"], "execution_complexity_points": profile["complexity"]}
            matching = next((asset for asset in constraints if profile["action"] in ("ISOLATE_ENDPOINT", "ISOLATE_DEVICE") and profile["target"] in (asset["ip_address"], asset["hostname"], asset["device_id"])), None)
            profile["valid"] = matching is None
            profile["validation"] = {"valid": True, "explanation": "No active critical-asset constraint prohibits this action."} if matching is None else {
                "valid": False,
                "explanation": f"Rejected: {profile['action']} would isolate protected asset {matching['hostname']} ({matching['ip_address']}). Active constraint: {matching['constraint_text']}",
                "violated_asset": {"device_id": matching["device_id"], "hostname": matching["hostname"], "ip_address": matching["ip_address"]},
                "constraint": matching["constraint_text"],
            }
            profile["advantages"] = "Strong targeted containment with a narrow scope." if profile["plan_key"] == "block_source" else ("Directly limits activity at the destination." if profile["plan_key"] == "isolate_target" else "Low operational impact and preserves analyst oversight.")
            profile["trade_offs"] = profile["impact_text"]
            profile["score_method"] = self.SCORE_METHOD
            profile["simulation_only"] = True
            profile["severity_context"] = severity
            if profile["plan_key"] == "isolate_target" and profile["valid"] and profile["target"] not in asset_for_ip:
                profile["validation"]["explanation"] = "Plan is valid under current constraints, but the target is not a device in the configured inventory; simulated isolation may not update an inventory record."
        for profile in score_profiles:
            profile["rejected_actions"] = [
                {"action": other["action"], "target": other["target"], "reason": (
                    other["validation"]["explanation"] if not other["valid"]
                    else "Not included in this single-action candidate; it is presented as a separate comparison plan."
                )}
                for other in score_profiles if other is not profile
            ]
        valid_scores = [plan["containment_score"] for plan in score_profiles if plan["valid"]]
        preferred_score = max(valid_scores) if valid_scores else None
        for profile in score_profiles:
            profile["preferred_valid"] = profile["valid"] and profile["containment_score"] == preferred_score
        return score_profiles

    def generate_plans(self, incident_id, actor):
        plans = self._make_plans(incident_id)
        now = self._now()
        conn = self.db_conn_factory()
        try:
            for plan in plans:
                plan_id = f"PLAN-{uuid.uuid4().hex[:10].upper()}"
                plan["plan_id"] = plan_id
                plan["incident_id"] = incident_id
                conn.execute("INSERT INTO investigation_plans (plan_id, incident_id, plan_key, plan_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)", (plan_id, incident_id, plan["plan_key"], json.dumps(plan), actor, now))
                self._audit(conn.cursor(), incident_id, actor, "RESPONSE_PLANS_GENERATED", "Backend generated a candidate simulated response plan", {"plan_id": plan_id, "plan_key": plan["plan_key"], "valid": plan["valid"], "containment_score": plan["containment_score"]}, now)
            conn.commit()
        finally:
            conn.close()
        return plans

    def get_saved_plans(self, incident_id):
        conn = self.db_conn_factory()
        try:
            rows = conn.execute(
                """SELECT plan_json FROM investigation_plans WHERE incident_id = ? AND created_at =
                   (SELECT MAX(created_at) FROM investigation_plans WHERE incident_id = ?) ORDER BY plan_key""",
                (incident_id, incident_id),
            ).fetchall()
            return [json.loads(row["plan_json"]) for row in rows]
        finally:
            conn.close()

    def _refresh_saved_plan_validation(self, incident_id):
        saved = self.get_saved_plans(incident_id)
        if not saved:
            return []
        current = {plan["plan_key"]: plan for plan in self._make_plans(incident_id)}
        for plan in saved:
            evaluated = current.get(plan["plan_key"])
            if evaluated:
                plan["valid"] = evaluated["valid"]
                plan["validation"] = evaluated["validation"]
                plan["validation_rechecked_at"] = self._now()
        return saved

    def get_executions(self, incident_id):
        conn = self.db_conn_factory()
        try:
            rows = conn.execute("SELECT * FROM simulated_executions WHERE incident_id = ? ORDER BY created_at DESC", (incident_id,)).fetchall()
            return [{**dict(row), "result": json.loads(row["result_json"])} for row in rows]
        finally:
            conn.close()

    def _record_rejection(self, incident_id, plan_id, actor, detail):
        now = self._now()
        result = {"status": "REJECTED", "reason": detail, "simulation_only": True}
        conn = self.db_conn_factory()
        try:
            conn.execute("INSERT INTO simulated_executions (execution_id, incident_id, plan_id, response_id, status, result_json, created_by, created_at) VALUES (?, ?, ?, NULL, 'REJECTED', ?, ?, ?)", (f"EXEC-{uuid.uuid4().hex[:10].upper()}", incident_id, plan_id, json.dumps(result), actor, now))
            self._audit(conn.cursor(), incident_id, actor, "RESPONSE_PLAN_REJECTED", "Simulated response plan rejected by active constraint validation", {"plan_id": plan_id, "reason": detail}, now)
            conn.commit()
        finally:
            conn.close()

    def execute_plan(self, incident_id, plan_id, actor):
        plans = self._make_plans(incident_id)
        conn = self.db_conn_factory()
        try:
            row = conn.execute("SELECT plan_key, plan_json FROM investigation_plans WHERE plan_id = ? AND incident_id = ?", (plan_id, incident_id)).fetchone()
        finally:
            conn.close()
        if not row:
            raise PlanNotFound("Candidate plan not found for this investigation; generate plans again.")
        plan = next((item for item in plans if item["plan_key"] == row["plan_key"]), None)
        if not plan:
            raise PlanNotFound("Candidate plan no longer matches current investigation evidence.")
        plan["plan_id"] = plan_id
        plan["incident_id"] = incident_id
        if not plan["valid"]:
            self._record_rejection(incident_id, plan_id, actor, plan["validation"]["explanation"])
            raise PlanConstraintViolation(plan["validation"]["explanation"])
        try:
            return self.responder.execute_action(
                incident_id=incident_id,
                action=plan["action"],
                target=plan["target"],
                executed_by=f"Analyst ({actor})",
                reason=f"Selected simulated investigation plan {plan_id}",
                workflow_plan_id=plan_id,
            )
        except Exception as exc:
            # The response agent performs the final in-transaction guard. Record rejection
            # separately only after its transaction has rolled back.
            detail = getattr(exc, "detail", None)
            if detail:
                self._record_rejection(incident_id, plan_id, actor, detail)
                raise PlanConstraintViolation(detail) from exc
            raise
