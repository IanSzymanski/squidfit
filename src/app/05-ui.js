function toast(m) {
 if (ONB) return;
 const r = $("#toastRoot");
 r.innerHTML = "";
 const n = el("div", {
  class: "toast",
  text: m
 });
 r.appendChild(n);
 clearTimeout(toast._t);
 toast._t = setTimeout(() => n.remove(), 2400);
}

function busyToast(label, done, total) {
 const r = $("#toastRoot");
 clearTimeout(toast._t);
 if (!label) {
  r.innerHTML = "";
  return;
 }
 let n = r.querySelector(".toast.busy");
 if (!n) {
  r.innerHTML = "";
  n = el("div", {
   class: "toast busy"
  });
  r.appendChild(n);
 }
 n.textContent = label + (total ? ` ${done} of ${total}` : "");
}

async function uploadWithProgress(items) {
 if (!DB) {
  await putMany(items);
  return;
 }
 busyToast("Uploading", 0, items.length);
 await putMany(items, (i, n) => busyToast("Uploading", i, n));
 busyToast(null);
}

function toastUndo(m, undo) {
 const r = $("#toastRoot");
 r.innerHTML = "";
 const n = el("div", {
  class: "toast"
 }, [ el("span", {
  text: m
 }), el("button", {
  class: "undo",
  type: "button",
  text: "Undo",
  onclick: () => {
   clearTimeout(toast._t);
   n.remove();
   undo();
  }
 }) ]);
 r.appendChild(n);
 clearTimeout(toast._t);
 toast._t = setTimeout(() => n.remove(), 6e3);
}

let MODALS = [];

function openModal({title: title, body: body, footer: footer, save: save, guard: guard, onClosed: onClosed, focus: focus}) {
 const prevFocus = document.activeElement;
 const scrim = el("div", {
  class: "scrim",
  role: "dialog",
  "aria-modal": "true",
  "aria-label": title
 });
 const sheet = el("div", {
  class: "sheet",
  tabindex: "-1"
 });
 sheet.appendChild(el("header", {}, [ el("button", {
  class: "btn sm icon",
  type: "button",
  "aria-label": "Back",
  onclick: requestClose
 }, [ el("span", {
  class: "chevron",
  html: ICONS.back
 }) ]), el("h3", {
  text: title
 }), el("span", {
  class: "sp"
 }) ]));
 const bd = el("div", {
  class: "bd"
 });
 (Array.isArray(body) ? body : [ body ]).forEach(b => b && bd.appendChild(b));
 sheet.appendChild(bd);
 if (footer) sheet.appendChild(el("footer", {}, footer.filter(Boolean)));
 scrim.appendChild(sheet);
 if (sheet.querySelector(TYPABLE)) scrim.classList.add("form");
 const rec = {
  scrim: scrim,
  sheet: sheet,
  save: save,
  guard: !!(save || guard),
  dirty: false,
  prevFocus: prevFocus,
  onClosed: onClosed
 };
 if (rec.guard) {
  const touch = () => {
   rec.dirty = true;
  };
  sheet.addEventListener("input", touch);
  sheet.addEventListener("change", touch);
 }
 sheet.addEventListener("focusin", e => {
  const t = e.target;
  if (!t || !t.scrollIntoView) return;
  setTimeout(() => {
   try {
    t.scrollIntoView({
     block: "center"
    });
   } catch (err) {}
  }, 260);
 });
 scrim.addEventListener("mousedown", e => {
  if (e.target === scrim) requestClose();
 });
 $("#modalRoot").appendChild(scrim);
 MODALS.push(rec);
 document.body.style.overflow = "hidden";
 if (focus && !FROMSWIPE) {
  try {
   focus.focus({
    preventScroll: true
   });
  } catch (e) {}
  selectAll(focus);
 } else queueMicrotask(() => {
  try {
   sheet.focus({
    preventScroll: true
   });
  } catch (e) {}
 });
 return {
  scrim: scrim,
  body: bd,
  markDirty: () => {
   rec.dirty = true;
  }
 };
}

function closeModal() {
 const m = MODALS.pop();
 if (m) {
  m.scrim.remove();
  if (m.prevFocus && m.prevFocus.focus && document.contains(m.prevFocus)) {
   try {
    m.prevFocus.focus({
     preventScroll: true
    });
   } catch (e) {}
  }
 }
 if (!MODALS.length) document.body.style.overflow = "";
 if (m && m.onClosed) m.onClosed();
}

function requestClose() {
 const m = MODALS[MODALS.length - 1];
 if (!m || !m.guard || !m.dirty) return closeModal();
 openModal({
  title: "Unsaved changes",
  body: [ el("div", {
   class: "note",
   text: m.save ? "Save what you entered, or leave without saving?" : "Leave without saving what you entered?"
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
    closeModal();
   }
  }), m.save ? el("button", {
   class: "btn pri",
   type: "button",
   text: "Save",
   onclick: () => {
    closeModal();
    m.save();
   }
  }) : null ]
 });
}

document.addEventListener("keydown", e => {
 if (e.key === "Escape" && MODALS.length) requestClose();
});

const TYPABLE = "input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),textarea,select";

document.addEventListener("focusin", e => {
 const t = e.target, sc = t && t.closest && t.matches && t.matches(TYPABLE) && t.closest(".scrim");
 if (sc) sc.classList.add("form");
});

let ZSPAN = {};

const zoomClear = () => {
 ZSPAN = {};
};

const SNAP_SPANS = [ 7, 14, 30, 91, 182, 365 ];

function snapSpan(v, snaps) {
 let best = Math.max(1, Math.round(v));
 (snaps || []).forEach(s => {
  if (Math.abs(v - s) <= s * .09) best = s;
 });
 return best;
}

function pinchSpan(node, o) {
 let base = 0, d0 = 0, live = false;
 const pts = new Map;
 const apply = ratio => {
  if (!(ratio > .05)) return;
  const next = clamp(snapSpan(base / ratio, o.snaps === undefined ? SNAP_SPANS : o.snaps), o.min, o.max);
  if (next !== o.get()) {
   o.set(next);
   o.draw();
  }
 };
 const finish = () => {
  if (o.end) o.end();
 };
 node.addEventListener("gesturestart", e => {
  e.preventDefault();
  live = true;
  base = o.get();
 });
 node.addEventListener("gesturechange", e => {
  if (!live) return;
  e.preventDefault();
  apply(e.scale || 1);
 });
 node.addEventListener("gestureend", e => {
  if (!live) return;
  e.preventDefault();
  live = false;
  finish();
 });
 node.addEventListener("pointerdown", e => {
  if (e.pointerType === "mouse") return;
  pts.set(e.pointerId, e);
  if (pts.size === 2) {
   d0 = 0;
   base = o.get();
  }
 });
 node.addEventListener("pointermove", e => {
  if (!pts.has(e.pointerId)) return;
  pts.set(e.pointerId, e);
  if (pts.size !== 2) return;
  const two = [ ...pts.values() ];
  const d = Math.hypot(two[0].clientX - two[1].clientX, two[0].clientY - two[1].clientY);
  if (!d0) {
   d0 = d;
   return;
  }
  if (d < 12 || d0 < 12) return;
  e.preventDefault();
  apply(d / d0);
 });
 const up = e => {
  if (!pts.delete(e.pointerId)) return;
  if (pts.size < 2 && d0) {
   d0 = 0;
   finish();
  }
 };
 node.addEventListener("pointerup", up);
 node.addEventListener("pointercancel", up);
 node.style.touchAction = "pan-y";
 return node;
}

const SWIPE_STOPS = [ 72, 138 ];

let FROMSWIPE = false;

function swipeDo(fn) {
 FROMSWIPE = true;
 try {
  fn();
 } finally {
  FROMSWIPE = false;
 }
}

const touchPref = (k, d) => {
 try {
  const v = +localStorage.getItem("ledgerscale." + k);
  return v >= 30 && v <= 300 ? v / 100 : d;
 } catch (e) {
  return d;
 }
};

const swipeK = () => touchPref("swipe", 1);

const dialK = () => touchPref("dial", 1);

function touchSet(k, pct) {
 try {
  if (pct === 100) localStorage.removeItem("ledgerscale." + k); else localStorage.setItem("ledgerscale." + k, String(pct));
 } catch (e) {}
}

const SELECTS = /^(text|number|search|tel|email|url|)$/;

let TAPPED = null, TAPPEDAT = 0, FOCUSBEFORE = null;

function selectAll(i) {
 if (!i || i.tagName !== "INPUT" || !SELECTS.test(i.type)) return;
 const v0 = i.value;
 const go = () => {
  if (document.activeElement !== i || i.value !== v0) return;
  try {
   i.select();
  } catch (e) {}
  try {
   i.setSelectionRange(0, String(i.value).length);
  } catch (e) {}
 };
 go();
 setTimeout(go, 0);
}

document.addEventListener("pointerdown", e => {
 FOCUSBEFORE = document.activeElement;
 const t = e.target && e.target.closest ? e.target : null;
 const lab = t && t.closest("label");
 TAPPED = t && (t.closest("input") || lab && lab.querySelector("input"));
 TAPPEDAT = Date.now();
}, true);

document.addEventListener("focusin", e => {
 const i = e.target;
 if (!i || i !== TAPPED || Date.now() - TAPPEDAT > 1500) return;
 TAPPED = null;
 selectAll(i);
 i.addEventListener("mouseup", ev => ev.preventDefault(), {
  once: true
 });
});

const PAGESWIPE_SKIP = ".swipe, .wkdays, .scrollx, .chart, .tk, .botbar, .dial, input, select, textarea, [data-noswipe]";

