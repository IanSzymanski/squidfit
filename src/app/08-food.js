function recipePer100(r) {
 const g = r.items.reduce((s, i) => s + i.g, 0) || 1;
 const t = r.items.reduce((s, i) => {
  const f = foodById(i.id);
  if (!f) return s;
  const m = macrosFor(f, i.g);
  return {
   kcal: s.kcal + m.kcal,
   p: s.p + m.p,
   c: s.c + m.c,
   f: s.f + m.f,
   alc: s.alc + m.alc
  };
 }, {
  kcal: 0,
  p: 0,
  c: 0,
  f: 0,
  alc: 0
 });
 const per100 = {};
 [ "kcal", "p", "c", "f", "alc" ].forEach(k => per100[k] = t[k] / g * 100);
 return {
  totalG: g,
  per100: per100,
  total: t
 };
}

function asFood(x) {
 if (!x.items) return x;
 const r = recipePer100(x);
 return {
  id: x.id,
  name: x.name,
  ...r.per100,
  isRecipe: true,
  servG: r.totalG / (x.servings || 1),
  portions: [ {
   label: "whole recipe",
   g: r.totalG
  } ]
 };
}

function foodBasis(f, la) {
 const u = la && unitsFor(f).find(z => z.label === la.unit);
 const g = u ? la.qty * u.g : 0;
 const per = g > 0 ? g / 100 : f.servOnly ? (f.servG || 100) / 100 : 1;
 const n = k => r1((f[k] || 0) * per);
 return `${fmtEU((f.kcal || 0) * per)} · ${n("p")}P ${n("c")}C ${n("f")}F` + (g > 0 ? "" : f.servOnly ? " per serving" : " per 100 g");
}

function recentFoods(limit) {
 const seen = new Set, out = [];
 [ ...DAYS.values() ].sort((a, b) => a.d < b.d ? 1 : -1).forEach(day => (day.entries || []).forEach(e => {
  if (!e.src || seen.has(e.src)) return;
  seen.add(e.src);
  const f = foodById(e.src) || RECIPES.get(e.src);
  if (f) out.push(f);
 }));
 return out.slice(0, limit || 30);
}

function suggestFoods(hm, limit) {
 const minutes = t => (parseInt((t || "12:00").slice(0, 2), 10) || 0) * 60 + (parseInt((t || "12:00").slice(3, 5), 10) || 0);
 const target = minutes(hm);
 const today = todayISO();
 const score = new Map;
 DAYS.forEach(day => {
  const age = daysBetween(day.d, today);
  if (age < 0 || age > 120) return;
  const rec = Math.pow(.985, age);
  (day.entries || []).forEach(e => {
   if (!e.src) return;
   let d = Math.abs(minutes(e.t) - target);
   if (d > 720) d = 1440 - d;
   const w = Math.exp(-(d * d) / (2 * 80 * 80));
   if (w < .06) return;
   score.set(e.src, (score.get(e.src) || 0) + w * rec);
  });
 });
 return [ ...score.entries() ].sort((a, b) => b[1] - a[1]).map(([id]) => FOODS.get(id) || RECIPES.get(id) || foodById(id)).filter(Boolean).slice(0, limit || 6);
}

let AMTIDX = null;

function amountIndex() {
 if (AMTIDX) return AMTIDX;
 const m = new Map;
 [ ...DAYS.values() ].sort((a, b) => a.d < b.d ? -1 : 1).forEach(day => (day.entries || []).forEach(e => {
  if (e.src && e.qty > 0 && e.unit) m.set(e.src, {
   qty: e.qty,
   unit: e.unit
  });
 }));
 AMTIDX = m;
 return m;
}

function lastAmountFor(id) {
 return amountIndex().get(id) || null;
}

function useCounts() {
 const n = new Map;
 DAYS.forEach(day => (day.entries || []).forEach(e => {
  if (e.src) n.set(e.src, (n.get(e.src) || 0) + 1);
 }));
 return n;
}

function usedFirstAZ(list) {
 const n = useCounts(), c = f => n.get(f.id) || 0;
 const az = (a, b) => a.name.localeCompare(b.name, undefined, {
  sensitivity: "base"
 });
 return list.filter(f => c(f)).sort((a, b) => c(b) - c(a) || az(a, b)).concat(list.filter(f => !c(f)).sort(az));
}

let ADDONLY = "";

function searchFoods(q) {
 const s = (q || "").trim().toLowerCase();
 const pool = [], seen = new Set;
 const add = f => {
  if (f && !seen.has(f.id)) {
   seen.add(f.id);
   pool.push(f);
  }
 };
 if (ADDONLY === "recipes") {
  [ ...RECIPES.values() ].forEach(add);
  const rs = pool.map(asFood);
  if (!s) return rs;
  return usedFirstAZ(rs.filter(f => f.name.toLowerCase().includes(s)));
 }
 if (!s) recentFoods(60).forEach(add);
 [ ...RECIPES.values() ].forEach(add);
 [ ...FOODS.values() ].forEach(add);
 SEED.forEach(add);
 if (!s) return pool.slice(0, 80);
 const words = s.split(/\s+/);
 return usedFirstAZ(pool.filter(f => {
  const n = f.name.toLowerCase();
  return words.every(w => n.includes(w));
 })).slice(0, 80);
}

const FOOD_ICON_NAMES = [ "fMeat", "fFish", "fEgg", "fDairy", "fGrain", "fProduce", "fFat", "fSweet", "fDrink", "fBooze", "fMixed" ];

