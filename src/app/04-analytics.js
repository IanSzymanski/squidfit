function weighIns() {
 return [ ...DAYS.values() ].filter(d => d.wKg > 0).map(d => ({
  d: d.d,
  w: d.wKg
 })).sort((a, b) => a.d < b.d ? -1 : 1);
}

function trailingMedian(iso, span, minN) {
 const n = span || 7;
 const vals = [];
 for (let k = 0; k < n; k++) {
  const d = DAYS.get(addDays(iso, -k));
  if (d && d.wKg > 0) vals.push(d.wKg);
 }
 if (vals.length < (minN || 1)) return null;
 return {
  med: centreOf(vals),
  n: vals.length
 };
}

function windowStats(iso) {
 const weights = [], kcals = [];
 let foodDays = 0, rideKcal = 0, rideSecs = 0, rides = 0;
 const macro = {
  p: 0,
  c: 0,
  f: 0
 };
 for (let k = 0; k < 7; k++) {
  const d = addDays(iso, -k), day = DAYS.get(d);
  if (day && day.wKg > 0) weights.push(day.wKg);
  if (day && day.entries && day.entries.length) {
   const t = totalsOf(day.entries);
   kcals.push(t.kcal);
   foodDays++;
   macro.p += t.p;
   macro.c += t.c;
   macro.f += t.f;
  }
 }
 [ ...RIDES.values() ].forEach(r => {
  const back = daysBetween(r.d, iso);
  if (back >= 0 && back < 7) {
   rideKcal += r.kcal || 0;
   rideSecs += r.secs || 0;
   rides++;
  }
 });
 return {
  end: iso,
  start: addDays(iso, -6),
  median: centreOf(weights),
  n: weights.length,
  meanKcal: kcals.length ? mean(kcals) : null,
  kcals: kcals,
  foodDays: foodDays,
  macroMean: foodDays ? {
   p: macro.p / foodDays,
   c: macro.c / foodDays,
   f: macro.f / foodDays
  } : null,
  rideKcal: rideKcal,
  rideSecs: rideSecs,
  rides: rides
 };
}

function windowTable(count, endISO) {
 const end = endISO || todayISO();
 const first = [ ...DAYS.keys() ].sort()[0];
 const max = first ? Math.ceil((daysBetween(first, end) + 1) / 7) : 1;
 const howMany = Math.min(count || max, Math.max(max, 1));
 const rows = [];
 for (let i = 0; i < howMany; i++) rows.push(windowStats(addDays(end, -7 * i)));
 rows.reverse();
 rows.forEach((r, i) => {
  const prev = rows[i - 1];
  r.change = r.median !== null && prev && prev.median !== null ? r.median - prev.median : null;
 });
 return rows;
}

function weeklyChange(endISO) {
 const end = endISO || todayISO();
 const cur = windowStats(end), prev = windowStats(addDays(end, -7));
 return {
  cur: cur,
  prev: prev,
  delta: cur.median !== null && prev.median !== null ? cur.median - prev.median : null,
  thin: cur.n > 0 && cur.n < 3
 };
}

function estimateTDEE(nWeeks, endISO) {
 const weeks = nWeeks || S.tdeeWeeks;
 const span = 7 * (weeks - 1);
 const today = endISO || todayISO();
 const out = {
  weeks: weeks,
  span: span,
  ok: false,
  why: "",
  tdee: null,
  deltaKg: null,
  meanIntake: null,
  logged: 0
 };
 const a = trailingMedian(addDays(today, -span), 7, 2);
 const b = trailingMedian(today, 7, 2);
 if (!a || !b) {
  out.why = "Needs at least two weigh-ins in each seven-day window.";
  return out;
 }
 let sum = 0, logged = 0, total = 0;
 for (let k = 0; k < span; k++) {
  const day = DAYS.get(addDays(today, -k));
  total++;
  if (day && day.entries && day.entries.length) {
   sum += totalsOf(day.entries).kcal;
   logged++;
  }
 }
 if (logged < Math.max(7, span * .4)) {
  out.why = `Needs more food logged — ${logged} of the last ${span} days so far.`;
  return out;
 }
 out.deltaKg = b.med - a.med;
 out.meanIntake = sum / logged;
 out.logged = logged;
 out.total = total;
 out.from = addDays(today, -span);
 out.to = today;
 out.tdee = out.meanIntake - out.deltaKg * KCAL_PER_KG / span;
 out.coverage = logged / total;
 out.ok = true;
 if (out.coverage < .7) out.why = `${logged} of ${total} days logged — treat this as rough.`;
 return out;
}

