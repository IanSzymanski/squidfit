const MODULES = [ {
 id: "wspark",
 name: "Weight trend",
 page: "weight",
 dom: [ "weight" ]
}, {
 id: "energy",
 name: "Expenditure",
 page: "energy",
 dom: [ "food", "weight" ]
}, {
 id: "cardio",
 get name() {
  return cardioWords().noun;
 },
 page: "cardio",
 dom: [ "cardio" ]
}, {
 id: "strength",
 name: "Strength",
 page: "workouts",
 dom: [ "strength" ]
}, {
 id: "parts",
 name: "Body parts",
 page: "workouts",
 dom: [ "strength" ]
}, {
 id: "logging",
 name: "Logging",
 page: "logging",
 dom: []
}, {
 id: "photos",
 name: "Photos",
 page: "photos",
 dom: []
}, {
 id: "summary",
 name: "This week",
 page: "summary",
 dom: []
}, {
 id: "together",
 name: "Week by week",
 page: "together",
 dom: []
} ];

const modLive = m => (m.dom || []).every(tracks);

const SET_V = 5;

const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);

const getPath = (o, path) => path.split(".").reduce((a, k) => isObj(a) ? a[k] : undefined, o);

function setPath(o, path, v) {
 const ks = path.split("."), last = ks.pop();
 let cur = o;
 ks.forEach(k => {
  if (!isObj(cur[k])) cur[k] = {};
  cur = cur[k];
 });
 cur[last] = v;
}

const vPos = v => isFinite(+v) && +v > 0 ? +v : undefined;

const vOne = (...ok) => v => ok.includes(v) ? v : undefined;

const vBool = v => typeof v === "boolean" ? v : undefined;

const vHM = v => /^\d{2}:\d{2}$/.test(String(v || "")) ? v : undefined;

const wasBefore = (s, v) => isObj(s) && !(+s.v >= v);

const MODS_NEW = () => Object.fromEntries(CARDIO_MODS.map(m => [ m.k, {
 on: m.k === "ride",
 metrics: [ "dist", "met" ],
 met: m.met
} ]));

const MODS_V4 = () => Object.fromEntries(CARDIO_MODS.map(m => [ m.k, m.k === "ride" ? {
 on: true,
 metrics: [ "watts" ],
 met: m.met
} : {
 on: false,
 metrics: [ "dist", "met" ],
 met: m.met
} ]));

function readMods(v, s) {
 const base = wasBefore(s, 5) ? MODS_V4() : MODS_NEW();
 if (!isObj(v)) return base;
 const out = {};
 CARDIO_MODS.forEach(m => {
  const x = isObj(v[m.k]) ? v[m.k] : null;
  out[m.k] = !x ? base[m.k] : {
   on: typeof x.on === "boolean" ? x.on : base[m.k].on,
   metrics: Array.isArray(x.metrics) ? CARDIO_METRICS.filter(k => x.metrics.includes(k)) : base[m.k].metrics,
   met: isFinite(+x.met) && +x.met > 0 ? clamp(+x.met, 1, 25) : m.met
  };
 });
 if (!CARDIO_MODS.some(m => out[m.k].on)) out.ride.on = true;
 return out;
}