function foodKind(f) {
 if (!f) return "fMixed";
 const pk = (f.p || 0) * 4, ck = (f.c || 0) * 4, fk = (f.f || 0) * 9, ak = (f.alc || 0) * 7;
 const tot = pk + ck + fk + ak;
 const kcal = f.kcal || 0;
 const name = (f.name || "").toLowerCase();
 const head = name.split(",")[0].trim();
 const has = ws => ws.some(w => head.includes(w));
 if (ak > 0 && ak / (tot || 1) > .1) return "fBooze";
 if (!tot && !name) return "fMixed";
 if (has([ "beer", "wine", "vodka", "whiskey", "whisky", "tequila", "rum", "gin", "cider", "seltzer, hard" ])) return "fBooze";
 if (!tot) return has([ "coffee", "tea", "water", "diet ", "zero" ]) ? "fDrink" : "fMixed";
 if (has([ "coffee", "tea", "water", "soda", "cola", "juice", "broth", "smoothie", "lemonade" ])) return "fDrink";
 if (has([ "egg" ]) && !has([ "eggplant", "noodle" ])) return "fEgg";
 if (has([ "salmon", "tuna", "cod", "shrimp", "prawn", "fish", "tilapia", "sardine", "mackerel", "halibut", "trout", "crab", "lobster", "anchov" ])) return "fFish";
 if (has([ "milk", "yogurt", "yoghurt", "cheese", "cottage", "kefir", "cream", "whey", "casein" ])) return "fDairy";
 const P = pk / tot, C = ck / tot, F = fk / tot;
 if (P >= .4) return "fMeat";
 if (F >= .55) return "fFat";
 if (C >= .5) {
  if (kcal <= 110) return "fProduce";
  if (has([ "sugar", "candy", "chocolate", "cookie", "cake", "syrup", "honey", "donut", "doughnut", "ice cream", "jam", "pastry", "brownie" ])) return "fSweet";
  return "fGrain";
 }
 return "fMixed";
}

function foodIcon(f, size) {
 const k = foodKind(f);
 const n = el("span", {
  class: "fic",
  html: ICONS[k] || ICONS.fMixed,
  "aria-hidden": "true"
 });
 if (size) {
  n.style.width = size + "px";
  n.style.height = size + "px";
 }
 n.dataset.kind = k;
 return n;
}

function foodTag(f) {
 if (!f) return null;
 if (f.isRecipe || f.items) return el("span", {
  class: "chip",
  text: "recipe"
 });
 if (f.fromAi) return el("span", {
  class: "chip ai",
  text: "AI"
 });
 if (f.fromImport) return null;
 if (f.custom) return el("span", {
  class: "chip",
  text: "mine"
 });
 return null;
}

function amtText(la, mult) {
 const q = r2((la.qty || 0) * (mult || 1));
 return r1(q) + (la.unit === "g" || la.unit === "oz" ? la.unit : " " + la.unit);
}

function repeatAmount(food, la, mult) {
 const k = mult || 1;
 const units = unitsFor(food);
 const u = units.find(z => z.label === la.unit) || units[0];
 const qty = r2((la.qty || 0) * k);
 const g = qty * u.g;
 if (!(g > 0)) {
  openAmount(food);
  return;
 }
 const m = macrosFor(food, g);
 const entry = {
  id: uid(),
  t: ADDTIME || nowHM(),
  name: food.name,
  src: food.id,
  g: r2(g),
  unit: u.label,
  qty: qty,
  kcal: r1(m.kcal),
  p: r2(m.p),
  c: r2(m.c),
  f: r2(m.f),
  alc: r2(m.alc)
 };
 plateAdd(entry);
 toast(amtText(la, k) + " on the plate");
}

let ADDREFOCUS = false;

function refocusAddSearch() {
 if (PAGE !== "addfood") return;
 const i = document.querySelector("#p-addfood input[type=search]");
 if (!i) return;
 try {
  i.focus();
  i.select();
 } catch (e) {}
}

function foodSearch(onPick, state) {
 const st = state;
 const input = el("input", {
  type: "search",
  value: st.q,
  placeholder: "Search foods and recipes…",
  "aria-label": "Search foods"
 });
 const list = el("div", {
  class: st.page ? "reslist page" : "reslist"
 });
 const rowFor = x => {
  const f = asFood(x);
  const la = st.quick ? lastAmountFor(f.id) : null;
  const tag = x.seed && !f.isRecipe ? null : foodTag(f);
  const pick = el("button", {
   class: "pick",
   type: "button",
   onclick: () => onPick(f)
  }, [ foodIcon(f), el("span", {
   class: "nm"
  }, [ el("span", {
   class: "t1 nmline"
  }, [ el("span", {
   class: "nm1",
   text: f.name
  }), tag ].filter(Boolean)), el("span", {
   class: "t2",
   text: foodBasis(f, la)
  }) ]) ]);
  if (!la) return el("div", {
   class: "row split"
  }, [ pick ]);
  const line = el("div", {
   class: "row split"
  }, [ pick, el("button", {
   class: "plus",
   type: "button",
   "aria-label": "Add " + r1(la.qty) + " " + la.unit + " of " + f.name + " to the plate",
   onclick: () => repeatAmount(f, la)
  }, [ icon("add"), el("span", {
   class: "amt",
   text: amtText(la, 1)
  }) ]) ]);
  return swipeScale(line, {
   right: {
    max: 6,
    css: "var(--interactive)",
    fg: "var(--on-interactive)",
    hint: amtText(la, 1),
    label: k => amtText(la, k),
    fn: k => repeatAmount(f, la, k)
   }
  });
 };
 const paint = () => {
  list.innerHTML = "";
  const res = searchFoods(st.q);
  if (!res.length) {
   if (ADDONLY === "recipes") {
    list.appendChild(emptyAdd(st.q ? `No recipe matches "${st.q}"` : "Build a recipe", () => openRecipeEditor()));
    return;
   }
   list.appendChild(el("div", {
    class: "empty"
   }, [ document.createTextNode(st.q ? `Nothing matches "${st.q}".` : "Nothing here yet."), st.q ? el("div", {
    class: "bar mt",
    style: "justify-content:center"
   }, [ el("button", {
    class: "btn sm",
    type: "button",
    text: "Create it",
    onclick: () => openFoodEditor(null, st.q, f => onPick(f))
   }), AI ? el("button", {
    class: "btn sm",
    type: "button",
    "aria-label": "Describe " + st.q,
    onclick: () => openAiFood(st.q, f => onPick(f))
   }, [ icon("ai", 14), el("span", {
    text: "Describe"
   }) ]) : null ].filter(Boolean)) : null ]));
   return;
  }
  let rest = res;
  if (!st.q && !ADDONLY) {
   const when = st.at || nowHM();
   const sug = suggestFoods(when, 6);
   if (sug.length) {
    const ids = new Set(sug.map(f => f.id));
    list.appendChild(el("div", {
     class: "grouphd",
     text: "Around " + fmtHM(when)
    }));
    sug.forEach(x => list.appendChild(rowFor(x)));
    list.appendChild(el("div", {
     class: "grouphd",
     text: "Everything else"
    }));
    rest = res.filter(x => !ids.has(x.id));
   }
  }
  const more = from => {
   const end = Math.min(rest.length, from + 24);
   for (let i = from; i < end; i++) list.appendChild(rowFor(rest[i]));
   if (end >= rest.length) return;
   if (typeof IntersectionObserver !== "function") {
    more(end);
    return;
   }
   const mark = el("div", {
    class: "more",
    "aria-hidden": "true"
   });
   list.appendChild(mark);
   const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    mark.remove();
    more(end);
   }, {
    rootMargin: "600px 0px"
   });
   io.observe(mark);
  };
  more(0);
 };
 input.addEventListener("input", () => {
  st.q = input.value;
  paint();
 });
 paint();
 return {
  input: input,
  list: list,
  paint: paint
 };
}