const KF = {
 qw: .0064,
 qe: 144,
 r: .2,
 rGate: 3.5,
 rFar: 10,
 qMiss: .0045,
 e0sd: 600
};

function tdeeFilter() {
 const K = KCAL_PER_KG;
 const keys = [ ...DAYS.keys() ].sort();
 const w0 = weighIns()[0];
 if (!keys.length || !w0) return [];
 const first = w0.d, last = todayISO();
 if (first > last) return [];
 let seedSum = 0, seedN = 0;
 for (let iso = first, k = 0; iso <= last && k < 14; iso = addDays(iso, 1), k++) {
  const d = DAYS.get(iso);
  if (d && d.entries && d.entries.length) {
   seedSum += totalsOf(d.entries).kcal;
   seedN++;
  }
 }
 const meanI = seedN ? seedSum / seedN : null;
 let W = w0.w, E = meanI !== null ? Math.max(1200, meanI) : w0.w * LB * 15;
 let p00 = .1, p01 = 0, p11 = KF.e0sd * KF.e0sd;
 const intakeOf = iso => {
  const d = DAYS.get(iso);
  return d && d.entries && d.entries.length ? totalsOf(d.entries).kcal : null;
 };
 const steps = [];
 let running = meanI !== null ? meanI : E;
 for (let iso = first; iso <= last; iso = addDays(iso, 1)) {
  let xp = [ W, E ], pp = [ p00, p01, p11 ];
  if (iso > first) {
   const prev = addDays(iso, -1);
   const known = intakeOf(prev);
   const I = known === null ? running : known;
   if (known !== null) running = running * .85 + known * .15;
   W = W + (I - E) / K;
   const qw = KF.qw + (known === null ? KF.qMiss : 0);
   const n00 = p00 - 2 * p01 / K + p11 / (K * K) + qw;
   const n01 = p01 - p11 / K;
   const n11 = p11 + KF.qe;
   p00 = n00;
   p01 = n01;
   p11 = n11;
   xp = [ W, E ];
   pp = [ p00, p01, p11 ];
  }
  const day = DAYS.get(iso);
  if (day && day.wKg > 0) {
   const y = day.wKg - W;
   const far = Math.abs(y) > KF.rGate * Math.sqrt(p00 + KF.r);
   const R = KF.r * (far ? KF.rFar : 1);
   const S = p00 + R;
   const k0 = p00 / S, k1 = p01 / S;
   W += k0 * y;
   E += k1 * y;
   const o00 = p00, o01 = p01;
   p00 = (1 - k0) * o00;
   p01 = (1 - k0) * o01;
   p11 = p11 - k1 * o01;
  }
  steps.push({
   d: iso,
   xf: [ W, E ],
   pf: [ p00, p01, p11 ],
   xp: xp,
   pp: pp
  });
 }
 const out = steps.map(s => ({
  d: s.d,
  w: s.xf[0],
  e: s.xf[1]
 }));
 for (let i = steps.length - 2; i >= 0; i--) {
  const s = steps[i], nx = steps[i + 1];
  const [a00, a01, a11] = s.pf;
  const [b00, b01, b11] = nx.pp;
  const det = b00 * b11 - b01 * b01;
  if (!isFinite(det) || Math.abs(det) < 1e-12) continue;
  const c00 = a00 - a01 / K, c01 = a01;
  const c10 = a01 - a11 / K, c11 = a11;
  const i00 = b11 / det, i01 = -b01 / det, i10 = -b01 / det, i11 = b00 / det;
  const g00 = c00 * i00 + c01 * i10, g01 = c00 * i01 + c01 * i11;
  const g10 = c10 * i00 + c11 * i10, g11 = c10 * i01 + c11 * i11;
  const dw = out[i + 1].w - nx.xp[0], de = out[i + 1].e - nx.xp[1];
  out[i].w = s.xf[0] + g00 * dw + g01 * de;
  out[i].e = s.xf[1] + g10 * dw + g11 * de;
 }
 return out;
}

