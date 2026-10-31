function quickStarts(limit) {
 const today = todayISO(), dow = dowOf(today);
 const score = new Map;
 const bump = (kind, id, when) => {
  const age = daysBetween(when, today);
  if (age < 0 || age > 180) return;
  const same = dowOf(when) === dow;
  const k = kind + ":" + id;
  score.set(k, (score.get(k) || 0) + (same ? 1 : .18) * Math.pow(.985, age));
 };
 WORKOUTS.forEach(w => {
  if (w.done && w.planId) bump("plan", w.planId, w.d);
 });
 RIDES.forEach(r => {
  if (r.presetId) bump("preset", r.presetId, r.d);
 });
 const dueToday = new Set(dueOn(today).map(e => e.k + ":" + e.id));
 const out = [];
 [ ...WPLANS.values() ].forEach(p => out.push({
  kind: "plan",
  item: p,
  score: (score.get("plan:" + p.id) || 0) + (dueToday.has("plan:" + p.id) ? 100 : 0)
 }));
 [ ...PRESETS.values() ].forEach(p => out.push({
  kind: "preset",
  item: p,
  score: (score.get("preset:" + p.id) || 0) + (dueToday.has("ride:" + p.id) ? 100 : 0)
 }));
 return out.sort((a, b) => b.score - a.score).slice(0, limit || 30);
}

function openAddWorkout() {
 const plans = [ ...WPLANS.values() ];
 const today = todayISO();
 const dueSet = new Set(dueOn(today).map(e => e.k + ":" + e.id));
 const quick = quickStarts();
 const rows = el("div", {
  class: "box rows quicklist"
 });
 const todayRows = el("div", {
  class: "box rows"
 });
 const isDue = q => dueSet.has((q.kind === "plan" ? "plan:" : "ride:") + q.item.id);
 quick.forEach(q => {
  if (q.kind === "plan" ? !tracks("strength") : !tracks("cardio")) return;
  const into = isDue(q) ? todayRows : rows;
  if (q.kind === "plan") {
   const p = q.item;
   into.appendChild(row({
    mark: planMark(planStyle(p), 14),
    t1: p.name,
    t2: p.items.length + " exercises",
    tail: [ el("span", {
     class: "chip",
     text: "Start"
    }) ],
    onclick: () => {
     closeModal();
     startWorkout(p);
    }
   }));
  } else {
   const p = q.item;
   into.appendChild(row({
    mark: rideMark(14, p),
    t1: p.name || secsToHM(p.secs),
    t2: presetLabel(p),
    tail: [ el("span", {
     class: "chip",
     text: "Log"
    }) ],
    onclick: () => {
     closeModal();
     openRide(null, p);
    }
   }));
  }
 });
 openModal({
  title: "Add a workout",
  body: [ el("div", {
   class: "tiles"
  }, [ tracks("strength") ? tile("dumbbell", "Strength", plans.length ? "workouts and exercises" : "build one first", () => go("wplans")) : null, tracks("cardio") ? tile(defaultMod() === "ride" ? "bike" : "clock", cardioMod(defaultMod()).name, metricsLine(defaultMod()), () => openRide(null, null, defaultMod())) : null ].filter(Boolean)), todayRows.children.length ? el("div", {
   class: "mt"
  }, [ el("div", {
   class: "grouphd still",
   text: "Today's workout"
  }), todayRows ]) : null, rows.children.length ? el("div", {
   class: "mt"
  }, [ todayRows.children.length ? el("div", {
   class: "grouphd still",
   text: "Everything else"
  }) : null, rows ].filter(Boolean)) : null ].filter(Boolean)
 });
}

let EFFOFF = 0, TOPOFF = 0;

const effSpan = () => ZSPAN.eff || S.spans.eff;

const topSpan = () => ZSPAN.top || S.spans.top;

let HUBPART = null, HUBBUCKET = "week", HUBPICK = null;

function panDrag(node, o) {
 const st = {
  panned: false
 };
 let sx = 0, sy = 0, s0 = 0, axis = 0, on = false, raf = 0;
 node.addEventListener("pointerdown", e => {
  on = true;
  axis = 0;
  st.panned = false;
  sx = e.clientX;
  sy = e.clientY;
  s0 = o.get();
 });
 node.addEventListener("pointermove", e => {
  if (!on) return;
  if (!axis) {
   const ax = Math.abs(e.clientX - sx), ay = Math.abs(e.clientY - sy);
   if (ax < 7 && ay < 7) return;
   axis = ax > ay ? 1 : 2;
   if (axis === 1) {
    st.panned = true;
    try {
     node.setPointerCapture(e.pointerId);
    } catch (err) {}
   }
  }
  if (axis !== 1) {
   on = false;
   return;
  }
  e.preventDefault();
  const w = node.getBoundingClientRect().width || 1;
  o.set(s0, (e.clientX - sx) / w);
  if (!raf) raf = requestAnimationFrame(() => {
   raf = 0;
   o.draw();
  });
 });
 const stop = () => {
  const was = on && axis === 1;
  on = false;
  if (was && o.end) o.end();
 };
 node.addEventListener("pointerup", stop);
 node.addEventListener("pointercancel", stop);
 return st;
}

