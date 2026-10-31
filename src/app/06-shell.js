const PAGES = {
 dash: "Dashboard",
 food: "Food log",
 workouts: "Workouts",
 cardio: () => cardioWords().noun,
 settings: "Settings",
 setgroup: () => typeof setGroup === "function" && setGroup() ? setGroup().name : "Settings",
 themeprev: () => typeof LOOKPREV !== "undefined" && LOOKPREV ? LOOKPREV.name : "Preview",
 themelist: () => "Theme editor",
 themeedit: () => typeof EDIT !== "undefined" && EDIT ? EDIT.theme.name : "Theme",
 swatchedit: () => {
  if (typeof EDIT === "undefined" || !EDIT || !EDITSW) return "Colour";
  return (SWATCHES.find(x => x.k === EDITSW) || {
   name: "Colour"
  }).name;
 },
 wplans: "Workouts and exercises",
 session: "Workout",
 wreport: "Workout report",
 weight: "Weight",
 macros: "Macros",
 library: "Foods and recipes",
 energy: "Expenditure",
 summary: "Weekly summary",
 data: "Data",
 logging: "Logging",
 photos: "Photos",
 addfood: "Add food",
 plate: "Plate",
 together: "Week by week",
 planedit: "Workout",
 expick: "Add exercises",
 wstream: "All workouts"
};

const TABS = [ {
 id: "dash",
 label: "Dashboard",
 icon: "dash"
}, {
 id: "food",
 label: "Food",
 icon: "food"
}, {
 id: "__add",
 label: "Add",
 icon: "add"
}, {
 id: "workouts",
 label: "Workouts",
 icon: "dumbbell"
}, {
 id: "settings",
 label: "Settings",
 icon: "gear"
} ];

const tabLive = id => id === "food" ? tracks("food") : id === "workouts" ? tracks("strength") || tracks("cardio") : true;

const leavePage = () => {
 endDrag();
 if (typeof ARRANGE !== "undefined") ARRANGE = null;
 DASHCFG = false;
 if (typeof resetGraphViews === "function") resetGraphViews();
 if (PAGE === "session" && typeof pruneEmptySessions === "function") pruneEmptySessions(SESSION);
};

function go(p) {
 if (p !== PAGE) {
  NAV.push(PAGE);
  if (NAV.length > 24) NAV.shift();
 }
 if (p !== "food" && PAGE === "food") selClear();
 leavePage();
 PAGE = p;
 window.scrollTo({
  top: 0
 });
 render();
}

function goRoot(p) {
 NAV = [];
 if (p !== "food" && PAGE === "food") selClear();
 leavePage();
 PAGE = p;
 window.scrollTo({
  top: 0
 });
 render();
}

const PAGE_NEEDS = {
 themeedit: () => typeof EDIT !== "undefined" && !!EDIT,
 swatchedit: () => typeof EDIT !== "undefined" && !!EDIT && !!EDITSW,
 themeprev: () => typeof LOOKPREV !== "undefined" && !!LOOKPREV
};

const pageLive = p => !PAGE_NEEDS[p] || PAGE_NEEDS[p]();

function back() {
 leavePage();
 let p = NAV.pop() || "dash";
 while (!pageLive(p) && NAV.length) p = NAV.pop();
 PAGE = pageLive(p) ? p : "settings";
 window.scrollTo({
  top: 0
 });
 render();
}

function buildTabs() {
 const n = $("#tabs");
 n.innerHTML = "";
 TABS.forEach(t => {
  if (!tabLive(t.id)) return;
  if (t.id === "__add") {
   n.appendChild(el("button", {
    type: "button",
    class: "addbtn",
    "aria-label": "Add an entry",
    onclick: openAdd
   }, [ el("span", {
    class: "ring",
    html: ICONS.add
   }), el("span", {
    text: "Add"
   }) ]));
   return;
  }
  n.appendChild(el("button", {
   type: "button",
   "aria-current": PAGE === t.id ? "page" : null,
   onclick: () => {
    if (t.id === "food") {
     SELDATE = todayISO();
     STRIPMON = null;
     STRIPX = null;
    }
    goRoot(t.id);
   }
  }, [ el("span", {
   html: ICONS[t.icon]
  }), el("span", {
   text: t.label
  }) ]));
 });
}

