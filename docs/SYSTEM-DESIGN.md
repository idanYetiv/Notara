# Notara — System Design

> Technical reference for the Notara Chrome extension architecture.

---

## Part A — High-Level Overview

### Architecture

```
┌─────────────────┐     chrome.runtime      ┌──────────────────┐
│   Content        │ ◄──── messages ────►    │    Background     │
│   Script         │                         │  Service Worker   │
│  (React 19)      │                         │                   │
│                  │                         │  - Auth handler   │
│  - FloatingPanel │                         │  - Alarm manager  │
│  - StickyNote    │                         │  - Badge updater  │
│  - AlertToast    │                         │  - Context menus  │
│  - GlobalPanel   │                         │                   │
└────────┬─────────┘                         └────────┬──────────┘
         │                                            │
         │ chrome.storage.sync                        │ chrome.identity
         │ (notes, alerts, pro)                       │ (OAuth flow)
         ▼                                            ▼
┌──────────────────┐                         ┌──────────────────┐
│   Chrome          │                         │    Supabase      │
│   Storage API     │                         │    Auth          │
│  sync / local /   │                         │  (Google OAuth)  │
│  session          │                         │                  │
└──────────────────┘                         └──────────────────┘
```

### Component Map

```
ContentApp
├── AlertToast              # Page-load alerts, auto-dismiss 6s
├── FloatingPanel           # Main UI panel (auth-gated)
│   ├── GlobalPanel         # Left overlay — all notes/alerts by domain
│   ├── ScheduleModal       # Alert scheduler (daily/weekly/custom)
│   └── Auth-gated content
│       ├── NoteCard[]      # Inline-editable note cards
│       └── AlertCard[]     # Inline-editable alert cards
├── StickyNote[]            # Draggable, resizable on-page notes
│   ├── NoteEditor          # Rich text editing
│   └── ScreenshotButton    # Capture + embed screenshot
└── UpgradeModal            # Shown when free limit reached
```

### Data Flow

```
User action → React hook → Storage API → chrome.storage.sync → UI refresh
                ↓ (if alert/auth)
          chrome.runtime.sendMessage → Background service worker
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome Manifest V3 |
| UI | React 19 + TypeScript |
| Build | Vite + @crxjs/vite-plugin |
| Styling | Tailwind CSS v4 (inline styles for isolation) |
| Storage | Chrome Storage API (sync, local, session) |
| Auth | Supabase Auth + Google OAuth via `chrome.identity` |
| Screenshots | html2canvas |
| Testing | Vitest + Testing Library |

---

## Part B — Detailed Deep-Dive

### 1. Storage Schema

#### Storage Locations

| Area | Storage | Purpose |
|------|---------|---------|
| Notes & alerts | `chrome.storage.sync` | Synced across signed-in Chrome instances |
| Supabase refresh token | `chrome.storage.local` | Persistent, not synced |
| User profile cache | `chrome.storage.session` | Cleared when browser closes |
| Pro status | `chrome.storage.sync` | Synced |

#### Key Patterns

| Key | Content | Scope |
|-----|---------|-------|
| `notara_page_{url}` | `Note[]` | Notes pinned to a specific page |
| `notara_site_{hostname}` | `Note[]` | Notes visible across an entire domain |
| `notara_alert_page_{url}` | `Alert[]` | Alerts for a specific page |
| `notara_alert_site_{hostname}` | `Alert[]` | Alerts for an entire domain |
| `notara_alert_global_all` | `Alert[]` | Global scheduled alerts |
| `notara_pro` | `boolean` | Pro tier flag |
| `notara_auth_profile` | `UserProfile` | Cached auth profile (session storage) |

Defined in `src/lib/storage.ts` (prefixes) and `src/lib/auth.ts` (auth key).

Legacy migration: `migrateFromWebNoter()` converts `webnoter_*` keys to `notara_*`.

#### Note Interface

```typescript
// src/lib/types.ts
interface Note {
  id: string;              // crypto.randomUUID()
  url: string;             // Full URL or hostname
  scope: NoteScope;        // "page" | "site" | "global"
  text: string;            // Note content
  color: NoteColor;        // "yellow" | "pink" | "blue" | "green" | "purple"
  position: NotePosition;  // { x: number; y: number }
  size: NoteSize;          // { w: number; h: number }
  minimized: boolean;      // Collapsed state
  screenshot?: string;     // Base64 data URL (thumbnail)
  createdAt: number;       // Date.now()
  updatedAt: number;       // Date.now()
}

