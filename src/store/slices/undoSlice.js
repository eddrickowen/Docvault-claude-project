/**
 * undoSlice — Client-side undo/redo using snapshots.
 *
 * Methods:
 *   _saveToHistory(label)  — call this BEFORE any destructive mutation
 *   undo()                 — restore previous snapshot
 *   redo()                 — re-apply reverted snapshot
 *   canUndo()              — true if there's something to undo
 *   canRedo()              — true if there's something to redo
 *
 * LIMITATIONS (by design):
 *   - Snapshots are in-memory only → lost on page refresh
 *   - Only pos, items, suppliers, dos are snapshotted (not settings/products)
 *   - Max 20 snapshots kept to control memory usage
 *   - Does NOT re-sync changes to PocketBase → undo is local UI only
 *
 * USAGE PATTERN:
 *   // In poSlice, before deleting:
 *   get()._saveToHistory("Hapus PO: " + po.orderNo);
 *   await collections.pos().delete(id);
 */

const MAX_HISTORY = 20;

export function createUndoSlice(set, get) {
  return {
    _saveToHistory: (label) => {
      const s = get();

      // Deep-copy only the data arrays (not functions or settings)
      const snapshot = {
        pos:       JSON.parse(JSON.stringify(s.pos)),
        items:     JSON.parse(JSON.stringify(s.items)),
        suppliers: JSON.parse(JSON.stringify(s.suppliers)),
        dos:       JSON.parse(JSON.stringify(s.dos)),
        label,
        timestamp: Date.now(),
      };

      // If we undid some steps and then made a new change,
      // discard the "future" history ahead of the current index
      const base = s.historyIndex < s.history.length - 1
        ? s.history.slice(0, s.historyIndex + 1)
        : [...s.history];

      const newHistory = [...base, snapshot].slice(-MAX_HISTORY);
      set({ history: newHistory, historyIndex: newHistory.length - 1 });
    },

    undo: () => {
      const s = get();
      if (s.historyIndex < 0) {
        get().toast("⚠ Tidak ada yang bisa di-undo");
        return;
      }
      const snapshot = s.history[s.historyIndex];
      set({
        pos:          JSON.parse(JSON.stringify(snapshot.pos)),
        items:        JSON.parse(JSON.stringify(snapshot.items)),
        suppliers:    JSON.parse(JSON.stringify(snapshot.suppliers)),
        dos:          JSON.parse(JSON.stringify(snapshot.dos)),
        historyIndex: s.historyIndex - 1,
      });
      get().toast(`↶ Undo: ${snapshot.label}`);
    },

    redo: () => {
      const s = get();
      if (s.historyIndex >= s.history.length - 1) {
        get().toast("⚠ Tidak ada yang bisa di-redo");
        return;
      }
      const snapshot = s.history[s.historyIndex + 1];
      set({
        pos:          JSON.parse(JSON.stringify(snapshot.pos)),
        items:        JSON.parse(JSON.stringify(snapshot.items)),
        suppliers:    JSON.parse(JSON.stringify(snapshot.suppliers)),
        dos:          JSON.parse(JSON.stringify(snapshot.dos)),
        historyIndex: s.historyIndex + 1,
      });
      get().toast(`↷ Redo: ${snapshot.label}`);
    },

    canUndo: () => get().historyIndex >= 0,
    canRedo: () => get().historyIndex < get().history.length - 1,
  };
}