const OPTS = [ {
 key: "targets",
 def: {
  kcal: {
   min: null,
   max: null
  },
  p: {
   min: null,
   max: null
  },
  c: {
   min: null,
   max: null
  },
  f: {
   min: null,
   max: null
  }
 },
 read(v, s, def) {
  const band = x => ({
   min: x.min ?? null,
   max: x.max ?? null
  });
  if (isObj(v)) return Object.fromEntries([ "kcal", "p", "c", "f" ].map(k => [ k, isObj(v[k]) ? band(v[k]) : def[k] ]));
  if (isObj(s.goals)) return {
   kcal: {
    min: null,
    max: s.goals.kcal || null
   },
   p: {
    min: s.goals.p || null,
    max: null
   },
   c: {
    min: s.goals.c || null,
    max: null
   },
   f: {
    min: null,
    max: s.goals.f || null
   }
  };
  return undefined;
 }
}, {
 key: "tdeeWeeks",
 def: 3,
 read: v => v ? v : undefined
}, {
 key: "chart",
 def: {
  scale: "day",
  h: 1,
  span: {
   day: 30,
   week: 13,
   month: 12
  }
 },
 read(v, s, def) {
  if (isObj(v)) return {
   scale: [ "day", "week", "month" ].includes(v.scale) ? v.scale : "day",
   h: clamp(+v.h || 1, .6, 3),
   span: {
    ...def.span,
    ...v.span || {}
   }
  };
  if (s.chartH !== undefined) return {
   ...def,
   h: [ .7, 1, 1.5, 2.1 ][clamp(s.chartH | 0, 0, 3)]
  };
  return undefined;
 }
}, {
 key: "cardio.ftp",
 def: null,
 read: (v, s) => isObj(s.cardio) ? v || 0 : undefined
}, {
 key: "cardio.wLo",
 def: null,
 read: vPos
}, {
 key: "cardio.wHi",
 def: null,
 read: vPos
}, {
 key: "cardio.defaultModality",
 def: "ride",
 read: (v, s) => CARDIO_MODS.some(m => m.k === v) ? v : wasBefore(s, 5) ? "ride" : undefined
}, {
 key: "cardio.mods",
 def: MODS_NEW(),
 read: readMods
}, {
 key: "week",
 def: {
  0: [],
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: []
 },
 read(v) {
  if (!isObj(v)) return undefined;
  const out = {};
  for (let i = 0; i < 7; i++) out[i] = (Array.isArray(v[i]) ? v[i] : []).filter(x => x && x.id && (x.k === "plan" || x.k === "ride")).map(x => ({
   k: x.k,
   id: String(x.id)
  }));
  return out;
 }
}, {
 key: "snooze",
 def: {},
 read(v) {
  const out = {};
  if (isObj(v)) Object.keys(v).forEach(iso => {
   if (Array.isArray(v[iso]) && v[iso].length) out[iso] = v[iso].map(String);
  });
  return out;
 }
}, {
 key: "goal",
 def: null,
 read: v => [ "lose", "hold", "gain" ].includes(v) ? v : null
}, {
 key: "onboarded",
 def: true,
 read: v => v !== false
}, {
 key: "layout",
 def: {
  dash: MODULES.map(m => ({
   id: m.id,
   on: true
  }))
 },
 read(v, s, def) {
  const src = isObj(v) ? v : {}, out = {};
  Object.keys(src).forEach(k => {
   if (!Array.isArray(src[k])) return;
   const seen = new Set;
   out[k] = src[k].filter(e => e && typeof e.id === "string" && !seen.has(e.id) && seen.add(e.id)).map(e => ({
    id: e.id,
    on: e.on !== false,
    ...+e.w === 2 && e.on !== false ? {
     w: 2
    } : {}
   }));
  });
  const dash = Array.isArray(src.dash) && src.dash.length ? src.dash : Array.isArray(s.dash) && s.dash.length ? s.dash : null;
  out.dash = dash ? reconcileDash(dash) : def.dash;
  return out;
 }
}, {
 key: "units.weight",
 def: "lb",
 read: vOne("lb", "kg")
}, {
 key: "units.dist",
 def: null,
 read: vOne("km", "mi")
}, {
 key: "units.energy",
 def: "kcal",
 read: vOne("kcal", "kJ")
}, {
 key: "week0",
 def: 1,
 read: vOne(0, 1, 6)
}, {
 key: "track.food",
 def: true,
 read: vBool
}, {
 key: "track.weight",
 def: true,
 read: vBool
}, {
 key: "track.strength",
 def: true,
 read: vBool
}, {
 key: "track.cardio",
 def: true,
 read: vBool
}, {
 key: "train.style",
 def: "volume",
 read: (v, s) => [ "eff", "volume", "strength", "sessions" ].includes(v) ? v : wasBefore(s, 5) ? "eff" : undefined
}, {
 key: "train.restSec",
 def: 120,
 read: v => isFinite(+v) && +v > 0 ? clamp(Math.round(+v), 15, 900) : undefined
}, {
 key: "train.step.lb",
 def: 2.5,
 read: vPos
}, {
 key: "train.step.kg",
 def: 1.25,
 read: vPos
}, {
 key: "train.effTarget",
 def: [ 35, 45 ],
 read(v) {
  if (!Array.isArray(v) || v.length !== 2) return undefined;
  const lo = +v[0], hi = +v[1];
  return isFinite(lo) && isFinite(hi) && hi > lo && lo >= 0 && !(lo === 20 && hi === 30) ? [ lo, hi ] : undefined;
 }
}, {
 key: "train.secShare",
 def: .5,
 read: v => v !== undefined && isFinite(+v) ? clamp(+v, 0, 1) : undefined
}, {
 key: "train.autoFinishH",
 def: 0,
 read: v => v !== undefined && isFinite(+v) ? clamp(Math.round(+v), 0, 48) : undefined
}, {
 key: "ride.poolDays",
 def: 7,
 read: v => v !== undefined && isFinite(+v) ? clamp(Math.round(+v), 1, 28) : undefined
}, {
 key: "weight.basis",
 def: "median",
 read: vOne("mean", "median")
}, {
 key: "spans.energy",
 def: 60,
 read: vPos
}, {
 key: "spans.eff",
 def: 84,
 read: vPos
}, {
 key: "spans.top",
 def: 84,
 read: vPos
}, {
 key: "spans.weeks",
 def: 12,
 read: v => [ 12, 26, 52 ].includes(+v) ? +v : undefined
}, {
 key: "imports.weight",
 def: true,
 read: vBool
}, {
 key: "imports.food",
 def: true,
 read: vBool
}, {
 key: "imports.targets",
 def: false,
 read: vBool
}, {
 key: "imports.spend",
 def: true,
 read: vBool
}, {
 key: "imports.weighAt",
 def: "07:00",
 read: vHM
}, {
 key: "ai.tier",
 def: "default",
 read: vOne("quick", "default", "complex")
}, {
 key: "order.wplans",
 def: [],
 read: v => Array.isArray(v) ? v.filter(x => typeof x === "string").slice(0, 500) : undefined
}, {
 key: "order.presets",
 def: [],
 read: v => Array.isArray(v) ? v.filter(x => typeof x === "string").slice(0, 500) : undefined
}, {
 key: "look",
 def: {
  id: "default",
  themes: []
 },
 read(v) {
  if (!isObj(v)) return undefined;
  const themes = (Array.isArray(v.themes) ? v.themes : []).slice(0, 40).map(t => themeNorm(t));
  const id = themeId(v.id);
  return {
   id: PRESETS_T.some(p => p.id === id) || themes.some(t => t.id === id) ? id : "default",
   themes: themes
  };
 }
} ];

