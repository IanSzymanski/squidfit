const u16 = (d, o) => d.getUint16(o, true);

const u32 = (d, o) => d.getUint32(o, true);

function zipEntries(buf) {
 const d = new DataView(buf), bytes = new Uint8Array(buf);
 let eocd = -1;
 for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 66e3; i--) {
  if (u32(d, i) === 101010256) {
   eocd = i;
   break;
  }
 }
 if (eocd < 0) throw new Error("not a zip");
 const count = u16(d, eocd + 10);
 let p = u32(d, eocd + 16);
 const out = new Map;
 for (let i = 0; i < count; i++) {
  if (u32(d, p) !== 33639248) break;
  const method = u16(d, p + 10);
  const csize = u32(d, p + 20);
  const nameLen = u16(d, p + 28), extraLen = u16(d, p + 30), cmtLen = u16(d, p + 32);
  const local = u32(d, p + 42);
  const name = (new TextDecoder).decode(bytes.subarray(p + 46, p + 46 + nameLen));
  const lnLen = u16(d, local + 26), leLen = u16(d, local + 28);
  const start = local + 30 + lnLen + leLen;
  out.set(name, {
   method: method,
   bytes: bytes.subarray(start, start + csize)
  });
  p += 46 + nameLen + extraLen + cmtLen;
 }
 return out;
}

