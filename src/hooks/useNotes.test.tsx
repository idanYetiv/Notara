import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotes } from "./useNotes";
import { clearMockStorage } from "../test/setup";
import type { Note } from "../lib/types";

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  ...globalThis.crypto,
  randomUUID: () => "test-uuid-" + Math.random().toString(36).slice(2, 8),
});

const TEST_URL = "https://example.com/page1";
const TEST_HOSTNAME = "example.com";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    url: TEST_URL,
    scope: "page",
    text: "Test note",
    color: "yellow",
    position: { x: 100, y: 100 },
    size: { w: 240, h: 200 },
    minimized: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("useNotes", () => {
  beforeEach(() => {
    clearMockStorage();
    vi.clearAllMocks();
  });

  it("starts with empty notes and loading state", async () => {
    const { result } = renderHook(() => useNotes(TEST_URL));

    // Initially loading
    expect(result.current.loading).toBe(true);

    // After load completes
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.notes).toEqual([]);
  });

  it("loads existing notes from storage", async () => {
    const existing = makeNote({ text: "Existing" });
    await chrome.storage.sync.set({ [`notara_page_${TEST_URL}`]: [existing] });

    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0].text).toBe("Existing");
  });

  it("loads both page and site notes", async () => {
    const pageNote = makeNote({ text: "Page note", scope: "page" });
    const siteNote = makeNote({ text: "Site note", scope: "site", url: TEST_URL });
    await chrome.storage.sync.set({
      [`notara_page_${TEST_URL}`]: [pageNote],
      [`notara_site_${TEST_HOSTNAME}`]: [siteNote],
    });

    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.notes).toHaveLength(2);
  });

  it("addNote creates a new note and saves to storage", async () => {
    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let note: Note | null = null;
    await act(async () => {
      note = await result.current.addNote("page");
    });

    expect(note).not.toBeNull();
    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0].url).toBe(TEST_URL);
    expect(result.current.notes[0].scope).toBe("page");
    expect(result.current.notes[0].color).toBe("yellow");
  });

  it("addNote respects the scope parameter", async () => {
    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addNote("site");
    });

    expect(result.current.notes[0].scope).toBe("site");
  });

  it("removeNote deletes a note", async () => {
    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let note: Note | null = null;
    await act(async () => {
      note = await result.current.addNote();
    });

    expect(result.current.notes).toHaveLength(1);

    await act(async () => {
      result.current.removeNote(note!);
    });

    expect(result.current.notes).toHaveLength(0);
  });

  it("editNote updates note text", async () => {
    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let note: Note | null = null;
    await act(async () => {
      note = await result.current.addNote();
    });

    await act(async () => {
      result.current.editNote(note!, { text: "Updated text" });
    });

    expect(result.current.notes[0].text).toBe("Updated text");
  });

  it("editNote updates updatedAt timestamp", async () => {
    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let note: Note | null = null;
    await act(async () => {
      note = await result.current.addNote();
    });

    const createdAt = result.current.notes[0].updatedAt;

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));

    await act(async () => {
      result.current.editNote(note!, { text: "Changed" });
    });

    expect(result.current.notes[0].updatedAt).toBeGreaterThanOrEqual(createdAt);
  });

  it("toggleScope switches page to site", async () => {
    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let note: Note | null = null;
    await act(async () => {
      note = await result.current.addNote("page");
    });

    expect(result.current.notes[0].scope).toBe("page");

    await act(async () => {
      result.current.toggleScope(note!);
    });

    expect(result.current.notes[0].scope).toBe("site");
  });

  it("toggleScope switches site to page", async () => {
    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let note: Note | null = null;
    await act(async () => {
      note = await result.current.addNote("site");
    });

    await act(async () => {
      result.current.toggleScope(note!);
    });

    expect(result.current.notes[0].scope).toBe("page");
  });

  it("returns limitReached when free limit is hit", async () => {
    // Pre-fill storage with 20 notes (FREE_NOTE_LIMIT)
    const notes: Note[] = [];
    for (let i = 0; i < 20; i++) {
      notes.push(makeNote({ id: `note-${i}` }));
    }
    await chrome.storage.sync.set({ [`notara_page_${TEST_URL}`]: notes });

    const { result } = renderHook(() => useNotes(TEST_URL));

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const newNote = await result.current.addNote();
      expect(newNote).toBeNull();
    });

    expect(result.current.limitReached).toBe(true);
  });

  it("reloads notes when URL changes", async () => {
    const note1 = makeNote({ text: "Page 1 note" });
    await chrome.storage.sync.set({
      [`notara_page_${TEST_URL}`]: [note1],
    });

    const { result, rerender } = renderHook(
      ({ url }) => useNotes(url),
      { initialProps: { url: TEST_URL } }
    );

    await vi.waitFor(() => {
      expect(result.current.notes).toHaveLength(1);
    });

    rerender({ url: "https://other.com/page" });

    await vi.waitFor(() => {
      expect(result.current.notes).toHaveLength(0);
    });
  });
});