let ADDQ = "";

function openSearch(v) {
 ADDQ = v || "";
 ADDMODE = "log";
 ADDTIME = null;
 go("addfood");
 const i = document.querySelector("#p-addfood input[type=search]");
 if (!i) return;
 i.focus();
 const n = i.value.length;
 try {
  i.setSelectionRange(n, n);
 } catch (e) {}
}

VIEWS.addfood = function viewAddFood() {
 const root = $("#p-addfood");
 root.innerHTML = "";
 const n = PLATE.items.length;
 const st = {
  q: ADDQ,
  at: ADDTIME,
  page: true,
  quick: true
 };
 const ui = foodSearch(f => {
  ADDQ = st.q;
  ADDREFOCUS = FOCUSBEFORE === ui.input;
  openAmount(f);
 }, st);
 ui.input.addEventListener("input", () => {
  ADDQ = st.q;
 });
 if (ADDONLY === "recipes") {
  root.appendChild(el("div", {
   class: "sec bar"
  }, [ backLink(), el("div", {
   class: "grow hd",
   text: "Recipes"
  }), el("button", {
   class: "btn sm",
   type: "button",
   text: "All foods",
   onclick: () => {
    ADDONLY = "";
    ADDQ = "";
    render();
   }
  }) ]));
  root.appendChild(ui.list);
  root.appendChild(el("div", {
   class: "botbar"
  }, [ el("div", {
   class: "botbar-in"
  }, [ ui.input, el("button", {
   class: "btn logbtn" + (n ? " pri" : ""),
   type: "button",
   onclick: () => {
    const c = plateCommit();
    ADDQ = "";
    ADDONLY = "";
    ADDMODE = "log";
    goRoot("food");
    if (c) toast(`${c} item${c === 1 ? "" : "s"} logged`);
   }
  }, [ icon("tick"), el("span", {
   text: n ? `Log ${n}` : "Log foods"
  }) ]) ]) ]));
  return;
 }
 const day = getDay(SELDATE);
 root.appendChild(el("div", {
  class: "sec addhead"
 }, [ backLink(), el("button", {
  class: "kcalbtn",
  type: "button",
  "aria-label": n ? "Macro detail, plate included" : "Macro detail",
  onclick: () => go("macros")
 }, [ kcalBar(totalsOf(day.entries), 148, 40, plateTotals().kcal) ]), el("button", {
  class: "btn sm cartbtn" + (n ? " pri" : ""),
  type: "button",
  "aria-label": n ? `Plate, ${n} item${n === 1 ? "" : "s"}` : "Plate, empty",
  onclick: () => go("plate")
 }, [ icon("plate", 14), n ? el("span", {
  class: "cnt",
  text: String(n)
 }) : null ].filter(Boolean)) ]));
 root.appendChild(el("div", {
  class: "sec addtools"
 }, [ ADDTIME ? el("span", {
  class: "small muted mono fixed",
  text: fmtHM(ADDTIME)
 }) : null, el("button", {
  class: "btn sm",
  type: "button",
  text: "Quick",
  onclick: () => openQuick()
 }), el("button", {
  class: "btn sm",
  type: "button",
  text: "Recipes",
  onclick: () => openRecipeMenu()
 }), AI ? el("button", {
  class: "btn sm",
  type: "button",
  onclick: () => openAiMeal()
 }, [ icon("ai", 14), el("span", {
  text: "Describe"
 }) ]) : null ].filter(Boolean)));
 root.appendChild(ui.list);
 const logBtn = el("button", {
  class: "btn logbtn" + (n ? " pri" : ""),
  type: "button",
  onclick: () => {
   const c = plateCommit();
   ADDQ = "";
   ADDMODE = "log";
   goRoot("food");
   if (c) toast(`${c} item${c === 1 ? "" : "s"} logged`);
  }
 }, [ icon("tick"), el("span", {
  text: n ? `Log ${n}` : "Log foods"
 }) ]);
 const bar = el("div", {
  class: "botbar"
 }, [ el("div", {
  class: "botbar-in"
 }, [ ui.input, logBtn ]) ]);
 root.appendChild(bar);
 ui.input.addEventListener("focus", () => document.body.classList.add("kbdbar"));
 let lastY = 0;
 const onScroll = () => {
  if (PAGE !== "addfood") return;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  if (document.activeElement === ui.input) ui.input.blur();
  document.body.classList.remove("kbdbar");
  if (y > lastY + 6 && y > 40) bar.classList.add("tuck"); else if (y < lastY - 6) bar.classList.remove("tuck");
  lastY = y;
 };
 window.addEventListener("scroll", onScroll, {
  passive: true
 });
 ui.list.addEventListener("scroll", onScroll, {
  passive: true
 });
 onLeave(() => window.removeEventListener("scroll", onScroll));
};

