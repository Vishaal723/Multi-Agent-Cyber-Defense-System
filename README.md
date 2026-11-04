# MACDS — Multi-Agent Cyber Defense System

MACDS is an academic cybersecurity simulation and SOC-style demonstration. It uses synthetic attack scenarios, generated telemetry, and persisted local records to demonstrate agent coordination and defensive workflows. It is not connected to a production network and does not generate real attack traffic or change real infrastructure.

## Objectives

- **Problem statement:** SOC concepts such as event triage, evidence review, response planning, and agent coordination are difficult to demonstrate safely without a real operational network. MACDS provides a local synthetic environment for teaching those workflows.
- Demonstrate how specialized agents can coordinate detection, reasoning, planning, simulated response, and feedback.
- Provide working examples of search, constraint-solving, game-theory-style payoff comparison, and rule inference algorithms.
- Support evidence review and constraint-aware response planning for synthetic incidents.
- Make simulated data, measured persisted records, and unavailable measurements distinguishable.

## Technology and architecture

- Frontend: React 19, JavaScript, Vite 6, Fetch API, and browser WebSocket.
- Backend: Python, FastAPI, Pydantic, Uvicorn, and SQLite.
- Supporting libraries: bcrypt, python-jose, and ReportLab.

The React single-page application routes user actions through `frontend/src/api/client.js` to FastAPI. Vite proxies `/api` and `/ws` to the backend during development. FastAPI authenticates API requests, checks roles on protected operations, validates request models, and dispatches work to the relevant agent or workflow service. Agents and reporting functions access SQLite through `backend/database.py`. The backend broadcasts generated demo telemetry to authenticated WebSocket clients.

See [TECH_STACK_AND_ARCHITECTURE.txt](TECH_STACK_AND_ARCHITECTURE.txt) for the architecture diagram and data-flow detail.

## Nine configured agents

1. **Coordinator** — keeps an in-memory message bus, updates stored agent demo telemetry, and coordinates notifications.
2. **Network Monitoring** — provides a configured topology, BFS/DFS traversal, and generated packet and traffic data.
3. **Intrusion Detection** — scores supplied or synthetic event fields with heuristic rules and ranks threat records by a risk heuristic.
4. **Threat Correlation** — links stored threat records into incident narratives and timelines.
5. **Knowledge Base** — supplies static reference mappings and demonstration rules.
6. **Reasoning** — applies configured Horn rules and proof procedures to facts.
7. **Planning** — searches a fixed response-state graph, compares configured defender payoff values, tunes a synthetic threshold objective, and solves a fixed CSP.
8. **Response** — records simulated actions, local firewall policy rows, device isolation state, and audit events.
9. **Learning** — records analyst feedback and calculates rates from stored incidents and responses where denominators exist.

The labels and figures in the agent views describe configured roles or simulated demo telemetry; they do not establish runtime health on a real host.

## Main features

### Attack Simulator

The simulator supports six synthetic scenarios: brute force, ransomware, SQL injection, DDoS, DNS tunneling, and port scan. A run returns a seven-stage trace: synthetic event input, heuristic scoring, incident correlation, logical reasoning, response ranking/payoff comparison, simulated response, and feedback/KPI output. Runs persist generated records in the selected SQLite database. See [DEMO_GUIDE.md](DEMO_GUIDE.md).

### AI Algorithms Lab

The eight UI operations are BFS, DFS, A*, Hill Climbing, fixed defender payoff comparison, CSP backtracking, Forward Chaining, and Backward Chaining. These are configured demonstration algorithms, not live network defense. The game-theory-style operation evaluates a fixed defender payoff table for one attacker action; it does not compute a Nash equilibrium or perform minimax tree search. Its legacy request `depth` field is accepted for compatibility but is not used by this fixed comparison. Hill Climbing follows a synthetic fitness function, not observed detection measurements. The CSP returns a constraint-satisfying assignment from fixed domains; the legacy response property name `optimal_policy_assignment` does not mean a global optimization was performed.

### Investigation Workbench

