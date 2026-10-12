"""
Reporting & Analytics Engine (PRD Module 11 FR-041 to FR-044)
Generates Incident Reports, Daily Summaries, Weekly Trends, and exports in PDF, CSV, and JSON.
"""
import io
import csv
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class ReportingEngine:
    def __init__(self, db_conn_factory, learning_agent):
        self.db_conn_factory = db_conn_factory
        self.learning_agent = learning_agent

    def generate_incident_report(self, incident_id: str) -> Dict[str, Any]:
        """Generates comprehensive single-incident audit report (FR-041)"""
        conn = self.db_conn_factory()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
        inc = cursor.fetchone()
        if not inc:
            conn.close()
            return {"error": "Incident not found"}

        cursor.execute("SELECT * FROM threats WHERE threat_id = ?", (inc["threat_id"],))
        threat = cursor.fetchone()

        cursor.execute("SELECT * FROM responses WHERE incident_id = ?", (incident_id,))
        responses = cursor.fetchall()

        cursor.execute("SELECT * FROM audit_logs WHERE description LIKE ? ORDER BY created_at ASC", (f"%{incident_id}%",))
        audit_events = cursor.fetchall()

        conn.close()

        timeline = json.loads(inc["timeline"]) if inc["timeline"] else []
        evidence = json.loads(inc["evidence"]) if inc["evidence"] else {}
        attack_chain = json.loads(inc["attack_chain"]) if inc["attack_chain"] else []
        explanation = json.loads(inc["decision_explanation"]) if inc["decision_explanation"] else {}

        return {
            "report_id": f"REP-{incident_id}",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "incident": {
                "incident_id": inc["incident_id"],
                "title": inc["title"],
                "status": inc["status"],
                "severity": inc["severity"],
                "created_at": inc["created_at"],
                "updated_at": inc["updated_at"]
            },
            "threat_details": dict(threat) if threat else {},
            "evidence": evidence,
            "attack_chain": attack_chain,
            "timeline": timeline,
            "ai_reasoning_and_decisions": explanation,
            "mitigation_responses": [dict(r) for r in responses],
            "audit_trail": [dict(a) for a in audit_events]
        }

    def generate_daily_report(self) -> Dict[str, Any]:
        """Generates Daily SOC security summary (FR-042)"""
        conn = self.db_conn_factory()
        cursor = conn.cursor()

        now = datetime.now(timezone.utc)
        yesterday = (now - timedelta(days=1)).isoformat()

        cursor.execute("SELECT COUNT(*) FROM threats WHERE timestamp >= ?", (yesterday,))
        threats_24h = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM incidents WHERE created_at >= ?", (yesterday,))
        incidents_24h = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM responses WHERE executed_at >= ?", (yesterday,))
        responses_24h = cursor.fetchone()[0]

        cursor.execute(
            "SELECT attack_type, COUNT(*) as count FROM threats WHERE timestamp >= ? GROUP BY attack_type ORDER BY count DESC LIMIT 5",
            (yesterday,),
        )
        top_attacks = [dict(r) for r in cursor.fetchall()]

        conn.close()

        kpis = self.learning_agent.calculate_performance_kpis()

        return {
            "report_type": "Daily Security Summary",
            "period": "Last 24 Hours",
            "generated_at": now.isoformat(),
            "data_source": "Persisted MACDS records; synthetic simulator records may be included",
            "metrics": {
                "threats_detected": threats_24h,
                "incidents_triaged": incidents_24h,
                "automated_actions_executed": responses_24h,
                "mttd_seconds": kpis["mean_time_to_detect_sec"],
                "mttr_seconds": kpis["mean_time_to_respond_sec"],
                "success_rate_percent": kpis["overall_success_rate_percent"]
            },
            "top_attack_categories": top_attacks
        }

    def generate_weekly_report(self) -> Dict[str, Any]:
        """Generates Weekly SOC trends & agent performance report (FR-043)"""
        now = datetime.now(timezone.utc)
        start_day = now.date() - timedelta(days=6)
        end_day = now.date()
        start_text = start_day.isoformat()
        end_text = end_day.isoformat()

        conn = self.db_conn_factory()
        cursor = conn.cursor()
        counts = {
            "threats": {},
            "incidents": {},
            "mitigated": {},
        }
        cursor.execute(
            "SELECT date(timestamp) AS day, COUNT(*) AS count FROM threats WHERE date(timestamp) BETWEEN ? AND ? GROUP BY date(timestamp)",
            (start_text, end_text),
        )
        counts["threats"] = {row["day"]: row["count"] for row in cursor.fetchall()}
        cursor.execute(
            "SELECT date(created_at) AS day, COUNT(*) AS count FROM incidents WHERE date(created_at) BETWEEN ? AND ? GROUP BY date(created_at)",
            (start_text, end_text),
        )
        counts["incidents"] = {row["day"]: row["count"] for row in cursor.fetchall()}
        cursor.execute(
            "SELECT date(updated_at) AS day, COUNT(*) AS count FROM incidents WHERE status IN ('Mitigated', 'Closed') AND date(updated_at) BETWEEN ? AND ? GROUP BY date(updated_at)",
            (start_text, end_text),
        )
        counts["mitigated"] = {row["day"]: row["count"] for row in cursor.fetchall()}
        cursor.close()
        conn.close()

        daily_trend = []
        for offset in range(7):
            day = (start_day + timedelta(days=offset)).isoformat()
            daily_trend.append({
                "day": datetime.fromisoformat(day).strftime("%a %d %b"),
                "date": day,
                "threats": counts["threats"].get(day, 0),
                "incidents": counts["incidents"].get(day, 0),
                "mitigated": counts["mitigated"].get(day, 0),
            })

        weekly_threats = sum(item["threats"] for item in daily_trend)
        weekly_incidents = sum(item["incidents"] for item in daily_trend)
        weekly_mitigated = sum(item["mitigated"] for item in daily_trend)
        resolution_percent = (weekly_mitigated / weekly_incidents * 100.0) if weekly_incidents else None

        return {
            "report_type": "Weekly Cybersecurity Trend & Agent Performance Report",
            "period": "Last 7 Days",
            "generated_at": now.isoformat(),
            "data_source": "Persisted MACDS records; synthetic simulator records may be included",
            "weekly_incident_total": weekly_incidents,
            "weekly_threats_total": weekly_threats,
            "autonomous_resolution_percent": round(resolution_percent, 1) if resolution_percent is not None else None,
            "daily_trend": daily_trend,
            # The database has no historical uptime, workload, or accuracy measurements.
            "agent_performance": []
        }

    def export_csv_threats(self) -> str:
        """Exports all threats to CSV format (FR-044)"""
        conn = self.db_conn_factory()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM threats ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        conn.close()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Threat ID", "Attack Type", "Category", "Confidence", "Severity", "Risk Level", "Source IP", "Destination IP", "Status", "Timestamp"])
        
        for r in rows:
            writer.writerow([r["threat_id"], r["attack_type"], r["category"], r["confidence"], r["severity"], r["risk_level"], r["source_ip"], r["destination_ip"], r["status"], r["timestamp"]])

        return output.getvalue()

    def export_pdf_incident_report(self, incident_id: str) -> bytes:
        """Exports Incident Report as a styled PDF document (FR-044)"""
        data = self.generate_incident_report(incident_id)
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor("#0f172a"), spaceAfter=12)
        h2_style = ParagraphStyle('H2Style', parent=styles['Heading2'], fontSize=13, textColor=colors.HexColor("#1e293b"), spaceBefore=10, spaceAfter=6)
        body_style = ParagraphStyle('BodyStyle', parent=styles['Normal'], fontSize=9, leading=12, textColor=colors.HexColor("#334155"))

        story = []

        # Header Title
        story.append(Paragraph(f"MACDS Incident Investigation Report: {incident_id}", title_style))
        story.append(Paragraph(f"Generated on {data['generated_at']} | Multi-Agent Cyber Defense System", body_style))
        story.append(Spacer(1, 10))

        # Incident Overview Table
        inc = data.get("incident", {})
        overview_data = [
            ["Incident ID", inc.get("incident_id", "N/A"), "Severity", inc.get("severity", "N/A")],
            ["Title", inc.get("title", "N/A"), "Status", inc.get("status", "N/A")],
            ["Created At", inc.get("created_at", "N/A"), "Updated At", inc.get("updated_at", "N/A")]
        ]
        t = Table(overview_data, colWidths=[100, 170, 90, 180])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor("#0f172a")),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        story.append(t)
        story.append(Spacer(1, 10))

        # Timeline
        story.append(Paragraph("Incident Reconstruction Timeline (Threat Correlation Agent)", h2_style))
        timeline_rows = [["Timestamp", "Stage", "Agent", "Detail"]]
        for item in data.get("timeline", []):
            timeline_rows.append([
                item.get("timestamp", "")[:19],
                item.get("stage", ""),
                item.get("agent", ""),
                item.get("detail", "")
            ])
        if len(timeline_rows) > 1:
            t_time = Table(timeline_rows, colWidths=[100, 110, 120, 210])
            t_time.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0284c7")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            story.append(t_time)

        story.append(Spacer(1, 10))
        # AI Decision & Actions
        story.append(Paragraph("AI Explainability & Response Actions", h2_style))
        ai_dec = data.get("ai_reasoning_and_decisions", {})
        story.append(Paragraph(f"<b>Logical Inference Conclusions:</b> {', '.join(ai_dec.get('inferred_conclusions', ['Threat verified']))}", body_style))
        story.append(Paragraph(f"<b>Resolution Status:</b> {ai_dec.get('resolution_status', 'Validated')}", body_style))
        story.append(Paragraph(f"<b>Recommended Mitigation:</b> {ai_dec.get('recommended_action', 'Autonomous Firewall Update')}", body_style))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
