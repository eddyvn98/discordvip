# Security Best Practices Report

## Executive Summary

The running Docker deployment has multiple high-impact security failures that are exploitable right now. The most severe issue is a full admin authentication bypass enabled in the live `app-server` container, which allows anyone to mint an admin session without Discord OAuth. The deployment also exposes PostgreSQL directly on `0.0.0.0:5432` with default credentials and accepts SePay webhook traffic without any shared-secret verification in the current runtime configuration. In addition, the web tier lacks basic hardening headers and the admin cookie flow still trusts an unvalidated post-login redirect target.

## Critical

### Finding 1
- Rule ID: EXPRESS-AUTH-001 / EXPRESS-SESS-002
- Severity: Critical
- Location: `apps/server/src/services/auth-service.ts:33-41`, `apps/server/src/services/auth-service.ts:59-70`
- Evidence:
  - When `DEV_BYPASS_ADMIN_AUTH` is true, `createLoginUrl()` writes `session.adminUser = { id: "local-admin", ... }` and returns `session.returnTo` immediately.
  - `handleCallback()` does the same bypass and returns `session.returnTo` without OAuth validation.
  - Runtime verification on the running container showed `DEV_BYPASS_ADMIN_AUTH=true`.
  - Runtime verification showed `GET /api/auth/discord/login?...` issued a session cookie, and a follow-up request to `GET /api/admin/me` returned `{"user":{"id":"local-admin","username":"Local Admin","avatarUrl":null}}`.
- Impact: Any network client that can reach the app can self-issue an authenticated admin session and access privileged admin APIs.
- Fix: Remove the bypass from any deployable environment, require a dedicated non-production flag that is never loaded in Docker production/staging, and fail startup if `DEV_BYPASS_ADMIN_AUTH=true` outside a local development profile.
- Mitigation: Immediately stop public exposure of the current container or block `/api/auth/*` and `/api/admin/*` at the edge until the app is restarted with the bypass disabled.
- False positive notes: None. This was confirmed against the live Docker deployment.

### Finding 2
- Rule ID: EXPRESS-INJECT-001 / deployment hardening
- Severity: Critical
- Location: `docker-compose.yml:2-10`
- Evidence:
  - PostgreSQL is published with `ports: - "5432:5432"`.
  - The compose file sets `POSTGRES_USER: postgres` and `POSTGRES_PASSWORD: postgres`.
  - Runtime container inspection confirmed the database is bound on `0.0.0.0:5432` with those default credentials.
- Impact: Anyone with network reachability to the host can attempt direct database login using well-known credentials, leading to full data disclosure and tampering.
- Fix: Remove the host port mapping unless external DB access is strictly required, bind to `127.0.0.1` if local-only access is needed, rotate credentials immediately, and move secrets to non-default values outside source-controlled defaults.
- Mitigation: Restrict host firewall access to port 5432 immediately and rotate the database password before re-exposing the service.
- False positive notes: None. The port exposure and default credentials are present in both compose and runtime state.

## High

### Finding 3
- Rule ID: EXPRESS-CSRF-001 / webhook authentication
- Severity: High
- Location: `apps/server/src/http/webhooks.ts:39-46`, `apps/server/src/lib/sepay.ts:68-83`
- Evidence:
  - The webhook route only verifies a signature when `env.SEPAY_WEBHOOK_SECRET` is non-empty.
  - `verifySepaySignature()` explicitly returns `true` when `secret` is empty.
  - Runtime container inspection confirmed `SEPAY_WEBHOOK_SECRET=` while `PAYMENT_MODE=sepay`.
  - A live POST to `/api/webhooks/sepay` was accepted up to payload validation and was not rejected for missing signature.
- Impact: Anyone who knows or can obtain a valid pending order code and amount can forge a payment webhook and trigger VIP activation or payment state changes without paying.
- Fix: Make `SEPAY_WEBHOOK_SECRET` mandatory whenever `PAYMENT_MODE=sepay`, fail startup if it is missing, and reject unsigned webhook requests unconditionally in that mode.
- Mitigation: Block public access to the webhook endpoint at the edge until a valid shared secret is configured.
- False positive notes: I did not complete a forged payment end-to-end because that would require a real pending order code, but the authentication gate is absent in the live runtime.