function firstTrainingISO() {
 let first = null;
 WORKOUTS.forEach(w => {
  if (!first || w.d < first) first = w.d;
 });
 RIDES.forEach(r => {
  if (!first || r.d < first) first = r.d;
 });
 return first;
}

const PLAN_SHAPES = [ "square", "triangle", "diamond", "hex", "circle", "star", "chevron", "ring", "bar", "cross" ];

const PLAN_COLORS = Array.from({
 length: 10
}, (_, i) => `var(--cat-${i + 1})`);

const CAT_LEGACY = Object.fromEntries([ "#1F6FEB", "#1E8E57", "#B5860B", "#7B4FC7", "#0E8C99", "#C0651C", "#8A2E6B", "#5C7A3F", "#C0392B", "#546E7A" ].map((h, i) => [ h.toLowerCase(), PLAN_COLORS[i] ]));

CAT_LEGACY["#4b5563"] = PLAN_COLORS[9];

const catColor = c => CAT_LEGACY[String(c || "").toLowerCase()] || c;

function planStyle(plan) {
 if (plan && plan.color && plan.shape) return {
  color: catColor(plan.color),
  shape: plan.shape
 };
 const ids = [ ...WPLANS.keys() ].sort();
 const i = plan ? Math.max(0, ids.indexOf(plan.id)) : 0;
 return {
  color: PLAN_COLORS[i % PLAN_COLORS.length],
  shape: PLAN_SHAPES[Math.floor(i / PLAN_COLORS.length) % PLAN_SHAPES.length]
 };
}

function nextPlanStyle() {
 const taken = new Set([ ...WPLANS.values() ].map(p => {
  const s = planStyle(p);
  return s.color + "|" + s.shape;
 }));
 for (const shape of PLAN_SHAPES) for (const color of PLAN_COLORS) {
  if (!taken.has(color + "|" + shape)) return {
   color: color,
   shape: shape
  };
 }
 return {
  color: PLAN_COLORS[0],
  shape: PLAN_SHAPES[0]
 };
}

function planMark(style, size) {
 const s = size || 14, h = s / 2;
 const svg = svgEl("svg", {
  viewBox: `0 0 ${s} ${s}`,
  width: s,
  height: s,
  class: "mark",
  "aria-hidden": "true"
 });
 const f = {
  fill: style.color
 };
 if (style.shape === "circle") svg.appendChild(svgEl("circle", {
  cx: h,
  cy: h,
  r: h - .5,
  ...f
 })); else if (style.shape === "triangle") svg.appendChild(svgEl("polygon", {
  points: `${h},0.5 ${s - .5},${s - 1} 0.5,${s - 1}`,
  ...f
 })); else if (style.shape === "diamond") svg.appendChild(svgEl("polygon", {
  points: `${h},0 ${s},${h} ${h},${s} 0,${h}`,
  ...f
 })); else if (style.shape === "hex") svg.appendChild(svgEl("polygon", {
  points: `${h},0 ${s},${s * .27} ${s},${s * .73} ${h},${s} 0,${s * .73} 0,${s * .27}`,
  ...f
 })); else if (style.shape === "star") {
  const pts = [];
  for (let i = 0; i < 10; i++) {
   const a = Math.PI / 5 * i - Math.PI / 2, r = i % 2 ? h * .44 : h - .4;
   pts.push((h + Math.cos(a) * r).toFixed(2) + "," + (h + Math.sin(a) * r).toFixed(2));
  }
  svg.appendChild(svgEl("polygon", {
   points: pts.join(" "),
   ...f
  }));
 } else if (style.shape === "chevron") svg.appendChild(svgEl("polygon", {
  points: `${h},0.5 ${s - .5},${s * .55} ${s - .5},${s - .5} ${h},${s * .45} 0.5,${s - .5} 0.5,${s * .55}`,
  ...f
 })); else if (style.shape === "ring") svg.appendChild(svgEl("circle", {
  cx: h,
  cy: h,
  r: h - s * .16,
  fill: "none",
  stroke: style.color,
  "stroke-width": s * .3
 })); else if (style.shape === "bar") svg.appendChild(svgEl("rect", {
  x: .5,
  y: s * .3,
  width: s - 1,
  height: s * .4,
  ...f
 })); else if (style.shape === "cross") svg.appendChild(svgEl("polygon", {
  points: `${s * .35},0.5 ${s * .65},0.5 ${s * .65},${s * .35} ${s - .5},${s * .35} ` + `${s - .5},${s * .65} ${s * .65},${s * .65} ${s * .65},${s - .5} ${s * .35},${s - .5} ` + `${s * .35},${s * .65} 0.5,${s * .65} 0.5,${s * .35} ${s * .35},${s * .35}`,
  ...f
 })); else svg.appendChild(svgEl("rect", {
  x: .5,
  y: .5,
  width: s - 1,
  height: s - 1,
  ...f
 }));
 return svg;
}

