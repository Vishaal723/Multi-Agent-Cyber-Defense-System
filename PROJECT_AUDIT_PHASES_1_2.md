# MACDS Project Audit: Phases 1 and 2

**Audit date:** 12 October 2026

**Scope:** Read-only source audit and isolated verification after Phase 2. The only project file created for this request is this report. No source code, database, user data, or `frontend/dist` files were edited.

## 1. Executive summary

MACDS is a React 19/Vite frontend backed by a Python FastAPI application and SQLite. It has nine named agent implementations, multiple classical AI algorithms, an API-driven interface, a WebSocket telemetry channel, and a synthetic seven-stage attack simulation. The project requirements document itself describes the product as both an educational AI demonstration and a practical prototype. The code and tests support the educational prototype characterization; they do not establish a live enterprise cyber-defense service.

**Readiness:** suitable for local demonstration and continued targeted development after the fixes below; not ready to be represented as a production SOC/response platform. The simulator and AI Lab now pass the exercised backend HTTP checks. The backend regression suite and frontend production build also pass. Browser rendering and interaction were not exercised in this audit.

The most important confirmed issues are misleading AI Lab and dashboard claims, fallback metrics that look operational, permissive authentication boundaries on many routes, and simulated rather than real network/agent operations. No Phase 3 or Attack Simulator changes were made.

## 2. Architecture and startup

### Runtime structure

- **Frontend:** React 19, Vite 6, `lucide-react`; one app shell in `frontend/src/App.jsx`, with a sidebar-selected view rather than a URL router. The views are mounted conditionally when selected.
- **Backend:** FastAPI app in `backend/main.py`; Pydantic request/response models in `backend/models.py`; authentication helpers in `backend/auth.py`; agent classes under `backend/agents/`; report generation in `backend/reporting.py`.
- **Persistence:** SQLite with WAL, busy timeout, and foreign-key enforcement in `backend/database.py`. `MACDS_DB_PATH` is read at module import; when unset, the existing `backend/data/macds.db` default remains in use. `get_db()` is the common connection factory used by routes and agents. The audit checks set the variable before importing/starting the app.
- **Startup side effects:** importing `backend.main` calls `init_db()` and constructs the agents. FastAPI startup launches the telemetry loop. The loop updates agent metrics, generates synthetic packets and traffic, reads recent records, and broadcasts telemetry every 1.8 seconds.
- **Frontend/backend development connection:** Vite serves on port 5173 and proxies `/api` to `http://127.0.0.1:8000` and `/ws` to `ws://127.0.0.1:8000`.

### Commands

From `F:\FOAI\backend`, the supported development commands are:

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
# Or: python main.py (main.py starts Uvicorn with reload on 127.0.0.1:8000)
```

From `F:\FOAI\frontend`:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
```

`npm.cmd` avoids the PowerShell script-policy failure reported for `npm.ps1`. If the backend is started without setting `MACDS_DB_PATH`, it selects the existing default user database.

## 3. Frontend inventory and API use

`frontend/src/api/client.js` centralizes REST calls in `apiFetch`: JSON request/response handling, optional bearer-token attachment from local storage, HTTP error conversion, and a method collection used by views. File-download helpers for CSV/PDF use separate raw `fetch` calls and do not attach the stored bearer token. `LiveTelemetrySocket` connects to the current host’s `/ws/live`, parses JSON messages, reports connection state, and reconnects after closure. App creates one socket on mount and destroys it on unmount.

