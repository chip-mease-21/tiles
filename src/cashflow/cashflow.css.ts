/**
 * The dashboard's own visual system, scoped to this tab.
 *
 * This is lifted from the standalone Integrator Execution Board rather than
 * rewritten in Tiles' stone palette, because the point of the tab is that it is
 * the same dashboard — the same warm plane, the same blue for "the scenario you
 * picked", the same four status colours. A finance board that looks different in
 * two places invites the question of whether it says different things.
 *
 * Every selector is prefixed, so nothing here can reach the rest of the app.
 */
export const CF_CSS = `
.cfroot {
  --surface-1:#fcfcfb; --plane:#f4f4f1;
  --ink-1:#0b0b0b; --ink-2:#52514e; --ink-3:#898781;
  --rule:#e1e0d9; --rule-strong:#c3c2b7;
  --good:#0ca30c; --warning:#fab219; --serious:#ec835a; --critical:#d03b3b;
  --accent:#2a78d6;
  --shadow:0 1px 2px rgba(11,11,11,.05), 0 1px 8px rgba(11,11,11,.04);
  background:var(--plane); color:var(--ink-1);
  font-size:14px; line-height:1.45;
}
.cfroot .wrap { max-width:1180px; margin:0 auto; padding:20px 22px 90px; }
.cfroot h1 { margin:0; font-size:20px; font-weight:700; letter-spacing:-.01em; }
.cfroot .lede { font-size:13.5px; color:var(--ink-2); margin:6px 0 2px; max-width:74ch; }
.cfroot .srcline { font-size:11.5px; color:var(--ink-3); margin-bottom:16px; }

.cfroot .card { background:var(--surface-1); border:1px solid var(--rule); border-radius:12px;
  box-shadow:var(--shadow); padding:18px 20px; margin-bottom:16px; }
.cfroot .card h2 { margin:0 0 3px; font-size:15px; font-weight:700; }
.cfroot .cardsub { font-size:12.5px; color:var(--ink-2); margin-bottom:14px; }

.cfroot .kpi-row { display:grid; grid-template-columns:repeat(7,1fr); gap:10px; margin-bottom:18px; }
.cfroot .kpi { background:var(--surface-1); border:1px solid var(--rule); border-radius:12px;
  padding:12px 13px; box-shadow:var(--shadow); position:relative; }
.cfroot .kpi.scenario-tile { border-color:var(--accent); }
.cfroot .kpi::before { content:""; position:absolute; left:0; top:10px; bottom:10px; width:3px;
  border-radius:2px; background:var(--dot-color,var(--ink-3)); }
.cfroot .kpi .lbl { font-size:10.2px; text-transform:uppercase; letter-spacing:.03em;
  color:var(--ink-3); font-weight:700; line-height:1.3; }
.cfroot .kpi .val { font-size:18px; font-weight:700; margin-top:4px; }
.cfroot .kpi .sub { font-size:11px; color:var(--ink-2); margin-top:3px; }

.cfroot .scenario-picker { display:flex; gap:10px; flex-wrap:wrap; }
.cfroot .scen-btn { flex:1; min-width:160px; text-align:left; font:inherit; cursor:pointer;
  background:var(--plane); border:1.5px solid var(--rule-strong); border-radius:10px; padding:11px 14px; }
.cfroot .scen-btn .name { font-size:13.5px; font-weight:700; }
.cfroot .scen-btn .desc { font-size:11.5px; color:var(--ink-2); margin-top:2px; }
.cfroot .scen-btn[aria-pressed="true"] { border-color:var(--accent);
  background:color-mix(in srgb, var(--accent) 10%, var(--surface-1)); }
.cfroot .scen-btn[aria-pressed="true"] .name { color:var(--accent); }

.cfroot .trigger-card { border-width:1.5px; }
.cfroot .trigger-card.critical { border-color:var(--critical);
  background:color-mix(in srgb, var(--critical) 5%, var(--surface-1)); }
.cfroot .trigger-card.caution { border-color:var(--warning);
  background:color-mix(in srgb, var(--warning) 6%, var(--surface-1)); }
.cfroot .trigger-card.ok { border-color:var(--good);
  background:color-mix(in srgb, var(--good) 5%, var(--surface-1)); }
.cfroot .trigger-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.cfroot .trigger-badge { font-size:12.5px; font-weight:800; text-transform:uppercase;
  letter-spacing:.03em; padding:5px 11px; border-radius:7px; color:#fff; }
.cfroot .trigger-badge.critical { background:var(--critical); }
.cfroot .trigger-badge.caution { background:var(--warning); color:var(--ink-1); }
.cfroot .trigger-badge.ok { background:var(--good); }
.cfroot .trigger-headline { font-size:15px; font-weight:700; }
.cfroot .trigger-facts { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:16px; }
.cfroot .trigger-fact .lbl { font-size:10.2px; text-transform:uppercase; letter-spacing:.03em;
  color:var(--ink-3); font-weight:700; }
.cfroot .trigger-fact .val { font-size:16px; font-weight:700; margin-top:3px; }
.cfroot .trigger-fact .sub { font-size:11.5px; color:var(--ink-2); margin-top:2px; }

.cfroot .mini-timeline { display:flex; gap:3px; margin:30px 0 22px; position:relative; }
.cfroot .mini-seg { flex:1; height:20px; border-radius:4px; position:relative; }
.cfroot .mini-seg .pin { position:absolute; top:-19px; left:50%; transform:translateX(-50%);
  font-size:9px; font-weight:800; white-space:nowrap; color:var(--ink-1); }
.cfroot .mini-seg .pin::after { content:"▼"; display:block; text-align:center; font-size:8px; margin-top:1px; }
.cfroot .mini-seg .wk-lab { position:absolute; bottom:-16px; left:50%; transform:translateX(-50%);
  font-size:9px; color:var(--ink-3); }

.cfroot .draw-title { font-size:13px; font-weight:700; margin-bottom:8px; }
.cfroot .draw-row { display:flex; gap:16px; flex-wrap:wrap; align-items:center; font-size:12.5px; }
.cfroot .draw-row label { display:flex; gap:7px; align-items:center; color:var(--ink-2); }
.cfroot .draw-row input, .cfroot .draw-row select { font:inherit; padding:6px 9px;
  border:1px solid var(--rule-strong); border-radius:8px; background:var(--surface-1); color:var(--ink-1); }
.cfroot .draw-row input { width:120px; }
.cfroot .draw-result { margin-top:12px; padding:11px 13px; border-radius:9px; font-size:12.5px;
  font-weight:600; line-height:1.5; }
.cfroot .draw-result.warn { background:color-mix(in srgb, var(--critical) 8%, var(--surface-1));
  color:var(--critical); }
.cfroot .draw-result.caution { background:color-mix(in srgb, var(--warning) 12%, var(--surface-1));
  color:#8a6100; }
.cfroot .draw-result.clear { background:color-mix(in srgb, var(--good) 8%, var(--surface-1)); color:#0a7d0a; }

.cfroot .chart-wrap { position:relative; }
.cfroot .gridline { stroke:var(--rule); stroke-width:1; }
.cfroot .zeroline { stroke:var(--ink-3); stroke-width:1; stroke-dasharray:3 3; }
.cfroot .threshline { stroke:var(--accent); stroke-width:1.5; stroke-dasharray:5 4; }
.cfroot .shade-band { fill:color-mix(in srgb, var(--critical) 6%, transparent); }
.cfroot .axis-label { font-size:10.5px; fill:var(--ink-3); }
.cfroot .pt-label { font-size:10.5px; font-weight:700; }
.cfroot .base-line { fill:none; stroke:var(--ink-3); stroke-width:1.6; stroke-dasharray:4 3; }
.cfroot .scenario-line { fill:none; stroke:var(--accent); stroke-width:2.25;
  stroke-linecap:round; stroke-linejoin:round; }
.cfroot .net-line { fill:none; stroke:var(--ink-1); stroke-width:1.8; }
.cfroot .legend { display:flex; gap:16px; flex-wrap:wrap; margin-top:10px; font-size:11px; color:var(--ink-2); }
.cfroot .legend .sw { display:inline-block; width:9px; height:9px; border-radius:50%;
  margin-right:5px; vertical-align:-1px; }
.cfroot .legend .lline { display:inline-block; width:14px; height:0; border-top:2px solid;
  margin-right:5px; vertical-align:3px; }
.cfroot .legend .lref { display:inline-block; width:14px; height:0; border-top:1.5px dashed var(--accent);
  margin-right:5px; vertical-align:3px; }
.cfroot .legend .lbox { display:inline-block; width:10px; height:10px; margin-right:5px;
  vertical-align:-1px; border-radius:2px; }
.cfroot .tip { position:absolute; pointer-events:none; background:var(--ink-1); color:#fff;
  font-size:11.5px; line-height:1.45; padding:7px 9px; border-radius:7px; transform:translate(-50%,-115%);
  white-space:nowrap; box-shadow:var(--shadow); }
.cfroot .tip b { display:block; font-weight:700; margin-bottom:2px; }

.cfroot .tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.cfroot .tile { border:1px solid var(--rule); border-radius:10px; padding:13px 14px;
  background:var(--plane); border-left:3px solid var(--dot-color,var(--ink-3)); }
.cfroot .tile .kind { font-size:10.5px; font-weight:700; text-transform:uppercase;
  letter-spacing:.04em; color:var(--ink-3); }
.cfroot .tile .title { font-size:13.5px; font-weight:700; margin:3px 0 2px; }
.cfroot .tile .amt { font-size:15px; font-weight:700; margin-bottom:4px; }
.cfroot .tile .note { font-size:12px; color:var(--ink-2); }
.cfroot .tile .status-tag { display:inline-flex; align-items:center; gap:4px; font-size:11px;
  font-weight:700; margin-top:8px; color:var(--dot-color,var(--ink-3)); }
.cfroot .tile .status-tag .dot { width:6px; height:6px; border-radius:50%;
  background:var(--dot-color,var(--ink-3)); display:inline-block; }

.cfroot table { width:100%; border-collapse:collapse; font-size:12.5px; }
.cfroot th { text-align:right; font-size:10.2px; text-transform:uppercase; letter-spacing:.03em;
  color:var(--ink-3); font-weight:700; padding:6px 8px; border-bottom:1px solid var(--rule); }
.cfroot th:first-child, .cfroot td:first-child, .cfroot th:last-child, .cfroot td:last-child { text-align:left; }
.cfroot td { padding:5px 8px; border-bottom:1px solid var(--rule); }
.cfroot tr:last-child td { border-bottom:0; }
.cfroot .num { font-variant-numeric:tabular-nums; }

.cfroot .bar { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; }
.cfroot .bar .dot { width:6px; height:6px; border-radius:50%; display:inline-block; }
.cfroot .toolbtn { font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;
  background:var(--surface-1); border:1px solid var(--rule-strong); border-radius:8px; padding:6px 12px;
  color:var(--ink-1); }
.cfroot .toolbtn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
.cfroot .toolbtn:disabled { opacity:.5; cursor:default; }
.cfroot textarea { width:100%; font:12px/1.5 var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  padding:10px 12px; border:1px solid var(--rule-strong); border-radius:10px;
  background:var(--surface-1); color:var(--ink-1); }
.cfroot .notice { padding:10px 13px; border-radius:9px; font-size:12.5px; margin-top:10px; line-height:1.5; }
.cfroot .notice.bad { background:color-mix(in srgb, var(--critical) 8%, var(--surface-1)); color:var(--critical); }
.cfroot .notice.good { background:color-mix(in srgb, var(--good) 8%, var(--surface-1)); color:#0a7d0a; }
.cfroot .notice.warn { background:color-mix(in srgb, var(--warning) 12%, var(--surface-1)); color:#8a6100; }

@media (max-width: 1100px) { .cfroot .kpi-row { grid-template-columns:repeat(4,1fr); }
  .cfroot .trigger-facts { grid-template-columns:repeat(2,1fr); } }
@media (max-width: 720px) { .cfroot .kpi-row { grid-template-columns:repeat(2,1fr); }
  .cfroot .tiles { grid-template-columns:1fr; } .cfroot .wrap { padding:16px 14px 80px; } }
`;
