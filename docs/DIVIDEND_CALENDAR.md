# Dividend calendar — deferred

A product dividend calendar (upcoming ex/pay dates for the catalogue) is **not implemented** until a reliable data source is available.

## Why deferred

- Twelve Data fundamentals / dividend calendars are on paid tiers not guaranteed on the current plan.
- Mansa’s free BSE feed does not expose a dividend calendar endpoint.
- SureInvest policy: **do not seed fabricated dividend dates** to fill the UI.

## Existing support

- User `dividends` table remains for simulated/recorded payments tied to a user.
- Catalogue fields `dividend_frequency` (stable fact) and nullable `dividend_yield` (only when a live provider returns it).

## When to implement

Enable a calendar UI only after a provider returns real ex-date / pay-date series for the curated symbols, then store provider-sourced rows (not static seed dates).