| View/component | Main behavior and API dependency |
|---|---|
| `App.jsx`, `Header.jsx`, `Sidebar.jsx`, `LoginModal.jsx` | App shell, current user, dashboard polling, WebSocket, tab navigation, Viva banner, login. `api.getDashboardStats`, `api.login`; the shell also uses local-storage token/user helpers. |
| `DashboardView.jsx` | Metrics, severity, traffic, recent activity, agent/communication panels, and a hard-coded XAI narrative. Data is passed from App; no direct API calls. |
| `LiveMonitoringView.jsx` | Devices, BFS/DFS topology, packet feed, isolation controls. `getDevices`, `getBfsTopology`, `getDfsTopology`, `toggleDeviceIsolation`. |
| `ThreatsView.jsx` | Threat list/details and incident navigation. `getThreats`; details are obtained through component workflow. |
| `IncidentsView.jsx` | Incident detail, response, analyst feedback, PDF. `getIncidents`, `getIncidentDetails`, `respondToIncident`, `submitFeedback`, `exportPdf`. |
| `AIAlgorithmsLabView.jsx` | BFS/DFS, A*, Hill Climbing, Game Theory, CSP, Forward/Backward Chaining. Uses the corresponding eight methods from `client.js`. |
| `AttackSimulatorView.jsx` | Scenario input, intensity/payload, simulation request, result trace controls, incident navigation, PDF. `runSimulation`, `exportPdf`. |
| `KnowledgeBaseView.jsx` | Rules and static MITRE matrix. `getRules`, `getMitreMatrix`. |
| `RuleManagementView.jsx` | Rule list/create/delete. `getRules`, `createRule`, `deleteRule`. |
| `AgentsView.jsx` | Agent status/control. `getAgents`, `controlAgent`. |
| `ReportsView.jsx` | Daily/weekly/recommendations and CSV export. `getDailyReport`, `getWeeklyReport`, `getRecommendations`, `exportCsv`. |
| `AuditLogsView.jsx` | Audit log list. `getAuditLogs`. |
| `SettingsView.jsx` | Settings read/update. `getSettings`, `updateSetting`. |
| `UserManagementView.jsx` | User list/create/delete. `getUsers`, `createUser`, `deleteUser`. |

The AI Lab makes no algorithm request on mount: its operations are invoked by user handlers. The view initially selects Unit III, and each algorithm section is conditional on its selected unit. Its Game Theory attacker selector itself issues a request on change. The broader App does request dashboard stats on an interval and starts WebSocket telemetry regardless of the selected view.

## 4. FastAPI route, request, response, and access inventory

There are **47 HTTP routes** and one WebSocket route in `backend/main.py`. Only routes listed as protected below use `get_current_user`/`require_roles`. Unlisted routes do not enforce backend authentication. A route returning a dict/list below has no explicit FastAPI response model unless one is named.