function rideKcalPerDay(days) {
 const today = todayISO();
 let s = 0;
 [ ...RIDES.values() ].forEach(r => {
  const k = daysBetween(r.d, today);
  if (k >= 0 && k < days) s += r.kcal || 0;
 });
 return s / days;
}

function poolSpread(vals) {
 const days = poolDays();
 const n = vals.length, out = vals.map(() => 0);
 vals.forEach((v, i) => {
  if (!v) return;
  const spread = Math.min(n - 1 - i, days - 1) + 1;
  for (let k = 0; k < spread && i + k < n; k++) out[i + k] += v / spread;
 });
 return out;
}

function rideKcalOn(iso) {
 let t = 0;
 RIDES.forEach(r => {
  if (r.d === iso) t += r.kcal || 0;
 });
 return t;
}

function ridePoolDays(days) {
 const today = todayISO(), isos = [];
 for (let k = days - 1; k >= 0; k--) isos.push(addDays(today, -k));
 return {
  isos: isos,
  pool: poolSpread(isos.map(rideKcalOn))
 };
}

const hasWeight = d => !!(d && d.wKg > 0);

const hasFood = d => !!(d && d.entries && d.entries.length);

const everWeighed = () => {
 for (const d of DAYS.values()) if (hasWeight(d)) return true;
 return false;
};

const everAte = () => {
 for (const d of DAYS.values()) if (hasFood(d)) return true;
 return false;
};

const everRode = mod => {
 for (const r of RIDES.values()) if (!mod || modOf(r) === mod) return true;
 return false;
};

function coverage(pred, n) {
 const days = n || 7, today = todayISO();
 let hit = 0;
 for (let k = 0; k < days; k++) if (pred(DAYS.get(addDays(today, -k)))) hit++;
 let anchor = today;
 if (!pred(DAYS.get(today))) {
  anchor = addDays(today, -1);
  if (!pred(DAYS.get(anchor))) anchor = null;
 }
 let run = 0;
 if (anchor) {
  let c = anchor;
  while (pred(DAYS.get(c))) {
   run++;
   c = addDays(c, -1);
  }
 }
 const isos = [ ...DAYS.keys() ].filter(k => pred(DAYS.get(k))).sort();
 let best = 0, r = 0, prev = null;
 isos.forEach(iso => {
  r = prev && daysBetween(prev, iso) === 1 ? r + 1 : 1;
  best = Math.max(best, r);
  prev = iso;
 });
 return {
  hit: hit,
  of: days,
  run: run,
  best: best,
  total: isos.length
 };
}

function rideEnergy(secs, avgW) {
 const kj = (avgW || 0) * (secs || 0) / 1e3;
 return {
  kj: kj,
  kcal: kj
 };
}

const modOf = r => r && CARDIO_MODS.some(m => m.k === r.mod) ? r.mod : "ride";

const modSet = k => S.cardio && S.cardio.mods && S.cardio.mods[k] || {
 on: true,
 metrics: [],
 met: cardioMod(k).met
};

const modTracks = (k, metric) => metric === "time" || modSet(k).metrics.includes(metric);

const modsOn = () => CARDIO_MODS.filter(m => modSet(m.k).on);

const defaultMod = () => {
 const k = S.cardio && S.cardio.defaultModality;
 return modsOn().some(m => m.k === k) ? k : (modsOn()[0] || CARDIO_MODS[0]).k;
};

const CARDIO_WORDS = {
 ride: [ "Riding", "ride", "rides", "Ride", "Days ridden", "Ridden", "ridden" ],
 run: [ "Running", "run", "runs", "Run", "Days run", "Ran", "run" ],
 row: [ "Rowing", "row", "rows", "Row", "Days rowed", "Rowed", "rowed" ],
 swim: [ "Swimming", "swim", "swims", "Swim", "Days swum", "Swum", "swum" ],
 walk: [ "Walking", "walk", "walks", "Walk", "Days walked", "Walked", "walked" ],
 any: [ "Cardio", "session", "sessions", "Cardio", "Days with cardio", "Cardio", "cardio" ]
};

