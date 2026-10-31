function openPlate() {
 if (PLATE.items.length) go("plate");
}

function plateBase(e) {
 return e.base || {
  qty: e.qty,
  g: e.g
 };
}

function plateScale(e, mult) {
 const base = plateBase(e), k = clamp(mult || 1, 1, 12);
 const qty = r2(base.qty * k), g = r2(base.g * k);
 const food = foodById(e.src) || RECIPES.get(e.src);
 const m = food ? macrosFor(asFood(food), g) : {
  kcal: e.kcal / (e.qty || 1) * qty,
  p: e.p / (e.qty || 1) * qty,
  c: e.c / (e.qty || 1) * qty,
  f: e.f / (e.qty || 1) * qty,
  alc: (e.alc || 0) / (e.qty || 1) * qty
 };
 PLATE.items = PLATE.items.map(i => i.id !== e.id ? i : {
  ...i,
  base: base,
  qty: qty,
  g: g,
  kcal: r1(m.kcal),
  p: r2(m.p),
  c: r2(m.c),
  f: r2(m.f),
  alc: r2(m.alc || 0)
 });
 lsSave();
 render();
 toast(r1(qty) + " " + e.unit);
}

VIEWS.plate = function viewPlate() {
 const root = $("#p-plate");
 root.innerHTML = "";
 const more = () => {
  ADDMODE = "plate";
  go("addfood");
 };
 root.appendChild(pageBar([ PLATE.items.length ? el("button", {
  class: "btn sm",
  type: "button",
  text: "Add more",
  onclick: more
 }) : null ]));
 if (!PLATE.items.length) {
  root.appendChild(el("div", {
   class: "sec"
  }, [ el("div", {
   class: "box"
  }, [ emptyAdd("Add food", more) ]) ]));
  return;
 }
 const t = plateTotals();
 root.appendChild(el("div", {
  class: "sec"
 }, [ el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "big mono",
  text: fmtEU(t.kcal)
 }), el("div", {
  class: "small muted",
  text: PLATE.items.length + " item" + (PLATE.items.length === 1 ? "" : "s") + " staged"
 }), el("div", {
  class: "mt"
 }, [ microBars(t) ]) ]) ]));
 root.appendChild(el("div", {
  class: "sec"
 }, [ el("div", {
  class: "box rows"
 }, PLATE.items.map(e => swipeScale(el("div", {
  class: "row split"
 }, [ el("button", {
  class: "pick",
  type: "button",
  onclick: () => openEntry(e, openPlate)
 }, [ foodIcon(foodById(e.src) || RECIPES.get(e.src) || e, 20), el("span", {
  class: "nm"
 }, [ el("span", {
  class: "t1 nmline"
 }, [ el("span", {
  class: "nm1",
  text: e.name
 }), foodTag(foodById(e.src) || RECIPES.get(e.src)) ].filter(Boolean)), el("span", {
  class: "t2",
  text: r1(e.qty) + " " + e.unit + "  ·  " + r0(e.p) + "P " + r0(e.c) + "C " + r0(e.f) + "F"
 }) ]) ]), el("span", {
  class: "val",
  text: fmtE(e.kcal)
 }), el("button", {
  class: "btn sm bad icon go",
  type: "button",
  html: ICONS.trash,
  "aria-label": "Remove " + e.name,
  onclick: () => {
   const gone = {
    ...e
   };
   plateRemove(e.id);
   toastUndo("Removed", () => {
    PLATE.items = PLATE.items.concat([ gone ]);
    lsSave();
    render();
   });
  }
 }) ]), {
  right: {
   max: 6,
   css: "var(--interactive)",
   fg: "var(--on-interactive)",
   hint: r1(e.qty) + " " + e.unit,
   label: k => r1(r2(plateBase(e).qty * k)) + " " + e.unit,
   fn: k => plateScale(e, k)
  },
  left: {
   max: 1,
   css: "var(--danger)",
   fg: "var(--on-danger)",
   hint: "remove",
   label: () => "Remove",
   fn: () => {
    const gone = {
     ...e
    };
    plateRemove(e.id);
    toastUndo("Removed", () => {
     PLATE.items = PLATE.items.concat([ gone ]);
     lsSave();
     render();
    });
   }
  }
 }))) ]));
 const tIn = el("input", {
  type: "time",
  value: PLATE.t || nowHM()
 });
 const dIn = el("input", {
  type: "date",
  value: SELDATE,
  max: todayISO()
 });
 root.appendChild(el("div", {
  class: "sec"
 }, [ el("div", {
  class: "grid2"
 }, [ labelled("Day", dIn), labelled("Time", tIn) ]) ]));
 root.appendChild(el("div", {
  class: "sec bar"
 }, [ el("button", {
  class: "btn bad",
  type: "button",
  text: "Clear",
  onclick: () => {
   const gone = PLATE.items.map(x => ({
    ...x
   })), when = PLATE.t;
   plateClear();
   ADDMODE = "log";
   back();
   toastUndo("Plate cleared", () => {
    PLATE = {
     items: gone,
     t: when
    };
    lsSave();
    render();
   });
  }
 }), AI ? el("button", {
  class: "btn",
  type: "button",
  onclick: () => openAiMeal()
 }, [ icon("ai", 14), el("span", {
  text: "Describe"
 }) ]) : null, el("button", {
  class: "btn pri grow",
  type: "button",
  text: "Log it all",
  onclick: () => {
   const time = tIn.value || nowHM();
   PLATE.items.forEach(e => {
    e.t = time;
   });
   const target = dIn.value || SELDATE;
   SELDATE = target;
   STRIPMON = null;
   const n = plateCommit(target);
   ADDMODE = "log";
   goRoot("food");
   toast(n + " item" + (n === 1 ? "" : "s") + " logged");
  }
 }) ].filter(Boolean)));
};

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

