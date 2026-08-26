export const PROJECT_STORAGE_KEY = 'memeforge:project:v0.2';
export const PROJECT_SCHEMA_VERSION = 2;
export const TEMPLATE_STORAGE_KEY = 'memeforge:templates:v0.3';
export const FAVORITES_STORAGE_KEY = 'memeforge:template-favorites:v0.3';

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

function saveJson(storage, key, value) {
  if (!storage || typeof storage.setItem !== 'function') {
    return { ok: false, error: 'Storage is unavailable.' };
  }
  try {
    const encoded = JSON.stringify(value);
    storage.setItem(key, encoded);
    return { ok: true, bytes: encoded.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save data.' };
  }
}

function loadJson(storage, key, fallback) {
  if (!storage || typeof storage.getItem !== 'function') return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveUserTemplates(storage, templates) {
  return saveJson(storage, TEMPLATE_STORAGE_KEY, Array.isArray(templates) ? templates : []);
}

export function loadUserTemplates(storage) {
  const value = loadJson(storage, TEMPLATE_STORAGE_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function saveTemplateFavorites(storage, favorites) {
  const values = favorites instanceof Set ? [...favorites] : Array.isArray(favorites) ? favorites : [];
  return saveJson(storage, FAVORITES_STORAGE_KEY, [...new Set(values.filter(value => typeof value === 'string'))]);
}

export function loadTemplateFavorites(storage) {
  const value = loadJson(storage, FAVORITES_STORAGE_KEY, []);
  return new Set(Array.isArray(value) ? value.filter(item => typeof item === 'string') : []);
}
