const setEff = s => s && +s.eff > 0 ? +s.eff : 0;

const asksEff = () => S.train && S.train.style === "eff";

const trainStyle = () => S.train && [ "eff", "volume", "strength", "sessions" ].includes(S.train.style) ? S.train.style : "volume";

function setScore(s) {
 const st = trainStyle();
 if (st === "eff") return setEff(s);
 if (st === "sessions") return 1;
 return (+s.w || 0) * (+s.reps || 0);
}

const fmtVol = lb => {
 const v = dispLoad(lb);
 return v >= 1e4 ? r1(v / 1e3) + "k" : String(r0(v));
};

function metric() {
 const st = trainStyle();
 if (st === "eff") return {
  k: st,
  name: "Effective reps",
  lower: "effective reps",
  short: "eff",
  col: "Eff",
  fmt: v => String(r1(v)),
  band: true
 };
 if (st === "sessions") return {
  k: st,
  name: "Sets",
  lower: "sets",
  short: "sets",
  col: "Sets",
  fmt: v => String(r0(v)),
  band: false
 };
 return {
  k: st,
  name: "Volume",
  lower: "volume",
  short: loadUnit(),
  col: "Volume",
  fmt: v => fmtVol(v),
  band: false
 };
}

function setLabel(s, withUnit) {
 const bits = [];
 if (s.w > 0 || s.reps > 0) bits.push((s.w > 0 ? fmtLoad(s.w) + (withUnit ? " " + loadUnit() : "") : "") + (s.reps > 0 ? (s.w > 0 ? "×" : "") + s.reps + (s.w > 0 ? "" : " reps") : ""));
 if (s.eff !== undefined && s.eff !== null) bits.push(s.eff + " eff");
 return bits.join(" · ") || "set";
}

const fmtMetric = v => metric().fmt(v) + " " + metric().short;

const fmtMetricLong = v => metric().fmt(v) + " " + ({
 eff: "effective reps",
 sessions: "sets"
}[metric().k] || metric().short + " volume");

const PARTS = [ {
 k: "chest",
 name: "Chest",
 short: "Chest",
 pat: "push"
}, {
 k: "fdelts",
 name: "Front delts",
 short: "F delts",
 pat: "push"
}, {
 k: "sdelts",
 name: "Side delts",
 short: "S delts",
 pat: "push"
}, {
 k: "rdelts",
 name: "Rear delts",
 short: "R delts",
 pat: "pull"
}, {
 k: "triceps",
 name: "Triceps",
 short: "Tris",
 pat: "push"
}, {
 k: "lats",
 name: "Lats",
 short: "Lats",
 pat: "pull"
}, {
 k: "midback",
 name: "Mid back",
 short: "Mid back",
 pat: "pull"
}, {
 k: "traps",
 name: "Traps",
 short: "Traps",
 pat: "pull"
}, {
 k: "biceps",
 name: "Biceps",
 short: "Bis",
 pat: "pull"
}, {
 k: "forearms",
 name: "Forearms",
 short: "Forearms",
 pat: "pull"
}, {
 k: "quads",
 name: "Quads",
 short: "Quads",
 pat: "legs"
}, {
 k: "hams",
 name: "Hamstrings",
 short: "Hams",
 pat: "legs"
}, {
 k: "glutes",
 name: "Glutes",
 short: "Glutes",
 pat: "legs"
}, {
 k: "calves",
 name: "Calves",
 short: "Calves",
 pat: "legs"
}, {
 k: "core",
 name: "Core",
 short: "Core",
 pat: "core"
} ];

const PART = Object.fromEntries(PARTS.map(p => [ p.k, p ]));

const partName = k => (PART[k] || {}).name || k;

const PART_COLOR = Object.fromEntries(PARTS.map(p => [ p.k, `var(--part-${p.k})` ]));

const BODY_BASE = '<circle cx="12" cy="3.6" r="2.2"/>' + '<path d="M8.6 7h6.8l1.1 6.2H7.5z"/>' + '<path d="M7.5 7.6L5.4 9.2l-1 4.6M16.5 7.6l2.1 1.6 1 4.6"/>' + '<path d="M4.4 13.8l-.5 3.4M19.6 13.8l.5 3.4"/>' + '<path d="M8.1 13.2l-.4 4.4.3 4.1M15.9 13.2l.4 4.4-.3 4.1"/>';

const BODY_MARK = {
 chest: '<path d="M8.8 8.2h6.4l.5 2.9H8.3z"/>',
 fdelts: '<path d="M8 7.5L6.4 8.7M16 7.5l1.6 1.2"/>',
 sdelts: '<path d="M5.6 8.7l-.9 2.8M18.4 8.7l.9 2.8"/>',
 rdelts: '<path d="M7.4 7.4L5.3 9l-.6 2.6M16.6 7.4L18.7 9l.6 2.6" stroke-dasharray="1 1.2"/>',
 triceps: '<path d="M4.7 11.6l-.3 2.4-.4 2.6M19.3 11.6l.3 2.4.4 2.6"/>',
 lats: '<path d="M8.9 8.4l.7 4.3M15.1 8.4l-.7 4.3"/>',
 midback: '<path d="M12 7.6v4.8M10.2 9.4h3.6"/>',
 traps: '<path d="M9.6 6.3l2.4.9 2.4-.9"/>',
 biceps: '<path d="M5.2 9.4l-.4 2.3M18.8 9.4l.4 2.3"/>',
 forearms: '<path d="M4.4 13.8l-.5 3.4M19.6 13.8l.5 3.4"/>',
 quads: '<path d="M8.1 13.6l-.35 3.9M15.9 13.6l.35 3.9"/>',
 hams: '<path d="M8.05 14.6l-.3 3M15.95 14.6l.3 3"/>',
 glutes: '<path d="M7.9 13.1h8.2"/>',
 calves: '<path d="M7.75 18.3l.2 3.2M16.25 18.3l-.2 3.2"/>',
 core: '<path d="M9.4 11.6h5.2l.2 1.5H9.2z"/>'
};

function exIcon(ex, size) {
 const k = ex && BODY_MARK[ex.part] ? ex.part : "core";
 const col = PART_COLOR[k] || "var(--ink2)";
 const n = el("span", {
  class: "xic",
  "aria-hidden": "true",
  html: '<svg viewBox="0 0 24 24">' + '<g class="bd">' + BODY_BASE + "</g>" + '<g class="hi" stroke="' + col + '">' + BODY_MARK[k] + "</g></svg>"
 });
 if (size) {
  n.style.width = size + "px";
  n.style.height = size + "px";
 }
 n.dataset.part = k;
 return n;
}

const SEED_EX = [ [ "Bench press", "chest", [ "triceps", "fdelts" ] ], [ "Incline dumbbell press", "chest", [ "fdelts", "triceps" ] ], [ "Overhead press", "fdelts", [ "triceps", "sdelts" ] ], [ "Lateral raise", "sdelts", [] ], [ "Triceps pushdown", "triceps", [] ], [ "Barbell row", "midback", [ "lats", "rdelts", "biceps" ] ], [ "Lat pulldown", "lats", [ "biceps" ] ], [ "Chin-up", "lats", [ "biceps" ] ], [ "Barbell curl", "biceps", [ "forearms" ] ], [ "Back squat", "quads", [ "glutes", "hams" ] ], [ "Leg press", "quads", [ "glutes" ] ], [ "Romanian deadlift", "hams", [ "glutes" ] ], [ "Leg curl", "hams", [] ], [ "Hip thrust", "glutes", [ "hams" ] ], [ "Calf raise", "calves", [] ], [ "Hanging leg raise", "core", [] ], [ "Rear delt fly", "rdelts", [ "midback" ] ], [ "Shrug", "traps", [ "forearms" ] ], [ "Hammer curl", "biceps", [ "forearms" ] ] ];

const LEGACY_PART = {
 shoulders: (n, pat) => /lateral|side raise|upright|\by[- ]raise/i.test(n) ? "sdelts" : /rear|reverse fl|face pull/i.test(n) || pat === "pull" ? "rdelts" : "fdelts",
 back: n => /shrug/i.test(n) ? "traps" : /row|rear|reverse fl|face pull|rhomb/i.test(n) ? "midback" : "lats"
};

function migrateExercise(x) {
 if (!x) return x;
 const legacy = k => !!LEGACY_PART[k];
 if (!legacy(x.part) && !(x.sec || []).some(s => s && legacy(s.k))) return x;
 const name = x.name || "";
 const seed = x.seed ? SEED_EX.find(([n]) => n.toLowerCase() === name.toLowerCase()) : null;
 const out = {
  ...x
 };
 if (seed) {
  out.part = seed[1];
  out.sec = seed[2].map(k => ({
   k: k
  }));
 } else {
  out.part = legacy(x.part) ? LEGACY_PART[x.part](name) : x.part;
  const seen = new Set([ out.part ]), pat = (PART[out.part] || {}).pat;
  out.sec = (x.sec || []).map(s => s && legacy(s.k) ? {
   ...s,
   k: LEGACY_PART[s.k](name, pat)
  } : s).filter(s => s && !seen.has(s.k) && seen.add(s.k));
 }
 return out;
}

function migrateParts() {
 let n = 0;
 [ ...EXERCISES.values() ].forEach(x => {
  const m = migrateExercise(x);
  if (m !== x) {
   saveExercise(m);
   n++;
  }
 });
 return n;
}

const exByName = name => {
 const all = [ ...EXERCISES.values() ].filter(x => (x.name || "").toLowerCase() === name.toLowerCase());
 return all.find(x => !x.retired) || all[0] || null;
};

const liveExercises = () => [ ...EXERCISES.values() ].filter(x => !x.retired);

function deleteExercise(ex) {
 const used = [ ...WORKOUTS.values() ].some(w => (w.sets || []).some(s => s.exId === ex.id) || (w.order || []).includes(ex.id));
 const plans = [ ...WPLANS.values() ].filter(p => (p.items || []).some(i => i.exId === ex.id)).map(p => thaw(p));
 plans.forEach(p => savePlan({
  ...p,
  items: p.items.filter(i => i.exId !== ex.id)
 }));
 const was = thaw(ex);
 if (used || ex.seed) saveExercise({
  ...was,
  retired: true
 }); else delExercise(ex.id);
 return () => {
  saveExercise(was);
  plans.forEach(savePlan);
 };
}