| Method and path | Request/query | Response shape | Authentication / role |
|---|---|---|---|
| `POST /api/auth/login` | `LoginRequest {username,password}` | `LoginResponse {access_token,token_type,user_id,username,email,role}` | Public; writes auth audit record. |
| `GET /api/auth/me` | Bearer token | Current user dict `{user_id,username,email,role,created_at}` | Authenticated. |
| `GET /api/auth/users` | None | List of `UserResponse` | Administrator. |
| `POST /api/auth/users` | `UserCreateRequest {username,password,email,role}` | `UserResponse` | Administrator. |
| `DELETE /api/auth/users/{user_id}` | Path id | `{status}` | Administrator. |
| `GET /api/dashboard/stats` | None | `summary`, `severity_distribution`, `current_traffic` | No auth dependency. |
| `GET /api/monitoring/devices` | None | List of `DeviceModel` | No auth dependency. |
| `GET /api/monitoring/traffic-stats` | None | Traffic statistics dict | No auth dependency. |
| `GET /api/monitoring/topology/bfs` | Query `root` | Algorithm metadata, `total_nodes_discovered`, `traversal_steps`, `graph`, `nodes_metadata` | No auth dependency. |
| `GET /api/monitoring/topology/dfs` | Query `root` | Algorithm metadata, `total_nodes_traversed`, `traversal_steps` | No auth dependency. |
| `GET /api/threats` | Optional `category`, `severity`, `limit` | List of threat row dicts | No auth dependency. |
| `GET /api/threats/{threat_id}` | Path id | Threat row dict / 404 | No auth dependency. |
| `GET /api/incidents` | Optional `status_filter` | List of incidents with JSON fields decoded | No auth dependency. |
| `GET /api/incidents/{incident_id}` | Path id | Incident dict with JSON fields decoded / 404 | No auth dependency. |
| `POST /api/incidents/{incident_id}/respond` | `IncidentRespondRequest {action,target,reason?,analyst_approved?}` | Response action dict | Administrator or Security Analyst. |
| `GET /api/rules` | Optional `category`, `search` | List of rule dicts | No auth dependency. |
| `POST /api/rules` | `RuleCreateRequest` | `{rule_id,version,status}` | Administrator or Security Analyst. |
| `PUT /api/rules/{rule_id}` | `RuleUpdateRequest` | `{rule_id,version,status}` or error dict | Administrator or Security Analyst. |
| `DELETE /api/rules/{rule_id}` | Path id | `{status,rule_id}` | Administrator. |
| `GET /api/kb/mitre-matrix` | None | Static list of tactic/technique dicts | No auth dependency. |
| `POST /api/reasoning/forward-chaining` | `FOLReasoningRequest {facts,goal?,method?}`; uses `facts` | Inference metadata, facts, fired rules, steps, conclusion flag | No auth dependency. |
| `POST /api/reasoning/backward-chaining` | Same model; uses `facts` and `goal` | Goal, `is_proven`, evidence, `proof_tree` | No auth dependency. |
| `POST /api/reasoning/resolution` | Optional `FOLReasoningRequest`; uses `goal` | Clauses, resolution steps, empty-clause flag, verdict | No auth dependency. |
| `GET /api/detection/greedy-search` | None | Ranked threat list with priority/heuristic fields; sample rows if DB empty | No auth dependency. |
| `POST /api/planning/rank-options` | Arbitrary JSON object | Ranked response-option list | No auth dependency. |
| `GET /api/planning/astar` | None | `optimal_path`, `optimal_total_cost`, `explored_nodes_count`, `explored_steps` | No auth dependency. |
| `POST /api/planning/game-theory` | `GameTheoryRequest {attacker_action,defender_action?,depth}` | Attacker/defender strategies, payoff, evaluation records, recommendation | No auth dependency. |
| `GET /api/planning/csp-firewall` | None | `solution_found`, variables/domains, `optimal_policy_assignment`, `solver_trace` | No auth dependency. |
| `GET /api/planning/hill-climbing` | Query `threshold` | Initial/optimized threshold, fitness, optimization steps | No auth dependency. |
| `GET /api/firewall/rules` | None | List of `FirewallRuleModel` | No auth dependency. |
| `POST /api/firewall/rules` | `FirewallRuleCreate {ip_address,port?,protocol?,action?,comment?}` | `{status,rule_id}` | Administrator or Network Administrator. |
| `DELETE /api/firewall/rules/{rule_id}` | Path id | `{status,rule_id}` | Administrator or Network Administrator. |
| `POST /api/devices/{device_id}/isolate` | Path id | `{device_id,is_isolated}` | Administrator, Security Analyst, or Network Administrator. |
| `POST /api/learning/feedback` | `FeedbackRequest {incident_id,feedback_type,notes?}` | Feedback metric/record dict | Administrator or Security Analyst. |
| `GET /api/learning/kpis` | None | KPI dict | No auth dependency. |
| `GET /api/learning/recommendations` | None | Static recommendation list | No auth dependency. |
| `GET /api/reports/incident/{incident_id}` | Path id | Incident report dict | No auth dependency. |
| `GET /api/reports/daily` | None | Daily report dict | No auth dependency. |
| `GET /api/reports/weekly` | None | Weekly report dict | No auth dependency. |
| `GET /api/reports/export/csv` | None | `text/csv` download | No auth dependency; client helper omits bearer token. |
| `GET /api/reports/export/pdf/{incident_id}` | Path id | `application/pdf` / 500 on generation error | No auth dependency; client helper omits bearer token. |
| `GET /api/logs/audit` | Optional `event_type`, `limit` | List of `AuditLogModel` | No auth dependency. |
| `GET /api/agents` | None | Agent row dict list; `config` decoded | No auth dependency. |
| `POST /api/agents/{agent_id}/control` | `AgentControlRequest {action,config?}` | Agent control dict | Administrator. |
| `GET /api/settings` | None | Key/value dict | No auth dependency. |
| `POST /api/settings/{key}` | JSON object with `value` | `{status,key,value}` | Administrator. |
| `POST /api/simulation/run` | `SimulateAttackRequest {scenario,source_ip?,target_ip?,intensity?,custom_payload?}` | Scenario identity, IDs, seven execution steps, outcome, intensity/evidence, timestamp | No auth dependency; mutates threat/incident/response/audit/learning tables. |
| `WS /ws/live` | Accepted socket; receives text and replies `PONG` | Server broadcasts `TELEMETRY_UPDATE` dicts | No authentication. |

The response/model classes `PasswordChangeRequest`, `BFSDFSRequest`, and `AStarPlanningRequest` exist but are not wired into current route signatures. The BFS/DFS route takes a query root; the A* route takes no request body.

