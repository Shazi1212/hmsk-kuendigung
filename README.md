# Kündigung Generator

Cancelling a contract in Germany means getting the letter and the deadline right; this tool writes the German letter and works out when the contract ends and by when the letter must arrive.

**Use it free:** https://hmsk.life/de/tools/kuendigung/ (English: https://hmsk.life/tools/kuendigung/)

## What it does

- Nine contract types: Fitnessstudio, Handy/Mobilfunk, Internet/DSL, Versicherung, Streaming, Zeitung/Abo, Strom/Gas, Verein, sonstiger Vertrag.
- Regular cancellation with the deadline worked out: contracts from 1 March 2022 run month to month after the minimum term and
  may not ask more than one month's notice (§ 309 Nr. 9 BGB); older contracts renew by up to 12 months with up to 3 months'
  notice; telecoms (§ 56 TKG), insurance (§ 11 VVG, incl. the three-year rule), clubs (§ 39 BGB) and Grundversorgung
  (§ 20 StromGVV/GasGVV) have their own rules.
- Special cancellation where the law gives one: moving house (§ 60 TKG, § 41b Abs. 5 EnWG), price increases (§ 57 Abs. 1 TKG,
  § 40 VVG, § 41 Abs. 5 EnWG), after a claim (§ 92, § 111 VVG), slow internet (§ 57 Abs. 4 TKG), good cause (§ 314 BGB).
  Every special letter also cancels regularly as a fallback ("hilfsweise").
- Letter asks for written confirmation; optional: revoke the SEPA mandate, object to marketing and win-back calls, port the number.
- Print or save as PDF (A4), copy as email, open in the mail app, add the sending deadline to the calendar (.ics).
- How to send it: Einwurf-Einschreiben, email (§ 309 Nr. 13 BGB), Kündigungsbutton (§ 312k BGB), with the arrival rule (§ 130 BGB).
- German and English UI; the letter is always German. Nothing is sent to a server. Details are kept in `localStorage` only
  when the user ticks "save on this device".
- No address database on purpose: the user enters the provider's address.

## Quick start

A static page with no build step and no dependencies.

```sh
python3 -m http.server 8080 --directory public   # then open http://localhost:8080
```

Or copy `public/` to any web server. Site links (tool page, imprint, privacy, updates) are relative to `siteBase` in
`public/config.js`; set it to `https://hmsk.life` (or your own site) for a copy hosted elsewhere.

## Tests

The rules, the letter and the .ics live in `public/logic.js` (no DOM). The hand-checked deadline cases live in
`public/selftest.js` and run both in Node and in the browser (`public/selftest.html`):

```sh
node --test tests/
```

## Legal basis

As of 19 October 2026 (`AS_OF` in `public/logic.js`): § 309 Nr. 9 and Nr. 13, § 312k, § 314, § 39, § 130, §§ 187, 188 BGB;
Art. 229 § 60 EGBGB; § 56, § 57, § 59, § 60 TKG; § 11, § 40, § 92, § 111 VVG; § 41 Abs. 5 and § 41b EnWG; § 20 StromGVV and
GasGVV; BGH, 4 May 2016, XII ZR 62/15. Consumer contracts in Germany only; health and life insurance, rent and employment
contracts are out of scope.

Not legal advice.

## License

MIT, see [LICENSE](LICENSE). Fonts: Martian Mono and Geist (SIL Open Font License, see `public/fonts/FONTS-LICENSE.txt`).
