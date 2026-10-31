let WZOOM = 1;

let STRIPMON = null;

let STRIPX = null, STRIPKEY = null;

let STRIPFOLLOW = false;

function dayStep(n) {
 SELDATE = addDays(SELDATE, n);
 STRIPFOLLOW = true;
 selClear();
 render();
}

function pickDay(iso, keepMonth) {
 SELDATE = iso;
 if (!keepMonth) STRIPMON = null;
 selClear();
 render();
 window.scrollTo({
  top: 0
 });
}

function stripMonday() {
 if (!STRIPMON || weekStart(STRIPMON) !== STRIPMON) STRIPMON = weekStart(SELDATE);
 return STRIPMON;
}

function kcalFrac(iso) {
 const goal = S.targets.kcal.max || S.targets.kcal.min;
 const day = DAYS.get(iso);
 if (!goal || !day || !(day.entries || []).length) return null;
 return clamp(totalsOf(day.entries).kcal / goal, 0, 1);
}

function weekStrip(onPick) {
 const today = todayISO();
 const days = el("div", {
  class: "wkdays"
 });
 const n = 35;
 let mon = stripMonday();
 let start = addDays(mon, -21);
 if (SELDATE < start || SELDATE > addDays(start, n - 1)) {
  STRIPMON = weekStart(SELDATE);
  mon = STRIPMON;
  start = addDays(mon, -21);
  STRIPX = null;
 }
 if (STRIPKEY !== start) {
  STRIPKEY = start;
  STRIPX = null;
 }
 let selCell = null;
 days.addEventListener("scroll", () => {
  STRIPX = days.scrollLeft;
 }, {
  passive: true
 });
 for (let i = 0; i < n; i++) {
  const iso = addDays(start, i);
  const sel = iso === SELDATE;
  const frac = sel ? null : kcalFrac(iso);
  const cls = [ "wkd", frac !== null ? "prog" : "", iso === today ? "today" : "", iso > today ? "fut" : "" ].filter(Boolean).join(" ");
  const cell = el("button", {
   class: cls,
   type: "button",
   "aria-pressed": sel ? "true" : "false",
   "aria-label": fmtDate(iso, true) + (frac === null ? "" : `, ${r0(frac * 100)}% of calories`),
   style: frac === null ? null : `--ring:conic-gradient(from 0deg at 50% 50%,` + `var(--nut-k) 0deg ${r0(frac * 360)}deg,var(--line) ${r0(frac * 360)}deg 360deg)`,
   onclick: () => {
    pickDay(iso, true);
    onPick && onPick(iso);
   }
  }, [ el("span", {
   class: "dw",
   text: DOW_SHORT[dowOf(iso)]
  }), el("span", {
   class: "dn",
   text: String(parseISO(iso).getDate())
  }) ]);
  if (sel) selCell = cell;
  days.appendChild(cell);
 }
 queueMicrotask(() => {
  if (!days.clientWidth || !selCell) return;
  if (STRIPX !== null) {
   days.scrollLeft = STRIPX;
   if (STRIPFOLLOW) {
    STRIPFOLLOW = false;
    const dr = days.getBoundingClientRect(), sr = selCell.getBoundingClientRect();
    if (sr.left < dr.left) days.scrollLeft -= dr.left - sr.left; else if (sr.right > dr.right) days.scrollLeft += sr.right - dr.right;
    STRIPX = days.scrollLeft;
   }
   return;
  }
  STRIPFOLLOW = false;
  const dr = days.getBoundingClientRect(), sr = selCell.getBoundingClientRect();
  days.scrollLeft += sr.left - dr.left - (dr.width - sr.width) / 2;
  STRIPX = days.scrollLeft;
 });
 return el("div", {
  class: "wkstrip"
 }, [ days ]);
}

function dayHeading() {
 const isToday = SELDATE === todayISO();
 const back = daysBetween(SELDATE, todayISO());
 return el("div", {
  class: "dayhead"
 }, [ el("b", {
  text: isToday ? "Today" : fmtDate(SELDATE, true)
 }), el("span", {
  class: "small muted",
  text: isToday ? fmtDate(SELDATE, true) : back < 0 ? `${-back} day${back === -1 ? "" : "s"} ahead` : `${back} day${back === 1 ? "" : "s"} ago`
 }), el("span", {
  class: "sp"
 }), isToday ? null : el("button", {
  class: "btn sm",
  type: "button",
  text: "Today",
  onclick: () => pickDay(todayISO())
 }), el("button", {
  class: "btn sm",
  type: "button",
  "aria-label": "Browse by month",
  onclick: () => {
   LOGTAB = "food";
   LOGMONTH = SELDATE.slice(0, 7) + "-01";
   go("logging");
  }
 }, [ el("span", {
  html: ICONS.cal
 }), el("span", {
  text: "Month"
 }) ]) ]);
}

