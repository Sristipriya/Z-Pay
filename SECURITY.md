# ExpoPay Security Policy

## Security Posture

ExpoPay is currently deployed on Stellar Testnet. This document outlines implemented and planned security measures.

## ✅ Implemented

### Authentication & Authorization
- [x] **Server-side `getUser()`** on every API route — no route relies solely on client-side auth
- [x] **Middleware auth gate** — unauthenticated requests to `/dashboard/*` are redirected to login
- [x] **Admin RBAC** — arbiter/admin routes verified via `ADMIN_EMAILS` env var

### Transaction Security
- [x] **4-digit transaction PIN** — required for all fund-moving actions (send, merchant pay, escrow release/refund, unstake, pool withdraw)
- [x] **Duplicate transaction check** — 10-second idempotency window prevents double-spends
- [x] **On-chain audit trail** — every action produces a Stellar `tx_hash` verifiable on [Stellar Expert](https://stellar.expert/explorer/testnet)

### Session Security
- [x] **Inactivity guard** — auto-logout after 15 minutes of inactivity; visibility-aware (does not fire while app is backgrounded)
- [x] **Supabase session cookies** — Supabase handles secure cookie management

### Infrastructure
- [x] **`SUPABASE_SERVICE_ROLE_KEY` guard** — server refuses to start in production if key is missing
- [x] **Structured event logging** — critical events written to `app_logs` with level, route, user_id
- [x] **Fee Bump privacy** — gasless transactions keep user keypairs server-side; fee_source on-chain is platform wallet only

---

## ⚠️ Partial / In Progress

### Credential Security
- [ ] **Hash `app_pin` with bcrypt** — currently stored plaintext; migration needed
  ```sql
  -- After migration: UPDATE profiles SET app_pin_hash = crypt(app_pin, gen_salt('bf'))
  ```
- [ ] **Encrypt `stellar_secret` at rest** — AES-256-GCM with `ENCRYPTION_KEY` env var planned

### Rate Limiting
- [ ] **Auth endpoints** — `/api/auth/*`, `/api/expo/claim` (target: 10 req/min per IP)
- [ ] **Admin endpoints** — `/api/admin/resolve` (target: 5 req/min per admin)
- [ ] **Payment endpoints** — `/api/payments/send`, `/api/payments/gasless`

---

## 🔴 Backlog (Required Before Mainnet)

- [ ] **Role-based admin** — migrate from `ADMIN_EMAILS` env var to `profiles.role` DB column
- [ ] **Smart contract audit** — formal audit of escrow, staking, and pool contracts
- [ ] **Hardware wallet signing** — Ledger/Trezor support for key management
- [ ] **2FA** — TOTP-based two-factor authentication for admin accounts
- [ ] **CSP headers** — Content-Security-Policy headers via `next.config.ts`
- [ ] **Secret rotation** — procedure for rotating `PLATFORM_SECRET_KEY` without downtime

---

## Reporting Security Issues

Please report security vulnerabilities by email rather than opening a public GitHub issue.  
Contact: [expopay8@gmail.com]

---

## Dependencies

Key security-relevant dependencies:
- `@supabase/supabase-js` — auth and database
- `@stellar/stellar-sdk` — blockchain signing and verification
- `next` — server-side rendering and API routes

All dependencies are kept up to date. Run `npm audit` regularly.