async function inflateEntry(e) {
 if (e.method === 0) return (new TextDecoder).decode(e.bytes);
 if (typeof DecompressionStream !== "function") throw new Error("no-inflate");
 const stream = new Blob([ e.bytes ]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
 return new Response(stream).text();
}

function colIndex(ref) {
 let n = 0;
 for (let i = 0; i < ref.length; i++) {
  const ch = ref.charCodeAt(i);
  if (ch < 65 || ch > 90) break;
  n = n * 26 + (ch - 64);
 }
 return n - 1;
}

function serialToISO(n) {
 if (!(n > 2e4 && n < 8e4)) return null;
 const ms = Date.UTC(1899, 11, 30) + Math.round(n) * 864e5;
 const d = new Date(ms);
 return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function serialToHM(n) {
 const frac = n - Math.floor(n);
 if (!(frac > 0)) return null;
 const mins = Math.round(frac * 1440);
 return `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

async function readXlsx(file) {
 const buf = await file.arrayBuffer();
 const zip = zipEntries(buf);
 const parser = new DOMParser;
 const grab = async n => zip.has(n) ? parser.parseFromString(await inflateEntry(zip.get(n)), "application/xml") : null;
 const shared = [];
 const ss = await grab("xl/sharedStrings.xml");
 if (ss) ss.querySelectorAll("si").forEach(si => {
  let s = "";
  si.querySelectorAll("t").forEach(t => {
   s += t.textContent;
  });
  shared.push(s);
 });
 const wbDoc = await grab("xl/workbook.xml");
 const relDoc = await grab("xl/_rels/workbook.xml.rels");
 const rels = new Map;
 if (relDoc) relDoc.querySelectorAll("Relationship").forEach(r => rels.set(r.getAttribute("Id"), r.getAttribute("Target").replace(/^\/?xl\//, "")));
 const sheets = {};
 const names = [];
 const nodes = wbDoc ? [ ...wbDoc.querySelectorAll("sheets > sheet") ] : [];
 for (let i = 0; i < nodes.length; i++) {
  const name = nodes[i].getAttribute("name");
  const rid = nodes[i].getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || nodes[i].getAttribute("r:id");
  const path = "xl/" + (rels.get(rid) || `worksheets/sheet${i + 1}.xml`);
  const doc = await grab(path);
  if (!doc) continue;
  names.push(name);
  sheets[name] = sheetRows(doc, shared);
 }
 return {
  names: names,
  sheets: sheets
 };
}

function sheetRows(doc, shared) {
 const rows = [];
 doc.querySelectorAll("sheetData > row").forEach(r => {
  const cells = [];
  r.querySelectorAll("c").forEach(c => {
   const ref = c.getAttribute("r") || "";
   const idx = ref ? colIndex(ref) : cells.length;
   const type = c.getAttribute("t");
   let text = "", num = null;
   if (type === "inlineStr") {
    c.querySelectorAll("is t").forEach(t => {
     text += t.textContent;
    });
   } else {
    const v = c.querySelector("v");
    const raw = v ? v.textContent : "";
    if (type === "s") text = shared[+raw] ?? ""; else if (type === "str" || type === "e") text = raw; else {
     text = raw;
     if (raw !== "" && isFinite(+raw)) num = +raw;
    }
   }
   while (cells.length < idx) cells.push({
    v: "",
    n: null
   });
   cells[idx] = {
    v: text,
    n: num
   };
  });
  rows.push(cells);
 });
 return rows;
}

const MF_ROLES = {
 macros: [ /(calories|energy)\s*&?\s*macros/i, /^quick export$/i ],
 weight: [ /scale weight/i, /^weight$/i ],
 spend: [ /expenditure/i ],
 log: [ /food log/i, /food history/i ],
 recipe: [ /^recipes?$/i ],
 custom: [ /custom foods?/i ],
 fav: [ /^favou?rites?$/i ]
};

function mfRoles(names) {
 const out = {};
 Object.keys(MF_ROLES).forEach(role => {
  const hit = names.find(n => MF_ROLES[role].some(rx => rx.test(String(n).trim())));
  if (hit) out[role] = hit;
 });
 return out;
}

function mfUsable(names) {
 const r = mfRoles(names);
 return !!(r.macros || r.weight || r.log || r.recipe || r.custom || r.fav);
}

function findCol(headers, want, avoid) {
 const hs = headers.map(h => String(h || "").toLowerCase().trim());
 const bad = (avoid || []).map(a => a.toLowerCase());
 const ok = i => i >= 0 && !bad.some(b => hs[i].includes(b));
 for (const w of want) {
  const i = hs.findIndex(h => h === w.toLowerCase());
  if (ok(i)) return i;
 }
 for (const w of want) {
  const i = hs.findIndex(h => h.includes(w.toLowerCase()) && !bad.some(b => h.includes(b)));
  if (i >= 0) return i;
 }
 return -1;
}

const cellNum = c => {
 if (!c) return null;
 if (c.n !== null && c.n !== undefined) return c.n;
 const n = parseFloat(String(c.v).replace(/[^0-9.\-]/g, ""));
 return isFinite(n) ? n : null;
};

function cellDate(c) {
 if (!c) return null;
 if (c.n !== null) return serialToISO(c.n);
 return parseDateCell(c.v);
}

function cellTime(c) {
 if (!c) return null;
 if (c.n !== null) return serialToHM(c.n);
 const s = String(c.v).trim();
 const m = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
 if (!m) return null;
 let h = +m[1];
 const ap = (m[3] || "").toLowerCase();
 if (ap === "pm" && h < 12) h += 12;
 if (ap === "am" && h === 12) h = 0;
 return `${String(h).padStart(2, "0")}:${m[2]}`;
}

const normName = n => String(n || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const slugName = n => String(n || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "item";

function knownFoodIndex() {
 const m = new Map;
 SEED.forEach(f => m.set(normName(f.name), f.id));
 RECIPES.forEach(r => m.set(normName(r.name), r.id));
 FOODS.forEach(f => m.set(normName(f.name), f.id));
 return m;
}

const MK = [ "kcal", "p", "c", "f", "alc" ];

const isGram = u => /^(g|grams?)$/i.test(String(u || "").trim());

function volG(u) {
 const s = String(u || "").trim().toLowerCase();
 if (/^(ml|mls|millilit(er|re)s?)$/.test(s)) return 1;
 if (/^(fl\.?\s*oz|fluid ounces?)$/.test(s)) return 29.57;
 if (/^(l|lit(er|re)s?)$/.test(s)) return 1e3;
 return null;
}

const sumM = rows => {
 const o = {
  kcal: 0,
  p: 0,
  c: 0,
  f: 0,
  alc: 0
 };
 rows.forEach(r => MK.forEach(k => {
  o[k] += r[k] || 0;
 }));
 return o;
};

const scaleM = (m, by) => {
 const o = {};
 MK.forEach(k => {
  o[k] = (m[k] || 0) * by;
 });
 return o;
};

function weighable(m, g) {
 if (!(g > 0)) return false;
 const mass = (m.p || 0) + (m.c || 0) + (m.f || 0) + (m.alc || 0);
 return (m.kcal || 0) / g * 100 <= 900 && mass / g * 100 <= 105;
}

function mfFood(name, unit, m, perG) {
 const label = unit && !isGram(unit) ? unit : "serving";
 if (weighable(m, perG)) {
  const per100 = scaleM(m, 100 / perG), gram = isGram(unit);
  return {
   name: name,
   ...roundM(per100),
   servG: gram ? null : r2(perG),
   portions: gram ? [] : [ {
    label: label,
    g: r2(perG)
   } ]
  };
 }
 return {
  name: name,
  ...roundM(m),
  servG: 100,
  portions: [ {
   label: label,
   g: 100
  } ],
  servOnly: true
 };
}

const roundM = m => {
 const o = {};
 MK.forEach(k => {
  o[k] = r2(m[k] || 0);
 });
 return o;
};

function foodFromRows(name, rows) {
 const grams = rows.filter(r => isGram(r.unit) && r.qty > 0);
 if (grams.length) {
  const m = sumM(grams), g = grams.reduce((a, r) => a + r.qty, 0);
  if (weighable(m, g)) return mfFood(name, "g", scaleM(m, 1 / g), 1);
 }
 const groups = unitGroups(rows.filter(r => !isGram(r.unit)));
 if (!groups.length) return null;
 const top = groups.sort((a, b) => b.rows.length - a.rows.length || (a.last < b.last ? 1 : -1))[0];
 const q = top.rows.reduce((a, r) => a + r.qty, 0);
 const g = top.rows.reduce((a, r) => a + r.qty * r.per, 0);
 const m = sumM(top.rows);
 if (q > 0 && weighable(m, g)) return mfFood(name, top.unit, scaleM(m, 1 / q), g / q);
 const last = top.rows.reduce((a, r) => r.iso > a.iso ? r : a);
 return mfFood(name, top.unit, scaleM(last, 1 / (last.qty || 1)), null);
}

function unitGroups(rows) {
 const by = new Map;
 rows.forEach(r => {
  if (!(r.qty > 0)) return;
  const k = r.unit.toLowerCase();
  if (!by.has(k)) by.set(k, {
   unit: r.unit,
   rows: [],
   last: ""
  });
  const gr = by.get(k);
  gr.rows.push(r);
  if (r.iso > gr.last) gr.last = r.iso;
 });
 return [ ...by.values() ];
}

function addPortions(food, rows) {
 const have = new Set((food.portions || []).map(p => p.label.toLowerCase()));
 unitGroups(rows.filter(r => !isGram(r.unit))).forEach(gr => {
  if (have.has(gr.unit.toLowerCase())) return;
  const q = gr.rows.reduce((a, r) => a + r.qty, 0);
  const kPer = gr.rows.reduce((a, r) => a + (r.kcal || 0), 0) / q;
  const gW = median(gr.rows.map(r => r.per).filter(x => x > 0));
  const gK = food.kcal > 0 && kPer > 0 ? kPer / food.kcal * 100 : null;
  let g = null;
  if (gK && !food.servOnly && gW > 0 && Math.abs(gK - gW) <= gK * .2) g = gW; else if (gK) g = gK; else if (!food.servOnly && gW > 0) g = gW;
  if (!(g > 0)) return;
  food.portions.push({
   label: gr.unit,
   g: r2(g)
  });
  have.add(gr.unit.toLowerCase());
 });
 if (!food.servG && food.portions.length) food.servG = food.portions[0].g;
}

function settleRow(food, r) {
 const e = r.e;
 if (!food) {
  e.g = r2(r.qty * r.per);
  return;
 }
 const u = unitsFor(food).find(x => x.label.toLowerCase() === r.unit.toLowerCase() && !(x.key === "g" && food.servOnly));
 if (u) {
  e.unit = u.label;
  e.qty = r2(r.qty);
  e.g = r2(r.qty * u.g);
  return;
 }
 const g = !food.servOnly && weighable(r, r.qty * r.per) ? r.qty * r.per : food.kcal > 0 && e.kcal > 0 ? e.kcal / food.kcal * 100 : r.qty * (food.servG || 100);
 e.unit = "g";
 e.qty = r2(g);
 e.g = r2(g);
}

const mfNotAFood = key => key === "quick add";

function readMacroFactor(book) {
 const out = {
  days: new Map,
  foods: new Map,
  recipes: new Map,
  defs: new Map,
  targets: null,
  weightUnit: "lb",
  noData: [],
  counts: {
   weights: 0,
   items: 0,
   dailyTotals: 0,
   newFoods: 0,
   matched: 0,
   recipes: 0,
   customs: 0,
   spend: 0
  },
  range: null
 };
 const seen = new Map;
 const touch = iso => {
  if (!out.days.has(iso)) out.days.set(iso, {
   d: iso,
   wKg: null,
   wT: null,
   entries: [],
   note: ""
  });
  return out.days.get(iso);
 };
 const roles = mfRoles(book.names);
 const rec = roles.recipe ? book.sheets[roles.recipe] : null;
 if (rec && rec.length > 1) {
  const h = rec[0].map(c => c.v);
  const cName = findCol(h, [ "recipe name", "name" ]);
  const cTot = findCol(h, [ "total weight" ]);
  const cServ = findCol(h, [ "serving qty", "servings" ]);
  const cKcal = findCol(h, [ "calories", "energy" ]), kS = kScale(h, cKcal);
  const cP = findCol(h, [ "protein" ]);
  const cF = findCol(h, [ "fat" ], [ "saturated", "trans", "mono", "poly", "omega" ]);
  const cC = findCol(h, [ "carbs", "carbohydrate" ], [ "net" ]);
  const cA = findCol(h, [ "alcohol" ]);
  const steps = h.map((x, i) => /^step \d+$/i.test(String(x).trim()) ? i : -1).filter(i => i >= 0);
  rec.slice(1).forEach(r => {
   const name = cName >= 0 ? String(r[cName] ? r[cName].v : "").trim() : "";
   if (!name) return;
   const servings = Math.max(1, Math.round(cServ >= 0 ? cellNum(r[cServ]) || 1 : 1));
   const totalG = cTot >= 0 ? cellNum(r[cTot]) || 0 : 0;
   const kcal = cKcal >= 0 ? (cellNum(r[cKcal]) || 0) * kS : 0;
   if (!kcal) {
    out.noData.push(name);
    return;
   }
   const num = c => (c >= 0 ? cellNum(r[c]) || 0 : 0) / servings;
   out.recipes.set(normName(name), {
    name: name,
    servings: servings,
    gPerServing: totalG > 0 ? totalG / servings : null,
    per: {
     kcal: kcal / servings,
     p: num(cP),
     c: num(cC),
     f: num(cF),
     alc: num(cA)
    },
    steps: steps.map(i => String(r[i] ? r[i].v : "").trim()).filter(Boolean)
   });
   out.counts.recipes++;
  });
 }
 [ roles.custom, roles.fav ].filter(Boolean).forEach(role => {
  const rows = book.sheets[role];
  if (!rows || rows.length < 2) return;
  const h = rows[0].map(c => c.v);
  const cName = findCol(h, [ "food name", "name" ]);
  const cSize = findCol(h, [ "serving size" ]);
  const cQty = findCol(h, [ "serving qty", "quantity" ]);
  const cWt = findCol(h, [ "serving weight" ]);
  const cKcal = findCol(h, [ "calories", "energy" ]), kS = kScale(h, cKcal);
  const cP = findCol(h, [ "protein" ]);
  const cF = findCol(h, [ "fat" ], [ "saturated", "trans", "mono", "poly" ]);
  const cC = findCol(h, [ "carbs", "carbohydrate" ]);
  const cA = findCol(h, [ "alcohol" ]);
  rows.slice(1).forEach(r => {
   const name = cName >= 0 ? String(r[cName] ? r[cName].v : "").trim() : "";
   if (!name) return;
   const key = normName(name);
   const kcal = cKcal >= 0 && cellNum(r[cKcal]) !== null ? cellNum(r[cKcal]) * kS : null;
   const n = c => c >= 0 ? cellNum(r[c]) || 0 : 0;
   const m = {
    kcal: kcal || 0,
    p: n(cP),
    c: n(cC),
    f: n(cF),
    alc: n(cA)
   };
   if (!(m.kcal > 0 || m.p + m.c + m.f > 0)) {
    if (!out.defs.has(key)) out.noData.push(name);
    return;
   }
   const qty = n(cQty) || 1;
   const unit = (cSize >= 0 ? String(r[cSize] ? r[cSize].v : "").trim() : "") || "serving";
   out.defs.set(key, {
    name: name,
    unit: unit,
    m: scaleM(m, 1 / qty),
    perG: volG(unit) || n(cWt) || null
   });
   out.counts.customs++;
  });
 });
 const dayPass = (rows, want) => {
  if (!rows || rows.length < 2) return;
  const h = rows[0].map(c => c.v);
  const cDate = findCol(h, [ "date" ]);
  if (cDate < 0) return;
  const cW = want.weight ? findCol(h, [ "weight" ], [ "trend", "target", "fat percent" ]) : -1;
  const cKcal = want.macros ? findCol(h, [ "calories", "energy" ], [ "target" ]) : -1, kS = kScale(h, cKcal);
  const cP = want.macros ? findCol(h, [ "protein" ], [ "target" ]) : -1;
  const cF = want.macros ? findCol(h, [ "fat" ], [ "target", "saturated", "trans", "mono", "poly", "percent" ]) : -1;
  const cC = want.macros ? findCol(h, [ "carbs", "carbohydrate" ], [ "target" ]) : -1;
  const cA = want.macros ? findCol(h, [ "alcohol" ], [ "target" ]) : -1;
  const tK = findCol(h, [ "target calories", "target energy" ]), tS = kScale(h, tK), tP = findCol(h, [ "target protein" ]);
  const tF = findCol(h, [ "target fat" ]), tC = findCol(h, [ "target carbs" ]);
  if (cW >= 0 && /\(kg\)/i.test(String(h[cW]))) out.weightUnit = "kg";
  rows.slice(1).forEach(r => {
   const iso = cellDate(r[cDate]);
   if (!iso) return;
   const day = touch(iso);
   const w = cW >= 0 ? cellNum(r[cW]) : null;
   if (w > 0) {
    day.wKg = out.weightUnit === "kg" ? w : w / LB;
    out.counts.weights++;
   }
   const k = cKcal >= 0 && cellNum(r[cKcal]) !== null ? cellNum(r[cKcal]) * kS : null;
   const p = cP >= 0 ? cellNum(r[cP]) : 0, f = cF >= 0 ? cellNum(r[cF]) : 0, c = cC >= 0 ? cellNum(r[cC]) : 0, a = cA >= 0 ? cellNum(r[cA]) : 0;
   if (k > 0 || p > 0 || c > 0 || f > 0) {
    day.total = {
     kcal: k || kcalFromMacros({
      p: p,
      c: c,
      f: f,
      alc: a
     }),
     p: p || 0,
     c: c || 0,
     f: f || 0,
     alc: a || 0
    };
   }
   const tk = tK >= 0 && cellNum(r[tK]) !== null ? cellNum(r[tK]) * tS : null;
   if (tk > 0) out.targets = {
    kcal: tk,
    p: tP >= 0 ? cellNum(r[tP]) : null,
    f: tF >= 0 ? cellNum(r[tF]) : null,
    c: tC >= 0 ? cellNum(r[tC]) : null
   };
  });
 };
 if (roles.macros) dayPass(book.sheets[roles.macros], {
  macros: true,
  weight: true
 });
 if (roles.weight) dayPass(book.sheets[roles.weight], {
  weight: true
 });
 const spend = roles.spend ? book.sheets[roles.spend] : null;
 if (spend && spend.length > 1) {
  const h = spend[0].map(c => c.v);
  const cDate = findCol(h, [ "date" ]), cV = findCol(h, [ "expenditure" ]), vS = kScale(h, cV);
  if (cDate >= 0 && cV >= 0) spend.slice(1).forEach(r => {
   const iso = cellDate(r[cDate]), v = cellNum(r[cV]) * vS;
   if (iso && v > 0) {
    touch(iso).mfE = r0(v);
    out.counts.spend++;
   }
  });
 }
 const log = roles.log ? book.sheets[roles.log] : null;
 if (log && log.length > 1) {
  const h = log[0].map(c => c.v);
  const cDate = findCol(h, [ "date" ]);
  const cTime = findCol(h, [ "time" ]);
  const cName = findCol(h, [ "food name", "name" ]);
  const cSize = findCol(h, [ "serving size" ]);
  const cQty = findCol(h, [ "serving qty", "quantity" ]);
  const cWt = findCol(h, [ "serving weight" ]);
  const cKcal = findCol(h, [ "calories", "energy" ]), kS = kScale(h, cKcal);
  const cP = findCol(h, [ "protein" ]);
  const cF = findCol(h, [ "fat" ], [ "saturated", "trans", "mono", "poly" ]);
  const cC = findCol(h, [ "carbs", "carbohydrate" ]);
  const cA = findCol(h, [ "alcohol" ]);
  log.slice(1).forEach(r => {
   const iso = cellDate(r[cDate]);
   if (!iso) return;
   const name = cName >= 0 ? String(r[cName] ? r[cName].v : "").trim() : "";
   const kcal = cKcal >= 0 && cellNum(r[cKcal]) !== null ? cellNum(r[cKcal]) * kS : null;
   const qty = cQty >= 0 ? cellNum(r[cQty]) || 0 : 0;
   if (!name && !kcal) return;
   if (!kcal && cQty >= 0 && !qty) return;
   const p = cP >= 0 ? cellNum(r[cP]) || 0 : 0, f = cF >= 0 ? cellNum(r[cF]) || 0 : 0, c = cC >= 0 ? cellNum(r[cC]) || 0 : 0, a = cA >= 0 ? cellNum(r[cA]) || 0 : 0;
   const unit = (cSize >= 0 ? String(r[cSize] ? r[cSize].v : "").trim() : "") || "serving";
   const per = volG(unit) || (cWt >= 0 ? cellNum(r[cWt]) || 0 : 0);
   const key = normName(name);
   const e = {
    id: uid(),
    t: cellTime(r[cTime]) || "12:00",
    name: name || "Imported item",
    src: null,
    imp: 1,
    g: r2(qty * per),
    unit: unit,
    qty: qty || 1,
    kcal: kcal || kcalFromMacros({
     p: p,
     c: c,
     f: f,
     alc: a
    }),
    p: r2(p),
    c: r2(c),
    f: r2(f),
    alc: r2(a)
   };
   touch(iso).entries.push(e);
   out.counts.items++;
   if (!name || mfNotAFood(key)) return;
   if (!seen.has(key)) seen.set(key, {
    name: name,
    rows: []
   });
   seen.get(key).rows.push({
    e: e,
    iso: iso,
    unit: unit,
    qty: qty || 1,
    per: per,
    kcal: e.kcal,
    p: p,
    c: c,
    f: f,
    alc: a
   });
  });
 }
 const known = knownFoodIndex();
 const taken = new Set([ ...FOODS.keys(), ...SEED.map(f => f.id), ...RECIPES.keys() ]);
 const names = new Map;
 [ out.recipes, out.defs, seen ].forEach(src => src.forEach((v, k) => {
  if (!names.has(k)) names.set(k, v.name);
 }));
 names.forEach((name, key) => {
  const rows = seen.has(key) ? seen.get(key).rows : [];
  const hit = known.get(key);
  if (hit) {
   const f = foodById(hit) || (RECIPES.has(hit) ? asFood(RECIPES.get(hit)) : null);
   rows.forEach(r => {
    r.e.src = hit;
    settleRow(f, r);
   });
   const recipe = out.recipes.get(key), mine = FOODS.get(hit);
   if (mine && mine.fromImport && recipe && recipe.steps.length && !(mine.steps || []).length) out.foods.set(hit, {
    ...thaw(mine),
    steps: recipe.steps
   });
   out.counts.matched++;
   return;
  }
  const recipe = out.recipes.get(key), def = out.defs.get(key);
  let food = recipe ? mfFood(name, "serving", recipe.per, recipe.gPerServing) : def ? mfFood(name, def.unit, def.m, def.perG) : foodFromRows(name, rows);
  if (!food) return;
  addPortions(food, rows);
  let id = "mf-" + slugName(name), n = 2;
  while (taken.has(id) || out.foods.has(id)) id = "mf-" + slugName(name).slice(0, 44) + "-" + n++;
  food = {
   id: id,
   ...food,
   custom: true,
   fromImport: true,
   ...recipe && recipe.steps.length ? {
    steps: recipe.steps
   } : {}
  };
  out.foods.set(id, food);
  rows.forEach(r => {
   r.e.src = id;
   settleRow(food, r);
  });
  out.counts.newFoods++;
 });
 out.noData = [ ...new Set(out.noData) ].filter(n => !names.has(normName(n)) && !known.has(normName(n)));
 out.days.forEach(day => {
  if (day.entries.length) {
   delete day.total;
   return;
  }
  if (day.total) {
   day.entries.push({
    id: uid(),
    t: "12:00",
    name: "Daily total (MacroFactor)",
    src: null,
    imp: 1,
    g: 0,
    unit: "day",
    qty: 1,
    ...day.total
   });
   out.counts.dailyTotals++;
  }
  delete day.total;
 });
 const isos = [ ...out.days.keys() ].sort();
 if (isos.length) out.range = [ isos[0], isos[isos.length - 1] ];
 return out;
}

function mergeBooks(books) {
 const out = {
  names: [],
  sheets: {}
 };
 books.forEach(b => b.names.forEach(n => {
  let name = n, i = 2;
  while (out.sheets[name]) name = `${n} (${i++})`;
  out.names.push(name);
  out.sheets[name] = b.sheets[n];
 }));
 return out;
}

function csvAsBook(text) {
 const rows = parseCSV(text);
 if (rows.length < 2) return null;
 const h = rows[0].map(x => String(x || "").trim());
 const role = findCol(h, [ "food name" ]) >= 0 && findCol(h, [ "date" ]) >= 0 ? "Food Log" : findCol(h, [ "recipe name" ]) >= 0 ? "Recipes" : findCol(h, [ "food name" ]) >= 0 && findCol(h, [ "serving size" ]) >= 0 ? "Custom Foods" : null;
 if (!role) return null;
 const cells = rows.map(r => r.map(v => {
  const s = String(v == null ? "" : v);
  const n = s.trim() !== "" && isFinite(+s) ? +s : null;
  return {
   v: s,
   n: n
  };
 }));
 return {
  names: [ role ],
  sheets: {
   [role]: cells
  }
 };
}

function openImport() {
 const file = el("input", {
  type: "file",
  multiple: "",
  accept: ".xlsx,.csv,.txt,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
 });
 const status = el("div", {});
 let parsed = null;
 const opts = {
  weight: !!S.imports.weight,
  food: !!S.imports.food,
  targets: !!S.imports.targets,
  spend: !!S.imports.spend
 };
 const check = (key, label, hint) => {
  const node = optionRow(label, hint, opts[key], () => {
   opts[key] = !opts[key];
   const fresh = check(key, label, hint);
   node.replaceWith(fresh);
  });
  return node;
 };
 const importBtn = el("button", {
  class: "btn pri",
  type: "button",
  text: "Import",
  disabled: "",
  onclick: () => doImport()
 });
 file.addEventListener("change", async () => {
  const fs = [ ...file.files ];
  if (!fs.length) return;
  parsed = null;
  importBtn.disabled = true;
  status.innerHTML = "";
  status.appendChild(el("div", {
   class: "box pad bar"
  }, [ el("span", {
   class: "spin"
  }), el("span", {
   class: "small muted",
   text: "Reading " + (fs.length === 1 ? fs[0].name : fs.length + " files") + "…"
  }) ]));
  const fail = text => {
   status.innerHTML = "";
   status.appendChild(el("div", {
    class: "note",
    text: text
   }));
  };
  const books = [];
  for (const f of fs) {
   if (/\.(csv|txt|tsv)$/i.test(f.name)) {
    const text = await f.text();
    const book = csvAsBook(text);
    if (book) {
     books.push(book);
     continue;
    }
    if (fs.length === 1) {
     status.innerHTML = "";
     closeModal();
     openCsvImport(text);
     return;
    }
    return fail(`${f.name} isn't a MacroFactor export.`);
   }
   try {
    books.push(await readXlsx(f));
   } catch (e) {
    return fail(e && e.message === "no-inflate" ? "This browser can't unpack .xlsx. Export the same data as CSV and load that instead." : `Couldn't read ${f.name}. If it isn't a MacroFactor .xlsx, export as CSV and load that instead.`);
   }
  }
  const book = mergeBooks(books);
  if (!mfUsable(book.names)) return fail(`That has ${book.names.join(", ") || "no readable sheets"} — this reader expects a MacroFactor export with a daily, weight, food log, recipes or custom foods sheet.`);
  status.innerHTML = "";
  parsed = readMacroFactor(book);
  paintSummary();
 });
 function paintSummary() {
  const c = parsed.counts;
  status.innerHTML = "";
  status.appendChild(el("div", {
   class: "box pad"
  }, [ el("div", {
   class: "big mono",
   text: String(parsed.days.size)
  }), el("div", {
   class: "small muted",
   text: "days found" + (parsed.range ? `, ${fmtDate(parsed.range[0])} to ${fmtDate(parsed.range[1])}` : "")
  }), el("hr", {
   class: "hr"
  }), kv("Weigh-ins", String(c.weights)), kv("Food items", String(c.items)), c.newFoods || c.matched ? kv("Foods", `${c.newFoods} new, ${c.matched} already here`) : null, c.recipes ? kv("Recipes", String(c.recipes)) : null, c.customs ? kv("Custom foods", String(c.customs)) : null, c.dailyTotals ? kv("Days as one total", String(c.dailyTotals)) : null, c.spend ? kv("Their expenditure", `${c.spend} days`) : null ]));
  const list = el("div", {
   class: "box rows"
  }, [ c.weights ? check("weight", "Scale weights", `${c.weights} readings` + (parsed.weightUnit === "kg" ? ", converted from kg" : "")) : null, c.items || c.newFoods ? check("food", c.items ? "Food log" : "Foods", [ c.items ? `${c.items} items` : "", c.newFoods ? `${c.newFoods} new food${c.newFoods === 1 ? "" : "s"}` : "" ].filter(Boolean).join(", ")) : null, c.spend ? check("spend", "Their expenditure", `${c.spend} days, drawn beside this app's own estimate`) : null, parsed.targets ? check("targets", "Targets", `${fmtEU(parsed.targets.kcal)}, ${r0(parsed.targets.p || 0)}P ${r0(parsed.targets.c || 0)}C ${r0(parsed.targets.f || 0)}F`) : null ].filter(Boolean));
  status.appendChild(list);
  importBtn.disabled = false;
 }
 async function doImport() {
  if (!parsed) return;
  clearDemo();
  const written = [], newFoods = [];
  if (opts.food) parsed.foods.forEach((f, id) => {
   FOODS.set(id, f);
   newFoods.push(f);
  });
  const isTotal = e => e.unit === "day";
  parsed.days.forEach((src, iso) => {
   const day = editDay(iso);
   if (opts.weight && src.wKg) {
    day.wKg = src.wKg;
    day.wT = day.wT || S.imports.weighAt;
   }
   if (parsed.counts.spend) {
    if (opts.spend && src.mfE > 0) day.mfE = src.mfE; else if (!opts.spend) delete day.mfE;
   }
   const inc = src.entries;
   const keep = !inc.length || inc.every(isTotal) && day.entries.some(e => !isTotal(e));
   if (opts.food && !keep) {
    day.entries = day.entries.filter(e => !e.imp).concat(inc.map(e => ({
     ...e
    })));
    day.entries.sort((a, b) => (a.t || "") < (b.t || "") ? -1 : 1);
   }
   if (day.wKg || day.entries.length || day.mfE) {
    DAYS.set(iso, day);
    written.push(day);
   }
  });
  if (opts.targets && parsed.targets) {
   const t = parsed.targets;
   S.targets.kcal = {
    min: null,
    max: r0(t.kcal)
   };
   if (t.p) S.targets.p = {
    min: r0(t.p),
    max: null
   };
   if (t.c) S.targets.c = {
    min: r0(t.c),
    max: null
   };
   if (t.f) S.targets.f = {
    min: null,
    max: r0(t.f)
   };
   saveSettings();
  }
  closeModal();
  lsSave();
  render();
  toast(`Imported ${written.length} day${written.length === 1 ? "" : "s"}` + (opts.food && parsed.counts.newFoods ? `, ${parsed.counts.newFoods} new food${parsed.counts.newFoods === 1 ? "" : "s"}` : ""));
  const paths = newFoods.map(f => "foods/" + f.id).concat(written.map(d => "days/" + d.d));
  const revived = paths.filter(p => TOMB.delete(p));
  if (revived.length) tombWrite();
  if (DB) for (const p of revived) {
   try {
    await DB.doc("gone/" + tombId(p)).delete();
   } catch (e) {}
  }
  const items = newFoods.map(f => [ "foods/" + f.id, f ]).concat(written.map(d => [ "days/" + d.d, d ]));
  await uploadWithProgress(items);
 }
 openModal({
  save: () => {
   if (parsed) doImport();
  },
  title: "Import from MacroFactor",
  body: [ el("div", {
   class: "small muted",
   html: "MacroFactor: <b>Settings → Export Data</b>"
  }), filePicker(file, "Choose files"), status ],
  footer: [ importBtn ]
 });
}
