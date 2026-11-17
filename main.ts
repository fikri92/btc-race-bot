// cbBTC dip-buy bot — agent-fun/bars-replay/v1
//
// Long only, one position. Buys cbBTC when the close sits a set distance under a slow
// moving average of closes (a dip), skipping dips that sit more than 6% under the day
// mean (a crash in progress), and sizes the buy down to what the modelled pool impact
// can absorb. Exits on a take-profit, a stop, or after a maximum holding time. Every
// decision is made from the bars the harness sends only: no clock, no randomness, so two
// runs produce byte-identical action logs.
//
// Parameters are the ones that graded best on the published dev window (dip 45 bps
// under a 480-bar mean, take 180 bps, stop 80 bps, hold 480 bars, 95% of cash).
import { runBars, type BuyInput, type OrderInput, type SellInput, type BarsState } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const REF_BARS = 480;        // 8 hours of one-minute closes
const MIN_BARS = 240;        // do not trade before half the reference window exists
const DIP_BPS = 45n;         // buy this far under the mean
const TAKE_BPS = 180n;       // take profit
const STOP_BPS = 80n;        // stop out
const HOLD_BARS = 480;       // maximum holding time
const KNIFE_BARS = 1440;     // one day of one-minute closes
const KNIFE_BPS = 600n;      // skip a dip that sits more than 6% under the day mean
const SIZE_NUM = 95n;        // 95% of cash
const SIZE_DEN = 100n;
const HISTORY_BARS = 1920;   // closes kept in memory, four reference windows and more than the guard's day
const MAX_SLIPPAGE_BPS = 100;
const SLIPPAGE_MARGIN_BPS = 5n;  // headroom under MAX_SLIPPAGE_BPS, so truncated impact cannot tip a fill over
const MAX_SHRINK_STEPS = 8;      // proportional spend cuts before the buy is dropped

const BPS = 10_000n;
const closes: bigint[] = [];
let entryPrice: bigint | null = null;
let entryIndex = -1;
let index = -1;

function meanOfLast(n: number): bigint | null {
  if (closes.length < n) return null;
  let sum = 0n;
  for (let i = closes.length - n; i < closes.length; i++) sum += closes[i];
  return sum / BigInt(n);
}

// Modelled impact is proportional to size, so one proportional cut lands on the budget and the loop
// only absorbs the truncation overshoot. Returns 0n when nothing at or under `want` fits.
function spendWithinBudget(state: BarsState, want: bigint, budgetBps: bigint): bigint {
  if (budgetBps <= 0n) return 0n;
  let spend = want;
  for (let step = 0; step < MAX_SHRINK_STEPS && spend > 0n; step++) {
    const impact = state.impactBps(SYMBOL, spend);
    if (impact === null) return 0n;
    if (impact <= budgetBps) return spend;
    spend = (spend * budgetBps) / impact;
  }
  return 0n;
}

await runBars({
  onBatch(state: BarsState) {
    index += 1;
    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);
    if (closes.length > HISTORY_BARS) closes.shift();

    const held = state.positions.get(SYMBOL);
    const qty = held?.qty ?? 0n;
    const orders: OrderInput[] = [];

    if (qty > 0n) {
      if (entryPrice !== null) {
        const change = ((close - entryPrice) * BPS) / entryPrice;
        const heldBars = index - entryIndex;
        if (change >= TAKE_BPS || change <= -STOP_BPS || heldBars >= HOLD_BARS) {
          const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
          orders.push(sell);
          entryPrice = null;
          entryIndex = -1;
        }
      }
    } else if (closes.length >= MIN_BARS) {
      const ref = meanOfLast(REF_BARS) ?? meanOfLast(closes.length);
      const dayMean = meanOfLast(KNIFE_BARS);
      const falling = dayMean !== null && dayMean > 0n && ((dayMean - close) * BPS) / dayMean > KNIFE_BPS;
      if (ref !== null && ref > 0n && !falling) {
        const dip = ((ref - close) * BPS) / ref;
        if (dip >= DIP_BPS) {
          // The harness charges hello.fees.slippage_bps and the modelled impact together against
          // max_slippage_bps, so the impact alone must fit under what the cap leaves over.
          const budget = BigInt(MAX_SLIPPAGE_BPS) - SLIPPAGE_MARGIN_BPS - BigInt(state.hello.fees.slippage_bps);
          const spend = spendWithinBudget(state, (state.cash * SIZE_NUM) / SIZE_DEN, budget);
          const minNotional = BigInt(state.hello.fees.min_notional_quote_units);
          if (spend >= minNotional) {
            const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS };
            orders.push(buy);
            entryPrice = close;
            entryIndex = index;
          }
        }
      }
    }
    return orders;
  },
});