type NoteScope = "page" | "site" | "global";
type NoteColor = "yellow" | "pink" | "blue" | "green" | "purple";

const NOTE_COLORS: Record<NoteColor, string> = {
  yellow: "#ca8a04",
  pink:   "#e11d48",
  blue:   "#3b82f6",
  green:  "#22c55e",
  purple: "#8b5cf6",
};
```

#### Alert Interface

```typescript
// src/lib/types.ts
interface Alert {
  id: string;                // crypto.randomUUID()
  url: string;               // Full URL or hostname
  scope: NoteScope;          // "page" | "site" | "global"
  message: string;           // Alert text
  enabled: boolean;          // Toggle on/off
  schedule?: AlertSchedule;  // Optional scheduling config
  createdAt: number;
  updatedAt: number;
}

interface AlertSchedule {
  type: "daily" | "weekly" | "custom";
  dayOfWeek?: number;        // 0=Sun, 6=Sat (weekly only)
  timeOfDay: string;         // "HH:MM" (daily/weekly)
  intervalMinutes?: number;  // Custom interval
  alarmName: string;         // Unique Chrome alarm ID
}
```

#### Storage API Functions (`src/lib/storage.ts`)

**Notes:**
- `getNotesForUrl(url)` — page + site notes for a URL
- `getPageNotes(url)` / `getSiteNotes(hostname)` — scope-specific
- `getAllNotes()` — all notes grouped by storage key
- `saveNote(note)` / `updateNote(note, updates)` / `deleteNote(note)`
- `changeNoteScope(note, newScope)` — moves note between storage keys
- `getNoteCountForUrl(url)` — for badge count

**Alerts:**
- `getAlertsForUrl(url)` — page + site alerts
- `getAllAlerts()` — all alerts grouped by key
- `saveAlert(alert)` / `updateAlert(alert, updates)` / `deleteAlert(alert)`
- `saveGlobalAlert(alert)` / `deleteGlobalAlert(alertId)`

---

### 2. Auth Sequence

#### Sign-In Flow

```
Content Script                    Background Service Worker              External
     │                                    │                                  │
     │  SIGN_IN_GOOGLE                    │                                  │
     ├───────────────────────────────────►│                                  │
     │                                    │  1. Generate raw nonce           │
     │                                    │     (crypto.randomUUID)          │
     │                                    │  2. SHA-256 hash nonce           │
     │                                    │     (crypto.subtle.digest)       │
     │                                    │                                  │
     │                                    │  launchWebAuthFlow               │
     │                                    ├─────────────────────────────────►│ Google OAuth
     │                                    │                                  │
     │                                    │  id_token (in redirect URL)      │
     │                                    │◄─────────────────────────────────┤
     │                                    │                                  │
     │                                    │  signInWithIdToken               │
     │                                    │  (provider: "google",            │
     │                                    │   token: idToken,                │
     │                                    │   nonce: rawNonce)               │
     │                                    ├─────────────────────────────────►│ Supabase Auth
     │                                    │                                  │
     │                                    │  session + user                  │
     │                                    │◄─────────────────────────────────┤
     │                                    │                                  │
     │                                    │  3. Cache profile →              │
     │                                    │     chrome.storage.session       │
     │                                    │  4. Refresh token →              │
     │                                    │     chrome.storage.local         │
     │                                    │                                  │
     │  { success: true, user }           │                                  │
     │◄───────────────────────────────────┤                                  │
```

Implementation: `handleGoogleSignIn()` in `src/background/background.ts`.

#### Sign-Out Flow

```
Content → SIGN_OUT → Background → supabase.auth.signOut() → clear session storage
```

#### Session Rehydration

On `runtime.onInstalled` and `runtime.onStartup`, the background calls `rehydrateAuth()` to restore the Supabase session from `chrome.storage.local`.

#### Custom Storage Adapter

Service workers cannot use `localStorage`. A custom `chromeStorageAdapter` wraps `chrome.storage.local` with the Supabase `StorageAdapter` interface (`src/lib/supabase.ts`).

---

### 3. Content Script Architecture

#### Injection Strategy (`src/content/content.tsx`)

```typescript
const container = document.createElement("div");
container.id = "notara-root";
container.style.cssText = `
  all:initial;
  position:fixed;
  top:0; left:0;
  width:0; height:0;
  z-index:2147483647;
  pointer-events:none;
`;
document.body.appendChild(container);