function openFoodPicker(onPick) {
 const at = ADDTIME;
 if (!onPick) {
  go("addfood");
  return;
 }
 const st = {
  q: "",
  at: at
 };
 const pick = f => {
  closeModal();
  ADDTIME = at;
  onPick(f);
 };
 const ui = foodSearch(pick, st);
 openModal({
  title: "Pick an ingredient",
  body: [ ui.input, ui.list ],
  footer: [ el("button", {
   class: "btn",
   type: "button",
   text: "New food",
   onclick: () => openFoodEditor(null, st.q, f => pick(f))
  }) ]
 });
}

function placeEntry(entry, existing, onPlate, mode) {
 if (onPlate) {
  PLATE.items = PLATE.items.map(i => i.id === entry.id ? entry : i);
  lsSave();
  render();
  toast("Updated on the plate");
 } else if (existing) {
  const day = editDay(SELDATE);
  day.entries = day.entries.map(e => e.id === existing.id ? entry : e);
  saveDay(day);
  toast("Updated");
 } else if (mode === "log") {
  logEntry(entry);
  toast("Logged at " + fmtHM(entry.t));
 } else return false;
 return true;
}

function entryFooter(existing, onPlate, done, ret, saveAs, mode) {
 const n = PLATE.items.length, adding = PAGE === "addfood";
 return [ existing ? el("button", {
  class: "btn bad icon",
  type: "button",
  html: ICONS.trash,
  "aria-label": "Remove",
  onclick: () => {
   done();
   const gone = {
    ...existing
   }, day = SELDATE;
   if (onPlate) {
    plateRemove(existing.id);
    toastUndo("Removed from plate", () => {
     PLATE.items = PLATE.items.concat([ gone ]);
     lsSave();
     render();
    });
   } else {
    const d = editDay(day);
    d.entries = d.entries.filter(e => e.id !== existing.id);
    saveDay(d);
    toastUndo("Removed", () => {
     const b = editDay(day);
     b.entries.push(gone);
     saveDay(b);
    });
   }
   if (ret) ret();
  }
 }) : null, existing || adding ? null : el("button", {
  class: "btn cartbtn" + (mode === "plate" ? " pri" : ""),
  type: "button",
  onclick: saveAs("plate")
 }, [ el("span", {
  text: "To plate"
 }), n ? el("span", {
  class: "cnt",
  text: String(n)
 }) : null ].filter(Boolean)), el("button", {
  class: "btn pri cartbtn",
  type: "button",
  onclick: saveAs(existing ? "log" : adding ? "plate" : "log")
 }, [ el("span", {
  text: existing ? "Save" : adding ? "Add to plate" : "Log it"
 }), !existing && adding && n ? el("span", {
  class: "cnt",
  text: String(n)
 }) : null ].filter(Boolean)) ].filter(Boolean);
}

function openAmount(food, existing, after) {
 const units = unitsFor(food);
 let handled = false;
 const ret = after || null;
 const done = () => {
  handled = true;
  closeModal();
 };
 let ui = 0;
 const la = existing ? null : lastAmountFor(food.id);
 if (existing) {
  const i = units.findIndex(u => u.label === existing.unit);
  if (i >= 0) ui = i;
 } else if (la) {
  const i = units.findIndex(u => u.label === la.unit);
  if (i >= 0) ui = i;
 } else if (units.length > 2) ui = 2;
 const qtyIn = el("input", {
  type: "number",
  step: "any",
  min: "0",
  inputmode: "decimal",
  value: existing ? r2(existing.qty) : la ? r2(la.qty) : units[ui].key === "g" ? 100 : 1
 });
 const unitSel = el("select", {}, units.map((u, i) => el("option", {
  value: i,
  selected: i === ui ? "" : null,
  text: u.key === "g" || u.key === "oz" ? u.label : `${u.label} (${r0(u.g)} g)`
 })));
 const tIn = el("input", {
  type: "time",
  value: existing ? existing.t : ADDTIME || nowHM()
 });
 const out = el("div", {
  class: "box pad"
 });
 const calc = () => {
  const u = units[+unitSel.value] || units[0];
  const g = (parseFloat(qtyIn.value) || 0) * u.g;
  const m = macrosFor(food, g);
  out.innerHTML = "";
  out.appendChild(el("div", {
   class: "big mono",
   text: fmtEU(m.kcal)
  }));
  out.appendChild(el("div", {
   class: "small muted",
   text: `${r1(g)} g`
  }));
  out.appendChild(el("hr", {
   class: "hr"
  }));
  MACROS.forEach(n => out.appendChild(kv(n.label, r1(m[n.k]) + " g")));
  return {
   g: g,
   m: m,
   u: u
  };
 };
 [ qtyIn, unitSel ].forEach(n => n.addEventListener("input", calc));
 const onPlate = !!(existing && PLATE.items.some(i => i.id === existing.id));
 const save = () => {
  const {g: g, m: m, u: u} = calc();
  if (!(g > 0)) {
   toast("Enter an amount.");
   return;
  }
  const entry = {
   id: existing ? existing.id : uid(),
   t: tIn.value || nowHM(),
   name: food.name,
   src: food.id,
   g: r2(g),
   unit: u.label,
   qty: parseFloat(qtyIn.value) || 0,
   kcal: r1(m.kcal),
   p: r2(m.p),
   c: r2(m.c),
   f: r2(m.f),
   alc: r2(m.alc)
  };
  const at = ADDTIME;
  ADDTIME = null;
  done();
  if (placeEntry(entry, existing, onPlate, mode)) {} else {
   ADDMODE = "plate";
   plateAdd(entry);
   toast("On the plate");
   if (ADDREFOCUS) refocusAddSearch();
   ADDREFOCUS = false;
   if (!ret) {
    ADDTIME = at;
    if (PAGE !== "addfood") openFoodPicker();
    return;
   }
  }
  if (ret) ret();
 };
 const saveAs = m => () => {
  mode = m;
  save();
 };
 let mode = !existing && PAGE === "addfood" ? "plate" : ADDMODE;
 openModal({
  save: save,
  focus: qtyIn,
  onClosed: () => {
   if (!handled && ret) ret();
  },
  title: food.name,
  body: [ el("div", {
   class: "bar"
  }, [ labelled("Amount", qtyIn, "amt"), labelled("Unit", unitSel, "grow") ]), labelled("Time", tIn), out, food.isRecipe ? null : el("button", {
   class: "btn sm start",
   type: "button",
   text: "Edit this food",
   onclick: () => {
    closeModal();
    openFoodEditor(food);
   }
  }) ],
  footer: entryFooter(existing, onPlate, done, ret, saveAs, mode)
 });
 calc();
}