function seedExercises() {
 SEED_EX.forEach(([name, part, sec], i) => {
  if (exByName(name)) return;
  const id = EXERCISES.has("x" + i) ? "x" + uid() : "x" + i;
  EXERCISES.set(id, {
   id: id,
   name: name,
   part: part,
   sec: sec.map(k => ({
    k: k
   })),
   seed: true
  });
 });
}

function seedExId(name) {
 const hit = exByName(name);
 if (hit) return hit.id;
 const row = SEED_EX.find(r => r[0] === name) || [ name, "core", [] ];
 const id = "x" + uid();
 EXERCISES.set(id, {
  id: id,
  name: name,
  part: row[1],
  sec: row[2].map(k => ({
   k: k
  })),
  seed: true
 });
 return id;
}

const exById = id => EXERCISES.get(id) || null;

const exName = id => (exById(id) || {}).name || "(deleted)";

const exPat = ex => (PART[ex && ex.part] || {}).pat || "core";

const EXPARTS = new WeakMap;

const NO_PARTS = [];

function exParts(ex) {
 if (!ex) return NO_PARTS;
 const def = secShare();
 const hit = EXPARTS.get(ex);
 if (hit && hit.def === def) return hit.parts;
 const parts = [ {
  k: ex.part,
  share: 1
 } ];
 (ex.sec || []).forEach(s => {
  if (!s || !s.k || s.k === ex.part || !PART[s.k]) return;
  const own = s.share === undefined || s.share === null ? def : +s.share;
  parts.push({
   k: s.k,
   share: clamp(isFinite(own) ? own : def, 0, 1)
  });
 });
 EXPARTS.set(ex, {
  def: def,
  parts: parts
 });
 return parts;
}

const shareOf = s => s && s.share !== undefined && s.share !== null && isFinite(+s.share) ? +s.share : secShare();

const setsFor = (w, exId) => (w.sets || []).filter(s => s.exId === exId);

function planItems(w) {
 const order = w.order && w.order.length ? w.order : (w.items || []).map(i => i.exId);
 return order.map(exId => {
  const item = (w.items || []).find(i => i.exId === exId) || {
   exId: exId,
   sets: 3
  };
  const done = setsFor(w, exId);
  return {
   exId: exId,
   want: item.sets || 3,
   done: done.length,
   sets: done,
   complete: done.length >= (item.sets || 3)
  };
 });
}

function workoutTotals(w) {
 const sets = w.sets || [];
 const eff = sets.reduce((s, x) => s + setScore(x), 0);
 const byPart = {};
 sets.forEach(x => {
  const ex = exById(x.exId);
  if (!ex) return;
  const e = setScore(x);
  exParts(ex).forEach(({k: k, share: share}) => {
   const p = byPart[k] || (byPart[k] = {
    eff: 0,
    sets: 0,
    top: 0,
    direct: 0
   });
   p.eff += e * share;
   p.sets++;
   p.top = Math.max(p.top, x.w || 0);
   if (share >= 1) p.direct++;
  });
 });
 const items = planItems(w);
 return {
  eff: r1(eff),
  sets: sets.length,
  byPart: byPart,
  items: items,
  wantSets: items.reduce((s, i) => s + i.want, 0),
  doneItems: items.filter(i => i.complete).length
 };
}

const workoutList = () => [ ...WORKOUTS.values() ].sort((a, b) => a.d + (a.t || "") < b.d + (b.t || "") ? 1 : -1);

function partsWeek(iso) {
 const from = addDays(iso, -6), out = {};
 WORKOUTS.forEach(w => {
  if (w.d < from || w.d > iso) return;
  (w.sets || []).forEach(s => {
   const ex = exById(s.exId);
   if (!ex) return;
   const sc = setScore(s);
   exParts(ex).forEach(p => {
    out[p.k] = (out[p.k] || 0) + sc * p.share;
   });
  });
 });
 Object.keys(out).forEach(k => {
  out[k] = r1(out[k]);
 });
 return out;
}

function quickSet(w, exId, n, load) {
 const cur = editWorkout(w.id) || thaw(w);
 const prior = setsFor(cur, exId);
 const seed = prior.length ? prior[prior.length - 1] : lastLoad(exId);
 const st = trainStyle();
 const wt = load === undefined || load === null ? seed ? seed.w : 0 : load;
 const rec = st === "sessions" ? {
  id: uid(),
  exId: exId,
  t: nowHM()
 } : st === "eff" ? {
  id: uid(),
  exId: exId,
  w: wt,
  eff: clamp(n, 0, 5),
  t: nowHM()
 } : {
  id: uid(),
  exId: exId,
  w: wt,
  reps: clamp(n, 1, 30),
  t: nowHM()
 };
 cur.sets = (cur.sets || []).concat([ rec ]);
 saveWorkout(cur);
 restStart();
}

function dropSets(w, exId, n) {
 const cur = editWorkout(w.id) || thaw(w);
 const mine = (cur.sets || []).filter(x => x.exId === exId);
 const kill = new Set(mine.slice(-n).map(x => x.id));
 cur.sets = (cur.sets || []).filter(x => !kill.has(x.id));
 saveWorkout(cur);
}

function sessionSets(w, exId, n, quiet) {
 const cur = editWorkout(w.id) || thaw(w);
 cur.items = cur.items || [];
 const it = cur.items.find(x => x.exId === exId);
 if (it) it.sets = clamp((it.sets || 0) + n, 1, 12); else {
  cur.items.push({
   exId: exId,
   sets: clamp(n, 1, 12)
  });
  cur.order = (cur.order || []).concat([ exId ]);
 }
 saveWorkout(cur, quiet);
}

function dropFromSession(w, exId, quiet) {
 const cur = editWorkout(w.id) || thaw(w);
 cur.sets = (cur.sets || []).filter(x => x.exId !== exId);
 cur.items = (cur.items || []).filter(i => i.exId !== exId);
 cur.order = (cur.order || []).filter(id => id !== exId);
 saveWorkout(cur, quiet);
}

const NEXTLOAD = new Map;

function nextLoad(w, exId) {
 const k = w.id + ":" + exId;
 if (NEXTLOAD.has(k)) return NEXTLOAD.get(k);
 const prior = setsFor(w, exId);
 const seed = prior.length ? prior[prior.length - 1] : lastLoad(exId);
 return seed ? r1(seed.w) : 0;
}

function setNextLoad(w, exId, v) {
 NEXTLOAD.set(w.id + ":" + exId, Math.max(0, r1(+v || 0)));
}

function lastLoad(exId) {
 const h = exerciseHistory(exId);
 for (let i = h.length - 1; i >= 0; i--) if (h[i].w > 0) return h[i];
 return null;
}

function exerciseHistory(exId) {
 const out = [];
 [ ...WORKOUTS.values() ].sort((a, b) => a.d < b.d ? -1 : 1).forEach(w => setsFor(w, exId).forEach(s => out.push({
  d: w.d,
  wid: w.id,
  w: s.w || 0,
  reps: s.reps || 0,
  set: s,
  eff: setScore(s)
 })));
 return out;
}

function shuffleOrder(order) {
 const pat = id => exPat(exById(id));
 const clash = (a, b) => {
  const x = pat(a), y = pat(b);
  return x === y && (x === "push" || x === "pull");
 };
 const violations = a => {
  let n = 0;
  for (let i = 1; i < a.length; i++) if (clash(a[i - 1], a[i])) n++;
  return n;
 };
 const draw = () => {
  const a = order.slice();
  for (let i = a.length - 1; i > 0; i--) {
   const j = Math.floor(Math.random() * (i + 1));
   [a[i], a[j]] = [ a[j], a[i] ];
  }
  return a;
 };
 let best = draw(), bestV = violations(best);
 for (let k = 0; k < 80 && bestV > 0; k++) {
  const a = draw(), v = violations(a);
  if (v < bestV) {
   best = a;
   bestV = v;
  }
 }
 return best;
}

function openExercise(ex, preName) {
 const nm = el("input", {
  type: "text",
  value: ex ? ex.name : preName || "",
  placeholder: "e.g. Incline dumbbell press"
 });
 const part = el("select", {}, PARTS.map(p => el("option", {
  value: p.k,
  text: p.name,
  selected: ex && ex.part === p.k ? "" : null
 })));
 let sec = ex ? (ex.sec || []).map(x => ({
  ...x
 })) : [];
 const patNote = el("span", {
  class: "chip"
 });
 const secBox = el("div", {
  class: "box rows"
 });
 const paintPat = () => {
  const pat = (PART[part.value] || {}).pat || "core";
  patNote.textContent = pat.charAt(0).toUpperCase() + pat.slice(1);
 };
 const secAdd = el("button", {
  class: "btn sm",
  type: "button",
  text: "Add",
  onclick: () => addSec()
 });
 const paintSec = () => {
  secBox.innerHTML = "";
  secAdd.classList.toggle("hide", !sec.length);
  if (!sec.length) {
   secBox.appendChild(emptyAdd("Add a secondary muscle", addSec));
   return;
  }
  sec.forEach((s2, i) => {
   const share = el("input", {
    type: "number",
    min: "0",
    max: "100",
    step: "5",
    inputmode: "numeric",
    class: "pct-n",
    "aria-label": partName(s2.k) + " credit, percent",
    value: r0(shareOf(s2) * 100)
   });
   share.addEventListener("input", () => {
    s2.share = clamp((parseFloat(share.value) || 0) / 100, 0, 1);
   });
   secBox.appendChild(row({
    mark: el("span", {
     class: "sw",
     style: `--c:${PART_COLOR[s2.k]}`
    }),
    t1: partName(s2.k),
    tail: [ share, el("span", {
     class: "small muted",
     text: "%"
    }), el("button", {
     class: "btn sm bad icon",
     type: "button",
     html: ICONS.trash,
     "aria-label": "Remove " + partName(s2.k),
     onclick: () => {
      sec.splice(i, 1);
      paintSec();
     }
    }) ]
   }));
  });
 };
 const addSec = () => {
  const taken = new Set([ part.value ].concat(sec.map(x => x.k)));
  const free = PARTS.filter(p => !taken.has(p.k));
  if (!free.length) {
   toast("Every muscle is already on this one.");
   return;
  }
  const pick = el("select", {}, free.map(p => el("option", {
   value: p.k,
   text: p.name
  })));
  let pct = 50;
  const num = el("input", {
   type: "number",
   min: "0",
   max: "100",
   step: "5",
   inputmode: "numeric",
   class: "pct-n",
   "aria-label": "Credit, percent",
   value: String(pct)
  });
  const sl = el("input", {
   type: "range",
   min: "0",
   max: "100",
   step: "5",
   value: String(pct),
   class: "grow",
   "aria-label": "Credit"
  });
  const sync = (v, from) => {
   pct = clamp(Math.round(+v || 0), 0, 100);
   if (from !== "sl") sl.value = String(pct);
   if (from !== "num") num.value = String(pct);
  };
  sl.addEventListener("input", () => sync(sl.value, "sl"));
  num.addEventListener("input", () => sync(num.value, "num"));
  openModal({
   title: "Secondary muscle",
   body: [ labelled("Muscle", pick), el("div", {
    class: "bar mt"
   }, [ sl, num, el("span", {
    class: "small muted",
    text: "%"
   }) ]) ],
   footer: [ el("button", {
    class: "btn pri",
    type: "button",
    text: "Add",
    onclick: () => {
     sec.push({
      k: pick.value,
      share: pct / 100
     });
     closeModal();
     paintSec();
    }
   }) ]
  });
 };
 part.addEventListener("change", () => {
  sec = sec.filter(x => x.k !== part.value);
  paintPat();
  paintSec();
 });
 const save = () => {
  const name = nm.value.trim();
  if (!name) {
   toast("Name it.");
   return;
  }
  const back = !ex ? [ ...EXERCISES.values() ].find(x => x.retired && x.name.toLowerCase() === name.toLowerCase()) : null;
  const id = ex ? ex.id : back ? back.id : "x" + uid();
  saveExercise({
   id: id,
   name: name,
   part: part.value,
   seed: ex ? ex.seed : back ? back.seed : undefined,
   sec: sec.filter(x => x.k !== part.value && shareOf(x) > 0).map(x => ({
    k: x.k,
    share: shareOf(x)
   }))
  });
  closeModal();
  toast(ex ? "Updated" : "Exercise added");
 };
 openModal({
  save: save,
  title: ex ? "Edit exercise" : "New exercise",
  body: [ labelled("Name", nm), labelled("Primary muscle", part), el("div", {}, [ patNote ]), listHead("Secondary muscles worked", secAdd), secBox ],
  footer: [ ex ? el("button", {
   class: "btn bad icon",
   type: "button",
   html: ICONS.trash,
   "aria-label": "Delete",
   onclick: () => {
    const n = [ ...WPLANS.values() ].filter(p => (p.items || []).some(i => i.exId === ex.id)).length;
    const undo = deleteExercise(ex);
    closeModal();
    toastUndo(n ? `Deleted, ${n} workout${n > 1 ? "s" : ""} updated` : "Exercise deleted", undo);
   }
  }) : null, el("button", {
   class: "btn pri",
   type: "button",
   text: "Save",
   onclick: save
  }) ]
 });
 paintPat();
 paintSec();
}

