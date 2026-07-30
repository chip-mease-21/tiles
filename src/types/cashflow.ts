/**
 * The 13-week cash flow model.
 *
 * This is a port of the standalone Integrator Execution Board dashboard. The
 * arithmetic is deliberately identical — same weekly build, same trigger tiers,
 * same draw maths — because the number this produces is the number the board
 * hears, and two tools that disagree by a rounding rule are worse than one.
 *
 * Everything here is pure. The data arrives as one JSON block pasted after each
 * Excel re-run; nothing is computed from live accounts, and nothing pretends to
 * be more current than the `asOf` date printed on the page.
 */

export interface Scenario {
  label: string;
  giving: number;
  desc: string;
}

export interface FlaggedItem {
  kind: string;
  title: string;
  amt: string;
  note: string;
  health: string;
}

export interface Cashflow {
  asOf: string;
  windowStart: string;
  openingCash: number;
  /** The floor. One payroll, so falling under it means a payroll is not covered. */
  threshold: number;
  fixedOpex: number;
  otherIncome: number;
  payrollAmt: number;
  payrollWeeks: number[];
  growLeaderWeek: number | null;
  growLeaderAmt: number;
  scenarios: Record<string, Scenario>;
  flaggedItems: FlaggedItem[];
  source: string;
}

export type CfStatus = 'ok' | 'below' | 'negative';

export const CF_STATUS_LABEL: Record<CfStatus, string> = {
  ok: 'At or above the floor',
  below: 'Below the floor',
  negative: 'Negative',
};

export interface Week {
  wk: number;
  range: string;
  start: string;
  beg: number;
  totalIn: number;
  totalOut: number;
  net: number;
  end: number;
  status: CfStatus;
  /** Draw needed by this week to have held the floor throughout so far. */
  cumDraw: number;
}

const MS_DAY = 86400000;
const at = (iso: string) => new Date(iso + 'T12:00:00');
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const WEEKS = 13;

export function weekStart(cf: Cashflow, wk: number): string {
  return iso(new Date(at(cf.windowStart).getTime() + (wk - 1) * 7 * MS_DAY));
}

export function windowEnd(cf: Cashflow): string {
  return iso(new Date(at(weekStart(cf, WEEKS)).getTime() + 6 * MS_DAY));
}