VIEWS.food = function viewFood() {
 const root = $("#p-food");
 root.innerHTML = "";
 const day = getDay(SELDATE);
 const t = totalsOf(day.entries);
 root.appendChild(el("div", {
  class: "wkwrap"
 }, [ weekStrip() ]));
 root.appendChild(el("div", {
  class: "fhead",
  id: "fhead"
 }, [ el("button", {
  class: "totbar",
  type: "button",
  "aria-label": "Macro detail",
  onclick: () => go("macros")
 }, [ el("span", {
  class: "fixed"
 }, [ kcalSquare(t, 66) ]), el("span", {
  class: "grow"
 }, [ microBars(t) ]), chevron() ]) ]));
 root.appendChild(dayHeading());
 root.appendChild(hourStream(day));
 pageSwipe(root, {
  prev: () => dayStep(-1),
  next: () => dayStep(1),
  move: () => [ root.querySelector(".dayhead"), root.querySelector(".stream") ]
 });
 const sIn = el("input", {
  type: "search",
  placeholder: "Search foods",
  "aria-label": "Search foods"
 });
 const jump = () => openSearch(sIn.value);
 sIn.addEventListener("focus", jump);
 sIn.addEventListener("input", jump);
 const bar = el("div", {
  class: "botbar overnav"
 }, [ SELMODE ? selBar() : el("div", {
  class: "botbar-in"
 }, [ AI ? el("button", {
  class: "btn",
  type: "button",
  "aria-label": "Describe what you ate",
  onclick: () => openAiMeal()
 }, [ icon("ai", 17) ]) : null, sIn ].filter(Boolean)) ]);
 root.appendChild(bar);
 queueMicrotask(() => {
  if (bar.offsetHeight) document.documentElement.style.setProperty("--barh", bar.offsetHeight + "px");
 });
};

let SELMODE = false, SELACTION = null;

let SELIDS = new Set;

function selClear() {
 SELMODE = false;
 SELACTION = null;
 SELIDS = new Set;
}

function selTap(e) {
 if (!SELMODE) {
  SELMODE = true;
  SELIDS = new Set([ e.id ]);
  render();
  return;
 }
 if (SELIDS.has(e.id)) SELIDS.delete(e.id); else SELIDS.add(e.id);
 if (!SELIDS.size) selClear();
 render();
}

function selEntries() {
 return getDay(SELDATE).entries.filter(e => SELIDS.has(e.id));
}

function selDrop(t) {
 const picked = selEntries();
 if (!picked.length) {
  selClear();
  render();
  return;
 }
 const mode = SELACTION, iso = SELDATE;
 const day = editDay(iso);
 if (mode === "move") {
  const ids = new Set(picked.map(e => e.id));
  const before = day.entries.map(e => ({
   ...e
  }));
  day.entries.forEach(e => {
   if (ids.has(e.id)) e.t = t;
  });
  selClear();
  saveDay(day);
  toastUndo(`Moved ${picked.length} to ${fmtHM(t)}`, () => {
   const d = editDay(iso);
   d.entries = before;
   saveDay(d);
  });
 } else {
  const made = picked.map(e => ({
   ...e,
   id: uid(),
   t: t
  }));
  day.entries = day.entries.concat(made);
  selClear();
  saveDay(day);
  const ids = new Set(made.map(e => e.id));
  toastUndo(`Copied ${made.length} to ${fmtHM(t)}`, () => {
   const d = editDay(iso);
   d.entries = d.entries.filter(e => !ids.has(e.id));
   saveDay(d);
  });
 }
}

function selRemove() {
 const picked = selEntries().map(e => ({
  ...e
 }));
 if (!picked.length) return;
 const iso = SELDATE, ids = new Set(picked.map(e => e.id));
 const day = editDay(iso);
 day.entries = day.entries.filter(e => !ids.has(e.id));
 selClear();
 saveDay(day);
 toastUndo(`Removed ${picked.length}`, () => {
  const d = editDay(iso);
  d.entries = d.entries.concat(picked);
  saveDay(d);
 });
}

function selCopyTo(iso) {
 const picked = selEntries();
 if (!picked.length) {
  selClear();
  render();
  return;
 }
 const made = picked.map(e => ({
  ...e,
  id: uid()
 }));
 const day = editDay(iso);
 day.entries = day.entries.concat(made);
 selClear();
 saveDay(day);
 const ids = new Set(made.map(e => e.id)), today = todayISO();
 const where = iso === today ? "today" : iso === addDays(today, 1) ? "tomorrow" : fmtDate(iso, true);
 toastUndo(`Copied ${made.length} to ${where}`, () => {
  const d = editDay(iso);
  d.entries = d.entries.filter(e => !ids.has(e.id));
  saveDay(d);
 });
}

function selCopyPick() {
 const n = SELIDS.size;
 let month = SELDATE.slice(0, 7) + "-01";
 const host = el("div", {});
 const paint = () => {
  host.innerHTML = "";
  host.appendChild(foodCalendar(iso => {
   closeModal();
   selCopyTo(iso);
  }, month, to => {
   month = to;
   paint();
  }, false));
 };
 paint();
 openModal({
  title: `Copy ${n} item${n === 1 ? "" : "s"} to`,
  body: [ host ]
 });
}