function markPicker(style, onPick) {
 let cur = {
  color: catColor(style.color),
  shape: style.shape
 };
 const preview = el("span", {
  class: "mkprev"
 });
 const shapes = el("div", {
  class: "mkgrid"
 });
 const colors = el("div", {
  class: "mkgrid"
 });
 const paint = () => {
  preview.innerHTML = "";
  preview.appendChild(planMark(cur, 30));
  [ ...shapes.children ].forEach((b, i) => b.classList.toggle("on", PLAN_SHAPES[i] === cur.shape));
  [ ...colors.children ].forEach((b, i) => b.classList.toggle("on", PLAN_COLORS[i] === cur.color));
  onPick(cur);
 };
 PLAN_SHAPES.forEach(sh => {
  const b = el("button", {
   class: "mkopt",
   type: "button",
   "aria-label": sh,
   onclick: () => {
    cur = {
     ...cur,
     shape: sh
    };
    paint();
   }
  }, [ planMark({
   color: "var(--ink2)",
   shape: sh
  }, 18) ]);
  shapes.appendChild(b);
 });
 PLAN_COLORS.forEach((c, i) => {
  const b = el("button", {
   class: "mkopt",
   type: "button",
   "aria-label": "colour " + (i + 1),
   onclick: () => {
    cur = {
     ...cur,
     color: c
    };
    paint();
   }
  }, [ el("span", {
   class: "sw",
   style: "background:" + c
  }) ]);
  colors.appendChild(b);
 });
 const wrap = el("div", {
  class: "mkpick"
 }, [ el("div", {
  class: "mkrow"
 }, [ preview, el("div", {
  class: "grow"
 }, [ shapes ]) ]), colors ]);
 paint();
 return wrap;
}

function workoutMark(w, size) {
 const plan = w.planId ? WPLANS.get(w.planId) : null;
 return planMark(plan ? planStyle(plan) : {
  color: "var(--ink3)",
  shape: "square"
 }, size);
}

function rideStyle(preset) {
 if (preset && preset.color && preset.shape) return {
  color: catColor(preset.color),
  shape: preset.shape
 };
 return {
  color: RIDE_CAT,
  shape: "circle"
 };
}

const RIDE_CAT = "var(--cat-9)";

const rideMark = (size, preset) => planMark(rideStyle(preset), size);

const EX_COLORS = [ 1, 9, 2, 3, 4, 5, 6, 7, 8, 10 ].map(i => `var(--cat-${i})`);

function partStack(span, partK, bucket, endISO) {
 const end = endISO || todayISO(), from = addDays(end, -span);
 const rows = [];
 if (bucket === "session") {
  workoutList().filter(w => w.done && w.d > from && w.d <= end).sort((a, b) => a.d < b.d ? -1 : 1).forEach(w => {
   const by = new Map;
   (w.sets || []).forEach(s => {
    const ex = exById(s.exId);
    if (!ex) return;
    const hit = exParts(ex).find(x => x.k === partK);
    if (!hit) return;
    const cur = by.get(ex.id) || {
     exId: ex.id,
     name: ex.name,
     eff: 0,
     sets: 0,
     share: hit.share
    };
    cur.eff += setScore(s) * hit.share;
    cur.sets++;
    by.set(ex.id, cur);
   });
   if (by.size) rows.push({
    key: w.id,
    d: w.d,
    label: fmtDate(w.d),
    sub: w.name || "Session",
    items: [ ...by.values() ]
   });
  });
  return rows;
 }
 let wkStart = weekStart(end);
 const starts = [];
 while (wkStart > from) {
  starts.unshift(wkStart);
  wkStart = addDays(wkStart, -7);
 }
 const weekOf = new Map;
 starts.forEach(ws => weekOf.set(ws, new Map));
 WORKOUTS.forEach(w => {
  if (!w.done) return;
  const by = weekOf.get(weekStart(w.d));
  if (!by) return;
  (w.sets || []).forEach(s => {
   const ex = exById(s.exId);
   if (!ex) return;
   const hit = exParts(ex).find(x => x.k === partK);
   if (!hit) return;
   const cur = by.get(ex.id) || {
    exId: ex.id,
    name: ex.name,
    eff: 0,
    sets: 0,
    share: hit.share,
    bySess: new Map
   };
   const add = setScore(s) * hit.share;
   cur.eff += add;
   cur.sets++;
   cur.bySess.set(w.id, (cur.bySess.get(w.id) || 0) + add);
   by.set(ex.id, cur);
  });
 });
 starts.forEach(ws => {
  const by = weekOf.get(ws);
  if (by.size) rows.push({
   key: ws,
   d: ws,
   label: fmtDate(ws),
   sub: "week of " + fmtDate(ws),
   items: [ ...by.values() ].map(it => ({
    ...it,
    segs: [ ...it.bySess.values() ]
   }))
  });
 });
 return rows;
}