function pageSwipe(node, o) {
 node.pageSwipe = o;
 if (node.pageSwipeOn) return node;
 node.pageSwipeOn = true;
 node.style.touchAction = "pan-y";
 let x0 = 0, y0 = 0, t0 = 0, axis = 0, live = false, dx = 0, swallow = 0, moved = [];
 const paint = v => moved.forEach(n => {
  n.style.transform = v ? `translateX(${Math.round(v * .4)}px)` : "";
  n.style.opacity = v ? String(1 - Math.min(.5, Math.abs(v) / 400)) : "";
 });
 const settle = () => {
  moved.forEach(n => {
   n.style.transition = "transform var(--dur-fast) var(--ease-std), opacity var(--dur-fast) var(--ease-std)";
  });
  paint(0);
  const was = moved;
  setTimeout(() => was.forEach(n => {
   n.style.transition = "";
  }), 200);
 };
 node.addEventListener("pointerdown", e => {
  const cfg = node.pageSwipe;
  if (!cfg || e.pointerType === "mouse" || MODALS.length) return;
  if (e.target.closest(PAGESWIPE_SKIP)) return;
  if (e.clientX < 18 || e.clientX > innerWidth - 18) return;
  live = true;
  axis = 0;
  dx = 0;
  x0 = e.clientX;
  y0 = e.clientY;
  t0 = Date.now();
 });
 node.addEventListener("pointermove", e => {
  if (!live) return;
  const mx = e.clientX - x0, my = e.clientY - y0;
  if (!axis) {
   if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
    live = false;
    return;
   }
   if (Math.abs(mx) < 14) return;
   axis = 1;
   moved = node.pageSwipe.move ? node.pageSwipe.move().filter(Boolean) : [];
   try {
    node.setPointerCapture(e.pointerId);
   } catch (err) {}
  }
  e.preventDefault();
  dx = mx;
  paint(dx);
 });
 node.addEventListener("pointerup", () => {
  if (!live) return;
  live = false;
  if (!axis) return;
  axis = 0;
  swallow = Date.now() + 350;
  const need = 70 * swipeK(), ms = Math.max(1, Date.now() - t0);
  const go = Math.abs(dx) >= need || Math.abs(dx) > 30 && Math.abs(dx) / ms > .6;
  const cfg = node.pageSwipe;
  settle();
  if (go && cfg) (dx < 0 ? cfg.next : cfg.prev)();
 });
 node.addEventListener("pointercancel", () => {
  if (live && axis) settle();
  live = false;
  axis = 0;
 });
 node.addEventListener("click", ev => {
  if (Date.now() < swallow) {
   ev.preventDefault();
   ev.stopPropagation();
  }
 }, true);
 return node;
}

function swipeCore(content, o) {
 const bg = el("div", {
  class: "swbg"
 }, [ el("span", {
  class: "sl"
 }), el("span", {
  class: "sp"
 }), el("span", {
  class: "sr"
 }) ]);
 const wrap = el("div", {
  class: "swipe"
 }, [ bg, content ]);
 let x0 = 0, y0 = 0, dx = 0, axis = 0, live = false;
 const paint = () => {
  content.style.transform = dx ? `translateX(${dx}px)` : "";
  bg.className = "swbg" + (dx ? " on" : "");
  o.paint(dx, bg);
 };
 const reset = () => {
  content.style.transition = "transform var(--dur-fast) var(--ease-std)";
  dx = 0;
  paint();
  setTimeout(() => {
   content.style.transition = "";
  }, 200);
 };
 wrap.addEventListener("pointerdown", ev => {
  if (ev.pointerType === "mouse" && ev.button !== 0) return;
  x0 = ev.clientX;
  y0 = ev.clientY;
  axis = 0;
  live = true;
  dx = 0;
  travelled = 0;
  content.style.transition = "";
 });
 wrap.addEventListener("pointermove", ev => {
  if (!live) return;
  if (document.body.classList.contains("dragging")) {
   live = false;
   dx = 0;
   paint();
   return;
  }
  const mx = ev.clientX - x0, my = ev.clientY - y0;
  travelled = Math.max(travelled, Math.abs(mx));
  if (!axis) {
   if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) {
    live = false;
    return;
   }
   if (Math.abs(mx) < 12) return;
   axis = 1;
   try {
    wrap.setPointerCapture(ev.pointerId);
   } catch (e) {}
  }
  ev.preventDefault();
  if (!o.allow(mx)) {
   dx = 0;
   paint();
   return;
  }
  dx = clamp(mx, -o.max, o.max);
  paint();
 });
 let swallowUntil = 0, travelled = 0;
 wrap.addEventListener("pointerup", () => {
  if (!live) return;
  live = false;
  const at = dx, moved = travelled >= 12;
  axis = 0;
  travelled = 0;
  reset();
  if (moved) swallowUntil = Date.now() + 350;
  o.commit(at);
 });
 wrap.addEventListener("pointercancel", () => {
  live = false;
  if (travelled >= 12) swallowUntil = Date.now() + 120;
  axis = 0;
  travelled = 0;
  reset();
 });
 wrap.addEventListener("click", ev => {
  if (Date.now() < swallowUntil) {
   ev.preventDefault();
   ev.stopPropagation();
  }
 }, true);
 return wrap;
}

const GRAB_MS = 320, GRAB_SLOP = 10;

const DRAG_EDGE = 88, DRAG_SPEED = 18;

function holdDrag(item, o) {
 const skip = o.skip || "input, select, textarea, .btn, .nb, .tb";
 let hold = 0, live = false, ghost = null, grabX = 0, grabY = 0, host = null;
 let lastX = 0, lastY = 0, downX = 0, downY = 0, raf = 0, pid = null, swallow = 0;
 item.classList.add("drag");
 const place = () => {
  if (!ghost) return;
  ghost.style.left = lastX - grabX + "px";
  ghost.style.top = lastY - grabY + "px";
 };
 const seat = () => {
  const kids = [ ...host.children ].filter(n => n !== item && n.dataset.id);
  let i = 0;
  kids.forEach(n => {
   const r = n.getBoundingClientRect();
   if (o.grid) {
    if (lastY > r.bottom) i++; else if (lastY >= r.top && lastX > r.left + r.width / 2) i++;
   } else if (lastY > r.top + r.height / 2) i++;
  });
  const ref = kids[i] || null;
  if (ref) {
   if (item.nextSibling !== ref) host.insertBefore(item, ref);
  } else {
   const after = kids[kids.length - 1];
   if (after && after.nextSibling !== item) host.insertBefore(item, after.nextSibling);
  }
 };
 const tick = () => {
  if (!live) return;
  const vh = window.innerHeight;
  let d = 0;
  if (lastY < DRAG_EDGE) d = -DRAG_SPEED * (1 - lastY / DRAG_EDGE); else if (lastY > vh - DRAG_EDGE) d = DRAG_SPEED * (1 - (vh - lastY) / DRAG_EDGE);
  if (d) {
   const y0 = window.scrollY;
   window.scrollBy(0, d);
   if (window.scrollY !== y0) seat();
  }
  raf = requestAnimationFrame(tick);
 };
 const lift = () => {
  live = true;
  const r0 = item.getBoundingClientRect();
  grabX = lastX - r0.left;
  grabY = lastY - r0.top;
  if (o.swap) {
   const n = o.swap(item);
   if (n) item = n;
  }
  host = item.parentNode;
  const r = item.getBoundingClientRect();
  ghost = item.cloneNode(true);
  ghost.className = (o.ghostClass || item.className) + " dragghost";
  ghost.classList.remove("armed", "hole", "drag");
  ghost.style.width = r.width + "px";
  ghost.style.height = r.height + "px";
  document.body.appendChild(ghost);
  place();
  item.classList.remove("armed");
  item.classList.add("hole");
  if (o.lifted) o.lifted(host);
  document.body.classList.add("dragging");
  raf = requestAnimationFrame(tick);
 };
 const cancelHold = () => {
  clearTimeout(hold);
  hold = 0;
  item.classList.remove("armed");
 };
 const detach = () => {
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerup", end);
  window.removeEventListener("pointercancel", end);
 };
 const attach = () => {
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
 };
 const onDown = ev => {
  if (ev.target.closest(skip)) return;
  if (o.handle && !ev.target.closest(o.handle)) return;
  if (ev.pointerType === "mouse" && ev.button !== 0) return;
  pid = ev.pointerId;
  downX = lastX = ev.clientX;
  downY = lastY = ev.clientY;
  item.classList.add("armed");
  detach();
  attach();
  hold = setTimeout(() => {
   hold = 0;
   lift();
  }, GRAB_MS);
 };
 const onMove = ev => {
  if (pid !== null && ev.pointerId !== pid) return;
  lastX = ev.clientX;
  lastY = ev.clientY;
  if (hold) {
   if (Math.abs(lastX - downX) > GRAB_SLOP || Math.abs(lastY - downY) > GRAB_SLOP) {
    cancelHold();
    detach();
   }
   return;
  }
  if (!live) return;
  ev.preventDefault();
  place();
  seat();
 };
 const end = () => {
  cancelHold();
  detach();
  pid = null;
  if (!live) return;
  live = false;
  cancelAnimationFrame(raf);
  if (ghost) {
   ghost.remove();
   ghost = null;
  }
  item.classList.remove("hole");
  document.body.classList.remove("dragging");
  swallow = Date.now() + 350;
  (item._drop || o.drop)([ ...host.children ].map(n => n.dataset.id).filter(Boolean));
 };
 item.addEventListener("pointerdown", onDown);
 item.addEventListener("click", ev => {
  if (Date.now() < swallow) {
   ev.preventDefault();
   ev.stopPropagation();
  }
 }, true);
 item.addEventListener("contextmenu", ev => ev.preventDefault());
 return item;
}

const withId = (n, id) => {
 n.dataset.id = id;
 return n;
};

let ARRANGE = null;

function layoutOf(key, ids) {
 const saved = S.layout && Array.isArray(S.layout[key]) ? S.layout[key] : [];
 const seen = new Set, out = [];
 saved.forEach(e => {
  if (e && ids.includes(e.id) && !seen.has(e.id)) {
   seen.add(e.id);
   out.push({
    ...e,
    on: e.on !== false
   });
  }
 });
 ids.forEach(id => {
  if (!seen.has(id)) out.push({
   id: id,
   on: true
  });
 });
 return out;
}

