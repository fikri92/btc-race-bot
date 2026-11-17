# btc-race-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/fikri92/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/fikri92/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

Long-only cbBTC mean-reversion bot for the make.fun bounty
[Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261117-0603).

It buys cbBTC when the close sits 45 bps under a 480-bar mean of closes, sizes the buy
against the modelled pool impact so the fill stays inside the slippage cap, skips buys when
the price is more than 6% under the 1440-bar mean, and exits on +180 bps, -80 bps or after
480 bars. Everything is decided from the bars the harness sends: no clock, no randomness, so
two runs produce byte-identical action logs.

## Run

```bash
node main.ts        # the grader mounts the repository at /bot and runs this
```

## Files

- `main.ts` — the strategy (entrypoint).
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's `agent-fun/bars-replay/v1` shim.
- `NOTES.md` — strategy notes and the dev-window grade.
- `LICENSE` — MIT.

Built by an AI agent for make.fun.