function selView() {
 const picked = selEntries();
 const t = totalsOf(picked);
 openModal({
  title: picked.length + " items",
  body: [ el("div", {
   class: "box pad"
  }, [ el("div", {
   class: "big mono",
   text: fmtEU(t.kcal)
  }), el("div", {
   class: "small muted",
   text: "selected together"
  }), el("div", {
   class: "mt"
  }, [ microBars(t) ]) ]), el("div", {
   class: "box rows"
  }, picked.map(e => row({
   t1: e.name,
   t2: `${fmtHM(e.t)} · ${r1(e.qty)} ${e.unit}`,
   val: fmtE(e.kcal)
  }))) ]
 });
}

function selBar() {
 const n = SELIDS.size;
 const act = (label, fn, cls) => el("button", {
  class: "btn sm" + (cls || ""),
  type: "button",
  text: label,
  onclick: fn
 });
 return el("div", {
  class: "selbar"
 }, [ el("div", {
  class: "hd"
 }, [ el("button", {
  class: "btn sm",
  type: "button",
  "aria-label": "Leave selection",
  onclick: () => {
   selClear();
   render();
  }
 }, [ el("span", {
  class: "chevron",
  html: ICONS.x
 }) ]), el("span", {
  class: "lb",
  text: "Select"
 }), el("span", {
  class: "ct",
  text: String(n)
 }), el("span", {
  class: "sp"
 }) ]), SELACTION ? el("div", {
  class: "hint",
  text: SELACTION === "copy" ? `Tap an hour to copy ${n} item${n === 1 ? "" : "s"}, or keep ${n === 1 ? "its time" : "their times"}:` : `Tap an hour to ${SELACTION} ${n} item${n === 1 ? "" : "s"}.`
 }) : null, SELACTION === "copy" ? el("div", {
  class: "acts"
 }, [ act("Today", () => selCopyTo(todayISO())), act("Tomorrow", () => selCopyTo(addDays(todayISO(), 1))), el("button", {
  class: "btn sm",
  type: "button",
  onclick: () => selCopyPick()
 }, [ el("span", {
  html: ICONS.cal
 }), el("span", {
  text: "Pick day"
 }) ]) ]) : null, SELACTION ? null : el("div", {
  class: "acts"
 }, [ n === 1 ? act("Edit", () => {
  const e = selEntries()[0];
  if (e) openEntry(e);
 }) : act("View", () => selView()), act("Copy", () => {
  SELACTION = "copy";
  render();
 }), act("Move", () => {
  SELACTION = "move";
  render();
 }), act("Remove", () => selRemove(), " bad") ]) ]);
}

function removeEntry(e) {
 const gone = {
  ...e
 }, iso = SELDATE;
 const d = editDay(iso);
 d.entries = d.entries.filter(x => x.id !== e.id);
 saveDay(d);
 toastUndo("Removed", () => {
  const b = editDay(iso);
  b.entries.push(gone);
  saveDay(b);
 });
}

function loggedHours() {
 const n = new Array(24).fill(0), today = todayISO();
 let total = 0;
 DAYS.forEach(d => {
  if (daysBetween(d.d, today) > 60) return;
  (d.entries || []).forEach(e => {
   n[parseInt((e.t || "12").slice(0, 2), 10) || 0]++;
   total++;
  });
 });
 if (total < 20) return [ 0, 23 ];
 const cut = total * .02;
 let lo = 0, hi = 23, run = 0;
 for (;lo < 23; lo++) {
  run += n[lo];
  if (run > cut) break;
 }
 for (run = 0; hi > 0; hi--) {
  run += n[hi];
  if (run > cut) break;
 }
 return [ Math.max(0, lo - 1), Math.min(23, hi + 1) ];
}

let HOURSOPEN = false;