For a simulator-generated incident, the workbench reads its stored threat event and configured topology, marks event endpoints separately from inferred intermediate route hops, and stores the reconstruction. Analysts can mark simulated assets as business-critical, generate three heuristic response-plan candidates, and execute a valid plan. The backend rechecks active constraints before response execution, including direct response API requests. All resulting actions affect only simulated application state.

### Dashboard and reports

Threat, incident, response, and policy counts come from persisted local records. Network traffic is generated by the demo monitor. Rates are shown only when their stored-record denominator exists; absent measurements are unavailable. Report recommendations are static examples, not generated from measured historical patterns.

## Authentication and security

API routes require a signed session except login and logout. The browser uses an HttpOnly, SameSite=Strict cookie; backend role checks protect administrative and write operations. WebSocket access requires authentication and an allowlisted Origin. Passwords use bcrypt; legacy SHA-256 password rows are upgraded on successful login. Configure a JWT signing key and the first account before starting the backend.

Read [backend/SECURITY.md](backend/SECURITY.md) before running the app. Demo mode is for isolated local demonstrations only. Do not use demo credentials or demo mode in a deployment. Existing passwords remain valid after a password change until their existing token expires (60 minutes). SQLite audit rows are application-managed and are not tamper-proof against a database administrator.

## Windows PowerShell setup

Use Python and Node.js already installed on the machine. Install backend packages in a virtual environment without needing to activate it:

```powershell
cd F:\FOAI\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

For a disposable local demo database, open a backend PowerShell window and configure that process before starting Uvicorn:

```powershell
cd F:\FOAI\backend
$env:MACDS_DB_PATH = Join-Path $env:TEMP ("macds-demo-" + [guid]::NewGuid().ToString("N") + ".db")
$env:JWT_SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(48))")
$env:MACDS_ENV = 'development'
$env:MACDS_DEMO_MODE = 'true'
$env:MACDS_ALLOWED_ORIGINS = 'http://localhost:5173'
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Then open another PowerShell window for the frontend:

```powershell
cd F:\FOAI\frontend
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

The temporary database path is printed in the backend window. The temporary database is separate from `backend/data/macds.db`. To use a provisioned administrator instead of local demo accounts, follow the bootstrap instructions in `backend/SECURITY.md`; keep bootstrap values out of tracked files. Stop each server with `Ctrl+C` in its own window.

## Tests and checks

Run backend regression tests only after setting `MACDS_DB_PATH` to a new temporary SQLite path and configuring a test-only `JWT_SECRET_KEY`, `MACDS_DEMO_MODE=true`, and `MACDS_ENV=test` in that process:

```powershell
python backend/test_suite.py
```

The HTTP integration suite starts a local Uvicorn server and requires `MACDS_DB_PATH` to point under the system temporary directory:

```powershell
python backend/test_simulator_api.py
```

For a build that preserves the existing `frontend/dist` directory, use a unique temporary output directory:

```powershell
$buildPath = Join-Path $env:TEMP ("macds-build-" + [guid]::NewGuid().ToString("N"))
cd F:\FOAI\frontend
npm.cmd run build -- --outDir $buildPath
```

The frontend package currently defines `dev`, `build`, and `preview` scripts; it does not configure a separate lint or frontend unit-test command.

## Known limitations and future work

- All network events and actions are simulated; the application does not inspect or protect a real network.
- Telemetry is generated locally. Agent state and resource values are not host-health measurements.
- Payoff values, response ranking utilities, response confidence/effectiveness fields, and Hill Climbing fitness are fixed demonstration assumptions rather than empirically calibrated measurements.
- There is no external threat-intelligence synchronization or enterprise MITRE integration.
- Password changes do not immediately revoke other active sessions; tokens expire after 60 minutes.
- SQLite audit records can be altered by someone with direct database access.
- Browser end-to-end coverage depends on starting the backend and frontend in an isolated local environment; API tests alone do not establish visual correctness.
- Future work may add a browser test harness, measured evaluation datasets, explicit token revocation, and externally protected audit retention.

## Project evaluation

See [PROJECT_EVALUATION_SUMMARY.md](PROJECT_EVALUATION_SUMMARY.md) for implemented and tested features, work not verified end to end, simulated functionality, limitations, and future improvements.
