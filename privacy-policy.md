# Privacy Policy — Notara

**Effective date:** February 21, 2026

Notara is a Chrome extension that lets you create floating sticky notes on any website. This policy explains what data the extension accesses and how it is handled.

---

## Data We Collect

### Notes & Screenshots
All notes you create (text, color, position, scope) and any screenshots you capture are stored **locally** on your device using Chrome's built-in storage API (`chrome.storage.sync`). This data never leaves your browser unless Chrome's built-in sync is enabled in your browser settings, in which case Chrome itself may sync it across your signed-in devices.

### Google Account Information
When you sign in with Google, we receive your name, email address, and profile picture from Google OAuth. This information is used solely to display your profile inside the extension and to authenticate your session.

### Authentication Tokens
Session and refresh tokens are stored locally via `chrome.storage.local` and `chrome.storage.session`. They are used only to maintain your signed-in state.

---

## Chrome Permissions

| Permission | Why we need it |
|---|---|
| `storage` | Save your sticky notes locally |
| `activeTab` | Create notes on the page you're viewing |
| `contextMenus` | Provide a right-click "Add note" menu |
| `alarms` | Schedule alert reminders for notes |
| `notifications` | Display alert reminders as browser notifications |
| `identity` | Enable Google sign-in via Chrome |
| `<all_urls>` (host permission) | Display your notes on any website you visit |

---

## Third-Party Services

- **Supabase** — Handles authentication only. Your email and profile info are stored in Supabase's auth system to manage sign-in sessions. Supabase's privacy policy: https://supabase.com/privacy
- **Google OAuth** — Used for sign-in. Google's privacy policy: https://policies.google.com/privacy

No other third-party services receive your data.

---

## What We Do NOT Do

- We do **not** sell, share, or transfer your data to third parties.
- We do **not** use your data for advertising, analytics, or tracking.
- We do **not** collect browsing history or monitor your activity.

---

## Data Storage & Security

All note data is stored locally in your browser using `chrome.storage`. Authentication tokens are stored locally in `chrome.storage.local` and `chrome.storage.session`. No note content is transmitted to any server.

---

## Deleting Your Data

1. **Notes:** Remove individual notes from the extension panel, or uninstall the extension to delete all note data.
2. **Account:** Sign out from the extension panel to clear your local session. Uninstalling the extension removes all locally stored data.
3. **Supabase account:** To request deletion of your auth record, contact us at the email below.

---

## Changes to This Policy

If we update this policy, we will revise the effective date above. Continued use of the extension after changes constitutes acceptance.

---

## Contact

For questions or data deletion requests, email: **idanyativ@gmail.com**