function hourStream(day) {
 const byHour = new Map;
 [ ...day.entries ].sort((a, b) => (a.t || "") < (b.t || "") ? -1 : 1).forEach(e => {
  const h = parseInt((e.t || "12:00").slice(0, 2), 10) || 0;
  if (!byHour.has(h)) byHour.set(h, []);
  byHour.get(h).push(e);
 });
 const nowH = SELDATE === todayISO() ? (new Date).getHours() : -1;
 const stream = el("div", {
  class: "stream"
 });
 let [lo, hi] = SELACTION || HOURSOPEN ? [ 0, 23 ] : loggedHours();
 byHour.forEach((_, h) => {
  lo = Math.min(lo, h);
  hi = Math.max(hi, h);
 });
 if (nowH >= 0) {
  lo = Math.min(lo, nowH);
  hi = Math.max(hi, nowH);
 }
 const fold = (a, b) => {
  const label = fmtHM(String(a).padStart(2, "0") + ":00").replace(":00", "") + "–" + fmtHM(String(b).padStart(2, "0") + ":00").replace(":00", "");
  stream.appendChild(el("button", {
   class: "hour fold",
   type: "button",
   "aria-label": "Show " + label,
   onclick: () => {
    HOURSOPEN = true;
    render();
   }
  }, [ el("span", {
   class: "hh",
   text: label
  }), el("span", {
   class: "slot"
  }, [ chevron() ]) ]));
 };
 if (lo > 0) fold(0, lo - 1);
 for (let h = lo; h <= hi; h++) {
  const items = byHour.get(h) || [];
  const hh = String(h).padStart(2, "0");
  const slot = el("div", {
   class: "slot"
  });
  if (items.length) {
   const st = totalsOf(items);
   slot.appendChild(el("div", {
    class: "slotsum"
   }, [ el("span", {
    class: "k",
    text: fmtE(st.kcal)
   }), el("span", {
    text: eUnit()
   }), el("span", {
    class: "m"
   }, [ el("i", {
    style: "--c:var(--nut-p)",
    text: r0(st.p) + "P "
   }), el("i", {
    style: "--c:var(--nut-c)",
    text: r0(st.c) + "C "
   }), el("i", {
    style: "--c:var(--nut-f)",
    text: r0(st.f) + "F"
   }) ]) ]));
   items.forEach(e => {
    const on = SELIDS.has(e.id);
    const line = el("div", {
     class: "row split" + (on ? " on" : "")
    }, [ el("button", {
     class: "pick",
     type: "button",
     "aria-pressed": SELMODE ? on ? "true" : "false" : null,
     onclick: () => selTap(e)
    }, [ SELMODE ? el("span", {
     class: "cbx" + (on ? " on" : ""),
     html: ICONS.tick
    }) : foodIcon(foodById(e.src) || RECIPES.get(e.src) || e, 20), el("span", {
     class: "nm"
    }, [ el("span", {
     class: "t1 nmline"
    }, [ el("span", {
     class: "nm1",
     text: e.name
    }), foodTag(foodById(e.src) || RECIPES.get(e.src)) ].filter(Boolean)), el("span", {
     class: "t2"
    }, [ el("span", {
     class: "k",
     text: fmtE(e.kcal)
    }), document.createTextNode(` · ${r0(e.p)}P ${r0(e.c)}C ${r0(e.f)}F · ${r1(e.qty)} ${e.unit}`) ]) ]) ].filter(Boolean)), el("button", {
     class: "ed",
     type: "button",
     html: ICONS.pen,
     "aria-label": "Edit " + e.name,
     onclick: () => openEntry(e)
    }) ]);
    slot.appendChild(swipeRow(line, {
     right: {
      label: "Add here",
      css: "var(--interactive)",
      fg: "var(--on-interactive)",
      fn: () => {
       ADDTIME = e.t || hh + ":00";
       ADDMODE = "log";
       go("addfood");
      }
     },
     left: [ {
      label: "Edit",
      css: "var(--ink2)",
      fg: "var(--bg)",
      fn: () => openEntry(e)
     }, {
      label: "Delete",
      css: "var(--danger)",
      fg: "var(--on-danger)",
      fn: () => removeEntry(e)
     } ]
    }));
   });
  } else {
   const add = el("button", {
    class: "addhere",
    type: "button",
    "aria-label": `Add food at ${fmtHM(hh + ":00")}`,
    onclick: () => {
     ADDTIME = hh + ":00";
     ADDMODE = "log";
     go("addfood");
    }
   }, [ el("span", {
    text: "+"
   }) ]);
   slot.appendChild(add);
  }
  const hour = el("div", {
   class: "hour" + (h === nowH ? " now" : "") + (SELACTION ? " armed" : "")
  }, [ el("div", {
   class: "hh"
  }, [ el("span", {
   text: fmtHM(hh + ":00").replace(":00", "")
  }), SELACTION ? el("span", {
   class: "drop",
   html: ICONS.drop
  }) : null ].filter(Boolean)), slot ]);
  if (SELACTION) hour.addEventListener("click", ev => {
   ev.preventDefault();
   ev.stopPropagation();
   selDrop(hh + ":00");
  }, true);
  stream.appendChild(hour);
 }
 if (hi < 23) fold(hi + 1, 23);
 return el("div", {
  class: "sec"
 }, [ stream ]);
}

let CALMONTH = null;

function gradientOf(colors) {
 if (!colors.length) return "linear-gradient(var(--line),var(--line))";
 return `linear-gradient(${colors[0]},${colors[0]})`;
}