const inner = document.createElement("div");
inner.id = "notara-container";
inner.style.pointerEvents = "auto";
container.appendChild(inner);

createRoot(inner).render(<ContentApp />);
```

No Shadow DOM — uses CSS isolation via `all:initial` on the root container.

#### Z-Index Strategy

| Element | Z-Index | Purpose |
|---------|---------|---------|
| Root container | `2147483647` | Above all page content |
| FloatingPanel | `2147483647` | Main panel |
| ScheduleModal | `2147483647` | Modal overlay |
| UpgradeModal | `2147483647` | Modal overlay |
| AlertToast | `2147483647` | Notification toast |
| StickyNote | `2147483646` | One layer below panel |

#### Style Isolation

- `all:initial` resets inherited styles on root
- All components use inline `style` objects (not class names)
- Explicit `fontFamily: "system-ui, -apple-system, sans-serif"` on all elements
- Explicit `direction: "ltr"` and `textAlign: "left"` to avoid RTL page interference

#### Pointer Events

- Root: `pointer-events: none` — doesn't block page interaction
- Inner container: `pointer-events: auto` — re-enables for Notara UI
- StickyNote uses `data-no-drag` on interactive elements (buttons, inputs)

#### React Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useNotes` | `src/hooks/useNotes.ts` | CRUD for notes, limit check, storage listener |
| `useAlerts` | `src/hooks/useAlerts.ts` | CRUD for alerts, schedule/cancel messaging |
| `useAuth` | `src/hooks/useAuth.ts` | Sign-in/out, auth state polling, session listener |
| `useScreenshot` | `src/hooks/useScreenshot.ts` | Capture + thumbnail generation |

---

### 4. Message Protocol

All messages use `chrome.runtime.sendMessage()` (content → background) and `chrome.tabs.sendMessage()` (background → content).

```typescript
// src/lib/types.ts
type MessageAction =
  // Content → Background
  | { type: "GET_NOTE_COUNT"; url: string }
  | { type: "SIGN_IN_GOOGLE" }
  | { type: "SIGN_OUT" }
  | { type: "GET_AUTH_STATE" }
  | { type: "SCHEDULE_ALERT"; alert: Alert }
  | { type: "CANCEL_ALERT"; alarmName: string }

  // Background → Content
  | { type: "ADD_NOTE"; url: string }      // From context menu
  | { type: "TOGGLE_PANEL" }               // From extension icon click
  | { type: "NOTE_COUNT"; count: number }  // Response to GET_NOTE_COUNT
```

#### Handler Map (Background — `src/background/background.ts`)

| Message | Handler | Response |
|---------|---------|----------|
| `GET_NOTE_COUNT` | Reads storage, counts notes | `{ type: "NOTE_COUNT", count }` |
| `SCHEDULE_ALERT` | `registerAlarm(alert.schedule)` | `{ success: true }` |
| `CANCEL_ALERT` | `chrome.alarms.clear(alarmName)` | `{ success: true }` |
| `SIGN_IN_GOOGLE` | `handleGoogleSignIn()` | `{ success, user?, error? }` |
| `SIGN_OUT` | `handleSignOut()` | `{ success: true }` |
| `GET_AUTH_STATE` | Read session storage | `{ isAuthenticated, user }` |

#### Handler Map (Content — `src/content/ContentApp.tsx`)

| Message | Action |
|---------|--------|
| `TOGGLE_PANEL` | Toggle FloatingPanel visibility |
| `ADD_NOTE` | Create new note on current page |

---

### 5. Alarm System

#### Registration (`src/background/background.ts`)

```
registerAlarm(schedule: AlertSchedule)
├── daily  → chrome.alarms.create(name, { when: nextDailyFire, periodInMinutes: 1440 })
├── weekly → chrome.alarms.create(name, { when: nextWeeklyFire, periodInMinutes: 10080 })
└── custom → chrome.alarms.create(name, { delayInMinutes: N, periodInMinutes: N })
```

Helper functions:
- `getNextDailyFire(timeOfDay: string)` — parses "HH:MM", returns next fire timestamp
- `getNextWeeklyFire(dayOfWeek: number, timeOfDay: string)` — calculates days until target day

#### Fire Sequence

```
chrome.alarms.onAlarm
  → findAlertByAlarmName(alarm.name)
  → check alert.enabled
  → chrome.notifications.create(alarm.name, {
      type: "basic",
      iconUrl: "public/icon-128.png",
      title: "Notara Reminder",
      message: alert.message
    })
```

#### Lifecycle

