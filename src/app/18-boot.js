function resetGraphViews() {
 GOFF = null;
 WZOOM = 1;
 EFFOFF = 0;
 TOPOFF = 0;
 HUBPICK = null;
 HOURSOPEN = false;
 EXOPEN = new Set;
 CARDIOF = null;
 XWEEK = null;
 zoomClear();
}

let AI = null;

async function claudeUse(name) {
 try {
  if (!window.claude || typeof window.claude.use !== "function") return null;
  return await window.claude.use(name);
 } catch (e) {
  return null;
 }
}

function applyTheme(t) {
 THEMEPREF = t || "";
 themeResolve();
 try {
  localStorage.setItem("ledgerscale.theme", THEMEPREF);
 } catch (e) {}
}

function scalePref(k) {
 try {
  return localStorage.getItem("ledgerscale." + k) || "";
 } catch (e) {
  return "";
 }
}

function applyScale(k, v) {
 try {
  if (v) localStorage.setItem("ledgerscale." + k, v); else localStorage.removeItem("ledgerscale." + k);
 } catch (e) {}
 scaleResolve();
}

function initChrome() {
 const vv = window.visualViewport;
 if (vv) {
  const set = () => {
   const s = document.documentElement.style;
   s.setProperty("--vvh", Math.round(vv.height) + "px");
   s.setProperty("--vvtop", Math.round(vv.offsetTop) + "px");
  };
  vv.addEventListener("resize", set);
  vv.addEventListener("scroll", set);
  set();
 }
 const navh = () => {
  const n = document.getElementById("tabs");
  if (n && n.offsetHeight) document.documentElement.style.setProperty("--navh", n.offsetHeight + "px");
 };
 navh();
 window.addEventListener("resize", navh);
 if (window.ResizeObserver) {
  try {
   new ResizeObserver(navh).observe(document.getElementById("tabs"));
  } catch (e) {}
 }
 document.addEventListener("touchmove", ev => {
  if (document.body.classList.contains("dragging")) ev.preventDefault();
 }, {
  passive: false
 });
 document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  resetGraphViews();
  render();
 });
 let rt;
 window.addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
   if ([ "dash", "cardio", "weight", "macros", "together" ].includes(PAGE)) render();
  }, 220);
 });
}

function syncColl(name, map, mig, idOf, save) {
 let first = true;
 DB.collection(name).onSnapshot(snap => {
  let flush = false, whole = false;
  if (first) {
   first = false;
   whole = true;
   bootSeen(name);
   if (snap.empty) {
    if (!DEMO && map.size) map.forEach(v => {
     const id = idOf(v);
     if (!id) return;
     if (TOMB.has(name + "/" + id)) {
      map.delete(id);
      return;
     }
     put(name + "/" + id, v);
    });
    return;
   }
   const mine = pendIn(name);
   [ ...map.keys() ].forEach(id => {
    if (!mine.has(id)) map.delete(id);
   });
   flush = mine.size > 0;
  }
  const into = liveMap(name, map);
  const monthly = LSMONTHLY[name], months = new Set;
  const touch = rec => {
   if (monthly && rec) months.add(monthly(rec));
  };
  let moved = 0;
  snap.docChanges().forEach(ch => {
   const path = name + "/" + ch.doc.id;
   if (PENDING.has(path)) return;
   const held = into.get(ch.doc.id);
   if (ch.type === "removed") {
    if (into.delete(ch.doc.id)) {
     moved++;
     touch(held);
    }
    return;
   }
   if (TOMB.has(path)) {
    if (into.delete(ch.doc.id)) {
     moved++;
     touch(held);
    }
    tombEnforce(path);
    return;
   }
   const next = mig ? mig(thaw(ch.doc.data())) : thaw(ch.doc.data());
   if (sameRecord(held, next)) return;
   into.set(ch.doc.id, next);
   moved++;
   touch(held);
   touch(next);
  });
  if (flush) pendFlush(name);
  if (!moved) return;
  if (into !== map) {
   if (MOCK) {
    if (whole || !monthly || save) MOCK.marks.push([ save ? "photos" : name ]); else months.forEach(iso => MOCK.marks.push([ name, iso ]));
   }
   return;
  }
  if (save) save(); else if (whole || !monthly) lsSave(name); else months.forEach(iso => lsSave(name, iso));
  renderSoon();
 }, () => {});
}