const RETIRED = [ "goals", "chartH", "cardio.enabled", "dash" ];

const DEFAULTS = (() => {
 const o = {
  v: SET_V
 };
 OPTS.forEach(op => setPath(o, op.key, JSON.parse(JSON.stringify(op.def))));
 return o;
})();

let S = JSON.parse(JSON.stringify(DEFAULTS));

let DAYS = new Map, FOODS = new Map, RECIPES = new Map, RIDES = new Map, PRESETS = new Map;

let EXERCISES = new Map, WPLANS = new Map, WORKOUTS = new Map;

let DB = null, DEMO = false;

let PAGE = "dash", SELDATE = todayISO(), RANGE = 90;

let ADDTIME = null;

let ADDMODE = "log";

let NAV = [];

let PLATE = {
 items: [],
 t: null
};

const LSPREFIX = "squid.v4.";

const LSIDX = LSPREFIX + "index";

const LSMONTHLY = {
 days: d => d.d,
 workouts: w => w.d
};

const LSWHOLE = {
 settings: () => S,
 plate: () => PLATE,
 foods: () => [ ...FOODS.values() ],
 recipes: () => [ ...RECIPES.values() ],
 rides: () => [ ...RIDES.values() ],
 presets: () => [ ...PRESETS.values() ],
 exercises: () => [ ...EXERCISES.values() ],
 wplans: () => [ ...WPLANS.values() ]
};

const LSMAP = {
 days: () => DAYS,
 workouts: () => WORKOUTS
};

const monthOf = iso => String(iso || "").slice(0, 7);

let LSPEND = 0, LSDIRTY = new Set, LSFULL = false, LSTOLD = false;

function lsSave(which, iso) {
 if (DEMO || MOCK) return;
 if (!which) Object.keys(LSWHOLE).concat(Object.keys(LSMONTHLY)).forEach(k => LSDIRTY.add(k)); else if (LSMONTHLY[which] && iso) LSDIRTY.add(which + ":" + monthOf(iso)); else LSDIRTY.add(which);
 clearTimeout(LSPEND);
 LSPEND = setTimeout(lsFlush, 120);
}

function lsMonths(name) {
 const out = new Set;
 LSMAP[name]().forEach(v => {
  const m = monthOf(LSMONTHLY[name](v));
  if (m) out.add(m);
 });
 return out;
}

function lsWriteKey(key, value) {
 try {
  localStorage.setItem(LSPREFIX + key, value);
  return true;
 } catch (e) {
  return false;
 }
}

function lsRelieve() {
 if (!DB) return false;
 const shards = [];
 Object.keys(LSMONTHLY).forEach(name => lsMonths(name).forEach(m => shards.push(name + ":" + m)));
 shards.sort((a, b) => a.split(":")[1] < b.split(":")[1] ? -1 : 1);
 const drop = shards.slice(0, Math.max(1, Math.ceil(shards.length / 4)));
 let freed = 0;
 drop.forEach(k => {
  try {
   if (localStorage.getItem(LSPREFIX + k) !== null) freed++;
   localStorage.removeItem(LSPREFIX + k);
  } catch (e) {}
 });
 return freed > 0;
}

function lsFlush() {
 clearTimeout(LSPEND);
 LSPEND = 0;
 if (DEMO || MOCK || !LSDIRTY.size) return;
 const dirty = LSDIRTY;
 LSDIRTY = new Set;
 const keys = new Set;
 dirty.forEach(d => {
  if (LSMONTHLY[d]) lsMonths(d).forEach(m => keys.add(d + ":" + m)); else keys.add(d);
 });
 const index = {
  v: 4
 };
 Object.keys(LSMONTHLY).forEach(name => {
  index[name] = [ ...lsMonths(name) ].sort();
 });
 const bodies = new Map;
 keys.forEach(k => {
  const [name, month] = k.split(":");
  if (month) {
   const rows = [];
   LSMAP[name]().forEach(v => {
    if (monthOf(LSMONTHLY[name](v)) === month) rows.push(v);
   });
   bodies.set(k, JSON.stringify(rows));
  } else if (LSWHOLE[name]) {
   bodies.set(k, JSON.stringify(LSWHOLE[name]()));
  }
 });
 let refused = false;
 bodies.forEach((body, k) => {
  if (!lsWriteKey(k, body)) refused = true;
 });
 if (refused && lsRelieve()) {
  refused = false;
  bodies.forEach((body, k) => {
   if (!lsWriteKey(k, body)) refused = true;
  });
 }
 try {
  localStorage.setItem(LSIDX, JSON.stringify(index));
 } catch (e) {
  refused = true;
 }
 Object.keys(LSMONTHLY).forEach(name => {
  const live = new Set(index[name]);
  lsAllKeys().forEach(full => {
   const k = full.slice(LSPREFIX.length);
   if (!k.startsWith(name + ":")) return;
   if (!live.has(k.slice(name.length + 1))) {
    try {
     localStorage.removeItem(full);
    } catch (e) {}
   }
  });
 });
 if (LSTOLD && !refused) {
  LSTOLD = false;
  [ "ledgerscale.v3", "ledgerscale.v2", "ledgerscale.v1" ].forEach(k => {
   try {
    localStorage.removeItem(k);
   } catch (e) {}
  });
 }
 if (refused && !LSFULL) {
  LSFULL = true;
  toast(DB ? "This device's offline copy is full — your account still has everything." : "Storage is full. Export a backup now: new entries are not being saved.");
 } else if (!refused) LSFULL = false;
}

