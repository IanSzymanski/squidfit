"use strict";

const KCAL_PER_KG = 7700, LB = 2.2046226218;

const OZ = 28.349523125;

const SEED_RAW = `\nChicken breast, raw|120|22.5|0|2.6|protein|breast (raw)@200\nChicken breast, cooked|165|31|0|3.6|protein|breast@174;cup diced@140\nChicken thigh, cooked, skinless|209|26|0|10.9|protein|thigh@52\nChicken, rotisserie, meat only|190|27|0|8.6|protein|cup@140\nGround beef 93/7, cooked|182|25.6|0|8.2|protein|patty (4 oz raw)@85\nGround beef 85/15, cooked|218|26|0|12|protein|patty (4 oz raw)@85\nGround beef 80/20, cooked|254|25.8|0|16|protein|patty (4 oz raw)@85\nBeef sirloin steak, cooked|201|30|0|8|protein|steak (6 oz raw)@140\nRibeye steak, cooked|291|24|0|21|protein|steak (8 oz raw)@190\nPork tenderloin, cooked|143|26|0|3.5|protein|\nPork chop, cooked|231|26|0|13|protein|chop@120\nBacon, cooked|541|37|1.4|42|protein|slice@8\nHam, deli sliced|107|16.6|1.5|3.5|protein|slice@28\nTurkey breast, deli sliced|104|17|3|2.5|protein|slice@28\nGround turkey 93/7, cooked|176|27|0|7|protein|\nSalmon, Atlantic, cooked|206|22.1|0|12.4|protein|fillet@170\nTuna, canned in water, drained|116|25.5|0|0.8|protein|can (5 oz)@142\nTilapia, cooked|128|26|0|2.7|protein|fillet@87\nCod, cooked|105|23|0|0.9|protein|fillet@180\nShrimp, cooked|99|24|0.2|0.3|protein|large shrimp@11\nEgg, whole, raw|143|12.6|0.7|9.5|protein|large egg@50;jumbo egg@63\nEgg white|52|10.9|0.7|0.2|protein|large white@33;cup@243\nWhey protein powder|380|78|8|5|protein|scoop@31\nCasein protein powder|365|75|8|3|protein|scoop@33\nBeef jerky|410|33|11|25|protein|oz@28\nMilk, whole|61|3.2|4.8|3.3|dairy|cup@244\nMilk, 2%|50|3.4|4.8|2|dairy|cup@244\nMilk, skim|34|3.4|5|0.2|dairy|cup@245\nGreek yogurt, nonfat, plain|59|10.2|3.6|0.4|dairy|cup@245;container (5.3 oz)@150\nGreek yogurt, 2%, plain|73|9.9|4|1.9|dairy|cup@245;container (5.3 oz)@150\nGreek yogurt, whole, plain|97|9|3.9|5|dairy|container (5.3 oz)@150\nCottage cheese, 2%|84|11|4.3|2.3|dairy|cup@226\nCottage cheese, nonfat|72|10.3|6.7|0.3|dairy|cup@226\nCheddar cheese|403|23|3.1|33|dairy|slice@28;cup shredded@113\nMozzarella, part-skim|254|24.3|2.8|15.9|dairy|oz@28;cup shredded@112\nParmesan, grated|420|38|3.7|28|dairy|tbsp@5\nCream cheese|350|6.2|5.5|34|dairy|tbsp@14\nButter|717|0.9|0.1|81|fat|tbsp@14;pat@5\nHeavy cream|340|2.8|2.8|36|dairy|tbsp@15\nHalf and half|130|3|4.3|11.5|dairy|tbsp@15\nWhite rice, cooked|130|2.7|28|0.3|grain|cup@158\nBrown rice, cooked|123|2.7|25.6|1|grain|cup@195\nJasmine rice, dry|360|7|79|0.6|grain|cup@185\nOats, rolled, dry|379|13.2|67.7|6.5|grain|cup@81;half cup@40\nQuinoa, cooked|120|4.4|21.3|1.9|grain|cup@185\nPasta, cooked|158|5.8|30.9|0.9|grain|cup@140\nPasta, dry|371|13|75|1.5|grain|\nWhole wheat pasta, cooked|124|5.3|26.5|0.5|grain|cup@140\nBread, white|266|9|49|3.3|grain|slice@28\nBread, whole wheat|247|13|41|3.4|grain|slice@32\nSourdough bread|289|11.7|56|1.7|grain|slice@36\nBagel, plain|250|10|48|1.5|grain|bagel@98\nEnglish muffin|235|8.6|46|1.8|grain|muffin@57\nTortilla, flour|306|8.2|51.4|7.6|grain|8-inch@45;burrito size@72\nTortilla, corn|218|5.7|44.6|2.9|grain|tortilla@26\nPotato, russet, raw|79|2.1|18|0.1|grain|medium@173\nPotato, baked with skin|93|2.5|21|0.1|grain|medium@173\nSweet potato, baked|90|2|20.7|0.2|grain|medium@151\nFrench fries, restaurant|312|3.4|41|15|grain|medium order@117\nCorn flakes cereal|357|7.5|84|0.4|grain|cup@28\nGranola|471|10|64|20|grain|half cup@55\nCheerios|367|12|73|6|grain|cup@28\nBlack beans, canned, drained|91|6|16.6|0.3|legume|half cup@86\nChickpeas, canned, drained|139|7.1|22.6|2.6|legume|half cup@82\nLentils, cooked|116|9|20.1|0.4|legume|cup@198\nRefried beans|91|5.5|15|1.2|legume|half cup@120\nPeanut butter|588|25|20|50|legume|tbsp@16\nAlmond butter|614|21|18.8|55.5|legume|tbsp@16\nAlmonds|579|21.2|21.6|49.9|legume|oz (23 nuts)@28\nPeanuts, roasted|587|24.4|21.5|49.7|legume|oz@28\nWalnuts|654|15.2|13.7|65.2|legume|oz@28\nCashews|553|18.2|30.2|43.9|legume|oz@28\nPistachios|560|20.2|27.2|45.3|legume|oz@28\nTofu, firm|144|15.8|4.3|8.7|legume|block@396;serving@85\nEdamame, shelled, cooked|121|11.9|8.9|5.2|legume|cup@155\nHummus|166|7.9|14.3|9.6|legume|tbsp@15\nApple|52|0.3|13.8|0.2|fruit|medium@182;large@223\nBanana|89|1.1|22.8|0.3|fruit|medium@118;large@136\nOrange|47|0.9|11.8|0.1|fruit|medium@131\nStrawberries|32|0.7|7.7|0.3|fruit|cup sliced@166\nBlueberries|57|0.7|14.5|0.3|fruit|cup@148\nRaspberries|52|1.2|11.9|0.7|fruit|cup@123\nGrapes|69|0.7|18.1|0.2|fruit|cup@151\nWatermelon|30|0.6|7.6|0.2|fruit|cup diced@152\nPineapple|50|0.5|13.1|0.1|fruit|cup chunks@165\nMango|60|0.8|15|0.4|fruit|cup@165\nPeach|39|0.9|9.5|0.3|fruit|medium@150\nPear|57|0.4|15.2|0.1|fruit|medium@178\nCherries|63|1.1|16|0.2|fruit|cup@154\nAvocado|160|2|8.5|14.7|fruit|medium@201;half@100\nRaisins|299|3.1|79.2|0.5|fruit|small box@43\nDates, medjool|277|1.8|75|0.2|fruit|date@24\nBroccoli, raw|34|2.8|6.6|0.4|veg|cup chopped@91\nSpinach, raw|23|2.9|3.6|0.4|veg|cup@30\nKale, raw|49|4.3|8.8|0.9|veg|cup chopped@21\nCarrots, raw|41|0.9|9.6|0.2|veg|medium@61;cup chopped@128\nBell pepper, red|31|1|6|0.3|veg|medium@119\nTomato|18|0.9|3.9|0.2|veg|medium@123\nCucumber|15|0.7|3.6|0.1|veg|cup sliced@119\nOnion|40|1.1|9.3|0.1|veg|medium@110\nZucchini|17|1.2|3.1|0.3|veg|medium@196\nCauliflower|25|1.9|5|0.3|veg|cup@107\nGreen beans|31|1.8|7|0.2|veg|cup@100\nAsparagus|20|2.2|3.9|0.1|veg|spear@16\nMushrooms, white|22|3.1|3.3|0.3|veg|cup sliced@70\nRomaine lettuce|17|1.2|3.3|0.3|veg|cup shredded@47\nCorn, sweet, cooked|96|3.4|21|1.5|veg|ear@90;cup@164\nPeas, green|81|5.4|14.5|0.4|veg|cup@145\nBrussels sprouts|43|3.4|9|0.3|veg|cup@88\nOlive oil|884|0|0|100|fat|tbsp@13.5;tsp@4.5\nCanola oil|884|0|0|100|fat|tbsp@14\nCoconut oil|862|0|0|100|fat|tbsp@13.6\nMayonnaise|680|1|0.6|75|fat|tbsp@14\nRanch dressing|430|1.3|6|45|fat|tbsp@15\nKetchup|101|1.2|25.8|0.1|other|tbsp@17\nMustard|66|4.4|5.8|3.3|other|tsp@5\nSoy sauce|53|8.1|4.9|0.6|other|tbsp@16\nSriracha|93|1.9|19|0.9|other|tsp@5\nHoney|304|0.3|82.4|0|other|tbsp@21\nMaple syrup|260|0|67|0.1|other|tbsp@20\nSugar, granulated|387|0|100|0|other|tsp@4;tbsp@12.5\nDark chocolate, 70-85%|598|7.8|45.9|42.6|other|square@10;oz@28\nMilk chocolate|535|7.6|59.4|29.7|other|oz@28\nPotato chips|536|7|53|34|other|oz@28\nTortilla chips|489|7|63|23|other|oz@28\nPopcorn, air-popped|387|12.9|77.8|4.5|other|cup@8\nIce cream, vanilla|207|3.5|23.6|11|other|half cup@66\nPizza, cheese|266|11|33|10|other|slice@107\nCheeseburger, fast food|280|14|24|14|other|burger@130\nProtein bar, generic|360|30|38|10|other|bar@60\nBeer, regular|43|0.5|3.6|0|other|can (12 oz)@356\nWine, red|85|0.1|2.6|0|other|glass (5 oz)@147\nWhiskey / vodka, 80 proof|231|0|0|0|other|shot (1.5 oz)@42\nOrange juice|45|0.7|10.4|0.2|other|cup@248\nSoda, cola|42|0|10.6|0|other|can (12 oz)@368\nCoffee, black|1|0.1|0|0|other|cup@237\n`.trim();

