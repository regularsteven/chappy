// Unit checks for the pure logic in main/calendar-service.js: event selection,
// leave-by arithmetic, travel-request shaping, and config sanitization.
//
// All test times are built with local-time Date constructors, so the
// assertions hold in any machine timezone (CI runs UTC, dev machines don't).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  sanitizeCalendarConfig,
  isVideoCallLocation,
  normalizeGoogleEvent,
  selectActiveEvent,
  buildAgenda,
  computeLeaveByUtc,
  isLiveDeparture,
  travelTtlMs,
  parseDurationSeconds,
  buildRouteRequestBody,
  normalizeGeocodeKey
} = require('../main/calendar-service.js')._test;

// A timed event at local (hourOffsetDays, hour, minute) relative to a base day.
const day = (offsetDays, hour, minute = 0) => new Date(2026, 7, 28 + offsetDays, hour, minute);
const timed = (title, offsetDays, hour, minute = 0, extra = {}) => {
  const startMs = day(offsetDays, hour, minute).getTime();
  return { id: title, title, startMs, startUtc: new Date(startMs).toISOString(), allDay: false, location: '', ...extra };
};
const allDay = (title, offsetDays) => {
  const startMs = new Date(2026, 7, 28 + offsetDays).getTime();
  return { id: title, title, startMs, startUtc: new Date(startMs).toISOString(), allDay: true, location: '' };
};

// ---- selectActiveEvent -----------------------------------------------------

{
  // Before the cutoff, the next future event today wins; in-progress skipped.
  const events = [timed('started', 0, 8, 30), timed('standup', 0, 10), timed('review', 0, 14), timed('dentist', 1, 8)];
  const pick = selectActiveEvent(events, day(0, 9), 17);
  assert.equal(pick.event.title, 'standup', 'should pick the first future event today');
  assert.equal(pick.isTomorrow, false);
}

{
  // Past the rollover hour, today's remaining events are skipped for tomorrow.
  const events = [timed('dinner', 0, 19), timed('dentist', 1, 8)];
  const pick = selectActiveEvent(events, day(0, 18), 17);
  assert.equal(pick.event.title, 'dentist', 'after cutoff the widget looks at tomorrow');
  assert.equal(pick.isTomorrow, true);
}

{
  // Today exhausted before the cutoff also rolls over to tomorrow.
  const events = [timed('lunch', 0, 12), timed('dentist', 1, 8, 30)];
  const pick = selectActiveEvent(events, day(0, 14), 17);
  assert.equal(pick.event.title, 'dentist');
  assert.equal(pick.isTomorrow, true);
}

{
  // An overnight 00:30 event is "tomorrow" by date but selectable tonight.
  const events = [timed('red-eye', 1, 0, 30)];
  const pick = selectActiveEvent(events, day(0, 22), 17);
  assert.equal(pick.event.title, 'red-eye', 'overnight events are selected by absolute time');
  assert.equal(pick.isTomorrow, true);
}

{
  // Nothing today, nothing tomorrow -> null, even with later events on file.
  const events = [timed('someday', 3, 9)];
  const pick = selectActiveEvent(events, day(0, 18), 17);
  assert.equal(pick.event, null, 'day-after-tomorrow events never become active');
}

{
  // All-day events never become the active event.
  const events = [allDay('conference', 1)];
  const pick = selectActiveEvent(events, day(0, 18), 17);
  assert.equal(pick.event, null, 'all-day events are excluded from leave-by logic');
}

// ---- buildAgenda -----------------------------------------------------------

{
  const events = [
    allDay('conference', 0),
    timed('started', 0, 8),
    timed('standup', 0, 10),
    timed('dentist', 1, 8)
  ];
  const agenda = buildAgenda(events, day(0, 9));
  assert.deepEqual(
    agenda.map((item) => item.title),
    ['conference', 'standup'],
    'agenda is today only: all-day first, then not-yet-started timed events'
  );
  assert.equal(agenda[0].allDay, true);
}

// ---- normalizeGoogleEvent --------------------------------------------------

{
  const event = normalizeGoogleEvent({
    id: 'e1',
    summary: '  Dentist  ',
    status: 'confirmed',
    location: 'Vinohradská 123, Praha 2',
    start: { dateTime: '2026-08-29T09:30:00+02:00' }
  });
  assert.equal(event.title, 'Dentist');
  assert.equal(event.location, 'Vinohradská 123, Praha 2');
  assert.equal(event.startMs, Date.parse('2026-08-29T09:30:00+02:00'));
  assert.equal(event.startUtc, '2026-08-29T07:30:00.000Z', 'startUtc is normalized to UTC');
  assert.equal(event.allDay, false);
}

assert.equal(normalizeGoogleEvent({ status: 'cancelled', start: { dateTime: '2026-08-29T09:30:00Z' } }), null);
assert.equal(
  normalizeGoogleEvent({
    summary: 'Declined',
    start: { dateTime: '2026-08-29T09:30:00Z' },
    attendees: [{ self: true, responseStatus: 'declined' }]
  }),
  null,
  'events the user declined are dropped'
);
assert.notEqual(
  normalizeGoogleEvent({
    summary: 'Someone else declined',
    start: { dateTime: '2026-08-29T09:30:00Z' },
    attendees: [{ self: false, responseStatus: 'declined' }, { self: true, responseStatus: 'accepted' }]
  }),
  null,
  'only the user’s own declined status filters an event'
);

{
  const event = normalizeGoogleEvent({ summary: 'Offsite', start: { date: '2026-08-29' } });
  assert.equal(event.allDay, true);
  assert.equal(event.startMs, new Date(2026, 7, 29).getTime(), 'all-day start is local midnight');
}