function effStack(rows, opts) {
 const o = opts || {};
 const W = 340, PL = 30, PR = 6, PT = 8, PB = 16;
 const H1 = 168, H = PT + H1 + PB, IW = W - PL - PR;
 if (!rows.length) return el("div", {
  class: "empty",
  text: "Nothing logged for that yet."
 });
 const pan = o.pan;
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: "100%",
  preserveAspectRatio: "none",
  role: "img",
  style: "height:" + H + "px"
 });
 const tot = r => r.items.reduce((s, i) => s + i.eff, 0);
 const hi = Math.max(1, o.band ? o.band.to : 0, ...rows.map(tot)) * 1.1;
 const y = v => PT + H1 - v / hi * H1;
 const n = rows.length;
 const slot = IW / n, bw = Math.max(2, Math.min(26, slot * .72));
 if (o.band) {
  const defs = svgEl("defs", {});
  const pat = svgEl("pattern", {
   id: "effband",
   width: 6,
   height: 6,
   patternUnits: "userSpaceOnUse",
   patternTransform: "rotate(45)"
  });
  pat.appendChild(svgEl("line", {
   x1: 0,
   y1: 0,
   x2: 0,
   y2: 6,
   stroke: "var(--ink3)",
   "stroke-width": 1,
   opacity: .38
  }));
  defs.appendChild(pat);
  svg.appendChild(defs);
  svg.appendChild(svgEl("rect", {
   x: PL,
   y: y(o.band.to),
   width: IW,
   height: Math.max(0, y(o.band.from) - y(o.band.to)),
   fill: "url(#effband)"
  }));
 }
 innerTicks(0, hi, 4).forEach(t => {
  svg.appendChild(svgEl("line", {
   class: "gl",
   x1: PL,
   x2: W - PR,
   y1: y(t),
   y2: y(t)
  }));
  const lb = svgEl("text", {
   class: "ax",
   x: PL - 4,
   y: y(t) + 3.5,
   "text-anchor": "end"
  });
  lb.textContent = metric().band ? r0(t) : metric().fmt(t);
  svg.appendChild(lb);
 });
 rows.forEach((r, i) => {
  const cx = PL + slot * i + slot / 2;
  let acc = 0;
  const bands = [];
  r.items.forEach(it => {
   const h = Math.max(.6, it.eff / hi * H1);
   const yy = y(acc + it.eff);
   const on = o.pick && o.pick.exId === it.exId && o.pick.key === r.key;
   svg.appendChild(svgEl("rect", {
    x: cx - bw / 2,
    y: yy,
    width: bw,
    height: h,
    fill: o.colorOf(it.exId),
    opacity: o.pick && !on ? .45 : 1
   }));
   if (it.segs && it.segs.length > 1 && h > 3) {
    let sub = 0;
    it.segs.slice(0, -1).forEach(v => {
     sub += v;
     const ly = y(acc + sub);
     if (ly > yy + 1.2 && ly < yy + h - 1.2) svg.appendChild(svgEl("line", {
      x1: cx - bw / 2,
      x2: cx + bw / 2,
      y1: ly,
      y2: ly,
      stroke: "var(--panel)",
      "stroke-width": 1,
      opacity: o.pick && !on ? .45 : .9
     }));
    });
   }
   bands.push({
    exId: it.exId,
    top: yy,
    bot: yy + h
   });
   acc += it.eff;
  });
  const hitr = svgEl("rect", {
   x: cx - slot / 2,
   y: PT,
   width: slot,
   height: H1,
   fill: "transparent"
  });
  hitr.style.cursor = "pointer";
  hitr.addEventListener("click", e => {
   if (pan && pan.panned) return;
   let yv = null;
   try {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    yv = pt.matrixTransform(svg.getScreenCTM().inverse()).y;
   } catch (err) {}
   if (yv === null) return;
   let hit = bands.find(b => yv >= b.top && yv <= b.bot);
   if (!hit) hit = bands.reduce((best, b) => {
    const d = Math.min(Math.abs(yv - b.top), Math.abs(yv - b.bot));
    return !best || d < best.d ? {
     b: b,
     d: d
    } : best;
   }, null).b;
   const same = o.pick && o.pick.key === r.key && o.pick.exId === hit.exId;
   o.onPick(same ? null : {
    key: r.key,
    exId: hit.exId
   });
  });
  svg.appendChild(hitr);
 });
 const every = Math.max(1, Math.ceil(n / 5));
 rows.forEach((r, i) => {
  if (i % every) return;
  const t = svgEl("text", {
   class: "ax",
   x: PL + slot * i + slot / 2,
   y: H - 3,
   "text-anchor": "middle"
  });
  t.textContent = r.label;
  svg.appendChild(t);
 });
 return el("div", {
  class: "chart"
 }, [ svg ]);
}

let HUBPARTS = null;

function hubParts() {
 if (HUBPARTS) return HUBPARTS;
 const used = new Set;
 WORKOUTS.forEach(w => (w.sets || []).forEach(s => {
  const ex = exById(s.exId);
  if (ex) used.add(ex.part);
 }));
 HUBPARTS = new Set(used.size ? used : PARTS.slice(0, 4).map(p => p.k));
 return HUBPARTS;
}