function openEntry(entry, after) {
 const f = foodById(entry.src) || RECIPES.get(entry.src);
 if (f) return openAmount(asFood(f), entry, after);
 openQuick(entry, after);
}

function openQuick(existing, after) {
 let handled = false;
 const ret = after || null;
 const done = () => {
  handled = true;
  closeModal();
 };
 const F = {};
 F.name = el("input", {
  type: "text",
  value: existing ? existing.name : "",
  placeholder: "e.g. burrito from the place on 3rd"
 });
 [ "kcal", "p", "c", "f" ].forEach(k => F[k] = el("input", {
  type: "number",
  step: "any",
  min: "0",
  inputmode: "decimal",
  value: existing ? r1(k === "kcal" ? eDisp(existing[k]) : existing[k] || 0) : ""
 }));
 const tIn = el("input", {
  type: "time",
  value: existing ? existing.t : ADDTIME || nowHM()
 });
 const onPlate = !!(existing && PLATE.items.some(i => i.id === existing.id));
 const save = () => {
  const g = k => k === "kcal" ? eFromDisp(parseFloat(F[k].value) || 0) : parseFloat(F[k].value) || 0;
  const kcal = g("kcal") || kcalFromMacros({
   p: g("p"),
   c: g("c"),
   f: g("f")
  });
  if (!kcal) {
   toast("Enter " + NUTS[0].label.toLowerCase() + " or macros.");
   return;
  }
  const entry = {
   id: existing ? existing.id : uid(),
   t: tIn.value || nowHM(),
   name: F.name.value.trim() || "Quick entry",
   src: null,
   g: existing ? existing.g : 0,
   unit: "entry",
   qty: 1,
   kcal: kcal,
   p: g("p"),
   c: g("c"),
   f: g("f"),
   alc: 0
  };
  ADDTIME = null;
  done();
  if (!placeEntry(entry, existing, onPlate, mode)) {
   ADDMODE = "plate";
   plateAdd(entry);
   toast("On the plate");
  }
  if (ret) ret();
 };
 const saveAs = m => () => {
  mode = m;
  save();
 };
 let mode = !existing && PAGE === "addfood" ? "plate" : ADDMODE;
 openModal({
  save: save,
  onClosed: () => {
   if (!handled && ret) ret();
  },
  title: existing ? "Edit entry" : "Quick " + NUTS[0].label.toLowerCase(),
  body: [ labelled("Name", F.name), el("div", {
   class: "grid2"
  }, [ labelled(NUTS[0].label + " (" + eUnit() + ")", F.kcal), labelled("Time", tIn) ]), el("div", {
   class: "grid2"
  }, [ labelled("Protein g", F.p), labelled("Carbs g", F.c), labelled("Fat g", F.f) ]) ],
  footer: entryFooter(existing, onPlate, done, ret, saveAs, mode)
 });
}

