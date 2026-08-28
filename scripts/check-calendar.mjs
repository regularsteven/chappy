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
  normalizeIcsUrl,
  isVideoCallLocation,
  normalizeGoogleEvent,
  expandIcsEvents,
  selectActiveEvent,
  buildAgenda,
  buildWeek,
  computeLeaveByUtc,
  isLiveDeparture,
  travelTtlMs,
  parseDurationSeconds,
  buildRouteRequestBody,
  buildOsrmUrl,
  buildNominatimUrl,
  normalizeGeocodeKey
} = require('../main/calendar-service.js')._test;
const ical = require('node-ical');

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

// ---- ICS URL normalization -------------------------------------------------

assert.equal(
  normalizeIcsUrl('webcal://calendar.google.com/calendar/ical/x/private-abc/basic.ics'),
  'https://calendar.google.com/calendar/ical/x/private-abc/basic.ics',
  'webcal:// links normalize to https'
);
assert.equal(normalizeIcsUrl('  https://example.com/cal.ics  '), 'https://example.com/cal.ics');
assert.equal(normalizeIcsUrl('ftp://example.com/cal.ics'), '', 'non-http protocols are rejected');
assert.equal(normalizeIcsUrl('not a url'), '');
assert.equal(normalizeIcsUrl(''), '');

{
  const config = sanitizeCalendarConfig({
    icsUrls: ['webcal://a.example/c.ics', 'garbage', 'https://b.example/c.ics', 1, 'https://c.example/1', 'https://c.example/2', 'https://c.example/3', 'https://c.example/4'],
    homeAddress: `  Vinohradská 123 ${'x'.repeat(300)}`
  });
  assert.equal(config.icsUrls.length, 5, 'ics urls are capped');
  assert.equal(config.icsUrls[0], 'https://a.example/c.ics');
  assert.equal(config.homeAddress.length, 200, 'home address is length-capped');
}

assert.deepEqual(sanitizeCalendarConfig(null).icsUrls, [], 'icsUrls default to empty');

// ---- ICS parsing and recurrence expansion ----------------------------------
// Exercises the real node-ical parser, so a dependency upgrade that changes
// its output shape fails here instead of on the mirror.

const VTZ_PRAGUE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Prague',
  'BEGIN:STANDARD',
  'DTSTART:19701025T030000',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T020000',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'END:VTIMEZONE'
];

const icsFixture = (lines) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chappy tests//EN', ...VTZ_PRAGUE, ...lines, 'END:VCALENDAR', ''].join(
    '\r\n'
  );

{
  const parsed = ical.sync.parseICS(
    icsFixture([
      'BEGIN:VEVENT',
      'UID:simple@test',
      'SUMMARY:Dentist',
      'LOCATION:Vinohradská 123\\, Praha 2',
      'DTSTART;TZID=Europe/Prague:20260829T093000',
      'DTEND;TZID=Europe/Prague:20260829T101500',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:allday@test',
      'SUMMARY:Conference',
      'DTSTART;VALUE=DATE:20260829',
      'DTEND;VALUE=DATE:20260830',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:call@test',
      'SUMMARY:Remote call',
      'LOCATION:https://meet.google.com/abc-defg-hij',
      'DTSTART;TZID=Europe/Prague:20260829T110000',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:recur@test',
      'SUMMARY:Standup',
      'DTSTART;TZID=Europe/Prague:20260824T091500',
      'DTEND;TZID=Europe/Prague:20260824T093000',
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR',
      'EXDATE;TZID=Europe/Prague:20260828T091500',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:cancelled@test',
      'SUMMARY:Gone',
      'STATUS:CANCELLED',
      'DTSTART;TZID=Europe/Prague:20260829T120000',
      'END:VEVENT'
    ])
  );
  const windowStartMs = Date.parse('2026-08-26T00:00:00Z');
  const windowEndMs = Date.parse('2026-09-03T00:00:00Z');
  const events = expandIcsEvents(parsed, windowStartMs, windowEndMs).sort((a, b) => a.startMs - b.startMs);

  const dentist = events.find((e) => e.title === 'Dentist');
  assert.equal(dentist.startUtc, '2026-08-29T07:30:00.000Z', 'TZID start converts to the right UTC instant');
  assert.equal(dentist.location, 'Vinohradská 123, Praha 2', 'escaped commas unescape');
  assert.equal(dentist.allDay, false);

  const conference = events.find((e) => e.title === 'Conference');
  assert.equal(conference.allDay, true);
  assert.equal(conference.startMs, new Date(2026, 7, 29).getTime(), 'all-day ICS start is local midnight');

  const remoteCall = events.find((e) => e.title === 'Remote call');
  assert.equal(remoteCall.location, '', 'video-call locations are dropped from ICS events too');

  const standups = events.filter((e) => e.title === 'Standup').map((e) => e.startUtc);
  assert.deepEqual(
    standups,
    ['2026-08-26T07:15:00.000Z', '2026-08-31T07:15:00.000Z', '2026-09-02T07:15:00.000Z'],
    'recurrence expands within the window and EXDATE removes the 28th'
  );

  assert.equal(events.some((e) => e.title === 'Gone'), false, 'cancelled ICS events are dropped');
}