function saveLayout(key, entries) {
 const out = entries.map(e => ({
  id: e.id,
  on: e.on !== false,
  ...e.w === 2 ? {
   w: 2
  } : {}
 }));
 const saved = S.layout && Array.isArray(S.layout[key]) ? S.layout[key] : [];
 saved.forEach((e, i) => {
  if (!e || out.some(x => x.id === e.id)) return;
  let at = 0;
  for (let j = i - 1; j >= 0; j--) {
   const k = out.findIndex(x => saved[j] && x.id === saved[j].id);
   if (k >= 0) {
    at = k + 1;
    break;
   }
  }
  out.splice(at, 0, e);
 });
 S.layout = {
  ...S.layout,
  [key]: out
 };
 saveSettings();
}

function arrangeList(key, entries, nameOf, onChange) {
 const box = el("div", {
  class: "box rows arrange"
 });
 const shown = entries.filter(e => e.on), hidden = entries.filter(e => !e.on);
 const put = list => {
  saveLayout(key, list);
  onChange();
 };
 shown.concat(hidden).forEach(e => {
  const line = row({
   t1: nameOf(e.id),
   dim: !e.on,
   tail: [ el("button", {
    class: "btn sm icon",
    type: "button",
    html: e.on ? ICONS.eye : ICONS.eyeOff,
    "aria-label": (e.on ? "Hide " : "Show ") + nameOf(e.id),
    onclick: () => put(entries.map(x => x.id === e.id ? {
     ...x,
     on: !x.on
    } : x))
   }) ]
  });
  const wrap = withId(el("div", {
   class: "swipe arr" + (e.on ? "" : " off")
  }, [ line ]), e.id);
  wrap._drop = ids => {
   const by = new Map(entries.map(x => [ x.id, x ]));
   put(ids.map(id => by.get(id)).filter(x => x && x.on).concat(hidden));
  };
  box.appendChild(e.on ? holdDrag(wrap, {
   drop: wrap._drop
  }) : wrap);
 });
 return box;
}

function sections(root, page) {
 const list = [];
 return {
  add(id, name, node) {
   if (node) list.push({
    id: id,
    name: name,
    node: node
   });
  },
  done() {
   if (!list.length) return;
   const by = new Map(list.map(x => [ x.id, x ]));
   const entries = layoutOf(page, list.map(x => x.id));
   const nameOf = id => by.get(id).name;
   if (ARRANGE === page) {
    root.appendChild(el("div", {
     class: "sec bar"
    }, [ el("div", {
     class: "grow hd",
     text: "Arrange this page"
    }), el("button", {
     class: "btn sm pri",
     type: "button",
     text: "Done",
     onclick: () => {
      ARRANGE = null;
      render();
     }
    }) ]));
    root.appendChild(el("div", {
     class: "sec"
    }, [ arrangeList(page, entries, nameOf, () => render()) ]));
    return;
   }
   let any = false;
   entries.forEach(e => {
    if (!e.on) return;
    any = true;
    const n = by.get(e.id).node;
    n.dataset.id = e.id;
    root.appendChild(holdDrag(n, {
     handle: "h2, .ttl",
     skip: "input, select, textarea, .btn",
     drop: () => {},
     swap: () => {
      ARRANGE = page;
      render();
      return document.querySelector(`#p-${page} .arrange [data-id="${e.id}"]`);
     }
    }));
   });
   if (!any && entries.some(e => !e.on)) root.appendChild(el("div", {
    class: "sec"
   }, [ el("div", {
    class: "box"
   }, [ emptyAdd("Arrange this page", () => {
    ARRANGE = page;
    render();
   }) ]) ]));
  }
 };
}

function inOrder(values, ids, idOf) {
 const at = new Map((ids || []).map((id, i) => [ id, i ]));
 const key = v => at.has(idOf(v)) ? at.get(idOf(v)) : Infinity;
 return values.map((v, i) => [ v, i ]).sort((a, b) => key(a[0]) - key(b[0]) || a[1] - b[1]).map(x => x[0]);
}

function swipeRow(content, opts) {
 const right = opts.right ? [ opts.right ] : [];
 const left = opts.left || [];
 if (!right.length && !left.length) return content;
 const stopFor = d => {
  const list = d > 0 ? right : left;
  if (!list.length) return null;
  let hit = null;
  list.forEach((a, i) => {
   if (Math.abs(d) >= (a.at || SWIPE_STOPS[i] || SWIPE_STOPS[0]) * k) hit = a;
  });
  return hit;
 };
 const k = swipeK();
 return swipeCore(content, {
  max: Math.round(168 * k),
  allow: d => (d > 0 ? right : left).length > 0,
  paint: (dx, bg) => {
   const a = stopFor(dx);
   bg.style.background = a ? a.css : "var(--alt)";
   bg.style.color = a ? a.fg || "var(--on-danger)" : "var(--ink3)";
   bg.children[0].textContent = dx > 0 ? a ? a.label : right[0] ? right[0].label : "" : "";
   bg.children[2].textContent = dx < 0 ? a ? a.label : left[0] ? left[0].label : "" : "";
   bg.classList.toggle("armed", !!a);
  },
  commit: dx => {
   const a = stopFor(dx);
   if (a) setTimeout(() => swipeDo(a.fn), 60);
  }
 });
}

function listHead(title, action) {
 return el("div", {
  class: "lhd"
 }, [ el("span", {
  class: "grow",
  text: title
 }), action || null ].filter(Boolean));
}

function filePicker(input, text, ic) {
 input.classList.add("hide");
 return el("div", {}, [ el("button", {
  class: "btn wide",
  type: "button",
  onclick: () => input.click()
 }, [ ic ? icon(ic) : null, el("span", {
  text: text
 }) ].filter(Boolean)), input ]);
}

function emptyAdd(text, onAdd) {
 return el("button", {
  class: "empty",
  type: "button",
  onclick: onAdd
 }, [ el("span", {
  class: "ic",
  html: ICONS.add
 }), el("span", {
  text: text
 }) ]);
}

function swipeScale(content, opts) {
 const max = Math.round(Math.min(190 * swipeK(), Math.max(190, innerWidth - 48))), dead = 18;
 const sideFor = d => (d > 0 ? opts.right : opts.left) || null;
 const levelFor = d => {
  const side = sideFor(d);
  if (!side) return 0;
  const travel = Math.min(Math.abs(d), max) - dead;
  if (travel <= 0) return 0;
  const per = (max - dead) / side.max;
  return clamp(Math.ceil(travel / per), 1, side.max);
 };
 return swipeCore(content, {
  max: max,
  allow: d => !!sideFor(d),
  paint: (dx, bg) => {
   const side = sideFor(dx), n = levelFor(dx);
   bg.style.background = n && side ? side.css : "var(--alt)";
   bg.style.color = n && side ? side.fg || "var(--on-danger)" : "var(--ink3)";
   const hint = side ? typeof side.hint === "function" ? side.hint() : side.hint : "";
   bg.children[0].textContent = dx > 0 && side ? n ? side.label(n) : hint || "" : "";
   bg.children[2].textContent = dx < 0 && side ? n ? side.label(n) : hint || "" : "";
  },
  commit: dx => {
   const side = sideFor(dx), n = levelFor(dx);
   if (side && n) setTimeout(() => swipeDo(() => side.fn(n)), 60);
  }
 });
}

function rangeDial(opts) {
 let lo = opts.min, hi = opts.max;
 const step = opts.step || 1;
 const dec = String(step).includes(".") ? String(step).split(".")[1].length : 0;
 const round = v => +(Math.round(v / step) * step).toFixed(dec);
 const snap = v => clamp(round(v), lo, hi);
 let val = opts.value === "" || opts.value === null || opts.value === undefined ? null : snap(+opts.value);
 const fill = el("span", {
  class: "fl"
 });
 const knob = el("span", {
  class: "kn"
 });
 const track = el("span", {
  class: "tk"
 }, [ fill, knob ]);
 const num = el("input", {
  type: "number",
  min: String(lo),
  max: String(hi),
  step: String(step),
  inputmode: dec ? "decimal" : "numeric",
  value: val === null ? "" : String(val),
  placeholder: opts.placeholder || String(round((lo + hi) / 2)),
  "aria-label": opts.label || "Value"
 });
 const show = v => opts.fmt ? opts.fmt(v) : v + (opts.unit || "");
 const loTick = el("span", {
  text: show(lo)
 });
 const hiTick = el("span", {
  text: show(hi)
 });
 const ticks = el("span", {
  class: "tx"
 }, [ loTick, el("span", {
  class: "sp"
 }), hiTick ]);
 const widen = v => {
  const half = (hi - lo) / 2 || 1;
  if (v < lo) {
   lo = round(v - half);
   hi = round(Math.max(hi, v + half));
  } else if (v > hi) {
   hi = round(v + half);
   lo = round(Math.min(lo, v - half));
  } else return false;
  if (opts.min >= 0) lo = Math.max(0, lo);
  num.min = String(lo);
  num.max = String(hi);
  loTick.textContent = show(lo);
  hiTick.textContent = show(hi);
  return true;
 };
 const paint = () => {
  const f = val === null ? 0 : (val - lo) / (hi - lo || 1);
  fill.style.width = (clamp(f, 0, 1) * 100).toFixed(1) + "%";
  knob.style.left = (clamp(f, 0, 1) * 100).toFixed(1) + "%";
  track.classList.toggle("unset", val === null);
  track.setAttribute("aria-valuemin", String(lo));
  track.setAttribute("aria-valuemax", String(hi));
  track.setAttribute("aria-valuenow", val === null ? "" : String(val));
 };
 let dirty = false;
 const set = (v, fromField) => {
  const was = val;
  if (v !== null && fromField && opts.open) {
   const r = round(v);
   if (widen(r)) val = r; else val = snap(v);
  } else val = v === null ? null : snap(v);
  if (!fromField) num.value = val === null ? "" : String(val);
  paint();
  if (val !== was) dirty = true;
  if (opts.onChange) opts.onChange(val);
 };
 const commit = () => {
  if (!dirty) return;
  dirty = false;
  if (opts.onCommit) opts.onCommit(val);
 };
 const fromX = cx => {
  const r = track.getBoundingClientRect();
  return lo + clamp((cx - r.left) / (r.width || 1), 0, 1) * (hi - lo);
 };
 let live = false, x0 = 0, v0 = 0, gain = 1;
 track.addEventListener("pointerdown", ev => {
  if (ev.pointerType === "mouse" && ev.button !== 0) return;
  live = true;
  gain = dialK();
  try {
   track.setPointerCapture(ev.pointerId);
  } catch (e) {}
  x0 = ev.clientX;
  v0 = fromX(x0);
  set(v0);
  ev.preventDefault();
 });
 track.addEventListener("pointermove", ev => {
  if (!live) return;
  const w = track.getBoundingClientRect().width || 1;
  set(clamp(v0 + (ev.clientX - x0) / w * (hi - lo) * gain, lo, hi));
  ev.preventDefault();
 });
 const end = () => {
  if (!live) return;
  live = false;
  commit();
 };
 track.addEventListener("pointerup", end);
 track.addEventListener("pointercancel", end);
 track.addEventListener("keydown", ev => {
  const d = ev.key === "ArrowRight" || ev.key === "ArrowUp" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowDown" ? -1 : 0;
  if (!d) return;
  ev.preventDefault();
  set(val === null ? lo : val + d * step);
 });
 track.addEventListener("keyup", commit);
 track.addEventListener("blur", commit);
 num.addEventListener("input", () => {
  const v = parseFloat(num.value);
  set(isFinite(v) ? v : null, true);
 });
 num.addEventListener("change", commit);
 num.addEventListener("blur", commit);
 track.setAttribute("role", "slider");
 track.setAttribute("tabindex", "0");
 track.setAttribute("aria-label", opts.label || "Value");
 paint();
 const wrap = el("div", {
  class: "dial" + (opts.compact ? " sm" : "") + (opts.hero ? " hero" : "")
 }, [ el("div", {
  class: "dr"
 }, [ track, num ]), ticks ]);
 wrap.input = num;
 wrap.get = () => val;
 wrap.set = v => set(v);
 return wrap;
}