const DOW_SHORT = [ "S", "M", "T", "W", "T", "F", "S" ];

const DOW_NAME = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];

function dueOn(iso) {
 const dow = dowOf(iso);
 const skipped = new Set(S.snooze[iso] || []);
 return (S.week[dow] || []).map(e => {
  if (skipped.has(e.k + ":" + e.id)) return null;
  const item = e.k === "plan" ? WPLANS.get(e.id) : PRESETS.get(e.id);
  return item ? {
   k: e.k,
   id: e.id,
   item: item
  } : null;
 }).filter(Boolean);
}

function snooze(iso, k, id, on) {
 const key = k + ":" + id;
 const cur = new Set(S.snooze[iso] || []);
 if (on === false) cur.delete(key); else cur.add(key);
 if (cur.size) S.snooze[iso] = [ ...cur ]; else delete S.snooze[iso];
 const cutoff = addDays(todayISO(), -14);
 Object.keys(S.snooze).forEach(d => {
  if (d < cutoff) delete S.snooze[d];
 });
 saveSettings();
}

function migrateSecShares() {
 let n = 0;
 [ ...EXERCISES.values() ].forEach(x => {
  if (!x.seed || !Array.isArray(x.sec)) return;
  if (!x.sec.some(s => s && s.share === .5)) return;
  const c = thaw(x);
  c.sec = c.sec.map(s => s && s.share === .5 ? {
   k: s.k
  } : s);
  saveExercise(c);
  n++;
 });
 return n;
}

function migrateRecurrence() {
 const empty = [ 0, 1, 2, 3, 4, 5, 6 ].every(i => !(S.week[i] || []).length);
 if (!empty) return false;
 let moved = 0;
 const put2 = (dow, k, id) => {
  S.week[dow] = S.week[dow] || [];
  if (!S.week[dow].some(e => e.k === k && e.id === id)) {
   S.week[dow].push({
    k: k,
    id: id
   });
   moved++;
  }
 };
 WPLANS.forEach(p => (p.days || []).forEach(d => put2(d, "plan", p.id)));
 PRESETS.forEach(p => (p.days || []).forEach(d => put2(d, "ride", p.id)));
 if (moved) saveSettings();
 return moved > 0;
}

function plansOn(iso) {
 return dueOn(iso).filter(e => e.k === "plan").map(e => e.item);
}

function presetsOn(iso) {
 return dueOn(iso).filter(e => e.k === "ride").map(e => e.item);
}

const modMark = (size, k) => planMark({
 color: RIDE_CAT,
 shape: MOD_SHAPE[k] || "circle"
}, size);

function rideFor(presetId, iso) {
 return [ ...RIDES.values() ].find(r => r.d === iso && r.presetId === presetId) || null;
}

function sessionFor(planId, iso) {
 return [ ...WORKOUTS.values() ].find(w => w.d === iso && w.done && (w.planId === planId || w.name === (WPLANS.get(planId) || {}).name)) || null;
}

function weekDaysFor(k, id) {
 const out = [];
 for (let i = 0; i < 7; i++) if ((S.week[i] || []).some(e => e.k === k && e.id === id)) out.push(i);
 return out;
}

function weekSet(dow, k, id, on) {
 const row = (S.week[dow] || []).filter(e => !(e.k === k && e.id === id));
 if (on) row.push({
  k: k,
  id: id
 });
 S.week[dow] = row;
 saveSettings();
}

function openWeekDay(dow) {
 const paint = () => {
  const box = el("div", {
   class: "box rows"
  });
  const line = (k, id, mark, name, sub) => {
   const on = (S.week[dow] || []).some(e => e.k === k && e.id === id);
   box.appendChild(row({
    mark: mark,
    t1: name,
    t2: sub,
    on: on,
    pressed: on,
    cbx: on,
    onclick: () => {
     weekSet(dow, k, id, !on);
     redraw();
    }
   }));
  };
  if (tracks("strength")) [ ...WPLANS.values() ].forEach(p => line("plan", p.id, planMark(planStyle(p), 15), p.name, `${p.items.length} exercises · ${p.items.reduce((a, i) => a + (i.sets || 3), 0)} sets`));
  if (tracks("cardio")) [ ...PRESETS.values() ].forEach(p => line("ride", p.id, rideMark(15, p), p.name || secsToHM(p.secs), presetLabel(p)));
  if (!box.children.length) box.appendChild(el("div", {
   class: "empty",
   text: "Nothing to put here yet."
  }));
  return box;
 };
 let host = paint();
 const redraw = () => {
  const n = paint();
  host.replaceWith(n);
  host = n;
  render();
 };
 openModal({
  title: DOW_NAME[dow],
  body: [ host ]
 });
}

function weekOverview() {
 const today = dowOf(todayISO());
 const grid = el("div", {
  class: "wkgrid"
 });
 weekOrder().forEach(i => {
  const entries = S.week[i] || [];
  const cell = el("button", {
   class: "wkday" + (i === today ? " now" : ""),
   type: "button",
   "aria-label": DOW_NAME[i] + ", " + (entries.length ? entries.length + " assigned" : "rest"),
   onclick: () => openWeekDay(i)
  }, [ el("span", {
   class: "dn",
   text: DOW_SHORT[i]
  }), el("span", {
   class: "mk"
  }, entries.length ? entries.slice(0, 3).map(e => e.k === "plan" ? planMark(planStyle(WPLANS.get(e.id) || {}), 11) : rideMark(11, PRESETS.get(e.id))) : [ el("span", {
   class: "rest",
   "aria-hidden": "true",
   text: "+"
  }) ]) ]);
  grid.appendChild(cell);
 });
 return grid;
}

let PLANDRAFT = null, PLANBASE = "";

function planDirty() {
 return !!PLANDRAFT && JSON.stringify(planShape(PLANDRAFT)) !== PLANBASE;
}

function planShape(d) {
 return {
  name: (d.name || "").trim(),
  color: d.color,
  shape: d.shape,
  items: (d.items || []).map(i => ({
   exId: i.exId,
   sets: i.sets
  }))
 };
}

function openPlan(plan) {
 PLANDRAFT = plan ? {
  id: plan.id,
  name: plan.name,
  items: plan.items.map(i => ({
   ...i
  })),
  color: plan.color,
  shape: plan.shape,
  isNew: false
 } : {
  id: "p" + uid(),
  name: "",
  items: [],
  isNew: true
 };
 PLANBASE = JSON.stringify(planShape(PLANDRAFT));
 go("planedit");
}

function leavePlanEdit() {
 if (!planDirty()) {
  PLANDRAFT = null;
  PLANBASE = "";
  back();
  return;
 }
 openModal({
  title: "Unsaved changes",
  body: [ el("div", {
   class: "note",
   text: "Save what you changed, or leave without saving?"
  }) ],
  footer: [ el("button", {
   class: "btn full",
   type: "button",
   text: "Keep editing",
   onclick: closeModal
  }), el("button", {
   class: "btn bad",
   type: "button",
   text: "Discard",
   onclick: () => {
    closeModal();
    PLANDRAFT = null;
    PLANBASE = "";
    back();
   }
  }), el("button", {
   class: "btn pri",
   type: "button",
   text: "Save",
   onclick: () => {
    if (!savePlanDraft()) return;
    const was = PLANDRAFT;
    closeModal();
    PLANDRAFT = null;
    PLANBASE = "";
    back();
    toast(was.isNew ? "Workout created" : "Workout saved");
   }
  }) ]
 });
}

function duplicatePlan(src) {
 const base = src || {};
 const st = nextPlanStyle();
 PLANDRAFT = {
  id: "p" + uid(),
  name: copyName(base.name || "Workout"),
  items: (base.items || []).map(i => ({
   ...i
  })),
  color: st.color,
  shape: st.shape,
  isNew: true
 };
 PLANBASE = JSON.stringify(planShape({
  name: "",
  items: []
 }));
 if (PAGE === "planedit") {
  window.scrollTo({
   top: 0
  });
  render();
 } else go("planedit");
 toast("Copied as " + PLANDRAFT.name);
}