function partSeries(span, endISO) {
 const end = endISO || todayISO();
 const win = span <= 90 ? 7 : span <= 200 ? 14 : 28;
 const step = Math.max(2, Math.round(win / 3));
 const rate = 7 / win;
 const ends = [];
 for (let i = Math.floor(span / step); i >= 0; i--) ends.push(addDays(end, -step * i));
 const first = addDays(end, -(span + win));
 const byDay = new Map;
 WORKOUTS.forEach(w => {
  if (w.d > end || w.d <= first) return;
  (w.sets || []).forEach(s => {
   const ex = exById(s.exId);
   if (!ex) return;
   const e = setScore(s);
   let day = byDay.get(w.d);
   if (!day) byDay.set(w.d, day = new Map);
   exParts(ex).forEach(({k: k, share: share}) => {
    let c = day.get(k);
    if (!c) day.set(k, c = {
     eff: 0,
     top: 0,
     hits: 0
    });
    c.hits++;
    c.eff += e * share;
    if (share >= 1) c.top = Math.max(c.top, s.w || 0);
   });
  });
 });
 const out = {};
 PARTS.forEach(p => {
  out[p.k] = [];
 });
 ends.forEach(iso => {
  const acc = new Map;
  for (let k = 0; k < win; k++) {
   const day = byDay.get(k === 0 ? iso : addDays(iso, -k));
   if (!day) continue;
   day.forEach((c, part) => {
    let a = acc.get(part);
    if (!a) acc.set(part, a = {
     eff: 0,
     top: 0,
     hits: 0
    });
    a.eff += c.eff;
    a.hits += c.hits;
    if (c.top > a.top) a.top = c.top;
   });
  }
  PARTS.forEach(p => {
   const a = acc.get(p.k);
   out[p.k].push(a && a.hits ? {
    d: iso,
    eff: r1(a.eff * rate),
    top: a.top || null
   } : {
    d: iso,
    eff: null,
    top: null
   });
  });
 });
 return {
  ends: ends,
  out: out
 };
}

function multiLine(series, width, height, fmt, band) {
 const W = Math.max(280, width), PL = 42, PR = 8, PT = 10, PB = 18;
 const H1 = height || 170, H = PT + H1 + PB, IW = W - PL - PR;
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: "100%",
  preserveAspectRatio: "none",
  role: "img",
  style: "height:" + H + "px"
 });
 const n = series.length ? series[0].vals.length : 0;
 if (!n) return el("div", {
  class: "empty",
  text: "Nothing logged yet."
 });
 const x = i => PL + (n <= 1 ? IW / 2 : i / (n - 1) * IW);
 const real = series.flatMap(s => s.vals).filter(v => v !== null && v !== undefined);
 const hi = Math.max(1, band ? band.to : 0, ...real) * 1.12;
 const y = v => PT + H1 - v / hi * H1;
 if (band) {
  const pid = "wkband";
  const defs = svgEl("defs", {});
  const pat = svgEl("pattern", {
   id: pid,
   width: 6,
   height: 6,
   patternUnits: "userSpaceOnUse",
   patternTransform: "rotate(45)"
  });
  pat.appendChild(svgEl("line", {
   x1: 0,
   y1: 0,
   x2: 0,
   y2: 6,
   stroke: "var(--ink3)",
   "stroke-width": 1,
   opacity: .38
  }));
  defs.appendChild(pat);
  svg.appendChild(defs);
  svg.appendChild(svgEl("rect", {
   x: PL,
   y: y(band.to),
   width: IW,
   height: Math.max(0, y(band.from) - y(band.to)),
   fill: `url(#${pid})`
  }));
 }
 innerTicks(0, hi, 4).forEach(t => {
  svg.appendChild(svgEl("line", {
   class: "gl",
   x1: PL,
   x2: W - PR,
   y1: y(t),
   y2: y(t)
  }));
  const lb = svgEl("text", {
   class: "ax",
   x: PL - 5,
   y: y(t) + 3.5,
   "text-anchor": "end"
  });
  lb.textContent = fmt ? fmt(t) : r0(t);
  svg.appendChild(lb);
 });
 series.forEach(s => {
  let d = "", open = false;
  s.vals.forEach((v, i) => {
   if (v === null || v === undefined) {
    open = false;
    return;
   }
   d += (open ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1);
   open = true;
  });
  if (d) svg.appendChild(svgEl("path", {
   d: d,
   fill: "none",
   stroke: s.css,
   "stroke-width": 2,
   "stroke-linejoin": "round",
   "stroke-linecap": "round"
  }));
  s.vals.forEach((v, i) => {
   if (v === null || v === undefined) return;
   svg.appendChild(svgEl("circle", {
    cx: x(i),
    cy: y(v),
    r: 2.4,
    fill: s.css
   }));
  });
 });
 const step = Math.max(1, Math.ceil(n / 5));
 for (let i = 0; i < n; i += step) {
  const t = svgEl("text", {
   class: "ax",
   x: x(i),
   y: H - 3,
   "text-anchor": i === 0 ? "start" : "middle"
  });
  t.textContent = fmtDate(series[0].days[i]);
  svg.appendChild(t);
 }
 return el("div", {
  class: "chart"
 }, [ svg ]);
}

function streamRow(it) {
 if (it.kind === "lift") {
  const t = workoutTotals(it.w);
  return row({
   mark: workoutMark(it.w, 14),
   t1: it.w.name,
   t2: `${fmtDate(it.d, true)} · ${t.sets} sets · ` + Object.keys(t.byPart).map(partName).slice(0, 3).join(", "),
   val: fmtMetric(t.eff),
   go: true,
   onclick: () => {
    REPORT = it.w.id;
    go("wreport");
   }
  });
 }
 const m = rideMetrics(it.r);
 return row({
  mark: rideMark(14, it.r.presetId ? PRESETS.get(it.r.presetId) : null),
  t1: it.r.name || cardioMod(modOf(it.r)).name,
  t2: [ fmtDate(it.d, true), secsToHM(it.r.secs), it.r.avgW > 0 ? it.r.avgW + " W" : null, it.r.dist > 0 ? fmtD(it.r.dist) + " " + distUnit() : null, m.TSS && it.r.avgW > 0 ? r0(m.TSS) + " TSS" : null ].filter(Boolean).join(" · "),
  val: fmtEU(it.r.kcal || 0),
  go: true,
  onclick: () => openRide(it.r)
 });
}

