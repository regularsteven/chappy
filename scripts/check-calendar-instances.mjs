// Lifecycle checks for per-widget-instance calendar settings.
//
// The behaviour under test is what a user sees on the mirror: removing a
// Calendar widget takes its calendar with it, and a newly added one starts
// empty instead of inheriting the last one's links. Everything here runs
// against a throwaway ~/.chappy directory and never touches the network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const service = require('../main/calendar-service.js');

const chappyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chappy-calendar-'));
const configPath = path.join(chappyDir, 'calendar.json');
const readConfig = () => JSON.parse(fs.readFileSync(configPath, 'utf8'));
const writeConfig = (value) => fs.writeFileSync(configPath, JSON.stringify(value, null, 2), 'utf8');

const request = (method, route, body) =>
  service.handleApiRequest(
    new Request(`chappy-widget://api${route}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
  );

const getConfig = async (instanceId) => (await request('GET', `/config?instance=${instanceId}`)).json();

const FEED_A = 'https://example.com/a/basic.ics';
const FEED_B = 'https://example.com/b/basic.ics';

try {
  service.init({ chappyDir });
  assert.ok(fs.existsSync(configPath), 'init writes a config template on first run');

  // ---- a fresh instance starts empty ---------------------------------------
  {
    const cfg = await getConfig('widget-one');
    assert.equal(cfg.perInstance, true, 'the bridge advertises instance scoping to the widget');
    assert.deepEqual(cfg.icsUrls, [], 'a widget that has never been configured has no calendars');
    assert.equal(cfg.homeAddress, '');
  }

  // ---- two instances do not see each other's calendars ---------------------
  {
    const stored = readConfig();
    stored.instances = {
      'widget-one': { icsUrls: [FEED_A], homeAddress: 'Praha', homeCoordinates: { lat: 50, lng: 14 } },
      'widget-two': { icsUrls: [FEED_B], travelMode: 'walking' }
    };
    writeConfig(stored);

    assert.deepEqual((await getConfig('widget-one')).icsUrls, [FEED_A]);
    assert.equal((await getConfig('widget-one')).homeAddress, 'Praha');
    assert.deepEqual((await getConfig('widget-two')).icsUrls, [FEED_B]);
    assert.equal((await getConfig('widget-two')).travelMode, 'walking');
    assert.deepEqual(
      (await getConfig('widget-three')).icsUrls,
      [],
      'a third widget added later still starts on a clean slate'
    );
  }

  // ---- removing one widget clears only its data ----------------------------
  {
    const removed = service.pruneInstances(['widget-two', 'some-clock-widget']);
    assert.equal(removed, 1, 'exactly the instance with no live widget is dropped');
    assert.deepEqual(Object.keys(readConfig().instances), ['widget-two']);
    assert.deepEqual((await getConfig('widget-two')).icsUrls, [FEED_B], 'the surviving widget keeps its calendar');
    assert.deepEqual(
      (await getConfig('widget-one')).icsUrls,
      [],
      'the removed widget leaves nothing behind for a re-added one to inherit'
    );
    assert.equal((await getConfig('widget-one')).homeAddress, '', 'its address goes with it');
  }

  // ---- an explicit reset clears the asking instance ------------------------
  {
    const result = await (await request('POST', '/config/reset?instance=widget-two')).json();
    assert.equal(result.ok, true);
    assert.deepEqual((await getConfig('widget-two')).icsUrls, [], 'Start over empties the widget');
    assert.deepEqual(readConfig().instances, {}, 'and removes its block from the config file');
  }

  // ---- upgrading from the shared-config layout keeps the mirror working ----
  {
    // Pre-0.2 config: one set of calendar links at the top level, no instances.
    writeConfig({
      icsUrls: [FEED_A],
      homeAddress: 'Praha',
      homeCoordinates: { lat: 50, lng: 14 },
      travelMode: 'transit',
      googleClientId: 'kept',
      googleClientSecret: 'kept',
      rolloverHour: 17,
      bufferMinutes: 10,
      calendarIds: ['primary'],
      units: 'metric'
    });

    const adopted = await getConfig('widget-legacy');
    assert.deepEqual(adopted.icsUrls, [FEED_A], 'the first widget to ask adopts the pre-0.2 calendar');
    assert.equal(adopted.homeAddress, 'Praha');

    const stored = readConfig();
    assert.deepEqual(stored.instances['widget-legacy'].icsUrls, [FEED_A], 'adoption is written down, not re-derived');
    assert.deepEqual(stored.icsUrls, [], 'the top-level copy is cleared so it is claimed only once');
    assert.equal(stored.googleClientId, 'kept', 'hand-edited credentials survive the migration');

    assert.deepEqual(
      (await getConfig('widget-new')).icsUrls,
      [],
      'a widget added after the upgrade still starts empty'
    );
  }

  // ---- validation reaches the widget as a per-link verdict -----------------
  {
    const response = await request('POST', '/config/check?instance=widget-one', {
      icsUrls: ['https://calendar.google.com/calendar/u/1?cid=aGVsbG9AZXhhbXBsZS5jb20']
    });
    const result = await response.json();
    assert.equal(result.ok, true);
    assert.equal(result.sources.length, 1, 'one verdict per link');
    assert.equal(result.sources[0].ok, false, 'a Google app link is reported as unusable');
    assert.ok(/not a feed/i.test(result.sources[0].error), 'and says why in words a person can act on');
    assert.ok(/Secret address/i.test(result.sources[0].remedy), 'with the fix spelled out');
  }

  console.log('✅ Calendar instance lifecycle checks passed.');
} finally {
  fs.rmSync(chappyDir, { recursive: true, force: true });
}