const HOLD_MS = 1e3;

function holdButton(label, onDone, opts) {
 const o = opts || {};
 const fill = el("span", {
  class: "hf"
 });
 const b = el("button", {
  class: "btn hold" + (o.cls ? " " + o.cls : ""),
  type: "button"
 }, [ fill, el("span", {
  class: "hl",
  text: label
 }) ]);
 let t0 = 0, raf = 0, done = false;
 const paint = () => {
  const f = Math.min(1, (Date.now() - t0) / HOLD_MS);
  fill.style.width = (f * 100).toFixed(1) + "%";
  if (f >= 1) {
   stop(true);
   return;
  }
  raf = requestAnimationFrame(paint);
 };
 function stop(fire) {
  if (!t0) return;
  t0 = 0;
  cancelAnimationFrame(raf);
  raf = 0;
  b.classList.remove("on");
  if (fire && !done) {
   done = true;
   fill.style.width = "100%";
   onDone();
  } else fill.style.width = "0%";
 }
 const start = ev => {
  if (done || t0) return;
  if (ev && ev.pointerType === "mouse" && ev.button !== 0) return;
  if (ev && ev.preventDefault) ev.preventDefault();
  t0 = Date.now();
  b.classList.add("on");
  raf = requestAnimationFrame(paint);
 };
 b.addEventListener("pointerdown", start);
 [ "pointerup", "pointercancel", "pointerleave" ].forEach(e => b.addEventListener(e, () => stop(false)));
 b.addEventListener("keydown", ev => {
  if (ev.key === " " || ev.key === "Enter") start(ev);
 });
 b.addEventListener("keyup", () => stop(false));
 b.addEventListener("click", ev => {
  ev.preventDefault();
  ev.stopPropagation();
 }, true);
 return b;
}

function field(caption, control) {
 return el("div", {
  class: "f"
 }, [ el("span", {
  text: caption
 }), control ]);
}

function ctlSelect(opts, cur, onPick, label) {
 const sel = el("select", {
  class: "mini",
  "aria-label": label || ""
 }, opts.map(([v, l]) => el("option", {
  value: String(v),
  text: l,
  selected: String(v) === String(cur) ? "" : null
 })));
 sel.addEventListener("change", () => onPick(sel.value));
 return sel;
}

function labelled(caption, control, cls) {
 return el("label", {
  class: "f" + (cls ? " " + cls : "")
 }, [ el("span", {
  text: caption
 }), control ]);
}

function icon(name, size) {
 const html = ICONS[name] || name || "";
 const n = el("span", {
  class: "ic" + (size === "lg" ? " lg" : ""),
  html: html,
  "aria-hidden": "true"
 });
 if (typeof size === "number") n.style.setProperty("--isz", size + "px");
 return n;
}

function row(o) {
 const cls = [ "row", o.cls, o.tall ? "tall" : "", o.on ? "on" : "", o.dim ? "dim" : "", o.done ? "done" : "" ].filter(Boolean).join(" ");
 const line = (v, k) => v === null || v === undefined ? null : v.nodeType ? v : el("span", {
  class: k,
  text: v
 });
 const nm = el("span", {
  class: "nm"
 }, [ line(o.t1, "t1"), line(o.t2, "t2") ].filter(Boolean));
 const kids = [ o.mark || null, o.t1 === undefined && o.t2 === undefined ? null : nm, o.val === null || o.val === undefined ? null : el("span", {
  class: "val" + (o.lead ? " lead" : ""),
  text: o.val
 }), o.cnt === null || o.cnt === undefined ? null : el("span", {
  class: "cnt",
  text: String(o.cnt)
 }), o.cbx === undefined ? null : el("span", {
  class: "cbx" + (o.cbx ? " on" : ""),
  html: ICONS.tick
 }) ].concat(o.tail || [], [ o.go ? chevron() : null ]).filter(Boolean);
 const attrs = {
  class: cls
 };
 if (o.onclick) {
  attrs.type = "button";
  attrs.onclick = o.onclick;
 }
 if (o.label) attrs["aria-label"] = o.label;
 if (o.pressed !== undefined) attrs["aria-pressed"] = o.pressed ? "true" : "false";
 return el(o.onclick ? "button" : "div", attrs, kids);
}

function optionRow(label, hint, on, onToggle) {
 return row({
  t1: label,
  t2: hint || null,
  cbx: !!on,
  pressed: !!on,
  onclick: onToggle
 });
}

function chipRow(opts, isOn, onPick, o) {
 const cfg = o || {};
 return el("div", {
  class: "wrap"
 }, opts.map(opt => {
  const [v, label, css] = opt;
  const on = isOn(v);
  const mark = css ? on ? "" : " off" : on ? cfg.one ? " pick" : " on" : " off";
  return el("button", {
   class: "chip" + mark,
   type: "button",
   "aria-pressed": on ? "true" : "false",
   onclick: () => onPick(v)
  }, [ css ? el("span", {
   class: "sw" + (cfg.line ? " ln" : ""),
   style: "--c:" + css
  }) : null, el("span", {
   text: label
  }) ].filter(Boolean));
 }));
}

function selectRow(caption, opts, cur, onPick) {
 const sel = el("select", {
  "aria-label": caption
 }, opts.map(([v, l]) => el("option", {
  value: String(v),
  text: l,
  selected: String(v) === String(cur) ? "" : null
 })));
 sel.addEventListener("change", () => onPick(sel.value));
 return labelled(caption, sel);
}

function sec(title, right, kids) {
 const h = title ? el("h2", {}, [ el("span", {
  text: title
 }) ]) : null;
 if (h && right) {
  h.appendChild(el("span", {
   class: "sp"
  }));
  h.appendChild(right);
 }
 return el("div", {
  class: "sec"
 }, (h ? [ h ] : []).concat(kids || []));
}

function kv(k, v, cls) {
 return el("div", {
  class: "kv"
 }, [ el("span", {
  class: "k",
  text: k
 }), el("span", {
  class: "v " + (cls || ""),
  text: v
 }) ]);
}

function segmented(opts, cur, onPick) {
 return el("div", {
  class: "segw"
 }, [ el("div", {
  class: "seg n" + opts.length
 }, opts.map(([v, l]) => el("button", {
  type: "button",
  text: l,
  "aria-pressed": cur === v ? "true" : "false",
  onclick: () => onPick(v)
 }))) ]);
}

const targetOf = k => S.targets[k] || {
 min: null,
 max: null
};

const goalNum = t => t.max ?? t.min ?? null;

function microBars(totals) {
 const box = el("div", {
  class: "meter"
 });
 MACROS.forEach(n => {
  const v = totals[n.k] || 0, t = targetOf(n.k), goal = goalNum(t);
  const axis = Math.max(goal ? goal * 1.25 : 0, v * 1.05, 1);
  const pc = x => clamp(x / axis * 100, 0, 100);
  box.appendChild(el("div", {
   class: "mrow"
  }, [ el("span", {
   class: "lb",
   text: n.short
  }), el("span", {
   class: "tr open"
  }, [ el("span", {
   class: "fl",
   style: `--w:${pc(v)}%;--c:${n.css}`
  }), goal ? el("span", {
   class: "gm",
   style: `--x:${pc(goal)}%`
  }) : null ]), el("span", {
   class: "n"
  }, [ el("b", {
   text: r0(v)
  }), document.createTextNode(goal ? " / " + r0(goal) : "") ]) ]));
 });
 return box;
}

