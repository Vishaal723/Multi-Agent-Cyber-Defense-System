# MACDS local security configuration

MACDS is an academic simulation. It is not configured to connect to or protect production networks.

## Local demo

The backend requires `JWT_SECRET_KEY` (at least 32 bytes) before it initializes a database. For an isolated local demo, set a fresh signing key and explicitly opt into the seeded demo accounts before starting the backend:

```powershell
$env:MACDS_ENV = 'development'
$env:JWT_SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(48))")
$env:MACDS_DEMO_MODE = 'true'
$env:MACDS_ALLOWED_ORIGINS = 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Demo mode creates the documented local roles with fixed demonstration credentials in an empty database. These accounts are only for isolated local demonstrations. Do not enable demo mode in a deployed environment. The sign-in form does not display or prefill these credentials.

For a new non-demo database, provide `MACDS_BOOTSTRAP_ADMIN_USERNAME`, `MACDS_BOOTSTRAP_ADMIN_PASSWORD` (12–72 characters and no more than 72 UTF-8 bytes), and `MACDS_BOOTSTRAP_ADMIN_EMAIL` for the first administrator. The password is stored as bcrypt. Invalid or absent bootstrap values leave no account, and the API refuses to start until an account is configured. Remove the bootstrap variables after initialization. Existing users and data are retained; legacy SHA-256 password hashes are upgraded after a successful login.

Set `MACDS_ALLOWED_ORIGINS` to a comma-separated exact origin allowlist. Production startup rejects local origins and demo mode. Set `MACDS_COOKIE_SECURE=true` when using HTTPS. The browser session uses an HttpOnly, SameSite=Strict cookie and tokens expire after 60 minutes. Password changes do not revoke already issued tokens; those sessions remain valid until expiry. Changing the signing key invalidates all existing tokens.

## Access policy

- Public: `POST /api/auth/login`, `POST /api/auth/logout`, and FastAPI's OpenAPI/docs pages. Login must be public to establish a session; logout only clears a cookie. API documentation contains route/schema metadata, not application data.
- Every other `/api/*` route requires a valid signed, unexpired session. Administrative and write routes retain role checks. Audit reads are limited to administrators and read-only auditors. Exports are limited to administrators, analysts, and auditors. Attack simulation is limited to administrators and analysts.
- `/ws/live` requires an authenticated cookie or bearer credential and an allowlisted browser Origin. Credentials are never accepted from a URL query parameter.

For real deployments, use HTTPS, secret management, account provisioning and password rotation appropriate to the environment, and an externally protected/retained audit store. The current SQLite audit table is application-managed and is not tamper-proof against a database administrator.