function copyName(name) {
 const stem = name.replace(/\s+\d+$/, "");
 const taken = new Set([ ...WPLANS.values() ].map(p => p.name));
 let n = 2;
 while (taken.has(stem + " " + n)) n++;
 return stem + " " + n;
}

function savePlanDraft() {
 const d = PLANDRAFT;
 if (!d) return false;
 const name = (d.name || "").trim();
 if (!name) {
  toast("Name it.");
  return false;
 }
 if (!d.items.length) {
  toast("Add an exercise.");
  return false;
 }
 const style = d.color && d.shape ? {
  color: d.color,
  shape: d.shape
 } : nextPlanStyle();
 savePlan({
  id: d.id,
  name: name,
  items: d.items,
  color: style.color,
  shape: style.shape
 });
 return true;
}

VIEWS.planedit = function viewPlanEdit() {
 const root = $("#p-planedit");
 root.innerHTML = "";
 const d = PLANDRAFT;
 if (!d) {
  root.appendChild(el("div", {
   class: "sec"
  }, [ backLink() ]));
  return;
 }
 const nm = el("input", {
  type: "text",
  value: d.name,
  placeholder: "e.g. Push A"
 });
 nm.addEventListener("input", () => {
  d.name = nm.value;
 });
 root.appendChild(pageBar([ d.isNew ? null : el("button", {
  class: "btn sm",
  type: "button",
  text: "Duplicate",
  onclick: () => duplicatePlan(d)
 }), d.isNew ? null : el("button", {
  class: "btn sm bad icon",
  type: "button",
  html: ICONS.trash,
  "aria-label": "Delete workout",
  onclick: () => {
   const gone = WPLANS.get(d.id);
   if (gone) {
    const copy = thaw(gone);
    delPlan(d.id);
    toastUndo("Workout deleted", () => savePlan(copy));
   }
   PLANDRAFT = null;
   PLANBASE = "";
   back();
  }
 }) ], leavePlanEdit));
 if (!d.color || !d.shape) {
  const st = planStyle(d.isNew ? null : d);
  d.color = st.color;
  d.shape = st.shape;
 }
 const marks = markPicker({
  color: d.color,
  shape: d.shape
 }, v => {
  d.color = v.color;
  d.shape = v.shape;
 });
 root.appendChild(el("div", {
  class: "sec stack"
 }, [ labelled("Name", nm), field("Mark", marks) ]));
 const list = el("div", {
  class: "box" + (d.items.length ? " rows" : "")
 });
 if (!d.items.length) {
  list.appendChild(emptyAdd("Add exercises", () => {
   EXPICKFOR = "plan";
   go("expick");
  }));
 } else {
  d.items.forEach((it, idx) => {
   const ex = exById(it.exId);
   const setsIn = el("input", {
    type: "number",
    min: "1",
    max: "12",
    step: "1",
    inputmode: "numeric",
    class: "pct-n",
    "aria-label": "Sets",
    value: it.sets
   });
   setsIn.addEventListener("input", () => {
    it.sets = clamp(parseInt(setsIn.value) || 1, 1, 12);
   });
   const prow = row({
    mark: exIcon(ex, 22),
    t1: ex ? ex.name : "(deleted)",
    t2: ex ? exParts(ex).map(pp => partName(pp.k) + (pp.share < 1 ? " " + r0(pp.share * 100) + "%" : "")).join(" · ") : "",
    tail: [ setsIn, el("span", {
     class: "small muted",
     text: "sets"
    }), el("button", {
     class: "btn sm bad icon",
     type: "button",
     html: ICONS.trash,
     "aria-label": "Remove",
     onclick: () => {
      d.items.splice(idx, 1);
      render();
     }
    }) ]
   });
   const wrapRow = swipeScale(prow, {
    right: {
     max: 12,
     css: "var(--interactive)",
     fg: "var(--on-interactive)",
     hint: it.sets + " sets",
     label: k => k + " set" + (k === 1 ? "" : "s"),
     fn: k => {
      it.sets = clamp(k, 1, 12);
      render();
     }
    },
    left: {
     max: 1,
     css: "var(--danger)",
     fg: "var(--on-danger)",
     hint: "remove",
     label: () => "Remove",
     fn: () => {
      d.items.splice(idx, 1);
      render();
     }
    }
   });
   wrapRow.dataset.id = it.exId;
   list.appendChild(holdDrag(wrapRow, {
    drop: ids => {
     d.items = ids.map(id => d.items.find(x => x.exId === id)).filter(Boolean);
     render();
    }
   }));
  });
 }
 root.appendChild(sec("Exercises", d.items.length ? el("button", {
  class: "btn sm",
  type: "button",
  text: "Add",
  onclick: () => {
   EXPICKFOR = "plan";
   go("expick");
  }
 }) : null, [ list ]));
 root.appendChild(el("div", {
  class: "sec bar"
 }, [ el("button", {
  class: "btn pri wide",
  type: "button",
  text: d.isNew ? "Create workout" : "Save",
  onclick: () => {
   if (savePlanDraft()) {
    const was = PLANDRAFT;
    PLANDRAFT = null;
    PLANBASE = "";
    back();
    toast(was.isNew ? "Workout created" : "Workout saved");
   }
  }
 }) ]));
};

const EXGROUPS = [ [ "push", "Push" ], [ "pull", "Pull" ], [ "legs", "Legs" ], [ "core", "Core" ] ];

let EXOPEN = new Set;

const exPartOf = x => PARTS.some(p => p.k === x.part) ? x.part : "core";

function exFolds(exs, rowFor, o) {
 const q = (o && o.q || "").trim().toLowerCase();
 const hits = exs.filter(x => !q || x.name.toLowerCase().includes(q)).sort((a, b) => a.name < b.name ? -1 : 1);
 const out = [];
 EXGROUPS.forEach(([pat, title]) => {
  const box = el("div", {
   class: "box rows acc"
  });
  PARTS.filter(p => p.pat === pat).forEach(part => {
   const xs = hits.filter(x => exPartOf(x) === part.k);
   if (!xs.length) return;
   const open = !!q || EXOPEN.has(part.k);
   const tally = o && o.tally ? o.tally(xs) : null;
   box.appendChild(el("button", {
    class: "row acchd",
    type: "button",
    "aria-expanded": open ? "true" : "false",
    style: `--c:${PART_COLOR[part.k]}`,
    onclick: () => {
     if (q) return;
     if (EXOPEN.has(part.k)) EXOPEN.delete(part.k); else EXOPEN.add(part.k);
     if (o && o.repaint) o.repaint(); else render();
    }
   }, [ el("span", {
    class: "sw"
   }), el("span", {
    class: "nm"
   }, [ el("span", {
    class: "t1",
    text: part.name
   }) ]), tally ? el("span", {
    class: "cnt",
    text: tally
   }) : el("span", {
    class: "small muted mono",
    text: String(xs.length)
   }), el("span", {
    class: "chevron",
    html: open ? ICONS.up : ICONS.chevr
   }) ]));
   if (open) box.appendChild(el("div", {
    class: "accbody",
    style: `--c:${PART_COLOR[part.k]}`
   }, xs.map(rowFor)));
  });
  if (box.children.length) out.push(el("div", {
   class: "grouphd still",
   text: title
  }), box);
 });
 return out;
}

let EXPICKQ = "", EXPICKFOR = "plan";

VIEWS.expick = function viewExPick() {
 const root = $("#p-expick");
 root.innerHTML = "";
 const live = EXPICKFOR === "session" ? WORKOUTS.get(SESSION) : null;
 const d = live ? null : PLANDRAFT;
 if (!live && !d) {
  root.appendChild(el("div", {
   class: "sec"
  }, [ backLink() ]));
  return;
 }
 let repaint = () => {};
 const itemsOf = () => live ? (WORKOUTS.get(live.id) || live).items || [] : d.items;
 const countOf = exId => {
  const it = itemsOf().find(x => x.exId === exId);
  return it ? it.sets : 0;
 };
 const addSets = (exId, n) => {
  if (live) sessionSets(live, exId, n, true); else {
   const it = d.items.find(x => x.exId === exId);
   if (it) it.sets = clamp(it.sets + n, 1, 12); else d.items.push({
    exId: exId,
    sets: clamp(n, 1, 12)
   });
  }
  repaint();
 };
 const dropEx = exId => {
  if (live) dropFromSession(live, exId, true); else {
   const i = d.items.findIndex(x => x.exId === exId);
   if (i >= 0) d.items.splice(i, 1);
  }
  repaint();
 };
 root.appendChild(pageBar([ el("button", {
  class: "btn sm",
  type: "button",
  text: "New exercise",
  onclick: () => openExercise()
 }) ]));
 const list = el("div", {
  class: "reslist page"
 });
 const search = el("input", {
  type: "search",
  value: EXPICKQ,
  placeholder: "Search exercises…",
  "aria-label": "Search exercises"
 });
 const logBtn = el("button", {
  class: "btn logbtn",
  type: "button",
  onclick: () => {
   EXPICKQ = "";
   back();
  }
 }, [ icon("dumbbell"), el("span", {}) ]);
 const paintFoot = () => {
  const items = itemsOf();
  const picked = items.length, total = items.reduce((s, i) => s + i.sets, 0);
  logBtn.classList.toggle("pri", picked > 0);
  logBtn.lastChild.textContent = picked ? `${picked} · ${total}` : "Workout";
 };
 const paintList = () => {
  list.innerHTML = "";
  const q = EXPICKQ.trim().toLowerCase();
  const all = liveExercises();
  if (!all.some(x => !q || x.name.toLowerCase().includes(q))) {
   list.appendChild(emptyAdd(q ? `Create "${EXPICKQ.trim()}"` : "New exercise", () => openExercise(null, EXPICKQ.trim())));
   return;
  }
  exFolds(all, x => {
   const n = countOf(x.id);
   const line = row({
    mark: exIcon(x, 22),
    on: !!n,
    t1: x.name,
    t2: exParts(x).map(pp => partName(pp.k) + (pp.share < 1 ? " " + r0(pp.share * 100) + "%" : "")).join(" · "),
    cnt: n ? n + " set" + (n === 1 ? "" : "s") : null
   });
   line.addEventListener("click", () => addSets(x.id, 1));
   return swipeScale(line, {
    right: {
     max: 6,
     css: "var(--interactive)",
     fg: "var(--on-interactive)",
     hint: "sets",
     label: k => "+" + k + " set" + (k === 1 ? "" : "s"),
     fn: k => addSets(x.id, k)
    },
    left: n ? {
     max: 2,
     css: "var(--danger)",
     fg: "var(--on-danger)",
     hint: "remove",
     label: k => k === 1 ? "-1 set" : "remove",
     fn: k => {
      if (k === 1 && n > 1) addSets(x.id, -1); else dropEx(x.id);
     }
    } : null
   });
  }, {
   q: q,
   repaint: () => repaint(),
   tally: xs => {
    const sets = xs.reduce((t, x) => t + countOf(x.id), 0);
    return sets ? xs.length + " · " + sets + " set" + (sets === 1 ? "" : "s") : null;
   }
  }).forEach(n => list.appendChild(n));
 };
 repaint = () => {
  paintList();
  paintFoot();
 };
 search.addEventListener("input", () => {
  EXPICKQ = search.value;
  paintList();
 });
 root.appendChild(list);
 root.appendChild(el("div", {
  class: "botbar"
 }, [ el("div", {
  class: "botbar-in"
 }, [ search, logBtn ]) ]));
 repaint();
};

