# Card-network exchange rates

CARDI displays JPY, USD, VND, THB and EUR spending converted to TWD, comparing Visa, Mastercard and JCB. Amounts and fees stay in the browser and are not saved to the shared ledger or sent to the rate provider.

## Source selection

The initial adapter reads the public comparison table at `https://www.twrates.com/card/visa/{currency}.html`. Each page includes all three networks and independent quote dates. This is a third-party reference, not an official API or a guaranteed service. Credit and direct source links are displayed in the UI. HTML and scripts from the provider are never rendered or executed.

Official sources were investigated on 2026-10-26:

- [Visa developer FX API](https://developer.visa.com/docs/foreign_exchange) requires production onboarding. Normal server access to its Taiwan consumer calculator returned 403 during research.
- [Mastercard Currency Conversion Calculator API](https://developer.mastercard.com/currency-conversion-calculator/documentation/) requires production eligibility and authenticated requests; the public consumer endpoint returned 403. No protection was bypassed.
- [JCB Taiwan reference](https://www.specialoffers.jcb/zh-tw/services/other/rate/) publishes monthly PDFs. Its [website terms](https://www.specialoffers.jcb/zh-tw/available.html) restrict public republication of site materials; CARDI does not retrieve or republish those PDFs.

The adapter can later be replaced with an authorized official feed or a provider agreement. Do not silently substitute bank cash/spot rates for a network rate.

## Operational behavior

- `/api/exchange-rates?currency=JPY` accepts only five fixed currency codes. No remote URL, amount, fee, date or secret is accepted from callers.
- Parsed successful responses use the Next persistent data cache with a six-hour revalidation interval. CDN responses can be cached for 15 minutes; no Neon schema, database writes, paid API or cron is needed.
- Each network retains its own quote date. Different dates are explicitly highlighted; the UI does not claim a same-day winning network.
- Missing or invalid rows remain unavailable. Wrong currency/direction, duplicate networks, altered tables, future dates, implausible rates, excessive response size or failed HTTP responses fail safely.
- Fetches time out after eight seconds, with a 512 KiB body limit and redirects disabled. Only the fixed HTTPS source is contacted.
- Cached snapshots expire after 48 hours, even if background cache revalidation repeatedly fails. Client estimates also stop for quotes over seven days old. A visible warning starts after 24 hours since fetch or three days since quote. Focus/visibility and a one-minute clock update these guards on idle tabs.
- Estimates round the converted amount and fee to cents and sum those displayed values. Actual issuer rounding, processing date, fees, rewards and merchant DCC may produce a different bill.

## Verification

Run `node --test tests/fx.test.cjs tests/group-campaigns.test.cjs` and `npm run build -- --webpack`. The FX tests use synthetic HTML and cover currency direction, independent dates, source precision, missing/malformed data, expiry, input validation and monetary rounding. `work/` is excluded from the repository and contains only local research and isolation tools.