function calendarBlock(onPick, marksFor, valueFor, monthISO, onShift, opts) {
 const anchor = monthISO || CALMONTH || SELDATE.slice(0, 7) + "-01";
 const first = parseISO(anchor);
 first.setDate(1);
 const monthLabel = first.toLocaleDateString(undefined, {
  month: "long",
  year: "numeric"
 });
 const startPad = weekCol(first.getDay());
 const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
 const o = opts || {};
 const grid = el("div", {
  class: "cal" + (o.big ? " big" : "")
 });
 weekOrder().forEach(i => grid.appendChild(el("div", {
  class: "dow",
  text: DOW_SHORT[i]
 })));
 for (let i = 0; i < startPad; i++) grid.appendChild(el("div", {
  class: "cell out"
 }));
 for (let dn = 1; dn <= daysInMonth; dn++) {
  const iso = isoOf(new Date(first.getFullYear(), first.getMonth(), dn));
  const day = DAYS.get(iso);
  const rides = [ ...RIDES.values() ].some(r => r.d === iso);
  const marks = marksFor ? marksFor(iso) : {
   w: hasWeight(day),
   f: hasFood(day),
   r: rides
  };
  const val = valueFor ? valueFor(iso) : null;
  const grad = o.borderFor ? o.borderFor(iso) : null;
  const dots = !o.borderFor;
  const cls = [ "cell", grad ? "grad" : "", iso === todayISO() ? "today" : "", iso === SELDATE ? "sel" : "", iso > todayISO() ? "out" : "" ].filter(Boolean).join(" ");
  grid.appendChild(el("button", {
   class: cls,
   type: "button",
   "aria-label": fmtDate(iso, true),
   style: grad ? `--ring:${grad}` : null,
   onclick: () => onPick(iso)
  }, [ el("span", {
   class: "dn",
   text: String(dn)
  }), val ? el("span", {
   class: "vv",
   text: val
  }) : null, !dots ? null : el("span", {
   class: "marks"
  }, [ marks.w ? el("span", {
   class: "m w"
  }) : null, marks.f ? el("span", {
   class: "m f"
  }) : null, marks.r ? el("span", {
   class: "m r"
  }) : null ]) ]));
 }
 const shift = n => {
  const to = isoOf(new Date(first.getFullYear(), first.getMonth() + n, 1));
  if (onShift) onShift(to); else {
   CALMONTH = to;
   render();
  }
 };
 const dot = (color, label) => el("i", {}, [ el("span", {
  class: "dot",
  style: `--c:${color}`
 }), document.createTextNode(label) ]);
 return el("div", {
  class: "sec"
 }, [ el("div", {
  class: "box pad bar"
 }, [ el("button", {
  class: "btn sm",
  type: "button",
  text: "‹",
  "aria-label": "Previous month",
  onclick: () => shift(-1)
 }), el("div", {
  class: "grow hd mid",
  text: monthLabel
 }), el("button", {
  class: "btn sm",
  type: "button",
  text: "›",
  "aria-label": "Next month",
  onclick: () => shift(1)
 }) ]), el("div", {
  class: "box pad"
 }, [ grid, o.nokey ? null : el("div", {
  class: "callegend"
 }, [ dot("var(--ser-weight)", "weighed"), dot("var(--ser-intake)", "food logged"), dot("var(--ser-ride)", cardioWords().one) ]) ].filter(Boolean)) ]);
}

function foodCalendar(onPick, month, onShift, big) {
 return calendarBlock(onPick, null, iso => {
  const d = DAYS.get(iso);
  return hasFood(d) ? fmtE(totalsOf(d.entries).kcal) : null;
 }, month, onShift, {
  borderFor: iso => hasFood(DAYS.get(iso)) ? gradientOf([ "var(--ser-intake)" ]) : null,
  big: big,
  nokey: true
 });
}

VIEWS.macros = function viewMacros() {
 const root = $("#p-macros");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 root.appendChild(el("div", {
  class: "wkwrap"
 }, [ weekStrip() ]));
 root.appendChild(dayHeading());
 pageSwipe(root, {
  prev: () => dayStep(-1),
  next: () => dayStep(1),
  move: () => [ ...root.children ].filter(c => !c.matches(".sec.bar:first-child, .wkwrap"))
 });
 const day = getDay(SELDATE);
 const t = totalsOf(day.entries);
 const L = sections(root, "macros");
 if (!everAte()) {
  const a = firstAct("food");
  L.add("items", "Items", sec("Items", null, [ el("div", {
   class: "box"
  }, [ emptyAdd(a.text, a.fn) ]) ]));
  L.done();
  return;
 }
 L.add("targets", "Against your targets", sec("Against your targets", el("button", {
  class: "btn sm",
  type: "button",
  text: "Targets",
  onclick: () => {
   SETGROUP = "targets";
   go("setgroup");
  }
 }), [ el("div", {
  class: "box pad"
 }, [ nutBars(t) ]) ]));
 const fromP = t.p * 4, fromC = t.c * 4, fromF = t.f * 9, fromA = t.alc * 7;
 const sum = fromP + fromC + fromF + fromA;
 L.add("sources", "Where the energy came from", sec("Where the " + NUTS[0].label.toLowerCase() + " came from", null, [ el("div", {
  class: "box pad"
 }, [ kv("Protein", `${fmtEU(fromP)}${sum ? "  " + r0(fromP / sum * 100) + "%" : ""}`), kv("Carbs", `${fmtEU(fromC)}${sum ? "  " + r0(fromC / sum * 100) + "%" : ""}`), kv("Fat", `${fmtEU(fromF)}${sum ? "  " + r0(fromF / sum * 100) + "%" : ""}`), fromA ? kv("Alcohol", `${fmtEU(fromA)}${sum ? "  " + r0(fromA / sum * 100) + "%" : ""}`) : null, el("hr", {
  class: "hr"
 }), kv("Logged total", fmtEU(t.kcal)), Math.abs(sum - t.kcal) > Math.max(40, t.kcal * .06) ? el("div", {
  class: "small muted mt",
  text: `Macros come to ${fmtEU(sum)}, which is a way off the logged ${fmtE(t.kcal)}. Usually a food with calories entered by hand.`
 }) : null ]) ]));
 const days = chartDays(30);
 if (days.length > 2) {
  const host = el("div", {
   class: "box pad"
  });
  const hold = el("div", {});
  host.appendChild(hold);
  L.add("logged", "Logged each day", sec(NUTS[0].label + " logged", null, [ host ]));
  queueMicrotask(() => hold.appendChild(intakeChart(days, hold.clientWidth || 330, iso => {
   SELDATE = iso;
   STRIPMON = null;
   render();
  })));
 }
 const w = windowStats(SELDATE);
 L.add("seven", "Seven days", sec("Seven days to " + fmtDate(SELDATE), null, [ el("div", {
  class: "box pad"
 }, [ kv("Days logged", `${w.foodDays} of 7`), kv("Average " + NUTS[0].label.toLowerCase(), w.meanKcal === null ? "—" : fmtEU(w.meanKcal)), w.macroMean ? kv("Average protein", r0(w.macroMean.p) + " g") : null, w.macroMean ? kv("Average carbs", r0(w.macroMean.c) + " g") : null, w.macroMean ? kv("Average fat", r0(w.macroMean.f) + " g") : null ]) ]));
 if (day.entries.length) {
  const tb = el("table", {
   class: "t"
  });
  tb.appendChild(el("tr", {}, [ el("th", {
   text: "Item"
  }), el("th", {
   class: "n",
   text: eUnit()
  }), el("th", {
   class: "n",
   text: "P"
  }), el("th", {
   class: "n",
   text: "C"
  }), el("th", {
   class: "n",
   text: "F"
  }) ]));
  [ ...day.entries ].sort((a, b) => a.t < b.t ? -1 : 1).forEach(e => tb.appendChild(el("tr", {}, [ el("td", {
   text: e.name
  }), el("td", {
   class: "n",
   text: fmtE(e.kcal)
  }), el("td", {
   class: "n",
   text: r0(e.p)
  }), el("td", {
   class: "n",
   text: r0(e.c)
  }), el("td", {
   class: "n",
   text: r0(e.f)
  }) ])));
  L.add("items", "Items", sec("Items", null, [ el("div", {
   class: "box scrollx"
  }, [ tb ]) ]));
 }
 L.done();
};

