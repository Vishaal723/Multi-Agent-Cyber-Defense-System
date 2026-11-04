# MACDS Project Evaluation Summary

**Assessment: Not yet ready for presentation.** The core simulation is implemented, and isolated backend regression and frontend build checks pass. Before presenting, a fresh isolated application still needs to pass the authentication, protected-dashboard, simulator, and investigation-constraint preflight. The Phase 7 HTTP suite and fresh-instance browser workflows remain unverified.

## Implemented and tested

- Nine configured agents and SQLite persistence are present.
- Backend regression suite: 10/10 suites passed against a fresh temporary SQLite database on 2026-11-04. Coverage includes initialization, auth/hash/JWT basics, coordinator telemetry, BFS, IDS, correlation, reasoning, planning, response/learning, simulator, and reports.
- Frontend production build passed to a unique system-temporary output directory; the existing `frontend/dist` was not overwritten.
- The Phase 7 HTTP integration suite did not execute: sandbox loopback connection attempts failed with `PermissionError: [WinError 10013]` before Uvicorn became reachable. No Phase 6 HTTP result is counted as a Phase 7 result.
- The greedy-search handler returned an empty list when directly checked against a fresh temporary database. An HTTP regression assertion for this behavior was added, but that assertion did not run because the HTTP suite could not start.
- The fixed payoff evaluation and simulator ranking descriptions now avoid unsupported minimax, equilibrium, and globally optimal claims.

## Implemented but not verified end to end

- Login/logout, session expiry, role-gated browser navigation, API error recovery, and all screen-to-screen flows were not exercised through an authenticated browser in this pass.
- Attack simulation and investigation were not run through the browser. The integration test suite contains these workflows, but its current Phase 7 run was blocked before tests executed.
- Current browser observation at `http://localhost:5174/` showed a dashboard with a `Sign in` header, `Failed to fetch`, and unavailable telemetry. The checked-in `App.jsx` gates dashboard content until session validation; because this running page could not reach a backend or be matched to the current source bundle, treat it as a running-instance/source discrepancy to recheck after a fresh start. It did not demonstrate a working authenticated application. The inspected viewport was not a desktop-size verification.
- No frontend lint or dedicated frontend unit-test script is configured in `frontend/package.json`.

## Simulated functionality

- All six attack scenarios use synthetic inputs and persist application records; no real attack traffic is sent.
- Network telemetry and agent resource figures are generated demo values, not production sensor data or host-health checks.
- Response actions update local simulated database records only.
- The Investigation Workbench combines a stored simulator event with topology-inferred route hops; inferred hops are not observed network evidence.
- AI Lab methods operate on fixed topology, policy, rules, payoff tables, or synthetic fitness functions. The game-theory-style view compares fixed defender payoffs for one attacker action; it does not compute minimax, a Nash equilibrium, or an adversarial search tree.
- Rule recommendations are static examples. MITRE content is reference data, not a live enterprise integration.

## Known limitations

- Phase 7 HTTP integration was not verified. The sandbox permitted a loopback bind but rejected the client connection with `PermissionError: [WinError 10013]`; the test harness then timed out waiting for Uvicorn readiness, and zero tests ran. Its HTTP tests use Python's standard-library client. `fastapi.testclient.TestClient` is also unavailable because `httpx2` is absent; no dependency was installed.
- Phase 7 browser workflow verification remains incomplete. The only observed page showed a backend fetch failure. Do not treat the running `localhost:5174` page as a successful integration test.
- Fixed response confidence/effectiveness and utility values are demonstration assumptions, not calibrated measurements. Learning feedback records an illustrative fixed response duration; measured MTTD/MTTR are unavailable.
- Password changes do not revoke already issued tokens before their 60-minute expiry.
- SQLite audit records can be changed by an actor with direct database access.
- No performance benchmark, attack-detection accuracy study, or production deployment review has been performed.

## Future improvements

- Run the HTTP integration suite and authenticated browser walkthrough in an environment that permits local Uvicorn binding, still using a disposable database.
- Add a maintained browser automation suite after deciding on the test tooling.
- Replace fixed scoring assumptions with documented, measured datasets before making accuracy or effectiveness claims.
- Consider session revocation and externally retained/tamper-resistant audit storage for a deployment-oriented phase.

## Readiness boundary

Do not present MACDS until the fresh-instance preflight in `DEMO_GUIDE.md` passes. MACDS is not production-ready and should not be described as a live network defense or validated detection product.
