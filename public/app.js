/* UI for the Kündigung generator. Rules and the letter live in logic.js, texts in i18n.js. */
(function () {
  'use strict';
  var K = window.Kuendigung;
  var I = window.KUE_I18N;
  var CFG = window.KUE_CONFIG || {};
  var SITE = CFG.siteBase || '';
  var STORE = 'kuendigung-v1';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var form = $('#f');
  var today = K.todayISO();
  var lang = pickLang();
  var last = null; // { inp, r, L }

  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'de' || q === 'en') return q;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'de';
    return /^en\b/i.test(nav) ? 'en' : 'de';
  }
  function t(key, vars) {
    var s = I[lang][key];
    if (s === undefined) s = I.de[key];
    if (s === undefined) return key;
    if (vars) Object.keys(vars).forEach(function (k) { s = String(s).split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function tc(key, cat) { var k = key.replace('_', '_' + cat + '_'); return I[lang][k] !== undefined ? t(k) : t(key); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function fmtDate(iso) {
    var p = iso.split('-');
    return lang === 'de' ? K.deDate(iso) : (+p[2]) + ' ' + t('months')[+p[1] - 1] + ' ' + p[0];
  }
  function daysUntil(iso) {
    var a = today.split('-'), b = iso.split('-');
    return Math.round((Date.UTC(+b[0], +b[1] - 1, +b[2]) - Date.UTC(+a[0], +a[1] - 1, +a[2])) / 86400000);
  }
  function chip(iso) {
    var n = daysUntil(iso);
    if (n < 0) return ' <span class="chip">' + esc(t('chip_past')) + '</span>';
    if (n === 0) return ' <span class="chip chip--on">' + esc(t('chip_today')) + '</span>';
    return ' <span class="chip' + (n <= 14 ? ' chip--on' : '') + '">' + esc(t('chip_days', { n: n })) + '</span>';
  }
  function val(name) { var el = form.elements[name]; return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; }
  function setVal(name, v) {
    var el = form.elements[name];
    if (!el) return;
    if (el instanceof RadioNodeList || (el.length && !el.tagName)) { $$('input[name="' + name + '"]', form).forEach(function (r) { r.checked = r.value === v; }); return; }
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v;
  }

  // ---------- options ----------
  function radios(box, name, keys, labelFn) {
    box.innerHTML = keys.map(function (k) {
      return '<label><input type="radio" name="' + name + '" value="' + k + '"><span>' + esc(labelFn(k)) + '</span></label>';
    }).join('');
  }
  function buildOptions() {
    var cat = val('cat') || 'fitness', kind = val('kind'), method = val('method') || 'einschreiben';
    radios($('#cats'), 'cat', K.CAT_ORDER, function (k) { return t('cat_' + k); });
    radios($('#methods'), 'method', Object.keys(K.METHODS), function (k) { return t('m_' + k); });
    setVal('cat', cat); setVal('method', method);
    buildKinds(kind);
    $('#fyEnd').innerHTML = t('months').map(function (m, i) { return '<option value="' + (i + 1) + '">' + esc(m) + '</option>'; }).join('');
  }
  function buildKinds(keep) {
    var cat = val('cat');
    var kinds = K.CATS[cat].kinds;
    radios($('#kinds'), 'kind', kinds, function (k) { return tc('kind_' + k, cat); });
    setVal('kind', kinds.indexOf(keep) >= 0 ? keep : 'ordentlich');
  }
  function applyDefaults(cat) {
    var c = K.CATS[cat];
    setVal('minTerm', c.minTerm);
    setVal('noticeN', c.notice.n);
    setVal('noticeU', c.notice.u);
    setVal('ext', 12);
    if (cat === 'verein') { setVal('fyOnly', true); setVal('fyEnd', 12); }
  }

  // ---------- static texts ----------
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('title');
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    $('#lnkHome').href = SITE + t('home_href');
    $('#lnkImprint').href = SITE + t('imprint_href'); $('#lnkImprint').textContent = t('imprint');
    $('#lnkPrivacy').href = SITE + t('privacy_href'); $('#lnkPrivacy').textContent = t('privacy');
    $('#updLink').href = SITE + t('upd_href');
    $('#letter').setAttribute('aria-label', t('letter_label'));
    $('#note').textContent = t('note', { d: fmtDate(K.AS_OF) });
    $('#langNote').hidden = !t('lang_note');
    $('#langNote').textContent = t('lang_note');
    buildOptions();
  }

  // ---------- read the form ----------
  function readInput() {
    return {
      cat: val('cat'), kind: val('kind'), method: val('method'), send: val('send') || today,
      start: val('start'), minTerm: +val('minTerm') || 0,
      notice: { n: Math.max(0, +val('noticeN') || 0), u: val('noticeU') || 'm' },
      ext: val('ext') === '' ? 12 : +val('ext'),
      grund: val('grund'), fyOnly: val('fyOnly'), fyEnd: +val('fyEnd') || 12,
      priceNotice: val('priceNotice'), priceDate: val('priceDate'), moveDate: val('moveDate'), claimDate: val('claimDate'),
      provider: val('provider'), nr: val('nr'), product: val('product'), phone: val('phone'), meter: val('meter'),
      newAddress: val('newAddress'), newMeter: val('newMeter'), reason: val('reason'), proof: val('proof'),
      name: val('name'), address: val('address'), email: val('email'), place: val('place'),
      sepa: val('sepa'), noAds: val('noAds'), port: val('port'),
    };
  }
  function ruleOf(inp) { var r = K.CATS[inp.cat].rule; return r === 'energy' ? (inp.grund ? 'grund' : 'consumer') : r; }

  function syncVisibility(inp) {
    var rule = ruleOf(inp);
    $$('[data-show]', form).forEach(function (el) { el.hidden = el.getAttribute('data-show').split(' ').indexOf(inp.cat) < 0; });
    $$('[data-kind]', form).forEach(function (el) { el.hidden = el.getAttribute('data-kind').split(' ').indexOf(inp.kind) < 0; });
    $$('[data-show-rule]', form).forEach(function (el) { el.hidden = el.getAttribute('data-show-rule').split(' ').indexOf(rule) < 0; });
    $$('[data-hide-rule]', form).forEach(function (el) { el.hidden = el.getAttribute('data-hide-rule').split(' ').indexOf(rule) >= 0; });
    $('#extraBox').hidden = inp.kind === 'ordentlich';
    $('#extField').hidden = !(rule === 'consumer' && K.isISO(inp.start) && inp.start < K.NEW_LAW && inp.minTerm > 0);
    $('#fyField').hidden = !inp.fyOnly;
    $('#lblNr').textContent = t('nr_' + inp.cat);
    $('#lblStart').textContent = tc('l_start', inp.cat);
    $('#lblMin').textContent = tc('l_min', inp.cat);
    $('#lblReason').textContent = t(inp.kind === 'speed' ? 'l_reason_speed' : inp.kind === 'schaden' ? 'l_reason_schaden' : 'l_reason');
    $('#kindHint').textContent = tc('kh_' + inp.kind, inp.cat);
    var hint = { consumer: K.isISO(inp.start) && inp.start < K.NEW_LAW ? 'info_consumer_old' : 'info_consumer', tkg: 'info_tkg', vvg: 'info_vvg', verein: 'info_verein', grund: 'info_grund' }[rule];
    $('#termHint').textContent = t(hint);
  }

  // ---------- render ----------
  function render() {
    var inp = readInput();
    syncVisibility(inp);
    var r = K.evaluate(inp);
    var L = K.letter(inp, r);
    last = { inp: inp, r: r, L: L };

    var h = [];
    var rows = [];
    var verein = inp.cat === 'verein';
    if (r.deadline) {
      if (r.sendBy !== r.deadline) rows.push(fact(t('f_send'), fmtDate(r.sendBy) + chip(r.sendBy), false));
      rows.push(fact(t('f_arrive'), fmtDate(r.deadline) + chip(r.deadline), true));
    } else if (r.send !== r.receipt) {
      rows.push(fact(t('f_receipt', { d: fmtDate(r.send) }), fmtDate(r.receipt), false));
    }
    var endTxt = fmtDate(r.end) + (r.end === r.receipt && r.special ? ' (' + t('f_now') + ')' : '');
    if (!(r.unknownEnd && !r.special)) rows.push(fact(t(verein ? 'f_end_verein' : 'f_end'), endTxt, !r.deadline));
    if (r.special && r.fallback && r.fallback !== r.end && !r.unknownEnd) rows.push(fact(t('f_fallback'), fmtDate(r.fallback), false));
    h.push('<ul class="facts">' + rows.join('') + '</ul>');

    var infos = [];
    if (r.late) infos.push(t('info_late'));
    if (r.goodwill) infos.push(t('info_goodwill'));
    if (r.objection) infos.push(t('info_objection'));
    if (r.kind === 'ordentlich' && r.ordinary.missed) infos.push(t('info_missed', { d: fmtDate(r.ordinary.minEnd) }));
    if (inp.cat === 'streaming') infos.push(t('info_streaming'));
    infos.forEach(function (s) { h.push('<p class="info">' + esc(s) + '</p>'); });
    r.warn.forEach(function (w) { h.push('<p class="warn">' + esc(t('w_' + w)) + '</p>'); });
    var miss = [];
    if (!inp.provider.trim()) miss.push(t('miss_provider'));
    if (!inp.name.trim()) miss.push(t('miss_name'));
    if (!inp.address.trim()) miss.push(t('miss_address'));
    if (miss.length) h.push('<p class="info">' + esc(t('miss', { f: miss.join(', ') })) + '</p>');
    if (r.sendBy && r.sendBy >= today) h.push('<p class="small"><button type="button" class="linkish" id="icsBtn">' + esc(t('ics')) + '</button></p>');
    $('#summary').innerHTML = h.join('');
    if ($('#icsBtn')) $('#icsBtn').addEventListener('click', downloadICS);

    renderLetter(L);
    renderHowto(inp, r);
    renderSources(r);
    $('#mailBtn').href = 'mailto:?subject=' + encodeURIComponent(L.subject) + '&body=' + encodeURIComponent(K.letterText(L, true));
    save();
  }
  function fact(label, value, key) {
    return '<li' + (key ? ' class="key"' : '') + '><b>' + esc(label) + '</b><span class="big">' + value + '</span></li>';
  }
  function block(linesArr, placeholder, cls) {
    if (!linesArr.length) return '<p class="' + cls + '"><span class="l-miss">[' + esc(placeholder) + ']</span></p>';
    return '<p class="' + cls + '">' + linesArr.map(esc).join('\n') + '</p>';
  }
  function renderLetter(L) {
    var h = [];
    h.push(block(L.sender, 'Name, Anschrift', 'l-from'));
    h.push(block(L.recipient, 'Anschrift des Anbieters', 'l-to'));
    h.push('<p class="l-date">' + esc((L.place ? L.place + ', ' : '') + L.date) + '</p>');
    h.push('<p class="l-subj">' + esc(L.subject) + '</p>');
    h.push('<p>' + esc(L.greeting) + '</p>');
    L.paragraphs.forEach(function (p) { h.push('<p>' + esc(p).replace(/\[([^\]]+)\]/g, '<span class="l-miss">[$1]</span>') + '</p>'); });
    h.push('<p>' + esc(L.closing) + '</p>');
    h.push('<p class="l-sign">' + (L.name ? esc(L.name) : '<span class="l-miss">[Name]</span>') + '</p>');
    if (L.attachments.length) h.push('<p>Anlage: ' + esc(L.attachments.join(', ')) + '</p>');
    $('#letter').innerHTML = h.join('');
  }
  function renderHowto(inp, r) {
    var items = ['how_' + r.method, 'how_zugang', 'how_confirm'];
    if (r.method === 'einschreiben' || r.method === 'brief' || r.method === 'fax') items.push('how_sign');
    if (r.method !== 'button' && inp.cat !== 'verein' && inp.cat !== 'versicherung') items.push('how_button');
    if (['verein', 'versicherung', 'streaming'].indexOf(inp.cat) >= 0) items.push('how_' + inp.cat);
    $('#howto').innerHTML = '<div class="howto"><h2 class="h2">' + esc(t('how_title')) + '</h2><ul>' +
      items.filter(function (k, i) { return items.indexOf(k) === i; }).map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('') + '</ul></div>';
  }
  function renderSources(r) {
    var keys = r.refs.concat(['bgb309_13', 'bgb312k', 'bgb130', 'bgb188']);
    keys = keys.filter(function (k, i) { return K.SOURCES[k] && keys.indexOf(k) === i; });
    $('#sourcesList').innerHTML = keys.map(function (k) {
      var s = K.SOURCES[k];
      return '<li><a href="' + esc(s[1]) + '" rel="noopener" target="_blank">' + esc(s[0]) + '</a></li>';
    }).join('');
  }

  // ---------- actions ----------
  function flash(msg) { var m = $('#actMsg'); m.textContent = msg; setTimeout(function () { m.textContent = ''; }, 3000); }
  function copyEmail() {
    var txt = 'Betreff: ' + last.L.subject + '\n\n' + K.letterText(last.L, true);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { flash(t('copied')); }, function () { flash(t('copy_fail')); });
    else flash(t('copy_fail'));
  }
  function downloadICS() {
    var r = last.r, what = t('cat_' + r.cat) + (last.inp.product ? ', ' + last.inp.product : '');
    var ics = K.buildICS({
      date: r.sendBy, summary: t('ics_sum', { what: what }),
      description: t('ics_desc', { what: what, d: fmtDate(r.deadline), end: fmtDate(r.end), url: location.origin + location.pathname }),
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'kuendigung-frist-' + r.sendBy + '.ics';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- storage (only when the user ticks "save") ----------
  var FIELDS = ['cat', 'kind', 'method', 'start', 'minTerm', 'noticeN', 'noticeU', 'ext', 'grund', 'fyOnly', 'fyEnd', 'priceNotice', 'priceDate',
    'moveDate', 'claimDate', 'provider', 'nr', 'product', 'phone', 'meter', 'newAddress', 'newMeter', 'reason', 'proof',
    'name', 'address', 'email', 'place', 'sepa', 'noAds', 'port'];
  function storage() { try { return window.localStorage; } catch (e) { return null; } }
  function save() {
    var s = storage(); if (!s) return;
    try {
      if (!$('#remember').checked) { s.removeItem(STORE); return; }
      var o = {}; FIELDS.forEach(function (f) { o[f] = val(f); });
      s.setItem(STORE, JSON.stringify(o));
    } catch (e) { /* storage full or blocked: the tool still works */ }
  }
  function load() {
    var s = storage(); if (!s) return false;
    try {
      var o = JSON.parse(s.getItem(STORE) || 'null');
      if (!o) return false;
      setVal('cat', K.CATS[o.cat] ? o.cat : 'fitness'); buildKinds(o.kind);
      FIELDS.forEach(function (f) { if (f !== 'cat' && o[f] !== undefined) setVal(f, o[f]); });
      $('#remember').checked = true;
      return true;
    } catch (e) { return false; }
  }

  function demo() {
    $('#remember').checked = false;
    var d = { start: '2025-03-15', minTerm: 24, provider: 'Beispiel Fitness GmbH\nKündigungen\nMusterstraße 5\n45127 Essen', nr: '104 233',
      product: 'Flex 24', name: 'Erika Mustermann', address: 'Hauptstraße 1\n10115 Berlin', place: 'Berlin', email: 'erika@example.org' };
    Object.keys(d).forEach(function (k) { setVal(k, d[k]); });
  }

  // ---------- wiring ----------
  applyLang();
  setVal('cat', 'fitness');
  buildKinds('ordentlich');
  if (!load()) { applyDefaults('fitness'); setVal('sepa', true); setVal('noAds', true); }
  setVal('send', today);
  if (/[?&]demo=1\b/.test(location.search)) demo(); // sample data for screenshots; not saved
  render();

  form.addEventListener('change', function (e) {
    if (e.target.name === 'cat') { buildKinds(val('kind')); applyDefaults(val('cat')); }
    render();
  });
  form.addEventListener('input', function (e) { if (e.target.type !== 'radio' && e.target.type !== 'checkbox') render(); });
  $('#remember').addEventListener('change', save);
  $('#resetBtn').addEventListener('click', function () {
    if (!window.confirm(t('reset_q'))) return;
    var s = storage(); if (s) try { s.removeItem(STORE); } catch (e) { /* ignore */ }
    form.reset(); $('#remember').checked = false;
    setVal('cat', 'fitness'); buildKinds('ordentlich'); applyDefaults('fitness'); setVal('sepa', true); setVal('noAds', true); setVal('send', today);
    render();
  });
  $('#printBtn').addEventListener('click', function () { window.print(); });
  $('#copyBtn').addEventListener('click', copyEmail);
  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      var keep = readInput();
      lang = b.getAttribute('data-lang');
      var u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u);
      applyLang();
      setVal('cat', keep.cat); buildKinds(keep.kind); setVal('method', keep.method); setVal('fyEnd', keep.fyEnd);
      render();
    });
  });
})();