function rangeLabel(startIso: string): string {
  const a = at(startIso);
  const b = new Date(a.getTime() + 6 * MS_DAY);
  const mm = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${mm(a)}-${mm(b)}`;
}

export function statusOf(cf: Cashflow, end: number): CfStatus {
  if (end < 0) return 'negative';
  return end < cf.threshold ? 'below' : 'ok';
}

/**
 * Build the 13 weeks for one giving assumption.
 *
 * Costs are held fixed across scenarios on purpose: the scenarios flex giving
 * only, so the picker answers "what if income moves" rather than blurring income
 * and spending together into a number nobody can act on.
 */
export function buildWeeks(cf: Cashflow, giving: number): Week[] {
  const totalIn = giving + cf.otherIncome;
  let beg = cf.openingCash;
  let runningMin = Infinity;
  const out: Week[] = [];
  for (let wk = 1; wk <= WEEKS; wk += 1) {
    const totalOut =
      cf.fixedOpex
      + (cf.payrollWeeks.includes(wk) ? cf.payrollAmt : 0)
      + (wk === cf.growLeaderWeek ? cf.growLeaderAmt : 0);
    const net = totalIn - totalOut;
    const end = beg + net;
    runningMin = Math.min(runningMin, end);
    const start = weekStart(cf, wk);
    out.push({
      wk,
      start,
      range: rangeLabel(start),
      beg,
      totalIn,
      totalOut,
      net,
      end,
      status: statusOf(cf, end),
      cumDraw: Math.max(0, cf.threshold - runningMin),
    });
    beg = end;
  }
  return out;
}

export type Scenarios = Record<string, Week[]>;

export const buildAll = (cf: Cashflow): Scenarios =>
  Object.fromEntries(Object.keys(cf.scenarios).map((k) => [k, buildWeeks(cf, cf.scenarios[k].giving)]));

export type Tier = 'critical' | 'caution' | 'ok';

export interface Trigger {
  tier: Tier;
  badge: string;
  headline: string;
  triggerWeek: Week | null;
  lowWeek: Week;
  drawToAvoidNegative: number;
  drawToHoldFloor: number;
}

export function triggerOf(weeks: Week[], scenarioLabel: string): Trigger {
  const firstNegative = weeks.find((w) => w.status === 'negative') ?? null;
  const firstBelow = weeks.find((w) => w.status !== 'ok') ?? null;
  const lowWeek = weeks.reduce((a, b) => (b.end < a.end ? b : a));
  const drawToAvoidNegative = Math.max(0, -lowWeek.end);
  const drawToHoldFloor = weeks[weeks.length - 1].cumDraw;

  if (firstNegative) {
    return {
      tier: 'critical',
      badge: 'Draw required',
      triggerWeek: firstNegative,
      headline: `Cash goes negative in week ${firstNegative.wk} (${firstNegative.range}) under ${scenarioLabel}. A draw is required to stay solvent.`,
      lowWeek, drawToAvoidNegative, drawToHoldFloor,
    };
  }
  if (firstBelow) {
    return {
      tier: 'caution',
      badge: 'Draw recommended',
      triggerWeek: firstBelow,
      headline: `Cash stays positive but falls below the one-payroll floor from week ${firstBelow.wk} (${firstBelow.range}) under ${scenarioLabel}. A draw is optional, for cushion.`,
      lowWeek, drawToAvoidNegative, drawToHoldFloor,
    };
  }
  return {
    tier: 'ok',
    badge: 'No draw needed',
    triggerWeek: null,
    headline: `Cash stays at or above the one-payroll floor for all ${WEEKS} weeks under ${scenarioLabel}.`,
    lowWeek, drawToAvoidNegative, drawToHoldFloor,
  };
}

export type DrawVerdict = 'short' | 'solvent' | 'covered';

export interface DrawResult {
  verdict: DrawVerdict;
  text: string;
}

/**
 * What one draw of `amt` landing in `wk` actually buys.
 *
 * Three answers, and the middle one matters most: a draw can clear the solvency
 * problem and still leave a week under the payroll floor. Collapsing that into
 * "fixed" or "not fixed" is how a board ends up surprised twice.
 */
export function modelDraw(cf: Cashflow, weeks: Week[], amt: number, wk: number): DrawResult {
  const after = weeks
    .filter((w) => w.wk >= wk)
    .map((w) => ({ ...w, end: w.end + amt }))
    .map((w) => ({ ...w, status: statusOf(cf, w.end) }));

  const negative = after.find((w) => w.status === 'negative');
  if (negative) {
    const lowest = after.reduce((a, b) => (b.end < a.end ? b : a));
    return {
      verdict: 'short',
      text: `Not enough on its own — cash would still go negative in week ${negative.wk} (${negative.range}). A further draw of about ${fmt(-lowest.end)} would be needed by then, on top of this one.`,
    };
  }
  const below = after.find((w) => w.status !== 'ok');
  if (below) {
    return {
      verdict: 'solvent',
      text: `Covers the solvency risk — no week goes negative after this draw. Week ${below.wk} (${below.range}) still dips below the ${fmt(cf.threshold)} payroll floor, if you want the full cushion rather than just staying positive.`,
    };
  }
  return {
    verdict: 'covered',
    text: `Covers the full ${WEEKS}-week window — every week stays at or above the payroll floor. No further draw expected before ${fmtDate(windowEnd(cf))}.`,
  };
}

export function fmt(n: number): string {
  const neg = n < 0;
  const s = `$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
  return neg ? `(${s})` : s;
}

export function fmtDelta(n: number): string {
  if (n > 0) return `+${fmt(n)}`;
  if (n < 0) return `-${fmt(Math.abs(n))}`;
  return '$0';
}

