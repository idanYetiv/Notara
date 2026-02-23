# Product Requirements Document (PRD)

# Product Name: Notara

---

## 1. Overview

**Notara** is a Chrome Extension that enables users to create, view, and manage contextual notes directly "on top of" websites.

The extension overlays a minimal, floating interface on any webpage, allowing users to attach notes that are:

- **Website-level** (e.g., notes related to their bank account dashboard — visible on all pages of that domain)
- **Page-level** (specific URL — only visible on that exact page)
- **Element-level** (future capability — tied to specific DOM elements)
- **Item-level** (e.g., specific Amazon product pages — derived from URL patterns)

The goal is to create a persistent, contextual memory layer for the web.

---

## 2. Vision

To transform the browser into a personal workspace where every website can hold your thoughts, reminders, and context — without leaving the page. Notara bridges the gap between browsing and note-taking by placing notes exactly where they matter.

---

## 3. Target Users

- **Knowledge workers** — researchers, analysts, developers who work across many web tools and need to annotate what they see
- **Online shoppers** — comparing products across tabs, noting prices, pros/cons
- **Students** — annotating online readings, lecture materials, course portals
- **Anyone** who thinks "I should remember this about this page"

---

## 4. Core Features (MVP)

### 4.1 Floating Sticky Notes

- Users can create sticky notes that float over the current webpage
- Notes are **draggable** — click and drag the header to reposition
- Notes are **resizable** — drag the corner handle to resize
- Notes can be **minimized** to a compact header bar, and expanded back
- Notes can be **deleted** with a single click (with visual confirmation)

### 4.2 Note Scoping

Notes exist at two levels:

| Scope | Visibility | Storage Key | Example |
|-------|-----------|-------------|---------|
| **Page-level** | Only on the exact URL where created | Full URL | Notes on `amazon.com/dp/B09V3K...` |
| **Website-level** | On every page of that domain | Domain (hostname) | Notes on all of `bank.com/*` |

- Default scope when creating a note: **page-level**
- Users can toggle a note between page-level and website-level via a scope indicator in the note toolbar
- Website-level notes appear on every page of that domain, with a subtle visual indicator (e.g., a globe icon) to distinguish them from page-level notes

### 4.3 Note Editing

- Rich text is out of scope for MVP — plain text only
- Auto-save on blur and via debounced typing (400ms)
- Placeholder text: "Type your note..."

### 4.4 Note Colors

Five color options (dark-theme adjusted):

| Color | Hex |
|-------|-----|
| Yellow | `#ca8a04` |
| Pink | `#e11d48` |
| Blue | `#3b82f6` |
| Green | `#22c55e` |
| Purple | `#8b5cf6` |

- Default color: **yellow**
- Color picker accessible from the note toolbar

### 4.5 Screenshot Capture

- A camera button in the note toolbar captures a screenshot of the visible page area
- The screenshot is compressed to a thumbnail and attached to the note
- Displayed as a small preview at the bottom of the note
- Uses `html2canvas` for capture

### 4.6 Persistence

- All notes are persisted using **Chrome Storage API (sync)**
- Notes survive page reloads, browser restarts, and sync across Chrome profiles
- Storage is keyed by scope:
  - Page-level: `notara_page_{url}`
  - Website-level: `notara_site_{hostname}`
- Legacy `webnoter_*` keys are automatically migrated on install/update

### 4.7 FAB (Floating Action Button)

- A persistent "+" button fixed to the bottom-right corner of every page
- Clicking it creates a new page-level note at a slightly randomized position
- The FAB sits at the highest z-index to remain always accessible

---

## 5. Extension UI

### 5.1 Popup (Browser Action)

The popup opens when clicking the extension icon in the Chrome toolbar.

**Contents:**
- Header with "Notara" branding and total note count
- "Add Note to Current Page" button — creates a page-level note on the active tab
- **Sites list** — all domains that have notes, sorted by note count (descending)
  - Each domain row shows the domain name and note count badge
  - Expandable: clicking a domain reveals all notes under it (both site-level and page-level)
  - Each note row shows: color dot, text preview (truncated), scope icon, and delete button
- Empty state: friendly message encouraging the user to create their first note

### 5.2 Background Service Worker

- **Badge count**: shows the number of notes for the current tab (page-level + site-level combined) on the extension icon
- **Context menu**: right-click on any page shows "Add Notara sticky note"
- **Message passing**: handles communication between popup, content script, and background

---

## 6. Content Script Architecture

### 6.1 Isolated Container

- The content script injects a host `<div>` into the page body
- All Notara UI lives inside an isolated container with pointer-events strategy
- This ensures notes always float above page content without interfering with the host page

### 6.2 Z-Index Strategy

- FAB: `z-index: 2147483647` (maximum)
- Sticky notes: `z-index: 2147483646`
- This ensures notes always float above page content

---

## 7. Non-Functional Requirements

- **Performance**: content script must not noticeably slow down page load
- **Storage limits**: Chrome sync storage has a 100KB quota — notes with screenshots should be compressed. If quota is exceeded, gracefully inform the user
- **Privacy**: no data leaves the browser. No analytics, no server calls. All data stays in Chrome Storage
- **Accessibility**: keyboard navigation for note creation and editing (future improvement)

---

## 8. Future Capabilities (Post-MVP)

| Feature | Description |
|---------|-------------|
| Element-level notes | Pin a note to a specific DOM element (survives page scroll) |
| Rich text editor | Bold, italic, lists, links inside notes |
| Note tags/labels | Categorize notes with custom tags |
| Search | Full-text search across all notes from the popup |
| Export | Export all notes as JSON or Markdown |
| Import | Import notes from a backup file |
| Keyboard shortcuts | `Ctrl+Shift+N` to add note, `Esc` to minimize all |
| Collaboration | Share a note via link (requires backend) |

---

## 9. Chrome Web Store

### 9.1 Listing Info

- **Name**: Notara
- **Short description**: Sticky notes on any website. Remember what matters, right where it matters.
- **Category**: Productivity
- **Language**: English

### 9.2 Required Assets

| Asset | Spec |
|-------|------|
| Icon 16px | Extension toolbar |
| Icon 48px | Extensions management page |
| Icon 128px | Chrome Web Store listing |
| Screenshots | 1280x800 or 640x400, at least 1, up to 5 |
| Promotional tile | 440x280 (optional) |

### 9.3 Permissions Justification

| Permission | Reason |
|-----------|--------|
| `storage` | Persist notes across sessions |
| `activeTab` | Read current tab URL for note scoping |
| `contextMenus` | Right-click "Add note" option |
| `host_permissions: <all_urls>` | Content script must inject on any website |

### 9.4 Privacy Policy

Notara does not collect, transmit, or share any user data. All notes are stored locally in the user's Chrome profile via the Chrome Storage API. No analytics, tracking, or third-party services are used.

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Extension loads without errors | 100% |
| Notes persist after page reload | 100% |
| Notes persist after browser restart | 100% |
| Page-level notes only appear on their URL | 100% |
| Website-level notes appear on all pages of their domain | 100% |
| Screenshot capture works on standard pages | >90% |
| Build produces a valid, loadable extension | 100% |
| All tests pass | 100% |

---

*Last updated: February 20, 2026*