const ALCOHOL = {
 "Beer, regular": 3.9,
 "Wine, red": 10.6,
 "Whiskey / vodka, 80 proof": 33.4
};

const SEED = SEED_RAW.split("\n").map((ln, i) => {
 const [name, kcal, p, c, f, cat, ports] = ln.split("|");
 const portions = [];
 if (ports) ports.split(";").filter(Boolean).forEach(s => {
  const [lb, g] = s.split("@");
  portions.push({
   label: lb,
   g: +g
  });
 });
 return {
  id: "s" + i,
  name: name,
  cat: cat,
  kcal: +kcal,
  p: +p,
  c: +c,
  f: +f,
  alc: ALCOHOL[name] || 0,
  portions: portions,
  seed: true
 };
});

const $ = s => document.querySelector(s);

const el = (t, a = {}, kids = []) => {
 const n = document.createElement(t);
 for (const k in a) {
  if (k === "class") n.className = a[k]; else if (k === "html") n.innerHTML = a[k]; else if (k === "text") n.textContent = a[k]; else if (k.startsWith("on")) n.addEventListener(k.slice(2), a[k]); else if (a[k] !== null && a[k] !== undefined && a[k] !== false) n.setAttribute(k, a[k]);
 }
 (Array.isArray(kids) ? kids : [ kids ]).forEach(k => {
  if (k === null || k === undefined || k === false) return;
  n.appendChild(typeof k === "string" ? document.createTextNode(k) : k);
 });
 return n;
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const r0 = n => Math.round(n), r1 = n => Math.round(n * 10) / 10, r2 = n => Math.round(n * 100) / 100;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function thaw(d) {
 if (d === null || typeof d !== "object") return d;
 try {
  return structuredClone(d);
 } catch (e) {
  try {
   return JSON.parse(JSON.stringify(d));
  } catch (e2) {
   return {
    ...d
   };
  }
 }
}

function sameRecord(a, b) {
 if (a === b) return true;
 if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
 if (Array.isArray(a) !== Array.isArray(b)) return false;
 if (Array.isArray(a)) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!sameRecord(a[i], b[i])) return false;
  return true;
 }
 const ka = Object.keys(a), kb = Object.keys(b);
 if (ka.length !== kb.length) return false;
 for (const k of ka) {
  if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
  if (!sameRecord(a[k], b[k])) return false;
 }
 return true;
}