## 5. Agents, algorithms, and actual execution model

### Nine agent implementations

| Agent | Implementation and verified role |
|---|---|
| Coordinator | `coordinator.py`: in-memory message bus; updates persisted agent telemetry and handles status/config control. It does not schedule independent agent jobs or recover failed processes. |
| Network Monitoring | `network_monitor.py`: fixed in-memory topology, BFS/DFS, generated packet metadata, changing synthetic traffic values. No packet capture. |
| Intrusion Detection | `intrusion_detection.py`: heuristic/signature classification, stores threat rows, and ranks candidate threats using a greedy heuristic. |
| Threat Correlation | `threat_correlator.py`: creates incident timeline/chain narratives from attack type and stores them. Despite its DFS description, this method does not traverse an observed event graph or historical event set. |
| Knowledge Base | `knowledge_base.py`: SQLite detection rules, CRUD/version increments, search, and a hard-coded MITRE tactic/technique list. |
| Reasoning | `reasoning_engine.py`: fixed Horn-rule forward inference and fixed backward goal dependencies; FOL-like metadata; a resolution demonstration with predetermined clauses/steps. |
| Planning | `planning_engine.py`: fixed-state A*, threshold hill climb on a synthetic fitness function, one-attacker-move defender scoring, CSP backtracking, and response option ranking. |
| Response | `response_agent.py`: writes firewall-rule/response/audit rows and can change a device row’s quarantine state. Notification dispatch is an in-memory coordinator message. No external firewall, switch, endpoint, account, email, or chat operation occurs. |
| Learning | `learning_agent.py`: stores feedback and fixed response-time values, computes database-dependent counts with synthetic floors/fallbacks, and returns static recommendation data. |

The simulator directly calls seven of these agents in sequence (network monitor, IDS, correlator, reasoner, planner, responder, learner). It uses the coordinator for messages, but the coordinator is not an independent workflow orchestrator. Knowledge Base is constructed and shared with several agents, although the simulator’s stage flow does not demonstrate rule retrieval from it. The simulator’s Stage 5 calls response ranking and Game Theory; it does **not** call A*.

### Algorithms and invocation points

| Algorithm | Implementation and invocation |
|---|---|
| BFS / DFS | Static topology traversal in `NetworkMonitoringAgent`; actual `/api/monitoring/topology/{bfs,dfs}` and AI Lab/Live Monitoring. BFS returns `total_nodes_discovered`; DFS returns `total_nodes_traversed`. |
| Greedy Best-First Search | IDS ranks supplied threat candidates by `confidence * risk_level`; `/api/detection/greedy-search`. Empty DB yields four embedded sample candidate rows. The frontend client has a method, but no view calls it. |
| A* | Fixed response-state graph in Planning Agent; `/api/planning/astar`, AI Lab, regression test. It is not parameterized with the route’s `AStarPlanningRequest` model. |
| Hill Climbing | Moves a threshold in 0.05 steps against a hard-coded quadratic fitness function peaking around 0.78; route and AI Lab. This is not fitted from incident labels or measured false-positive data. |
| Game Theory | Fixed sparse payoff matrix; current method evaluates four defender choices for one supplied attacker move. Route, AI Lab, and simulator diagnostic. |
| CSP | Fixed variables/domains and backtracking consistency checks; route and AI Lab. Returns the first satisfying assignment, not a search proving an optimum. |
| Forward Chaining | Fixed Horn rules; reasoning route, AI Lab, and simulator’s FOL evaluation. |
| Backward Chaining | Fixed goal-to-subgoal map; reasoning route and AI Lab. |
| Resolution | Route returns a fixed proof example. The simulator’s “Resolution verified” text is a string in its reasoning result, not a call to the resolution endpoint/algorithm. |

## 6. Database, feature families, telemetry, and integrations

`database.py` creates these 11 tables: `users`, `agents`, `threats`, `incidents`, `rules`, `responses`, `audit_logs`, `network_devices`, `firewall_rules`, `learning_metrics`, and `system_settings`. Initial seeding adds demo accounts, nine agent rows, seven devices, seven rules, and settings. Schema setup uses `CREATE TABLE IF NOT EXISTS`; no versioned migration framework is present. SQLite connections from application routes and agents flow through the selected `get_db()` path.

