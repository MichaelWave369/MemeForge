export const TEMPLATE_PACK_VERSION = 1;

const DEFAULT_FONT = "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const VALID_THEMES = new Set(['signal', 'void', 'paper', 'warning', 'terminal']);
const VALID_ALIGNMENTS = new Set(['left', 'center', 'right']);
const VALID_FITS = new Set(['cover', 'contain']);
const VALID_FONTS = new Set([
  DEFAULT_FONT,
  "'Arial Black', Arial, sans-serif",
  'Inter, Arial, sans-serif',
  'Georgia, serif',
  "'Courier New', monospace"
]);

function safeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function boundedNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeLayer(layer = {}) {
  return {
    x: boundedNumber(layer.x, 0.5, 0.05, 0.95),
    y: boundedNumber(layer.y, 0.5, 0.05, 0.95),
    size: boundedNumber(layer.size, 82, 28, 140),
    font: VALID_FONTS.has(layer.font) ? layer.font : DEFAULT_FONT,
    color: /^#[0-9a-f]{6}$/i.test(layer.color || '') ? layer.color : '#ffffff',
    align: VALID_ALIGNMENTS.has(layer.align) ? layer.align : 'center',
    outline: layer.outline !== false,
    shadow: layer.shadow === true
  };
}

export function normalizeTemplate(template) {
  if (!template || typeof template !== 'object') return null;
  const name = safeString(template.name).trim().slice(0, 60);
  if (!name) return null;

  const source = template.source === 'builtin' ? 'builtin' : 'user';
  const studio = template.studio && typeof template.studio === 'object' ? template.studio : {};
  const background = studio.background && typeof studio.background === 'object' ? studio.background : {};

  return {
    id: safeString(template.id).trim() || `user-${Date.now().toString(36)}`,
    name,
    description: safeString(template.description).trim().slice(0, 180),
    tags: Array.isArray(template.tags)
      ? template.tags.filter(tag => typeof tag === 'string').map(tag => tag.trim().toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    source,
    createdAt: safeString(template.createdAt),
    studio: {
      visualTheme: VALID_THEMES.has(studio.visualTheme) ? studio.visualTheme : 'signal',
      watermark: studio.watermark !== false,
      background: {
        fit: VALID_FITS.has(background.fit) ? background.fit : 'cover',
        zoom: boundedNumber(background.zoom, 1, 0.5, 3),
        x: boundedNumber(background.x, 0, -100, 100),
        y: boundedNumber(background.y, 0, -100, 100)
      },
      layers: {
        top: normalizeLayer(studio.layers?.top),
        bottom: normalizeLayer(studio.layers?.bottom)
      }
    }
  };
}

export function createTemplateFromStudio(name, studio, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const normalized = normalizeTemplate({
    id: options.id || `user-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    description: options.description || 'Custom MemeForge layout',
    tags: options.tags || ['custom'],
    source: 'user',
    createdAt: now.toISOString(),
    studio
  });

  if (!normalized) return null;
  normalized.source = 'user';
  return normalized;
}

export function applyTemplateToStudio(currentStudio, template) {
  const normalized = normalizeTemplate(template);
  if (!normalized) return currentStudio;

  const current = currentStudio && typeof currentStudio === 'object' ? currentStudio : {};
  const currentBackground = current.background && typeof current.background === 'object' ? current.background : {};
  const currentLayers = current.layers && typeof current.layers === 'object' ? current.layers : {};

  return {
    ...current,
    visualTheme: normalized.studio.visualTheme,
    watermark: normalized.studio.watermark,
    background: {
      ...currentBackground,
      ...normalized.studio.background,
      dataUrl: safeString(currentBackground.dataUrl),
      name: safeString(currentBackground.name)
    },
    layers: {
      top: {
        ...normalized.studio.layers.top,
        text: safeString(currentLayers.top?.text, '')
      },
      bottom: {
        ...normalized.studio.layers.bottom,
        text: safeString(currentLayers.bottom?.text, '')
      }
    }
  };
}

export function filterTemplates(templates, query = '', filter = 'all', favorites = new Set()) {
  const q = String(query || '').trim().toLowerCase();
  return templates.filter(template => {
    if (filter === 'builtin' && template.source !== 'builtin') return false;
    if (filter === 'mine' && template.source !== 'user') return false;
    if (filter === 'favorites' && !favorites.has(template.id)) return false;
    if (!q) return true;
    const haystack = [template.name, template.description, ...(template.tags || [])].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

export function encodeTemplatePack(templates) {
  const userTemplates = (Array.isArray(templates) ? templates : [])
    .map(normalizeTemplate)
    .filter(template => template && template.source === 'user');

  return JSON.stringify({
    kind: 'memeforge-template-pack',
    version: TEMPLATE_PACK_VERSION,
    exportedAt: new Date().toISOString(),
    templates: userTemplates
  }, null, 2);
}

export function decodeTemplatePack(raw) {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.kind !== 'memeforge-template-pack' || parsed?.version !== TEMPLATE_PACK_VERSION || !Array.isArray(parsed.templates)) {
      return [];
    }
    return parsed.templates
      .map(normalizeTemplate)
      .filter(template => template && template.source === 'user');
  } catch {
    return [];
  }
}

export function mergeUserTemplates(existing, incoming) {
  const map = new Map();
  for (const template of [...(existing || []), ...(incoming || [])]) {
    const normalized = normalizeTemplate(template);
    if (!normalized || normalized.source !== 'user') continue;
    map.set(normalized.id, normalized);
  }
  return [...map.values()].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
