/**
 * The Cash Flow tab.
 *
 * A faithful port of the standalone Integrator Execution Board dashboard —
 * same layout, same palette, same charts — with one structural change: the data
 * is not baked into the page. It lives in your own private space in Firestore
 * and is replaced by pasting the block from each Excel re-run. Baked-in data
 * would have meant a rebuild and a deploy every week, and a weekly chore that
 * needs a terminal is a weekly chore that stops happening.
 *
 * Private to you. Nothing here is shared and there is no setting to share it.
 */
import { useEffect, useMemo, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import { saveCashflow, watchCashflow } from '../lib/cashflow';
import { todayIso } from '../types/me';
import {
  CF_STATUS_LABEL, WEEKS, buildAll, buildWeeks, daysUntil, fmt, fmtDate, fmtDay, fmtDelta,
  modelDraw, niceTicks, parseCashflow, statusOf, triggerOf, windowEnd, weekStart,
  type Cashflow, type CfStatus, type FlaggedItem, type Trigger, type Week,
} from '../types/cashflow';
import { CF_CSS } from './cashflow.css';

const COLOR: Record<CfStatus, string> = {
  ok: 'var(--good)',
  below: 'var(--warning)',
  negative: 'var(--critical)',
};

/** Health words carried over from the source board, so a pasted block still reads. */
const HEALTH: Record<string, { color: string; label: string }> = {
  ok: { color: 'var(--good)', label: 'On track' },
  'on-track': { color: 'var(--good)', label: 'On track' },
  caution: { color: 'var(--warning)', label: 'Below floor' },
  serious: { color: 'var(--serious)', label: 'Serious' },
  critical: { color: 'var(--critical)', label: 'Critical' },
  'not-started': { color: 'var(--ink-3)', label: 'Not yet modeled' },
};

export function CashFlow() {
  const { user } = useOrg();
  const [cf, setCf] = useState<Cashflow | null>(null);
  const [ready, setReady] = useState(false);
  const [scenario, setScenario] = useState('base');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchCashflow(user.uid, (c) => { setCf(c); setReady(true); });
  }, [user]);

  const all = useMemo(() => (cf ? buildAll(cf) : null), [cf]);

  if (!user) return null;

  return (
    <div className="cfroot">
      <style>{CF_CSS}</style>
      <div className="wrap">
        {!ready ? (
          <p style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>Loading</p>
        ) : !cf || !all ? (
          <>
            <h1>Cash flow</h1>
            <p className="lede">
              Nothing here yet. Paste the data block from your latest {WEEKS}-week model run and this
              builds itself. Only you can see it.
            </p>
            <div style={{ marginTop: 16 }}><PasteBlock onDone={() => setEditing(false)} /></div>
          </>
        ) : (
          <Dashboard
            cf={cf}
            all={all}
            scenario={cf.scenarios[scenario] ? scenario : 'base'}
            onScenario={setScenario}
            editing={editing}
            onEditing={setEditing}
          />
        )}
      </div>
    </div>
  );
}