function kcalSquare(totals, size) {
 const goal = goalNum(targetOf("kcal"));
 const v = totals.kcal || 0;
 const S0 = size || 66;
 const frac = goal ? v / goal : 0;
 const first = clamp(frac, 0, 1), over = clamp(frac - 1, 0, 1);
 const svg = svgEl("svg", {
  viewBox: `0 0 ${S0} ${S0}`,
  width: S0,
  height: S0,
  "aria-hidden": "true"
 });
 const box = (inset, len, color, sw, op) => {
  const a = inset, b = S0 - inset, per = 4 * (b - a);
  return svgEl("path", {
   d: `M ${S0 / 2},${a} H ${b} V ${b} H ${a} V ${a} Z`,
   fill: "none",
   stroke: color,
   "stroke-width": sw,
   "stroke-dasharray": `${(per * len).toFixed(2)} ${per.toFixed(2)}`,
   opacity: op === undefined ? 1 : op
  });
 };
 svg.appendChild(box(3, 1, "var(--alt)", 5));
 svg.appendChild(box(3, 1, "var(--line)", 1));
 if (goal) {
  if (first > 0) svg.appendChild(box(3, first, "var(--nut-k)", 5));
  if (over > 0) {
   svg.appendChild(box(9, 1, "var(--alt)", 3));
   svg.appendChild(box(9, over, "var(--ink2)", 3));
  }
 } else {
  svg.appendChild(box(3, 1, "var(--nut-k)", 5, .25));
 }
 const n = fmtE(v);
 return el("div", {
  class: "kring",
  style: `--w:${S0}px;--h:${S0}px`
 }, [ svg, el("div", {
  class: "kn"
 }, [ el("span", {
  class: "v" + (String(n).length > 4 ? " sm" : ""),
  text: n
 }), el("span", {
  class: "g",
  text: goal ? "/ " + fmtE(goal) : eUnit()
 }) ]) ]);
}

function kcalBar(totals, w, h, staged) {
 const goal = goalNum(targetOf("kcal"));
 const base = totals.kcal || 0;
 const add = Math.max(0, staged || 0);
 const v = base + add;
 const W = w || 150, H = h || 42;
 const first = goal ? clamp(base / goal, 0, 1) : 0;
 const upto = goal ? clamp(v / goal, 0, 1) : 0;
 const over = goal ? clamp(v / goal - 1, 0, 1) : 0;
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H,
  "aria-hidden": "true"
 });
 const box = (inset, len, color, sw, op, from) => {
  const x1 = inset, y1 = inset, x2 = W - inset, y2 = H - inset;
  const per = 2 * (x2 - x1 + (y2 - y1));
  const a = from || 0;
  return svgEl("path", {
   d: `M ${W / 2},${y1} H ${x2} V ${y2} H ${x1} V ${y1} Z`,
   fill: "none",
   stroke: color,
   "stroke-width": sw,
   "stroke-dasharray": `${(per * Math.max(0, len - a)).toFixed(2)} ${per.toFixed(2)}`,
   "stroke-dashoffset": (-per * a).toFixed(2),
   opacity: op === undefined ? 1 : op
  });
 };
 svg.appendChild(box(2.5, 1, "var(--alt)", 4));
 svg.appendChild(box(2.5, 1, "var(--line)", 1));
 if (goal) {
  if (upto > first) svg.appendChild(box(2.5, upto, "var(--nut-k)", 4, .4, first));
  if (first > 0) svg.appendChild(box(2.5, first, "var(--nut-k)", 4));
  if (over > 0) {
   svg.appendChild(box(7.5, 1, "var(--alt)", 2.5));
   svg.appendChild(box(7.5, over, "var(--ink2)", 2.5));
  }
 } else {
  svg.appendChild(box(2.5, 1, "var(--nut-k)", 4, .25));
 }
 return el("div", {
  class: "kring",
  style: `--w:${W}px;--h:${H}px`
 }, [ svg, el("div", {
  class: "kn"
 }, [ el("span", {
  class: "pair"
 }, [ el("span", {
  class: "v",
  text: fmtE(v)
 }), add ? el("span", {
  class: "g add",
  text: "+" + fmtE(add)
 }) : null, el("span", {
  class: "g",
  text: goal ? "/ " + fmtE(goal) : eUnit()
 }) ].filter(Boolean)) ]) ]);
}

function miniDots(flags, color) {
 return el("span", {
  class: "mdots"
 }, flags.map(on => el("span", {
  class: "d" + (on ? " on" : ""),
  style: on ? "--c:" + (color || "var(--interactive)") : null
 })));
}

function miniPair(rows) {
 const hi = Math.max(...rows.map(r => r.v), 1);
 return el("span", {
  class: "meter mid"
 }, rows.map(r => {
  const tail = r.tail && r.tail.v > 0 ? Math.min(r.tail.v, r.v) : 0;
  return el("span", {
   class: "mrow"
  }, [ el("span", {
   class: "lb",
   text: r.k
  }), el("span", {
   class: "tr"
  }, [ el("span", {
   class: "fl",
   style: `--w:${(r.v / hi * 100).toFixed(1)}%;--c:${r.css}`
  }), tail ? el("span", {
   class: "fl",
   style: `left:${((r.v - tail) / hi * 100).toFixed(1)}%;` + `--w:${(tail / hi * 100).toFixed(1)}%;--c:${r.tail.css}`
  }) : null ].filter(Boolean)) ]);
 }));
}

function rangeBar(nut, value, tgt) {
 const min = tgt && tgt.min ? tgt.min : null;
 const max = tgt && tgt.max ? tgt.max : null;
 const anchor = max || (min ? min * 1.4 : value) || 1;
 const axis = Math.max(value * 1.08, anchor * 1.25, (min || 0) * 1.35, 1);
 const pc = v => clamp(v / axis * 100, 0, 100);
 const bandL = min ? pc(min) : 0, bandR = max ? pc(max) : 100;
 const q = v => nut.k === "kcal" ? fmtE(v) : String(r0(v));
 return el("div", {
  class: "rb"
 }, [ el("div", {
  class: "hd"
 }, [ el("span", {
  text: nut.label
 }), el("span", {
  class: "vals"
 }, [ el("b", {
  text: q(value) + nut.unit
 }), el("span", {
  class: "muted",
  text: "  " + (min && max ? `${q(min)}–${q(max)}${nut.unit}` : min ? `floor ${q(min)}${nut.unit}` : max ? `ceiling ${q(max)}${nut.unit}` : "no target")
 }) ]) ]), el("div", {
  class: "tr"
 }, [ min || max ? el("span", {
  class: "band",
  style: `--x:${bandL}%;--w:${(bandR - bandL).toFixed(2)}%`
 }) : null, el("span", {
  class: "fill",
  style: `--w:${pc(value)}%;--c:${nut.css}`
 }), min ? el("span", {
  class: "tick",
  style: `--x:${pc(min)}%`
 }) : null, max ? el("span", {
  class: "tick",
  style: `--x:${pc(max)}%`
 }) : null ]), el("div", {
  class: "scale"
 }, [ el("span", {
  text: "0"
 }), el("span", {
  text: q(axis)
 }) ]) ]);
}

function nutBars(totals, keys) {
 const box = el("div", {});
 (keys || [ "kcal", "p", "c", "f" ]).forEach(k => {
  const n = NUTS.find(x => x.k === k);
  box.appendChild(rangeBar(n, totals[k] || 0, S.targets[k]));
 });
 return box;
}

const svgEl = (t, a = {}) => {
 const n = document.createElementNS("http://www.w3.org/2000/svg", t);
 for (const k in a) if (a[k] !== null && a[k] !== undefined && a[k] !== false) n.setAttribute(k, a[k]);
 return n;
};

function ticks(min, max, count) {
 if (!isFinite(min) || !isFinite(max)) return {
  lo: 0,
  hi: 1,
  t: [ 0, 1 ]
 };
 if (max - min < 1e-6) {
  min -= 1;
  max += 1;
 }
 const raw = (max - min) / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
 const step = [ 1, 2, 2.5, 5, 10 ].map(m => m * mag).find(s => s >= raw) || 10 * mag;
 const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
 const t = [];
 for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(6));
 return {
  lo: lo,
  hi: hi,
  t: t
 };
}

function xLabels(svg, days, x, W, H) {
 const step = Math.max(1, Math.ceil(days.length / (W < 400 ? 3 : 6)));
 for (let i = 0; i < days.length; i += step) {
  const t = svgEl("text", {
   class: "ax",
   x: x(i),
   y: H - 3,
   "text-anchor": i === 0 ? "start" : "middle"
  });
  t.textContent = fmtDate(days[i].d);
  svg.appendChild(t);
 }
}

function readoutStrip() {
 const n = el("div", {
  class: "readout off"
 }, [ el("span", {
  class: "d"
 }), el("span", {
  class: "v"
 }) ]);
 n.setText = (d, v) => {
  n.classList.remove("off");
  n.children[0].textContent = d;
  n.children[1].textContent = v;
 };
 n.clear = () => n.classList.add("off");
 return n;
}

let CHARTFOCUS = null;

function chartFocus(host, clear) {
 if (CHARTFOCUS && CHARTFOCUS.host !== host) CHARTFOCUS.clear();
 CHARTFOCUS = {
  host: host,
  clear: clear
 };
}

function chartBlur() {
 const c = CHARTFOCUS;
 CHARTFOCUS = null;
 if (c) c.clear();
}

(() => {
 let x = 0, y = 0, down = false;
 document.addEventListener("pointerdown", e => {
  down = true;
  x = e.clientX;
  y = e.clientY;
 }, true);
 document.addEventListener("pointerup", e => {
  if (!down) return;
  down = false;
  if (Math.abs(e.clientX - x) > 10 || Math.abs(e.clientY - y) > 10) return;
  const c = CHARTFOCUS;
  if (c && !(c.host.isConnected && c.host.contains(e.target))) chartBlur();
 }, true);
 document.addEventListener("pointercancel", () => {
  down = false;
 }, true);
})();