VIEWS.wplans = function viewPlans() {
 const root = $("#p-wplans");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 const plans = inOrder([ ...WPLANS.values() ], S.order.wplans, p => p.id);
 const pbox = el("div", {
  class: "box" + (plans.length ? " rows" : "")
 });
 if (!plans.length) pbox.appendChild(emptyAdd("New workout", () => openPlan()));
 plans.forEach(p => {
  const parts = [ ...new Set(p.items.map(i => (exById(i.exId) || {}).part).filter(Boolean)) ];
  const days = weekDaysFor("plan", p.id);
  const line = el("div", {
   class: "row split"
  }, [ el("button", {
   class: "pick",
   type: "button",
   onclick: () => openPlan(p)
  }, [ planMark(planStyle(p), 15), el("span", {
   class: "nm"
  }, [ el("span", {
   class: "t1",
   text: p.name
  }), el("span", {
   class: "t2",
   text: `${p.items.length} exercises · ` + `${p.items.reduce((s, i) => s + (i.sets || 3), 0)} sets · ` + parts.map(partName).join(", ")
  }), days.length ? el("span", {
   class: "t2",
   text: days.map(i => DOW_NAME[i].slice(0, 3)).join(" · ")
  }) : null ].filter(Boolean)) ]), el("button", {
   class: "btn sm go",
   type: "button",
   text: "Start",
   onclick: () => startWorkout(p)
  }) ]);
  const wrapRow = swipeRow(line, {
   right: {
    label: "Start",
    css: "var(--interactive)",
    fg: "var(--on-interactive)",
    fn: () => startWorkout(p)
   },
   left: [ {
    label: "Duplicate",
    css: "var(--ink2)",
    fg: "var(--bg)",
    fn: () => duplicatePlan(p)
   }, {
    label: "Delete",
    css: "var(--danger)",
    fg: "var(--on-danger)",
    fn: () => {
     const gone = thaw(p);
     delPlan(p.id);
     toastUndo("Workout deleted", () => savePlan(gone));
    }
   } ]
  });
  wrapRow.dataset.id = p.id;
  pbox.appendChild(holdDrag(wrapRow, {
   drop: ids => {
    S.order = {
     ...S.order,
     wplans: ids
    };
    saveSettings();
   }
  }));
 });
 root.appendChild(sec("Workouts", plans.length ? el("button", {
  class: "btn sm",
  type: "button",
  text: "New",
  onclick: () => openPlan()
 }) : null, [ pbox ]));
 root.appendChild(sec("Exercises", el("button", {
  class: "btn sm",
  type: "button",
  text: "New",
  onclick: () => openExercise()
 }), exFolds(liveExercises(), x => row({
  mark: exIcon(x, 22),
  t1: x.name,
  t2: exParts(x).map(p => partName(p.k) + (p.share < 1 ? " " + r0(p.share * 100) + "%" : "")).join(" · "),
  go: true,
  onclick: () => openExercise(x)
 }))));
};

function pruneEmptySessions(keep) {
 let n = 0;
 [ ...WORKOUTS.values() ].forEach(w => {
  if (w.done || w.id === keep) return;
  if ((w.sets || []).length) return;
  WORKOUTS.delete(w.id);
  del("workouts/" + w.id);
  n++;
  if (SESSION === w.id) SESSION = null;
 });
 if (n) {
  lsSave();
  render();
 }
 return n;
}

function autoFinishSessions() {
 const hrs = S.train && +S.train.autoFinishH || 0;
 if (!hrs) return 0;
 const cutoff = Date.now() - hrs * 36e5;
 let n = 0;
 [ ...WORKOUTS.values() ].forEach(w => {
  if (w.done || !(w.sets || []).length) return;
  const last = (w.sets || []).reduce((t, s) => s.t && s.t > t ? s.t : t, w.t || "00:00");
  const when = parseISO(w.d).getTime() + (parseInt(last.slice(0, 2), 10) || 0) * 36e5 + (parseInt(last.slice(3, 5), 10) || 0) * 6e4;
  if (when > cutoff) return;
  const cur = editWorkout(w.id);
  if (!cur) return;
  cur.done = true;
  cur.endedAt = last;
  saveWorkout(cur);
  n++;
 });
 return n;
}

function startWorkout(plan) {
 pruneEmptySessions();
 const held = [ ...WORKOUTS.values() ].find(w => !w.done && (w.sets || []).length);
 if (held) {
  const n = (held.sets || []).length;
  openModal({
   title: "A workout is already open",
   body: [ el("div", {
    class: "note",
    text: `${held.name} · ${n} set${n === 1 ? "" : "s"} logged, not finished.`
   }) ],
   footer: [ el("button", {
    class: "btn",
    type: "button",
    text: "Start anyway",
    onclick: () => {
     closeModal();
     reallyStart(plan);
    }
   }), el("button", {
    class: "btn pri",
    type: "button",
    text: "Back to it",
    onclick: () => {
     closeModal();
     SESSION = held.id;
     go("session");
    }
   }) ]
  });
  return;
 }
 reallyStart(plan);
}

function reallyStart(plan) {
 const id = "w" + uid();
 const w = {
  id: id,
  d: todayISO(),
  t: nowHM(),
  planId: plan.id,
  name: plan.name,
  items: plan.items.map(i => ({
   ...i
  })),
  order: plan.items.map(i => i.exId),
  sets: [],
  done: false
 };
 saveWorkout(w);
 SESSION = id;
 go("session");
}

let SESSION = null;

const RESTKEY = "ledgerscale.rest";

let RESTTICK = 0;

function restStart() {
 try {
  localStorage.setItem(RESTKEY, String(Date.now()));
 } catch (e) {}
 restPaint();
}

function restClear() {
 try {
  localStorage.removeItem(RESTKEY);
 } catch (e) {}
 restPaint();
}

function restLeft() {
 let t0 = 0;
 try {
  t0 = +localStorage.getItem(RESTKEY) || 0;
 } catch (e) {}
 if (!t0) return null;
 const left = restMs() - (Date.now() - t0);
 if (left < -36e5) {
  try {
   localStorage.removeItem(RESTKEY);
  } catch (e) {}
  return null;
 }
 return left;
}

function restPaint() {
 const host = document.getElementById("restclock");
 clearTimeout(RESTTICK);
 if (!host) return;
 const left = restLeft();
 if (left === null) {
  host.innerHTML = "";
  host.classList.remove("on", "done");
  return;
 }
 const over = left <= 0;
 const secs = Math.max(0, Math.round(Math.abs(left) / 1e3));
 const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
 host.innerHTML = "";
 host.className = "restclock on" + (over ? " done" : "");
 host.appendChild(el("span", {
  class: "bar",
  style: over ? "--w:100%" : `--w:${(100 - left / restMs() * 100).toFixed(1)}%`
 }));
 host.appendChild(el("span", {
  class: "t mono",
  text: (over ? "+" : "") + mm + ":" + ss
 }));
 host.appendChild(el("span", {
  class: "lb",
  text: over ? "since the last set" : "rest"
 }));
 host.appendChild(el("button", {
  class: "btn sm",
  type: "button",
  text: "Reset",
  onclick: ev => {
   ev.stopPropagation();
   restStart();
  }
 }));
 host.appendChild(el("button", {
  class: "btn sm",
  type: "button",
  "aria-label": "Clear the timer",
  html: ICONS.x,
  onclick: ev => {
   ev.stopPropagation();
   restClear();
  }
 }));
 RESTTICK = setTimeout(restPaint, 1e3);
}