Persistent flows include users/settings/rules; threat -> incident evidence/timeline; response/firewall records and defensive-action audit; analyst feedback/learning metric. Middleware logs most HTTP requests as `API_Client` audit events (excluding dashboard stats, traffic stats, WebSocket, and assets). The coordinator message bus, packet buffer, generated traffic, and recommendations are in memory or code constants, not durable event history.

Visible feature families include dashboard, monitoring/devices, threats, incident triage/response, AI Lab, simulator, rules/knowledge base/MITRE list, agents, reports/exports, audit logs, settings, and administrator user management. Having a screen or route is not proof the underlying real-world operation is connected.

WebSocket `TELEMETRY_UPDATE` contains one generated packet, varying synthetic traffic statistics, DB-backed agent/threat/incident rows, KPI output, and recent in-memory coordinator messages. It broadcasts every 1.8 seconds. The socket also replies `PONG` to received text. Telemetry and packet data are simulated; it is not sourced from a packet capture agent. There are no configured integrations for real firewall/endpoint/network control or external email/Slack delivery in the inspected source; notification names are logged in an in-memory message.

## 7. Phase 1 audit: AI Algorithms Lab

### Verified behavior

- **Source:** BFS renders `total_nodes_discovered`; DFS renders `total_nodes_traversed`. Per-operation result clearing and visible `role="alert"` errors are present. Retrying clears that operation’s error and prior result before requesting fresh data. `loading` is a keyed object, so distinct operations do not share one boolean. BFS and DFS share one `topology` key and both buttons disable during that request.
- **Source:** no `useEffect` or request is used to run algorithms on Lab mount; sections are conditionally rendered by unit. The current JSX at the previously reported `V is not defined` location contains literal text `(V)`, not a JavaScript identifier.
- **HTTP:** actual FastAPI Uvicorn checks returned HTTP 200 and validated the response fields consumed by all eight Lab operations. BFS returned 12 discovered nodes and DFS returned 12 traversed nodes. The DFS step objects have `ip` and `path`, but no `status` or `device_type`.
- **HTTP/serialization:** Game Theory returned JSON with `optimal_defender_strategy`, `optimal_payoff`, `game_tree_evaluations`, and recommendation fields; the alpha/beta fields are finite values or JSON `null`, avoiding non-standard infinity serialization.
- **Compatibility:** AI Lab client requests match routes: topology root query, A*/CSP GETs, threshold query, Game Theory POST `attacker_action`, and FOL POST `facts`/`goal`.

### Confirmed Lab defects or misleading output

1. **DFS step status is rendered as `[undefined]` (confirmed):** the AI Lab uses `s.status` for both traversal methods, but DFS step records do not return `status`. Its total DFS count is correct; the per-node status display is not.
2. **Backward proof statuses are colored incorrectly (confirmed):** the UI tests `p.status === 'PROVEN'`; the backend returns phrases such as `Proven by Base Fact`, `Sub-goals required`, and `Missing Evidence`. Proven entries therefore get the failure color even when the overall `is_proven` result is true.
3. **“Nash Equilibrium” and Alpha-Beta claim do not match implementation (confirmed misleading):** `depth` is unused; there is no alternating attacker/defender search or pruning; all four defender choices are evaluated at one fixed attacker move and every returned node has `pruned: false`. It is not a Nash equilibrium calculation. The UI’s literal `\beta <= \alpha` is plain text, not typeset mathematics.
4. **Displayed payoff matrix diverges from backend result (confirmed):** UI supplies all 16 static payoff cells. Backend defines only eight pairs and assigns neutral 50/50 to the others. The UI highlight identifies the backend recommendation, but the matrix itself is not response data and can show a payoff inconsistent with the server’s neutral fallback.
5. **CSP solver label overstates work (confirmed):** code performs recursive backtracking with local consistency checks; it does not implement AC-3 or forward checking and returns no dead-end count. UI claims those were verified and calls the first satisfying assignment “Optimal”/“100% Satisfied.” The returned assignment does satisfy the implemented constraints in the exercised request, but optimality and AC-3 are not established.
6. **Hill Climbing scope is synthetic (confirmed limitation):** the implemented fitness is a fixed quadratic, not a measured detection fitness. “Global peak” applies only to that predetermined function; the algorithm is not a global-optimum guarantee for arbitrary detection data.
7. **DFS description overstates security analysis (confirmed misleading):** it traverses a fixed topology and does not identify attack paths, correlate events, or discover rogue status from live traffic. DFS records lack node status; BFS metadata labels come from a static map.