function Dashboard({ cf, all, scenario, onScenario, editing, onEditing }: {
  cf: Cashflow;
  all: Record<string, Week[]>;
  scenario: string;
  onScenario: (s: string) => void;
  editing: boolean;
  onEditing: (v: boolean) => void;
}) {
  const weeks = all[scenario];
  const base = all.base;
  const label = cf.scenarios[scenario].label;
  const trig = triggerOf(weeks, label);
  const age = daysUntil(cf.asOf, todayIso());

  const scenMin = Math.min(...weeks.map((w) => w.end));
  const baseMin = Math.min(...base.map((w) => w.end));
  const belowCount = weeks.filter((w) => w.status !== 'ok').length;
  const delta = weeks[WEEKS - 1].end - base[WEEKS - 1].end;
  const h = (v: number) => statusOf(cf, v);

  const kpis = [
    { lbl: 'Opening cash', val: fmt(cf.openingCash), sub: `As of ${fmtDate(cf.asOf)}`, st: COLOR[h(cf.openingCash)], scen: false },
    { lbl: 'Base ending cash', val: fmt(base[WEEKS - 1].end), sub: `Week ${WEEKS}, base case`, st: COLOR[h(base[WEEKS - 1].end)], scen: false },
    { lbl: 'Scenario ending cash', val: fmt(weeks[WEEKS - 1].end), sub: `Week ${WEEKS}, ${label}`, st: COLOR[h(weeks[WEEKS - 1].end)], scen: true },
    { lbl: 'Base minimum cash', val: fmt(baseMin), sub: 'Low point, base case', st: COLOR[h(baseMin)], scen: false },
    { lbl: 'Scenario minimum cash', val: fmt(scenMin), sub: `Low point, ${label}`, st: COLOR[h(scenMin)], scen: true },
    { lbl: 'Weeks below threshold', val: `${belowCount} of ${WEEKS}`, sub: `${label} · floor ${fmt(cf.threshold)}`, st: belowCount > 6 ? COLOR.negative : belowCount > 0 ? COLOR.below : COLOR.ok, scen: true },
    { lbl: 'Δ scenario vs base', val: fmtDelta(delta), sub: `Ending cash, week ${WEEKS}`, st: delta > 0 ? COLOR.ok : delta < 0 ? COLOR.negative : COLOR.below, scen: true },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <h1>Cash flow</h1>
          <p className="lede">
            Do I know the number, and does the board know it too? — {WEEKS}-week rolling cash flow,
            re-baselined to the actual checking balance. Base case against a downside and an upside
            on giving.
          </p>
          <p className="srcline">
            As of {fmtDate(cf.asOf)} · Window {fmtDate(cf.windowStart)} – {fmtDate(windowEnd(cf))}
          </p>
        </div>
        <button type="button" className="toolbtn" onClick={() => onEditing(!editing)}>
          {editing ? 'Close' : 'Update the data'}
        </button>
      </div>

      {editing && <PasteBlock onDone={() => onEditing(false)} />}

      {age >= 8 && (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          This model was re-baselined {age} days ago. Re-run the {WEEKS}-week file and paste the new
          block before quoting these numbers.
        </div>
      )}

      <div className="kpi-row">
        {kpis.map((k) => (
          <div
            key={k.lbl}
            className={`kpi${k.scen ? ' scenario-tile' : ''}`}
            style={{ '--dot-color': k.st } as React.CSSProperties}
          >
            <div className="lbl">{k.lbl}</div>
            <div className="val num">{k.val}</div>
            <div className="sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Scenario</h2>
        <div className="cardsub">
          Base case is the model as re-run. Downside and upside flex only the weekly giving
          assumption — payroll, fixed opex and one-off bills stay fixed.
        </div>
        <div className="scenario-picker">
          {Object.entries(cf.scenarios).map(([k, s]) => (
            <button
              key={k}
              type="button"
              className="scen-btn"
              aria-pressed={k === scenario}
              onClick={() => onScenario(k)}
            >
              <div className="name">{s.label}</div>
              <div className="desc">{s.desc || `Giving at ${fmt(s.giving)} a week.`}</div>
            </button>
          ))}
        </div>
      </div>

      <TriggerCard cf={cf} weeks={weeks} trig={trig} />
      <EndingCashChart cf={cf} weeks={weeks} base={base} label={label} />
      <MovementChart weeks={weeks} />
      <WeekTable cf={cf} weeks={weeks} />

      {cf.flaggedItems.length > 0 && (
        <div className="card">
          <h2>Flagged items</h2>
          <div className="cardsub">One-off items feeding this model, in decision order</div>
          <div className="tiles">
            {cf.flaggedItems.map((f: FlaggedItem) => {
              const hh = HEALTH[f.health] ?? HEALTH['not-started'];
              return (
                <div key={f.title} className="tile" style={{ '--dot-color': hh.color } as React.CSSProperties}>
                  <div className="kind">{f.kind}</div>
                  <div className="title">{f.title}</div>
                  <div className="amt num">{f.amt}</div>
                  <div className="note">{f.note}</div>
                  <div className="status-tag"><span className="dot" />{hh.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cf.source && <p className="srcline" style={{ marginTop: 4 }}>Source: {cf.source}</p>}
    </>
  );
}

function TriggerCard({ cf, weeks, trig }: { cf: Cashflow; weeks: Week[]; trig: Trigger }) {
  const tw = trig.triggerWeek;
  const facts = tw
    ? (() => {
      const start = weekStart(cf, tw.wk);
      const days = daysUntil(todayIso(), start);
      const wks = Math.round(Math.abs(days) / 7);
      const when = days > 0 ? `~${wks} wk${wks === 1 ? '' : 's'} from today (${days} days)`
        : days === 0 ? 'This week'
        : `${wks} wk${wks === 1 ? '' : 's'} ago — already in this window`;
      return [
        { lbl: 'Decision needed by', val: fmtDay(start), sub: when },
        { lbl: 'Trigger week', val: `Week ${tw.wk}`, sub: tw.range },
        { lbl: 'Draw to avoid negative', val: fmt(trig.drawToAvoidNegative), sub: `Covers low point, week ${trig.lowWeek.wk}` },
        { lbl: 'Draw to hold full floor', val: fmt(trig.drawToHoldFloor), sub: `All ${WEEKS} weeks ≥ ${fmt(cf.threshold)}` },
      ];
    })()
    : [
      { lbl: 'Trigger week', val: 'None', sub: 'Stays above the floor throughout' },
      { lbl: 'Low point', val: fmt(trig.lowWeek.end), sub: `Week ${trig.lowWeek.wk} (${trig.lowWeek.range})` },
      { lbl: 'Draw to avoid negative', val: fmt(trig.drawToAvoidNegative), sub: 'Not applicable — never negative' },
      { lbl: 'Draw to hold full floor', val: fmt(trig.drawToHoldFloor), sub: `All ${WEEKS} weeks ≥ ${fmt(cf.threshold)}` },
    ];

  return (
    <div className={`card trigger-card ${trig.tier}`}>
      <div className="trigger-head">
        <span className={`trigger-badge ${trig.tier}`}>{trig.badge}</span>
        <span className="trigger-headline">{trig.headline}</span>
      </div>

      <div className="trigger-facts">
        {facts.map((f) => (
          <div key={f.lbl} className="trigger-fact">
            <div className="lbl">{f.lbl}</div>
            <div className="val num">{f.val}</div>
            <div className="sub">{f.sub}</div>
          </div>
        ))}
      </div>

      <div className="mini-timeline">
        {weeks.map((w) => (
          <div
            key={w.wk}
            className="mini-seg"
            title={`Week ${w.wk} · ${w.range} · ${fmt(w.end)} · ${CF_STATUS_LABEL[w.status]}`}
            style={{
              background: COLOR[w.status],
              opacity: w.status === 'ok' ? 0.35 : 0.9,
              outline: tw?.wk === w.wk ? '2px solid var(--ink-1)' : undefined,
              outlineOffset: tw?.wk === w.wk ? 1 : undefined,
            }}
          >
            {tw?.wk === w.wk && <div className="pin">Wk{w.wk}</div>}
            <div className="wk-lab">{w.wk}</div>
          </div>
        ))}
      </div>

      <hr style={{ border: 0, borderTop: '1px dashed var(--rule-strong)', margin: '4px 0 16px' }} />
      <DrawModel cf={cf} weeks={weeks} trig={trig} />
    </div>
  );
}

function DrawModel({ cf, weeks, trig }: { cf: Cashflow; weeks: Week[]; trig: Trigger }) {
  const [amt, setAmt] = useState(Math.round(trig.drawToAvoidNegative));
  const [wk, setWk] = useState(trig.triggerWeek?.wk ?? 1);
  const res = modelDraw(cf, weeks, amt, wk);
  const cls = res.verdict === 'short' ? 'warn' : res.verdict === 'solvent' ? 'caution' : 'clear';

  return (
    <div>
      <div className="draw-title">Model a draw — check whether it covers the rest of the window</div>
      <div className="draw-row">
        <label>
          Draw amount
          <input type="number" step={1000} value={amt}
            onChange={(e) => setAmt(Number(e.target.value) || 0)} />
        </label>
        <label>
          Landing in
          <select value={wk} onChange={(e) => setWk(Number(e.target.value))}>
            {weeks.map((w) => <option key={w.wk} value={w.wk}>Week {w.wk} ({w.range})</option>)}
          </select>
        </label>
      </div>
      <div className={`draw-result ${cls}`}>{res.text}</div>
    </div>
  );
}

interface Tip { x: number; y: number; lines: string[] }

function TipBox({ tip }: { tip: Tip }) {
  return (
    <div className="tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>
      <b>{tip.lines[0]}</b>
      {tip.lines.slice(1).map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}

/**
 * Ending cash across the window.
 *
 * The selected scenario is the blue line; base is a muted dashed reference
 * behind it. Points carry the status colour, and only the ones that break the
 * floor are labelled — labelling all thirteen would bury the four that matter.
 */
function EndingCashChart({ cf, weeks, base, label }: {
  cf: Cashflow; weeks: Week[]; base: Week[]; label: string;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const W = 1000, H = 280, padL = 62, padR = 16, padT = 14, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const ends = [...weeks, ...base].map((w) => w.end);
  const yMax = Math.max(...ends, cf.threshold) * 1.08;
  const yMin = Math.min(...ends, 0) * 1.12;
  const x = (i: number) => padL + (plotW * i) / (WEEKS - 1);
  const y = (v: number) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const colW = plotW / WEEKS;
  const path = (ws: Week[]) => ws.map((w, i) => `${i ? 'L' : 'M'}${x(i)},${y(w.end)}`).join(' ');

  return (
    <div className="card">
      <h2>{WEEKS}-week ending cash — base vs. scenario</h2>
      <div className="cardsub">
        Dashed blue = one-payroll floor ({fmt(cf.threshold)}) · dotted grey = zero · shaded weeks
        fall below the floor under the selected scenario
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}
          role="img" aria-label="Ending cash by week">
          {weeks.map((w, i) => (w.status !== 'ok'
            ? <rect key={w.wk} className="shade-band" x={x(i) - colW / 2} y={padT} width={colW} height={plotH} />
            : null))}
          {niceTicks(yMin, yMax, 7).map((v) => (
            <g key={v}>
              <line className={v === 0 ? 'zeroline' : 'gridline'} x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} />
              <text className="axis-label" x={padL - 8} y={y(v) + 3} textAnchor="end">{fmt(v)}</text>
            </g>
          ))}
          <line className="threshline" x1={padL} x2={W - padR} y1={y(cf.threshold)} y2={y(cf.threshold)} />
          <path className="base-line" d={path(base)} />
          <path className="scenario-line" d={path(weeks)} />
          {weeks.map((w, i) => {
            // Week 1 sits high and close to the axis figures, so its label goes
            // below the point; everywhere else, above when the point is high.
            const above = i === 0 ? false : w.end >= (yMax + yMin) / 2;
            return (
              <g key={w.wk}>
                <text className="axis-label" x={x(i)} y={H - 8} textAnchor="middle">Wk{w.wk}</text>
                <circle cx={x(i)} cy={y(w.end)} r={w.status === 'ok' ? 3.2 : 4.6}
                  fill={COLOR[w.status]} stroke="var(--surface-1)" strokeWidth="1.5" />
                {w.status !== 'ok' && (
                  // The first and last labels are anchored inward, or they run
                  // into the axis figures on the left and off the plot on the right.
                  <text
                    className="pt-label"
                    x={x(i) + (i === 0 ? 6 : i === WEEKS - 1 ? -6 : 0)}
                    y={y(w.end) + (above ? -9 : 15)}
                    textAnchor={i === 0 ? 'start' : i === WEEKS - 1 ? 'end' : 'middle'}
                    fill={COLOR[w.status]}
                  >
                    {fmt(w.end)}
                  </text>
                )}
                <rect x={x(i) - colW / 2} y={padT} width={colW} height={plotH} fill="transparent"
                  onMouseEnter={() => setTip({
                    x: (x(i) / W) * 100,
                    y: (y(w.end) / H) * 100,
                    lines: [
                      `Week ${w.wk} (${w.range})`,
                      `${label}: ${fmt(w.end)} · ${CF_STATUS_LABEL[w.status]}`,
                      `Base case: ${fmt(base[i].end)}`,
                    ],
                  })}
                  onMouseLeave={() => setTip(null)} />
              </g>
            );
          })}
        </svg>
        {tip && <TipBox tip={tip} />}
      </div>
      <div className="legend">
        <span><span className="lline" style={{ borderColor: 'var(--ink-3)' }} />Base case</span>
        <span><span className="lline" style={{ borderColor: 'var(--accent)' }} />Selected scenario</span>
        <span><span className="sw" style={{ background: 'var(--good)' }} />OK</span>
        <span><span className="sw" style={{ background: 'var(--warning)' }} />Below floor</span>
        <span><span className="sw" style={{ background: 'var(--critical)' }} />Negative</span>
        <span><span className="lref" />Payroll floor</span>
      </div>
    </div>
  );
}

/** Receipts up, disbursements down, net as a line across the middle. */
function MovementChart({ weeks }: { weeks: Week[] }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const W = 1000, H = 260, padL = 62, padR = 16, padT = 14, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const yMax = Math.max(...weeks.map((w) => w.totalIn)) * 1.1;
  const yMin = Math.min(...weeks.map((w) => -w.totalOut)) * 1.1;
  const x = (i: number) => padL + (plotW * i) / (WEEKS - 1);
  const y = (v: number) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const colW = plotW / WEEKS;
  const bw = colW * 0.5;

  return (
    <div className="card">
      <h2>Weekly cash movement — selected scenario</h2>
      <div className="cardsub">Total receipts (up), total disbursements (down), net cash flow (line)</div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}
          role="img" aria-label="Weekly receipts, disbursements and net">
          {niceTicks(yMin, yMax, 6).map((v) => (
            <g key={v}>
              <line className={v === 0 ? 'zeroline' : 'gridline'} x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} />
              <text className="axis-label" x={padL - 8} y={y(v) + 3} textAnchor="end">{fmt(v)}</text>
            </g>
          ))}
          {weeks.map((w, i) => (
            <g key={w.wk}
              onMouseEnter={() => setTip({
                x: (x(i) / W) * 100,
                y: (y(w.net) / H) * 100,
                lines: [
                  `Week ${w.wk} (${w.range})`,
                  `Receipts: ${fmt(w.totalIn)}`,
                  `Disbursements: ${fmt(w.totalOut)}`,
                  `Net: ${fmtDelta(w.net)}`,
                ],
              })}
              onMouseLeave={() => setTip(null)}>
              <rect x={x(i) - bw / 2} y={y(w.totalIn)} width={bw} height={Math.max(1, y(0) - y(w.totalIn))}
                rx="2" fill="var(--good)" />
              <rect x={x(i) - bw / 2} y={y(0)} width={bw} height={Math.max(1, y(-w.totalOut) - y(0))}
                rx="2" fill="var(--serious)" />
              <text className="axis-label" x={x(i)} y={H - 8} textAnchor="middle">Wk{w.wk}</text>
            </g>
          ))}
          <path className="net-line" d={weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i)},${y(w.net)}`).join(' ')} />
          {weeks.map((w, i) => (
            <circle key={w.wk} cx={x(i)} cy={y(w.net)} r="2.6" fill="var(--ink-1)" />
          ))}
        </svg>
        {tip && <TipBox tip={tip} />}
      </div>
      <div className="legend">
        <span><span className="lbox" style={{ background: 'var(--good)' }} />Total receipts</span>
        <span><span className="lbox" style={{ background: 'var(--serious)' }} />Total disbursements</span>
        <span><span className="lline" style={{ borderColor: 'var(--ink-1)' }} />Net cash flow</span>
      </div>
    </div>
  );
}

/**
 * The numbers behind the charts.
 *
 * Not in the original board, and closed by default so the page reads the same
 * at a glance. It is here because a chart is for noticing and a table is for
 * checking, and the week somebody disputes a figure you want the arithmetic
 * rather than a shape.
 */
function WeekTable({ cf, weeks }: { cf: Cashflow; weeks: Week[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ flex: 1 }}>Week by week</h2>
        <button type="button" className="toolbtn" onClick={() => setOpen(!open)}>
          {open ? 'Hide the numbers' : 'Show the numbers'}
        </button>
      </div>
      {open && (
        <>
          <table style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>Week</th><th>Opening</th><th>Receipts</th><th>Disbursements</th>
                <th>Net</th><th>Closing</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.wk}>
                  <td><b>{w.wk}</b> <span style={{ color: 'var(--ink-3)' }}>{w.range}</span></td>
                  <td className="num">{fmt(w.beg)}</td>
                  <td className="num">{fmt(w.totalIn)}</td>
                  <td className="num">{fmt(w.totalOut)}</td>
                  <td className="num">{fmtDelta(w.net)}</td>
                  <td className="num"><b>{fmt(w.end)}</b></td>
                  <td>
                    <span className="bar" style={{ color: COLOR[w.status] }}>
                      <span className="dot" style={{ background: COLOR[w.status] }} />
                      {CF_STATUS_LABEL[w.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="srcline" style={{ marginTop: 10, marginBottom: 0 }}>
            Floor is {fmt(cf.threshold)}, one payroll. Opening cash {fmt(cf.openingCash)} as of {fmtDate(cf.asOf)}.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * The refresh.
 *
 * Paste, see what it will say, then save. Showing the parsed headline before the
 * write is the cheap version of a dry run — a fat-fingered opening balance is
 * obvious in the summary and invisible in the JSON.
 */
function PasteBlock({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const parsed = text.trim() ? parseCashflow(text) : null;
  const ok = parsed && 'data' in parsed ? parsed.data : null;

  async function save() {
    if (!ok) return;
    setBusy(true);
    try {
      await saveCashflow(ok);
      setText('');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Paste the data block</h2>
      <div className="cardsub">
        The cashflow JSON from your latest {WEEKS}-week run. Pasting replaces everything — a refresh
        is a new model, not an edit of the old one.
      </div>
      <textarea
        value={text}
        rows={8}
        spellCheck={false}
        onChange={(e) => { setText(e.target.value); setError(''); }}
        placeholder={'{\n  "asOf": "2026-07-30",\n  "openingCash": 57172.01,\n  ...\n}'}
      />
      {parsed && 'error' in parsed && <div className="notice bad">{parsed.error}</div>}
      {ok && (
        <div className="notice good">
          Reads as: opening cash {fmt(ok.openingCash)} as of {fmtDate(ok.asOf)}, floor {fmt(ok.threshold)},
          {' '}{Object.keys(ok.scenarios).length} scenarios, {ok.flaggedItems.length} flagged items.
          {' '}Base case ends week {WEEKS} at {fmt(buildWeeks(ok, ok.scenarios.base.giving)[WEEKS - 1].end)}.
        </div>
      )}
      {error && <div className="notice bad">{error}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="button" className="toolbtn primary" disabled={!ok || busy} onClick={() => void save()}>
          Save it
        </button>
        <button type="button" className="toolbtn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}