function mealCandidates(limit) {
 const out = [], seen = new Set;
 const push = f => {
  if (!f || seen.has(f.id)) return;
  seen.add(f.id);
  out.push(`${f.id}|${f.name}|${r0(f.kcal)},${r1(f.p)},${r1(f.c)},${r1(f.f)}` + (f.portions && f.portions[0] ? `|${f.portions[0].label}=${r0(f.portions[0].g)}g` : ""));
 };
 recentFoods(70).forEach(f => push(f.items ? asFood(f) : f));
 [ ...FOODS.values() ].forEach(push);
 [ ...RECIPES.values() ].forEach(r => push(asFood(r)));
 SEED.forEach(push);
 return out.slice(0, limit || 190);
}

function mealPrompt(text) {
 return [ "Turn a spoken or typed description of a meal into structured food entries for a logging app.", "", "Description: " + text, "", "Known foods, one per line as  id|name|kcal,protein,carbs,fat per 100 g|portion:", mealCandidates().join("\n"), "", 'Reply with ONLY a JSON object: {"items":[{"name":"Chicken breast","match":"s1","qty":200,' + '"unit":"g","grams":200,"kcal":330,"p":62,"c":0,"f":7.2,"basis":"library"}]}', "Rules:", "- match is the id from the list above when one clearly fits, otherwise an empty string.", "- grams is the total weight of that item; kcal, p, c and f are TOTALS for the whole item, not per 100 g.", "- Resolve household measures to grams yourself: a scoop of whey is about 31 g, a cup of blueberries 148 g,", "  a tablespoon of oil 13.5 g, a large egg 50 g, a slice of bread 28 g.", "- unit is what the person said (g, oz, scoop, cup, slice, serving) and qty is how many of that unit.", "- If an amount is not given, use one ordinary serving and say so in the name is NOT allowed — just pick the serving.", "- One entry per distinct food. No commentary, no notes about the diet.", "", "When the description names something SPECIFIC — a brand, a product line, a flavour, a", "restaurant item, a cut, a preparation — do NOT match it to a generic entry in the list.", "A named product's figures are usually not the generic ones and substituting them silently", "makes the log wrong in a way nobody can see. Instead leave match empty, keep the name the", "person used including the brand, and give that product's own label figures from what you", "know of it. Only fall back to typical figures for that category when you do not know the", "product, and set basis accordingly:", '- basis "library" when match is set, "label" when the figures are that named product\'s own,', '  "typical" when they are a category estimate.', "Use the stated serving size to work out grams: a named powder's scoop is whatever that", "product's scoop is, not 31 g." ].join("\n");
}

function foodPrompt(text) {
 return [ "Give the nutrition for one food, for a food-logging app.", "", "The food: " + text, "", 'Reply with ONLY a JSON object: {"name":"Chobani Greek yogurt, plain nonfat",', ' "basis":"label","per":100,"unit":"container","unitG":150,', ' "kcal":59,"p":10.2,"c":3.6,"f":0.4,"alc":0}', "Rules:", "- kcal, p, c, f and alc are PER 100 GRAMS of the food as eaten.", "- unit and unitG describe one ordinary portion: what it is called and what it weighs.", "  Use grams as the unit only when the thing is genuinely bought and eaten by weight.", '- basis is "label" when these are that named product\'s own figures, and', '  "typical" when they are a category estimate. A brand or a product line', "  named in the description means you should give that product's own numbers,", "  not a generic version of the same food.", "- Keep the name close to what was asked for. No commentary." ].join("\n");
}

