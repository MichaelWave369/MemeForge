export const PROJECT_STORAGE_KEY = 'memeforge:project:v0.2';
export const PROJECT_SCHEMA_VERSION = 2;

export function encodeProject(project) {
  return JSON.stringify({
    version: PROJECT_SCHEMA_VERSION,
    project
  });
}

export function decodeProject(raw) {
  if (!raw || typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== PROJECT_SCHEMA_VERSION || !parsed.project || typeof parsed.project !== 'object') {
      return null;
    }
    return parsed.project;
  } catch {
    return null;
  }
}

export function saveProject(storage, project, key = PROJECT_STORAGE_KEY) {
  if (!storage || typeof storage.setItem !== 'function') {
    return { ok: false, error: 'Storage is unavailable.' };
  }

  try {
    const encoded = encodeProject(project);
    storage.setItem(key, encoded);
    return { ok: true, bytes: encoded.length };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not save project.'
    };
  }
}

export function loadProject(storage, key = PROJECT_STORAGE_KEY) {
  if (!storage || typeof storage.getItem !== 'function') return null;

  try {
    return decodeProject(storage.getItem(key));
  } catch {
    return null;
  }
}

export function clearProject(storage, key = PROJECT_STORAGE_KEY) {
  if (!storage || typeof storage.removeItem !== 'function') return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