function openSetEditor(w, exId) {
 const host = el("div", {});
 const hist = exerciseHistory(exId).filter(h => h.wid !== w.id);
 const last = hist.length ? hist[hist.length - 1] : null;
 const writeSet = (id, patch) => {
  const cur = editWorkout(w.id);
  if (!cur) return;
  cur.sets = (cur.sets || []).map(s => s.id === id ? {
   ...s,
   ...patch
  } : s);
  saveWorkout(cur, true);
 };
 const dropSet = id => {
  const cur = editWorkout(w.id);
  if (!cur) return;
  const gone = (cur.sets || []).find(s => s.id === id);
  cur.sets = (cur.sets || []).filter(s => s.id !== id);
  saveWorkout(cur, true);
  paint();
  toastUndo("Set removed", () => {
   const back = editWorkout(w.id);
   if (!back || !gone) return;
   back.sets = (back.sets || []).concat([ gone ]);
   saveWorkout(back, true);
   paint();
  });
 };
 function setRow(s, i) {
  const st = trainStyle();
  if (st === "sessions") return el("div", {
   class: "box pad"
  }, [ el("div", {
   class: "bar"
  }, [ el("span", {
   class: "hd grow",
   text: "Set " + (i + 1)
  }), el("span", {
   class: "small muted mono",
   text: s.t || ""
  }), el("button", {
   class: "btn sm bad icon",
   type: "button",
   html: ICONS.trash,
   "aria-label": "Remove set " + (i + 1),
   onclick: () => dropSet(s.id)
  }) ]) ]);
  const shown = dispLoad(s.w);
  const reach = loadStep() * 12;
  const wD = rangeDial({
   min: Math.max(0, r1(shown - reach)),
   max: r1(shown + reach),
   step: loadStep(),
   value: r1(shown),
   compact: true,
   open: true,
   label: `Set ${i + 1} weight`,
   fmt: v => r1(v) + " " + loadUnit(),
   onCommit: v => {
    if (v !== null) writeSet(s.id, {
     w: r2(loadFromDisp(v))
    });
   }
  });
  const rD = st === "eff" ? null : rangeDial({
   min: 1,
   max: 30,
   step: 1,
   value: s.reps,
   compact: true,
   open: true,
   label: `Set ${i + 1} reps`,
   fmt: v => v + " rep" + (v === 1 ? "" : "s"),
   onCommit: v => {
    if (v !== null) writeSet(s.id, {
     reps: v
    });
   }
  });
  const eD = asksEff() ? rangeDial({
   min: 0,
   max: 5,
   step: 1,
   value: s.eff === undefined ? "" : s.eff,
   compact: true,
   open: true,
   label: `Set ${i + 1} effective reps`,
   fmt: v => v + " eff",
   onCommit: v => {
    if (v !== null) writeSet(s.id, {
     eff: v
    });
   }
  }) : null;
  return el("div", {
   class: "box pad"
  }, [ el("div", {
   class: "bar"
  }, [ el("span", {
   class: "hd grow",
   text: "Set " + (i + 1)
  }), el("span", {
   class: "small muted mono",
   text: s.t || ""
  }), el("button", {
   class: "btn sm bad icon",
   type: "button",
   html: ICONS.trash,
   "aria-label": "Remove set " + (i + 1),
   onclick: () => dropSet(s.id)
  }) ]), el("div", {
   class: "grid2 mt"
  }, [ field(loadCaption(), wD), rD ? field("Reps", rD) : field("Effective reps", eD) ]) ].filter(Boolean));
 }
 function paint() {
  const cur = WORKOUTS.get(w.id) || w;
  const mine = setsFor(cur, exId);
  host.innerHTML = "";
  if (!mine.length) {
   host.appendChild(el("div", {
    class: "box empty",
    text: "Nothing logged for this lift yet. Pull the row right to log a set."
   }));
  } else {
   mine.forEach((s, i) => host.appendChild(setRow(s, i)));
   const eff = r1(mine.reduce((a, s) => a + setScore(s), 0));
   const top = Math.max(...mine.map(s => s.w || 0));
   host.appendChild(el("div", {
    class: "box pad"
   }, [ kv("Sets", String(mine.length)), kv("Top weight", fmtLoad(top) + " " + loadUnit()), kv(metric().name, metric().fmt(eff)), last ? kv("Last session", setLabel(last.set, true)) : null ].filter(Boolean)));
  }
 }
 paint();
 openModal({
  title: exName(exId),
  body: [ host ],
  footer: [ el("button", {
   class: "btn bad",
   type: "button",
   text: "Remove exercise",
   onclick: () => {
    const gone = thaw(WORKOUTS.get(w.id) || w);
    closeModal();
    dropFromSession(w, exId);
    toastUndo("Off this workout", () => saveWorkout(gone));
   }
  }) ]
 });
}

function openSet(w, exId, existing) {
 if (trainStyle() === "sessions" && !existing) {
  openSetEditor(w, exId);
  return;
 }
 const st = trainStyle();
 const hist = exerciseHistory(exId).filter(h => h.wid !== w.id);
 const last = hist.length ? hist[hist.length - 1] : null;
 const prior = setsFor(w, exId);
 const seed = prior.length ? prior[prior.length - 1] : last;
 const stored = existing ? existing.w : nextLoad(w, exId) || (seed ? seed.w : null);
 const centre = stored > 0 ? dispLoad(stored) : 0;
 const reach = loadStep() * 12;
 const wDial = centre > 0 ? rangeDial({
  min: Math.max(0, r1(centre - reach)),
  max: r1(centre + reach),
  step: loadStep(),
  unit: "",
  compact: true,
  label: loadCaption(),
  value: r1(centre),
  onChange: () => calc()
 }) : null;
 const wIn = wDial ? wDial.input : el("input", {
  type: "number",
  step: String(loadStep()),
  min: "0",
  inputmode: "decimal",
  value: centre > 0 ? r1(centre) : ""
 });
 const rDial = st === "eff" ? null : rangeDial({
  min: 1,
  max: 30,
  step: 1,
  unit: "",
  compact: true,
  label: "Reps",
  value: existing ? existing.reps : "",
  placeholder: "reps",
  onChange: () => calc()
 });
 const rIn = rDial ? rDial.input : null;
 const eDial = asksEff() ? rangeDial({
  min: 0,
  max: 5,
  step: 1,
  unit: "",
  compact: true,
  label: "Effective reps",
  value: existing && existing.eff >= 0 && existing.eff !== undefined ? existing.eff : "",
  placeholder: "eff",
  onChange: () => calc()
 }) : null;
 const eIn = eDial ? eDial.input : null;
 const out = el("div", {
  class: "box pad"
 });
 const calc = () => {
  out.innerHTML = "";
  if (eIn) out.appendChild(el("div", {
   class: "big mono",
   text: (parseInt(eIn.value) || 0) + " effective"
  }));
  if (last) {
   out.appendChild(el("hr", {
    class: "hr"
   }));
   out.appendChild(kv("Last time", setLabel(last.set, true)));
   const dw = (+wIn.value || 0) - dispLoad(last.w);
   if (+wIn.value && Math.abs(dw) > .01) out.appendChild(kv("On the bar", signed(dw, 1) + " " + loadUnit()));
  }
 };
 [ wIn, rIn, eIn ].filter(Boolean).forEach(i => i.addEventListener("input", calc));
 const save = () => {
  const shown = parseFloat(wIn.value), reps = rIn ? parseInt(rIn.value) : NaN;
  const eff = eIn ? parseInt(eIn.value) : NaN;
  if (rIn && !(reps > 0)) {
   toast("How many reps?");
   return;
  }
  if (eIn && !(eff >= 0)) {
   toast("How many effective reps?");
   return;
  }
  const rec = {
   id: existing ? existing.id : uid(),
   exId: exId,
   w: isFinite(shown) ? r2(loadFromDisp(shown)) : 0,
   t: nowHM(),
   ...reps > 0 ? {
    reps: reps
   } : existing && existing.reps ? {
    reps: existing.reps
   } : {},
   ...eff >= 0 ? {
    eff: eff
   } : existing && existing.eff !== undefined ? {
    eff: existing.eff
   } : {}
  };
  const cur = editWorkout(w.id) || thaw(w);
  cur.sets = existing ? (cur.sets || []).map(s => s.id === existing.id ? rec : s) : (cur.sets || []).concat([ rec ]);
  closeModal();
  saveWorkout(cur);
  if (!existing) restStart();
  toast(eIn ? setEff(rec) + " effective reps" : "Set logged");
 };
 openModal({
  save: save,
  title: exName(exId),
  body: [ el("div", {
   class: "grid2"
  }, [ wDial ? field(loadCaption(), wDial) : labelled(loadCaption(), wIn), rDial ? field("Reps", rDial) : field("Effective reps", eDial) ]), out, prior.length ? el("div", {
   class: "small muted",
   text: "This session: " + prior.map(s => setLabel(s)).join(", ")
  }) : null ].filter(Boolean),
  footer: [ existing ? el("button", {
   class: "btn bad icon",
   type: "button",
   html: ICONS.trash,
   "aria-label": "Remove set",
   onclick: () => {
    const cur = editWorkout(w.id) || thaw(w);
    cur.sets = (cur.sets || []).filter(s => s.id !== existing.id);
    closeModal();
    saveWorkout(cur);
    toast("Set removed");
   }
  }) : el("button", {
   class: "btn bad",
   type: "button",
   text: "Remove exercise",
   onclick: () => {
    const gone = thaw(WORKOUTS.get(w.id) || w);
    closeModal();
    dropFromSession(w, exId);
    toastUndo("Off this workout", () => saveWorkout(gone));
   }
  }), el("button", {
   class: "btn pri",
   type: "button",
   text: "Save",
   onclick: save
  }) ].filter(Boolean)
 });
 const first = existing ? wIn : prior.length ? rIn || eIn : wIn;
 try {
  first.focus();
  first.select();
 } catch (e) {}
 setTimeout(() => {
  if (document.activeElement !== first) {
   try {
    first.focus();
   } catch (e) {}
  }
 }, 60);
 calc();
}