let GOFF = null;

VIEWS.weight = function viewWeight() {
 const root = $("#p-weight");
 root.innerHTML = "";
 const kept = everWeighed();
 root.appendChild(pageBar([ kept ? el("button", {
  class: "btn sm",
  type: "button",
  text: "Log weight",
  onclick: () => openWeigh(todayISO())
 }) : null ]));
 if (!kept) {
  const a = firstAct("weight");
  root.appendChild(el("div", {
   class: "sec"
  }, [ el("div", {
   class: "box"
  }, [ emptyAdd(a.text, a.fn) ]) ]));
  return;
 }
 const wc = weeklyChange();
 const head = el("div", {
  class: "box pad"
 });
 head.appendChild(el("div", {
  class: "big mono",
  text: wc.cur.median !== null ? fmtW(wc.cur.median) + " " + wUnit() : "—"
 }));
 head.appendChild(el("div", {
  class: "small muted",
  text: wc.cur.median === null ? "no readings this week" : wc.delta === null ? "seven-day " + basisWord() : signedW(wc.delta) + " " + wUnit() + " on last week"
 }));
 const L = sections(root, "weight");
 L.add("week", "This week", sec("This week", null, [ head ]));
 L.add("graph", "Graph", weightGraphBlock());
 const rows = windowTable(14).filter(r => r.median !== null).reverse();
 if (rows.length) {
  const tb = el("table", {
   class: "t"
  });
  tb.appendChild(el("tr", {}, [ el("th", {
   text: "7 days to"
  }), el("th", {
   class: "n",
   text: basisTitle()
  }), el("th", {
   class: "n",
   text: "Change"
  }), el("th", {
   class: "n",
   text: "n"
  }) ]));
  rows.forEach(r => tb.appendChild(el("tr", {}, [ el("td", {
   text: fmtDate(r.end)
  }), el("td", {
   class: "n",
   text: fmtW(r.median)
  }), el("td", {
   class: "n",
   text: r.change === null ? "—" : signedW(r.change)
  }), el("td", {
   class: "n",
   text: String(r.n)
  }) ])));
  L.add("weeks", "By week", sec("By week", null, [ el("div", {
   class: "box scrollx"
  }, [ tb ]) ]));
 }
 L.add("trend", "Rate and where it leads", trendBlock());
 L.done();
};

