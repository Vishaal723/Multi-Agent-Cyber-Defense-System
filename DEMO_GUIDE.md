# MACDS Demonstration Guide (5–7 minutes)

This walkthrough uses the local synthetic environment. It creates simulator, incident, response, investigation, and audit records in the database selected for the backend process. For evaluation, use a disposable database under the system temporary directory; do not use `backend/data/macds.db`.

## Fresh-instance preflight — required before presenting

1. Start a fresh isolated application: configure a uniquely named SQLite database under the system temporary directory, a test-only JWT secret, and a local demo or bootstrap account as described in [backend/SECURITY.md](backend/SECURITY.md). Do not use `backend/data/macds.db`, overwrite `.env` files, or copy credentials into this guide.
2. Start fresh backend and frontend processes using the PowerShell commands in [README.md](README.md). Keep both terminals open and record the backend's printed `MACDS_DB_PATH` to confirm which database the demo uses.
3. In a clean browser session at `http://localhost:5173/`, verify unauthenticated access is gated: the sign-in prompt is visible and protected dashboard content is not shown. Sign in with the account configured for this isolated database.
4. Verify the dashboard loads its backend data without a fetch error. Sign out and confirm protected content is gated again; sign in again before continuing.
5. Run the Brute Force Credential Attack scenario and verify its returned seven-stage trace and generated incident.
6. Open the generated investigation, protect its target asset with a business-critical constraint, generate plans, and verify the conflicting isolation plan is rejected by the backend and cannot be executed. Then execute a valid plan and confirm the simulated result.
7. If any preflight check fails, stop and fix the environment before presenting. Do not treat the existing `localhost:5174` page as verified, and do not substitute fabricated output for a failed live result.

Once this preflight passes, continue with the timed walkthrough below.

## Walkthrough

| Time | Screen and action | What to point out |
|---|---|---|
| 0:00–0:45 | **Dashboard** | Point out persisted local records, explicit simulated-telemetry labels, and unavailable states when there is no data. The demo stream is not production-network monitoring. |
| 0:45–1:45 | **Attack Simulator** → choose **Brute Force Credential Attack** → run the simulation | Show the generated incident and all seven trace stages. Explain that the payload, event, and response are synthetic and stored in the selected local database. |
| 1:45–2:15 | Open the generated incident from the simulator or go to **Incidents & Triage** | Show the stored threat/incident relationship and the recorded simulated response. |
| 2:15–3:00 | Open the embedded **Investigation & Simulated Response Planning** workbench | Show the source and destination from the generated threat record, then explain that any intermediate topology route is inferred from the configured demo graph. |
| 3:00–3:45 | Select the target asset, enter a business-critical constraint, and choose **Protect asset** | Show the saved constraint. It applies to simulated response actions only. |
| 3:45–4:45 | Choose **Generate plans** | Show the three candidates and their fixed heuristic inputs. The target-isolation candidate should be marked rejected when it conflicts with the constraint and cannot be selected in the interface. The backend also rechecks constraints for direct API calls. |
| 4:45–5:30 | Select a valid candidate, such as **Escalate for analyst review**, then confirm simulated execution | Show the recorded simulated result. Do not imply that an email, firewall, endpoint, or production system was contacted. |
| 5:30–6:00 | Go to **Audit & System Logs** | Show the matching investigation/response audit events. Audit storage is in the local SQLite database and is not tamper-proof against direct database access. |
| 6:00–6:45 | Go to **AI Algorithms Lab** → **Network Search** and run BFS or DFS; optionally show **Rule Inference** | Show the returned traversal list/count or proof output. Explain that these are backend demonstrations on configured topology and rules. The payoff comparison is a fixed table, not Nash equilibrium or minimax analysis. |

The scenario trace uses these stages: synthetic event input; intrusion-detection heuristic scoring; incident correlation; reasoning; response ranking and fixed payoff comparison; simulated response; and learning feedback/KPI output.

## Fallback procedure

- If the frontend cannot connect, check that the backend terminal is running on port 8000 and the frontend on port 5173; then reload the page.
- If the backend rejects startup, check `JWT_SECRET_KEY`, the selected database path, and account bootstrap/demo configuration against `backend/SECURITY.md`.
- If an operation fails, show the visible error and retry only after correcting the reported cause. Do not substitute a screenshot, manual result, or fabricated metric for a failed live operation.
- If the browser or local networking environment is unavailable, present this guide, the architecture diagram, and actual test output. State clearly which workflows were not demonstrated live.

## Manual verification checklist

- Sign in succeeds; sign out clears the browser session; after signing out, protected content is gated and protected API requests require authentication.
- Dashboard, monitoring, threat, incident, AI Lab, simulator, reports, audit, knowledge base, rules, agents, settings, and user-management screens render for an allowed account.
- Each AI Lab operation returns and displays backend output; BFS and DFS show their respective discovered/traversed counts.
- A simulator run shows seven stages and produces records only in the selected demo database.
- Investigation shows stored evidence and marks inferred route hops; the constrained candidate is rejected by the backend and a valid plan can be executed.
- Errors and empty states are visible and do not appear as fabricated activity.

## Stop and cleanup

Stop backend and frontend separately with `Ctrl+C` in their terminals. The demo database filename printed by the backend is the file used; because it was created under the system temporary directory, remove it later only if you intentionally want to discard that disposable demonstration data.
