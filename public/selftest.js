/* Deadline self-test: fixed cases with hand-checked answers. Runs in Node (tests/) and in the browser (selftest.html). */
(function (root) {
  'use strict';
  var M1 = { n: 1, u: 'm' }, M3 = { n: 3, u: 'm' };
  // [name, function name, args, expected subset]
  var CASES = [
    ['Gym 24 months from 15 Mar 2025, 1 month notice: ends 14 Mar 2027, must arrive by 14 Feb 2027', 'ordinary',
      [{ cat: 'fitness', start: '2025-03-15', minTerm: 24, notice: M1 }, '2026-10-21'], { end: '2027-03-14', deadline: '2027-02-14' }],
    ['Arriving on the last day still works', 'ordinary',
      [{ cat: 'fitness', start: '2025-03-15', minTerm: 24, notice: M1 }, '2027-02-14'], { end: '2027-03-14', deadline: '2027-02-14' }],
    ['One day late: no 12-month renewal, ends one month after arrival (§ 309 Nr. 9 b BGB)', 'ordinary',
      [{ cat: 'fitness', start: '2025-03-15', minTerm: 24, notice: M1 }, '2027-02-15'], { end: '2027-03-15', deadline: null }],
    ['After the minimum term: one month from arrival', 'ordinary',
      [{ cat: 'fitness', start: '2025-03-15', minTerm: 24, notice: M1 }, '2027-06-30'], { end: '2027-07-30', deadline: null }],
    ['Term ends 31 Mar: deadline is 28 Feb (§ 188 Abs. 3 BGB)', 'ordinary',
      [{ cat: 'sonstiges', start: '2025-04-01', minTerm: 12, notice: M1 }, '2026-02-28'], { end: '2026-03-31', deadline: '2026-02-28' }],
    ['Arrives 1 Mar: ends 1 Apr', 'ordinary',
      [{ cat: 'sonstiges', start: '2025-04-01', minTerm: 12, notice: M1 }, '2026-03-01'], { end: '2026-04-01' }],
    ['Contract since 2022 asks 3 months notice: capped at 1 month', 'ordinary',
      [{ cat: 'fitness', start: '2025-03-15', minTerm: 24, notice: M3 }, '2027-02-01'], { end: '2027-03-14', deadline: '2027-02-14', warnHas: 'capped_1m' }],
    ['Old contract (2020), renews by 12 months, 3 months notice: ends 31 Dec 2026', 'ordinary',
      [{ cat: 'zeitung', start: '2020-01-01', minTerm: 24, ext: 12, notice: M3 }, '2026-09-30'], { end: '2026-12-31', deadline: '2026-09-30' }],
    ['Old contract, one day late: next renewal 31 Dec 2027', 'ordinary',
      [{ cat: 'zeitung', start: '2020-01-01', minTerm: 24, ext: 12, notice: M3 }, '2026-10-01'], { end: '2027-12-31', deadline: '2027-09-30' }],
    ['Mobile after 24 months: monthly (§ 56 Abs. 3 TKG)', 'ordinary',
      [{ cat: 'mobil', start: '2024-05-10', minTerm: 24, notice: M1 }, '2026-10-21'], { end: '2026-11-21', deadline: null }],
    ['Mobile in the minimum term: ends with the term', 'ordinary',
      [{ cat: 'mobil', start: '2025-01-20', minTerm: 24, notice: M1 }, '2026-10-21'], { end: '2027-01-19', deadline: '2026-12-19' }],
    ['Streaming without minimum term: from arrival', 'ordinary',
      [{ cat: 'streaming', minTerm: 0, notice: { n: 0, u: 'd' } }, '2026-10-21'], { end: '2026-10-21' }],
    ['Insurance year to 31 Dec, 3 months notice: arrives 30 Sep, ends 31 Dec', 'ordinary',
      [{ cat: 'versicherung', start: '2024-01-01', minTerm: 12, notice: M3 }, '2026-09-30'], { end: '2026-12-31', deadline: '2026-09-30' }],
    ['Insurance, arrives 1 Oct: ends a year later (§ 11 Abs. 1 VVG)', 'ordinary',
      [{ cat: 'versicherung', start: '2024-01-01', minTerm: 12, notice: M3 }, '2026-10-01'], { end: '2027-12-31' }],
    ['Five-year insurance: may end after year 3 with 3 months notice (§ 11 Abs. 4 VVG)', 'ordinary',
      [{ cat: 'versicherung', start: '2020-07-01', minTerm: 60, notice: M1 }, '2023-03-30'], { end: '2023-06-30', deadline: '2023-03-30' }],
    ['Five-year insurance, too late for year 3: end of year 4', 'ordinary',
      [{ cat: 'versicherung', start: '2020-07-01', minTerm: 60, notice: M1 }, '2023-03-31'], { end: '2024-06-30' }],
    ['Club, end of business year, 3 months notice', 'ordinary',
      [{ cat: 'verein', fyOnly: true, fyEnd: 12, notice: M3 }, '2026-09-30'], { end: '2026-12-31', deadline: '2026-09-30' }],
    ['Club, too late for this year', 'ordinary',
      [{ cat: 'verein', fyOnly: true, fyEnd: 12, notice: M3 }, '2026-10-21'], { end: '2027-12-31' }],
    ['Basic electricity supply: two weeks (§ 20 StromGVV)', 'ordinary',
      [{ cat: 'energie', grund: true }, '2026-10-21'], { end: '2026-11-04' }],
    ['Internet, move on 15 Dec, service not available: ends on moving day (§ 60 TKG)', 'evaluate',
      [{ cat: 'internet', kind: 'umzug', method: 'email', send: '2026-10-21', moveDate: '2026-12-15', start: '2025-01-01', minTerm: 24 }], { end: '2026-12-15', special: true }],
    ['Internet, move on 1 Nov: one month from arrival', 'evaluate',
      [{ cat: 'internet', kind: 'umzug', method: 'email', send: '2026-10-21', moveDate: '2026-11-01', start: '2025-01-01', minTerm: 24 }], { end: '2026-11-21' }],
    ['Electricity, move: six weeks (§ 41b Abs. 5 EnWG)', 'evaluate',
      [{ cat: 'energie', kind: 'umzug', method: 'email', send: '2026-10-21', moveDate: '2026-11-01' }], { end: '2026-12-02' }],
    ['Electricity price increase on 1 Dec: ends 1 Dec, must arrive by 30 Nov (§ 41 Abs. 5 EnWG)', 'evaluate',
      [{ cat: 'energie', kind: 'preis', method: 'email', send: '2026-10-21', priceDate: '2026-12-01' }], { end: '2026-12-01', deadline: '2026-11-30', special: true }],
    ['Electricity price increase, too late: ordinary cancellation instead', 'evaluate',
      [{ cat: 'energie', kind: 'preis', method: 'email', send: '2026-12-01', priceDate: '2026-12-01', start: '2026-01-01', minTerm: 12, notice: M1 }], { late: true, special: false, end: '2027-01-01' }],
    ['Insurance premium increase: within one month of the notice (§ 40 VVG)', 'evaluate',
      [{ cat: 'versicherung', kind: 'preis', method: 'email', send: '2026-10-21', priceNotice: '2026-10-10', priceDate: '2027-01-01', start: '2024-01-01' }], { end: '2027-01-01', deadline: '2026-11-10' }],
    ['Registered letter posted Fri 23 Oct arrives Wed 28 Oct', 'receiptDate', ['2026-10-23', 'einschreiben'], '2026-10-28'],
    ['Email on Saturday counts from Monday', 'receiptDate', ['2026-10-24', 'email'], '2026-10-26'],
    ['To arrive by Wed 28 Oct, post a letter by Sat 24 Oct', 'latestSend', ['2026-10-28', 'einschreiben'], '2026-10-24'],
    ['To arrive by Sun 14 Feb 2027, post a letter by Tue 9 Feb', 'latestSend', ['2027-02-14', 'einschreiben'], '2027-02-09'],
    ['Email deadline on a Sunday: send by Friday', 'latestSend', ['2027-02-14', 'email'], '2027-02-12'],
  ];

  function run(K) {
    var out = [];
    CASES.forEach(function (c) {
      var got = K[c[1]].apply(null, c[2]), exp = c[3], ok = true, why = [];
      if (typeof exp === 'string') { ok = got === exp; if (!ok) why.push(got + ' != ' + exp); }
      else Object.keys(exp).forEach(function (k) {
        if (k === 'warnHas') { if (got.warn.indexOf(exp[k]) < 0) { ok = false; why.push('warn ' + exp[k]); } return; }
        var g = got[k] === undefined ? (k === 'special' || k === 'late' ? false : undefined) : got[k];
        if (g !== exp[k]) { ok = false; why.push(k + ': ' + g + ' != ' + exp[k]); }
      });
      out.push({ name: c[0], ok: ok, why: why.join('; ') });
    });
    return out;
  }
  var api = { CASES: CASES, run: run };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KuendigungSelfTest = api;
})(typeof window !== 'undefined' ? window : globalThis);