function scrubLayer(svg, days, W, PL, IW, H, onIndex, onClear) {
 const g = svgEl("g", {
  opacity: 0
 });
 const line = svgEl("line", {
  class: "xh",
  y1: 0,
  y2: H - 16
 });
 g.appendChild(line);
 svg.appendChild(g);
 const hit = svgEl("rect", {
  x: 0,
  y: 0,
  width: W,
  height: H,
  fill: "transparent",
  style: "cursor:crosshair"
 });
 svg.appendChild(hit);
 const idx = ev => {
  const r = svg.getBoundingClientRect();
  const cx = ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX;
  const px = (cx - r.left) * (W / r.width);
  return clamp(Math.round((px - PL) / IW * (days.length - 1)), 0, days.length - 1);
 };
 const show = i => {
  const xx = PL + (days.length <= 1 ? IW / 2 : i / (days.length - 1) * IW);
  g.setAttribute("opacity", 1);
  line.setAttribute("x1", xx);
  line.setAttribute("x2", xx);
  onIndex(i);
  chartFocus(svg.closest(".chart") || svg, () => {
   g.setAttribute("opacity", 0);
   if (onClear) onClear();
  });
 };
 const mv = e => {
  e.preventDefault();
  show(idx(e));
 };
 hit.addEventListener("mousedown", mv);
 hit.addEventListener("mousemove", e => {
  if (e.buttons) mv(e);
 });
 let tx = 0, ty = 0, axis = 0;
 hit.addEventListener("touchstart", e => {
  const t = e.touches[0];
  if (!t) return;
  tx = t.clientX;
  ty = t.clientY;
  axis = 0;
  show(idx(e));
 }, {
  passive: true
 });
 hit.addEventListener("touchmove", e => {
  const t = e.touches[0];
  if (!t) return;
  if (!axis) {
   const dx = Math.abs(t.clientX - tx), dy = Math.abs(t.clientY - ty);
   if (dx < 7 && dy < 7) return;
   axis = dx > dy ? 1 : 2;
  }
  if (axis !== 1) return;
  e.preventDefault();
  show(idx(e));
 }, {
  passive: false
 });
 return show;
}

function innerTicks(lo, hi, count) {
 const span = hi - lo;
 if (!isFinite(span) || span <= 0) return [ lo ];
 const raw = span / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
 const step = [ 1, 2, 2.5, 5, 10 ].map(m => m * mag).find(s => s >= raw) || 10 * mag;
 const out = [];
 for (let v = Math.ceil(lo / step) * step; v <= hi + step / 1e6; v += step) out.push(+v.toFixed(6));
 return out.length ? out : [ lo, hi ];
}

function weightGraph(series, span, offset, opts) {
 const o = opts || {};
 const host = el("div", {
  class: "chart"
 });
 const strip = readoutStrip();
 const foot = el("div", {
  class: "small muted graphfoot"
 });
 const total = series.length;
 const n = Math.max(2, Math.min(span, total));
 let off = clamp(offset, 0, Math.max(0, total - n));
 let zoom = clamp(o.zoom || 1, .5, 4);
 const W = Math.max(280, o.width || 340), PL = 36, PR = 8, PT = 26, PB = 18;
 const IW = W - PL - PR, per = IW / (n - 1);
 const H1 = Math.max(120, Math.round(o.plotH || 180)), H = PT + H1 + PB;
 const CID = "wclip" + Math.random().toString(36).slice(2, 8);
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H,
  role: "img"
 });
 const defs = svgEl("defs");
 const clip = svgEl("clipPath", {
  id: CID
 });
 clip.appendChild(svgEl("rect", {
  x: PL - 1,
  y: PT - 8,
  width: IW + 2,
  height: H1 + 16
 }));
 defs.appendChild(clip);
 svg.appendChild(defs);
 const gGrid = svgEl("g"), gData = svgEl("g", {
  "clip-path": `url(#${CID})`
 }), gX = svgEl("g");
 const xh = svgEl("line", {
  class: "xh",
  opacity: 0,
  y1: PT - 4,
  y2: PT + H1
 });
 const cur = svgEl("circle", {
  r: 5,
  fill: "var(--ser-weight)",
  opacity: 0
 });
 const hit = svgEl("rect", {
  x: 0,
  y: 0,
  width: W,
  height: H,
  fill: "transparent"
 });
 [ gGrid, gData, gX, xh, cur, hit ].forEach(nd => svg.appendChild(nd));
 let lo = 0, hi = 1;
 const xOf = i => PL + (i - off) * per;
 const yOf = kg => PT + H1 - (kgToDisp(kg) - lo) / (hi - lo) * H1;
 const first = () => Math.max(0, Math.floor(off) - 1);
 const last = () => Math.min(total - 1, Math.ceil(off + n) + 1);
 const describe = () => {
  const got = [];
  for (let i = Math.ceil(off); i <= Math.min(total - 1, Math.floor(off + n - 1)); i++) if (series[i].w !== null) got.push(series[i]);
  const a = series[clamp(Math.round(off), 0, total - 1)], b = series[clamp(Math.round(off + n - 1), 0, total - 1)];
  svg.setAttribute("aria-label", got.length ? `Scale weight, ${a.label} to ${b.label}: ${got.length} readings from ` + `${fmtW(Math.min(...got.map(d => d.w)))} to ${fmtW(Math.max(...got.map(d => d.w)))} ${wUnit()}` : "Scale weight: no readings in this window");
 };
 const draw = () => {
  gGrid.innerHTML = "";
  gData.innerHTML = "";
  gX.innerHTML = "";
  const vals = [];
  for (let i = Math.max(0, Math.floor(off)); i <= Math.min(total - 1, Math.ceil(off + n - 1)); i++) {
   const d = series[i];
   if (d.w !== null) vals.push(kgToDisp(d.w));
   if (d.med !== null) vals.push(kgToDisp(d.med));
  }
  if (!vals.length) {
   describe();
   foot.textContent = "No weigh-ins in this window.";
   cur.setAttribute("opacity", 0);
   xh.setAttribute("opacity", 0);
   return;
  }
  let a = Math.min(...vals), b = Math.max(...vals);
  const mid = (a + b) / 2, half = Math.max((b - a) / 2, .4) * 1.12 / zoom;
  lo = mid - half;
  hi = mid + half;
  innerTicks(lo, hi, clamp(Math.round(H1 / 70), 3, 8)).forEach(t => {
   const yy = PT + H1 - (t - lo) / (hi - lo) * H1;
   gGrid.appendChild(svgEl("line", {
    class: "gl",
    x1: PL,
    x2: W - PR,
    y1: yy,
    y2: yy
   }));
   const lb = svgEl("text", {
    class: "ax",
    x: PL - 5,
    y: yy + 3.5,
    "text-anchor": "end"
   });
   lb.textContent = (+t).toFixed(hi - lo < 12 ? 1 : 0);
   gGrid.appendChild(lb);
  });
  const i0 = first(), i1 = last();
  let raw = "";
  for (let i = i0; i <= i1; i++) {
   const d = series[i];
   if (d.w === null) continue;
   raw += (raw ? "L" : "M") + xOf(i).toFixed(1) + "," + yOf(d.w).toFixed(1);
  }
  if (raw) gData.appendChild(svgEl("path", {
   class: "raw",
   d: raw
  }));
  let dd = "";
  for (let i = i0; i <= i1; i++) {
   const d = series[i];
   if (d.med === null) continue;
   dd += (dd ? "L" : "M") + xOf(i).toFixed(1) + "," + yOf(d.med).toFixed(1);
  }
  if (dd) gData.appendChild(svgEl("path", {
   class: "ser",
   d: dd
  }));
  if (n <= 30) {
   const dotR = n <= 12 ? 3.6 : 2.8;
   for (let i = i0; i <= i1; i++) {
    const d = series[i];
    if (d.w === null) continue;
    gData.appendChild(svgEl("circle", {
     class: "dotm",
     cx: xOf(i).toFixed(1),
     cy: yOf(d.w).toFixed(1),
     r: dotR
    }));
   }
  }
  const step = Math.max(1, Math.ceil(n / (W < 400 ? 4 : 7)));
  const start = Math.ceil(off / step) * step;
  for (let i = start; i <= i1; i += step) {
   const x = xOf(i);
   if (x < PL - 2 || x > W - PR + 2) continue;
   const t = svgEl("text", {
    class: "ax",
    x: x.toFixed(1),
    y: H - 3,
    "text-anchor": "middle"
   });
   t.textContent = series[i].label;
   gX.appendChild(t);
  }
  cur.setAttribute("opacity", 0);
  xh.setAttribute("opacity", 0);
  describe();
  const s0 = series[clamp(Math.round(off), 0, total - 1)], s1 = series[clamp(Math.round(off + n - 1), 0, total - 1)];
  foot.textContent = total > n ? s0.label + " – " + s1.label : "";
 };
 const readAt = i => {
  const k = clamp(Math.round(i), 0, total - 1), d = series[k];
  xh.setAttribute("opacity", 1);
  xh.setAttribute("x1", xOf(k));
  xh.setAttribute("x2", xOf(k));
  if (d.w !== null) {
   cur.setAttribute("cx", xOf(k));
   cur.setAttribute("cy", yOf(d.w));
   cur.setAttribute("opacity", 1);
  } else cur.setAttribute("opacity", 0);
  strip.setText(o.scale === "day" ? fmtDate(d.key, true) : d.label, d.w !== null ? fmtW(d.w) + " " + wUnit() + (d.n > 1 ? "  " + basisWord() + " of " + d.n : "") : "no weigh-in");
  if (o.onPick && o.scale === "day") o.onPick(d.key);
  chartFocus(host, () => {
   cur.setAttribute("opacity", 0);
   xh.setAttribute("opacity", 0);
   strip.clear();
  });
 };
 let sx = 0, sy = 0, sOff = 0, moved = false, dragging = false, raf = 0, axis = 0;
 hit.addEventListener("pointerdown", ev => {
  dragging = true;
  moved = false;
  axis = 0;
  sx = ev.clientX;
  sy = ev.clientY;
  sOff = off;
 });
 hit.addEventListener("pointermove", ev => {
  if (!dragging || n >= total) return;
  if (!axis) {
   const ax = Math.abs(ev.clientX - sx), ay = Math.abs(ev.clientY - sy);
   if (ax < 7 && ay < 7) return;
   axis = ax > ay ? 1 : 2;
   if (axis === 1) {
    moved = true;
    try {
     hit.setPointerCapture(ev.pointerId);
    } catch (e) {}
   }
  }
  if (axis !== 1) {
   dragging = false;
   return;
  }
  const rect = svg.getBoundingClientRect();
  const dxPx = (ev.clientX - sx) * (W / (rect.width || W));
  ev.preventDefault();
  const want = clamp(sOff - dxPx / per, 0, total - n);
  if (want !== off) {
   off = want;
   if (o.onOffset) o.onOffset(off);
   if (!raf) raf = requestAnimationFrame(() => {
    raf = 0;
    draw();
   });
  }
 });
 const finish = ev => {
  if (!dragging) return;
  dragging = false;
  if (!moved) {
   const rect = svg.getBoundingClientRect();
   const px = (ev.clientX - rect.left) * (W / (rect.width || W));
   readAt((px - PL) / per + off);
  }
 };
 hit.addEventListener("pointerup", finish);
 hit.addEventListener("pointercancel", () => {
  dragging = false;
 });
 draw();
 host.appendChild(svg);
 host.appendChild(strip);
 host.appendChild(foot);
 host.redraw = draw;
 host.setZoom = z => {
  zoom = clamp(z, .5, 4);
  draw();
 };
 return host;
}

