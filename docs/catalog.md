# Card catalog

`lib/catalog-data.json` holds 50 mainstream Taiwan credit cards. It is reference data for the 卡庫 tab, the "better card here" suggestions and the what-if replay. It is committed to the repository, not stored in the shared ledger, so every visitor sees the same version and no card data leaves the browser.

## How it was built (2026-11-05)

1. The public listing at twcreditcard.com supplied each card's rates, caps, periods, fees and welcome offers. It covers 100+ cards; niche affinity cards (professions, regional malls, single retailers with no general use) were left out.
2. Every card was then compared against its bank page. 39 pages were fetched directly and every listed rate appeared verbatim. 12 pages needed a real browser (Cathay, Union Bank, Rakuten, DBS eco, Mega One) and were read by hand.
3. The bank pages corrected the listing in several places, recorded in the data:
   - CUBE's 3.3% requires wealth-management status, so the catalog uses the 3% most holders reach.
   - 聯邦吉鶴卡 mobile-pay bonus is 1.5% with registration (another 1% needs a NT$30,000 prior statement), and its store offers add to the base rate.
   - 蝦皮聯名卡 has a travel and delivery offer of up to 7% that the listing omitted.
   - Mega One has a monthly 1% pick that the listing omitted.
   - 樂天 caps apply to the add-on only, so the base rate survives after the cap.
   - 滙豐 Live+ dining, shopping and entertainment share one NT$888 pool (`pool`).
   - Merchant lists for LINE Bank, 匯鑽 and 魔 BUY come from the bank pages.

`verified` records this per card: `official` means every rate was seen on the bank page, `listing` means it was not. The UI says which. Two miles cards are `listing`, because their earn rates are quoted in miles per NT$ rather than as a percentage.

Literal matching proves a rate is on the page, not that its conditions are complete. Exclusions, registration quotas and tier rules live in `note` where they change the answer, but the app always tells people to check the bank before applying.

## Data model

Each card has `domestic` and `overseas` base rates plus `perks`.

- A perk's `rate` is the total at that merchant unless `addon` is set; add-ons are paid on top of the best rate and each draws down its own cap (or shared `pool`).
- `channels` mixes merchants with the categories in `lib/channels.ts`, so 「蝦皮」reaches a perk described only as 「網購」.
- Keep a channel name specific if the offer is specific. 吉鶴卡's store list avoids the words 「日本」 and 「東京」, otherwise a plain 「日本」 search would claim the store bonus.
- Miles cards set `miles` and are excluded from cash comparisons. Quoting a cash value for miles would need a valuation the catalog does not have.

## Keeping it current

Bank benefits change most at quarter ends. Run:

```bash
npm run catalog:verify
```

It fetches each card's page and flags rates that no longer appear, and pages that need a browser. Update `lib/catalog-data.json` by hand from the bank page, then update `updatedAt`, which the UI displays. `npm test` guards the shape of the file and a set of rates checked against bank pages.

The what-if replay deliberately stops short of a yearly number until there are 60 days of entries and three winning purchases. One overseas trip multiplied by twelve is not a reason to apply for a card.