const VIEWS = {};

let TEARDOWN = [];

const onLeave = fn => {
 TEARDOWN.push(fn);
};

function runTeardown() {
 const list = TEARDOWN;
 TEARDOWN = [];
 list.forEach(fn => {
  try {
   fn();
  } catch (e) {
   console.error(e);
  }
 });
}

let RENDERSOON = 0;

function renderSoon() {
 if (RENDERSOON) return;
 const run = () => {
  RENDERSOON = 0;
  render();
 };
 RENDERSOON = document.hidden ? setTimeout(run, 16) : requestAnimationFrame(run);
}

function render() {
 if (RENDERSOON) {
  cancelAnimationFrame(RENDERSOON);
  clearTimeout(RENDERSOON);
  RENDERSOON = 0;
 }
 const y = window.scrollY || document.documentElement.scrollTop || 0;
 runTeardown();
 AMTIDX = null;
 buildTabs();
 const ttl = PAGES[PAGE];
 $("#ttl").textContent = (typeof ttl === "function" ? ttl() : ttl) || "Squid";
 Object.keys(PAGES).forEach(p => $("#p-" + p).classList.toggle("hide", p !== PAGE));
 document.body.classList.toggle("addpage", PAGE === "addfood" || PAGE === "expick");
 if (PAGE !== "addfood") {
  document.body.classList.remove("kbdbar");
  ADDONLY = "";
 }
 document.body.classList.toggle("logbar", PAGE === "food");
 document.body.classList.toggle("prevpage", [ "themeprev", "themeedit", "swatchedit" ].includes(PAGE));
 if (![ "setgroup", "themeprev", "themeedit", "swatchedit", "themelist" ].includes(PAGE)) LOOKOPEN = false;
 document.body.classList.toggle("selecting", PAGE === "food" && SELMODE);
 (VIEWS[PAGE] || VIEWS.dash)();
 paintPlateBar();
 if (ONB) paintOnboard();
 if (y > 0 && (window.scrollY || document.documentElement.scrollTop || 0) !== y) {
  window.scrollTo(0, y);
 }
}

function paintPlateBar() {
 const root = $("#plateRoot");
 root.innerHTML = "";
 const on = PAGE === "food" && PLATE.items.length > 0;
 document.body.classList.toggle("has-plate", on);
 if (!on) return;
 const t = plateTotals(), n = PLATE.items.length;
 root.appendChild(el("button", {
  class: "platebar",
  type: "button",
  "aria-label": `Review the plate: ${n} item${n === 1 ? "" : "s"}, ${fmtEU(t.kcal)}`,
  onclick: openPlate
 }, [ el("span", {
  class: "ic",
  html: ICONS.plate
 }), el("span", {
  class: "grow"
 }, [ el("span", {
  class: "pn",
  text: n + (n === 1 ? " item" : " items")
 }), el("span", {
  class: "pk",
  text: fmtEU(t.kcal)
 }) ]) ]));
}

function backLink(onClick) {
 return el("button", {
  class: "btn sm icon",
  type: "button",
  onclick: onClick || back,
  "aria-label": "Back"
 }, [ el("span", {
  class: "chevron",
  html: ICONS.back
 }) ]);
}

function pageBar(kids, onBack) {
 return el("div", {
  class: "sec bar"
 }, [ backLink(onBack), el("span", {
  class: "sp"
 }) ].concat((kids || []).filter(Boolean)));
}

const chevron = () => el("span", {
 class: "chevron",
 html: ICONS.chevr
});

function tile(ic, label, hint, fn, wide) {
 return el("button", {
  class: "tile" + (wide ? " wide" : ""),
  type: "button",
  onclick: () => {
   closeModal();
   fn();
  }
 }, [ icon(ic), el("span", {}, [ el("span", {
  class: "lb",
  text: label
 }), hint ? el("span", {
  class: "hn",
  text: hint
 }) : null ]) ]);
}

function addBtn(ic, label, fn) {
 return el("button", {
  class: "tile sq",
  type: "button",
  onclick: () => {
   closeModal();
   fn();
  }
 }, [ icon(ic), el("span", {
  class: "lb",
  text: label
 }) ]);
}

