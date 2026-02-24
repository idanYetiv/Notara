# Chrome Web Store Submission Checklist — Notara

Step-by-step guide to submit Notara to the Chrome Web Store.

---

## Prerequisites

- [ ] Chrome Web Store Developer account ($5 one-time fee) — [Register here](https://chrome.google.com/webstore/devconsole)
- [ ] Extension tested locally and working

---

## Step 1: Build the Extension

```bash
cd ~/Notara
npm run build
```

This creates the production build in `dist/`.

---

## Step 2: Create the ZIP File

```bash
cd dist
zip -r ../notara-v1.0.0.zip .
cd ..
```

> **Important:** Zip the *contents* of `dist/`, not the folder itself. The `manifest.json` must be at the root of the zip.

---

## Step 3: Capture Screenshots

1. Open `tools/generate-assets.html` in Chrome
2. For each of the 5 screenshot slides:
   - Use DevTools → **Ctrl+Shift+P** → "Capture node screenshot"
   - Select the slide element (1280×800)
   - Save as `screenshot-1.png` through `screenshot-5.png`
3. Capture the promo tile (440×280) the same way
   - Save as `promo-tile-440x280.png`

Screenshots:
1. Hero — "Floating Sticky Notes for Any Website"
2. Note Editor — color picker, formatting, screenshots
3. Sign In — Google sign-in flow
4. Alerts — reminder scheduling
5. Global Panel — all notes organized by site

---

## Step 4: Go to the Developer Dashboard

Open [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

---

## Step 5: Upload the Extension

1. Click **"New Item"**
2. Upload `notara-v1.0.0.zip`
3. Wait for it to process

---

## Step 6: Fill in Store Listing

Copy from [`store/listing.md`](./listing.md):

| Field | Value |
|-------|-------|
| **Name** | Notara |
| **Short description** | Floating sticky notes on any website. Create, color-code, and organize notes right where you need them. Screenshot capture included. |
| **Detailed description** | *(Copy the full detailed description from listing.md)* |
| **Category** | Productivity |
| **Language** | English |

---

## Step 7: Upload Visual Assets

| Asset | Size | File |
|-------|------|------|
| Extension icon | 128×128 | `public/icon-128.png` |
| Screenshot 1 | 1280×800 | Hero slide |
| Screenshot 2 | 1280×800 | Note Editor slide |
| Screenshot 3 | 1280×800 | Sign In slide |
| Screenshot 4 | 1280×800 | Alerts slide |
| Screenshot 5 | 1280×800 | Global Panel slide |
| Small promo tile | 440×280 | Promo tile |

---

## Step 8: Privacy Practices Questionnaire

Answer the CWS privacy practices questions as follows:

### Single Purpose Description
> Notara lets users create floating sticky notes on any website for personal note-taking, with color coding, screenshots, and reminders.

### Permission Justifications

| Permission | Justification |
|---|---|
| `storage` | Required to save your sticky notes locally in the browser so they persist across sessions. |
| `activeTab` | Required to create and display notes on the page you are currently viewing. |
| `contextMenus` | Provides a right-click "Add note" option for quickly creating notes on any page. |
| `alarms` | Used to schedule alert reminders that you set on individual notes. |
| `notifications` | Used to display browser notifications when a note's scheduled alert fires. |
| `identity` | Enables Google sign-in for account authentication. |
| `<all_urls>` (host permission) | Required to display your saved notes on any website you visit. |

### Data Usage Disclosures

**Does your extension collect or transmit user data?** Yes

| Data Type | Collected? | Usage |
|---|---|---|
| Personally identifiable info | Yes | Google profile (name, email, photo) for authentication display only. Not transmitted to our servers. |
| Health info | No | — |
| Financial info | No | — |
| Authentication info | Yes | OAuth tokens stored locally to maintain sign-in state. |
| Personal communications | No | — |
| Location | No | — |
| Web history | No | — |
| User activity | No | — |
| Website content | No | — |

**Are you using remote code?** No

**Data usage certifications:**
- [x] I do not sell user data to third parties
- [x] I do not use or transfer user data for purposes unrelated to the item's core functionality
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## Step 9: Set Privacy Policy URL

Enter the URL where your privacy policy is hosted.

Options:
- GitHub Pages: `https://idanyetiv.github.io/Notara/docs/privacy-policy.html`
- Or host `docs/privacy-policy.html` anywhere publicly accessible

> **Note:** The privacy policy URL must be publicly accessible — CWS reviewers will verify it.

---

## Step 10: Submit for Review

1. Review all fields one final time
2. Click **"Submit for Review"**
3. Typical review time: 1–3 business days (can take longer for first submission)

---

## Post-Submission

- [ ] Monitor the Developer Dashboard for review status
- [ ] Check email for any reviewer feedback or rejection reasons
- [ ] Once approved, update the CWS link in `landing/index.html` (replace `#` placeholders)
- [ ] Update `store/listing.md` with the live store URL

---

## Quick Reference: Key Files

| File | Purpose |
|------|---------|
| `store/listing.md` | CWS description + permission justifications |
| `docs/privacy-policy.html` | Privacy policy page |
| `docs/terms.html` | Terms of Service page |
| `tools/generate-assets.html` | Screenshot & promo tile mockups |
| `public/icon-128.png` | Extension icon (128×128) |