function openFoodEditor(food, presetName, after) {
 const isCopy = food && food.seed;
 const nm = el("input", {
  type: "text",
  placeholder: "Food name",
  value: food ? isCopy ? food.name + " (mine)" : food.name : presetName || ""
 });
 const basis = el("select", {}, [ el("option", {
  value: "100",
  text: "per 100 g"
 }), el("option", {
  value: "serv",
  text: "per serving"
 }) ]);
 const servG = el("input", {
  type: "number",
  step: "any",
  min: "1",
  inputmode: "decimal",
  value: food && food.servG ? food.servG : "",
  placeholder: "grams in one serving"
 });
 const servRow = labelled("Grams in one serving", servG, "hide");
 basis.addEventListener("change", () => servRow.classList.toggle("hide", basis.value !== "serv"));
 const F = {};
 [ "kcal", "p", "c", "f", "alc" ].forEach(k => F[k] = el("input", {
  type: "number",
  step: "any",
  min: "0",
  inputmode: "decimal",
  value: food ? r2(k === "kcal" ? eDisp(food[k]) : food[k] || 0) : ""
 }));
 const chk = el("div", {
  class: "small muted"
 });
 const recheck = () => {
  const g = k => k === "kcal" ? eFromDisp(parseFloat(F[k].value) || 0) : parseFloat(F[k].value) || 0;
  const calc = kcalFromMacros({
   p: g("p"),
   c: g("c"),
   f: g("f"),
   alc: g("alc")
  }), k = g("kcal");
  chk.textContent = !k && calc ? `Macros come to ${fmtEU(calc)} — leave ${NUTS[0].label.toLowerCase()} blank to use that.` : k && calc && Math.abs(k - calc) / k > .15 ? `${fmtEU(k)} doesn't match the macros (${fmtEU(calc)}). Worth a second look.` : "";
 };
 Object.values(F).forEach(i => i.addEventListener("input", recheck));
 const save = () => {
  const name = nm.value.trim();
  if (!name) {
   toast("Give it a name.");
   return;
  }
  const g = k => k === "kcal" ? eFromDisp(parseFloat(F[k].value) || 0) : parseFloat(F[k].value) || 0;
  let v = {
   kcal: g("kcal"),
   p: g("p"),
   c: g("c"),
   f: g("f"),
   alc: g("alc")
  };
  if (!v.kcal) v.kcal = kcalFromMacros(v);
  if (!v.kcal) {
   toast("Enter " + NUTS[0].label.toLowerCase() + " or macros.");
   return;
  }
  let sg = null;
  if (basis.value === "serv") {
   sg = parseFloat(servG.value);
   if (!(sg > 0)) {
    toast("How many grams is one serving?");
    return;
   }
   const s = 100 / sg;
   Object.keys(v).forEach(k => v[k] *= s);
  }
  const id = food && !isCopy ? food.id : "c" + uid();
  const portions = sg ? [ {
   label: "serving",
   g: sg
  } ] : [];
  saveFood({
   id: id,
   name: name,
   ...v,
   servG: sg,
   portions: portions,
   custom: true
  });
  closeModal();
  toast(food && !isCopy ? "Updated" : "Saved to your foods");
  if (after) after({
   id: id,
   name: name,
   ...v,
   servG: sg,
   portions: portions,
   custom: true
  });
 };
 openModal({
  save: save,
  title: food ? isCopy ? "Copy to my foods" : "Edit food" : "New food",
  body: [ food && foodTag(food) ? el("div", {
   class: "nmline"
  }, [ foodIcon(food, 24), foodTag(food), food.fromAi ? el("span", {
   class: "small muted",
   text: food.aiBasis === "label" ? "from the product" : "from the category"
  }) : null ].filter(Boolean)) : null, labelled("Name", nm), labelled("Numbers are", basis), servRow, labelled(NUTS[0].label + " (" + eUnit() + ")", F.kcal), el("div", {
   class: "grid2"
  }, [ labelled("Protein g", F.p), labelled("Carbs g", F.c), labelled("Fat g", F.f), labelled("Alcohol g", F.alc) ]), chk ],
  footer: [ food && !isCopy ? el("button", {
   class: "btn bad icon",
   type: "button",
   html: ICONS.trash,
   "aria-label": "Delete food",
   onclick: () => {
    const gone = {
     ...food
    };
    delFood(food.id);
    closeModal();
    toastUndo("Food deleted", () => saveFood(gone));
   }
  }) : null, el("button", {
   class: "btn pri",
   type: "button",
   text: "Save",
   onclick: save
  }) ]
 });
}

function openRecipeEditor(recipe) {
 let items = recipe ? recipe.items.map(i => ({
  ...i
 })) : [];
 let steps = recipe && recipe.steps ? recipe.steps.slice() : null;
 const nm = el("input", {
  type: "text",
  value: recipe ? recipe.name : "",
  placeholder: "e.g. Sunday chili"
 });
 const serv = el("input", {
  type: "number",
  min: "1",
  step: "1",
  inputmode: "numeric",
  value: recipe ? recipe.servings : 1
 });
 const list = el("div", {
  class: "box rows"
 });
 const tot = el("div", {
  class: "box pad"
 });
 const ingAdd = el("button", {
  class: "btn sm",
  type: "button",
  text: "Add",
  onclick: () => addIng()
 });
 const paint = () => {
  list.innerHTML = "";
  ingAdd.classList.toggle("hide", !items.length);
  if (!items.length) list.appendChild(emptyAdd("Add an ingredient", () => addIng()));
  items.forEach((it, idx) => {
   const f = foodById(it.id);
   const m = f ? macrosFor(f, it.g) : {
    kcal: 0
   };
   list.appendChild(row({
    t1: f ? f.name : "(missing food)",
    t2: `${r1(it.g)} g · ${fmtEU(m.kcal)}`,
    tail: [ el("button", {
     class: "btn sm bad icon",
     type: "button",
     html: ICONS.trash,
     "aria-label": "Remove",
     onclick: () => {
      items.splice(idx, 1);
      paint();
     }
    }) ]
   }));
  });
  const n = Math.max(1, parseInt(serv.value) || 1);
  const r = recipePer100({
   items: items,
   servings: n
  });
  tot.innerHTML = "";
  tot.appendChild(el("div", {
   class: "big mono",
   text: fmtEU(r.total.kcal / n)
  }));
  tot.appendChild(el("div", {
   class: "small muted",
   text: `per serving · ${r0(r.totalG / n)} g`
  }));
  tot.appendChild(kv("Protein", r1(r.total.p / n) + " g"));
  tot.appendChild(kv("Carbs", r1(r.total.c / n) + " g"));
  tot.appendChild(kv("Fat", r1(r.total.f / n) + " g"));
 };
 serv.addEventListener("input", paint);
 const addIng = () => openFoodPicker(f => {
  const units = unitsFor(f);
  const qi = el("input", {
   type: "number",
   step: "any",
   value: 100,
   inputmode: "decimal"
  });
  const us = el("select", {}, units.map((u, i) => el("option", {
   value: i,
   text: u.label,
   selected: i === 0 ? "" : null
  })));
  openModal({
   title: f.name,
   body: [ el("div", {
    class: "bar"
   }, [ labelled("Amount", qi, "amt"), labelled("Unit", us, "grow") ]) ],
   footer: [ el("button", {
    class: "btn pri",
    type: "button",
    text: "Add",
    onclick: () => {
     const g = (parseFloat(qi.value) || 0) * units[+us.value].g;
     if (g > 0) items.push({
      id: f.id,
      g: r2(g)
     });
     closeModal();
     paint();
    }
   }) ]
  });
 });
 const saveRecipeNow = () => {
  const name = nm.value.trim();
  if (!name) {
   toast("Name it.");
   return;
  }
  if (!items.length) {
   toast("Add an ingredient.");
   return;
  }
  const out = {
   id: recipe ? recipe.id : "r" + uid(),
   name: name,
   servings: Math.max(1, parseInt(serv.value) || 1),
   items: items
  };
  if (steps && steps.length) out.steps = steps;
  saveRecipe(out);
  closeModal();
  toast("Recipe saved");
 };
 openModal({
  save: saveRecipeNow,
  title: recipe ? "Edit recipe" : "New recipe",
  body: [ labelled("Name", nm), labelled("Servings it makes", serv), listHead("Ingredients", ingAdd), list, tot, steps && steps.length ? el("div", {
   class: "note"
  }, [ el("b", {
   text: "Method"
  }), el("ol", {
   class: "steps"
  }, steps.map(s => el("li", {
   text: s
  }))) ]) : null ],
  footer: [ recipe ? el("button", {
   class: "btn bad icon",
   type: "button",
   html: ICONS.trash,
   "aria-label": "Delete recipe",
   onclick: () => {
    const gone = JSON.parse(JSON.stringify(recipe));
    delRecipe(recipe.id);
    closeModal();
    toastUndo("Recipe deleted", () => saveRecipe(gone));
   }
  }) : null, el("button", {
   class: "btn pri",
   type: "button",
   text: "Save",
   onclick: saveRecipeNow
  }) ]
 });
 paint();
}