{
  // A RECURRENCE-ID override replaces its base occurrence at the new time.
  const parsed = ical.sync.parseICS(
    icsFixture([
      'BEGIN:VEVENT',
      'UID:moved@test',
      'SUMMARY:1:1',
      'DTSTART;TZID=Europe/Prague:20260824T100000',
      'DTEND;TZID=Europe/Prague:20260824T103000',
      'RRULE:FREQ=WEEKLY;BYDAY=MO',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:moved@test',
      'RECURRENCE-ID;TZID=Europe/Prague:20260831T100000',
      'SUMMARY:1:1 (moved)',
      'DTSTART;TZID=Europe/Prague:20260831T140000',
      'DTEND;TZID=Europe/Prague:20260831T143000',
      'END:VEVENT'
    ])
  );
  const events = expandIcsEvents(parsed, Date.parse('2026-08-30T00:00:00Z'), Date.parse('2026-09-02T00:00:00Z'));
  assert.equal(events.length, 1, 'the overridden base occurrence is replaced, not duplicated');
  assert.equal(events[0].startUtc, '2026-08-31T12:00:00.000Z', 'the override supplies the moved start');
  assert.equal(events[0].title, '1:1 (moved)');
}

// ---- buildWeek --------------------------------------------------------------

{
  const events = [
    allDay('conference', 0),
    timed('started', 0, 8),
    timed('standup', 0, 10),
    timed('dentist', 1, 8, 30),
    timed('review', 3, 15),
    timed('beyond-window', 9, 9)
  ];
  const week = buildWeek(events, day(0, 9));
  assert.equal(week.length, 3, 'empty days are omitted and out-of-window events ignored');
  assert.deepEqual(
    week[0].events.map((e) => e.title),
    ['conference', 'standup'],
    "today's group keeps all-day plus not-yet-started events"
  );
  assert.equal(new Date(week[0].dateUtc).getTime(), day(0, 0).getTime(), 'group date is local midnight');
  assert.deepEqual(week[1].events.map((e) => e.title), ['dentist']);
  assert.deepEqual(week[2].events.map((e) => e.title), ['review']);
}

// ---- keyless travel providers ----------------------------------------------

{
  const home = { lat: 50.0755, lng: 14.4378 };
  const destination = { lat: 50.08, lng: 14.5 };
  assert.equal(
    buildOsrmUrl('driving', home, destination),
    'https://routing.openstreetmap.de/routed-car/route/v1/driving/14.4378,50.0755;14.5,50.08?overview=false',
    'OSRM takes lng,lat pairs on the car profile'
  );
  assert.ok(buildOsrmUrl('walking', home, destination).includes('/routed-foot/'));
  assert.ok(buildOsrmUrl('bicycling', home, destination).includes('/routed-bike/'));
  assert.equal(buildOsrmUrl('transit', home, destination), '', 'keyless tier has no transit routing');

  const nominatim = buildNominatimUrl('Vinohradská 123, Praha 2');
  assert.ok(nominatim.startsWith('https://nominatim.openstreetmap.org/search?'));
  assert.ok(nominatim.includes('format=jsonv2'));
  assert.ok(nominatim.includes('limit=1'));
  assert.ok(nominatim.includes(encodeURIComponent('Vinohradská 123, Praha 2').replace(/%20/g, '+')) || nominatim.includes('Vinohradsk'));
}

console.log('✅ Calendar service logic checks passed.');
