# Notara Open Tasks

**Last Updated:** August 1, 2026
**Status:** Launch-ready v1.0 — core features, auth, Sentry, PostHog, feedback, 41 tests passing.

---

## Pre-Launch

| # | Task | Description | Size | Status |
|---|------|-------------|------|--------|
| 1 | **CWS Screenshots** | Capture promotional PNGs from mockup tool | S | Open |
| 2 | **Chrome Web Store Submission** | Submit for review with screenshots + metadata | M | Open |

---

## Security

| # | Task | Description | Size | Status |
|---|------|-------------|------|--------|
| 3 | **Dependency Audit** | `npm audit`, review supply chain, pin critical deps | S | Done |
| 4 | **CSP Tightening** | Review `connect-src` whitelist, ensure no unnecessary wildcards | S | Done |
| 5 | **Note Content Sanitization** | XSS prevention when rendering user-entered note text | M | Done |
| 6 | **Auth Token Review** | Full audit of token handling — storage, transmission, logging | S | Done |
| 7 | **Storage Encryption** | Evaluate encrypting note content in `chrome.storage.sync` | M | Done (evaluated — not needed for Phase 1) |

---

## Phase 2 — Post-Launch

| # | Task | Description | Size | Status |
|---|------|-------------|------|--------|
| 8 | **Flexible Sticky Notes** | Pin a note to a specific DOM element on the page | L | Open |
| 9 | **DB Sync** | Sync notes to Supabase for cross-device access | L | Open |
| 10 | **Payments (Stripe/Pro)** | Premium tier with Stripe integration | L | Open |
| 11 | **Cross-Device Sync** | Real-time sync across browsers/devices | L | Open |

---

*Last updated: August 1, 2026*
