let SUMEND = null;

let SUMMARY = null;

let SUMNOTE = null;

function buildSummary(endISO) {
 const end = endISO || todayISO(), start = addDays(end, -6);
 const days = [];
 for (let k = 6; k >= 0; k--) {
  const iso = addDays(end, -k), day = DAYS.get(iso);
  const t = day ? totalsOf(day.entries) : null;
  const rides = [ ...RIDES.values() ].filter(r => r.d === iso);
  const lifts = [ ...WORKOUTS.values() ].filter(w => w.d === iso && w.done);
  const lt = lifts.map(workoutTotals);
  days.push({
   d: iso,
   w: day && day.wKg > 0 ? day.wKg : null,
   logged: !!(day && day.entries && day.entries.length),
   kcal: t ? t.kcal : 0,
   p: t ? t.p : 0,
   c: t ? t.c : 0,
   f: t ? t.f : 0,
   items: day ? day.entries.length : 0,
   rideKcal: rides.reduce((s, r) => s + (r.kcal || 0), 0),
   rideSecs: rides.reduce((s, r) => s + (r.secs || 0), 0),
   rides: rides.length,
   lifts: lifts.length,
   liftNames: lifts.map(w => w.name),
   sets: lt.reduce((s, x) => s + x.sets, 0),
   eff: r1(lt.reduce((s, x) => s + x.eff, 0))
  });
 }
 const byPart = {};
 [ ...WORKOUTS.values() ].forEach(w => {
  if (!w.done || w.d < start || w.d > end) return;
  const t2 = workoutTotals(w);
  Object.entries(t2.byPart).forEach(([k, v]) => {
   byPart[k] = r1((byPart[k] || 0) + v.eff);
  });
 });
 const cur = windowStats(end), prev = windowStats(addDays(end, -7));
 const eaten = days.filter(d => d.logged);
 const kcals = eaten.map(d => d.kcal);
 const counts = new Map;
 days.forEach(d => {
  const day = DAYS.get(d.d);
  (day ? day.entries : []).forEach(e => counts.set(e.name, (counts.get(e.name) || 0) + 1));
 });
 const top = [ ...counts.entries() ].sort((a, b) => b[1] - a[1]).slice(0, 6);
 const e = end === todayISO() ? estimateTDEE() : {
  ok: false,
  why: "Expenditure is only estimated up to today."
 };
 return {
  start: start,
  end: end,
  days: days,
  coverageFood: eaten.length,
  coverageWeight: days.filter(d => d.w !== null).length,
  meanKcal: kcals.length ? mean(kcals) : null,
  medianKcal: kcals.length ? median(kcals) : null,
  minKcal: kcals.length ? Math.min(...kcals) : null,
  maxKcal: kcals.length ? Math.max(...kcals) : null,
  macroMean: cur.macroMean,
  medianW: cur.median,
  prevMedianW: prev.median,
  deltaW: cur.median !== null && prev.median !== null ? cur.median - prev.median : null,
  weighIns: cur.n,
  rides: days.reduce((s, d) => s + d.rides, 0),
  rideSecs: days.reduce((s, d) => s + d.rideSecs, 0),
  rideKcal: days.reduce((s, d) => s + d.rideKcal, 0),
  lifts: days.reduce((s, d) => s + d.lifts, 0),
  sets: days.reduce((s, d) => s + d.sets, 0),
  eff: r1(days.reduce((s, d) => s + d.eff, 0)),
  byPart: byPart,
  tdee: e.ok ? e.tdee : null,
  tdeeWhy: e.ok ? "" : e.why,
  top: top,
  generated: (new Date).toISOString()
 };
}

function summarySig(s) {
 return s.days.map(d => [ d.w === null ? "" : r2(d.w), r0(d.kcal), r0(d.p), r0(d.c), r0(d.f), r0(d.rideKcal), d.items, d.lifts, d.sets, d.eff ].join(",")).join("|");
}

