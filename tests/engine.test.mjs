import test from 'node:test';
import assert from 'node:assert/strict';

import { buildConcepts } from '../src/engines/meme-engine.js';
import { scoreMemePotential } from '../src/engines/score-engine.js';

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