const ADD_ITEMS = [ {
 id: "food",
 name: "Food",
 tile: true,
 ic: "food",
 when: () => tracks("food"),
 fn: () => {
  ADDTIME = null;
  ADDMODE = "log";
  ADDQ = "";
  openSearch("");
 }
}, {
 id: "workout",
 name: "Workout",
 tile: true,
 ic: "dumbbell",
 when: () => tracks("strength") || tracks("cardio"),
 fn: () => openAddWorkout()
}, {
 id: "describe",
 name: "Describe",
 tile: true,
 ic: "ai",
 when: () => !!AI && tracks("food"),
 fn: () => openAiMeal()
}, {
 id: "weight",
 name: "Weight",
 tile: true,
 ic: "scaleI",
 when: () => tracks("weight"),
 fn: () => openWeigh(SELDATE)
}, {
 id: "recipes",
 name: "Recipes",
 ic: "list",
 when: () => tracks("food"),
 fn: () => openRecipeMenu()
}, {
 id: "quick",
 name: "Quick add",
 ic: "pen",
 when: () => tracks("food"),
 fn: () => {
  ADDTIME = null;
  ADDMODE = "log";
  openQuick();
 }
}, {
 id: "photos",
 name: "Photos",
 ic: "cam",
 when: () => true,
 fn: () => openPhotoAdd(todayISO())
} ];

function firstAct(k) {
 const m = defaultMod();
 return {
  weight: {
   k: k,
   text: "Log weight",
   fn: () => openWeigh(todayISO())
  },
  food: {
   k: k,
   text: "Log food",
   fn: () => ADD_ITEMS[0].fn()
  },
  cardio: {
   k: k,
   text: "Log a " + modVerb(m),
   fn: () => openRide(null, null, m)
  },
  strength: {
   k: k,
   text: "Start a workout",
   fn: () => openAddWorkout()
  },
  photos: {
   k: k,
   text: "Add photos",
   fn: () => openPhotoAdd(todayISO())
  }
 }[k];
}

const firstLine = a => el("span", {
 class: "act"
}, [ el("span", {
 class: "ic",
 html: ICONS.add
}), el("span", {
 text: a.text
}) ]);

function openAdd() {
 const host = el("div", {});
 const paint = arranging => {
  host.innerHTML = "";
  const live = ADD_ITEMS.filter(x => x.when());
  const by = new Map(live.map(x => [ x.id, x ]));
  const entries = layoutOf("add", live.map(x => x.id));
  if (arranging) {
   host.appendChild(arrangeList("add", entries, id => by.get(id).name, () => paint(true)));
   host.appendChild(el("button", {
    class: "btn pri wide mt",
    type: "button",
    text: "Done",
    onclick: () => paint(false)
   }));
   return;
  }
  const lift = id => ({
   drop: () => {},
   swap: () => {
    paint(true);
    return host.querySelector(`.arrange [data-id="${id}"]`);
   }
  });
  const on = entries.filter(e => e.on).map(e => by.get(e.id));
  const tiles = on.filter(x => x.tile), rows = on.filter(x => !x.tile);
  if (tiles.length) host.appendChild(el("div", {
   class: "tiles four",
   style: `grid-template-columns:repeat(${tiles.length},minmax(0,1fr))`
  }, tiles.map(x => holdDrag(withId(addBtn(x.ic, x.name, x.fn), x.id), {
   grid: true,
   ...lift(x.id)
  }))));
  if (rows.length) host.appendChild(el("div", {
   class: "box rows"
  }, rows.map(x => holdDrag(withId(row({
   mark: icon(x.ic),
   t1: x.name,
   go: true,
   onclick: () => {
    closeModal();
    x.fn();
   }
  }), x.id), lift(x.id)))));
  if (!on.length) host.appendChild(el("div", {
   class: "box"
  }, [ emptyAdd("Arrange the menu", () => paint(true)) ]));
 };
 paint(false);
 openModal({
  title: "Add",
  body: [ host ]
 });
}

function prevWeighIn(iso) {
 let best = null;
 DAYS.forEach(d => {
  if (d.d < iso && d.wKg > 0 && (!best || d.d > best.d)) best = d;
 });
 return best;
}

