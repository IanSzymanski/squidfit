let DATABUSY = null, DATAJOB = false;

function paintBusy() {
 const host = document.getElementById("databusy");
 const tools = document.getElementById("datatools");
 if (tools) tools.querySelectorAll("button").forEach(b => {
  b.disabled = !!DATABUSY;
 });
 if (!host) return;
 host.innerHTML = "";
 host.classList.toggle("hide", !DATABUSY);
 if (!DATABUSY) return;
 const {label: label, done: done, total: total} = DATABUSY;
 host.appendChild(el("span", {
  class: "spin gap-r"
 }));
 host.appendChild(el("span", {
  text: label + (total ? ` · ${done} of ${total}` : "")
 }));
}

function dataBusy(label, done, total) {
 if (!DATAJOB) return;
 DATABUSY = label ? {
  label: label,
  done: done || 0,
  total: total || 0
 } : null;
 paintBusy();
}

async function dataJob(label, fn) {
 if (DATAJOB) return;
 DATAJOB = true;
 DATABUSY = {
  label: label,
  done: 0,
  total: 0
 };
 paintBusy();
 try {
  await fn();
 } catch (e) {
  toast("That didn't finish: " + (e && e.message ? e.message : e));
 } finally {
  DATAJOB = false;
  DATABUSY = null;
  paintBusy();
  render();
 }
}

async function clearWorkoutData() {
 if (DEMO) {
  WORKOUTS.clear();
  WPLANS.clear();
  render();
  return;
 }
 const ws = [ ...WORKOUTS.keys() ], ps = [ ...WPLANS.keys() ];
 WORKOUTS.clear();
 WPLANS.clear();
 lsSave();
 render();
 let n = 0;
 for (const id of ws) {
  await del("workouts/" + id);
  dataBusy("Removing workouts", ++n, ws.length);
 }
 for (const id of ps) await del("wplans/" + id);
}

async function seedWorkouts() {
 sampleEnter();
 WORKOUTS.clear();
 WPLANS.clear();
 dataBusy("Building six months of sessions");
 seedExercises();
 const byName = seedExId;
 const plans = [ {
  id: "pseed1",
  name: "Push",
  items: [ {
   exId: byName("Bench press"),
   sets: 4
  }, {
   exId: byName("Overhead press"),
   sets: 3
  }, {
   exId: byName("Incline dumbbell press"),
   sets: 3
  }, {
   exId: byName("Lateral raise"),
   sets: 3
  }, {
   exId: byName("Triceps pushdown"),
   sets: 3
  } ]
 }, {
  id: "pseed2",
  name: "Pull",
  items: [ {
   exId: byName("Barbell row"),
   sets: 4
  }, {
   exId: byName("Chin-up"),
   sets: 3
  }, {
   exId: byName("Lat pulldown"),
   sets: 3
  }, {
   exId: byName("Barbell curl"),
   sets: 3
  } ]
 }, {
  id: "pseed3",
  name: "Legs",
  items: [ {
   exId: byName("Back squat"),
   sets: 4
  }, {
   exId: byName("Romanian deadlift"),
   sets: 3
  }, {
   exId: byName("Leg press"),
   sets: 3
  }, {
   exId: byName("Hip thrust"),
   sets: 3
  }, {
   exId: byName("Calf raise"),
   sets: 3
  } ]
 } ];
 plans.forEach((p, i) => WPLANS.set(p.id, {
  ...p,
  color: PLAN_COLORS[i % PLAN_COLORS.length],
  shape: PLAN_SHAPES[i % PLAN_SHAPES.length]
 }));
 const START = {
  "Bench press": [ 155, 2.5 ],
  "Overhead press": [ 95, 1.5 ],
  "Incline dumbbell press": [ 55, 1.2 ],
  "Lateral raise": [ 20, .5 ],
  "Triceps pushdown": [ 50, 1.2 ],
  "Barbell row": [ 135, 2.5 ],
  "Chin-up": [ 0, 1.2 ],
  "Lat pulldown": [ 120, 2.5 ],
  "Barbell curl": [ 65, 1 ],
  "Back squat": [ 205, 4 ],
  "Romanian deadlift": [ 185, 3.5 ],
  "Leg press": [ 270, 6 ],
  "Hip thrust": [ 185, 4 ],
  "Calf raise": [ 140, 2.5 ]
 };
 const REPS = {
  "Bench press": 6,
  "Overhead press": 7,
  "Incline dumbbell press": 9,
  "Lateral raise": 14,
  "Triceps pushdown": 12,
  "Barbell row": 7,
  "Chin-up": 8,
  "Lat pulldown": 10,
  "Barbell curl": 10,
  "Back squat": 6,
  "Romanian deadlift": 8,
  "Leg press": 11,
  "Hip thrust": 9,
  "Calf raise": 15
 };
 let seed = 90210;
 const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
 };
 const today = todayISO();
 const DOW = [ 1, 3, 5 ];
 const WEEKS = 26;
 let n = 0;
 const loadAt = (base, step, w) => {
  const gained = step * WEEKS * (1 - Math.exp(-1.9 * w / WEEKS)) / (1 - Math.exp(-1.9));
  const deload = w % 7 === 6 ? .9 : 1;
  return (base + gained) * deload;
 };
 for (let wk = WEEKS - 1; wk >= 0; wk--) {
  const w = WEEKS - 1 - wk;
  DOW.forEach((dow, di) => {
   const monday = addDays(today, -((dowOf(today) + 6) % 7 + wk * 7));
   const iso = addDays(monday, dow - 1);
   if (iso > today) return;
   if (rnd() < .05) return;
   const plan = plans[di];
   const sets = [];
   plan.items.forEach(it => {
    const name = exName(it.exId);
    const [base, step] = START[name] || [ 100, 2 ];
    const target = REPS[name] || 8;
    const load = Math.round((loadAt(base, step, w) + (rnd() - .5) * 5) / 2.5) * 2.5;
    for (let k = 0; k < it.sets; k++) {
     const fade = k === 0 ? 0 : Math.round(rnd() * 1.6);
     const reps = Math.max(3, target - fade);
     const eff = Math.min(reps, 2 + k + Math.round(rnd() * 2));
     sets.push({
      id: "s" + ++n,
      exId: it.exId,
      w: Math.max(0, load),
      reps: reps,
      eff: eff,
      t: "18:" + String(10 + k * 4).padStart(2, "0")
     });
    }
   });
   const id = "wseed" + w + "-" + di;
   WORKOUTS.set(id, {
    id: id,
    d: iso,
    t: "18:00",
    planId: plan.id,
    name: plan.name,
    items: plan.items.map(i => ({
     ...i
    })),
    order: plan.items.map(i => i.exId),
    sets: sets,
    done: true,
    endedAt: "19:05"
   });
  });
 }
 render();
 if (DATAJOB) toast(WORKOUTS.size + " sample workouts loaded");
}

