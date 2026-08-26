import { useCallback, useRef, useState } from 'react';

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function same(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); }
  catch { return a === b; }
}

export function useStudioHistory(initialStudio, { limit = 40, groupMs = 550 } = {}) {
  const [studio, setStudioState] = useState(initialStudio);
  const studioRef = useRef(initialStudio);
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const groupRef = useRef({ key: '', at: 0 });
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });

  const syncCounts = useCallback(() => {
    setCounts({ undo: undoRef.current.length, redo: redoRef.current.length });
  }, []);

  const updateStudio = useCallback((updater, key = 'edit', options = {}) => {
    const { record = true } = options;
    const previous = studioRef.current;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    if (!next || same(previous, next)) return next;

    if (record) {
      const now = Date.now();
      const grouped = groupRef.current.key === key && now - groupRef.current.at <= groupMs;
      if (!grouped) {
        undoRef.current = [...undoRef.current.slice(-(limit - 1)), clone(previous)];
      }
      groupRef.current = { key, at: now };
      redoRef.current = [];
    }

    studioRef.current = next;
    setStudioState(next);
    if (record) syncCounts();
    return next;
  }, [groupMs, limit, syncCounts]);

  const replaceStudio = useCallback((next, options = {}) => {
    const { clearHistory = false } = options;
    if (clearHistory) {
      undoRef.current = [];
      redoRef.current = [];
      groupRef.current = { key: '', at: 0 };
    }
    studioRef.current = next;
    setStudioState(next);
    syncCounts();
  }, [syncCounts]);

  const undo = useCallback(() => {
    const previous = undoRef.current.pop();
    if (!previous) return false;
    redoRef.current = [...redoRef.current.slice(-(limit - 1)), clone(studioRef.current)];
    groupRef.current = { key: '', at: 0 };
    studioRef.current = previous;
    setStudioState(previous);
    syncCounts();
    return true;
  }, [limit, syncCounts]);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return false;
    undoRef.current = [...undoRef.current.slice(-(limit - 1)), clone(studioRef.current)];
    groupRef.current = { key: '', at: 0 };
    studioRef.current = next;
    setStudioState(next);
    syncCounts();
    return true;
  }, [limit, syncCounts]);

  const clearHistory = useCallback(() => {
    undoRef.current = [];
    redoRef.current = [];
    groupRef.current = { key: '', at: 0 };
    syncCounts();
  }, [syncCounts]);

  return {
    studio,
    updateStudio,
    replaceStudio,
    undo,
    redo,
    clearHistory,
    canUndo: counts.undo > 0,
    canRedo: counts.redo > 0,
    undoCount: counts.undo,
    redoCount: counts.redo
  };
}