const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayISO = () => isoOf(new Date);

const parseISO = s => {
 const [y, m, d] = s.split("-").map(Number);
 return new Date(y, m - 1, d);
};

const DAYNUM = new Map, DAYISO = new Map;

const DAY_MS = 864e5;

function dayNum(iso) {
 let n = DAYNUM.get(iso);
 if (n !== undefined) return n;
 const y = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10);
 n = Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
 if (DAYNUM.size > 2e4) DAYNUM.clear();
 DAYNUM.set(iso, n);
 return n;
}

function isoFromNum(n) {
 let s = DAYISO.get(n);
 if (s !== undefined) return s;
 const d = new Date(n * DAY_MS);
 s = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
 if (DAYISO.size > 2e4) DAYISO.clear();
 DAYISO.set(n, s);
 return s;
}

const addDays = (iso, n) => n === 0 ? iso : isoFromNum(dayNum(iso) + n);

const daysBetween = (a, b) => dayNum(b) - dayNum(a);

const dowOf = iso => ((dayNum(iso) + 4) % 7 + 7) % 7;

const FMTSHORT = new Map, FMTLONG = new Map;

const FMT_OPT_S = {
 month: "numeric",
 day: "numeric"
};

const FMT_OPT_L = {
 weekday: "short",
 month: "short",
 day: "numeric"
};

