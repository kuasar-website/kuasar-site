import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allPaths, allTags, CACHE_TAGS, CONTENT_TYPES, pathsFor, previewPathFor } from './registry.ts';
import { EVENTS_CACHE_TAG } from '../events/data.ts';
import { SCHEDULE_CACHE_TAG } from '../schedule/data.ts';
import { PREVIEWABLE_UIDS } from '../../../cms/src/preview-url.ts';

test('registry covers exactly the seven CMS collections', () => {
  assert.deepEqual(Object.keys(CONTENT_TYPES).sort(), [
    'api::alumnus.alumnus', 'api::announcement.announcement', 'api::galactic-summit.galactic-summit',
    'api::nebula-night.nebula-night', 'api::schedule-event.schedule-event', 'api::sponsor.sponsor', 'api::stellar-talk.stellar-talk',
  ]);
});

test('merged loaders use the registry tags (no drift)', () => {
  assert.equal(EVENTS_CACHE_TAG, CACHE_TAGS.events);
  assert.equal(SCHEDULE_CACHE_TAG, CACHE_TAGS.schedule);
});

test('paths cover both locales; Turkish fallback means both are always revalidated', () => {
  assert.deepEqual(pathsFor('api::stellar-talk.stellar-talk'), ['/en/events', '/tr/etkinlikler']);
  assert.deepEqual(pathsFor('api::schedule-event.schedule-event'), ['/en/schedule', '/tr/takvim']);
  assert.deepEqual(pathsFor('api::galactic-summit.galactic-summit'), ['/en/galactic-summit', '/tr/galactic-summit']);
  assert.deepEqual(pathsFor('api::announcement.announcement'), ['/en/news', '/tr/duyurular']);
  assert.deepEqual(pathsFor('api::alumnus.alumnus'), ['/en/alumni', '/tr/mezunlar']);
  assert.deepEqual(pathsFor('api::sponsor.sponsor'), []);
  assert.deepEqual(pathsFor('api::unknown.unknown'), []);
  assert.ok(allTags().includes('announcements') && allTags().includes('alumni-directory'), 'Dev 3 tags reserved');
  assert.equal(allPaths().length, new Set(allPaths()).size);
});

test('preview targets are derived from the registry only', () => {
  assert.equal(previewPathFor('api::schedule-event.schedule-event', 'tr'), '/tr/takvim');
  assert.equal(previewPathFor('api::sponsor.sponsor', 'en'), null);
  assert.equal(previewPathFor('api::announcement.announcement', 'en'), null, 'until Dev 3 ships the route');
});

test('CMS previewable list agrees with the registry', () => {
  const previewable = Object.entries(CONTENT_TYPES).filter(([, entry]) => entry.preview).map(([uid]) => uid).sort();
  assert.deepEqual([...PREVIEWABLE_UIDS].sort(), previewable);
});