VIEWS.session = function viewSession() {
 const root = $("#p-session");
 root.innerHTML = "";
 const w = WORKOUTS.get(SESSION);
 if (!w) {
  root.appendChild(el("div", {
   class: "sec"
  }, [ backLink() ]));
  root.appendChild(el("div", {
   class: "box empty",
   text: "That workout is gone."
  }));
  return;
 }
 const t = workoutTotals(w);
 root.appendChild(pageBar([ w.done ? null : el("button", {
  class: "btn sm",
  type: "button",
  "aria-label": "Shuffle the order",
  onclick: () => {
   const cur = editWorkout(w.id);
   if (!cur) return;
   cur.order = shuffleOrder(t.items.map(i => i.exId));
   saveWorkout(cur);
   toast("Order shuffled");
  }
 }, [ icon("shuffle"), el("span", {
  text: "Shuffle"
 }) ]), el("button", {
  class: "btn sm",
  type: "button",
  onclick: () => {
   EXPICKFOR = "session";
   EXPICKQ = "";
   go("expick");
  }
 }, [ icon("add"), el("span", {
  text: "Exercise"
 }) ]) ]));
 if (w.done) {
  const dIn = el("input", {
   type: "date",
   value: w.d,
   max: todayISO()
  });
  const tIn = el("input", {
   type: "time",
   value: w.t || "18:00"
  });
  const move = () => {
   const cur = editWorkout(w.id);
   if (!cur) return;
   cur.d = dIn.value || cur.d;
   cur.t = tIn.value || cur.t;
   saveWorkout(cur);
   toast("Moved to " + fmtDate(cur.d, true));
  };
  [ dIn, tIn ].forEach(i => i.addEventListener("change", move));
  root.appendChild(el("div", {
   class: "sec"
  }, [ el("div", {
   class: "grid2"
  }, [ labelled("Day", dIn), labelled("Started", tIn) ]) ]));
 }
 const frac = t.wantSets ? clamp(t.sets / t.wantSets, 0, 1) : 0;
 root.appendChild(el("div", {
  class: "sec"
 }, [ el("div", {
  class: "box pad bar wide-gap"
 }, [ el("span", {
  class: "fixed"
 }, [ progSquare(frac, 78, r0(frac * 100) + "%") ]), el("span", {
  class: "grow"
 }, [ el("div", {
  class: "hd",
  text: w.name
 }), el("div", {
  class: "small muted",
  text: `${t.doneItems} of ${t.items.length} exercises · ${t.sets} of ${t.wantSets} sets`
 }), el("div", {
  class: "big mono mt",
  text: fmtMetric(t.eff)
 }), el("div", {
  class: "small muted",
  text: metric().lower + " so far"
 }) ]) ]), el("div", {
  id: "restclock",
  class: "restclock"
 }) ]));
 const stream = el("div", {
  class: "box rows"
 });
 t.items.forEach(it => {
  const ex = exById(it.exId);
  const pc = it.want ? clamp(it.done / it.want, 0, 1) : 0;
  let load = nextLoad(w, it.exId);
  const step = loadStep();
  let shown = load > 0 ? r1(dispLoad(load)) : 0;
  const wIn = el("input", {
   type: "number",
   step: String(step),
   min: "0",
   inputmode: "decimal",
   value: shown || "",
   "aria-label": "Weight for the next set of " + (ex ? ex.name : "")
  });
  const commit = () => {
   load = loadFromDisp(shown);
   setNextLoad(w, it.exId, load);
  };
  const nudge = d => {
   shown = Math.max(0, r1((parseFloat(wIn.value) || 0) + d));
   wIn.value = shown || "";
   commit();
  };
  wIn.addEventListener("input", () => {
   shown = Math.max(0, parseFloat(wIn.value) || 0);
   commit();
  });
  const wctl = el("div", {
   class: "wctl"
  }, [ el("button", {
   class: "nb",
   type: "button",
   "aria-label": step + " less",
   text: "−",
   onclick: () => nudge(-step)
  }), wIn, el("button", {
   class: "nb",
   type: "button",
   "aria-label": step + " more",
   text: "+",
   onclick: () => nudge(step)
  }) ]);
  const line = el("div", {
   class: "row split tall" + (it.complete ? " done" : "")
  }, [ el("button", {
   class: "pick",
   type: "button",
   onclick: () => openSetEditor(w, it.exId)
  }, [ el("span", {
   class: "cbx" + (it.complete ? " on" : ""),
   html: ICONS.tick
  }), exIcon(ex, 20), el("span", {
   class: "nm"
  }, [ el("span", {
   class: "t1",
   text: ex ? ex.name : "(deleted)"
  }), el("span", {
   class: "t2",
   text: `${partName(ex ? ex.part : "")} · ${it.done}/${it.want} sets` + (it.sets.length ? "  ·  " + it.sets.map(s => setLabel(s)).join(", ") : lastLoad(it.exId) ? "  ·  last " + fmtLoad(lastLoad(it.exId).w) + " " + loadUnit() : "")
  }), el("span", {
   class: "pbar"
  }, [ el("span", {
   class: "fl",
   style: `--w:${(pc * 100).toFixed(0)}%;--c:${PART_COLOR[ex ? ex.part : "core"] || "var(--ink2)"}`
  }) ]) ]) ]), trainStyle() === "sessions" ? null : wctl ].filter(Boolean));
  const st = trainStyle(), lvTxt = () => nextLoad(w, it.exId) ? fmtLoad(nextLoad(w, it.exId)) : "?";
  const srow = swipeScale(line, {
   right: st === "sessions" ? {
    max: 1,
    css: "var(--interactive)",
    fg: "var(--on-interactive)",
    hint: "set",
    label: () => "Set done",
    fn: () => {
     quickSet(w, it.exId, 1);
     toast("Set logged");
    }
   } : st === "eff" ? {
    max: 5,
    css: "var(--interactive)",
    fg: "var(--on-interactive)",
    hint: () => lvTxt() + " " + loadUnit(),
    label: k => `${lvTxt()} · ${k} eff`,
    fn: k => {
     const lv = nextLoad(w, it.exId);
     quickSet(w, it.exId, k, lv);
     toast(`${fmtLoad(lv || 0)} · ${k} eff logged`);
    }
   } : {
    max: 15,
    css: "var(--interactive)",
    fg: "var(--on-interactive)",
    hint: () => (nextLoad(w, it.exId) ? fmtLoad(nextLoad(w, it.exId)) : "set") + " " + loadUnit(),
    label: k => `${nextLoad(w, it.exId) ? fmtLoad(nextLoad(w, it.exId)) : "?"} × ${k}`,
    fn: k => {
     const lv = nextLoad(w, it.exId);
     quickSet(w, it.exId, k, lv);
     toast(`${fmtLoad(lv || 0)} × ${k} logged`);
    }
   },
   left: {
    max: Math.max(1, it.done) + 1,
    css: "var(--danger)",
    fg: "var(--on-danger)",
    hint: "remove",
    label: k => k > it.done ? "Off this workout" : `-${k} set${k === 1 ? "" : "s"}`,
    fn: k => {
     if (k > it.done) {
      const gone = thaw(WORKOUTS.get(w.id) || w);
      dropFromSession(w, it.exId);
      toastUndo("Off this workout", () => saveWorkout(gone));
     } else {
      dropSets(w, it.exId, k);
      toast(`${k} set${k === 1 ? "" : "s"} removed`);
     }
    }
   }
  });
  srow.dataset.id = it.exId;
  stream.appendChild(holdDrag(srow, {
   drop: ids => {
    const cur = editWorkout(w.id);
    if (!cur) return;
    if (ids.join() === t.items.map(x => x.exId).join()) {
     render();
     return;
    }
    cur.order = ids;
    saveWorkout(cur);
   }
  }));
 });
 if (!t.items.length) stream.appendChild(emptyAdd("Add exercises", () => {
  EXPICKFOR = "session";
  EXPICKQ = "";
  go("expick");
 }));
 root.appendChild(sec("The workout", null, [ stream ]));
 setTimeout(restPaint, 0);
 root.appendChild(el("div", {
  class: "sec bar"
 }, w.done ? [ el("button", {
  class: "btn bad",
  type: "button",
  text: "Reopen",
  onclick: () => {
   const cur = editWorkout(w.id);
   if (!cur) return;
   cur.done = false;
   delete cur.endedAt;
   saveWorkout(cur);
   toast("Back in progress");
  }
 }), el("button", {
  class: "btn pri grow",
  type: "button",
  text: "Done",
  onclick: () => {
   REPORT = w.id;
   SESSION = null;
   go("wreport");
  }
 }) ] : [ el("button", {
  class: "btn bad",
  type: "button",
  text: "Discard",
  onclick: () => {
   const gone = thaw(w);
   delWorkout(w.id);
   SESSION = null;
   goRoot("workouts");
   toastUndo("Workout discarded", () => saveWorkout(gone));
  }
 }), el("button", {
  class: "btn pri grow",
  type: "button",
  text: "Finish",
  onclick: () => {
   if (!(w.sets || []).length) {
    toast("Log a set first.");
    return;
   }
   const cur = editWorkout(w.id);
   if (!cur) return;
   cur.done = true;
   cur.endedAt = nowHM();
   saveWorkout(cur);
   REPORT = cur.id;
   SESSION = null;
   go("wreport");
  }
 }) ]));
};

let REPORT = null;

function priorSession(w) {
 return workoutList().find(x => x.id !== w.id && x.done && (x.planId === w.planId || x.name === w.name) && x.d + (x.t || "") < w.d + (w.t || "")) || null;
}

VIEWS.wreport = function viewReport() {
 const root = $("#p-wreport");
 root.innerHTML = "";
 const w = WORKOUTS.get(REPORT);
 if (!w) {
  root.appendChild(el("div", {
   class: "sec"
  }, [ backLink() ]));
  root.appendChild(el("div", {
   class: "box empty",
   text: "No workout selected."
  }));
  return;
 }
 root.appendChild(pageBar([ el("button", {
  class: "btn sm",
  type: "button",
  onclick: () => {
   SESSION = w.id;
   go("session");
  }
 }, [ icon("pen", 14), el("span", {
  text: "Edit"
 }) ]), el("button", {
  class: "btn sm bad icon",
  type: "button",
  html: ICONS.trash,
  "aria-label": "Delete workout",
  onclick: () => {
   const gone = thaw(w);
   openModal({
    title: "Delete this workout",
    body: [ el("div", {
     class: "note",
     text: `${w.name} · ${fmtDate(w.d, true)} · ${workoutTotals(w).sets} sets`
    }) ],
    footer: [ el("button", {
     class: "btn",
     type: "button",
     text: "Keep",
     onclick: closeModal
    }), holdButton("Delete", () => {
     closeModal();
     if (SESSION === w.id) SESSION = null;
     REPORT = null;
     delWorkout(gone.id);
     goRoot("workouts");
     toastUndo("Workout deleted", () => saveWorkout(gone));
    }) ]
   });
  }
 }) ]));
 const t = workoutTotals(w), prev = priorSession(w), pt = prev ? workoutTotals(prev) : null;
 const delta = (now, before, dp) => before === null || before === undefined || !isFinite(before) ? null : signed(now - before, dp === undefined ? 0 : dp);
 root.appendChild(el("div", {
  class: "sec"
 }, [ el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "big mono",
  text: fmtMetricLong(t.eff)
 }), el("div", {
  class: "small muted",
  text: `${w.name} · ${fmtDate(w.d, true)}` + (prev ? ` · against ${fmtDate(prev.d)}` : " · first one of these")
 }), el("hr", {
  class: "hr"
 }), kv("Sets", String(t.sets) + (pt ? `   (${delta(t.sets, pt.sets)})` : "")), kv("Exercises finished", `${t.doneItems} of ${t.items.length}`) ]) ]));
 const parts = Object.keys(t.byPart);
 if (parts.length) {
  const box = el("div", {
   class: "box rows"
  });
  parts.sort((a, b) => t.byPart[b].eff - t.byPart[a].eff).forEach(k => {
   const p = t.byPart[k], q = pt && pt.byPart[k];
   box.appendChild(row({
    mark: el("span", {
     class: "sw",
     style: `--c:${PART_COLOR[k]}`
    }),
    t1: partName(k),
    t2: `${p.sets} sets · top ${fmtLoad(p.top)} ${loadUnit()}`,
    val: r1(p.eff),
    lead: true,
    tail: q ? [ el("span", {
     class: "small muted delta",
     text: delta(p.eff, q.eff, 1)
    }) ] : [],
    go: true,
    onclick: () => openPartReport(w, k)
   }));
  });
  root.appendChild(sec("By body part", null, [ box ]));
 }
 const exBox = el("div", {
  class: "box rows"
 });
 t.items.filter(i => i.sets.length).forEach(i => {
  const mine = i.sets;
  const top = Math.max(...mine.map(s => s.w || 0));
  const eff = r1(mine.reduce((s, x) => s + setScore(x), 0));
  const before = prev ? setsFor(prev, i.exId) : [];
  const bTop = before.length ? Math.max(...before.map(s => s.w || 0)) : null;
  const bEff = before.length ? before.reduce((s, x) => s + setScore(x), 0) : null;
  exBox.appendChild(row({
   mark: exIcon(exById(i.exId), 22),
   t1: exName(i.exId),
   t2: el("span", {
    class: "t2"
   }, [ el("span", {
    class: "line",
    text: mine.map(s => setLabel(s)).join(", ")
   }), bTop !== null ? el("span", {
    class: "line",
    text: `last time ${fmtLoad(bTop)} ${loadUnit()} top · ${fmtMetric(bEff)}` + (top !== bTop ? `  (${signed(dispLoad(top) - dispLoad(bTop), 1)} ${loadUnit()})` : "")
   }) : null ].filter(Boolean)),
   val: fmtMetric(eff),
   go: true,
   onclick: () => openExerciseTrend(i.exId)
  }));
 });
 root.appendChild(sec("By exercise", null, [ exBox ]));
 const notes = [];
 if (pt) {
  const de = t.eff - pt.eff;
  notes.push(Math.abs(de) < 1 ? capFirst(metric().lower) + " level with last time." : `${de > 0 ? "+" : "−"}${fmtMetric(Math.abs(de))} against last time.`);
  const gains = [];
  t.items.filter(i => i.sets.length).forEach(i => {
   const before = prev ? setsFor(prev, i.exId) : [];
   if (!before.length) return;
   const top = Math.max(...i.sets.map(s => s.w || 0));
   const bTop = Math.max(...before.map(s => s.w || 0));
   if (top > bTop + .01) gains.push(exName(i.exId) + " " + signed(dispLoad(top) - dispLoad(bTop), 1) + " " + loadUnit());
  });
  if (gains.length) notes.push("More on the bar: " + gains.join(", ") + ".");
 }
 const heavy = Object.entries(t.byPart).sort((a, b) => b[1].eff - a[1].eff)[0];
 if (heavy) notes.push(`${partName(heavy[0])} took the most work at ${fmtMetric(heavy[1].eff)}.`);
 const missed = t.items.filter(i => !i.complete).length;
 if (missed) notes.push(`${missed} exercise${missed === 1 ? "" : "s"} left unfinished.`);
 if (notes.length) root.appendChild(sec("Worth noticing", null, [ el("div", {
  class: "box pad stack tight"
 }, notes.map(n => el("div", {
  class: "small",
  text: n
 }))) ]));
};