const AI_ERR = {
 rate_limited: "Too many requests just now — give it a minute.",
 session_expired: "Sign in again and retry.",
 refused: "Claude wouldn't answer that one. Try describing the dish differently.",
 empty_completion: "Nothing came back. Try a shorter description.",
 invalid_json: "The answer came back malformed. Try again.",
 upstream_error: "The connection dropped part-way. Try again.",
 prompt_too_large: "That description is too long."
};

function recipePrompt(idea, servings) {
 const known = [ ...FOODS.values() ].concat(SEED).map(f => f.name);
 return [ "You are helping build a recipe for a food-logging app. The standing brief is:", "higher in protein and lower in calories than the usual version of the dish, while still", "being something a person would actually want to eat. Do not comment on the user's diet.", "", "The idea: " + idea, "Servings wanted: " + servings, "", "Reply with ONLY a JSON object of this shape:", '{"name":"short recipe name","servings":' + servings + ",", ' "ingredients":[{"name":"Chicken breast, cooked","grams":340,"kcal":165,"p":31,"c":0,"f":3.6}],', ' "steps":["step one","step two"],', ' "note":"one sentence on what was swapped to raise protein or cut calories"}', "", "Rules for ingredients: grams is the total in the whole recipe; kcal, p, c and f are", "PER 100 GRAMS of that ingredient as it goes in (cooked weight for things cooked first).", "Use these exact names where one fits, so the app can reuse its own numbers:", known.slice(0, 160).join("; "), "For anything else, invent a clear name and give honest per-100 g figures.", "Six to twelve ingredients. Five to eight steps." ].join("\n");
}

function openRecipeMenu() {
 openModal({
  title: "Recipes",
  body: [ el("div", {
   class: "tiles"
  }, [ AI ? tile("ai", "From an idea", "higher protein, lighter", openAiRecipe) : null, tile("pen", "By hand", "pick ingredients", () => openRecipeEditor()), tile("food", "Log a saved one", "your recipes", () => {
   ADDTIME = null;
   ADDMODE = "log";
   ADDQ = "";
   ADDONLY = "recipes";
   if (PAGE === "addfood") render(); else go("addfood");
  }) ].filter(Boolean)) ]
 });
}