function sumCard(title, big, sub, art, detail) {
 const kids = [ el("span", {
  class: "ttl"
 }, [ el("span", {
  text: title
 }), chevron() ]), el("span", {
  class: "lead" + (/^[\d.,+\u2212\-\u2014/hkm ]+$/.test(big) ? "" : " txt"),
  text: big
 }), el("span", {
  class: "sub",
  text: sub
 }) ];
 if (art) kids.push(el("span", {
  class: "art"
 }, [ art ]));
 return el("button", {
  class: "card lg",
  type: "button",
  onclick: () => openModal({
   title: title,
   body: detail()
  })
 }, kids);
}

const DOW = iso => parseISO(iso).toLocaleDateString(undefined, {
 weekday: "narrow"
});

function dotRow(label, flags, color) {
 return el("span", {
  class: "mrow"
 }, [ el("span", {
  class: "lb",
  text: label
 }), miniDots(flags, color) ]);
}

VIEWS.summary = function viewSummary() {
 const root = $("#p-summary");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 const end = SUMEND || todayISO();
 const fresh = buildSummary(end);
 const sig = summarySig(fresh);
 if (!SUMMARY || SUMMARY.end !== end || SUMMARY.sig !== sig) {
  fresh.sig = sig;
  SUMMARY = fresh;
  SUMNOTE = null;
 }
 const s = SUMMARY;
 const shift = n => {
  SUMEND = addDays(end, n * 7);
  render();
 };
 pageSwipe(root, {
  prev: () => shift(-1),
  next: () => {
   if (end < todayISO()) shift(1);
  },
  move: () => [ root.querySelector(".stack") ]
 });
 root.appendChild(el("div", {
  class: "sec"
 }, [ el("div", {
  class: "box pad bar"
 }, [ el("button", {
  class: "btn sm",
  type: "button",
  text: "‹",
  "aria-label": "Earlier week",
  onclick: () => shift(-1)
 }), el("div", {
  class: "grow mid"
 }, [ el("div", {
  class: "hd",
  text: fmtDate(addDays(end, -6)) + " – " + fmtDate(end)
 }), el("div", {
  class: "small muted",
  text: end === todayISO() ? "the last seven days" : "seven days to " + fmtDate(end, true)
 }) ]), el("button", {
  class: "btn sm",
  type: "button",
  text: "›",
  "aria-label": "Later week",
  disabled: end >= todayISO() ? "" : null,
  onclick: () => shift(1)
 }) ]) ]));
 const grid = el("div", {
  class: "stack"
 });
 const L = sections(grid, "summary");
 if (tracks("food") && everAte()) L.add("intake", "Intake", sumCard("Intake", s.meanKcal === null ? "—" : fmtE(s.meanKcal), s.meanKcal === null ? "nothing logged" : eUnit() + " a day", stackBars(s.days.map(d => ({
  label: DOW(d.d),
  parts: [ {
   v: d.p * 4,
   css: "var(--nut-p)"
  }, {
   v: d.c * 4,
   css: "var(--nut-c)"
  }, {
   v: d.f * 9,
   css: "var(--nut-f)"
  } ]
 })), 330, 74), () => [ el("div", {
  class: "box pad"
 }, [ kv("Mean", s.meanKcal === null ? "—" : fmtEU(s.meanKcal)), kv("Median day", s.medianKcal === null ? "—" : fmtEU(s.medianKcal)), kv("Range", s.minKcal === null ? "—" : `${fmtE(s.minKcal)} – ${fmtEU(s.maxKcal)}`), s.macroMean ? kv("Protein", r0(s.macroMean.p) + " g/day") : null, s.macroMean ? kv("Carbs", r0(s.macroMean.c) + " g/day") : null, s.macroMean ? kv("Fat", r0(s.macroMean.f) + " g/day") : null ]), legend([ [ "", "var(--nut-p)", "protein" ], [ "", "var(--nut-c)", "carbs" ], [ "", "var(--nut-f)", "fat" ] ]), dayTable(s) ]));
 if (tracks("weight") && everWeighed()) L.add("weight", "Weight", sumCard("Weight", s.medianW === null ? "—" : fmtW(s.medianW), s.deltaW === null ? wUnit() + ", 7-day " + basisWord() : `${wUnit()} · ${signedW(s.deltaW)} on the week`, weekLine(s.days.map(d => d.w === null ? null : kgToDisp(d.w)), 330, 62, "var(--ser-weight)"), () => [ el("div", {
  class: "box pad"
 }, [ kv("Seven-day " + basisWord(), s.medianW === null ? "—" : fmtW(s.medianW) + " " + wUnit()), kv("Readings", String(s.weighIns)), kv("Seven days before", s.prevMedianW === null ? "—" : fmtW(s.prevMedianW) + " " + wUnit()), kv("Change", s.deltaW === null ? "—" : signedW(s.deltaW) + " " + wUnit()), s.tdee ? kv("Expenditure", fmtEU(s.tdee) + "/day") : null ]), s.tdee ? null : el("div", {
  class: "note",
  text: s.tdeeWhy
 }), dayTable(s) ]));
 const items = s.days.reduce((a, d) => a + d.items, 0);
 if (everAte() || everWeighed()) L.add("logged", "Logged", sumCard("Logged", `${s.coverageFood}/7`, "days of food", el("div", {
  class: "meter wide"
 }, [ tracks("food") ? dotRow("food", s.days.map(d => d.logged), "var(--ser-intake)") : null, tracks("weight") ? dotRow("weight", s.days.map(d => d.w !== null), "var(--ser-weight)") : null, tracks("cardio") ? dotRow(cardioWords().many, s.days.map(d => d.rides > 0), "var(--ser-ride)") : null ].filter(Boolean)), () => [ el("div", {
  class: "box pad"
 }, [ kv("Days with food", `${s.coverageFood} of 7`), kv("Days weighed", `${s.coverageWeight} of 7`), kv(cardioWords().days, `${s.days.filter(d => d.rides).length} of 7`), kv("Items logged", String(items)) ]), dayTable(s) ]));
 if (tracks("cardio") && s.rides) {
  L.add("cardio", cardioWords().noun, sumCard(cardioWords().noun, (s.rideSecs / 3600).toFixed(1) + "h", `${nCardio(s.rides)} · ${fmtEU(s.rideKcal)}`, stackBars(s.days.map(d => ({
   label: DOW(d.d),
   parts: [ {
    v: d.rideKcal,
    css: "var(--ser-ride)"
   } ]
  })), 330, 60), () => [ el("div", {
   class: "box pad"
  }, [ kv(capFirst(cardioWords().many), String(s.rides)), kv("Time", (s.rideSecs / 3600).toFixed(1) + " h"), kv("Burned", fmtEU(s.rideKcal)), kv("Per " + cardioWords().noun.toLowerCase() + " day", fmtEU(s.rideKcal / Math.max(1, s.days.filter(d => d.rides).length))) ]) ]));
 }
 if (s.lifts && tracks("strength")) {
  const parts = Object.entries(s.byPart).sort((a, b) => b[1] - a[1]);
  L.add("strength", "Strength", sumCard("Strength", metric().fmt(s.eff), `${s.lifts} session${s.lifts === 1 ? "" : "s"} · ${s.sets} sets`, stackBars(s.days.map(d => ({
   label: DOW(d.d),
   parts: [ {
    v: d.eff,
    css: "var(--ser-lift)"
   } ]
  })), 330, 60), () => [ el("div", {
   class: "box pad"
  }, [ kv("Sessions", String(s.lifts)), kv("Sets", String(s.sets)), kv(metric().name, metric().fmt(s.eff)), kv("Per session", metric().fmt(s.eff / s.lifts)) ]), parts.length ? el("div", {
   class: "box rows mt"
  }, parts.map(([k, v]) => row({
   t1: partName(k),
   val: metric().fmt(v)
  }))) : null ].filter(Boolean)));
 }
 if (s.top.length) {
  L.add("top", "Most logged", sumCard("Most logged", s.top[0][0].length > 16 ? s.top[0][0].slice(0, 15) + "…" : s.top[0][0], `${s.top[0][1]} times this week`, null, () => [ el("div", {
   class: "box rows"
  }, s.top.map(([name, n]) => row({
   t1: name,
   val: `${n}×`
  }))) ]));
 }
 root.appendChild(el("div", {
  class: "sec"
 }, [ grid ]));
 L.done();
 if (!grid.children.length) {
  const a = firstAct(tracks("food") ? "food" : tracks("weight") ? "weight" : tracks("cardio") ? "cardio" : "strength");
  grid.appendChild(el("div", {
   class: "box"
  }, [ emptyAdd(a.text, a.fn) ]));
 }
 if (AI) {
  const host = el("div", {});
  const paint = () => {
   host.innerHTML = "";
   if (SUMNOTE) {
    host.appendChild(el("div", {
     class: "note",
     text: SUMNOTE
    }));
    return;
   }
   host.appendChild(el("button", {
    class: "btn wide",
    type: "button",
    onclick: ask
   }, [ icon("ai"), el("span", {
    text: "Ask Claude to read this week"
   }) ]));
  };
  async function ask() {
   host.innerHTML = "";
   host.appendChild(el("div", {
    class: "box pad bar"
   }, [ el("span", {
    class: "spin"
   }), el("span", {
    class: "small muted",
    text: "Reading…"
   }) ]));
   try {
    const txt = await AI(summaryPrompt(s), {
     modelTier: S.ai.tier
    });
    SUMNOTE = (txt && txt.text ? txt.text : String(txt)).trim();
   } catch (e) {
    SUMNOTE = AI_ERR[e && e.code] || "That didn't work. Try again.";
   }
   paint();
  }
  root.appendChild(sec("Read-through", null, [ host ]));
  paint();
 }
};