function loadBars(series, color) {
 const W = 320, H = 96, PL = 6, PR = 6, PT = 16, PB = 16;
 const IW = W - PL - PR, H1 = H - PT - PB;
 const vals = series.map(r => r.v);
 const lo = Math.min(...vals), hi = Math.max(...vals);
 const pad = Math.max((hi - lo) * .9, hi * .04, 1);
 const floor = Math.max(0, lo - pad), top = hi + pad * .5;
 const y = v => PT + H1 - (v - floor) / (top - floor || 1) * H1;
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: "100%",
  preserveAspectRatio: "none",
  role: "img",
  style: "height:" + H + "px"
 });
 const n = series.length, slot = IW / n, bw = Math.min(46, slot * .5);
 svg.appendChild(svgEl("line", {
  class: "gl",
  x1: PL,
  x2: W - PR,
  y1: PT + H1,
  y2: PT + H1
 }));
 series.forEach((r, i) => {
  const cx = PL + slot * i + slot / 2, yy = y(r.v);
  svg.appendChild(svgEl("rect", {
   x: cx - bw / 2,
   y: yy,
   width: bw,
   height: Math.max(2, PT + H1 - yy),
   fill: color
  }));
  const v = svgEl("text", {
   class: "ax",
   x: cx,
   y: yy - 5,
   "text-anchor": "middle"
  });
  v.textContent = fmtLoad(r.v);
  svg.appendChild(v);
  const d = svgEl("text", {
   class: "ax",
   x: cx,
   y: H - 3,
   "text-anchor": "middle"
  });
  d.textContent = fmtDate(r.d);
  svg.appendChild(d);
 });
 return el("div", {
  class: "chart"
 }, [ svg ]);
}

function openPartReport(w, partK) {
 const by = new Map;
 (w.sets || []).forEach(s => {
  const ex = exById(s.exId);
  if (!ex) return;
  const hit = exParts(ex).find(x => x.k === partK);
  if (!hit) return;
  const cur = by.get(ex.id) || {
   name: ex.name,
   eff: 0,
   sets: 0,
   top: 0,
   share: hit.share
  };
  cur.eff += setScore(s) * hit.share;
  cur.sets++;
  if (hit.share >= 1) cur.top = Math.max(cur.top, s.w || 0);
  by.set(ex.id, cur);
 });
 const lifts = [ ...by.entries() ].sort((a, b) => b[1].eff - a[1].eff);
 const total = lifts.reduce((s, [, x]) => s + x.eff, 0);
 const effBox = el("div", {
  class: "box pad"
 });
 if (lifts.length) {
  effBox.appendChild(el("div", {
   class: "big mono",
   text: fmtMetric(total)
  }));
  effBox.appendChild(el("div", {
   class: "small muted",
   text: partName(partK) + " this session"
  }));
  const hi = Math.max(...lifts.map(([, x]) => x.eff)) || 1;
  const rows = el("div", {
   class: "mt stack tight"
  });
  lifts.forEach(([id, x], i) => {
   rows.appendChild(el("div", {}, [ el("div", {
    class: "bar liftline"
   }, [ exIcon(exById(id), 20), el("span", {
    class: "grow clip",
    text: x.name
   }), el("span", {
    class: "mono",
    text: r1(x.eff)
   }), el("span", {
    class: "small muted delta",
    text: Math.round(x.share * 100) + "%"
   }) ]), el("span", {
    class: "pbar mid"
   }, [ el("span", {
    class: "fl",
    style: `--w:${(x.eff / hi * 100).toFixed(1)}%;` + `--c:${EX_COLORS[i % EX_COLORS.length]}`
   }) ]) ]));
  });
  effBox.appendChild(rows);
 } else {
  effBox.appendChild(el("div", {
   class: "empty",
   text: "Nothing for that part in this session."
  }));
 }
 const same = workoutList().filter(x => x.done && (x.planId === w.planId || x.name === w.name) && x.d + (x.t || "") <= w.d + (w.t || "")).slice(0, 4).reverse();
 const topOf = x => {
  let top = 0;
  (x.sets || []).forEach(s => {
   const ex = exById(s.exId);
   if (!ex) return;
   const hit = exParts(ex).find(y => y.k === partK);
   if (hit && hit.share >= 1) top = Math.max(top, s.w || 0);
  });
  return top;
 };
 const series = same.map(x => ({
  d: x.d,
  v: topOf(x)
 })).filter(r => r.v > 0);
 const barBox = el("div", {
  class: "box pad"
 });
 if (series.length > 1) {
  const last = series[series.length - 1].v, first = series[0].v;
  barBox.appendChild(el("div", {
   class: "big mono",
   text: fmtLoad(last) + " " + loadUnit()
  }));
  barBox.appendChild(el("div", {
   class: "small muted",
   text: last !== first ? `top set · ${signed(dispLoad(last) - dispLoad(first), 1)} ${loadUnit()} across ${series.length} sessions` : "top set · unchanged"
  }));
  barBox.appendChild(el("div", {
   class: "mt"
  }, [ loadBars(series, PART_COLOR[partK]) ]));
 } else {
  barBox.appendChild(el("div", {
   class: "empty",
   text: series.length ? "Only one session of this workout so far." : "Nothing loaded directly for that part."
  }));
 }
 openModal({
  title: `${partName(partK)} · ${w.name}`,
  body: [ el("div", {
   class: "small muted",
   text: fmtDate(w.d, true)
  }), effBox, el("div", {
   class: "small muted mt",
   text: `Top weight, last ${series.length || 0} ${w.name} session${series.length === 1 ? "" : "s"}`
  }), barBox ]
 });
}

function openExerciseTrend(exId) {
 const hist = exerciseHistory(exId);
 const byDay = new Map;
 hist.forEach(h => {
  const d = byDay.get(h.d) || {
   d: h.d,
   top: 0,
   eff: 0,
   sets: 0
  };
  d.top = Math.max(d.top, h.w);
  d.eff += h.eff;
  d.sets++;
  byDay.set(h.d, d);
 });
 const rows = [ ...byDay.values() ];
 const host = el("div", {});
 openModal({
  title: exName(exId),
  body: [ el("div", {
   class: "bar"
  }, [ exIcon(exById(exId), 26), el("div", {
   class: "small muted",
   text: exParts(exById(exId) || {}).map(pp => partName(pp.k) + (pp.share < 1 ? " " + r0(pp.share * 100) + "%" : "")).join(" · ")
  }) ]), rows.length > 1 ? el("div", {
   class: "small muted",
   text: trainStyle() === "strength" ? "Load × reps per session" : "Top weight on the bar"
  }) : null, host, el("div", {
   class: "box scrollx"
  }, [ (() => {
   const tb = el("table", {
    class: "t"
   });
   tb.appendChild(el("tr", {}, [ el("th", {
    text: "Date"
   }), el("th", {
    class: "n",
    text: "Top " + loadUnit()
   }), el("th", {
    class: "n",
    text: "Sets"
   }), el("th", {
    class: "n",
    text: metric().col
   }) ]));
   rows.slice().reverse().forEach(r => tb.appendChild(el("tr", {}, [ el("td", {
    text: fmtDate(r.d)
   }), el("td", {
    class: "n",
    text: fmtLoad(r.top)
   }), el("td", {
    class: "n",
    text: String(r.sets)
   }), el("td", {
    class: "n",
    text: metric().fmt(r.eff)
   }) ])));
   return tb;
  })() ]) ].filter(Boolean)
 });
 if (rows.length > 1) queueMicrotask(() => host.appendChild(simpleBars(rows.map(r => ({
  d: r.d,
  v: trainStyle() === "strength" ? r.eff : r.top
 })), host.clientWidth || 320, 90, "var(--ser-load)", v => trainStyle() === "strength" ? fmtVol(v) : fmtLoad(v))));
}