function trendBlock() {
 const e = estimateTDEE();
 const box = el("div", {
  class: "box pad"
 });
 if (!e.ok) {
  box.appendChild(el("div", {
   class: "big mono",
   text: "—"
  }));
  box.appendChild(el("div", {
   class: "small muted",
   text: e.why
  }));
  return sec("Rate and where it leads", null, [ box ]);
 }
 const perDayKg = e.deltaKg / e.span;
 const kcalPerDay = e.deltaKg * KCAL_PER_KG / e.span;
 const losing = kcalPerDay < 0;
 const now = trailingMedian(todayISO(), 7, 2);
 const proj = now ? now.med + perDayKg * 30 : null;
 box.appendChild(el("div", {
  class: "big mono",
  text: signedW(perDayKg * 7) + " " + wUnit()
 }));
 box.appendChild(el("div", {
  class: "small muted",
  text: `a week, over the last ${e.span} days`
 }));
 box.appendChild(el("hr", {
  class: "hr mt"
 }));
 box.appendChild(kv(losing ? "Average deficit" : "Average surplus", fmtEU(Math.abs(kcalPerDay)) + "/day"));
 box.appendChild(kv("Over those " + e.span + " days", fmtEU(Math.abs(kcalPerDay) * e.span) + " " + (losing ? "under" : "over")));
 box.appendChild(kv("Eaten", fmtEU(e.meanIntake) + "/day"));
 box.appendChild(kv("Burned", fmtEU(e.tdee) + "/day"));
 if (proj !== null) {
  box.appendChild(el("hr", {
   class: "hr mt"
  }));
  box.appendChild(el("div", {
   class: "big mono mt",
   text: fmtW(proj) + " " + wUnit()
  }));
  box.appendChild(el("div", {
   class: "small muted",
   text: `the seven-day ${basisWord()} in 30 days, if this rate held`
  }));
  box.appendChild(el("div", {
   class: "small muted mt",
   text: `From ${fmtW(now.med)} ${wUnit()} today, ${signedW(proj - now.med)} ${wUnit()} by ${fmtDate(addDays(todayISO(), 30), true)}.`
  }));
 }
 if (e.why) box.appendChild(el("div", {
  class: "note mt",
  text: e.why
 }));
 return sec("Rate and where it leads", null, [ box ]);
}

let LOGMONTH = null, LOGTAB = "food";

function lastRideOnOrBefore(iso) {
 let best = null;
 RIDES.forEach(r => {
  if (r.d <= iso && (!best || r.d > best)) best = r.d;
 });
 return best;
}

function ridePoolFrac(iso) {
 const last = lastRideOnOrBefore(iso);
 if (!last) return 0;
 const age = daysBetween(last, iso), n = poolDays();
 return age >= 0 && age < n ? 1 - age / n : 0;
}

function ridesOn(iso) {
 return [ ...RIDES.values() ].filter(r => r.d === iso);
}

VIEWS.logging = function viewLogging() {
 const root = $("#p-logging");
 root.innerHTML = "";
 const month = LOGMONTH || SELDATE.slice(0, 7) + "-01";
 const thisMonth = todayISO().slice(0, 7) + "-01";
 root.appendChild(pageBar([ month === thisMonth ? null : el("button", {
  class: "btn sm",
  type: "button",
  text: "Today",
  onclick: () => {
   LOGMONTH = thisMonth;
   render();
  }
 }) ]));
 const tabs = [ [ "food", "Food" ], [ "weight", "Weight" ], [ "ride", cardioWords().short ] ].filter(([k]) => tracks(k === "ride" ? "cardio" : k));
 if (tabs.length && !tabs.some(([k]) => k === LOGTAB)) LOGTAB = tabs[0][0];
 if (tabs.length > 1) root.appendChild(el("div", {
  class: "sec"
 }, [ segmented(tabs, LOGTAB, v => {
  LOGTAB = v;
  render();
 }) ]));
 const shift = to => {
  LOGMONTH = to;
  render();
 };
 const monthAt = n => {
  const f = parseISO(month);
  return isoOf(new Date(f.getFullYear(), f.getMonth() + n, 1));
 };
 pageSwipe(root, {
  prev: () => shift(monthAt(-1)),
  next: () => shift(monthAt(1)),
  move: () => [ root.querySelector(".cal") ]
 });
 if (LOGTAB === "food") {
  root.appendChild(foodCalendar(iso => {
   SELDATE = iso;
   STRIPMON = null;
   go("food");
  }, month, shift, true));
 } else if (LOGTAB === "weight") {
  root.appendChild(calendarBlock(iso => openWeigh(iso), null, iso => {
   const d = DAYS.get(iso);
   return hasWeight(d) ? fmtW(d.wKg, 0) : null;
  }, month, shift, {
   borderFor: iso => hasWeight(DAYS.get(iso)) ? gradientOf([ "var(--ser-weight)" ]) : null,
   big: true,
   nokey: true
  }));
 } else {
  root.appendChild(calendarBlock(iso => {
   const rides = ridesOn(iso);
   if (rides.length) openRide(rides[0]); else {
    SELDATE = iso;
    openRide();
   }
  }, null, iso => {
   const k = rideKcalOn(iso);
   return k > 0 ? fmtE(k) : null;
  }, month, shift, {
   borderFor: iso => {
    const p = ridePoolFrac(iso);
    return p > 0 ? gradientOf([ `color-mix(in srgb, var(--ser-ride) ${r0(p * 100)}%, transparent)` ]) : null;
   },
   big: true,
   nokey: true
  }));
 }
 const w = coverage(hasWeight, 28), f = coverage(hasFood, 28);
 const today = todayISO();
 const rideDays = new Set([ ...RIDES.values() ].map(r => r.d));
 let rideHits = 0;
 for (let k = 0; k < 28; k++) if (rideDays.has(addDays(today, -k))) rideHits++;
 if (!everAte() && !everWeighed() && !everRode()) return;
 root.appendChild(el("div", {
  class: "sec"
 }, [ el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "big mono",
  text: `${f.hit}/28`
 }), el("div", {
  class: "small muted",
  text: "days of food logged, last four weeks"
 }), el("hr", {
  class: "hr"
 }), kv("Weighed", `${w.hit}/28`), cardioShown() ? kv(cardioWords().past, `${rideHits}/28`) : null, kv("Food run ending today", `${f.run} day${f.run === 1 ? "" : "s"}`), kv("Longest food run", `${f.best} days`) ]) ]));
};