function intakeChart(days, width, onPick) {
 const wrap = el("div", {
  class: "chart"
 });
 const strip = readoutStrip();
 const W = Math.max(280, width), PL = 34, PR = 8, PT = 30, PB = 18;
 const H1 = 104, H = PT + H1 + PB, IW = W - PL - PR;
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H,
  role: "img"
 });
 svg.setAttribute("aria-label", "Energy logged each day");
 const n = days.length, x = i => PL + (n <= 1 ? IW / 2 : i / (n - 1) * IW);
 const tg = S.targets.kcal;
 const hi = Math.max(...days.map(d => d.kcal || 0), tg.max || 0, tg.min || 0, 100) * 1.08;
 const y = v => PT + H1 - v / hi * H1;
 svg.appendChild(svgEl("line", {
  class: "gl",
  x1: PL,
  x2: W - PR,
  y1: PT + H1,
  y2: PT + H1
 }));
 [ 0, hi ].forEach((v, i) => {
  const lb = svgEl("text", {
   class: "ax",
   x: PL - 5,
   y: y(v) + (i ? 8 : 3.5),
   "text-anchor": "end"
  });
  lb.textContent = fmtE(v);
  svg.appendChild(lb);
 });
 const bw = Math.max(1.5, Math.min(12, IW / Math.max(n, 1) - 2));
 const bars = [];
 days.forEach((d, i) => {
  if (!d.kcal) {
   bars.push(null);
   return;
  }
  const h = Math.max(1.5, PT + H1 - y(d.kcal));
  const r = svgEl("rect", {
   class: "bar",
   x: x(i) - bw / 2,
   y: PT + H1 - h,
   width: bw,
   height: h
  });
  svg.appendChild(r);
  bars.push(r);
 });
 [ [ "floor", tg.min ], [ "ceiling", tg.max ] ].forEach(([lbl, v]) => {
  if (!v) return;
  svg.appendChild(svgEl("line", {
   class: "gline",
   x1: PL,
   x2: W - PR,
   y1: y(v),
   y2: y(v)
  }));
  const t = svgEl("text", {
   class: "ax",
   x: W - PR,
   y: y(v) - 3,
   "text-anchor": "end"
  });
  t.textContent = lbl;
  svg.appendChild(t);
 });
 xLabels(svg, days, x, W, H);
 scrubLayer(svg, days, W, PL, IW, H, i => {
  bars.forEach((b, j) => b && b.classList.toggle("hi", j === i));
  const d = days[i];
  strip.setText(fmtDate(d.d, true), d.kcal ? fmtEU(d.kcal) : "not logged");
  if (onPick) onPick(d.d);
 }, () => {
  bars.forEach(b => b && b.classList.remove("hi"));
  strip.clear();
 });
 wrap.appendChild(svg);
 wrap.appendChild(strip);
 return wrap;
}

function energyChart(rows, width, opts) {
 const o = opts || {};
 const show = o.show || {
  intake: true,
  tdee: true,
  ride: true
 };
 const zoom = clamp(o.zoom || 1, .6, 3);
 const wrap = el("div", {
  class: "chart"
 });
 const strip = readoutStrip();
 const W = Math.max(280, width), PL = 40, PR = 8, PT = 30, PB = 18;
 const H1 = Math.max(110, Math.round(o.plotH || 180)), H = PT + H1 + PB, IW = W - PL - PR;
 const CID = "eclip" + Math.random().toString(36).slice(2, 8);
 const HID = "ehatch" + Math.random().toString(36).slice(2, 8);
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H,
  role: "img"
 });
 const defs = svgEl("defs"), clip = svgEl("clipPath", {
  id: CID
 });
 clip.appendChild(svgEl("rect", {
  x: PL - 1,
  y: PT - 6,
  width: IW + 2,
  height: H1 + 8
 }));
 defs.appendChild(clip);
 const hatch = svgEl("pattern", {
  id: HID,
  width: 6,
  height: 6,
  patternUnits: "userSpaceOnUse",
  patternTransform: "rotate(45)"
 });
 hatch.appendChild(svgEl("line", {
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 6,
  stroke: "var(--ser-ride)",
  "stroke-width": 1.4,
  opacity: .4
 }));
 defs.appendChild(hatch);
 svg.appendChild(defs);
 const plot = svgEl("g", {
  "clip-path": `url(#${CID})`
 });
 const n = rows.length, x = i => PL + (n <= 1 ? IW / 2 : i / (n - 1) * IW);
 const pool = poolSpread(rows.map(r => r.ride || 0));
 const vals = [];
 rows.forEach((r, i) => {
  if (show.intake) vals.push(r.intake);
  if (show.tdee && r.tdee !== null) vals.push(r.tdee + (show.ride ? pool[i] : 0));
  if (show.kf && r.kf !== null) vals.push(r.kf);
  if (show.mf && r.mf !== null) vals.push(r.mf);
 });
 const hi = Math.max(...vals, 100) * 1.1 / zoom;
 const y = v => PT + H1 - v / hi * H1;
 innerTicks(0, eDisp(hi), clamp(Math.round(H1 / 70), 3, 8)).forEach(td => {
  const t = eFromDisp(td);
  svg.appendChild(svgEl("line", {
   class: "gl",
   x1: PL,
   x2: W - PR,
   y1: y(t),
   y2: y(t)
  }));
  const lb = svgEl("text", {
   class: "ax",
   x: PL - 5,
   y: y(t) + 3.5,
   "text-anchor": "end"
  });
  lb.textContent = r0(td);
  svg.appendChild(lb);
 });
 svg.appendChild(plot);
 const bw = Math.max(1.5, Math.min(14, IW / Math.max(n, 1) - 2));
 const bars = [];
 rows.forEach((r, i) => {
  if (!show.intake || !r.intake) {
   bars.push(null);
   return;
  }
  const h = Math.max(1.5, PT + H1 - y(r.intake));
  const b = svgEl("rect", {
   x: x(i) - bw / 2,
   y: PT + H1 - h,
   width: bw,
   height: h,
   fill: "var(--ser-intake)",
   opacity: .85
  });
  plot.appendChild(b);
  bars.push(b);
 });
 if (show.tdee) {
  let d = "";
  rows.forEach((r, i) => {
   if (r.tdee === null) return;
   d += (d ? "L" : "M") + x(i).toFixed(1) + "," + y(r.tdee).toFixed(1);
  });
  if (d) plot.appendChild(svgEl("path", {
   class: "ser tdee",
   d: d
  }));
 }
 if (show.kf) {
  let d = "", open = false;
  rows.forEach((r, i) => {
   if (r.kf === null) {
    open = false;
    return;
   }
   d += (open ? "L" : "M") + x(i).toFixed(1) + "," + y(r.kf).toFixed(1);
   open = true;
  });
  if (d) plot.appendChild(svgEl("path", {
   d: d,
   fill: "none",
   stroke: "var(--ser-adaptive)",
   "stroke-width": 2,
   "stroke-dasharray": "5 3",
   "stroke-linejoin": "round",
   "stroke-linecap": "round"
  }));
 }
 if (show.mf) {
  let d = "", open = false;
  rows.forEach((r, i) => {
   if (r.mf === null || r.mf === undefined) {
    open = false;
    return;
   }
   d += (open ? "L" : "M") + x(i).toFixed(1) + "," + y(r.mf).toFixed(1);
   open = true;
  });
  if (d) plot.appendChild(svgEl("path", {
   d: d,
   fill: "none",
   stroke: "var(--ink2)",
   "stroke-width": 1.6,
   "stroke-dasharray": "2 3",
   "stroke-linejoin": "round"
  }));
 }
 if (show.ride && show.tdee) {
  const usable = i => i >= 0 && i < n && rows[i].tdee !== null;
  let i = 0;
  while (i < n) {
   if (!(pool[i] > .5) || !usable(i)) {
    i++;
    continue;
   }
   let j = i;
   while (j + 1 < n && pool[j + 1] > .5 && usable(j + 1)) j++;
   const a = usable(i - 1) ? i - 1 : i, b = usable(j + 1) ? j + 1 : j;
   let d = "";
   for (let k = a; k <= b; k++) {
    const v = rows[k].tdee + (k >= i && k <= j ? pool[k] : 0);
    d += (d ? "L" : "M") + x(k).toFixed(1) + "," + y(v).toFixed(1);
   }
   let area = "";
   for (let k = i; k <= j; k++) area += (area ? "L" : "M") + x(k).toFixed(1) + "," + y(rows[k].tdee + pool[k]).toFixed(1);
   for (let k = j; k >= i; k--) area += "L" + x(k).toFixed(1) + "," + y(rows[k].tdee).toFixed(1);
   plot.appendChild(svgEl("path", {
    d: area + "Z",
    fill: `url(#${HID})`,
    stroke: "none"
   }));
   plot.appendChild(svgEl("path", {
    d: d,
    fill: "none",
    stroke: "var(--ser-ride)",
    "stroke-width": 2,
    "stroke-linejoin": "round",
    "stroke-linecap": "round"
   }));
   i = j + 1;
  }
 }
 const step = Math.max(1, Math.ceil(n / (W < 400 ? 4 : 7)));
 for (let i = 0; i < n; i += step) {
  const t = svgEl("text", {
   class: "ax",
   x: x(i),
   y: H - 3,
   "text-anchor": i === 0 ? "start" : "middle"
  });
  t.textContent = fmtDate(rows[i].d);
  svg.appendChild(t);
 }
 svg.setAttribute("aria-label", "Energy in against energy out, " + (n ? fmtDate(rows[0].d) + " to " + fmtDate(rows[n - 1].d) : "no days"));
 scrubLayer(svg, rows.map(r => ({
  d: r.d
 })), W, PL, IW, H, i => {
  bars.forEach((b, j) => b && b.setAttribute("opacity", j === i ? 1 : .45));
  const r = rows[i];
  const bits = [];
  if (r.intake) bits.push(fmtE(r.intake) + " in");
  if (r.tdee !== null) bits.push(fmtE(r.tdee) + " out");
  if (show.kf && r.kf !== null) bits.push(fmtE(r.kf) + " adaptive");
  if (show.mf && r.mf) bits.push(fmtE(r.mf) + " imported");
  if (r.ride) bits.push(fmtE(r.ride) + " " + cardioWords().did);
  if (pool[i] > .5) bits.push("+" + fmtE(pool[i]) + " pooled");
  strip.setText(fmtDate(r.d, true), bits.length ? bits.join("  ·  ") : "nothing logged");
  if (o.onPick) o.onPick(r.d);
 }, () => {
  bars.forEach(b => b && b.removeAttribute("opacity"));
  strip.clear();
 });
 wrap.appendChild(svg);
 wrap.appendChild(strip);
 return wrap;
}