function openAiFood(seed, onPick) {
 const box = el("textarea", {
  class: "tall",
  placeholder: "e.g. the chocolate protein bar from Aldi"
 });
 box.value = String(seed || "").trim();
 const out = el("div", {});
 let busy = false, made = null;
 const goBtn = el("button", {
  class: "btn pri",
  type: "button",
  text: "Look it up",
  onclick: () => run()
 });
 async function run() {
  const text = box.value.trim();
  if (!text) {
   toast("Say what the food is.");
   return;
  }
  if (busy) return;
  busy = true;
  goBtn.disabled = true;
  goBtn.textContent = "Reading…";
  made = null;
  out.innerHTML = "";
  out.appendChild(el("div", {
   class: "box pad bar"
  }, [ el("span", {
   class: "spin"
  }), el("span", {
   class: "small muted",
   text: "Working it out…"
  }) ]));
  try {
   const d = await AI.json(foodPrompt(text), {
    modelTier: S.ai.tier
   });
   show(d);
  } catch (e) {
   out.innerHTML = "";
   out.appendChild(el("div", {
    class: "note",
    text: AI_ERR[e && e.code] || "That didn't work. Try again."
   }));
  } finally {
   busy = false;
   goBtn.disabled = false;
   goBtn.textContent = "Look it up";
  }
 }
 function show(d) {
  out.innerHTML = "";
  const kcal = parseFloat(d && d.kcal) || 0;
  const p = parseFloat(d && d.p) || 0, c = parseFloat(d && d.c) || 0, f = parseFloat(d && d.f) || 0;
  if (!kcal && !p && !c && !f) {
   out.appendChild(el("div", {
    class: "note",
    text: "Nothing usable came back. Try naming it differently."
   }));
   return;
  }
  const unit = String(d && d.unit || "").trim();
  const unitG = Math.max(0, parseFloat(d && d.unitG) || 0);
  const basis = [ "label", "typical" ].includes(String(d && d.basis)) ? String(d.basis) : "typical";
  made = {
   id: "ai" + uid(),
   name: String(d && d.name || seed || "Food").slice(0, 80),
   kcal: r2(kcal),
   p: r2(p),
   c: r2(c),
   f: r2(f),
   alc: r2(parseFloat(d && d.alc) || 0),
   servG: unitG > 0 && unit.toLowerCase() !== "g" ? r2(unitG) : null,
   portions: unitG > 0 && unit.toLowerCase() !== "g" ? [ {
    label: unit,
    g: r2(unitG)
   } ] : [],
   custom: true,
   fromAi: true,
   aiBasis: basis
  };
  out.appendChild(el("div", {
   class: "box pad"
  }, [ el("div", {
   class: "nmline"
  }, [ foodIcon(made, 22), el("span", {
   class: "hd",
   text: made.name
  }), el("span", {
   class: "chip ai",
   text: basis === "label" ? "from the product" : "category estimate"
  }) ]), el("div", {
   class: "big mono mt",
   text: fmtEU(made.kcal)
  }), el("div", {
   class: "small muted",
   text: "per 100 g"
  }), el("hr", {
   class: "hr mt"
  }), kv("Protein", r1(made.p) + " g"), kv("Carbs", r1(made.c) + " g"), kv("Fat", r1(made.f) + " g"), made.servG ? kv("One " + made.portions[0].label, r0(made.servG) + " g") : null ].filter(Boolean)));
  out.appendChild(el("div", {
   class: "bar mt"
  }, [ el("button", {
   class: "btn pri grow",
   type: "button",
   text: "Use this food",
   onclick: () => {
    clearDemo();
    saveFood(made);
    closeModal();
    if (onPick) onPick(made);
   }
  }), el("button", {
   class: "btn",
   type: "button",
   text: "Edit first",
   onclick: () => {
    closeModal();
    openFoodEditor(made, null, f2 => onPick && onPick(f2));
   }
  }) ]));
 }
 openModal({
  guard: true,
  title: "Describe a food",
  body: [ labelled("What is it", box), out ],
  footer: [ goBtn ]
 });
 if (box.value) run();
}

