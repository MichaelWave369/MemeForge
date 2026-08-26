export const REMIX_HISTORY_KEY = 'memeforge:remix-history:v0.4';
export const REMIX_HISTORY_VERSION = 1;
export const MAX_REMIX_HISTORY = 12;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function stripMediaFromStudio(studio) {
  const clean = clone(studio || {});
  clean.background = {
    ...(clean.background || {}),
    dataUrl: '',
    name: ''
  };
  clean.activeStickerId = null;
  return clean;
}

export function createRemixSnapshot({ topic = '', selectedStyles = [], weirdness = 7, studio, label = 'Checkpoint' }, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const id = options.id || `remix-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    createdAt: now.toISOString(),
    label: String(label || 'Checkpoint').trim().slice(0, 80),
    topic: String(topic || '').trim().slice(0, 140),
    selectedStyles: Array.isArray(selectedStyles) ? selectedStyles.filter(value => typeof value === 'string').slice(0, 12) : [],
    weirdness: Math.min(10, Math.max(1, Number(weirdness) || 7)),
    studio: stripMediaFromStudio(studio)
  };
}

export function encodeRemixHistory(items) {
  return JSON.stringify({
    kind: 'memeforge-remix-history',
    version: REMIX_HISTORY_VERSION,
    items: Array.isArray(items) ? items.slice(0, MAX_REMIX_HISTORY) : []
  });
}

export function decodeRemixHistory(raw) {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.kind !== 'memeforge-remix-history' || parsed?.version !== REMIX_HISTORY_VERSION || !Array.isArray(parsed.items)) return [];
    return parsed.items
      .filter(item => item && typeof item === 'object' && typeof item.id === 'string' && item.studio && typeof item.studio === 'object')
      .slice(0, MAX_REMIX_HISTORY);
  } catch {
    return [];
  }
}

export function loadRemixHistory(storage) {
  if (!storage || typeof storage.getItem !== 'function') return [];
  try {
    return decodeRemixHistory(storage.getItem(REMIX_HISTORY_KEY));
  } catch {
    return [];
  }
}

export function saveRemixHistory(storage, items) {
  if (!storage || typeof storage.setItem !== 'function') return { ok: false, error: 'Storage is unavailable.' };
  try {
    const encoded = encodeRemixHistory(items);
    storage.setItem(REMIX_HISTORY_KEY, encoded);
    return { ok: true, bytes: encoded.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save remix history.' };
  }
}

export function addRemixSnapshot(storage, snapshot) {
  const existing = loadRemixHistory(storage).filter(item => item.id !== snapshot.id);
  const items = [snapshot, ...existing].slice(0, MAX_REMIX_HISTORY);
  const result = saveRemixHistory(storage, items);
  return { ...result, items };
}

export function clearRemixHistory(storage) {
  if (!storage || typeof storage.removeItem !== 'function') return false;
  try {
    storage.removeItem(REMIX_HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
}

export function restoreSnapshotStudio(currentStudio, snapshotStudio) {
  const currentBackground = currentStudio?.background || {};
  const next = clone(snapshotStudio || {});
  return {
    ...next,
    background: {
      ...(next.background || {}),
      dataUrl: currentBackground.dataUrl || '',
      name: currentBackground.name || ''
    },
    activeStickerId: null
  };
}