function fmtDate(iso, long) {
 const cache = long ? FMTLONG : FMTSHORT;
 let s = cache.get(iso);
 if (s !== undefined) return s;
 s = parseISO(iso).toLocaleDateString(undefined, long ? FMT_OPT_L : FMT_OPT_S);
 if (cache.size > 8e3) cache.clear();
 cache.set(iso, s);
 return s;
}

const nowHM = () => {
 const d = new Date;
 return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const fmtHM = t => {
 if (!t) return "--:--";
 const [h, m] = t.split(":").map(Number);
 const ap = h < 12 ? "am" : "pm", hh = h % 12 === 0 ? 12 : h % 12;
 return `${hh}:${String(m).padStart(2, "0")}${ap}`;
};

const weekStart = iso => addDays(iso, -weekCol(dowOf(iso)));

const median = a => {
 if (!a.length) return null;
 const s = [ ...a ].sort((x, y) => x - y), h = s.length >> 1;
 return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

const weightBasis = () => typeof S === "object" && S && S.weight && S.weight.basis === "mean" ? "mean" : "median";

const basisWord = () => weightBasis() === "mean" ? "average" : "median";

const basisTitle = () => weightBasis() === "mean" ? "Average" : "Median";

const centreOf = a => !a || !a.length ? null : weightBasis() === "mean" ? mean(a) : median(a);

const unitOf = () => typeof S === "object" && S && S.units && S.units.weight === "kg" ? "kg" : "lb";

const wUnit = unitOf;

const kgToDisp = kg => unitOf() === "kg" ? kg : kg * LB;

const dispToKg = v => unitOf() === "kg" ? v : v / LB;

const fmtW = (kg, dp) => kg === null || kg === undefined || !isFinite(kg) ? "—" : kgToDisp(kg).toFixed(dp === undefined ? 1 : dp);

const signed = (v, dp) => {
 const d = dp === undefined ? 2 : dp;
 const s = v.toFixed(d);
 if (Number(s) === 0) return (0).toFixed(d);
 return (v >= 0 ? "+" : "") + s;
};

const loadUnit = unitOf;

const dispLoad = lb => unitOf() === "kg" ? (+lb || 0) / LB : +lb || 0;

const loadFromDisp = v => unitOf() === "kg" ? (+v || 0) * LB : +v || 0;

const fmtLoad = lb => r1(dispLoad(lb));

const loadCaption = () => "Weight on bar (" + unitOf() + ")";

const loadStep = () => {
 const st = typeof S === "object" && S && S.train && S.train.step || null;
 const v = st ? +st[unitOf()] : NaN;
 return isFinite(v) && v > 0 ? v : unitOf() === "kg" ? 1.25 : 2.5;
};

const KJ = 4.184;

const kScale = (headers, i) => i >= 0 && /\bkj\b/i.test(String(headers[i] || "")) ? 1 / KJ : 1;

const eUnit = () => typeof S === "object" && S && S.units && S.units.energy === "kJ" ? "kJ" : "kcal";

const eDisp = kcal => eUnit() === "kJ" ? (+kcal || 0) * KJ : +kcal || 0;

const eFromDisp = v => eUnit() === "kJ" ? (+v || 0) / KJ : +v || 0;

const fmtE = kcal => kcal === null || kcal === undefined || !isFinite(kcal) ? "—" : String(r0(eDisp(kcal)));

const fmtEU = kcal => fmtE(kcal) + " " + eUnit();

const MI = 1.609344;

const distUnit = () => {
 const u = typeof S === "object" && S && S.units ? S.units.dist : null;
 return u === "mi" || u === "km" ? u : unitOf() === "lb" ? "mi" : "km";
};

const kmToDisp = km => distUnit() === "mi" ? (+km || 0) / MI : +km || 0;

const dispToKm = v => distUnit() === "mi" ? (+v || 0) * MI : +v || 0;

const fmtD = (km, dp) => km === null || km === undefined || !isFinite(km) || !(km > 0) ? "—" : kmToDisp(km).toFixed(dp === undefined ? 1 : dp);

const DOMAINS = [ "food", "weight", "strength", "cardio" ];

const tracks = k => !(typeof S === "object" && S && S.track && S.track[k] === false);

const CARDIO_METRICS = [ "dist", "hr", "watts", "met" ];

const CARDIO_MODS = [ {
 k: "ride",
 name: "Ride",
 verb: "ride",
 met: 7.5
}, {
 k: "run",
 name: "Run",
 verb: "run",
 met: 9.8
}, {
 k: "row",
 name: "Row",
 verb: "row",
 met: 7
}, {
 k: "swim",
 name: "Swim",
 verb: "swim",
 met: 6
}, {
 k: "walk",
 name: "Walk",
 verb: "walk",
 met: 3.5
}, {
 k: "other",
 name: "Other",
 verb: "session",
 met: 5
} ];

const capFirst = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);

const cardioMod = k => CARDIO_MODS.find(m => m.k === k) || CARDIO_MODS[0];

const NUTS = [ {
 k: "kcal",
 get label() {
  return eUnit() === "kJ" ? "Energy" : "Calories";
 },
 get short() {
  return eUnit();
 },
 unit: "",
 css: "var(--nut-k)"
}, {
 k: "p",
 label: "Protein",
 short: "P",
 unit: "g",
 css: "var(--nut-p)"
}, {
 k: "c",
 label: "Carbs",
 short: "C",
 unit: "g",
 css: "var(--nut-c)"
}, {
 k: "f",
 label: "Fat",
 short: "F",
 unit: "g",
 css: "var(--nut-f)"
} ];

const MACROS = NUTS.filter(n => n.k !== "kcal");

function minLabel(m) {
 const n = Math.round(+m || 0), h = Math.floor(n / 60), r = n % 60;
 return h ? r ? h + "h " + r + "m" : h + "h" : n + "m";
}

const ICONS = {
 fMeat: '<svg viewBox="0 0 24 24"><path d="M7.5 20.5a4.5 4.5 0 0 1-3.2-7.7l8.3-8.3a5.5 5.5 0 0 1 7.8 7.8l-8.3 8.3a4.5 4.5 0 0 1-3.2 1.3z"/><circle cx="8.2" cy="16" r="2.2"/></svg>',
 fFish: '<svg viewBox="0 0 24 24"><path d="M3 12c3.5-4.5 8-6.5 12-6.5 2.6 0 4.6.9 6 2.3-1.4 1.4-2 2.7-2 4.2s.6 2.8 2 4.2c-1.4 1.4-3.4 2.3-6 2.3-4 0-8.5-2-12-6.5z"/><circle cx="7.5" cy="11.4" r=".9"/></svg>',
 fEgg: '<svg viewBox="0 0 24 24"><path d="M12 3c3.6 0 6.5 5 6.5 9.2A6.5 6.5 0 0 1 12 21a6.5 6.5 0 0 1-6.5-8.8C5.5 8 8.4 3 12 3z"/></svg>',
 fDairy: '<svg viewBox="0 0 24 24"><path d="M8 3h8v3.2l2 3.3V21H6V9.5l2-3.3z"/><path d="M6 13h12"/></svg>',
 fGrain: '<svg viewBox="0 0 24 24"><path d="M12 21V8"/><path d="M12 8c0-2.8 1.6-5 4-5 0 2.8-1.6 5-4 5zM12 8c0-2.8-1.6-5-4-5 0 2.8 1.6 5 4 5z"/><path d="M12 14c0-2.5 1.5-4.3 3.6-4.3 0 2.5-1.5 4.3-3.6 4.3zM12 14c0-2.5-1.5-4.3-3.6-4.3 0 2.5 1.5 4.3 3.6 4.3z"/></svg>',
 fProduce: '<svg viewBox="0 0 24 24"><path d="M11 21C6 19.5 3.5 15.5 3.5 10.5 8.5 10.5 12 13 13 17"/><path d="M11 21c0-6 3-10.5 9.5-12.5C20.5 15 16.5 20 11 21z"/></svg>',
 fFat: '<svg viewBox="0 0 24 24"><path d="M12 3.5c3.5 4.2 5.5 7.2 5.5 10a5.5 5.5 0 0 1-11 0c0-2.8 2-5.8 5.5-10z"/></svg>',
 fSweet: '<svg viewBox="0 0 24 24"><path d="M5 20h14v-6H5z"/><path d="M5 14c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M12 8V5.5"/><circle cx="12" cy="4" r="1.3"/></svg>',
 fDrink: '<svg viewBox="0 0 24 24"><path d="M6 4h11v5a5.5 5.5 0 0 1-11 0z"/><path d="M17 5.5h2.2a2 2 0 0 1 0 4H17"/><path d="M5 20.5h13"/></svg>',
 fBooze: '<svg viewBox="0 0 24 24"><path d="M5 4h14l-7 8z"/><path d="M12 12v7M8.5 19h7"/></svg>',
 fMixed: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12.5" r="7.5"/><circle cx="12" cy="12.5" r="3.4"/></svg>',
 dash: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="5"/><rect x="13" y="10" width="8" height="11"/><rect x="3" y="13" width="8" height="8"/></svg>',
 food: '<svg viewBox="0 0 24 24"><path d="M5 3v8a2.5 2.5 0 0 0 5 0V3M7.5 11v10"/><path d="M17.5 3c-1.7 1.4-2.5 3.6-2.5 6 0 1.9.8 3 2.5 3.2V21"/></svg>',
 add: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
 bike: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M8 17l3.5-7H8.5M11.5 10l3 7M14.5 6.5h2.5l1.5 4"/></svg>',
 gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.1"/><path d="M12 2.2l1.5 2.5 2.9-.5.5 2.9 2.5 1.5-1.6 2.5 1.6 2.5-2.5 1.5-.5 2.9-2.9-.5L12 21.8l-1.5-2.5-2.9.5-.5-2.9-2.5-1.5L6.2 12 4.6 9.5l2.5-1.5.5-2.9 2.9.5z"/></svg>',
 scale: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16"/><path d="M12 8v3M8.7 8.6l1.4 2.2M15.3 8.6l-1.4 2.2M7 15.5h10"/></svg>',
 x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 chev: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
 up: '<svg viewBox="0 0 24 24"><path d="M12 19V6M6 12l6-6 6 6"/></svg>',
 down: '<svg viewBox="0 0 24 24"><path d="M12 5v13M6 12l6 6 6-6"/></svg>',
 trash: '<svg viewBox="0 0 24 24"><path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5"/></svg>',
 cal: '<svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16"/><path d="M3 9.5h18M8 2.8v3.4M16 2.8v3.4"/></svg>',
 list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
 info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.3"/></svg>',
 eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.1"/></svg>',
 eyeOff: '<svg viewBox="0 0 24 24"><path d="M4 4l16 16"/><path d="M9.6 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.3 7.9A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5"/><path d="M9.9 9.9a3.1 3.1 0 0 0 4.2 4.2"/></svg>',
 camera: '<svg viewBox="0 0 24 24"><path d="M3 8.5h3.6l1.6-2.4h7.6l1.6 2.4H21v10H3z"/><circle cx="12" cy="13" r="3.4"/></svg>',
 chevr: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
 ai: '<svg viewBox="0 0 24 24"><path d="M11 3.5l1.7 4.3 4.3 1.7-4.3 1.7L11 15.5 9.3 11.2 5 9.5l4.3-1.7zM18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
 chart: '<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M7.5 15.5l3.5-4.5 3 2.5 4.5-6"/></svg>',
 clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>',
 star: '<svg viewBox="0 0 24 24"><path d="M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8z"/></svg>',
 mic: '<svg viewBox="0 0 24 24"><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>',
 pen: '<svg viewBox="0 0 24 24"><path d="M4 20l.9-3.6L15.4 5.9a2 2 0 0 1 2.8 2.8L7.6 19.1z"/><path d="M13.7 7.6l2.7 2.7"/></svg>',
 plate: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/></svg>',
 back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
 scaleI: '<svg viewBox="0 0 24 24"><path d="M4 20h16M12 4v16M7 9l5-5 5 5"/></svg>',
 bolt: '<svg viewBox="0 0 24 24"><path d="M13 2.5L5.5 13.5H11l-1 8 7.5-11H12z"/></svg>',
 tick: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11"/></svg>',
 shuffle: '<svg viewBox="0 0 24 24"><path d="M3 6.5h4l3.5 5M21 6.5h-4l-9 11H3M21 17.5h-4M17.5 3.5L21 6.5l-3.5 3M17.5 14.5l3.5 3-3.5 3"/></svg>',
 drop: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4.5 20.5h15"/></svg>',
 dumbbell: '<svg viewBox="0 0 24 24"><path d="M2.5 9.5v5M5.5 7v10M18.5 7v10M21.5 9.5v5M8.5 8.5v7M15.5 8.5v7M8.5 12h7"/></svg>',
 search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8L20.5 20.5"/></svg>',
 cam: '<svg viewBox="0 0 24 24"><path d="M3 8.5h3.5L8 6h8l1.5 2.5H21v11H3z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
 wide: '<svg viewBox="0 0 24 24"><path d="M3 7v10M21 7v10"/><path d="M6 12h12"/><path d="M9 9l-3 3 3 3M15 9l3 3-3 3"/></svg>',
 narrow: '<svg viewBox="0 0 24 24"><path d="M3 7v10M21 7v10"/><path d="M6 12h12"/><path d="M9 9l3 3-3 3M15 9l-3 3 3 3"/></svg>'
};
