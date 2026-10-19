/* Kündigung generator: deadline rules and the German letter. No DOM; tested with node --test tests/.
   Legal basis as of 19 October 2026 (see SOURCES). Consumer contracts in Germany only. */
(function (root) {
  'use strict';

  var AS_OF = '2026-10-19';
  var NEW_LAW = '2022-03-01'; // § 309 Nr. 9 BGB as amended by the Gesetz für faire Verbraucherverträge (Art. 229 § 60 EGBGB)

  // ---------- dates (ISO yyyy-mm-dd, calendar days in UTC) ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parse(iso) { var p = iso.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function fmt(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function isISO(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && fmt(parse(s)) === s; }
  function addDays(iso, n) { var d = parse(iso); d.setUTCDate(d.getUTCDate() + n); return fmt(d); }
  function daysIn(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }
  // Same day number n months later/earlier; clamps to the month end (§ 188 Abs. 3 BGB).
  function addMonths(iso, n) {
    var p = iso.split('-'), y = +p[0], m = +p[1] - 1 + n, d = +p[2];
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + pad(m + 1) + '-' + pad(Math.min(d, daysIn(y, m)));
  }
  function monthEnd(y, m1) { return y + '-' + pad(m1) + '-' + pad(daysIn(y, m1 - 1)); }
  function maxDate(a, b) { return a > b ? a : b; }
  function weekday(iso) { return parse(iso).getUTCDay(); } // 0 Sunday
  function addWorkdays(iso, n) {
    var d = iso, step = n < 0 ? -1 : 1, left = Math.abs(n);
    while (left > 0) { d = addDays(d, step); var w = weekday(d); if (w !== 0 && w !== 6) left--; }
    return d;
  }
  function nextWorkday(iso) { var w = weekday(iso); return w === 6 ? addDays(iso, 2) : w === 0 ? addDays(iso, 1) : iso; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  // A notice period: { n: number, u: 'd' | 'w' | 'm' }.
  function forward(iso, nt) { return nt.u === 'm' ? addMonths(iso, nt.n) : addDays(iso, nt.u === 'w' ? 7 * nt.n : nt.n); }
  // Latest day the cancellation must ARRIVE so the period ends on `end` (counted back from the end date).
  function backward(end, nt) { return nt.u === 'm' ? addMonths(end, -nt.n) : addDays(end, -(nt.u === 'w' ? 7 * nt.n : nt.n)); }
  function inDays(nt) { return nt.u === 'm' ? nt.n * 30.44 : nt.u === 'w' ? nt.n * 7 : nt.n; }
  var ONE_MONTH = { n: 1, u: 'm' };
  var THREE_MONTHS = { n: 3, u: 'm' };

  // ---------- categories ----------
  // rule: consumer (§ 309 Nr. 9 BGB), tkg (§ 56 TKG), vvg (§ 11 VVG), verein (§ 39 BGB), energy (consumer or Grundversorgung)
  var CATS = {
    fitness:      { rule: 'consumer', kinds: ['ordentlich', 'wichtig', 'umzug', 'preis'], minTerm: 12, notice: { n: 1, u: 'm' } },
    mobil:        { rule: 'tkg', kinds: ['ordentlich', 'preis'], minTerm: 24, notice: { n: 1, u: 'm' } },
    internet:     { rule: 'tkg', kinds: ['ordentlich', 'umzug', 'preis', 'speed'], minTerm: 24, notice: { n: 1, u: 'm' } },
    versicherung: { rule: 'vvg', kinds: ['ordentlich', 'preis', 'schaden'], minTerm: 12, notice: { n: 3, u: 'm' } },
    streaming:    { rule: 'consumer', kinds: ['ordentlich', 'preis'], minTerm: 0, notice: { n: 0, u: 'd' } },
    zeitung:      { rule: 'consumer', kinds: ['ordentlich', 'preis', 'wichtig'], minTerm: 12, notice: { n: 1, u: 'm' } },
    energie:      { rule: 'energy', kinds: ['ordentlich', 'preis', 'umzug'], minTerm: 12, notice: { n: 1, u: 'm' } },
    verein:       { rule: 'verein', kinds: ['ordentlich', 'wichtig'], minTerm: 0, notice: { n: 3, u: 'm' } },
    sonstiges:    { rule: 'consumer', kinds: ['ordentlich', 'wichtig', 'preis'], minTerm: 12, notice: { n: 1, u: 'm' } },
  };
  var CAT_ORDER = ['fitness', 'mobil', 'internet', 'versicherung', 'streaming', 'zeitung', 'energie', 'verein', 'sonstiges'];

  // Delivery assumption per sending method, from the send date to the day it arrives (Zugang, § 130 BGB).
  // Letters: the Postgesetz (2025) target is delivery by the third working day; we count three working days.
  var METHODS = { einschreiben: 3, brief: 3, email: 0, button: 0, fax: 0 };
  function receiptDate(sendISO, method) {
    var n = METHODS[method] === undefined ? 3 : METHODS[method];
    return n ? addWorkdays(sendISO, n) : nextWorkday(sendISO);
  }
  function latestSend(arriveBy, method) {
    var n = METHODS[method] === undefined ? 3 : METHODS[method];
    var d = n ? addWorkdays(arriveBy, -n) : arriveBy;
    while (receiptDate(d, method) > arriveBy) d = addDays(d, -1);
    while (receiptDate(addDays(d, 1), method) <= arriveBy) d = addDays(d, 1);
    return weekday(d) === 0 ? addDays(d, -1) : d; // post it on Saturday rather than Sunday

  }

  // ---------- ordinary cancellation ----------
  /* ordinary(c, receipt) -> { end, deadline, refs, warn, nextEnd? }
     c: { cat, start, minTerm, notice, ext, grund, fyEnd, fyOnly }
     end: day the contract ends if the cancellation arrives on `receipt`.
     deadline: the latest arrival day for that end date (null when any day works). */
  function ordinary(c, receipt) {
    var cat = CATS[c.cat] || CATS.sonstiges;
    var rule = cat.rule;
    if (rule === 'energy') rule = c.grund ? 'grund' : 'consumer';
    var warn = [], refs = [];
    var notice = c.notice && c.notice.n >= 0 ? { n: +c.notice.n, u: c.notice.u } : cat.notice;
    var minTerm = Math.max(0, +c.minTerm || 0);
    var start = isISO(c.start) ? c.start : null;

    if (rule === 'grund') {
      refs.push('stromgvv20');
      return { end: addDays(receipt, 14), deadline: null, refs: refs, warn: warn, rule: rule };
    }

    if (rule === 'verein') {
      refs.push('bgb39');
      if (inDays(notice) > 731) { warn.push('verein_cap'); notice = { n: 24, u: 'm' }; }
      if (!c.fyOnly) return { end: forward(receipt, notice), deadline: null, refs: refs, warn: warn, rule: rule };
      var fy = Math.min(12, Math.max(1, +c.fyEnd || 12));
      var y = +receipt.slice(0, 4) - 1;
      for (var i = 0; i < 6; i++, y++) {
        var e = monthEnd(y, fy);
        if (e < receipt) continue;
        var dl = backward(e, notice);
        if (receipt <= dl) return { end: e, deadline: dl, refs: refs, warn: warn, rule: rule };
      }
    }

    if (rule === 'vvg') {
      refs.push('vvg11');
      if (!start) { warn.push('need_start'); start = receipt; }
      if (inDays(notice) > inDays(THREE_MONTHS) || inDays(notice) < 28) warn.push('vvg_notice');
      var term = minTerm || 12, ext = Math.min(12, +c.ext || 12);
      var cands = [];
      for (var k = 0; k < 200; k++) cands.push({ m: term + k * ext, nt: notice });
      if (term > 36) { refs.push('vvg11_4'); for (var j = 36; j < term; j += 12) cands.push({ m: j, nt: THREE_MONTHS }); }
      cands.sort(function (a, b) { return a.m - b.m; });
      for (var q = 0; q < cands.length; q++) {
        var te = addDays(addMonths(start, cands[q].m), -1);
        if (te < receipt) continue;
        var d2 = backward(te, cands[q].nt);
        if (receipt <= d2) return { end: te, deadline: d2, refs: refs, warn: warn, rule: rule };
      }
    }

    // consumer contracts (§ 309 Nr. 9 BGB) and telecoms (§ 56 TKG)
    var newLaw = !start || start >= NEW_LAW;
    var after; // notice once the minimum term is over
    if (rule === 'tkg') {
      refs.push('tkg56');
      if (minTerm > 24) warn.push('tkg_24');
      if (newLaw && inDays(notice) > inDays(ONE_MONTH)) { warn.push('capped_1m'); notice = ONE_MONTH; }
      after = inDays(notice) < inDays(ONE_MONTH) ? notice : ONE_MONTH;
    } else if (newLaw) {
      refs.push('bgb309_9');
      if (minTerm > 24) warn.push('term_24');
      if (inDays(notice) > inDays(ONE_MONTH)) { warn.push('capped_1m'); notice = ONE_MONTH; }
      after = notice;
    } else {
      refs.push('bgb309_9_old');
      if (inDays(notice) > inDays(THREE_MONTHS)) { warn.push('capped_3m'); notice = THREE_MONTHS; }
      var ext2 = c.ext === 0 ? 0 : Math.min(12, +c.ext || 12);
      if (minTerm && ext2) {
        for (var r = 0; r < 400; r++) {
          var te2 = addDays(addMonths(start, minTerm + r * ext2), -1);
          if (te2 < receipt) continue;
          var d3 = backward(te2, notice);
          if (receipt <= d3) return { end: te2, deadline: d3, refs: refs, warn: warn, rule: 'consumer_old' };
        }
      }
      after = notice;
    }
    if (minTerm && start) {
      var minEnd = addDays(addMonths(start, minTerm), -1);
      var dl2 = backward(minEnd, notice);
      if (receipt <= dl2) return { end: minEnd, deadline: dl2, refs: refs, warn: warn, rule: rule, minEnd: minEnd };
      return { end: forward(receipt, after), deadline: null, refs: refs, warn: warn, rule: rule, minEnd: minEnd, missed: minEnd >= receipt };
    }
    if (minTerm && !start) warn.push('need_start');
    return { end: forward(receipt, after), deadline: null, refs: refs, warn: warn, rule: rule };
  }

  // ---------- the full result for one cancellation ----------
  /* evaluate(input) -> result
     input: { cat, kind, start, minTerm, notice, ext, grund, fyEnd, fyOnly, send, method,
              priceNotice, priceDate, moveDate, claimDate }
     result: { kind, receipt, end, deadline, sendBy, special, fallback, refs, warn, late } */
  function evaluate(inp) {
    var cat = CATS[inp.cat] ? inp.cat : 'sonstiges';
    var kinds = CATS[cat].kinds;
    var kind = kinds.indexOf(inp.kind) >= 0 ? inp.kind : 'ordentlich';
    var method = METHODS[inp.method] !== undefined ? inp.method : 'einschreiben';
    var send = isISO(inp.send) ? inp.send : todayISO();
    var receipt = receiptDate(send, method);
    var c = Object.assign({}, inp, { cat: cat });
    var ord = ordinary(c, receipt);
    var res = { cat: cat, kind: kind, method: method, send: send, receipt: receipt, refs: ord.refs.slice(), warn: ord.warn.slice(), ordinary: ord };
    var rule = CATS[cat].rule;

    function special(end, deadline, ref, extra) {
      res.special = true;
      res.end = end; res.deadline = deadline || null; res.refs.unshift(ref);
      if (extra) Object.assign(res, extra);
      if (deadline && receipt > deadline) { res.late = true; res.end = ord.end; res.deadline = ord.deadline; res.special = false; }
    }

    if (kind === 'ordentlich') {
      res.end = ord.end; res.deadline = ord.deadline;
    } else if (kind === 'wichtig') {
      res.special = true; res.end = receipt; res.deadline = null;
      res.refs.unshift(rule === 'verein' ? 'bgb39_314' : 'bgb314');
    } else if (kind === 'speed') {
      res.special = true; res.end = receipt; res.deadline = null; res.refs.unshift('tkg57_4');
    } else if (kind === 'umzug') {
      var move = isISO(inp.moveDate) ? inp.moveDate : null;
      if (cat === 'internet') special(maxDate(move || receipt, forward(receipt, ONE_MONTH)), null, 'tkg60');
      else if (cat === 'energie') special(maxDate(move || receipt, forward(receipt, { n: 6, u: 'w' })), null, 'enwg41b5');
      else { res.end = ord.end; res.deadline = ord.deadline; res.refs.unshift('bgh_umzug'); res.goodwill = true; }
    } else if (kind === 'preis') {
      var pd = isISO(inp.priceDate) ? inp.priceDate : null;     // the increase takes effect
      var pn = isISO(inp.priceNotice) ? inp.priceNotice : null; // you received the notice
      if (rule === 'tkg') {
        if (!pn) res.warn.push('need_price_notice');
        special(maxDate(receipt, pd || receipt), pn ? addMonths(pn, 3) : null, 'tkg57_1');
      } else if (rule === 'vvg') {
        if (!pn) res.warn.push('need_price_notice');
        special(maxDate(receipt, pd || receipt), pn ? addMonths(pn, 1) : null, 'vvg40');
      } else if (cat === 'energie') {
        if (!pd) res.warn.push('need_price_date');
        special(pd ? maxDate(receipt, pd) : receipt, pd ? addDays(pd, -1) : null, 'enwg41_5');
      } else {
        // no statutory special right: object to the increase and cancel ordinarily
        res.end = ord.end; res.deadline = ord.deadline; res.objection = true; res.refs.unshift('preis_agb');
      }
    } else if (kind === 'schaden') {
      var cd = isISO(inp.claimDate) ? inp.claimDate : null;
      if (!cd) res.warn.push('need_claim_date');
      special(receipt, cd ? addMonths(cd, 1) : null, 'vvg92');
    }
    res.unknownEnd = ord.warn.indexOf('need_start') >= 0; // ordinary end date is a guess without a start date
    if (res.unknownEnd && !res.special) { res.deadline = null; }
    res.sendBy = res.deadline ? latestSend(res.deadline, method) : null;
    res.fallback = res.special ? ord.end : null;
    return res;
  }

  // ---------- the letter (always German, the provider's language) ----------
  var NOUN = {
    fitness: 'meine Mitgliedschaft', mobil: 'meinen Mobilfunkvertrag', internet: 'meinen Internetvertrag',
    versicherung: 'meinen Versicherungsvertrag', streaming: 'mein Abonnement', zeitung: 'mein Abonnement',
    energie: 'meinen Energieliefervertrag', verein: 'meine Mitgliedschaft', sonstiges: 'meinen Vertrag',
  };
  var SUBJ = {
    fitness: 'Kündigung meiner Mitgliedschaft', mobil: 'Kündigung meines Mobilfunkvertrags', internet: 'Kündigung meines Internetvertrags',
    versicherung: 'Kündigung meines Versicherungsvertrags', streaming: 'Kündigung meines Abonnements', zeitung: 'Kündigung meines Abonnements',
    energie: 'Kündigung meines Energieliefervertrags', verein: 'Austritt aus dem Verein', sonstiges: 'Kündigung meines Vertrags',
  };
  var NR_LABEL = {
    fitness: 'Mitgliedsnummer', mobil: 'Kundennummer', internet: 'Kundennummer', versicherung: 'Versicherungsscheinnummer',
    streaming: 'Kundennummer', zeitung: 'Abonummer', energie: 'Kundennummer', verein: 'Mitgliedsnummer', sonstiges: 'Kunden- bzw. Vertragsnummer',
  };
  var MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  function deDate(iso) { var p = iso.split('-'); return (+p[2]) + '. ' + MONTHS_DE[+p[1] - 1] + ' ' + p[0]; }
  function deShort(iso) { var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
  function lines(s) { return String(s || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean); }

  /* letter(input, result) -> { subject, sender[], recipient[], place, date, paragraphs[], closing, name, attachments[] } */
  function letter(inp, r) {
    var cat = r.cat;
    var nr = (inp.nr || '').trim();
    var what = NOUN[cat] + (inp.product ? ' „' + inp.product.trim() + '“' : '');
    var idPart = nr ? ' (' + NR_LABEL[cat] + ': ' + nr + ')' : '';
    if (cat === 'mobil' && inp.phone) idPart = idPart ? idPart.slice(0, -1) + ', Rufnummer: ' + inp.phone.trim() + ')' : ' (Rufnummer: ' + inp.phone.trim() + ')';
    if (cat === 'energie' && inp.meter) idPart = idPart ? idPart.slice(0, -1) + ', Zählernummer: ' + inp.meter.trim() + ')' : ' (Zählernummer: ' + inp.meter.trim() + ')';
    var P = [];
    var endDe = deDate(r.end), ordDe = deDate(r.ordinary.end);
    var verein = cat === 'verein';
    var hilfs = 'Hilfsweise ' + (verein ? 'erkläre ich meinen Austritt' : 'kündige ich ordentlich') + ' zum nächstmöglichen Zeitpunkt, nach meiner Berechnung zum ' + ordDe + '.';

    if (r.kind === 'ordentlich' || r.late) {
      // r.late: the special deadline has passed, so the letter is an ordinary cancellation
      P.push('hiermit ' + (verein ? 'erkläre ich meinen Austritt aus dem Verein' + idPart : 'kündige ich ' + what + idPart + ' fristgerecht') +
        ' zum nächstmöglichen Zeitpunkt. Nach meiner Berechnung ist das der ' + endDe + '.');
    } else if (r.kind === 'wichtig') {
      var g = (inp.reason || '').trim();
      P.push('hiermit ' + (verein ? 'erkläre ich meinen Austritt aus dem Verein' : 'kündige ich ' + what) + idPart + ' außerordentlich und fristlos aus wichtigem Grund (§ 314 BGB).');
      P.push(g ? 'Der Grund: ' + g + (/[.!?]$/.test(g) ? '' : '.') : 'Den wichtigen Grund erläutere ich wie folgt: [bitte ergänzen].');
      if (inp.proof) P.push('Einen Nachweis füge ich bei.');
      P.push(hilfs);
    } else if (r.kind === 'speed') {
      P.push('hiermit kündige ich ' + what + idPart + ' fristlos gemäß § 57 Abs. 4 TKG. Die tatsächliche Geschwindigkeit weicht erheblich, kontinuierlich oder regelmäßig wiederkehrend von der vertraglich vereinbarten Leistung ab.');
      P.push('Das belegt das beigefügte Messprotokoll der Breitbandmessung der Bundesnetzagentur' + (inp.reason ? ' (' + inp.reason.trim() + ')' : '') + '.');
      P.push(hilfs);
    } else if (r.kind === 'umzug') {
      var mv = isISO(inp.moveDate) ? deDate(inp.moveDate) : '[Datum]';
      var na = lines(inp.newAddress).join(', ') || '[neue Anschrift]';
      if (cat === 'internet') {
        P.push('hiermit kündige ich ' + what + idPart + ' gemäß § 60 Abs. 2 TKG mit einer Frist von einem Monat zum ' + endDe + '.');
        P.push('Ich ziehe am ' + mv + ' um. Meine neue Anschrift lautet: ' + na + '. Dort bieten Sie die vertraglich geschuldete Leistung nicht an. Sollte das nicht zutreffen, bitte ich um ein Angebot für die neue Anschrift zu den bisherigen Bedingungen; die Kündigung gilt dann hilfsweise als ordentliche Kündigung zum nächstmöglichen Zeitpunkt.');
      } else if (cat === 'energie') {
        P.push('hiermit kündige ich ' + what + idPart + ' wegen meines Wohnsitzwechsels gemäß § 41b Abs. 5 EnWG mit einer Frist von sechs Wochen zum ' + endDe + '.');
        P.push('Ich ziehe am ' + mv + ' aus. Meine künftige Anschrift lautet: ' + na + '.' + (inp.newMeter ? ' Die Identifikationsnummer der neuen Entnahmestelle lautet: ' + inp.newMeter.trim() + '.' : ''));
        P.push('Den Zählerstand am Auszugstag teile ich Ihnen gesondert mit.');
      } else {
        P.push('hiermit kündige ich ' + what + idPart + ' zum nächstmöglichen Zeitpunkt, nach meiner Berechnung zum ' + ordDe + '.');
        P.push('Ich ziehe am ' + mv + ' nach ' + na + ' und kann Ihr Angebot dort nicht mehr nutzen. Ich bitte Sie deshalb, mich aus Kulanz bereits zum Umzugstermin aus dem Vertrag zu entlassen.');
      }
    } else if (r.kind === 'preis') {
      var pnD = isISO(inp.priceNotice) ? ' vom ' + deDate(inp.priceNotice) : '';
      var pdD = isISO(inp.priceDate) ? deDate(inp.priceDate) : '[Datum]';
      if (r.objection) {
        P.push('der mit Ihrer Mitteilung' + pnD + ' angekündigten Preiserhöhung zum ' + pdD + ' stimme ich nicht zu und widerspreche ihr hiermit.');
        P.push('Zugleich ' + (verein ? 'erkläre ich meinen Austritt' : 'kündige ich ' + what) + idPart + ' zum nächstmöglichen Zeitpunkt, nach meiner Berechnung zum ' + endDe + '. Sollte mir wegen der Preiserhöhung ein Sonderkündigungsrecht zustehen, kündige ich zum Zeitpunkt ihres Wirksamwerdens.');
      } else {
        var law = { tkg57_1: '§ 57 Abs. 1 TKG', vvg40: '§ 40 Abs. 1 VVG', enwg41_5: '§ 41 Abs. 5 EnWG' }[r.refs[0]];
        P.push('hiermit kündige ich ' + what + idPart + ' wegen der mit Ihrer Mitteilung' + pnD + ' angekündigten Preiserhöhung' + (isISO(inp.priceDate) ? ' zum ' + pdD : '') + ' gemäß ' + law + ' außerordentlich zum ' + endDe + '.');
        P.push(hilfs);
      }
    } else if (r.kind === 'schaden') {
      var cdD = isISO(inp.claimDate) ? ' am ' + deDate(inp.claimDate) : '';
      P.push('hiermit kündige ich ' + what + idPart + ' nach dem Versicherungsfall' + (inp.reason ? ' (' + inp.reason.trim() + ')' : '') + ', dessen Regulierung' + cdD + ' abgeschlossen wurde, gemäß § 92 bzw. § 111 VVG mit sofortiger Wirkung.');
    }

    if (inp.port && cat === 'mobil') P.push('Ich möchte meine Rufnummer' + (inp.phone ? ' ' + inp.phone.trim() : '') + ' zu einem anderen Anbieter mitnehmen (§ 59 TKG). Bitte senden Sie mir die dafür nötigen Angaben.');
    if (inp.sepa) P.push('Die erteilte Einzugsermächtigung (SEPA-Lastschriftmandat) widerrufe ich mit Wirkung zum Vertragsende.');
    if (inp.noAds) P.push('Der Nutzung meiner Daten für Werbezwecke widerspreche ich (Art. 21 Abs. 2 DSGVO). Bitte rufen Sie mich nicht an, um mich zur Rücknahme der Kündigung zu bewegen.');
    var confirm = 'Bitte bestätigen Sie mir den Erhalt dieser Kündigung und das genaue Vertragsende innerhalb von 14 Tagen schriftlich oder per E-Mail.';
    if (cat === 'energie' && !inp.grund) confirm = 'Bitte bestätigen Sie mir die Kündigung unter Angabe des Vertragsendes innerhalb einer Woche nach Zugang in Textform (§ 41b Abs. 1 EnWG).';
    if (verein) confirm = 'Bitte bestätigen Sie mir den Austritt und das Datum, zu dem er wirksam wird, schriftlich oder per E-Mail.';
    P.push(confirm);

    if (r.unknownEnd) {
      P = P.map(function (p) { return p.replace(/ Nach meiner Berechnung ist das der \d+\. \S+ \d{4}\./, '').replace(/, nach meiner Berechnung zum \d+\. \S+ \d{4}/, ''); });
    }
    var att = [];
    if ((r.kind === 'wichtig' && inp.proof) || r.kind === 'speed') att.push(r.kind === 'speed' ? 'Messprotokoll' : 'Nachweis');
    var sender = [inp.name].concat(lines(inp.address)).concat(inp.email ? [inp.email.trim()] : []).filter(Boolean);
    return {
      subject: SUBJ[cat] + (nr ? ', ' + NR_LABEL[cat] + ' ' + nr : ''),
      sender: sender,
      recipient: lines(inp.provider),
      place: (inp.place || '').trim(),
      date: deDate(r.send),
      greeting: 'Sehr geehrte Damen und Herren,',
      paragraphs: P,
      closing: 'Mit freundlichen Grüßen',
      name: (inp.name || '').trim(),
      attachments: att,
    };
  }

  function letterText(L, forEmail) {
    var out = [];
    if (!forEmail) {
      out.push(L.sender.join('\n'), '', L.recipient.join('\n'), '', (L.place ? L.place + ', ' : '') + L.date, '', L.subject, '');
    }
    out.push(L.greeting, '');
    L.paragraphs.forEach(function (p) { out.push(p, ''); });
    out.push(L.closing, '');
    if (!forEmail) out.push('', '');
    out.push(L.name || '');
    if (forEmail) out = out.concat(L.sender.slice(1));
    if (L.attachments.length) out.push('', 'Anlage: ' + L.attachments.join(', '));
    return out.join('\n').replace(/\n{3,}$/, '\n').trim() + '\n';
  }

  // ---------- calendar reminder (.ics, RFC 5545) ----------
  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function utf8Len(ch) { var c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
  function fold(line) {
    var out = [], cur = '', bytes = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i], code = line.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < line.length) ch += line[++i];
      var b = utf8Len(ch);
      if (bytes + b > 75) { out.push(cur); cur = ' ' + ch; bytes = 1 + b; } else { cur += ch; bytes += b; }
    }
    out.push(cur);
    return out.join('\r\n');
  }
  function stamp(now) {
    now = now || new Date();
    return now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
  }
  function randomId() {
    var c = root.crypto;
    if (c && c.randomUUID) return c.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }
  function buildICS(o) {
    var L = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hmsk.life//Kuendigung//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:' + (o.uid || randomId() + '@hmsk.life'), 'DTSTAMP:' + stamp(o.now),
      'DTSTART;VALUE=DATE:' + o.date.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + addDays(o.date, 1).replace(/-/g, ''),
      'SUMMARY:' + icsEscape(o.summary), 'DESCRIPTION:' + icsEscape(o.description), 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(o.summary), 'TRIGGER;RELATED=START:PT9H', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    return L.map(fold).join('\r\n') + '\r\n';
  }

  // Sources shown on the page and printed with the letter. [key, label, url]
  var SOURCES = {
    bgb309_9: ['§ 309 Nr. 9 BGB', 'https://www.gesetze-im-internet.de/bgb/__309.html'],
    bgb309_9_old: ['§ 309 Nr. 9 BGB a.F. (Verträge vor dem 1. März 2022), Art. 229 § 60 EGBGB', 'https://www.gesetze-im-internet.de/bgbeg/art_229__60.html'],
    bgb309_13: ['§ 309 Nr. 13 BGB (Textform genügt)', 'https://www.gesetze-im-internet.de/bgb/__309.html'],
    bgb312k: ['§ 312k BGB (Kündigungsbutton)', 'https://www.gesetze-im-internet.de/bgb/__312k.html'],
    bgb314: ['§ 314 BGB (Kündigung aus wichtigem Grund)', 'https://www.gesetze-im-internet.de/bgb/__314.html'],
    bgb39: ['§ 39 BGB (Austritt aus dem Verein)', 'https://www.gesetze-im-internet.de/bgb/__39.html'],
    bgb39_314: ['§ 39 BGB, § 314 BGB (Austritt aus wichtigem Grund)', 'https://www.gesetze-im-internet.de/bgb/__39.html'],
    bgb130: ['§ 130 BGB (Zugang)', 'https://www.gesetze-im-internet.de/bgb/__130.html'],
    bgb188: ['§§ 187, 188 BGB (Fristberechnung)', 'https://www.gesetze-im-internet.de/bgb/__188.html'],
    tkg56: ['§ 56 TKG (Laufzeit, monatliche Kündigung)', 'https://www.gesetze-im-internet.de/tkg_2021/__56.html'],
    tkg57_1: ['§ 57 Abs. 1 TKG (Vertragsänderung, Preiserhöhung)', 'https://www.gesetze-im-internet.de/tkg_2021/__57.html'],
    tkg57_4: ['§ 57 Abs. 4 TKG (zu langsames Internet)', 'https://www.gesetze-im-internet.de/tkg_2021/__57.html'],
    tkg60: ['§ 60 TKG (Umzug)', 'https://www.gesetze-im-internet.de/tkg_2021/__60.html'],
    vvg11: ['§ 11 VVG (Laufzeit, Kündigungsfrist)', 'https://www.gesetze-im-internet.de/vvg_2008/__11.html'],
    vvg11_4: ['§ 11 Abs. 4 VVG (Verträge über drei Jahre)', 'https://www.gesetze-im-internet.de/vvg_2008/__11.html'],
    vvg40: ['§ 40 VVG (Beitragserhöhung)', 'https://www.gesetze-im-internet.de/vvg_2008/__40.html'],
    vvg92: ['§ 92 und § 111 VVG (Kündigung nach Versicherungsfall)', 'https://www.gesetze-im-internet.de/vvg_2008/__92.html'],
    enwg41_5: ['§ 41 Abs. 5 EnWG (Preisänderung)', 'https://www.gesetze-im-internet.de/enwg_2005/__41.html'],
    enwg41b5: ['§ 41b Abs. 5 EnWG (Umzug)', 'https://www.gesetze-im-internet.de/enwg_2005/__41b.html'],
    stromgvv20: ['§ 20 StromGVV / § 20 GasGVV (Grundversorgung, zwei Wochen)', 'https://www.gesetze-im-internet.de/stromgvv/__20.html'],
    bgh_umzug: ['BGH, Urteil vom 4. Mai 2016, XII ZR 62/15 (Umzug kein wichtiger Grund beim Fitnessstudio)', 'https://www.lto.de/recht/nachrichten/n/bgh-urteil-xii-zr-62-15-fitnessstudio-kuendigung-umzug-kein-wichtiger-grund'],
    preis_agb: ['§ 307 BGB (einseitige Preisanpassung nur mit wirksamer Klausel)', 'https://www.gesetze-im-internet.de/bgb/__307.html'],
  };

  var api = {
    AS_OF: AS_OF, NEW_LAW: NEW_LAW, CATS: CATS, CAT_ORDER: CAT_ORDER, METHODS: METHODS, SOURCES: SOURCES,
    addDays: addDays, addMonths: addMonths, addWorkdays: addWorkdays, isISO: isISO, todayISO: todayISO,
    forward: forward, backward: backward, receiptDate: receiptDate, latestSend: latestSend,
    ordinary: ordinary, evaluate: evaluate, letter: letter, letterText: letterText, deDate: deDate, deShort: deShort,
    icsEscape: icsEscape, fold: fold, buildICS: buildICS,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Kuendigung = api;
})(typeof window !== 'undefined' ? window : globalThis);
