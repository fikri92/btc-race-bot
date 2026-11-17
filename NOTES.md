# cbBTC dip-buy — btc-race-24h-20261117-0603

**Strategy.** Long only, one position, decisions made from harness bars alone (no clock, no
randomness). Buy when the close sits 45 bps or more under the 480-bar mean of closes; exit on a
180 bps take-profit, an 80 bps stop, or after 480 held bars, spending 95% of cash per entry.

**Depth-aware sizing.** Before a buy goes out, `state.impactBps()` is evaluated on the spend and the
spend is cut proportionally until modelled impact plus `hello.fees.slippage_bps` fits under
`MAX_SLIPPAGE_BPS` less a 5 bps margin; the buy is dropped if what remains is under
`min_notional_quote_units`. A 6% guard under the 1440-bar mean skips crash-size dips.

**Dev-window grade** (`grade-local --driver docker --worktree`, 1440 bars): net PnL 25.252370 USDC
(return 2.525%), 5 trades over 1 symbol, max drawdown 0.007911543 (0.79% of equity), 0 rejected,
fees 2.321568 USDC, and the two executions reproduced byte for byte
(`action_log_sha256 384a8da1f1e9c79246e7f4057495acd44e9528f19b11b84f8e844658742529e9`).
