import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { BUILTIN_TEMPLATES } from '../src/data/templates.js';
import { buildConcepts } from '../src/engines/meme-engine.js';
import { scoreMemePotential } from '../src/engines/score-engine.js';
import {
  PROJECT_SCHEMA_VERSION,
  decodeProject,
  encodeProject,
  loadProject,
  loadTemplateFavorites,
  loadUserTemplates,
  saveProject,
  saveTemplateFavorites,
  saveUserTemplates
} from '../src/engines/storage-engine.js';
import {
  TEMPLATE_PACK_VERSION,
  applyTemplateToStudio,
  createTemplateFromStudio,
  decodeTemplatePack,
  encodeTemplatePack,
  filterTemplates,
  mergeUserTemplates,
  normalizeTemplate
} from '../src/engines/template-engine.js';

test('buildConcepts returns a full 12-concept board', () => {
  const concepts = buildConcepts(
    'AI agents becoming coworkers',
    ['absurd', 'nerdy', 'surreal'],
    7,
    12
  );

  assert.equal(concepts.length, 12);
  assert.equal(new Set(concepts.map(item => item.key)).size, 12);
  assert.ok(concepts.every(item => item.top.length > 0));
  assert.ok(concepts.every(item => item.bottom.length > 0));
  assert.deepEqual(concepts.map(item => item.rank), Array.from({ length: 12 }, (_, index) => index + 1));
});

test('buildConcepts backfills diversity when only one style is selected', () => {
  const concepts = buildConcepts('everything becoming a subscription', ['deadpan'], 4, 12);
  assert.equal(concepts.length, 12);
  assert.ok(new Set(concepts.map(item => item.style)).size > 1);
});

test('concept order is deterministic for identical inputs', () => {
  const args = ['robots doing household chores', ['classic', 'highbrow'], 6, 10];
  const first = buildConcepts(...args).map(item => item.key);
  const second = buildConcepts(...args).map(item => item.key);
  assert.deepEqual(first, second);
});

test('scoreMemePotential is deterministic and bounded', () => {
  const first = scoreMemePotential('meetings that should have been messages', 3, 7);
  const second = scoreMemePotential('meetings that should have been messages', 3, 7);

  assert.deepEqual(first, second);
  assert.ok(first.total >= 1 && first.total <= 99);
  assert.match(first.note, /heuristic/i);
});

test('blank topics do not claim a meaningful score', () => {
  const score = scoreMemePotential('   ', 3, 7);
  assert.equal(score.total, 0);
});

test('project codec round-trips v0.2 studio state', () => {
  const project = {
    topic: 'AI agents becoming coworkers',
    weirdness: 8,
    studio: {
      background: { dataUrl: 'data:image/webp;base64,abc', zoom: 1.2 },
      layers: { top: { text: 'HELLO', x: 0.4, y: 0.2 } }
    }
  };

  const encoded = encodeProject(project);
  const parsedEnvelope = JSON.parse(encoded);
  assert.equal(parsedEnvelope.version, PROJECT_SCHEMA_VERSION);
  assert.deepEqual(decodeProject(encoded), project);
});

test('project codec rejects malformed and wrong-version state', () => {
  assert.equal(decodeProject('not json'), null);
  assert.equal(decodeProject(JSON.stringify({ version: 999, project: {} })), null);
  assert.equal(decodeProject(JSON.stringify({ version: PROJECT_SCHEMA_VERSION })), null);
});

test('storage helpers save and load without browser globals', () => {
  const values = new Map();
  const storage = {
    setItem(key, value) { values.set(key, value); },
    getItem(key) { return values.get(key) ?? null; },
    removeItem(key) { values.delete(key); }
  };
  const project = { topic: 'local storage test', studio: { watermark: true } };

  const saved = saveProject(storage, project);
  assert.equal(saved.ok, true);
  assert.ok(saved.bytes > 0);
  assert.deepEqual(loadProject(storage), project);
});

test('storage helper reports quota-like write failures instead of throwing', () => {
  const storage = {
    setItem() { throw new Error('QuotaExceededError'); },
    getItem() { return null; }
  };

  const saved = saveProject(storage, { topic: 'too large' });
  assert.equal(saved.ok, false);
  assert.match(saved.error, /quota/i);
});

test('built-in v0.3 templates are unique and normalizable', () => {
  assert.ok(BUILTIN_TEMPLATES.length >= 8);
  assert.equal(new Set(BUILTIN_TEMPLATES.map(template => template.id)).size, BUILTIN_TEMPLATES.length);
  assert.ok(BUILTIN_TEMPLATES.every(template => normalizeTemplate(template)?.source === 'builtin'));
});