function openAiRecipe() {
 const idea = el("textarea", {
  placeholder: "e.g. something like chicken parm, or a breakfast burrito I can make ahead"
 });
 const serv = el("input", {
  type: "number",
  min: "1",
  max: "12",
  step: "1",
  inputmode: "numeric",
  value: 2
 });
 const out = el("div", {});
 let busy = false;
 const goBtn = el("button", {
  class: "btn pri",
  type: "button",
  text: "Generate",
  onclick: () => run()
 });
 async function run() {
  const text = idea.value.trim();
  if (!text) {
   toast("Describe the idea first.");
   return;
  }
  if (busy) return;
  busy = true;
  goBtn.disabled = true;
  goBtn.textContent = "Thinking…";
  out.innerHTML = "";
  out.appendChild(el("div", {
   class: "box pad bar"
  }, [ el("span", {
   class: "spin"
  }), el("span", {
   class: "small muted",
   text: "Working it out — this takes a few seconds."
  }) ]));
  try {
   const n = Math.max(1, Math.min(12, parseInt(serv.value) || 2));
   const data = await AI.json(recipePrompt(text, n), {
    modelTier: S.ai.tier
   });
   showResult(data, n);
  } catch (e) {
   out.innerHTML = "";
   const code = e && e.code;
   out.appendChild(el("div", {
    class: "note",
    text: AI_ERR[code] || "That didn't work. Try again."
   }));
  } finally {
   busy = false;
   goBtn.disabled = false;
   goBtn.textContent = "Generate";
  }
 }
 function materialise(data) {
  const byName = new Map;
  [ ...FOODS.values() ].concat(SEED).forEach(f => byName.set(f.name.toLowerCase().trim(), f));
  const items = [], created = [];
  (data.ingredients || []).forEach(ing => {
   const g = Math.round(parseFloat(ing.grams) || 0);
   if (!(g > 0) || !ing.name) return;
   const hit = byName.get(String(ing.name).toLowerCase().trim());
   if (hit) {
    items.push({
     id: hit.id,
     g: g
    });
    return;
   }
   const kcal = parseFloat(ing.kcal) || 0, p = parseFloat(ing.p) || 0, c = parseFloat(ing.c) || 0, f = parseFloat(ing.f) || 0;
   const food = {
    id: "c" + uid(),
    name: String(ing.name).slice(0, 80),
    kcal: kcal || kcalFromMacros({
     p: p,
     c: c,
     f: f
    }),
    p: p,
    c: c,
    f: f,
    alc: 0,
    servG: null,
    portions: [],
    custom: true,
    fromAi: true
   };
   created.push(food);
   items.push({
    id: food.id,
    g: g
   });
  });
  return {
   items: items,
   created: created
  };
 }
 function showResult(data, fallbackServings) {
  out.innerHTML = "";
  if (!data || !Array.isArray(data.ingredients) || !data.ingredients.length) {
   out.appendChild(el("div", {
    class: "note",
    text: "The answer had no ingredients in it. Try again."
   }));
   return;
  }
  const {items: items, created: created} = materialise(data);
  if (!items.length) {
   out.appendChild(el("div", {
    class: "note",
    text: "None of the ingredients came back usable. Try again."
   }));
   return;
  }
  const servings = Math.max(1, parseInt(data.servings) || fallbackServings);
  created.forEach(f => FOODS.set(f.id, f));
  const r = recipePer100({
   items: items,
   servings: servings
  });
  const per = k => r.total[k] / servings;
  const box = el("div", {
   class: "box pad"
  }, [ el("div", {
   class: "hd",
   text: data.name || "Recipe"
  }), el("div", {
   class: "small muted",
   text: `${servings} serving${servings > 1 ? "s" : ""} · ${r0(r.totalG / servings)} g each`
  }), el("hr", {
   class: "hr"
  }), el("div", {
   class: "big mono",
   text: fmtEU(per("kcal"))
  }), el("div", {
   class: "small muted",
   text: "per serving"
  }), el("hr", {
   class: "hr"
  }), kv("Protein", r1(per("p")) + " g"), kv("Carbs", r1(per("c")) + " g"), kv("Fat", r1(per("f")) + " g") ]);
  const ing = el("div", {
   class: "box rows"
  }, items.map(it => {
   const f = foodById(it.id);
   return row({
    t1: f ? f.name : "?",
    val: r1(it.g) + " g"
   });
  }));
  const steps = Array.isArray(data.steps) && data.steps.length ? el("div", {
   class: "note"
  }, [ el("b", {
   text: "Method"
  }), el("ol", {
   class: "steps"
  }, data.steps.slice(0, 12).map(s => el("li", {
   text: String(s)
  }))) ]) : null;
  const discard = () => created.forEach(f => FOODS.delete(f.id));
  out.appendChild(box);
  if (data.note) out.appendChild(el("div", {
   class: "small muted mt",
   text: String(data.note)
  }));
  out.appendChild(ing);
  if (steps) out.appendChild(steps);
  out.appendChild(el("div", {
   class: "wrap mt"
  }, [ el("button", {
   class: "btn pri grow",
   type: "button",
   text: "Save recipe",
   onclick: () => {
    clearDemo();
    created.forEach(f => {
     FOODS.set(f.id, f);
     put("foods/" + f.id, f);
    });
    const out2 = {
     id: "r" + uid(),
     name: data.name || "Recipe",
     servings: servings,
     items: items
    };
    if (Array.isArray(data.steps) && data.steps.length) out2.steps = data.steps.map(String).slice(0, 12);
    saveRecipe(out2);
    closeModal();
    toast("Recipe saved");
   }
  }), el("button", {
   class: "btn",
   type: "button",
   text: "Try again",
   onclick: () => {
    discard();
    run();
   }
  }) ]));
 }
 openModal({
  guard: true,
  title: "Recipe from an idea",
  body: [ labelled("The idea", idea), labelled("Servings", serv, "narrow"), out ],
  footer: [ goBtn ]
 });
}

VIEWS.library = function viewLibrary() {
 const root = $("#p-library");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 const mk = (title, arr, onclick, empty, onNew) => {
  const box = el("div", {
   class: "box" + (arr.length ? " rows" : "")
  });
  if (!arr.length) box.appendChild(emptyAdd(empty, onNew));
  arr.forEach(x => {
   const f = asFood(x);
   box.appendChild(row({
    t1: x.name,
    t2: x.items ? `${x.servings} serving${x.servings > 1 ? "s" : ""} · ${fmtEU(recipePer100(x).total.kcal / x.servings)} each` : foodBasis(f),
    go: true,
    onclick: () => onclick(x)
   }));
  });
  return sec(title, arr.length ? el("button", {
   class: "btn sm",
   type: "button",
   text: "New",
   onclick: onNew
  }) : null, [ box ]);
 };
 root.appendChild(mk("Recipes", [ ...RECIPES.values() ], r => openRecipeEditor(r), "New recipe", () => openRecipeEditor()));
 root.appendChild(mk("My foods", [ ...FOODS.values() ], f => openFoodEditor(f), "New food", () => openFoodEditor()));
};