function graphPlotHeight() {
 return clamp(Math.round(window.innerHeight - 330), 190, 560);
}

function weightGraphBlock() {
 const cfg = S.chart, scale = cfg.scale;
 const series = weightSeries(scale);
 const spans = SPAN_OPTS[scale];
 const zkey = "w" + scale;
 const span = ZSPAN[zkey] || cfg.span[scale] || spans[1][0];
 let shown = Math.min(span, series.length);
 if (GOFF === null) GOFF = Math.max(0, series.length - shown);
 GOFF = clamp(GOFF, 0, Math.max(0, series.length - shown));
 const scaleSel = el("select", {
  class: "mini",
  "aria-label": "Chart scale"
 }, [ "day", "week", "month" ].map(k => el("option", {
  value: k,
  text: SCALE_LABEL[k],
  selected: k === scale ? "" : null
 })));
 scaleSel.addEventListener("change", () => {
  S.chart.scale = scaleSel.value;
  GOFF = null;
  saveSettings();
 });
 const zmin = scale === "day" ? 7 : scale === "week" ? 4 : 3;
 const zmax = scale === "day" ? 730 : scale === "week" ? 260 : 60;
 const spanOf = t => clamp(Math.round(zmax * Math.pow(zmin / zmax, clamp(t, 0, 1))), zmin, zmax);
 const tOf = sp => Math.log(clamp(sp, zmin, zmax) / zmax) / Math.log(zmin / zmax);
 const zoomText = sp => sp + " " + (scale === "day" ? "days" : scale === "week" ? "weeks" : "months");
 const slider = el("input", {
  type: "range",
  min: "0",
  max: "1",
  step: "0.005",
  value: String(tOf(span)),
  "aria-label": "Zoom",
  "aria-valuetext": zoomText(shown)
 });
 const host = el("div", {
  class: "box pad"
 });
 let graph = null;
 const paint = () => {
  host.innerHTML = "";
  graph = weightGraph(series, shown, GOFF, {
   width: host.clientWidth || 330,
   scale: scale,
   zoom: 1,
   plotH: graphPlotHeight(),
   onOffset: o => {
    GOFF = o;
   }
  });
  host.appendChild(graph);
  host.appendChild(legend(scale === "day" ? [ [ "dt", "var(--ink3)", "reading" ], [ "ln", "var(--ser-weight)", "7-day " + basisWord() ] ] : [ [ "dt", "var(--ink3)", (scale === "week" ? "weekly " : "monthly ") + basisWord() ] ]));
 };
 pinchSpan(host, {
  min: scale === "day" ? 7 : scale === "week" ? 4 : 3,
  max: scale === "day" ? 730 : scale === "week" ? 260 : 60,
  snaps: scale === "day" ? SNAP_SPANS : null,
  get: () => ZSPAN[zkey] || span,
  set: v => {
   ZSPAN[zkey] = v;
  },
  draw: () => {
   shown = Math.min(ZSPAN[zkey] || span, series.length);
   GOFF = clamp(GOFF, 0, Math.max(0, series.length - shown));
   paint();
  },
  end: () => render()
 });
 let zmid = null;
 const hold = () => {
  if (zmid === null) zmid = GOFF + shown / 2;
 };
 slider.addEventListener("pointerdown", hold);
 slider.addEventListener("keydown", hold);
 slider.addEventListener("pointerup", () => {
  zmid = null;
 });
 slider.addEventListener("blur", () => {
  zmid = null;
 });
 slider.addEventListener("input", () => {
  hold();
  const mid = zmid;
  const want = spanOf(+slider.value);
  ZSPAN[zkey] = want;
  shown = Math.min(want, series.length);
  GOFF = clamp(Math.round(mid - shown / 2), 0, Math.max(0, series.length - shown));
  slider.setAttribute("aria-valuetext", zoomText(shown));
  paint();
 });
 const atNow = GOFF >= Math.max(0, series.length - shown) - .5;
 const wrap = el("div", {}, [ host, el("div", {
  class: "bar mt chartfoot"
 }, [ atNow ? null : el("button", {
  class: "btn sm",
  type: "button",
  text: "To now",
  onclick: () => {
   GOFF = null;
   render();
  }
 }), el("span", {
  class: "cap",
  text: "Zoom"
 }), slider, scaleSel ].filter(Boolean)) ]);
 queueMicrotask(paint);
 return wrap;
}