function streamItems() {
 const items = [];
 workoutList().filter(w => w.done).forEach(w => items.push({
  kind: "lift",
  d: w.d,
  t: w.t || "",
  w: w
 }));
 [ ...RIDES.values() ].forEach(r => items.push({
  kind: "ride",
  d: r.d,
  t: r.t || "",
  r: r
 }));
 return items.sort((a, b) => a.d + a.t < b.d + b.t ? 1 : -1);
}

const STREAM_PAGE = 40;

let STREAMN = STREAM_PAGE;

VIEWS.wstream = function viewWStream() {
 const root = $("#p-wstream");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 const items = streamItems();
 const box = el("div", {
  class: "box" + (items.length ? " rows" : "")
 });
 if (!items.length) box.appendChild(emptyAdd("Start a workout", openAddWorkout));
 const shown = Math.min(STREAMN, items.length);
 let month = "";
 items.slice(0, shown).forEach(it => {
  const m = it.d.slice(0, 7);
  if (m !== month) {
   month = m;
   box.appendChild(el("div", {
    class: "grouphd",
    text: parseISO(it.d).toLocaleDateString(undefined, {
     month: "long",
     year: "numeric"
    })
   }));
  }
  box.appendChild(streamRow(it));
 });
 root.appendChild(el("div", {
  class: "sec"
 }, [ box ]));
 if (shown < items.length) {
  root.appendChild(el("div", {
   class: "sec"
  }, [ el("button", {
   class: "btn wide",
   type: "button",
   text: `Show ${Math.min(STREAM_PAGE, items.length - shown)} more · ${items.length - shown} older`,
   onclick: () => {
    STREAMN += STREAM_PAGE;
    render();
   }
  }) ]));
 }
};