test('template application preserves caption and uploaded image bytes', () => {
  const current = {
    visualTheme: 'signal',
    watermark: true,
    activeLayer: 'bottom',
    background: {
      dataUrl: 'data:image/webp;base64,private-image-bytes',
      name: 'private.png',
      fit: 'cover',
      zoom: 1,
      x: 0,
      y: 0
    },
    layers: {
      top: { text: 'KEEP THIS SETUP' },
      bottom: { text: 'KEEP THIS PUNCHLINE' }
    }
  };

  const applied = applyTemplateToStudio(current, BUILTIN_TEMPLATES[2]);
  assert.equal(applied.layers.top.text, 'KEEP THIS SETUP');
  assert.equal(applied.layers.bottom.text, 'KEEP THIS PUNCHLINE');
  assert.equal(applied.background.dataUrl, current.background.dataUrl);
  assert.equal(applied.background.name, 'private.png');
  assert.equal(applied.visualTheme, BUILTIN_TEMPLATES[2].studio.visualTheme);
});

test('custom templates strip caption text and image bytes from reusable layout', () => {
  const template = createTemplateFromStudio('Private-safe layout', {
    visualTheme: 'warning',
    watermark: false,
    background: {
      dataUrl: 'data:image/webp;base64,do-not-copy',
      name: 'secret.png',
      fit: 'contain',
      zoom: 1.4,
      x: 12,
      y: -5
    },
    layers: {
      top: { text: 'SECRET CAPTION', x: 0.2, y: 0.3, size: 70 },
      bottom: { text: 'ANOTHER SECRET', x: 0.8, y: 0.7, size: 60 }
    }
  }, { id: 'user-safe-test', now: new Date('2026-08-25T00:00:00Z') });

  const encoded = JSON.stringify(template);
  assert.ok(template);
  assert.doesNotMatch(encoded, /SECRET CAPTION|ANOTHER SECRET|do-not-copy|secret\.png/);
  assert.equal(template.studio.background.fit, 'contain');
});

test('template pack round-trips user templates and rejects incompatible envelopes', () => {
  const template = createTemplateFromStudio('Export me', {
    visualTheme: 'terminal',
    layers: { top: {}, bottom: {} }
  }, { id: 'user-export', now: new Date('2026-08-25T00:00:00Z') });

  const raw = encodeTemplatePack([BUILTIN_TEMPLATES[0], template]);
  const envelope = JSON.parse(raw);
  assert.equal(envelope.version, TEMPLATE_PACK_VERSION);
  assert.equal(envelope.templates.length, 1);
  assert.equal(decodeTemplatePack(raw)[0].id, 'user-export');
  assert.deepEqual(decodeTemplatePack('not json'), []);
  assert.deepEqual(decodeTemplatePack(JSON.stringify({ kind: 'memeforge-template-pack', version: 999, templates: [] })), []);
});

test('template normalization rejects unknown font values', () => {
  const template = normalizeTemplate({
    id: 'user-font-test',
    name: 'Font test',
    source: 'user',
    studio: { layers: { top: { font: 'url(evil-font)' }, bottom: {} } }
  });
  assert.notEqual(template.studio.layers.top.font, 'url(evil-font)');
});

test('template filtering supports search, source, and favorites', () => {
  const user = createTemplateFromStudio('My Terminal Chaos', {
    visualTheme: 'terminal',
    layers: { top: {}, bottom: {} }
  }, { id: 'user-filter', tags: ['custom', 'terminal'], now: new Date('2026-08-25T00:00:00Z') });
  const templates = [...BUILTIN_TEMPLATES, user];

  assert.ok(filterTemplates(templates, 'terminal').some(item => item.id === 'user-filter'));
  assert.deepEqual(filterTemplates(templates, '', 'mine').map(item => item.id), ['user-filter']);
  assert.deepEqual(filterTemplates(templates, '', 'favorites', new Set(['user-filter'])).map(item => item.id), ['user-filter']);
});

test('template merge de-duplicates by id with incoming template winning', () => {
  const older = createTemplateFromStudio('Old', { visualTheme: 'signal', layers: { top: {}, bottom: {} } }, { id: 'user-same', now: new Date('2026-08-24T00:00:00Z') });
  const newer = createTemplateFromStudio('New', { visualTheme: 'void', layers: { top: {}, bottom: {} } }, { id: 'user-same', now: new Date('2026-08-25T00:00:00Z') });
  const merged = mergeUserTemplates([older], [newer]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, 'New');
});

test('template and favorite storage round-trip independently', () => {
  const values = new Map();
  const storage = {
    setItem(key, value) { values.set(key, value); },
    getItem(key) { return values.get(key) ?? null; }
  };
  const template = createTemplateFromStudio('Stored', { layers: { top: {}, bottom: {} } }, { id: 'user-store', now: new Date('2026-08-25T00:00:00Z') });

  assert.equal(saveUserTemplates(storage, [template]).ok, true);
  assert.equal(saveTemplateFavorites(storage, new Set(['user-store'])).ok, true);
  assert.equal(loadUserTemplates(storage)[0].id, 'user-store');
  assert.deepEqual([...loadTemplateFavorites(storage)], ['user-store']);
});

test('browser module selectors are backed by HTML ids', async () => {
  const [app, templateUi, html] = await Promise.all([
    readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/template-ui.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8')
  ]);

  const ids = [...`${app}\n${templateUi}`.matchAll(/\$\('#([^']+)'\)/g)].map(match => match[1]);
  assert.ok(ids.length > 30, 'expected the smoke test to discover the app and template selector sets');

  for (const id of new Set(ids)) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id} in index.html`);
  }
});