function lsAllKeys() {
 const out = [];
 try {
  for (let i = 0; i < localStorage.length; i++) {
   const k = localStorage.key(i);
   if (k && k.startsWith(LSPREFIX)) out.push(k);
  }
 } catch (e) {}
 return out;
}

window.addEventListener("pagehide", () => {
 if (LSPEND) lsFlush();
});

document.addEventListener("visibilitychange", () => {
 if (document.hidden && LSPEND) lsFlush();
});

function lsLoad() {
 let any = false;
 try {
  const rawIdx = localStorage.getItem(LSIDX);
  if (rawIdx) {
   const idx = JSON.parse(rawIdx) || {};
   const whole = k => {
    try {
     return JSON.parse(localStorage.getItem(LSPREFIX + k) || "null");
    } catch (e) {
     return null;
    }
   };
   S = migrateSettings(whole("settings") || {
    v: SET_V
   });
   const pl = whole("plate");
   if (pl && Array.isArray(pl.items)) PLATE = {
    items: pl.items,
    t: pl.t || null
   };
   (whole("foods") || []).forEach(x => FOODS.set(x.id, migrateFood(x)));
   (whole("recipes") || []).forEach(x => RECIPES.set(x.id, x));
   (whole("rides") || []).forEach(x => RIDES.set(x.id, migrateRide(x)));
   (whole("presets") || []).forEach(x => PRESETS.set(x.id, x));
   (whole("exercises") || []).forEach(x => EXERCISES.set(x.id, x));
   (whole("wplans") || []).forEach(x => WPLANS.set(x.id, x));
   (idx.days || []).forEach(m => (whole("days:" + m) || []).forEach(x => {
    const d = migrateDay(x);
    DAYS.set(d.d, d);
   }));
   (idx.workouts || []).forEach(m => (whole("workouts:" + m) || []).forEach(x => WORKOUTS.set(x.id, x)));
   any = true;
  } else if (!lsLoadLegacy()) return false;
 } catch (e) {
  try {
   if (!lsLoadLegacy()) return false;
  } catch (e2) {
   return false;
  }
 }
 const held = DAYS.size > 0 || FOODS.size > 0 || RIDES.size > 0 || RECIPES.size > 0 || PRESETS.size > 0 || WORKOUTS.size > 0 || WPLANS.size > 0;
 if (!any && held) lsSave();
 return held;
}

function lsLoadLegacy() {
 let raw = null;
 [ "ledgerscale.v3", "ledgerscale.v2", "ledgerscale.v1" ].forEach(k => {
  if (raw === null) {
   try {
    raw = localStorage.getItem(k);
   } catch (e) {}
  }
 });
 if (!raw) return false;
 const d = JSON.parse(raw);
 S = migrateSettings(d.s || {});
 (d.days || []).forEach(x => {
  const m = migrateDay(x);
  DAYS.set(m.d, m);
 });
 (d.foods || []).forEach(x => FOODS.set(x.id, migrateFood(x)));
 (d.recipes || []).forEach(x => RECIPES.set(x.id, x));
 (d.rides || []).forEach(x => RIDES.set(x.id, migrateRide(x)));
 (d.presets || []).forEach(x => PRESETS.set(x.id, x));
 (d.exercises || []).forEach(x => EXERCISES.set(x.id, x));
 (d.wplans || []).forEach(x => WPLANS.set(x.id, x));
 (d.workouts || []).forEach(x => WORKOUTS.set(x.id, x));
 if (d.plate && Array.isArray(d.plate.items)) PLATE = {
  items: d.plate.items,
  t: d.plate.t || null
 };
 LSTOLD = true;
 return true;
}

function lsFootprint() {
 let bytes = 0, shards = 0;
 lsAllKeys().forEach(k => {
  shards++;
  try {
   bytes += (localStorage.getItem(k) || "").length;
  } catch (e) {}
 });
 return {
  bytes: bytes,
  shards: shards,
  full: LSFULL
 };
}

function lsWipe() {
 lsAllKeys().forEach(k => {
  try {
   localStorage.removeItem(k);
  } catch (e) {}
 });
 [ "ledgerscale.v3", "ledgerscale.v2", "ledgerscale.v1", LSIDX ].forEach(k => {
  try {
   localStorage.removeItem(k);
  } catch (e) {}
 });
}

const MEAL_TIME = {
 Breakfast: "08:00",
 Lunch: "12:30",
 Dinner: "18:30",
 Snacks: "15:00"
};

