import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildConcepts } from '../src/engines/meme-engine.js';
import { scoreMemePotential } from '../src/engines/score-engine.js';
import {
  PROJECT_SCHEMA_VERSION,
  decodeProject,
  encodeProject,
  loadProject,
  saveProject
} from '../src/engines/storage-engine.js';

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

test('browser entrypoint selectors are backed by HTML ids', async () => {
  const [app, html] = await Promise.all([
    readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8')
  ]);

  const ids = [...app.matchAll(/\$\('#([^']+)'\)/g)].map(match => match[1]);
  assert.ok(ids.length > 20, 'expected the smoke test to discover the studio selector set');

  for (const id of new Set(ids)) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id} in index.html`);
  }
});