The prior blank-page `V is not defined` report is not reproducible from current source inspection, and the production build passes. No browser runtime test was performed, so this is not evidence that every browser-side error has been eliminated.

## 8. Phase 2 audit: Attack Simulator

### Scenario and pipeline verification

The UI offers six keys and the backend maps each to the same identity: `brute_force`, `ransomware`, `sql_injection`, `ddos`, `dns_tunneling`, and `port_scan`. Legacy aliases such as `scenario_1` are accepted. Unknown/blank scenarios are rejected with HTTP 422 instead of silently selecting a scenario.

The focused HTTP test asserts response status, scenario title/type, incident and threat IDs, timestamp, final outcome, seven numbered steps, response status, feedback type, selected response action, and linked persisted threat/incident/response/learning records. It additionally verifies six matching `DEFENSIVE_ACTION_EXECUTED` audit rows after six scenarios. The six tests were sent through the actual FastAPI route on Uvicorn, not by calling only agent methods.

The seven stages are:

1. Network Monitoring Agent generates one synthetic event/packet record.
2. IDS scores/classifies it and inserts a threat row.
3. Correlator builds a scenario-specific fixed narrative and inserts an incident; this stage does not execute a DFS over incoming events.
4. Reasoning Agent maps the attack type to canned facts, runs forward rules, stores its explanation, and emits a fixed resolution-status string.
5. Planning Agent ranks fixed response candidates and evaluates one Game Theory move. The top ranked response is selected independently of the Game Theory recommendation; A* is not called.
6. Response Agent records a simulated response, updates a firewall/device row where relevant, and writes response/audit rows. It does not invoke a real firewall, switch, host isolation API, or account provider.
7. Learning Agent automatically records `True_Positive` for the synthetic run and returns KPI values.

The frontend receives the complete API result before playback starts. Its step controls animate review of that completed trace; they do not advance backend execution in real time. Current text describes recorded/simulated actions. Results are scenario-sensitive in attack type, event evidence, incident narrative for some cases, Game Theory move, and response choice (ransomware isolates; the other tested cases block an IP). Several step labels remain shared boilerplate; DDoS/DNS/port-scan correlation narratives use a generic branch.

### Intensity and payload checks

- `Low`, `Medium`, and `High` map to counts **1, 5, and 15**. These counts are evidence text/metadata attached to the one generated synthetic packet; they do not create 1/5/15 actual packet events or vary a network flood.
- A harmless marker was verified in the returned packet and IDS evidence and in persisted threat/incident evidence. Empty or whitespace input selects the scenario default. An exact 2048-character payload was accepted over HTTP. Payloads over 2048, non-string input, disallowed control characters, unsupported scenario, and invalid intensity returned 422. Payload content is passed as data into packet metadata and heuristic evaluation; no execution/shell/subprocess/network-send path uses it.
- Invalid simulation bodies are rejected by request validation before simulator domain writes, but HTTP middleware still records the attempted request in `audit_logs`. The focused test’s “no writes” assertion covers threat, incident, response, and learning records, not the request audit row.

### Persistence and KPI limitations

Simulator tests verify expected threat, incident, response, audit, and learning records in a disposable SQLite DB; repeated valid requests succeeded and created separate records. The IDS queries for recent duplicate source/type but still inserts a new threat row; the `is_duplicate` result is only sent in a coordinator message/returned metadata and does not deduplicate persistence.

Learning records every simulator run as `True_Positive`, with a fixed 1.45-second response time. KPI code uses fixed MTTD/MTTR, synthetic minimum counts, and default success/approval percentages when evidence is absent. Dashboard and reports therefore cannot be read as measured live operational accuracy. The weekly report values/trend/uptime/accuracy are fixed constants; the daily report floors counts at synthetic minimums and supplies sample attack categories if none exist.

## 9. Verification record

All database-mutating checks set `MACDS_DB_PATH` to a unique file below the system temporary directory before backend import/server startup. `backend/data/macds.db` was not used as a test target. The existing `frontend/dist` was not an output target.

