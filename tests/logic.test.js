'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../public/logic.js');
const S = require('../public/selftest.js');

for (const r of S.run(K)) test(r.name, () => assert.ok(r.ok, r.why));

test('date helpers', () => {
  assert.equal(K.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(K.addMonths('2028-03-31', -1), '2028-02-29');
  assert.equal(K.addMonths('2026-11-15', 3), '2027-02-15');
  assert.equal(K.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(K.isISO('2026-02-30'), false);
});

test('every category and kind gives a valid result and letter', () => {
  for (const cat of K.CAT_ORDER) for (const kind of K.CATS[cat].kinds) {
    const inp = { cat, kind, method: 'einschreiben', send: '2026-10-19', start: '2025-01-01', minTerm: 12, notice: { n: 1, u: 'm' },
      priceNotice: '2026-10-10', priceDate: '2026-12-01', moveDate: '2026-12-15', claimDate: '2026-10-01', name: 'Max Muster',
      address: 'Musterweg 1\n12345 Musterstadt', provider: 'Firma GmbH\nPostfach 1\n10115 Berlin', nr: '123', reason: 'Grund', sepa: true };
    const r = K.evaluate(inp);
    assert.ok(K.isISO(r.end), cat + '/' + kind + ' end');
    assert.ok(r.end >= r.receipt, cat + '/' + kind + ' ends before arrival');
    if (r.deadline) assert.ok(r.receipt <= r.deadline || r.late, cat + '/' + kind);
    const L = K.letter(inp, r);
    const txt = K.letterText(L);
    assert.ok(L.paragraphs.length >= 2);
    assert.match(txt, /Sehr geehrte Damen und Herren/);
    assert.match(txt, /bestätigen/);
    assert.doesNotMatch(txt, /undefined|NaN|\[object/);
    assert.doesNotMatch(txt, /[–—]/, 'no en/em dashes');
    for (const ref of r.refs) assert.ok(K.SOURCES[ref], 'source for ' + ref);
  }
});

test('extraordinary letter names § 314 BGB and falls back to ordinary', () => {
  const inp = { cat: 'fitness', kind: 'wichtig', method: 'email', send: '2026-10-21', start: '2025-03-15', minTerm: 24, notice: { n: 1, u: 'm' }, reason: 'Ärztlich bescheinigte Sportunfähigkeit' };
  const r = K.evaluate(inp);
  assert.equal(r.end, '2026-10-21');
  assert.equal(r.fallback, '2027-03-14');
  const t = K.letterText(K.letter(inp, r));
  assert.match(t, /§ 314 BGB/);
  assert.match(t, /Hilfsweise kündige ich ordentlich zum nächstmöglichen Zeitpunkt, nach meiner Berechnung zum 14\. März 2027/);
});

test('ICS is CRLF and folded', () => {
  const ics = K.buildICS({ date: '2027-02-10', summary: 'Kündigung absenden: Fitnessstudio', description: 'Muss bis 14.02.2027 ankommen', uid: 'x@hmsk.life', now: new Date(Date.UTC(2026, 9, 19)) });
  assert.ok(ics.endsWith('\r\n'));
  for (const l of ics.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75);
  assert.match(ics, /DTSTART;VALUE=DATE:20270210/);
});