- **Install/update** (`runtime.onInstalled`): `reregisterAllAlarms()` — clears all alarms, re-registers enabled alerts
- **Browser startup** (`runtime.onStartup`): same `reregisterAllAlarms()`
- **Cancel**: `chrome.alarms.clear(alarmName)` on alert delete or disable

Alarm names follow the pattern `notara_scheduled_{timestamp}`.

---

### 6. Freemium Model

#### Implementation (`src/lib/freemium.ts`)

```typescript
const FREE_NOTE_LIMIT = 20;
const PRO_KEY = "notara_pro";

async function canCreateNote(): Promise<{ allowed: boolean; current: number; limit: number }> {
  if (await isPro()) return { allowed: true, current, limit: Infinity };
  const current = await getTotalNoteCount();
  return { allowed: current < FREE_NOTE_LIMIT, current, limit: FREE_NOTE_LIMIT };
}

async function isPro(): Promise<boolean> {
  const result = await chrome.storage.sync.get(PRO_KEY);
  return result[PRO_KEY] === true;
}

async function getTotalNoteCount(): Promise<number> {
  // Iterates all notes from getAllNotes(), sums lengths
}
```

#### UI Integration

- **useNotes hook** (`src/hooks/useNotes.ts`): calls `canCreateNote()` before creating; sets `limitReached` state
- **FloatingPanel**: shows `{count}/{FREE_NOTE_LIMIT}` badge on minimized circle and panel header
- **UpgradeModal** (`src/content/components/UpgradeModal.tsx`): displayed when `limitReached` is true; "Upgrade to Pro" links to `https://notara.dev/pro` (placeholder)

---

### 7. Screenshot Capture

#### Capture Flow (`src/lib/screenshot.ts`)

```typescript
async function captureScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.body, {
    useCORS: true,
    allowTaint: true,
    width: window.innerWidth,
    height: window.innerHeight,
    x: window.scrollX,
    y: window.scrollY,
  });
  return canvas.toDataURL("image/png", 0.5);  // 50% quality
}

function createThumbnail(dataUrl: string, maxWidth = 200): Promise<string> {
  // Resize to 200px max width → JPEG at 60% quality
}
```

#### Integration

- `useScreenshot` hook wraps `captureScreenshot()` + `createThumbnail()`
- `ScreenshotButton` component triggers capture, calls `onCapture(dataUrl)`
- Result stored in `note.screenshot` field as base64 data URL
- Displayed as `<img src={note.screenshot} />` in note cards and sticky notes

#### Storage Consideration

Chrome Storage sync has a 102,400 bytes-per-item limit. Thumbnail compression (200px width, 60% JPEG) keeps screenshots within bounds.

---

### 8. Permissions Justification

| Permission | Usage | Justification |
|------------|-------|---------------|
| `storage` | Notes, alerts, auth cache, pro status | Core data persistence — notes and settings must survive browser restarts |
| `activeTab` | Read current tab URL for note scoping | Notes are pinned to specific URLs; extension needs to know which page the user is on |
| `contextMenus` | "Add Notara sticky note" right-click menu | Quick note creation without opening the panel |
| `alarms` | Scheduled alert reminders | Users set daily/weekly/custom reminders that fire even when the tab is closed |
| `notifications` | Browser notifications for triggered alerts | Alerts need to be visible even when the user isn't on the target page |
| `identity` | `chrome.identity.launchWebAuthFlow` for Google OAuth | Secure authentication without exposing credentials to content scripts |
| `<all_urls>` (host) | Content script injection on all websites | Notara's core value is working on ANY website the user visits |

---

## Part C — Future Architecture (Phase 2+)

### Supabase DB Sync

- **Notes table** with Row Level Security (RLS) — users can only access their own notes
- **Real-time subscriptions** via Supabase Realtime for cross-device sync
- Schema mirrors the `Note` interface with a `user_id` foreign key

### Conflict Resolution

- **Last-write-wins** using `updatedAt` timestamps
- On sync: compare local vs remote `updatedAt`, keep the newer version
- Deletions tracked with soft-delete flag to propagate across devices

### Stripe Integration

- Pro tier unlock via Stripe Checkout
- Webhook confirms payment → sets `notara_pro: true` in user's DB record
- Synced to `chrome.storage.sync` on next auth check

### Cross-Device Sync

- Supabase Realtime channels per user
- On note change: write to Supabase → broadcast to other devices → update local storage
- Offline-first: changes queue locally, sync on reconnect