| Check | Command/method and scope | Result |
|---|---|---|
| AI Lab HTTP integration | Temporary Uvicorn server + stdlib HTTP requests against a unique temp SQLite path. BFS, DFS, A*, Hill Climbing, Game Theory, CSP, Forward Chaining, Backward Chaining. No bearer token supplied. | **Passed:** 8 operations returned 200; required response properties validated; counts 12/12. This also confirms these algorithm routes currently accept unauthenticated requests. |
| Simulator HTTP regression | `python backend/test_simulator_api.py`, with unique temp `MACDS_DB_PATH`. Actual Uvicorn HTTP route. | **Passed:** 5 tests. Covered all six UI scenarios, response/persistence links, intensity 1/5/15, custom marker/default empty input, invalid scenario/intensity/type/length/control inputs, and alias. |
| Simulator maximum payload boundary | Additional actual HTTP request in the AI Lab integration harness using a unique temp DB. | **Passed:** 2048 characters accepted and returned as custom evidence. |
| Backend regression | `python backend/test_suite.py`, with a different unique temp `MACDS_DB_PATH`. | **Passed:** all 10 sections (DB init, hashing/token construction, coordinator, BFS/DFS, IDS, correlation, reasoning, planning, response/learning, simulator/report). A non-fatal Python launcher message said it could not find the real location of its Python executable; Python ran and exited 0. |
| Frontend production build | `npm.cmd run build -- --outDir <unique temp dir> --emptyOutDir false`. | **Passed:** Vite 6.4.3 transformed 1824 modules and wrote JS/CSS/HTML under `C:\Users\VISHAAL\AppData\Local\Temp\foai-audit-build-01b0c419e1864b82ad59fbb4c5a82af5`. No `frontend/dist` overwrite. An initial sandbox attempt hit `EPERM` resolving `src/main.jsx`; the identical temp-output build passed with required elevated execution. |
| Browser verification | No UI automation or manual browser interaction performed for this audit. | **Not run:** no claim is made about browser console, visible error presentation, retry behavior, actual loading indicator concurrency, layout, or end-to-end UI/backend behavior. User’s previously reported simulator browser observation is treated as user-reported, not reproduced evidence. |
| `git diff --check` | Executed at the project root. | No output, but `git ls-files` reports **0 tracked files** and `git status` lists the existing project contents as untracked. Git diff checks cannot validate the source tree’s cleanliness or establish which source edits predate this audit. |

The test suite’s labels (“ten-phase”, “integration”, “all passed perfectly”) should be read narrowly: most of `test_suite.py` calls Python agent methods directly. It checks JWT creation but not token verification, route auth/RBAC, all 47 HTTP routes, browser integration, WebSocket, real infrastructure, or the AI Lab error/loading behavior. `test_simulator_api.py` adds real HTTP coverage for the simulator only. The ad hoc HTTP check above covers the eight AI Lab endpoints, but not browser rendering.

## 10. Findings by category

### Confirmed defects

- AI Lab renders absent DFS node status as `undefined` and colors backward proof-tree states using a value the API never returns.
- AI Lab Game Theory/CSP text and the dashboard’s XAI panel present static or unsupported results as computed, live analysis. The 100% verified banner is not backed by end-to-end verification.
- Dashboard fallbacks invent values when the API returns zero/null: e.g. total threats defaults to 42, active incidents to 3, mitigation rate to 98.4%, and severity values to fixed counts. The AI decision pipeline itself contains fixed observations, confidence, resolution, payoff, action, log ID, and latency.
- Weekly report and agent performance fields are hard-coded. Daily counts have minimum floors and static sample categories. Learning KPIs use fixed timing and synthetic baselines. These are misleading if shown as observed operational metrics.
- Authentication is incomplete for a network-facing application: many read/data routes, all AI algorithm routes, simulator writes, exports, audit logs, and WebSocket have no auth dependency. `App.jsx` creates a display-only default Administrator when no stored user exists; protected operations still require a real token. Password hashing is unsalted SHA-256 and the JWT secret has a known development fallback. This is a confirmed deployment risk; whether these defaults are acceptable for a strictly local demo is a deployment decision.
- Some frontend data-load handlers catch errors only with `console.error`, leaving empty/stale panels without a visible user message (e.g. agents, reports, monitoring). This is confirmed by source, not browser-reproduced.

### Incomplete functionality / prototype limitations