function dayTable(s) {
 const tb = el("table", {
  class: "t"
 });
 tb.appendChild(el("tr", {}, [ el("th", {
  text: "Day"
 }), el("th", {
  class: "n",
  text: wUnit()
 }), el("th", {
  class: "n",
  text: eUnit()
 }), el("th", {
  class: "n",
  text: "P"
 }), el("th", {
  class: "n",
  text: "C"
 }), el("th", {
  class: "n",
  text: "F"
 }) ]));
 s.days.forEach(d => tb.appendChild(el("tr", {}, [ el("td", {
  text: parseISO(d.d).toLocaleDateString(undefined, {
   weekday: "short"
  })
 }), el("td", {
  class: "n",
  text: d.w === null ? "—" : fmtW(d.w)
 }), el("td", {
  class: "n",
  text: d.logged ? fmtE(d.kcal) : "—"
 }), el("td", {
  class: "n",
  text: d.logged ? r0(d.p) : "—"
 }), el("td", {
  class: "n",
  text: d.logged ? r0(d.c) : "—"
 }), el("td", {
  class: "n",
  text: d.logged ? r0(d.f) : "—"
 }) ])));
 return el("div", {
  class: "box scrollx"
 }, [ tb ]);
}

function summaryPrompt(s) {
 const rows = s.days.map(d => `${d.d}: weight ${d.w === null ? "—" : fmtW(d.w) + wUnit()}, ` + (d.logged ? `${r0(d.kcal)} kcal, ${r0(d.p)}P ${r0(d.c)}C ${r0(d.f)}F` : "food not logged") + (d.rides ? `, ${nCardio(d.rides)}, ${r0(d.rideKcal)} kcal` : "") + (d.lifts ? `, lifted: ${d.liftNames.join(" and ")}, ${d.sets} sets, ${fmtMetric(d.eff)}` : "")).join("\n");
 return [ "Read one week of a person's own weight and food log and describe what actually happened.", "Two or three sentences, plain and specific, no bullet points.", "", "Rules you must follow:", "- Be descriptive, not evaluative. Never praise or criticise adherence, never call days good or bad,", "  never mention willpower, discipline, cheating or getting back on track, and never tell them to do better.", "- Point at patterns in the numbers instead: what moved with what, where the variation sits, what a", "  reading is and is not evidence for.", "- Say plainly when a week has too little logged to conclude anything.", "- Weight over one week is mostly noise; treat a single week's change with the caution it deserves.", "- No medical advice and no diagnosis.", "", `Window: ${s.start} to ${s.end}`, `Food logged on ${s.coverageFood} of 7 days, weighed on ${s.coverageWeight} of 7.`, s.meanKcal === null ? "No intake figures." : `Mean intake ${r0(s.meanKcal)} kcal (median ${r0(s.medianKcal)}, range ${r0(s.minKcal)}–${r0(s.maxKcal)}).`, s.macroMean ? `Mean macros ${r0(s.macroMean.p)}P ${r0(s.macroMean.c)}C ${r0(s.macroMean.f)}F.` : "", s.medianW === null ? "No weight readings." : `Seven-day ${basisWord()} weight ${fmtW(s.medianW)}${wUnit()}` + (s.prevMedianW !== null ? `, previous seven ${fmtW(s.prevMedianW)}${wUnit()}, change ${signedW(s.deltaW)}${wUnit()}.` : "."), s.tdee ? `Estimated expenditure ${r0(s.tdee)} kcal/day.` : "", s.rides ? `${nCardio(s.rides)}, ${(s.rideSecs / 3600).toFixed(1)} h, ${r0(s.rideKcal)} kcal burned.` : "No cardio logged.", s.lifts ? `${s.lifts} strength session${s.lifts === 1 ? "" : "s"}, ${s.sets} sets, ` + `${fmtMetric(s.eff)} in total.` : "No strength sessions logged.", Object.keys(s.byPart).length ? metric().name + " by body part: " + Object.entries(s.byPart).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${partName(k)} ${metric().fmt(v)}`).join(", ") + "." : "", "", metric().band ? "About the training numbers: effective reps are entered per set by the lifter, as the reps" : "", metric().band ? `close enough to failure to count. ${effTarget()[0]}–${effTarget()[1]} a week per body part is the band being aimed at,` : "", metric().band ? "so describe where a part landed against that rather than calling a number good or bad." : "", "", "Day by day:", rows ].filter(Boolean).join("\n");
}

let XWEEK = null;

function weekRows(n) {
 const today = todayISO(), last = weekStart(today), first = addDays(last, -7 * (n - 1));
 const rows = [];
 for (let i = 0; i < n; i++) rows.push({
  start: addDays(first, 7 * i),
  kcal: [],
  w: [],
  metric: 0,
  lifts: 0,
  secs: 0,
  ekcal: 0,
  esecs: 0,
  sessions: 0
 });
 const at = iso => {
  const k = Math.floor(daysBetween(first, iso) / 7);
  return iso <= today && k >= 0 && k < n ? rows[k] : null;
 };
 DAYS.forEach(d => {
  const r = at(d.d);
  if (!r) return;
  if (hasFood(d)) r.kcal.push(totalsOf(d.entries).kcal);
  if (hasWeight(d)) r.w.push(d.wKg);
 });
 WORKOUTS.forEach(w => {
  const r = w.done && at(w.d);
  if (r) {
   r.metric += workoutTotals(w).eff;
   r.lifts++;
  }
 });
 RIDES.forEach(x => {
  const r = at(x.d);
  if (!r) return;
  r.secs += x.secs || 0;
  r.sessions++;
  if (x.kcal > 0 && x.secs > 0) {
   r.ekcal += x.kcal;
   r.esecs += x.secs;
  }
 });
 return rows.map(r => ({
  start: r.start,
  intake: r.kcal.length ? mean(r.kcal) : null,
  weight: centreOf(r.w),
  metric: r.lifts ? r.metric : null,
  hours: r.sessions ? r.secs / 3600 : null,
  rate: r.esecs ? r.ekcal / (r.esecs / 3600) : null
 }));
}

function weekLanes() {
 const u = eUnit();
 return [ {
  id: "intake",
  name: "Intake",
  on: tracks("food") && everAte(),
  kind: "bars",
  css: "var(--ser-intake)",
  fmt: v => fmtE(v) + " " + u + "/day"
 }, {
  id: "weight",
  name: "Weight",
  on: tracks("weight") && everWeighed(),
  kind: "line",
  css: "var(--ser-weight)",
  fmt: v => fmtW(v) + " " + wUnit()
 }, {
  id: "metric",
  name: metric().name,
  short: metric().col,
  on: tracks("strength") && WORKOUTS.size > 0,
  kind: "bars",
  css: "var(--ser-lift)",
  fmt: v => metric().fmt(v)
 }, {
  id: "hours",
  name: capFirst(cardioWords().noun) + " hours",
  short: "Hours",
  on: tracks("cardio") && everRode(),
  kind: "bars",
  css: "var(--ser-ride)",
  fmt: v => v.toFixed(1) + " h"
 }, {
  id: "rate",
  name: capFirst(cardioWords().noun) + " intensity",
  short: "Intensity",
  on: tracks("cardio") && everRode(),
  kind: "line",
  css: "var(--ser-ride)",
  fmt: v => fmtE(v) + " " + u + "/h"
 } ].filter(l => l.on);
}

function laneSvg(vals, lane, W, sel, onPick) {
 const H = 56, n = vals.length, slot = W / n;
 const svg = svgEl("svg", {
  class: "lane",
  width: W,
  height: H,
  viewBox: `0 0 ${W} ${H}`,
  role: "img",
  "aria-label": lane.name
 });
 const got = vals.filter(v => v !== null);
 if (sel !== null) svg.appendChild(svgEl("rect", {
  class: "lanesel",
  x: sel * slot + .5,
  y: .5,
  width: slot - 1,
  height: H - 1
 }));
 if (lane.kind === "bars") {
  const hi = Math.max(...got, 0) || 1;
  vals.forEach((v, i) => {
   if (!v) return;
   const h = Math.max(1, v / hi * (H - 6));
   svg.appendChild(svgEl("rect", {
    x: i * slot + slot * .18,
    y: H - h,
    width: slot * .64,
    height: h,
    fill: lane.css
   }));
  });
 } else {
  const lo = Math.min(...got), hi = Math.max(...got), rng = hi - lo || 1;
  let d = "", pen = false;
  vals.forEach((v, i) => {
   if (v === null) {
    pen = false;
    return;
   }
   const x = i * slot + slot / 2, y = H - 5 - (v - lo) / rng * (H - 10);
   d += (pen ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
   pen = true;
   svg.appendChild(svgEl("circle", {
    cx: x,
    cy: y,
    r: 2,
    fill: lane.css
   }));
  });
  svg.appendChild(svgEl("path", {
   d: d,
   fill: "none",
   stroke: lane.css,
   "stroke-width": 1.6,
   "stroke-linejoin": "round"
  }));
 }
 svg.addEventListener("click", e => {
  const b = svg.getBoundingClientRect();
  onPick(clamp(Math.floor((e.clientX - b.left) / (b.width / n)), 0, n - 1));
 });
 return svg;
}

VIEWS.together = function viewTogether() {
 const root = $("#p-together");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 const lanes = weekLanes();
 if (!lanes.length) {
  const a = firstAct(tracks("food") ? "food" : tracks("weight") ? "weight" : tracks("strength") ? "strength" : "cardio");
  root.appendChild(el("div", {
   class: "sec"
  }, [ el("div", {
   class: "box"
  }, [ emptyAdd(a.text, a.fn) ]) ]));
  return;
 }
 const n = S.spans.weeks, rows = weekRows(n);
 if (XWEEK === null || XWEEK >= n) XWEEK = n - 1;
 const sel = XWEEK, wk = rows[sel];
 root.appendChild(el("div", {
  class: "sec"
 }, [ el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "bar"
 }, [ el("div", {
  class: "grow hd",
  text: fmtDate(wk.start) + " – " + fmtDate(addDays(wk.start, 6))
 }), sel !== n - 1 ? el("button", {
  class: "btn sm",
  type: "button",
  text: "This week",
  onclick: () => {
   XWEEK = n - 1;
   render();
  }
 }) : null ].filter(Boolean)), el("div", {
  class: "mt"
 }, [ segmented([ [ 12, "12 weeks" ], [ 26, "26 weeks" ], [ 52, "1 year" ] ], n, v => {
  S.spans = {
   ...S.spans,
   weeks: +v
  };
  XWEEK = null;
  saveSettings();
 }) ]) ]) ]));
 const W = Math.max(200, Math.floor((root.clientWidth || 355) - 24));
 const pick = i => {
  XWEEK = i;
  render();
 };
 const L = sections(root, "together");
 lanes.forEach(lane => {
  const vals = rows.map(r => r[lane.id]), v = vals[sel];
  L.add(lane.id, lane.name, sec(lane.name, el("span", {
   class: "mono lanev",
   text: v === null ? "—" : lane.fmt(v)
  }), [ el("div", {
   class: "box lanebox"
  }, [ laneSvg(vals, lane, W, sel, pick) ]) ]));
 });
 L.done();
};