function migrateSettings(s) {
 const src = isObj(s) ? s : {};
 const out = JSON.parse(JSON.stringify(src));
 RETIRED.forEach(k => {
  const ks = k.split("."), last = ks.pop(), host = ks.length ? getPath(out, ks.join(".")) : out;
  if (isObj(host)) delete host[last];
 });
 OPTS.forEach(op => {
  const def = JSON.parse(JSON.stringify(op.def));
  const v = op.read(getPath(src, op.key), src, def);
  setPath(out, op.key, v === undefined ? def : v);
 });
 const c = out.cardio;
 if (c.wLo > 0 && c.wHi > 0 && c.wHi <= c.wLo) c.wHi = c.wLo + 20;
 out.v = Math.max(SET_V, +src.v || 0);
 return out;
}

function reconcileDash(saved) {
 const seen = new Set;
 const out = saved.filter(x => x && MODULES.some(m => m.id === x.id) && !seen.has(x.id) && seen.add(x.id)).map(x => ({
  id: x.id,
  on: x.on !== false,
  ...+x.w === 2 && x.on !== false ? {
   w: 2
  } : {}
 }));
 MODULES.forEach(m => {
  if (!seen.has(m.id)) out.push({
   id: m.id,
   on: true
  });
 });
 return out;
}

function migrateDay(x) {
 const d = {
  d: x.d,
  wKg: x.wKg ?? null,
  wT: x.wT || null,
  note: x.note || "",
  entries: []
 };
 if (isFinite(+x.mfE) && +x.mfE > 0) d.mfE = r0(+x.mfE);
 (x.entries || []).forEach(e => {
  d.entries.push({
   id: e.id || uid(),
   t: e.t || MEAL_TIME[e.meal] || "12:00",
   name: e.name,
   src: e.src ?? null,
   g: e.g || 0,
   unit: e.unit || "g",
   qty: e.qty ?? (e.g || 0),
   kcal: e.kcal || 0,
   p: e.p || 0,
   c: e.c || 0,
   f: e.f || 0,
   alc: e.alc || 0,
   ...e.imp ? {
    imp: 1
   } : {}
  });
 });
 d.entries.sort((a, b) => a.t < b.t ? -1 : 1);
 return d;
}

function migrateFood(f) {
 const o = {
  ...f,
  alc: f.alc || 0
 };
 delete o.fib;
 return o;
}

function dbErr(e) {
 const c = e && e.code;
 if (c === "quota_exceeded") return "Storage full — export and prune old days.";
 if (c === "resource_exhausted") return "Too many writes at once; try again shortly.";
 return "Saved on this device only.";
}

const TOMB = new Map;

const TOMB_DAYS = 60;

const TOMBKEY = LSPREFIX + "gone";