const cardioShown = () => tracks("cardio") || RIDES.size > 0;

function cardioWords(k) {
 const on = k ? [ k ] : modsOn().map(m => m.k);
 const w = CARDIO_WORDS[on.length === 1 && CARDIO_WORDS[on[0]] ? on[0] : "any"];
 return {
  noun: w[0],
  one: w[1],
  many: w[2],
  short: w[3],
  days: w[4],
  past: w[5],
  did: w[6]
 };
}

const nCardio = (n, k) => n + " " + (n === 1 ? cardioWords(k).one : cardioWords(k).many);

const powerOn = () => modsOn().some(m => modTracks(m.k, "watts"));

const MOD_SHAPE = {
 ride: "circle",
 run: "triangle",
 row: "diamond",
 swim: "hex",
 walk: "square",
 other: "ring"
};

function migrateRide(r) {
 if (!r || r.mod && r.kSrc !== undefined) return r;
 return {
  ...r,
  mod: modOf(r),
  kSrc: r.kSrc !== undefined ? r.kSrc : r.avgW > 0 ? "watts" : null
 };
}

function kgNear(iso) {
 let best = null, gap = Infinity;
 DAYS.forEach(d => {
  if (!(d.wKg > 0)) return;
  const g = Math.abs(daysBetween(d.d, iso));
  if (g < gap || g === gap && d.d < best.d) {
   best = d;
   gap = g;
  }
 });
 return best ? best.wKg : null;
}

function lastMet(k) {
 let best = null;
 RIDES.forEach(r => {
  if (modOf(r) === k && r.met > 0 && (!best || r.d + (r.t || "") > best.d + (best.t || ""))) best = r;
 });
 return best ? best.met : modSet(k).met || cardioMod(k).met;
}

function cardioEnergy(x) {
 const k = modOf(x), secs = +x.secs || 0;
 if (modTracks(k, "watts") && x.avgW > 0) {
  const e = rideEnergy(secs, x.avgW);
  return {
   ...e,
   src: "watts"
  };
 }
 if (modTracks(k, "met") && x.met > 0) {
  const kg = kgNear(x.d || todayISO());
  if (kg) return {
   kj: null,
   kcal: x.met * kg * secs / 3600,
   src: "met"
  };
 }
 return {
  kj: null,
  kcal: 0,
  src: null
 };
}

function wattBand() {
 const lo = +S.cardio.wLo, hi = +S.cardio.wHi;
 if (lo > 0 && hi > lo) return [ lo, hi ];
 const ws = [ ...RIDES.values() ].map(r => +r.avgW).filter(w => w > 0);
 if (!ws.length) return [ 100, 300 ];
 const a = Math.floor(Math.min(...ws) * .85 / 10) * 10, b = Math.ceil(Math.max(...ws) * 1.1 / 10) * 10;
 return [ Math.max(0, a), Math.max(b, a + 40) ];
}

function rideMetrics(r) {
 const ftp = S.cardio.ftp || 0;
 const np = r.npW || r.avgW || 0;
 const hrs = (r.secs || 0) / 3600;
 const IF = ftp ? np / ftp : null;
 const TSS = ftp && r.secs ? r.secs * np * (np / ftp) / (ftp * 3600) * 100 : null;
 return {
  hrs: hrs,
  IF: IF,
  TSS: TSS,
  np: np
 };
}

function signedW(kg) {
 return signed(kgToDisp(kg), 1);
}

function secsToHM(s) {
 const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60);
 return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function firstRecorded() {
 const ds = [ ...DAYS.keys() ].sort();
 return ds.length ? ds[0] : todayISO();
}

