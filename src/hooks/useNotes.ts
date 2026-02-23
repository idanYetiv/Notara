import { useState, useEffect, useCallback } from "react";
import type { Note, NoteColor, NoteScope } from "../lib/types";
import {
  getNotesForUrl,
  saveNote,
  deleteNote,
  updateNote,
  changeNoteScope,
} from "../lib/storage";
import { canCreateNote } from "../lib/freemium";
import { captureError } from "../lib/sentry";

export function useNotes(url: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitReached, setLimitReached] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await getNotesForUrl(url);
      setNotes(loaded);
    } catch (err) {
      captureError(err);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = useCallback(
    async (scope: NoteScope = "page") => {
      try {
        const check = await canCreateNote();
        if (!check.allowed) {
          setLimitReached(true);
          return null;
        }

        const note: Note = {
          id: crypto.randomUUID(),
          url,
          scope,
          text: "",
          color: "yellow",
          position: {
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
          },
          size: { w: 240, h: 200 },
          minimized: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveNote(note);
        setNotes((prev) => [...prev, note]);
        return note;
      } catch (err) {
        captureError(err);
        return null;
      }
    },
    [url]
  );

  const removeNote = useCallback(async (note: Note) => {
    try {
      await deleteNote(note);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err) {
      captureError(err);
    }
  }, []);

  const editNote = useCallback(
    async (
      note: Note,
      updates: Partial<Omit<Note, "id" | "url" | "createdAt">>
    ) => {
      try {
        await updateNote(note, updates);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === note.id ? { ...n, ...updates, updatedAt: Date.now() } : n
          )
        );
      } catch (err) {
        captureError(err);
      }
    },
    []
  );

  const toggleScope = useCallback(async (note: Note) => {
    try {
      const newScope: NoteScope = note.scope === "page" ? "site" : "page";
      const updated = await changeNoteScope(note, newScope);
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    } catch (err) {
      captureError(err);
    }
  }, []);

  const changeColor = useCallback(
    async (note: Note, color: NoteColor) => {
      await editNote(note, { color });
    },
    [editNote]
  );

  return { notes, loading, addNote, removeNote, editNote, toggleScope, changeColor, limitReached, setLimitReached };
}