### Finding 4
- Rule ID: EXPRESS-REDIRECT-001
- Severity: High
- Location: `apps/server/src/services/auth-service.ts:40-46`, `apps/server/src/services/auth-service.ts:123-125`
- Evidence:
  - `session.returnTo = returnTo || env.ADMIN_APP_URL` stores an unvalidated attacker-supplied destination.
  - After login/callback, the app returns `redirectTo: session.returnTo || env.ADMIN_APP_URL`.
  - Live verification: requesting `/api/auth/discord/login?returnTo=https://evil.example` returned `Location: https://evil.example`.
- Impact: Attackers can use the trusted domain to bounce users to phishing or malware destinations, and in the current bypassed runtime this also chains with instant session issuance.
- Fix: Allow only same-site relative paths or a strict allowlist of exact origins, and fall back to `env.ADMIN_APP_URL` when validation fails.
- Mitigation: Strip or ignore `returnTo` at the reverse proxy until the backend validates it.
- False positive notes: None. The redirect was reproduced live.

## Medium

### Finding 5
- Rule ID: EXPRESS-HEADERS-001 / EXPRESS-FINGERPRINT-001 / REACT-HEADERS-001
- Severity: Medium
- Location: `apps/server/src/http/app.ts:50-99`, `nginx/demo.conf:1-35`
- Evidence:
  - The Express app does not use `helmet()` and does not call `app.disable('x-powered-by')`.
  - The Nginx config sets no `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`.
  - Live responses from `/`, `/health`, and `/api/admin/me` included `X-Powered-By: Express` and omitted the headers above.
- Impact: The app is easier to fingerprint and has weaker browser-side protection against clickjacking, MIME confusion, and some XSS exploitation paths.
- Fix: Add `helmet()` in Express or equivalent headers in Nginx/Cloudflare, disable `x-powered-by`, and define a realistic CSP for the admin SPA.
- Mitigation: If edge-managed headers already exist for the public domain, verify them there and keep app/nginx config aligned to avoid drift.
- False positive notes: This finding is based on direct runtime header inspection and the checked-in nginx/app config.

### Finding 6
- Rule ID: EXPRESS-CSRF-001
- Severity: Medium
- Location: `apps/server/src/http/app.ts:83-98`, `apps/server/src/http/admin.ts:105-240`, `apps/admin/src/api.ts:7-14`
- Evidence:
  - The admin panel uses cookie-backed sessions with `credentials: "include"`.
  - Multiple state-changing admin routes (`POST /api/admin/...`, `POST /api/auth/logout`) rely only on session presence.
  - No CSRF token middleware, Origin/Referer validation, or custom anti-CSRF header enforcement is present.
  - The session cookie uses `SameSite=Lax`, which helps, but no stronger server-side CSRF control exists.
- Impact: Browser-enforced `SameSite=Lax` reduces exposure, but the app still lacks a robust CSRF control layer and could become vulnerable if cookie settings change, a cross-site GET side effect is introduced, or certain browser edge cases are hit.
- Fix: Add a CSRF token or at least strict Origin/Referer validation plus a required custom header for state-changing admin requests.
- Mitigation: Keep `SameSite=Lax` or stronger, and avoid adding any state-changing GET routes.
- False positive notes: This is not as severe as the auth bypass because `SameSite=Lax` materially reduces classic cross-site POST abuse.

## Recommended Remediation Order

1. Disable `DEV_BYPASS_ADMIN_AUTH` in the running container and redeploy.
2. Remove PostgreSQL public exposure, rotate DB credentials, and verify host firewall rules.
3. Set and enforce `SEPAY_WEBHOOK_SECRET`, then redeploy before trusting payment automation.
4. Validate `returnTo` against a strict allowlist.
5. Add security headers and a production-safe CSRF strategy for the admin panel.