function openWeigh(iso, existing) {
 const day = getDay(iso);
 const tIn = el("input", {
  type: "time",
  value: day.wT || nowHM()
 });
 const dIn = el("input", {
  type: "date",
  value: iso,
  max: todayISO()
 });
 const prev = prevWeighIn(iso);
 const tm = prev ? {
  med: prev.wKg
 } : null;
 const centre = tm ? r1(kgToDisp(tm.med)) : day.wKg ? r1(kgToDisp(day.wKg)) : null;
 const start = day.wKg ? r1(kgToDisp(day.wKg)) : centre;
 const span = 5;
 const lo = centre === null ? 0 : Math.max(0, r1(centre - span));
 const hi = centre === null ? 0 : r1(centre + span);
 const dial = centre === null ? null : rangeDial({
  min: lo,
  max: hi,
  step: .1,
  value: start === null ? "" : start,
  label: "Weight in " + wUnit(),
  fmt: v => r1(v) + " " + wUnit(),
  placeholder: String(r1(centre)),
  open: true,
  hero: true
 });
 const wIn = dial ? dial.input : el("input", {
  type: "number",
  step: "0.1",
  inputmode: "decimal",
  value: day.wKg ? fmtW(day.wKg, 1) : "",
  placeholder: "—"
 });
 const commit = v => {
  const target = dIn.value || iso;
  const d = editDay(target);
  if (!wIn.value.trim()) d.wKg = null; else {
   d.wKg = dispToKg(v);
   d.wT = tIn.value;
  }
  closeModal();
  SELDATE = target;
  saveDay(d);
  toast("Weight saved");
 };
 const save = () => {
  const v = parseFloat(wIn.value);
  if (wIn.value.trim() && !(isFinite(v) && v > 0)) {
   toast("Enter a weight.");
   return;
  }
  const ref = tm ? kgToDisp(tm.med) : null;
  if (ref && wIn.value.trim() && Math.abs(v - ref) / ref > .15) {
   openModal({
    title: "Check that reading",
    body: [ el("div", {
     class: "note",
     text: fmtW(dispToKg(v)) + " " + wUnit() + " is a long way from your last reading, " + r1(ref) + " " + wUnit() + "."
    }) ],
    footer: [ el("button", {
     class: "btn full",
     type: "button",
     text: "Go back and fix it",
     onclick: closeModal
    }), el("button", {
     class: "btn pri",
     type: "button",
     text: "It's right, save it",
     onclick: () => {
      closeModal();
      commit(v);
     }
    }) ]
   });
   return;
  }
  commit(v);
 };
 openModal({
  save: save,
  title: "Weigh-in",
  body: [ dial || labelled("Weight (" + wUnit() + ")", wIn), el("div", {
   class: "grid2 mt"
  }, [ labelled("Date", dIn), labelled("Time", tIn) ]) ].filter(Boolean),
  footer: [ day.wKg ? el("button", {
   class: "btn bad icon",
   type: "button",
   html: ICONS.trash,
   "aria-label": "Remove weigh-in",
   onclick: () => {
    const d = editDay(iso);
    d.wKg = null;
    d.wT = null;
    closeModal();
    saveDay(d);
   }
  }) : null, el("button", {
   class: "btn pri",
   type: "button",
   text: "Save",
   onclick: save
  }) ]
 });
}

const GREETINGS = {
 murica: [ "Still standing watch", "Good morning, USA!", "Afternoon, patriot", "Evening, patriot", "Burning the midnight oil" ],
 matrix: [ "Still in the system", "Wake up", "Follow the white rabbit", "Knock, knock", "The system is watching" ]
};

function greeting() {
 const h = (new Date).getHours();
 const slot = h < 5 ? 0 : h < 12 ? 1 : h < 17 ? 2 : h < 22 ? 3 : 4;
 const t = typeof activeTheme === "function" ? activeTheme() : null;
 const set = t && GREETINGS[t.id];
 if (set) return set[slot];
 return [ "Still up", "Good morning", "Good afternoon", "Good evening", "Late one" ][slot];
}