- Fixed in-memory topology and synthetic telemetry replace packet capture and live network inventory.
- Correlation creates canned narratives from one threat rather than correlating a stream/history of actual events or traversing an observed attack graph.
- Seven-step simulation is deterministic synthetic evidence and database record creation. “Executed” means the response action was recorded; not that external infrastructure was changed.
- Coordinator communication is in-process memory and periodic state updates, not independent distributed agents or a durable bus.
- Rule recommendations and MITRE matrix are static data. No model training or policy adaptation occurs.
- SQLite is the only datastore; schema creation is not a versioned migration system. Some tables lack declared foreign-key relationships despite connection foreign-key enforcement.
- CORS allows all origins; the WebSocket does not authenticate; REST clients’ CSV/PDF helpers omit the bearer token. These configurations need a production deployment review.

### Unverified behavior

- No browser session was driven. The current localhost browser tab is not evidence that this audit exercised the app. The prior `V is not defined` report is source/build-cleared but not manually confirmed in-browser.
- No end-to-end test covered login/session expiration, unauthorized/forbidden responses for each role, protected frontend actions, WebSocket broadcasts/reconnect, report downloads, or all other routes.
- HTTP checks verified response fields for all eight AI Lab operations and all six simulator scenarios, but did not exercise the visual UI, concurrent requests, or error retry behavior in a browser.

## 11. Phase 3 recommendations (not implemented)

### Mandatory correctness and trust fixes

1. Correct the AI Lab’s false `Nash Equilibrium`, Alpha-Beta, AC-3/forward-checking, “optimal” and global claims or change the algorithms to actually support those claims. Align the payoff matrix with backend output, remove the DFS `status` access or return status data, and match proof-tree status labels.
2. Remove hard-coded dashboard “live XAI” content and synthetic fallback values from operational metric positions. Use measured API data, or label sample/demo values clearly and keep zero values as zero.
3. Correct weekly/daily reporting and KPI source behavior, or mark synthetic demonstration data explicitly. This requires coordinating any metric changes with `backend/reporting.py` and `backend/agents/learning_agent.py`; preserve API response contracts where possible.
4. Before any non-local deployment, define the intended authentication boundary, require authentication consistently (including WebSocket and simulator), replace development secret/hash defaults, and make the frontend’s displayed user state agree with backend authentication. Keep the existing role matrix rather than dropping RBAC.

### UI refinement, ordered by dependency and risk

1. **Truth and data-source corrections first (low implementation risk, high trust value):** `frontend/src/components/AIAlgorithmsLabView.jsx` for labels/statuses and computed-versus-static distinctions; `frontend/src/components/DashboardView.jsx` for fixed XAI and metric fallbacks; `frontend/src/components/ReportsView.jsx` only where values are displayed as measured. Coordinate backend metric-source choices before removing server-side fallback values.
2. **Remove default academic presentation (low risk):** `frontend/src/App.jsx` for default-on Viva banner and `frontend/src/components/Header.jsx` for the toggle. Keep normal navigation and all views.
3. **Simplify the dashboard (medium UI risk):** `frontend/src/components/DashboardView.jsx` and `frontend/src/index.css` to prioritize severity, measured incidents/threats, network activity, recent incidents, and truthful agent status; reduce gradients/glow, repeated academic headings, dense panels, and decorative labels. Preserve the existing data contracts and navigation.
4. **Apply the visual system consistently (medium risk):** `frontend/src/components/AttackSimulatorView.jsx`, `AIAlgorithmsLabView.jsx`, and shared rules in `index.css` only after their claim wording is corrected; keep the simulator’s explicit synthetic/recorded trace semantics.
5. **Browser and role regression (verification dependency):** exercise current routes and roles after each change, including narrow viewport, missing backend, HTTP failure/retry, API errors, and WebSocket state. Keep checks isolated from the user DB and never trigger simulator calls against user data.

Optional design work includes a simpler typography/spacing/color system, less panel nesting, a responsive dashboard grid, and more consistent empty/error/loading states. These are presentation changes; they do not require replacing React/FastAPI, the nine agent classes, SQLite, or the current API contracts.

## 12. Files changed for this audit

- **Created:** `PROJECT_AUDIT_PHASES_1_2.md` (this report).
- **Source files modified:** none.
- The repository had zero tracked files before this report and presented the existing source trees/docs as untracked in Git. That prevents a trustworthy Git diff from identifying prior Phase 1/2 edits. No test targeted the production database; all server/regression checks used temp database paths.
