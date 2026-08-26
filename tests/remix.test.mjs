import test from 'node:test';
import assert from 'node:assert/strict';

import { CANVAS_FORMATS, STICKER_CHOICES, defaultStudio } from '../react-app/src/canvas.js';
import {
  MAX_REMIX_HISTORY,
  addRemixSnapshot,
  createRemixSnapshot,
  decodeRemixHistory,
  loadRemixHistory,
  restoreSnapshotStudio
} from '../react-app/src/remix-history.js';

function memoryStorage() {
  const values = new Map();
  return {
    setItem(key, value) { values.set(key, value); },
    getItem(key) { return values.get(key) ?? null; },
    removeItem(key) { values.delete(key); }
  };
}

test('v0.4 exposes four bounded export formats', () => {
  assert.deepEqual(Object.keys(CANVAS_FORMATS), ['square', 'portrait', 'story', 'landscape']);
  assert.equal(CANVAS_FORMATS.square.width, 1080);
  assert.equal(CANVAS_FORMATS.story.height, 1920);
  assert.equal(new Set(Object.values(CANVAS_FORMATS).map(format => format.ratio)).size, 4);
});

test('default studio starts square with empty sticker layers', () => {
  const studio = defaultStudio();
  assert.equal(studio.format, 'square');
  assert.deepEqual(studio.stickers, []);
  assert.equal(studio.activeStickerId, null);
  assert.ok(STICKER_CHOICES.length >= 8);
});

test('remix checkpoints deliberately strip uploaded image bytes', () => {
  const studio = defaultStudio();
  studio.background.dataUrl = 'data:image/webp;base64,private';
  studio.background.name = 'private.png';
  studio.layers.top.text = 'KEEP THIS CAPTION';
  studio.stickers = [{ id: 's1', glyph: '🔥', x: .5, y: .5, size: 120, rotation: 0, opacity: 1 }];

  const snapshot = createRemixSnapshot({
    topic: 'AI meetings',
    selectedStyles: ['absurd'],
    weirdness: 8,
    studio,
    label: 'Before remix'
  }, { id: 'remix-test', now: new Date('2026-08-25T12:00:00Z') });

  const encoded = JSON.stringify(snapshot);
  assert.doesNotMatch(encoded, /private\.png|base64,private/);
  assert.match(encoded, /KEEP THIS CAPTION/);
  assert.equal(snapshot.studio.stickers[0].glyph, '🔥');
});

test('restoring a checkpoint keeps the current uploaded image', () => {
  const current = defaultStudio();
  current.background.dataUrl = 'data:image/webp;base64,current-image';
  current.background.name = 'current.webp';
  const old = defaultStudio();
  old.visualTheme = 'terminal';
  old.background.fit = 'contain';
  old.background.dataUrl = '';
  old.background.name = '';

  const restored = restoreSnapshotStudio(current, old);
  assert.equal(restored.visualTheme, 'terminal');
  assert.equal(restored.background.fit, 'contain');
  assert.equal(restored.background.dataUrl, current.background.dataUrl);
  assert.equal(restored.background.name, current.background.name);
});

test('remix history stays compact and capped', () => {
  const storage = memoryStorage();
  for (let index = 0; index < MAX_REMIX_HISTORY + 5; index += 1) {
    const snapshot = createRemixSnapshot({ studio: defaultStudio(), label: `Checkpoint ${index}` }, {
      id: `remix-${index}`,
      now: new Date(2026, 7, 25, 12, index)
    });
    const result = addRemixSnapshot(storage, snapshot);
    assert.equal(result.ok, true);
  }
  const history = loadRemixHistory(storage);
  assert.equal(history.length, MAX_REMIX_HISTORY);
  assert.equal(history[0].id, `remix-${MAX_REMIX_HISTORY + 4}`);
  assert.deepEqual(decodeRemixHistory('not json'), []);
});