function heroBlock() {
 const day = getDay(todayISO()), t = totalsOf(day.entries);
 const wc = weeklyChange(), todayW = getDay(todayISO()).wKg;
 const wShown = todayW || wc.cur.median;
 const kcalGoal = goalNum(targetOf("kcal"));
 return el("div", {
  class: "hero"
 }, [ el("div", {
  class: "hi",
  text: greeting()
 }), el("div", {
  class: "sub2",
  text: fmtDate(todayISO(), true)
 }), el("div", {
  class: "figs"
 }, [ !tracks("weight") ? null : el("button", {
  class: "fig",
  type: "button",
  onclick: () => go("weight")
 }, [ el("span", {
  class: "n",
  text: wShown ? fmtW(wShown) : "—"
 }), el("span", {
  class: "u",
  text: todayW ? wUnit() + " today" : wShown ? wUnit() + ", 7-day " + basisWord() : "no weigh-in"
 }) ]), !tracks("food") ? null : el("button", {
  class: "fig",
  type: "button",
  onclick: () => go("macros")
 }, [ el("span", {
  class: "n",
  text: fmtE(t.kcal)
 }), el("span", {
  class: "u",
  text: kcalGoal ? "of " + fmtEU(kcalGoal) : eUnit() + " today"
 }) ]) ].filter(Boolean)), tracks("food") ? el("button", {
  class: "bars",
  type: "button",
  onclick: () => go("macros")
 }, [ microBars(t) ]) : null ].filter(Boolean));
}

VIEWS.dash = function viewDash() {
 const root = $("#p-dash");
 root.innerHTML = "";
 root.appendChild(heroBlock());
 if (DASHCFG) {
  dashConfigView(root);
  return;
 }
 const grid = el("div", {
  class: "cards"
 });
 let any = false;
 const offered = new Set;
 S.layout.dash.forEach(entry => {
  if (!entry.on) return;
  const mod = MODULES.find(m => m.id === entry.id);
  if (!mod || !modLive(mod)) return;
  const kids = CARD[mod.id] && CARD[mod.id]();
  if (!kids) return;
  if (kids.first) {
   if (offered.has(kids.first.k)) return;
   offered.add(kids.first.k);
   any = true;
   grid.appendChild(holdDrag(el("button", {
    class: "card first" + (entry.w === 2 ? " w2" : ""),
    type: "button",
    "data-id": mod.id,
    onclick: kids.first.fn
   }, [ el("span", {
    class: "ttl"
   }, [ el("span", {
    text: mod.name
   }) ]), firstLine(kids.first) ]), {
    grid: true,
    ghostClass: "card",
    drop: () => {},
    swap: card => {
     DASHCFG = true;
     render();
     return document.querySelector(`#p-dash .cards .card.cfg[data-id="${card.dataset.id}"]`);
    }
   }));
   return;
  }
  any = true;
  grid.appendChild(holdDrag(el("button", {
   class: "card" + (entry.w === 2 ? " w2" : ""),
   type: "button",
   "data-id": mod.id,
   onclick: () => go(mod.page)
  }, [ el("span", {
   class: "ttl"
  }, [ el("span", {
   text: mod.name
  }), chevron() ]) ].concat(kids)), {
   grid: true,
   ghostClass: "card",
   drop: () => {},
   swap: card => {
    DASHCFG = true;
    render();
    return document.querySelector(`#p-dash .cards .card.cfg[data-id="${card.dataset.id}"]`);
   }
  }));
 });
 root.appendChild(grid);
 fillGrid(grid);
 if (!any) root.appendChild(el("div", {
  class: "box"
 }, [ emptyAdd("Arrange the dashboard", openDashConfig) ]));
};

function fillGrid(grid) {
 if (!grid) return;
 const rows = new Map;
 [ ...grid.children ].forEach(n => {
  n.classList.remove("orphan");
  n.style.gridColumn = "";
  const t = Math.round(n.offsetTop);
  rows.set(t, (rows.get(t) || []).concat([ n ]));
 });
 const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
 rows.forEach(list => {
  const used = list.reduce((a, n) => a + (n.classList.contains("w2") ? 2 : 1), 0);
  const last = list[list.length - 1];
  if (used >= cols) return;
  last.classList.add("orphan");
  last.style.gridColumn = "span " + (cols - used + (last.classList.contains("w2") ? 2 : 1));
 });
}