export const fmtDate = (isoStr: string) =>
  at(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const fmtDay = (isoStr: string) =>
  at(isoStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export function daysUntil(fromIsoStr: string, toIsoStr: string): number {
  return Math.round((at(toIsoStr).getTime() - at(fromIsoStr).getTime()) / MS_DAY);
}

/** Axis ticks a person would have chosen: 1, 2, 5 and their powers. */
export function niceTicks(min: number, max: number, count: number): number[] {
  const range = max - min;
  if (range <= 0) return [Math.round(min)];
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm < 1.5 ? mag : norm < 3 ? 2 * mag : norm < 7 ? 5 * mag : 10 * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-6; v += step) ticks.push(Math.round(v));
  if (min <= 0 && max >= 0 && !ticks.includes(0)) ticks.push(0);
  return ticks.sort((a, b) => a - b);
}

/**
 * Read a pasted data block.
 *
 * Refusing a bad paste matters more than accepting a clever one: this is the
 * only way data gets in, and a half-valid object would render a dashboard that
 * looks authoritative and is wrong. Every failure names the field.
 */
export function parseCashflow(raw: string): { data: Cashflow } | { error: string } {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return { error: 'That is not valid JSON. Paste the whole block including the outer braces.' };
  }
  // The block is often copied with its "cashflow" key still wrapped around it.
  const o = (v && typeof v === 'object' && 'cashflow' in (v as Record<string, unknown>)
    ? (v as Record<string, unknown>).cashflow
    : v) as Record<string, unknown>;
  if (!o || typeof o !== 'object') return { error: 'Expected an object.' };

  const num = (k: string) => (typeof o[k] === 'number' ? (o[k] as number) : null);
  const str = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : null);

  for (const k of ['asOf', 'windowStart']) {
    const s = str(k);
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return { error: `"${k}" must be a date like 2026-07-30.` };
  }
  for (const k of ['openingCash', 'threshold', 'fixedOpex', 'otherIncome', 'payrollAmt']) {
    if (num(k) === null) return { error: `"${k}" must be a number.` };
  }
  const payrollWeeks = Array.isArray(o.payrollWeeks) ? (o.payrollWeeks as unknown[]) : null;
  if (!payrollWeeks || payrollWeeks.some((w) => typeof w !== 'number' || w < 1 || w > WEEKS)) {
    return { error: `"payrollWeeks" must be a list of week numbers from 1 to ${WEEKS}.` };
  }
  const scen = o.scenarios as Record<string, Scenario> | undefined;
  if (!scen || typeof scen !== 'object' || Object.keys(scen).length === 0) {
    return { error: '"scenarios" must have at least one scenario.' };
  }
  for (const [k, s] of Object.entries(scen)) {
    if (typeof s?.giving !== 'number') return { error: `Scenario "${k}" needs a numeric "giving".` };
  }
  if (!scen.base) return { error: 'One scenario must be called "base" — the others are compared against it.' };

  const gw = o.growLeaderWeek;
  return {
    data: {
      asOf: str('asOf')!,
      windowStart: str('windowStart')!,
      openingCash: num('openingCash')!,
      threshold: num('threshold')!,
      fixedOpex: num('fixedOpex')!,
      otherIncome: num('otherIncome')!,
      payrollAmt: num('payrollAmt')!,
      payrollWeeks: payrollWeeks as number[],
      growLeaderWeek: typeof gw === 'number' ? gw : null,
      growLeaderAmt: num('growLeaderAmt') ?? 0,
      scenarios: Object.fromEntries(Object.entries(scen).map(([k, s]) => [k, {
        label: typeof s.label === 'string' ? s.label : k,
        giving: s.giving,
        desc: typeof s.desc === 'string' ? s.desc : '',
      }])),
      flaggedItems: Array.isArray(o.flaggedItems)
        ? (o.flaggedItems as FlaggedItem[]).map((f) => ({
          kind: String(f?.kind ?? ''),
          title: String(f?.title ?? ''),
          amt: String(f?.amt ?? ''),
          note: String(f?.note ?? ''),
          health: String(f?.health ?? 'not-started'),
        }))
        : [],
      source: str('source') ?? '',
    },
  };
}