VIEWS.workouts = function viewWorkouts() {
 const root = $("#p-workouts");
 root.innerHTML = "";
 const live = workoutList().find(w => !w.done);
 if (live) {
  const lt = workoutTotals(live);
  const liveRow = el("button", {
   class: "box pad bar wide",
   type: "button",
   onclick: () => {
    SESSION = live.id;
    go("session");
   }
  }, [ el("span", {
   class: "fixed"
  }, [ progSquare(lt.wantSets ? lt.sets / lt.wantSets : 0, 54) ]), el("span", {
   class: "grow"
  }, [ el("span", {
   class: "hd block",
   text: live.name + " — in progress"
  }), el("span", {
   class: "small muted block",
   text: `${lt.sets} of ${lt.wantSets} sets · ${fmtMetric(lt.eff)}`
  }) ]), chevron() ]);
  root.appendChild(el("div", {
   class: "sec"
  }, [ swipeRow(liveRow, {
   left: [ {
    label: "Discard",
    css: "var(--danger)",
    fg: "var(--on-danger)",
    fn: () => {
     const gone = thaw(live);
     if (SESSION === live.id) SESSION = null;
     delWorkout(live.id);
     toastUndo("Workout discarded", () => saveWorkout(gone));
    }
   } ]
  }) ]));
 }
 {
  const today = todayISO();
  const due = tracks("strength") ? plansOn(today) : [], dueRides = tracks("cardio") ? presetsOn(today) : [];
  const hero = el("div", {
   class: "box hero-wk"
  });
  hero.appendChild(el("div", {
   class: "pad bar"
  }, [ el("span", {
   class: "grow hd",
   text: DOW_NAME[dowOf(today)]
  }), el("span", {
   class: "small muted mono",
   text: fmtDate(today)
  }) ]));
  const box = el("div", {
   class: "rows"
  });
  const dueRow = (mark, name, sub, done, open) => row({
   dim: !!done,
   onclick: open,
   mark: done ? el("span", {
    class: "cbx on",
    html: ICONS.tick
   }) : mark,
   t1: name,
   t2: sub,
   tail: [ el("span", {
    class: "chip" + (done ? "" : " on"),
    text: done ? "done" : "today"
   }) ]
  });
  const skippable = (node, k, id, done) => done ? node : swipeRow(node, {
   left: [ {
    label: "Skip today",
    css: "var(--ink2)",
    fg: "var(--bg)",
    fn: () => {
     snooze(today, k, id, true);
     toast("Skipped for today");
    }
   } ]
  });
  due.forEach(p => {
   const done = sessionFor(p.id, today);
   const t = done ? workoutTotals(done) : null;
   box.appendChild(skippable(dueRow(planMark(planStyle(p), 15), p.name, done ? `${t.sets} sets · ${fmtMetric(t.eff)}` : `${p.items.length} exercises · ${p.items.reduce((a, i) => a + (i.sets || 3), 0)} sets`, done, () => done ? (REPORT = done.id, 
   go("wreport")) : startWorkout(p)), "plan", p.id, done));
  });
  dueRides.forEach(p => {
   const done = rideFor(p.id, today);
   box.appendChild(skippable(dueRow(rideMark(15, p), p.name || secsToHM(p.secs), done ? `${secsToHM(done.secs)} · ${fmtEU(done.kcal || 0)}` : presetLabel(p), done, () => openRide(done || null, done ? null : p)), "ride", p.id, done));
  });
  if (box.children.length) hero.appendChild(box);
  hero.appendChild(el("div", {
   class: "pad"
  }, [ weekOverview() ]));
  root.appendChild(el("div", {
   class: "sec"
  }, [ hero, el("button", {
   class: "btn pri wide mt",
   type: "button",
   onclick: openAddWorkout
  }, [ icon("add"), el("span", {
   text: "Start a workout"
  }) ]), Object.keys(S.snooze).some(x => x >= today) ? el("button", {
   class: "btn sm wide mt",
   type: "button",
   text: "Undo today's skips",
   onclick: () => {
    delete S.snooze[today];
    saveSettings();
    toast("Back on");
   }
  }) : null ].filter(Boolean)));
 }
 const items = streamItems();
 const stream = el("div", {
  class: "box" + (items.length ? " rows" : "")
 });
 items.slice(0, 8).forEach(it => stream.appendChild(streamRow(it)));
 const L = sections(root, "workouts");
 L.add("recent", "Recent", items.length && sec("Recent", null, [ stream, items.length > 8 ? el("button", {
  class: "btn wide mt",
  type: "button",
  text: `All ${items.length}`,
  onclick: () => {
   STREAMN = STREAM_PAGE;
   go("wstream");
  }
 }) : null ].filter(Boolean)));
 const oldest = firstTrainingISO();
 const maxOff = span => oldest ? Math.max(0, daysBetween(oldest, todayISO()) - Math.round(span / 3)) : 0;
 const endFor = off => addDays(todayISO(), -off);
 const seenParts = new Set;
 WORKOUTS.forEach(w => (w.sets || []).forEach(s => {
  const ex = exById(s.exId);
  if (ex) exParts(ex).forEach(x => seenParts.add(x.k));
 }));
 const everTrained = PARTS.filter(p => seenParts.has(p.k));
 const SPANS = [ [ 28, "4w" ], [ 84, "12w" ], [ 182, "26w" ], [ 364, "1y" ] ];
 const rangeFoot = (span, off, reset, key, ctls) => el("div", {
  class: "small muted bar wrap mt"
 }, [ el("span", {
  class: "mono",
  text: fmtDate(addDays(endFor(off), -span)) + " – " + fmtDate(endFor(off))
 }), key || null, off > 0 ? el("button", {
  class: "btn sm",
  type: "button",
  text: "To now",
  onclick: reset
 }) : null, ctls && ctls.length ? el("span", {
  class: "bar ctls"
 }, ctls) : null ].filter(Boolean));
 if (everTrained.length) {
  if (!HUBPART || !everTrained.some(p => p.k === HUBPART)) HUBPART = everTrained[0].k;
  let rows = partStack(effSpan(), HUBPART, HUBBUCKET, endFor(EFFOFF));
  const order = [];
  rows.forEach(r => r.items.forEach(i => {
   if (!order.includes(i.exId)) order.push(i.exId);
  }));
  const colorOf = id => EX_COLORS[Math.max(0, order.indexOf(id)) % EX_COLORS.length];
  const host = el("div", {
   class: "box pad"
  });
  const effPan = panDrag(host, {
   get: () => EFFOFF,
   set: (from, frac) => {
    EFFOFF = clamp(Math.round(from + frac * effSpan()), 0, maxOff(effSpan()));
   },
   draw: () => {
    rows = partStack(effSpan(), HUBPART, HUBBUCKET, endFor(EFFOFF));
    HUBPICK = null;
    paint();
   },
   end: () => render()
  });
  pinchSpan(host, {
   min: 14,
   max: 730,
   get: () => effSpan(),
   set: v => {
    ZSPAN.eff = v;
    EFFOFF = clamp(EFFOFF, 0, maxOff(v));
   },
   draw: () => {
    rows = partStack(effSpan(), HUBPART, HUBBUCKET, endFor(EFFOFF));
    HUBPICK = null;
    paint();
   },
   end: () => render()
  });
  const readout = el("div", {
   class: "small mt"
  });
  const paint = () => {
   host.innerHTML = "";
   host.appendChild(rows.length ? effStack(rows, {
    band: HUBBUCKET === "week" && metric().band ? {
     from: effTarget()[0],
     to: effTarget()[1]
    } : null,
    colorOf: colorOf,
    pick: HUBPICK,
    pan: effPan,
    onPick: p => {
     HUBPICK = p;
     paint();
     if (p) chartFocus(host, () => {
      HUBPICK = null;
      paint();
     }); else if (CHARTFOCUS && CHARTFOCUS.host === host) CHARTFOCUS = null;
    }
   }) : el("div", {
    class: "empty",
    text: "Nothing logged in that window."
   }));
   readout.innerHTML = "";
   const row = HUBPICK && rows.find(r => r.key === HUBPICK.key);
   const it = row && row.items.find(i => i.exId === HUBPICK.exId);
   if (it) {
    const total = row.items.reduce((s, x) => s + x.eff, 0);
    readout.appendChild(el("div", {
     class: "bar liftline"
    }, [ el("span", {
     class: "sw",
     style: "--c:" + colorOf(it.exId)
    }), el("span", {
     class: "hd",
     text: it.name
    }) ]));
    readout.appendChild(kv(metric().name, metric().fmt(it.eff)));
    readout.appendChild(kv("Sets", String(it.sets)));
    readout.appendChild(kv("Credit", Math.round(it.share * 100) + "%"));
    readout.appendChild(kv(partName(HUBPART) + " total", metric().fmt(total)));
    readout.appendChild(kv(HUBBUCKET === "week" ? "Week of" : "Session", row.label));
   }
   readout.style.display = HUBPICK ? "" : "none";
   host.appendChild(readout);
  };
  paint();
  L.add("metric", metric().name, sec(metric().name, null, [ host, el("div", {
   class: "mt"
  }, [ chipRow(everTrained.map(p => [ p.k, p.name ]), k => HUBPART === k, k => {
   HUBPART = k;
   HUBPICK = null;
   render();
  }, {
   one: true
  }) ]), rangeFoot(effSpan(), EFFOFF, () => {
   EFFOFF = 0;
   HUBPICK = null;
   render();
  }, HUBBUCKET === "week" && metric().band ? el("span", {
   class: "bar key"
  }, [ el("span", {
   class: "sw hatch"
  }), el("span", {
   text: `${effTarget()[0]}–${effTarget()[1]} a week`
  }) ]) : null, [ ctlSelect([ [ "week", "Weeks" ], [ "session", "Sessions" ] ], HUBBUCKET, v => {
   HUBBUCKET = v;
   HUBPICK = null;
   render();
  }, "Bucket"), ctlSelect(SPANS, effSpan(), v => {
   S.spans.eff = +v;
   delete ZSPAN.eff;
   EFFOFF = 0;
   saveSettings();
   HUBPICK = null;
   render();
  }, "Span") ]) ].filter(Boolean)));
 }
 if (everTrained.length) {
  const on = hubParts();
  const topHost = el("div", {
   class: "box pad"
  });
  panDrag(topHost, {
   get: () => TOPOFF,
   set: (from, frac) => {
    TOPOFF = clamp(Math.round(from + frac * topSpan()), 0, maxOff(topSpan()));
   },
   draw: () => drawTop(),
   end: () => render()
  });
  pinchSpan(topHost, {
   min: 14,
   max: 730,
   get: () => topSpan(),
   set: v => {
    ZSPAN.top = v;
    TOPOFF = clamp(TOPOFF, 0, maxOff(v));
   },
   draw: () => drawTop(),
   end: () => render()
  });
  const drawTop = () => {
   const o = partSeries(topSpan(), endFor(TOPOFF)).out;
   const series = everTrained.filter(p => on.has(p.k)).map(p => ({
    css: PART_COLOR[p.k],
    days: o[p.k].map(v => v.d),
    vals: o[p.k].map(v => v.top)
   })).filter(x => x.vals.some(v => v !== null));
   topHost.innerHTML = "";
   topHost.appendChild(series.length ? multiLine(series, 340, 150) : el("div", {
    class: "empty",
    text: "Nothing to draw for those."
   }));
  };
  drawTop();
  L.add("load", "Weight on the bar", sec("Weight on the bar", null, [ topHost, el("div", {
   class: "mt"
  }, [ chipRow(everTrained.map(p => [ p.k, p.name, PART_COLOR[p.k] ]), k => on.has(k), k => {
   on.has(k) ? on.delete(k) : on.add(k);
   render();
  }, {
   line: true
  }) ]), rangeFoot(topSpan(), TOPOFF, () => {
   TOPOFF = 0;
   render();
  }, null, [ ctlSelect(SPANS, topSpan(), v => {
   S.spans.top = +v;
   delete ZSPAN.top;
   TOPOFF = 0;
   saveSettings();
   render();
  }, "Span") ]) ].filter(Boolean)));
 }
 if (tracks("cardio") && RIDES.size) {
  const today = todayISO();
  const wk = [ ...RIDES.values() ].filter(r => {
   const k = daysBetween(r.d, today);
   return k >= 0 && k < 7;
  });
  const secs = wk.reduce((s, r) => s + (r.secs || 0), 0);
  const tss = wk.reduce((s, r) => s + (rideMetrics(r).TSS || 0), 0);
  const kcal = wk.reduce((s, r) => s + (r.kcal || 0), 0);
  L.add("cardio", cardioWords().noun, sec(cardioWords().noun, null, [ el("button", {
   class: "box pad tapbox",
   type: "button",
   "aria-label": cardioWords().noun,
   onclick: () => go("cardio")
  }, [ el("span", {
   class: "bar"
  }, [ el("span", {
   class: "big mono grow",
   text: (secs / 3600).toFixed(1) + " h"
  }), chevron() ]), el("span", {
   class: "small muted block",
   text: `${nCardio(wk.length)} since ${fmtDate(addDays(today, -6))}`
  }), el("hr", {
   class: "hr"
  }), kv("Burned", fmtEU(kcal)), powerOn() ? kv("TSS", tss ? r0(tss) : "—") : null, powerOn() ? kv("FTP", S.cardio.ftp ? S.cardio.ftp + " W" : "not set") : null ].filter(Boolean)) ]));
 }
 L.done();
};