assert.equal(normalizeGoogleEvent({ start: { dateTime: 'garbage' } }), null);
assert.equal(normalizeGoogleEvent({ start: { dateTime: '2026-08-29T09:30:00Z' } }).title, '(untitled)');

{
  const event = normalizeGoogleEvent({
    summary: 'Call',
    location: 'https://meet.google.com/abc-defg-hij',
    start: { dateTime: '2026-08-29T09:30:00Z' }
  });
  assert.equal(event.location, '', 'video-call locations are treated as no location');
}

// ---- isVideoCallLocation ---------------------------------------------------

assert.equal(isVideoCallLocation('https://zoom.us/j/123456'), true);
assert.equal(isVideoCallLocation('meet.google.com/abc-defg-hij'), true);
assert.equal(isVideoCallLocation('teams.microsoft.com/l/meetup-join/x'), true);
assert.equal(isVideoCallLocation('https://example.com/somewhere'), true, 'any URL is not a travel destination');
assert.equal(isVideoCallLocation('Vinohradská 123, Praha 2'), false);
assert.equal(isVideoCallLocation(''), false);

// ---- leave-by arithmetic ---------------------------------------------------

{
  const startMs = Date.parse('2026-08-29T07:30:00Z');
  assert.equal(
    computeLeaveByUtc(startMs, 22 * 60, 10),
    '2026-08-29T06:58:00.000Z',
    'leaveBy = start - travel - buffer'
  );
}

// ---- departure classification and cadence ----------------------------------

{
  const now = Date.now();
  assert.equal(isLiveDeparture(now + 90 * 60 * 1000, now), true, 'within 2 h uses live traffic');
  assert.equal(isLiveDeparture(now + 3 * 60 * 60 * 1000, now), false, 'beyond 2 h uses the predictive model');
  assert.equal(travelTtlMs(now + 90 * 60 * 1000, now), 10 * 60 * 1000);
  assert.equal(travelTtlMs(now + 3 * 60 * 60 * 1000, now), 30 * 60 * 1000);
}

// ---- Routes API request shaping --------------------------------------------

{
  const base = { home: { lat: 50.0755, lng: 14.4378 }, destination: { lat: 50.08, lng: 14.5 } };
  const drive = buildRouteRequestBody({ ...base, travelMode: 'driving', departureTimeMs: Date.parse('2026-08-29T05:30:00Z') });
  assert.equal(drive.travelMode, 'DRIVE');
  assert.equal(drive.routingPreference, 'TRAFFIC_AWARE_OPTIMAL');
  assert.equal(drive.trafficModel, 'BEST_GUESS');
  assert.equal(drive.departureTime, '2026-08-29T05:30:00.000Z');
  assert.equal(drive.units, 'METRIC', 'metric everywhere, no miles');

  const liveDrive = buildRouteRequestBody({ ...base, travelMode: 'driving', departureTimeMs: null });
  assert.equal(liveDrive.departureTime, undefined, 'live queries omit departureTime (defaults to now)');

  const walk = buildRouteRequestBody({ ...base, travelMode: 'walking', departureTimeMs: Date.now() });
  assert.equal(walk.travelMode, 'WALK');
  assert.equal(walk.routingPreference, undefined, 'traffic options only apply to driving');
  assert.equal(walk.trafficModel, undefined);
  assert.equal(walk.departureTime, undefined, 'departureTime is meaningless on foot');

  const transit = buildRouteRequestBody({ ...base, travelMode: 'transit', departureTimeMs: Date.parse('2026-08-29T05:30:00Z') });
  assert.equal(transit.travelMode, 'TRANSIT');
  assert.equal(transit.routingPreference, undefined);
  assert.equal(transit.departureTime, '2026-08-29T05:30:00.000Z', 'transit keeps departureTime for timetables');
}

assert.equal(parseDurationSeconds('1234s'), 1234);
assert.equal(parseDurationSeconds('1234.5s'), 1235);
assert.equal(parseDurationSeconds('garbage'), null);
assert.equal(parseDurationSeconds(1234), null);

// ---- config sanitization ---------------------------------------------------

{
  const config = sanitizeCalendarConfig(null);
  assert.equal(config.rolloverHour, 17);
  assert.equal(config.bufferMinutes, 10);
  assert.equal(config.travelMode, 'driving');
  assert.deepEqual(config.calendarIds, ['primary']);
  assert.equal(config.homeCoordinates, null);
  assert.equal(config.units, 'metric');
}

{
  const config = sanitizeCalendarConfig({
    googleClientId: '  id  ',
    googleClientSecret: 'secret',
    mapsApiKey: 'key',
    homeCoordinates: { lat: 50.0755, lng: 14.4378 },
    rolloverHour: 99,
    bufferMinutes: -5,
    travelMode: 'teleport',
    calendarIds: ['primary', '  work@example.com ', '', 42]
  });
  assert.equal(config.googleClientId, 'id');
  assert.equal(config.rolloverHour, 23, 'rollover hour clamps to 0–23');
  assert.equal(config.bufferMinutes, 0, 'buffer clamps to ≥ 0');
  assert.equal(config.travelMode, 'driving', 'unknown travel modes fall back to driving');
  assert.deepEqual(config.calendarIds, ['primary', 'work@example.com']);
  assert.deepEqual(config.homeCoordinates, { lat: 50.0755, lng: 14.4378 });
}

assert.equal(sanitizeCalendarConfig({ homeCoordinates: { lat: 91, lng: 0 } }).homeCoordinates, null);

assert.equal(normalizeGeocodeKey('  Vinohradská   123,\nPraha 2 '), 'vinohradská 123, praha 2');

console.log('✅ Calendar service logic checks passed.');