function syncTombs() {
 DB.collection("gone").onSnapshot(snap => {
  let moved = 0;
  snap.docChanges().forEach(ch => {
   const d = ch.doc.data();
   const path = d && d.p;
   if (!path) return;
   if (ch.type === "removed") {
    if (TOMB.delete(path)) moved++;
    return;
   }
   if (TOMB.get(path) === d.at) return;
   if ((WROTE.get(path) || {
    t: 0
   }).t > (d.at || 0)) return;
   TOMB.set(path, d.at || Date.now());
   moved++;
   const cut = path.indexOf("/");
   const coll = path.slice(0, cut), id = path.slice(cut + 1);
   const map = COLLMAP[coll] && liveMap(coll, COLLMAP[coll]);
   if (map && map.delete(id)) {
    if (map === COLLMAP[coll]) {
     lsSave(coll);
     renderSoon();
    } else if (MOCK) MOCK.marks.push([ coll ]);
   }
  });
  if (moved) {
   tombWrite();
   tombPrune();
  }
 }, () => {});
}

const LIFTCAP = 1500, LIFTMIN = 350;

const BOOTCOLLS = [ "days", "workouts", "foods", "rides" ];

const BOOTSEEN = new Set;

let LIFTED = false;

function liftSplash() {
 if (LIFTED) return;
 LIFTED = true;
 const n = document.getElementById("splash");
 if (!n) return;
 const wait = Math.max(0, LIFTMIN - performance.now());
 setTimeout(() => {
  n.classList.add("out");
  setTimeout(() => n.remove(), 400);
 }, wait);
}

function bootSeen(name) {
 BOOTSEEN.add(name);
 if (BOOTCOLLS.every(c => BOOTSEEN.has(c))) liftSplash();
}

const COLLMAP = {
 days: DAYS,
 foods: FOODS,
 recipes: RECIPES,
 rides: RIDES,
 presets: PRESETS,
 exercises: EXERCISES,
 wplans: WPLANS,
 workouts: WORKOUTS,
 photos: PHOTOS
};

const hasRecords = () => [ DAYS, RIDES, WORKOUTS, PHOTOS ].some(m => m.size > 0);

async function boot() {
 initChrome();
 tombLoad();
 pendLoad();
 const hadLocal = lsLoad();
 photoLoad();
 seedExercises();
 if (hadLocal) pruneEmptySessions();
 autoFinishSessions();
 migrateRecurrence();
 migrateSecShares();
 migrateParts();
 if (!hadLocal) lookFromCache();
 applyLook();
 render();
 if (hadLocal) liftSplash(); else setTimeout(liftSplash, LIFTCAP);
 claudeUse("sample").then(s => {
  if (s) {
   AI = s;
   render();
  }
 });
 const db = await claudeUse("db");
 if (!db) {
  liftSplash();
  return;
 }
 DB = db;
 db2(DB);
}

async function db2(db) {
 let firstS = true;
 db.doc("settings/main").onSnapshot(s => {
  if (MOCK) {
   if (s.exists) {
    MOCK.S = migrateSettings(thaw(s.data()));
    MOCK.fromAccount = true;
   }
   return;
  }
  if (PENDING.has("settings/main")) {
   if (firstS) {
    firstS = false;
    pendFlush("settings");
   }
   return;
  }
  firstS = false;
  if (!s.exists) {
   const fresh = !DEMO && !hasRecords();
   if (fresh) {
    const ld = localeDefaults();
    S.onboarded = false;
    S.units = {
     ...S.units,
     ...ld.units
    };
    S.week0 = ld.week0;
   }
   if (!DEMO) put("settings/main", {
    ...S
   });
   if (fresh) openOnboarding();
   return;
  }
  const next = migrateSettings(thaw(s.data()));
  if (sameRecord(S, next)) {
   if (S.onboarded === false) openOnboarding();
   return;
  }
  S = next;
  applyLook();
  renderSoon();
  if (S.onboarded === false) openOnboarding();
 }, () => {});
 syncColl("days", DAYS, migrateDay, d => d.d);
 syncColl("foods", FOODS, migrateFood, f => f.id);
 syncColl("recipes", RECIPES, null, r => r.id);
 syncColl("rides", RIDES, migrateRide, r => r.id);
 syncColl("presets", PRESETS, null, p => p.id);
 syncColl("exercises", EXERCISES, migrateExercise, x => x.id);
 syncColl("wplans", WPLANS, null, p => p.id);
 syncColl("workouts", WORKOUTS, null, w => w.id);
 syncColl("photos", PHOTOS, null, p => p.d, photoSave);
 syncTombs();
 pendFlush("pix");
}

boot().catch(e => {
 console.error(e);
 liftSplash();
});