function weightSeries(scale) {
 const today = todayISO(), first = firstRecorded();
 const out = [];
 if (scale === "week") {
  const back = Math.ceil((daysBetween(first, today) + 1) / 7);
  for (let i = back - 1; i >= 0; i--) {
   const end = addDays(today, -7 * i), vals = [];
   for (let k = 0; k < 7; k++) {
    const d = DAYS.get(addDays(end, -k));
    if (d && d.wKg > 0) vals.push(d.wKg);
   }
   const m = vals.length ? centreOf(vals) : null;
   out.push({
    key: end,
    label: fmtDate(end),
    w: m,
    med: m,
    n: vals.length
   });
  }
 } else if (scale === "month") {
  let y = parseISO(first).getFullYear(), mo = parseISO(first).getMonth();
  const endY = parseISO(today).getFullYear(), endM = parseISO(today).getMonth();
  while (y < endY || y === endY && mo <= endM) {
   const pre = `${y}-${String(mo + 1).padStart(2, "0")}`;
   const vals = [];
   DAYS.forEach(d => {
    if (d.wKg > 0 && d.d.startsWith(pre)) vals.push(d.wKg);
   });
   const m = vals.length ? centreOf(vals) : null;
   out.push({
    key: pre + "-01",
    label: new Date(y, mo, 1).toLocaleDateString(undefined, {
     month: "short"
    }) + (mo === 0 ? " " + String(y).slice(2) : ""),
    w: m,
    med: m,
    n: vals.length
   });
   mo++;
   if (mo > 11) {
    mo = 0;
    y++;
   }
  }
 } else {
  const win = [];
  for (let iso = first; iso <= today; iso = addDays(iso, 1)) {
   const day = DAYS.get(iso);
   const w = day && day.wKg > 0 ? day.wKg : null;
   win.push(w);
   if (win.length > 7) win.shift();
   const vals = [];
   for (let i = 0; i < win.length; i++) if (win[i] !== null) vals.push(win[i]);
   out.push({
    key: iso,
    label: fmtDate(iso),
    w: w,
    med: vals.length >= 2 ? centreOf(vals) : null,
    n: w !== null ? 1 : 0
   });
  }
 }
 return out;
}

const SCALE_LABEL = {
 day: "Days",
 week: "Weeks",
 month: "Months"
};

const SPAN_OPTS = {
 day: [ [ 7, "7d" ], [ 30, "30d" ], [ 90, "90d" ], [ 9999, "All" ] ],
 week: [ [ 8, "8w" ], [ 13, "13w" ], [ 26, "26w" ], [ 52, "52w" ], [ 9999, "All" ] ],
 month: [ [ 6, "6m" ], [ 12, "12m" ], [ 24, "24m" ], [ 9999, "All" ] ]
};

function energySeries(count, weeks) {
 const end = todayISO(), out = [];
 const kf = new Map;
 tdeeFilter().forEach(s => kf.set(s.d, s.e));
 for (let k = count - 1; k >= 0; k--) {
  const iso = addDays(end, -k), day = DAYS.get(iso);
  const e = estimateTDEE(weeks, iso);
  const a = kf.has(iso) ? kf.get(iso) : null;
  out.push({
   d: iso,
   intake: day && day.entries && day.entries.length ? totalsOf(day.entries).kcal : 0,
   tdee: e.ok ? e.tdee : null,
   kf: a !== null && isFinite(a) && a > 0 ? a : null,
   mf: day && day.mfE > 0 ? day.mfE : null,
   ride: [ ...RIDES.values() ].reduce((s, r) => s + (r.d === iso ? r.kcal || 0 : 0), 0)
  });
 }
 return out;
}

function chartDays(range) {
 const anyDates = [ ...DAYS.keys() ].sort();
 if (!anyDates.length) return [];
 const last = todayISO();
 const first = range >= 9999 ? anyDates[0] : addDays(last, -(range - 1));
 const start = first < anyDates[0] ? anyDates[0] : first;
 const out = [];
 for (let iso = start; iso <= last; iso = addDays(iso, 1)) {
  const day = DAYS.get(iso);
  const tm = trailingMedian(iso, 7, 2);
  out.push({
   d: iso,
   w: day && day.wKg > 0 ? day.wKg : null,
   med: tm ? tm.med : null,
   kcal: day && day.entries && day.entries.length ? totalsOf(day.entries).kcal : 0
  });
 }
 return out;
}