const BODY_SETS = {
 loss: {
  name: "Losing",
  tdee: 2450,
  delta: -450,
  swing: 190,
  drift: -6,
  start: 88
 },
 gain: {
  name: "Gaining",
  tdee: 2450,
  delta: 250,
  swing: 210,
  drift: 3,
  start: 79
 },
 swings: {
  name: "All over the place",
  tdee: 2500,
  delta: -165,
  swing: 560,
  drift: 0,
  start: 84
 }
};

async function clearBodyData() {
 if (DEMO) {
  DAYS.clear();
  RIDES.clear();
  render();
  return;
 }
 const ds = [ ...DAYS.keys() ], rs = [ ...RIDES.keys() ];
 DAYS.clear();
 RIDES.clear();
 lsSave();
 render();
 let n = 0;
 for (const d of ds) {
  await del("days/" + d);
  dataBusy("Removing days", ++n, ds.length);
 }
 n = 0;
 for (const r of rs) {
  await del("rides/" + r);
  dataBusy("Removing " + cardioWords().many, ++n, rs.length);
 }
}

async function seedBody(kind) {
 const cfg = BODY_SETS[kind] || BODY_SETS.loss;
 sampleEnter();
 DAYS.clear();
 RIDES.clear();
 dataBusy("Building six months of " + cfg.name.toLowerCase());
 let seed = 4711;
 const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
 };
 const g4 = () => (rnd() + rnd() + rnd() + rnd() - 2) * .9;
 const find = n => SEED.find(f => f.name === n);
 const PLAN = [ [ "07:20", [ [ "Oats, rolled, dry", 60 ], [ "Greek yogurt, nonfat, plain", 200 ], [ "Blueberries", 80 ] ] ], [ "09:45", [ [ "Coffee, black", 350 ] ] ], [ "12:40", [ [ "Chicken breast, cooked", 170 ], [ "White rice, cooked", 220 ], [ "Broccoli, raw", 120 ], [ "Olive oil", 10 ] ] ], [ "15:30", [ [ "Almonds", 28 ], [ "Apple", 180 ] ] ], [ "19:10", [ [ "Salmon, Atlantic, cooked", 160 ], [ "Sweet potato, baked", 200 ], [ "Asparagus", 120 ], [ "Butter", 10 ] ] ] ];
 const planKcal = PLAN.reduce((s, [, items]) => s + items.reduce((t, [name, g]) => {
  const f = find(name);
  return t + (f ? macrosFor(f, g).kcal : 0);
 }, 0), 0);
 const DAYSN = 182, end = todayISO(), smod = defaultMod();
 let kg = cfg.start;
 const rows = [];
 for (let i = DAYSN - 1; i >= 0; i--) {
  const iso = addDays(end, -i), dow = dowOf(iso);
  const wk = (DAYSN - 1 - i) / 7;
  const base = cfg.tdee + cfg.drift * wk + Math.sin(wk / 3.4) * 45;
  let rideKcal = 0;
  if (tracks("cardio") && (dow === 2 || dow === 4 || dow === 6)) {
   if (rnd() < .86) {
    const secs = Math.round((dow === 6 ? 7200 : 3600) * (.8 + rnd() * .5));
    const base = {
     id: "k" + iso,
     d: iso,
     t: dow === 6 ? "09:00" : "17:30",
     mod: smod,
     name: dow === 6 ? "Long " + modVerb(smod) : "Intervals",
     secs: secs
    };
    if (modTracks(smod, "watts")) {
     const avgW = Math.round((dow === 6 ? 195 : 215) * (.9 + rnd() * .2));
     const e = rideEnergy(secs, avgW);
     rideKcal = e.kcal;
     RIDES.set(base.id, {
      ...base,
      avgW: avgW,
      npW: Math.round(avgW * 1.06),
      kj: r1(e.kj),
      kcal: r0(e.kcal),
      kSrc: "watts"
     });
    } else {
     const met = r1(modSet(smod).met * (dow === 6 ? .9 : 1.1));
     rideKcal = met * kg * secs / 3600;
     const speed = {
      run: 10,
      walk: 5.5,
      swim: 2.5,
      row: 9
     }[smod] || 22;
     RIDES.set(base.id, {
      ...base,
      met: met,
      dist: r1(speed * secs / 3600 * (.9 + rnd() * .2)),
      kcal: r0(rideKcal),
      kSrc: "met"
     });
    }
   }
  }
  const burned = base + rideKcal;
  let target = burned + cfg.delta + g4() * cfg.swing;
  if (dow === 0 || dow === 6) target += 260;
  if (kind === "swings") target += Math.sin(wk / 2.1) * 420 + (rnd() < .1 ? 900 : 0);
  target = clamp(target, 1200, 4800);
  const logged = rnd() > (dow === 0 || dow === 6 ? .14 : .05);
  const entries = [];
  if (logged) {
   const scale = target / (planKcal || 1);
   PLAN.forEach(([t, items]) => items.forEach(([name, g]) => {
    const food = find(name);
    if (!food) return;
    const gg = g * scale * (.9 + rnd() * .2);
    const m = macrosFor(food, gg);
    entries.push({
     id: uid(),
     t: t,
     name: food.name,
     src: food.id,
     g: r1(gg),
     unit: "g",
     qty: r1(gg),
     kcal: r1(m.kcal),
     p: r2(m.p),
     c: r2(m.c),
     f: r2(m.f),
     alc: r2(m.alc)
    });
   }));
  }
  kg += (target - burned) / KCAL_PER_KG;
  const weighed = rnd() > (dow === 0 || dow === 6 ? .22 : .08);
  DAYS.set(iso, {
   d: iso,
   wKg: weighed ? r2(kg + g4() * .55) : null,
   wT: weighed ? "06:5" + Math.floor(rnd() * 9) : null,
   entries: entries,
   note: ""
  });
  rows.push({
   iso: iso,
   burned: burned,
   target: target,
   logged: logged
  });
 }
 if (!STASH) {
  S.targets = kind === "gain" ? {
   kcal: {
    min: null,
    max: 3200
   },
   p: {
    min: 170,
    max: null
   },
   c: {
    min: 320,
    max: null
   },
   f: {
    min: null,
    max: 100
   }
  } : {
   kcal: {
    min: null,
    max: 2350
   },
   p: {
    min: 175,
    max: null
   },
   c: {
    min: 200,
    max: null
   },
   f: {
    min: null,
    max: 70
   }
  };
  if (powerOn() && (!S.cardio || !S.cardio.ftp)) S.cardio = {
   ...S.cardio || {},
   ftp: 245
  };
 }
 render();
 const recent = rows.slice(-28);
 const trueTDEE = r0(recent.reduce((s, r) => s + r.burned, 0) / recent.length);
 toast(`${cfg.name}: 6 months in. True expenditure ~${trueTDEE}`);
 return {
  trueTDEE: trueTDEE,
  days: DAYS.size,
  rides: RIDES.size
 };
}