function progSquare(frac, size, label) {
 const S0 = size || 72, f = clamp(+frac || 0, 0, 1);
 const wrap = el("span", {
  class: "kring",
  style: `width:${S0}px;height:${S0}px`
 });
 const svg = svgEl("svg", {
  viewBox: `0 0 ${S0} ${S0}`,
  width: S0,
  height: S0
 });
 const box = (inset, len, color, sw) => {
  const a = inset, b = S0 - inset, per = 4 * (b - a);
  return svgEl("path", {
   d: `M ${S0 / 2},${a} H ${b} V ${b} H ${a} V ${a} Z`,
   fill: "none",
   stroke: color,
   "stroke-width": sw,
   "stroke-dasharray": `${(per * len).toFixed(2)} ${per.toFixed(2)}`
  });
 };
 svg.appendChild(box(3, 1, "var(--alt)", 5));
 svg.appendChild(box(3, 1, "var(--line)", 1));
 if (f > 0) svg.appendChild(box(3, f, "var(--progress)", 5));
 wrap.appendChild(svg);
 wrap.appendChild(el("span", {
  class: "kn"
 }, [ el("span", {
  class: "v",
  style: "font-size:" + Math.round(S0 * .24) + "px",
  text: label === undefined ? r0(f * 100) + "%" : label
 }) ]));
 return wrap;
}

function simpleBars(items, width, height, colorVar, fmt) {
 const W = Math.max(260, width), PL = 32, PR = 8, PT = 6, PB = 16;
 const H1 = height || 86, H = PT + H1 + PB, IW = W - PL - PR;
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H
 });
 const n = items.length, x = i => PL + (n <= 1 ? IW / 2 : i / Math.max(n - 1, 1) * IW);
 const hi = Math.max(...items.map(i => i.v), 1) * 1.1;
 const y = v => PT + H1 - v / hi * H1;
 svg.appendChild(svgEl("line", {
  class: "gl",
  x1: PL,
  x2: W - PR,
  y1: PT + H1,
  y2: PT + H1
 }));
 const t0 = svgEl("text", {
  class: "ax",
  x: PL - 5,
  y: PT + 4,
  "text-anchor": "end"
 });
 t0.textContent = fmt ? fmt(hi) : r0(hi);
 svg.appendChild(t0);
 const bw = Math.max(2, Math.min(18, IW / Math.max(n, 1) - 3));
 items.forEach((it, i) => {
  if (!it.v) return;
  const h = Math.max(1.5, PT + H1 - y(it.v));
  svg.appendChild(svgEl("rect", {
   x: x(i) - bw / 2,
   y: PT + H1 - h,
   width: bw,
   height: h,
   fill: colorVar || "var(--interactive)"
  }));
 });
 const step = Math.max(1, Math.ceil(n / 4));
 for (let i = 0; i < n; i += step) {
  const t = svgEl("text", {
   class: "ax",
   x: x(i),
   y: H - 3,
   "text-anchor": i === 0 ? "start" : "middle"
  });
  t.textContent = items[i].label || fmtDate(items[i].d);
  svg.appendChild(t);
 }
 return el("div", {
  class: "chart"
 }, [ svg ]);
}

function sparkLine(values, color) {
 const vals = values.filter(v => v !== null && v !== undefined && isFinite(v));
 if (vals.length < 2) return null;
 const W = 100, H = 30, lo = Math.min(...vals), hi = Math.max(...vals), rng = hi - lo || 1;
 const svg = svgEl("svg", {
  class: "spark",
  viewBox: `0 0 ${W} ${H}`,
  preserveAspectRatio: "none",
  "aria-hidden": "true"
 });
 let d = "", k = 0;
 values.forEach((v, i) => {
  if (v === null || v === undefined || !isFinite(v)) return;
  const x = i / Math.max(values.length - 1, 1) * W, y = H - 2 - (v - lo) / rng * (H - 4);
  d += k++ ? `L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
 });
 svg.appendChild(svgEl("path", {
  d: d,
  fill: "none",
  stroke: color || "var(--interactive)",
  "stroke-width": 1.6,
  "vector-effect": "non-scaling-stroke",
  "stroke-linejoin": "round"
 }));
 return svg;
}

function sparkBars(values, color) {
 if (!values.length) return null;
 const W = 100, H = 30, hi = Math.max(...values, 1);
 const svg = svgEl("svg", {
  class: "spark",
  viewBox: `0 0 ${W} ${H}`,
  preserveAspectRatio: "none",
  "aria-hidden": "true"
 });
 const bw = W / values.length;
 values.forEach((v, i) => {
  if (!v) return;
  const h = Math.max(1, v / hi * (H - 2));
  svg.appendChild(svgEl("rect", {
   x: i * bw + bw * .15,
   y: H - h,
   width: bw * .7,
   height: h,
   fill: color || "var(--line2)"
  }));
 });
 return svg;
}

function stackBars(rows, width, height) {
 const W = Math.max(240, width), H1 = height || 76, PB = 14, H = H1 + PB;
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H,
  "aria-hidden": "true"
 });
 const n = rows.length, slot = W / Math.max(n, 1);
 const bw = Math.min(26, slot * .62);
 const hi = Math.max(...rows.map(r => r.parts.reduce((s, p) => s + p.v, 0)), 1);
 rows.forEach((r, i) => {
  const cx = slot * (i + .5);
  let base = H1;
  r.parts.forEach(p => {
   if (!p.v) return;
   const h = p.v / hi * (H1 - 2);
   base -= h;
   svg.appendChild(svgEl("rect", {
    x: cx - bw / 2,
    y: base,
    width: bw,
    height: h,
    fill: p.css
   }));
  });
  if (base === H1) svg.appendChild(svgEl("rect", {
   x: cx - bw / 2,
   y: H1 - 1.5,
   width: bw,
   height: 1.5,
   fill: "var(--line)"
  }));
  const t = svgEl("text", {
   class: "ax",
   x: cx,
   y: H - 2,
   "text-anchor": "middle"
  });
  t.textContent = r.label;
  svg.appendChild(t);
 });
 return el("div", {
  class: "chart"
 }, [ svg ]);
}

function weekLine(values, width, height, color) {
 const got = values.filter(v => v !== null && v !== undefined && isFinite(v));
 if (got.length < 1) return null;
 const W = Math.max(240, width), H1 = height || 62, PB = 14, H = H1 + PB;
 const lo = Math.min(...got), hi = Math.max(...got), rng = hi - lo || 1;
 const svg = svgEl("svg", {
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H,
  "aria-hidden": "true"
 });
 const n = values.length, slot = W / Math.max(n, 1);
 const x = i => slot * (i + .5);
 const y = v => 6 + (1 - (v - lo) / rng) * (H1 - 12);
 let d = "";
 values.forEach((v, i) => {
  if (v === null || !isFinite(v)) return;
  d += (d ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1);
 });
 if (d) svg.appendChild(svgEl("path", {
  d: d,
  fill: "none",
  stroke: color || "var(--interactive)",
  "stroke-width": 2,
  "stroke-linejoin": "round",
  "stroke-linecap": "round"
 }));
 values.forEach((v, i) => {
  if (v === null || !isFinite(v)) return;
  svg.appendChild(svgEl("circle", {
   cx: x(i),
   cy: y(v),
   r: 3,
   fill: color || "var(--interactive)"
  }));
 });
 return el("div", {
  class: "chart"
 }, [ svg ]);
}

function legend(items) {
 return el("div", {
  class: "legend"
 }, items.map(([cls, color, text]) => el("i", {}, [ el("span", {
  class: "sw " + cls,
  style: "--c:" + color
 }), document.createTextNode(text) ])));
}