const tombId = path => path.replace(/\//g, "__");

function tombLoad() {
 try {
  const raw = localStorage.getItem(TOMBKEY);
  if (raw) JSON.parse(raw).forEach(([p, at]) => TOMB.set(p, at));
 } catch (e) {}
 tombPrune();
}

function tombPrune() {
 const cutoff = Date.now() - TOMB_DAYS * 864e5;
 let cut = false;
 TOMB.forEach((at, p) => {
  if (at < cutoff) {
   TOMB.delete(p);
   cut = true;
  }
 });
 if (cut) tombWrite();
}

function tombWrite() {
 try {
  localStorage.setItem(TOMBKEY, JSON.stringify([ ...TOMB.entries() ]));
 } catch (e) {}
}

const WROTE = new Map;

let WSEQ = 0;

async function put(path, doc, quiet) {
 if (MOCK) return true;
 WROTE.set(path, {
  t: Date.now(),
  n: ++WSEQ
 });
 const n = ++PENDSEQ;
 PENDING.set(path, n);
 if (!quiet) pendWrite();
 if (TOMB.delete(path)) {
  tombWrite();
  if (DB) {
   try {
    await DB.doc("gone/" + tombId(path)).delete();
   } catch (e) {}
  }
 }
 if (!DB) return false;
 try {
  await DB.doc(path).set(doc);
  if (PENDING.get(path) === n) {
   PENDING.delete(path);
   if (!quiet) pendWrite();
  }
  return true;
 } catch (e) {
  if (!quiet) toast(dbErr(e));
  return false;
 }
}

async function del(path) {
 if (MOCK) return;
 const at = Date.now(), n = ++WSEQ;
 TOMB.set(path, at);
 tombWrite();
 if (PENDING.delete(path)) pendWrite();
 if (!DB) return;
 try {
  await DB.doc("gone/" + tombId(path)).set({
   p: path,
   at: at
  });
 } catch (e) {}
 if ((WROTE.get(path) || {
  n: 0
 }).n > n) {
  try {
   await DB.doc("gone/" + tombId(path)).delete();
  } catch (e) {}
  return;
 }
 try {
  await DB.doc(path).delete();
 } catch (e) {}
}

const PENDKEY = LSPREFIX + "pending";

const PENDING = new Map;

let PENDSEQ = 0;

function pendLoad() {
 try {
  (JSON.parse(localStorage.getItem(PENDKEY) || "[]") || []).forEach(p => PENDING.set(p, 0));
 } catch (e) {}
}

function pendWrite() {
 try {
  if (PENDING.size) localStorage.setItem(PENDKEY, JSON.stringify([ ...PENDING.keys() ])); else localStorage.removeItem(PENDKEY);
 } catch (e) {}
}

function pendIn(coll) {
 const out = new Set, pre = coll + "/";
 PENDING.forEach((_, p) => {
  if (p.startsWith(pre)) out.add(p.slice(pre.length));
 });
 return out;
}

async function putMany(items, onProgress) {
 items.forEach(([p]) => PENDING.set(p, ++PENDSEQ));
 pendWrite();
 if (!DB || !items.length) return DB ? 0 : items.length;
 let next = 0, done = 0, failed = 0;
 const worker = async () => {
  while (next < items.length) {
   const [p, doc] = items[next++];
   try {
    if (!await put(p, doc, true)) failed++;
   } catch (e) {
    failed++;
   }
   done++;
   if (onProgress) onProgress(done, items.length);
   if (done % 25 === 0) {
    pendWrite();
    await new Promise(r => setTimeout(r, 120));
   }
  }
 };
 await Promise.all([ worker(), worker() ]);
 pendWrite();
 if (failed) toast(`${failed} record${failed === 1 ? "" : "s"} saved on this device only; they upload next time.`);
 return failed;
}

async function delMany(paths, onProgress) {
 let next = 0, done = 0;
 const worker = async () => {
  while (next < paths.length) {
   await del(paths[next++]);
   done++;
   if (onProgress) onProgress(done, paths.length);
   if (done % 25 === 0) await new Promise(r => setTimeout(r, 120));
  }
 };
 await Promise.all([ worker(), worker() ]);
}

async function pendBody(path) {
 const cut = path.indexOf("/"), coll = path.slice(0, cut), id = path.slice(cut + 1);
 if (path === "settings/main") return {
  ...S
 };
 if (coll === "pix") {
  const img = await pixGet(id);
  return img ? {
   id: id,
   img: img
  } : null;
 }
 const map = COLLMAP[coll];
 return map ? map.get(id) || null : null;
}

async function pendFlush(coll) {
 if (!DB) return;
 const pre = coll + "/";
 const paths = [ ...PENDING.keys() ].filter(p => p.startsWith(pre));
 if (!paths.length) return;
 const items = [];
 for (const p of paths) {
  const body = await pendBody(p);
  if (body) items.push([ p, body ]); else PENDING.delete(p);
 }
 if (items.length) await putMany(items); else pendWrite();
}

function tombEnforce(path) {
 if (!DB) return;
 try {
  DB.doc(path).delete();
 } catch (e) {}
}

let STASH = null;

function sampleEnter() {
 if (DEMO) return;
 lsFlush();
 STASH = {
  maps: {},
  targets: thaw(S.targets),
  ftp: S.cardio && S.cardio.ftp
 };
 Object.entries(COLLMAP).forEach(([c, m]) => {
  STASH.maps[c] = new Map(m);
 });
 DEMO = true;
}

const liveMap = (coll, map) => MOCK && MOCK.maps[coll] || DEMO && STASH && STASH.maps[coll] || map;

let MOCK = null;

function localeDefaults() {
 let tag = "en-US", region = "", week0 = 1;
 try {
  tag = navigator.language || tag;
 } catch (e) {}
 try {
  region = new Intl.Locale(tag).maximize().region || "";
 } catch (e) {}
 try {
  const L = new Intl.Locale(tag), wi = L.getWeekInfo ? L.getWeekInfo() : L.weekInfo;
  if (wi && wi.firstDay) week0 = wi.firstDay === 7 ? 0 : 1;
 } catch (e) {}
 const lb = [ "US", "LR", "MM" ].includes(region);
 return {
  units: {
   weight: lb ? "lb" : "kg",
   dist: lb || region === "GB" ? "mi" : "km",
   energy: [ "AU", "NZ" ].includes(region) ? "kJ" : "kcal"
  },
  week0: week0
 };
}

let ONB = null;

function mockEnter() {
 if (MOCK) return;
 lsFlush();
 MOCK = {
  S: thaw(S),
  maps: {},
  marks: []
 };
 Object.entries(COLLMAP).forEach(([c, m]) => {
  MOCK.maps[c] = new Map(m);
 });
}

function mockLeave() {
 if (!MOCK) return;
 const mk = MOCK;
 MOCK = null;
 S = mk.S;
 Object.entries(COLLMAP).forEach(([c, m]) => {
  m.clear();
  mk.maps[c].forEach((v, k) => m.set(k, v));
 });
 if (mk.fromAccount) lsSave("settings");
 mk.marks.forEach(([c, iso]) => c === "photos" ? photoSave() : lsSave(c, iso));
 if (LSDIRTY.size) lsFlush();
 applyLook();
 render();
}

function clearDemo() {
 if (!DEMO) return;
 DEMO = false;
 if (STASH) {
  const st = STASH;
  STASH = null;
  Object.entries(COLLMAP).forEach(([c, m]) => {
   if (!st.maps[c]) return;
   m.clear();
   st.maps[c].forEach((v, k) => m.set(k, v));
  });
  S.targets = st.targets;
  if (S.cardio) S.cardio.ftp = st.ftp;
  lsSave();
  photoSave();
  return;
 }
 DAYS.clear();
 FOODS.clear();
 RECIPES.clear();
 RIDES.clear();
 PRESETS.clear();
 WORKOUTS.clear();
}

async function saveDay(day) {
 const empty = !day.wKg && !(day.entries || []).length && !day.note;
 if (empty) {
  DAYS.delete(day.d);
  del("days/" + day.d);
 } else {
  day.entries.sort((a, b) => (a.t || "") < (b.t || "") ? -1 : 1);
  DAYS.set(day.d, day);
  put("days/" + day.d, day);
 }
 lsSave("days", day.d);
 render();
}

async function saveSettings() {
 if (DB) put("settings/main", {
  ...S
 });
 lsSave("settings");
 render();
}

async function saveFood(f) {
 clearDemo();
 const c = thaw(f);
 FOODS.set(c.id, c);
 put("foods/" + c.id, c);
 lsSave("foods");
 render();
}

async function delFood(id) {
 FOODS.delete(id);
 del("foods/" + id);
 lsSave("foods");
 render();
}

async function saveRecipe(r) {
 clearDemo();
 const c = thaw(r);
 RECIPES.set(c.id, c);
 put("recipes/" + c.id, c);
 lsSave("recipes");
 render();
}

async function delRecipe(id) {
 RECIPES.delete(id);
 del("recipes/" + id);
 lsSave("recipes");
 render();
}

async function saveRide(r) {
 clearDemo();
 const c = thaw(r);
 RIDES.set(c.id, c);
 put("rides/" + c.id, c);
 lsSave("rides");
 render();
}

async function delRide(id) {
 RIDES.delete(id);
 del("rides/" + id);
 lsSave("rides");
 render();
}

async function savePreset(p) {
 clearDemo();
 const c = thaw(p);
 PRESETS.set(c.id, c);
 put("presets/" + c.id, c);
 lsSave("presets");
 render();
}

async function delPreset(id) {
 PRESETS.delete(id);
 del("presets/" + id);
 lsSave("presets");
 render();
}

async function saveExercise(x) {
 clearDemo();
 const c = thaw(x);
 EXERCISES.set(c.id, c);
 put("exercises/" + c.id, c);
 lsSave("exercises");
 render();
}

async function delExercise(id) {
 EXERCISES.delete(id);
 del("exercises/" + id);
 lsSave("exercises");
 render();
}

async function savePlan(p) {
 clearDemo();
 const c = thaw(p);
 WPLANS.set(c.id, c);
 put("wplans/" + c.id, c);
 lsSave("wplans");
 render();
}

async function delPlan(id) {
 WPLANS.delete(id);
 del("wplans/" + id);
 lsSave("wplans");
 render();
}

async function saveWorkout(w, quiet) {
 clearDemo();
 const c = thaw(w);
 WORKOUTS.set(c.id, c);
 put("workouts/" + c.id, c);
 lsSave("workouts", c.d);
 if (!quiet) render();
}

async function delWorkout(id) {
 const gone = WORKOUTS.get(id);
 WORKOUTS.delete(id);
 del("workouts/" + id);
 lsSave("workouts", gone && gone.d);
 render();
}

let PHOTOS = new Map;

const PKEY = "ledgerscale.photos";

const PIXMEM = new Map;

function photoSave() {
 if (DEMO || MOCK) return;
 try {
  localStorage.setItem(PKEY, JSON.stringify([ ...PHOTOS.values() ]));
 } catch (e) {}
}

function photoLoad() {
 try {
  const raw = localStorage.getItem(PKEY);
  if (raw) JSON.parse(raw).forEach(p => {
   if (p && p.d) PHOTOS.set(p.d, p);
  });
 } catch (e) {}
}

function photoDay(iso) {
 const p = PHOTOS.get(iso);
 return p ? p : {
  d: iso,
  shots: {}
 };
}

const photoDates = () => [ ...PHOTOS.keys() ].sort();

const photoSeries = slot => photoDates().filter(d => PHOTOS.get(d).shots && PHOTOS.get(d).shots[slot]).map(d => ({
 d: d,
 shot: PHOTOS.get(d).shots[slot]
}));

async function savePhotoDay(day) {
 clearDemo();
 const any = day.shots && Object.keys(day.shots).length;
 if (!any) {
  PHOTOS.delete(day.d);
  del("photos/" + day.d);
 } else {
  PHOTOS.set(day.d, day);
  put("photos/" + day.d, day);
 }
 photoSave();
 lsSave();
 render();
}

let IDB = null;

function idbOpen() {
 if (IDB) return IDB;
 IDB = new Promise(res => {
  try {
   const r = indexedDB.open("ledgerscale", 1);
   r.onupgradeneeded = () => {
    try {
     r.result.createObjectStore("pix");
    } catch (e) {}
   };
   r.onsuccess = () => res(r.result);
   r.onerror = () => res(null);
   r.onblocked = () => res(null);
  } catch (e) {
   res(null);
  }
 });
 return IDB;
}

function idbDo(mode, fn) {
 return idbOpen().then(db => {
  if (!db) return null;
  return new Promise(res => {
   let done = false;
   const finish = v => {
    if (!done) {
     done = true;
     res(v);
    }
   };
   try {
    const tx = db.transaction("pix", mode), st = tx.objectStore("pix");
    const rq = fn(st);
    tx.onerror = () => finish(null);
    tx.onabort = () => finish(null);
    if (rq) rq.onsuccess = () => finish(rq.result); else tx.oncomplete = () => finish(true);
   } catch (e) {
    finish(null);
   }
  });
 });
}

const idbGet = id => idbDo("readonly", st => st.get(id));

const idbPut = (id, v) => idbDo("readwrite", st => {
 st.put(v, id);
 return null;
});

const idbDel = id => idbDo("readwrite", st => {
 st.delete(id);
 return null;
});

async function pixPut(id, img) {
 PIXMEM.set(id, img);
 idbPut(id, img);
 await put("pix/" + id, {
  id: id,
  img: img
 });
}

async function pixGet(id) {
 if (!id) return null;
 if (PIXMEM.has(id)) return PIXMEM.get(id);
 const local = await idbGet(id);
 if (local) {
  PIXMEM.set(id, local);
  return local;
 }
 if (!DB) return null;
 try {
  const s = await DB.doc("pix/" + id).get();
  const v = s.exists ? s.data().img : null;
  if (v) {
   PIXMEM.set(id, v);
   idbPut(id, v);
  }
  return v;
 } catch (e) {
  return null;
 }
}

function pixDel(id) {
 PIXMEM.delete(id);
 idbDel(id);
 del("pix/" + id);
}

function plateTotals() {
 return totalsOf(PLATE.items);
}

function plateAdd(entry) {
 PLATE.items = PLATE.items.concat([ entry ]);
 if (!PLATE.t) PLATE.t = entry.t || nowHM();
 lsSave();
 render();
}

function plateRemove(id) {
 PLATE.items = PLATE.items.filter(e => e.id !== id);
 lsSave("plate");
 render();
}

function logEntry(entry, iso) {
 const day = editDay(iso || SELDATE);
 day.entries.push({
  ...entry,
  id: uid()
 });
 saveDay(day);
}

function plateClear() {
 PLATE = {
  items: [],
  t: null
 };
 lsSave("plate");
 render();
}

function plateCommit(iso) {
 if (!PLATE.items.length) return 0;
 const day = editDay(iso || SELDATE);
 const n = PLATE.items.length;
 day.entries = day.entries.concat(PLATE.items.map(e => ({
  ...e,
  id: uid()
 })));
 PLATE = {
  items: [],
  t: null
 };
 lsSave("plate");
 saveDay(day);
 return n;
}

function getDay(iso) {
 const d = DAYS.get(iso);
 return d ? d : {
  d: iso,
  wKg: null,
  wT: null,
  entries: [],
  note: ""
 };
}

function editDay(iso) {
 clearDemo();
 return thaw(getDay(iso));
}

function editWorkout(id) {
 const w = WORKOUTS.get(id);
 return w ? thaw(w) : null;
}

function foodById(id) {
 return FOODS.get(id) || SEED.find(f => f.id === id) || null;
}

function macrosFor(food, grams) {
 const k = grams / 100;
 return {
  kcal: food.kcal * k,
  p: food.p * k,
  c: food.c * k,
  f: food.f * k,
  alc: (food.alc || 0) * k
 };
}

const TOTALS = new WeakMap;

function totalsOf(entries) {
 if (!entries) return {
  kcal: 0,
  p: 0,
  c: 0,
  f: 0,
  alc: 0,
  g: 0
 };
 const hit = TOTALS.get(entries);
 if (hit) return hit;
 const t = {
  kcal: 0,
  p: 0,
  c: 0,
  f: 0,
  alc: 0,
  g: 0
 };
 entries.forEach(e => {
  t.kcal += e.kcal || 0;
  t.p += e.p || 0;
  t.c += e.c || 0;
  t.f += e.f || 0;
  t.alc += e.alc || 0;
  t.g += e.g || 0;
 });
 TOTALS.set(entries, t);
 return t;
}

const kcalFromMacros = m => (m.p || 0) * 4 + (m.c || 0) * 4 + (m.f || 0) * 9 + (m.alc || 0) * 7;

const num = (v, fallback) => isFinite(+v) && +v > 0 ? +v : fallback;

const restMs = () => num(S.train && S.train.restSec, 120) * 1e3;

const secShare = () => {
 const v = S.train ? +S.train.secShare : NaN;
 return isFinite(v) && v >= 0 && v <= 1 ? v : .5;
};

const effTarget = () => {
 const t = S.train && S.train.effTarget;
 return Array.isArray(t) && t.length === 2 && t[1] > t[0] ? t : [ 20, 30 ];
};

const poolDays = () => clamp(Math.round(num(S.ride && S.ride.poolDays, 7)), 1, 28);

const week0 = () => S.week0 === 0 || S.week0 === 1 || S.week0 === 6 ? S.week0 : 1;

const weekOrder = () => [ 0, 1, 2, 3, 4, 5, 6 ].map(i => (i + week0()) % 7);

const weekCol = dow => (dow - week0() + 7) % 7;

function unitsFor(food) {
 const u = [ {
  key: "g",
  label: "g",
  g: 1
 }, {
  key: "oz",
  label: "oz",
  g: OZ
 } ];
 (food.portions || []).forEach((p, i) => u.push({
  key: "p" + i,
  label: p.label,
  g: p.g
 }));
 if (food.isRecipe) u.unshift({
  key: "serv",
  label: "serving",
  g: food.servG
 });
 return u;
}