function openAiMeal(seed) {
 const box = el("textarea", {
  class: "tall",
  placeholder: "scoop of protein powder, 200g chicken, cup of blueberries"
 });
 if (seed) box.value = String(seed).trim();
 const out = el("div", {});
 let busy = false, rec = null, listening = false;
 const micBtn = SR ? el("button", {
  class: "btn",
  type: "button",
  "aria-label": "Dictate"
 }, [ icon("mic", 16), el("span", {
  text: "Speak"
 }) ]) : null;
 if (micBtn) micBtn.addEventListener("click", () => {
  if (listening && rec) {
   rec.stop();
   return;
  }
  try {
   rec = new SR;
   rec.lang = navigator.language || "en-US";
   rec.interimResults = true;
   rec.continuous = true;
   const before = box.value ? box.value.trim() + " " : "";
   rec.onresult = ev => {
    let s = "";
    for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript;
    box.value = before + s;
   };
   rec.onerror = ev => {
    listening = false;
    micBtn.classList.remove("pri");
    micBtn.lastChild.textContent = "Speak";
    toast(ev.error === "not-allowed" ? "Microphone permission refused" : "Dictation stopped");
   };
   rec.onend = () => {
    listening = false;
    micBtn.classList.remove("pri");
    micBtn.lastChild.textContent = "Speak";
   };
   rec.start();
   listening = true;
   micBtn.classList.add("pri");
   micBtn.lastChild.textContent = "Stop";
  } catch (e) {
   toast("Dictation unavailable here.");
  }
 });
 const goBtn = el("button", {
  class: "btn pri",
  type: "button",
  text: "Read it",
  onclick: () => run()
 });
 function materialise(data) {
  const made = [], entries = [];
  (data && Array.isArray(data.items) ? data.items : []).forEach(it => {
   const name = String(it.name || "").trim();
   if (!name) return;
   const grams = Math.max(0, parseFloat(it.grams) || 0);
   const qty = Math.max(0, parseFloat(it.qty) || 0) || 1;
   const unit = String(it.unit || "serving").trim() || "serving";
   const hit = it.match ? foodById(String(it.match)) || RECIPES.get(String(it.match)) : null;
   if (hit && grams > 0) {
    const f = hit.items ? asFood(hit) : hit;
    const m = macrosFor(f, grams);
    entries.push({
     id: uid(),
     t: ADDTIME || nowHM(),
     name: f.name,
     src: f.id,
     g: r2(grams),
     unit: unit,
     qty: qty,
     kcal: r1(m.kcal),
     p: r2(m.p),
     c: r2(m.c),
     f: r2(m.f),
     alc: r2(m.alc)
    });
    return;
   }
   const kcal = parseFloat(it.kcal) || 0, p = parseFloat(it.p) || 0, c = parseFloat(it.c) || 0, f = parseFloat(it.f) || 0;
   if (!kcal && !p && !c && !f) return;
   const basis = grams > 0 ? grams : 100;
   const food = {
    id: "ai" + uid(),
    name: name.slice(0, 80),
    kcal: r2(kcal / basis * 100),
    p: r2(p / basis * 100),
    c: r2(c / basis * 100),
    f: r2(f / basis * 100),
    alc: 0,
    servG: r2(basis / qty),
    portions: unit.toLowerCase() === "g" ? [] : [ {
     label: unit,
     g: r2(basis / qty)
    } ],
    custom: true,
    fromAi: true,
    aiBasis: [ "label", "typical", "library" ].includes(String(it.basis)) ? String(it.basis) : "typical"
   };
   made.push(food);
   entries.push({
    id: uid(),
    t: ADDTIME || nowHM(),
    name: food.name,
    src: food.id,
    g: r2(basis),
    unit: unit,
    qty: qty,
    kcal: r1(kcal),
    p: r2(p),
    c: r2(c),
    f: r2(f),
    alc: 0
   });
  });
  return {
   entries: entries,
   made: made
  };
 }
 async function run() {
  const text = box.value.trim();
  if (!text) {
   toast("Say or type what you ate.");
   return;
  }
  if (busy) return;
  busy = true;
  goBtn.disabled = true;
  goBtn.textContent = "Reading…";
  if (listening && rec) {
   try {
    rec.stop();
   } catch (e) {}
  }
  out.innerHTML = "";
  out.appendChild(el("div", {
   class: "box pad bar"
  }, [ el("span", {
   class: "spin"
  }), el("span", {
   class: "small muted",
   text: "Working it out…"
  }) ]));
  try {
   const data = await AI.json(mealPrompt(text), {
    modelTier: S.ai.tier
   });
   const {entries: entries, made: made} = materialise(data);
   if (!entries.length) {
    out.innerHTML = "";
    out.appendChild(el("div", {
     class: "note",
     text: "Nothing usable came back. Try naming the foods and amounts."
    }));
    return;
   }
   clearDemo();
   made.forEach(f => {
    FOODS.set(f.id, f);
    put("foods/" + f.id, f);
   });
   PLATE.items = PLATE.items.concat(entries);
   if (!PLATE.t) PLATE.t = entries[0].t;
   lsSave();
   closeModal();
   go("plate");
  } catch (e) {
   out.innerHTML = "";
   out.appendChild(el("div", {
    class: "note",
    text: AI_ERR[e && e.code] || "That didn't work. Try again."
   }));
  } finally {
   busy = false;
   goBtn.disabled = false;
   goBtn.textContent = "Read it";
  }
 }
 openModal({
  guard: true,
  title: "Describe a meal",
  body: [ labelled("What did you eat", box), micBtn ? el("div", {
   class: "wrap"
  }, [ micBtn ]) : null, out ].filter(Boolean),
  footer: [ goBtn ]
 });
}