const lead = (t, sub) => el("span", {}, [ el("span", {
 class: "lead",
 text: t
}), sub ? el("span", {
 class: "sub",
 text: sub
}) : null ]);

const rowline = (k, v) => el("span", {
 class: "rowline"
}, [ el("span", {
 class: "k",
 text: k
}), el("span", {
 class: "v",
 text: v
}) ]);

const CARD = {
 wspark() {
  if (!everWeighed()) return {
   first: firstAct("weight")
  };
  const days = chartDays(45);
  if (days.length < 4) return null;
  const meds = days.map(d => d.med === null ? null : kgToDisp(d.med));
  const sp = sparkLine(meds, "var(--ser-weight)");
  if (!sp) return null;
  const known = meds.filter(v => v !== null);
  const drift = known.length > 1 ? known[known.length - 1] - known[0] : null;
  return [ lead(drift === null ? "—" : signed(drift, 1), `${wUnit()} over ${days.length} days`), sp ];
 },
 energy() {
  if (!everWeighed()) return {
   first: firstAct("weight")
  };
  if (!everAte()) return {
   first: firstAct("food")
  };
  const e = estimateTDEE();
  const kids = [ lead(e.ok ? fmtE(e.tdee) : "—", e.ok ? `${eUnit()}/day over ${e.span} days` : e.why) ];
  if (e.ok) kids.push(miniPair([ {
   k: "in",
   v: e.meanIntake,
   css: "var(--ser-intake)"
  }, {
   k: "out",
   v: e.tdee,
   css: "var(--ser-tdee)",
   tail: tracks("cardio") ? {
    v: rideKcalPerDay(e.span || 21),
    css: "var(--ser-ride)"
   } : null
  } ]));
  return kids;
 },
 cardio() {
  if (!tracks("cardio")) return null;
  if (!everRode()) return {
   first: firstAct("cardio")
  };
  const today = todayISO();
  const rides = [ ...RIDES.values() ].filter(r => daysBetween(r.d, today) >= 0 && daysBetween(r.d, today) < 7);
  const secs = rides.reduce((s, r) => s + (r.secs || 0), 0);
  const {pool: pool} = ridePoolDays(14);
  const perDay = pool.length ? pool.reduce((s, v) => s + v, 0) / pool.length : 0;
  return [ lead((secs / 3600).toFixed(1) + "h", `${nCardio(rides.length)}, last 7 days`), rowline("Burned per day", fmtEU(perDay)), pool.some(v => v > 0) ? sparkBars(pool, "var(--ser-ride)") : null ].filter(Boolean);
 },
 strength() {
  if (!WORKOUTS.size) return {
   first: firstAct("strength")
  };
  const today = todayISO();
  let eff = 0, sets = 0, n = 0;
  WORKOUTS.forEach(w => {
   const k = daysBetween(w.d, today);
   if (!w.done || k < 0 || k >= 7) return;
   const t = workoutTotals(w);
   eff += t.eff;
   sets += t.sets;
   n++;
  });
  const bars = [];
  for (let k = 13; k >= 0; k--) {
   const iso = addDays(today, -k);
   let v = 0;
   WORKOUTS.forEach(w => {
    if (w.done && w.d === iso) v += workoutTotals(w).eff;
   });
   bars.push(v);
  }
  return [ lead(metric().fmt(eff), `${metric().k === "sessions" ? "sets" : metric().lower}, last 7 days`), rowline("Sessions", `${n}`), rowline("Sets", `${sets}`), bars.some(v => v > 0) ? sparkBars(bars, "var(--ser-lift)") : null ].filter(Boolean);
 },
 parts() {
  if (!WORKOUTS.size) return {
   first: firstAct("strength")
  };
  const today = todayISO();
  const wk = partsWeek(today);
  const rows = PARTS.map(p => ({
   p: p,
   v: wk[p.k] || 0
  })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  if (!rows.length) return null;
  const top = Math.max(...rows.map(x => x.v)), band = metric().band;
  const hi = band && top <= effTarget()[1] ? effTarget()[1] * 1.06 : top * 1.12;
  const at = v => (v / hi * 100).toFixed(1) + "%";
  const stepFor = h => h <= 15 ? 5 : h <= 45 ? 10 : h <= 120 ? 25 : 50;
  const marks = band ? [] : ticks(0, hi, 3).t.filter(v => v > 0 && v < hi);
  if (band) for (let v = stepFor(hi); v < hi; v += stepFor(hi)) marks.push(v);
  const track = kids => el("span", {
   class: "tr"
  }, marks.map(v => el("span", {
   class: "tick",
   style: `--x:${at(v)}`
  })).concat(band ? [ el("span", {
   class: "band",
   style: `--x:${at(effTarget()[0])};` + `--w:${((Math.min(effTarget()[1], hi) - effTarget()[0]) / hi * 100).toFixed(1)}%`
  }) ] : []).concat(kids));
  return [ lead(String(rows.length), "parts trained this week"), el("span", {
   class: "meter mid"
  }, rows.slice(0, 5).map(x => el("span", {
   class: "mrow"
  }, [ el("span", {
   class: "lb",
   text: x.p.short
  }), track([ el("span", {
   class: "fl",
   style: `--w:${at(x.v)};--c:${PART_COLOR[x.p.k]}`
  }) ]), el("span", {
   class: "n",
   text: metric().fmt(x.v)
  }) ])).concat([ el("span", {
   class: "ax"
  }, marks.map(v => el("b", {
   style: `--x:${at(v)}`,
   text: metric().fmt(v)
  }))) ])) ];
 },
 logging() {
  const food = tracks("food"), weigh = tracks("weight");
  if (!food && !weigh) return null;
  if (!(food && everAte()) && !(weigh && everWeighed())) return {
   first: firstAct(food ? "food" : "weight")
  };
  const pred = food ? hasFood : hasWeight;
  const w = coverage(hasWeight, 7), f = coverage(pred, 7);
  const today = todayISO(), flags = [];
  for (let k = 6; k >= 0; k--) flags.push(pred(DAYS.get(addDays(today, -k))));
  return [ lead(`${f.hit}/7`, food ? "days of food logged" : "days weighed"), food && weigh ? rowline("Weigh-ins", `${w.hit}/7`) : null, rowline("Run", `${f.run} day${f.run === 1 ? "" : "s"}`), miniDots(flags, "var(--ser-logged)") ].filter(Boolean);
 },
 photos() {
  const dates = photoDates();
  if (!dates.length) return {
   first: firstAct("photos")
  };
  const last = dates[dates.length - 1], rec = PHOTOS.get(last);
  const back = daysBetween(last, todayISO());
  const strip = el("span", {
   class: "pshots art"
  }, SLOTS.map(([k, label]) => photoFrame(rec.shots[k], {
   small: true,
   label: label,
   alt: label
  })));
  return [ lead(String(dates.length), dates.length === 1 ? "session" : "sessions"), el("span", {
   class: "sub",
   text: back === 0 ? "latest today" : back + (back === 1 ? " day ago" : " days ago")
  }), strip ];
 },
 together() {
  const lanes = weekLanes();
  if (!lanes.length) return null;
  const rows = weekRows(12);
  return [ el("span", {
   class: "xlanes"
  }, lanes.map(l => {
   const vals = rows.map(r => r[l.id]);
   return el("span", {
    class: "xl"
   }, [ el("span", {
    class: "lb",
    text: l.short || l.name
   }), (l.kind === "bars" ? sparkBars(vals.map(v => v || 0), l.css) : sparkLine(vals, l.css)) || el("span", {
    class: "spark"
   }) ]);
  })) ];
 },
 summary() {
  const s = windowStats(todayISO());
  if (s.meanKcal === null && s.median === null) return null;
  const wc = weeklyChange();
  const today = todayISO(), k7 = [];
  for (let k = 6; k >= 0; k--) {
   const d = DAYS.get(addDays(today, -k));
   k7.push(d && d.entries && d.entries.length ? totalsOf(d.entries).kcal : 0);
  }
  return [ tracks("food") ? lead(s.meanKcal === null ? "—" : fmtE(s.meanKcal), eUnit() + "/day, last 7") : null, tracks("weight") ? rowline("Weight", wc.delta === null ? "—" : signedW(wc.delta) + " " + wUnit()) : null, tracks("cardio") ? rowline(capFirst(cardioWords().many), `${s.rides}`) : null, tracks("food") ? sparkBars(k7, "var(--ser-intake)") : null ].filter(Boolean);
 }
};

let DASHCFG = false;

function dashConfigView(root) {
 let draft = S.layout.dash.map(x => ({
  ...x
 }));
 const commit = () => {
  S.layout.dash = draft.map(x => ({
   ...x
  }));
  saveSettings();
 };
 const shownOf = () => draft.filter(e => e.on);
 const reseat = ids => {
  const by = new Map(draft.map(e => [ e.id, e ]));
  draft = ids.map(id => by.get(id)).filter(Boolean).concat(draft.filter(e => !e.on));
 };
 root.appendChild(el("div", {
  class: "sec bar"
 }, [ el("div", {
  class: "grow hd",
  text: "Arrange the dashboard"
 }), el("button", {
  class: "btn sm pri",
  type: "button",
  text: "Done",
  onclick: () => {
   commit();
   DASHCFG = false;
   render();
   toast("Dashboard saved");
  }
 }) ]));
 const host = el("div", {
  class: "cards"
 });
 const offHost = el("div", {
  class: "cards off"
 });
 function paint() {
  host.innerHTML = "";
  offHost.innerHTML = "";
  const shown = shownOf(), hidden = draft.filter(e => !e.on);
  const card = entry => {
   const mod = MODULES.find(m => m.id === entry.id);
   if (!mod || !modLive(mod)) return null;
   const got = CARD[mod.id] && CARD[mod.id]();
   const kids = !got ? [] : got.first ? [ firstLine(got.first) ] : got;
   const wide = entry.w === 2;
   const box = el("div", {
    class: "card cfg" + (wide ? " w2" : "") + (entry.on ? "" : " hid"),
    "data-id": entry.id
   }, [ el("span", {
    class: "ttl"
   }, [ el("span", {
    text: mod.name
   }) ]) ].concat(kids));
   const tools = [ entry.on ? el("button", {
    class: "tb" + (wide ? " on" : ""),
    type: "button",
    html: wide ? ICONS.narrow : ICONS.wide,
    "aria-pressed": wide ? "true" : "false",
    "aria-label": wide ? "Make " + mod.name + " half width" : "Make " + mod.name + " full width",
    onclick: () => {
     if (wide) delete entry.w; else entry.w = 2;
     commit();
     paint();
    }
   }) : null, el("button", {
    class: "tb",
    type: "button",
    html: entry.on ? ICONS.eye : ICONS.eyeOff,
    "aria-label": (entry.on ? "Hide " : "Show ") + mod.name,
    onclick: () => {
     entry.on = !entry.on;
     if (!entry.on) delete entry.w;
     commit();
     paint();
    }
   }) ].filter(Boolean);
   box.appendChild(el("span", {
    class: "cfgtools"
   }, tools));
   box._drop = ids => {
    reseat(ids);
    commit();
    paint();
   };
   if (entry.on) holdDrag(box, {
    grid: true,
    ghostClass: "card",
    skip: ".tb",
    lifted: h => [ ...h.children ].forEach(n => {
     n.classList.remove("orphan");
     n.style.gridColumn = "";
    }),
    drop: box._drop
   });
   return box;
  };
  shown.forEach(e => {
   const c = card(e);
   if (c) host.appendChild(c);
  });
  if (!shown.length) host.appendChild(el("div", {
   class: "box empty w2",
   text: "Every section is hidden."
  }));
  hidden.forEach(e => {
   const c = card(e);
   if (c) offHost.appendChild(c);
  });
  fillGrid(host);
  fillGrid(offHost);
 }
 root.appendChild(el("div", {
  class: "sec"
 }, [ host ]));
 root.appendChild(el("div", {
  class: "sec"
 }, [ el("h2", {}, [ el("span", {
  text: "Hidden"
 }) ]), offHost ]));
 paint();
}

function endDrag() {
 document.body.classList.remove("dragging");
 document.querySelectorAll(".dragghost").forEach(n => n.remove());
 document.querySelectorAll(".hole").forEach(n => n.classList.remove("hole"));
}

function openDashConfig() {
 DASHCFG = true;
 render();
}
