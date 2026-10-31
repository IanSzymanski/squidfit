let SETGROUP = null;

let LOOKOPEN = false;

let LOOKPREV = null;

let EDIT = null;

let EDITSW = null, EDITSW0 = "";

function themeShownMode(t) {
 const now = document.documentElement.getAttribute("data-scheme") === "dark" ? "dark" : "light";
 return themePin(t) || (t.modes[now] ? now : t.modes.light ? "light" : "dark");
}

function swatchStrip(m, cls) {
 return el("span", {
  class: "swstrip" + (cls ? " " + cls : "")
 }, SWATCHES.filter(x => x.kind === "hue").map(x => el("i", {
  style: "background:" + (m && m[x.k] || "transparent")
 })));
}

function themeSpecimen(mini) {
 const mrow = (lb, w, role, sw, n) => el("div", {
  class: "mrow",
  "data-sw": sw
 }, [ el("span", {
  class: "lb",
  text: lb
 }), el("span", {
  class: "tr"
 }, [ el("span", {
  class: "fl",
  style: "--w:" + w + "%;--c:var(--" + role + ")"
 }) ]), n ? el("span", {
  class: "n",
  html: n
 }) : null ]);
 const macros = el("div", {
  class: "meter"
 }, [ mrow("P", 74, "nut-p", "crimson", mini ? null : "<b>142</b> / 175"), mrow("C", 86, "nut-c", "forest", mini ? null : "<b>195</b> / 200"), mrow("F", 80, "nut-f", "amber", mini ? null : "<b>63</b> / 70") ]);
 const marks = (cls, roles) => el("div", {
  class: "mks" + (cls ? " " + cls : "")
 }, roles.map(([role, sw]) => el("i", {
  "data-sw": sw,
  style: "background:var(--" + role + ")"
 })));
 const PLAN = [ [ "cat-1", "blue" ], [ "cat-2", "green" ], [ "cat-3", "amber" ], [ "cat-4", "violet" ], [ "cat-5", "teal" ], [ "cat-6", "orange" ], [ "cat-7", "plum" ], [ "cat-8", "forest" ], [ "cat-9", "red" ], [ "cat-10", "slate" ] ];
 const PARTS_M = [ [ "part-chest", "crimson" ], [ "part-fdelts", "amber" ], [ "part-sdelts", "amber" ], [ "part-rdelts", "amber" ], [ "part-triceps", "violet" ], [ "part-lats", "blue" ], [ "part-midback", "blue" ], [ "part-traps", "forest" ], [ "part-biceps", "teal" ], [ "part-forearms", "plum" ], [ "part-quads", "green" ], [ "part-hams", "lime" ], [ "part-glutes", "orange" ], [ "part-calves", "slate" ], [ "part-core", "ink2" ] ];
 if (mini) return el("div", {
  class: "spec mini bar"
 }, [ mini === true ? el("span", {
  class: "btn sm sample",
  text: "Planned"
 }) : mini, marks("grow", PLAN) ]);
 const W = 280, H = 66;
 const bars = [ 30, 44, 38, 52, 47, 58, 41, 49, 55, 62, 51, 57 ];
 const line = bars.map((v, i) => [ 12 + i * ((W - 20) / 11), H - 10 - v * .62 - 6 ]);
 const chart = svgEl("svg", {
  viewBox: "0 0 " + W + " " + H,
  class: "specchart",
  "aria-hidden": "true"
 });
 bars.forEach((v, i) => {
  const r = svgEl("rect", {
   x: 8 + i * ((W - 20) / 11),
   y: H - 10 - v * .7,
   width: 12,
   height: v * .7
  });
  r.setAttribute("fill", "var(--ser-intake)");
  r.setAttribute("data-sw", "blue");
  chart.appendChild(r);
 });
 const pl = svgEl("polyline", {
  points: line.map(p => p.join(",")).join(" "),
  fill: "none",
  "stroke-width": "1.6"
 });
 pl.setAttribute("stroke", "var(--ser-weight)");
 pl.setAttribute("data-sw", "green");
 chart.appendChild(pl);
 const base = svgEl("line", {
  x1: 4,
  y1: H - 9,
  x2: W - 4,
  y2: H - 9,
  "stroke-width": "1"
 });
 base.setAttribute("stroke", "var(--line2)");
 base.setAttribute("data-sw", "line2");
 chart.appendChild(base);
 const cell = (dn, cls, mk) => el("div", {
  class: "cell" + (cls ? " " + cls : "")
 }, [ el("span", {
  class: "dn",
  text: String(dn)
 }), el("span", {
  class: "marks"
 }, mk ? [ el("span", {
  class: "m w",
  "data-sw": "green"
 }) ] : []) ]);
 const cal = el("div", {
  class: "cal"
 }, [ cell(14, "", true), cell(15, "", true), cell(16, "sel", false), cell(17, "today", true), cell(18, "", false), cell(19, "", true), cell(20, "out", false) ]);
 const foodRow = row({
  t1: "Chicken thigh, grilled",
  t2: "180 g · 1 serving",
  val: fmtEU(342)
 });
 foodRow.querySelector(".t1").setAttribute("data-sw", "ink");
 foodRow.querySelector(".t2").setAttribute("data-sw", "ink3");
 foodRow.querySelector(".val").setAttribute("data-sw", "ink2");
 return el("div", {
  class: "spec stack"
 }, [ el("div", {
  class: "box rows"
 }, [ foodRow ]), el("div", {
  class: "box pad stack tight"
 }, [ macros, marks(null, PLAN), marks("sq", PARTS_M) ]), el("div", {
  class: "box pad"
 }, [ chart ]), el("div", {
  class: "box pad"
 }, [ cal ]), el("div", {
  class: "box pad stack tight"
 }, [ el("div", {
  class: "wrap"
 }, [ el("span", {
  class: "chip on",
  "data-sw": "green",
  text: "Logged"
 }), el("span", {
  class: "chip",
  text: "Planned"
 }), el("span", {
  class: "chip ai",
  "data-sw": "blue",
  text: "Described"
 }) ]), el("div", {
  class: "bar"
 }, [ el("span", {
  class: "btn pri sample",
  "data-sw": "green",
  text: "Save"
 }), el("span", {
  class: "btn sample",
  text: "Cancel"
 }), el("span", {
  class: "btn bad sample",
  "data-sw": "red",
  text: "Delete"
 }) ]) ]) ]);
}

function specimenFlags(node, findings) {
 const by = {};
 findings.forEach(f => {
  (by[f.swatch] = by[f.swatch] || []).push(f);
 });
 Object.keys(by).forEach(sw => {
  const hit = node.querySelector('[data-sw="' + sw + '"]');
  const label = by[sw].map(f => f.affects + " " + f.detail).join("; ");
  if (hit && hit.namespaceURI && hit.namespaceURI.indexOf("svg") > -1) {
   hit.setAttribute("data-flag", label);
   return;
  }
  const host = hit ? hit.closest(".mrow, .chip, .btn, .row, .cell, .mks") || hit : node;
  host.appendChild(el("i", {
   class: "warnmk",
   title: label,
   "aria-label": label,
   text: "!"
  }));
 });
 return node;
}

function themeCard(t, live) {
 const mode = themeShownMode(t);
 const on = t.id === live;
 const pin = themePin(t);
 const preview = el("button", {
  class: "btn sm",
  type: "button",
  text: "Preview",
  "aria-label": "Preview " + t.name,
  onclick: e => {
   e.stopPropagation();
   LOOKPREV = t;
   go("themeprev");
  }
 });
 return el("div", {
  class: "themecard" + (on ? " on" : ""),
  style: themeVars(t, mode),
  role: "button",
  tabindex: "0",
  "aria-pressed": on ? "true" : "false",
  "aria-label": t.name + (pin ? ", " + pin + " only" : ""),
  onclick: () => pickTheme(t.id),
  onkeydown: e => {
   if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    pickTheme(t.id);
   }
  }
 }, [ el("span", {
  class: "bar"
 }, [ el("span", {
  class: "grow hd",
  text: t.name
 }), pin ? el("span", {
  class: "small muted",
  text: pin === "dark" ? "Dark only" : "Light only"
 }) : null ]), swatchStrip(t.modes[mode]), themeSpecimen(preview) ]);
}

function paintVars(t, mode) {
 const st = document.documentElement.style, keys = [];
 themeVars(t, mode).split(";").forEach(d => {
  const i = d.indexOf(":");
  if (i < 0) return;
  const k = d.slice(0, i).trim();
  st.setProperty(k, d.slice(i + 1).trim());
  keys.push(k);
 });
 st.setProperty("color-scheme", mode);
 keys.push("color-scheme");
 return keys;
}

function previewPaint(t, mode) {
 const keys = paintVars(t, mode), st = document.documentElement.style;
 onLeave(() => keys.forEach(k => st.removeProperty(k)));
}

function editOpen(t, isNew) {
 EDIT = {
  theme: themeNorm(JSON.parse(JSON.stringify(t))),
  mode: themeShownMode(t),
  isNew: !!isNew,
  dirty: !!isNew
 };
 go("themeedit");
}

function editSave() {
 const t = EDIT.theme;
 themeUpsert(t);
 S.look = {
  ...S.look || {},
  id: t.id
 };
 EDIT = null;
 applyLook();
 saveSettings();
 go("setgroup");
 toast(t.name + " saved");
}

function editLeave() {
 const done = () => {
  EDIT = null;
  back();
 };
 if (!EDIT.dirty) return done();
 confirmed("Discard changes", "The palette goes back to what it was before you opened it.", done, "Discard");
}

function editSet(key, hex) {
 const t = EDIT.theme, m = t.modes[EDIT.mode];
 if (t.link && t.link.on && SURFACE_KEYS.includes(key)) linkEdit(t, EDIT.mode, key, hex); else m[key] = hexNorm(hex) || m[key];
 EDIT.dirty = true;
 paintVars(t, EDIT.mode);
}

function swatchRow(key) {
 const sw = SWATCHES.find(x => x.k === key);
 const hex = EDIT.theme.modes[EDIT.mode][key];
 return row({
  mark: el("span", {
   class: "swblock",
   style: "background:" + hex
  }),
  t1: sw.name,
  t2: sw.uses,
  val: hex,
  go: true,
  label: sw.name + ", " + hex,
  onclick: () => {
   EDITSW = key;
   EDITSW0 = hex;
   go("swatchedit");
  }
 });
}

VIEWS.themeedit = () => {
 const root = $("#p-themeedit");
 root.innerHTML = "";
 if (!EDIT) {
  root.appendChild(el("div", {
   class: "note",
   text: "Nothing to edit."
  }));
  return;
 }
 const t = EDIT.theme;
 previewPaint(t, EDIT.mode);
 const both = t.modes.light && t.modes.dark;
 root.appendChild(pageBar([ EDIT.isNew ? null : el("button", {
  class: "btn sm bad icon",
  type: "button",
  html: ICONS.trash,
  "aria-label": "Delete " + t.name,
  onclick: () => confirmed("Delete " + t.name, "The theme goes for good; there is no undo.", () => {
   themeRemove(t.id);
   EDIT = null;
   applyLook();
   saveSettings();
   back();
   toast("Deleted");
  }, "Delete")
 }) ], editLeave));
 root.appendChild(sec("Editing", null, [ el("div", {
  class: "box pad"
 }, [ both ? segmented([ [ "light", "Light" ], [ "dark", "Dark" ] ], EDIT.mode, v => {
  EDIT.mode = v;
  render();
 }) : el("button", {
  class: "btn wide",
  type: "button",
  text: t.modes.light ? "Add a dark half" : "Add a light half",
  onclick: () => {
   themeHalf(t, t.modes.light ? "dark" : "light");
   EDIT.mode = t.modes.light && t.modes.dark ? t.modes.dark ? "dark" : "light" : EDIT.mode;
   EDIT.dirty = true;
   render();
  }
 }) ]) ]));
 root.appendChild(specimenFlags(themeSpecimen(false), themeFindings(t, EDIT.mode)));
 SWATCH_GROUPS.forEach(([name, keys]) => {
  const rows = el("div", {
   class: "box rows"
  }, keys.map(swatchRow));
  const link = name !== "Surfaces" ? null : el("div", {
   class: "box rows"
  }, [ row({
   t1: "Linked to the page",
   t2: "One surface moves them all",
   cbx: !!(t.link && t.link.on),
   pressed: !!(t.link && t.link.on),
   onclick: () => {
    t.link = t.link || {
     on: false,
     off: {
      light: {},
      dark: {}
     }
    };
    t.link.on = !t.link.on;
    if (t.link.on) linkCapture(t, EDIT.mode);
    EDIT.dirty = true;
    render();
   }
  }) ]);
  root.appendChild(sec(name, null, [ link, rows ].filter(Boolean)));
 });
 const acts = [ row({
  t1: "Rename",
  go: true,
  onclick: () => renameTheme(t, () => render())
 }) ];
 if (t.pairedWith) acts.push(row({
  t1: "Revert",
  t2: "Back to " + ((PRESETS_T.find(p => p.id === t.pairedWith) || {}).name || "the preset"),
  go: true,
  onclick: () => confirmed("Revert " + t.name, "Every swatch goes back to the preset it was copied from. The name stays.", () => {
   if (themeRevertTo(t)) {
    EDIT.dirty = true;
    render();
   }
  }, "Revert")
 }));
 if (!(t.modes.light && t.modes.dark)) acts.push(row({
  t1: t.modes.light ? "Add a dark half" : "Add a light half",
  t2: "Starts from what is here",
  go: true,
  onclick: () => {
   themeHalf(t, t.modes.light ? "dark" : "light");
   EDIT.dirty = true;
   render();
  }
 }));
 acts.push(row({
  t1: "Copy as JSON",
  go: true,
  onclick: () => shareTheme(t)
 }));
 root.appendChild(sec("This theme", null, [ el("div", {
  class: "box rows"
 }, acts) ]));
 const found = themeFindings(t, EDIT.mode);
 root.appendChild(el("div", {
  class: "botbar"
 }, [ el("div", {
  class: "botbar-in"
 }, [ found.length ? el("button", {
  class: "btn icon warn",
  type: "button",
  text: "!",
  "aria-label": found.length + " warnings",
  onclick: () => warnList(found)
 }) : null, el("button", {
  class: "btn pri grow",
  type: "button",
  text: "Save",
  onclick: editSave
 }) ]) ]));
};

function warnList(found) {
 openModal({
  title: found.length + (found.length === 1 ? " warning" : " warnings"),
  body: [ el("div", {
   class: "box rows"
  }, found.map(f => {
   const sw = SWATCHES.find(x => x.k === f.swatch) || {
    name: f.swatch,
    k: f.swatch
   };
   return row({
    mark: el("span", {
     class: "swblock",
     style: "background:" + EDIT.theme.modes[EDIT.mode][sw.k]
    }),
    t1: sw.name,
    t2: f.affects + " · " + f.detail,
    go: true,
    onclick: () => {
     closeModal();
     EDITSW = sw.k;
     EDITSW0 = EDIT.theme.modes[EDIT.mode][sw.k];
     go("swatchedit");
    }
   });
  })) ]
 });
}

VIEWS.themelist = () => {
 const root = $("#p-themelist");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 const mine = (S.look && S.look.themes || []).map(t => themeNorm(t));
 if (mine.length) root.appendChild(sec("Your themes", null, [ el("div", {
  class: "box rows"
 }, mine.map(t => row({
  mark: swatchStrip(t.modes[themeShownMode(t)], "mini"),
  t1: t.name,
  t2: themePin(t) ? themePin(t) === "dark" ? "Dark only" : "Light only" : null,
  go: true,
  onclick: () => editOpen(t, false)
 }))) ]));
 root.appendChild(sec(mine.length ? null : "Your themes", null, [ el("div", {
  class: "box rows"
 }, [ row({
  t1: "New theme",
  t2: "Starts from one that already works",
  go: true,
  onclick: newTheme
 }), row({
  t1: "Paste a theme",
  go: true,
  onclick: importTheme
 }) ]) ]));
};

function newTheme() {
 const pick = t => {
  closeModal();
  editOpen(themeDup(t), true);
 };
 openModal({
  title: "Start from",
  body: [ el("div", {
   class: "box rows"
  }, allThemes().map(t => row({
   mark: swatchStrip(t.modes[themeShownMode(t)], "mini"),
   t1: t.name,
   go: true,
   onclick: () => pick(t)
  }))) ]
 });
}

const PLANE_W = 64, PLANE_H = 44, CMAX = .37;

function planeCanvas(hue, onPick) {
 const cv = el("canvas", {
  class: "plane",
  width: PLANE_W,
  height: PLANE_H
 });
 const ctx = cv.getContext("2d");
 const img = ctx.createImageData(PLANE_W, PLANE_H);
 for (let y = 0; y < PLANE_H; y++) {
  for (let x = 0; x < PLANE_W; x++) {
   const L = 1 - y / (PLANE_H - 1), C = x / (PLANE_W - 1) * CMAX;
   const rgb = hexParse(oklchHex({
    L: L,
    C: C,
    h: hue
   })), i = (y * PLANE_W + x) * 4;
   img.data[i] = rgb[0];
   img.data[i + 1] = rgb[1];
   img.data[i + 2] = rgb[2];
   img.data[i + 3] = 255;
  }
 }
 ctx.putImageData(img, 0, 0);
 const wrap = el("div", {
  class: "planewrap"
 }, [ cv, el("span", {
  class: "planedot"
 }) ]);
 const at = e => {
  const r = cv.getBoundingClientRect();
  const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  const fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
  onPick(1 - fy, fx * CMAX);
 };
 let down = false;
 wrap.addEventListener("pointerdown", e => {
  down = true;
  wrap.setPointerCapture(e.pointerId);
  at(e);
  e.preventDefault();
 });
 wrap.addEventListener("pointermove", e => {
  if (down) at(e);
 });
 wrap.addEventListener("pointerup", () => {
  down = false;
 });
 wrap.addEventListener("pointercancel", () => {
  down = false;
 });
 return wrap;
}

VIEWS.swatchedit = () => {
 const root = $("#p-swatchedit");
 root.innerHTML = "";
 if (!EDIT || !EDITSW) {
  root.appendChild(el("div", {
   class: "note",
   text: "Nothing to pick."
  }));
  return;
 }
 const t = EDIT.theme, mode = EDIT.mode, key = EDITSW;
 const sw = SWATCHES.find(x => x.k === key);
 previewPaint(t, mode);
 let c = oklch(t.modes[mode][key]) || {
  L: .5,
  C: .1,
  h: 0
 };
 const dot = () => {
  const d = root.querySelector(".planedot");
  if (d) {
   d.style.left = c.C / CMAX * 100 + "%";
   d.style.top = (1 - c.L) * 100 + "%";
  }
 };
 const live = () => {
  const hex = oklchHex(c);
  editSet(key, hex);
  const now = root.querySelector(".chipnow");
  if (now) now.style.background = hex;
  const hx = root.querySelector(".hexin");
  if (hx && document.activeElement !== hx) hx.value = hex;
  const rd = root.querySelector(".readout");
  if (rd) rd.textContent = contrastLine(key, t.modes[mode]);
  dot();
 };
 const setLCH = (L, C, h) => {
  c = {
   L: Math.max(0, Math.min(1, L)),
   C: Math.max(0, C),
   h: (h % 360 + 360) % 360
  };
  c = oklchClamp(c);
  live();
 };
 const cancel = () => {
  editSet(key, EDITSW0);
  EDITSW = null;
  back();
 };
 root.appendChild(pageBar([], cancel));
 root.appendChild(sec(null, null, [ el("div", {
  class: "box pad stack"
 }, [ planeCanvas(c.h, (L, C) => setLCH(L, C, c.h)), el("input", {
  class: "huein",
  type: "range",
  min: "0",
  max: "359",
  value: String(Math.round(c.h)),
  "aria-label": "Hue",
  oninput: e => {
   setLCH(c.L, c.C, +e.target.value);
   root.querySelector(".planewrap").replaceWith(planeCanvas(c.h, (L, C) => setLCH(L, C, c.h)));
   dot();
  }
 }), el("div", {
  class: "bar nudge"
 }, [ nudge("L−", () => setLCH(c.L - .01, c.C, c.h)), nudge("L+", () => setLCH(c.L + .01, c.C, c.h)), nudge("C−", () => setLCH(c.L, c.C - .005, c.h)), nudge("C+", () => setLCH(c.L, c.C + .005, c.h)), nudge("H−", () => setLCH(c.L, c.C, c.h - 1)), nudge("H+", () => setLCH(c.L, c.C, c.h + 1)) ]), el("div", {
  class: "bar"
 }, [ el("span", {
  class: "splitchip"
 }, [ el("span", {
  class: "chipwas",
  style: "background:" + EDITSW0
 }), el("span", {
  class: "chipnow",
  style: "background:" + t.modes[mode][key]
 }) ]), el("span", {
  class: "grow small muted readout",
  text: contrastLine(key, t.modes[mode])
 }) ]), labelled("Hex", el("input", {
  class: "hexin",
  type: "text",
  value: t.modes[mode][key],
  spellcheck: "false",
  oninput: e => {
   const v = hexNorm(e.target.value);
   if (v) {
    c = oklch(v);
    live();
   }
  }
 })) ]) ]));
 const near = [ ...new Set(COLOUR_SETS.filter(([, roles]) => roles.some(r => ROLE_OF[r] === key)).flatMap(([, roles]) => roles.map(r => ROLE_OF[r]))) ].filter(k => k !== key);
 if (near.length) root.appendChild(sec("Beside it", null, [ el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "mks"
 }, near.map(k => el("i", {
  style: "background:" + t.modes[mode][k],
  title: (SWATCHES.find(x => x.k === k) || {}).name
 }))) ]) ]));
 root.appendChild(specimenFlags(themeSpecimen(false), themeFindings(t, mode)));
 dot();
 root.appendChild(el("div", {
  class: "botbar"
 }, [ el("div", {
  class: "botbar-in"
 }, [ el("button", {
  class: "btn pri grow",
  type: "button",
  text: "Done",
  onclick: () => {
   EDITSW = null;
   back();
  }
 }) ]) ]));
};

const nudge = (label, onclick) => el("button", {
 class: "btn sm",
 type: "button",
 text: label,
 onclick: onclick
});

function contrastLine(key, m) {
 const v = {
  ...m,
  ...themeDerive(m)
 };
 if ([ "ink", "ink2", "ink3" ].includes(key)) return contrast(v[key], v.bg) + ":1 on the page";
 if ([ "bg", "panel", "alt" ].includes(key)) return contrast(v.ink, v[key]) + ":1 for text on it";
 if (key === "green") return contrast(v["on-green"], v.green) + ":1 for text on the fill";
 if (key === "red") return contrast(v["on-red"], v.red) + ":1 for text on the fill";
 if (key === "blue") return contrast(v["on-blue"], v.blue) + ":1 for text on the fill";
 return "";
}

VIEWS.themeprev = () => {
 const root = $("#p-themeprev");
 root.innerHTML = "";
 const t = LOOKPREV;
 if (!t) {
  root.appendChild(el("div", {
   class: "note",
   text: "Nothing to preview."
  }));
  return;
 }
 const mode = themeShownMode(t);
 previewPaint(t, mode);
 root.appendChild(pageBar([]));
 root.appendChild(specimenFlags(themeSpecimen(false), themeFindings(t, mode)));
 root.appendChild(sec("This theme", null, [ el("div", {
  class: "box rows themeacts"
 }, [ row({
  t1: "Copy as JSON",
  go: true,
  onclick: () => shareTheme(t)
 }) ]) ]));
 root.appendChild(el("div", {
  class: "botbar"
 }, [ el("div", {
  class: "botbar-in"
 }, [ el("button", {
  class: "btn pri grow",
  type: "button",
  text: "Use this theme",
  onclick: () => {
   pickTheme(t.id);
   back();
   toast("Appearance saved");
  }
 }) ]) ]));
};

function shareTheme(t) {
 const json = themeExport(t);
 const box = el("textarea", {
  class: "jsonbox",
  readonly: "",
  rows: "8",
  spellcheck: "false",
  text: json
 });
 openModal({
  title: t.name,
  body: [ el("div", {
   class: "box pad"
  }, [ box ]) ],
  footer: [ el("button", {
   class: "btn pri",
   type: "button",
   text: "Copy",
   onclick: () => {
    const done = () => {
     closeModal();
     toast("Copied");
    };
    try {
     navigator.clipboard.writeText(json).then(done, () => {
      box.select();
      toast("Select and copy");
     });
    } catch (e) {
     box.select();
     toast("Select and copy");
    }
   }
  }) ]
 });
}

function importTheme() {
 const box = el("textarea", {
  class: "jsonbox",
  rows: "8",
  spellcheck: "false",
  placeholder: "{"
 });
 openModal({
  title: "Paste a theme",
  body: [ el("div", {
   class: "box pad"
  }, [ box ]) ],
  footer: [ el("button", {
   class: "btn pri",
   type: "button",
   text: "Open",
   onclick: () => {
    const t = themeImport(box.value);
    if (!t) return toast("That is not a theme");
    closeModal();
    LOOKPREV = null;
    editOpen(t, true);
   }
  }) ]
 });
}

function renameTheme(t, after) {
 const input = el("input", {
  type: "text",
  value: t.name,
  maxlength: "40",
  spellcheck: "false"
 });
 openModal({
  title: "Rename",
  body: [ el("div", {
   class: "box pad"
  }, [ labelled("Name", input) ]) ],
  save: () => {
   const v = input.value.trim();
   if (!v) return;
   t.name = v.slice(0, 40);
   if (after) return after();
   themeUpsert(t);
   saveSettings();
   toast("Renamed");
  }
 });
}

const SETGROUPS = [ {
 k: "track",
 name: "What you track",
 body(root) {
  const box = el("div", {
   class: "box rows"
  });
  [ [ "food", "Food" ], [ "weight", "Bodyweight" ], [ "strength", "Strength" ], [ "cardio", "Cardio" ] ].forEach(([k, label]) => {
   box.appendChild(optionRow(label, null, tracks(k), () => {
    S.track = {
     ...S.track || {},
     [k]: !tracks(k)
    };
    saveSettings();
   }));
  });
  root.appendChild(el("div", {
   class: "sec"
  }, [ box ]));
 }
}, {
 k: "units",
 name: "Units and the week",
 body(root) {
  root.appendChild(sec("Weight", null, [ el("div", {
   class: "box pad"
  }, [ segmented([ [ "lb", "Pounds" ], [ "kg", "Kilograms" ] ], S.units.weight, v => {
   S.units.weight = v;
   saveSettings();
   toast("Everything is in " + v + " now");
  }) ]) ]));
  root.appendChild(sec("Distance", null, [ el("div", {
   class: "box pad"
  }, [ segmented([ [ "km", "Kilometres" ], [ "mi", "Miles" ] ], distUnit(), v => {
   S.units = {
    ...S.units,
    dist: v
   };
   saveSettings();
   toast("Distances in " + v + " now");
  }) ]) ]));
  root.appendChild(sec("Energy", null, [ el("div", {
   class: "box pad"
  }, [ segmented([ [ "kcal", "kcal" ], [ "kJ", "kJ" ] ], eUnit(), v => {
   S.units = {
    ...S.units,
    energy: v
   };
   saveSettings();
   toast("Energy in " + v + " now");
  }) ]) ]));
  if (!ONB) root.appendChild(sec("A week's weight is its", null, [ el("div", {
   class: "box pad"
  }, [ segmented([ [ "median", "Median" ], [ "mean", "Average" ] ], weightBasis(), v => {
   S.weight = {
    ...S.weight || {},
    basis: v
   };
   saveSettings();
   toast("Weeks read as the " + basisWord());
  }) ]) ]));
  root.appendChild(sec("The week starts on", null, [ el("div", {
   class: "box pad"
  }, [ segmented([ [ 1, "Monday" ], [ 0, "Sunday" ] ], week0(), v => {
   S.week0 = +v;
   saveSettings();
   toast("Weeks start " + DOW_NAME[+v]);
  }) ]) ]));
 }
}, {
 k: "food",
 name: "Food and imports",
 when: () => tracks("food"),
 body(root) {
  importBlock(root);
 }
}, {
 k: "targets",
 name: "Goal and targets",
 when: () => tracks("food") || tracks("weight"),
 body(root) {
  goalBlock(root);
  if (tracks("food")) root.appendChild(targetBlock());
 }
}, {
 k: "train",
 name: "Workouts",
 when: () => tracks("strength") || tracks("cardio"),
 body(root) {
  if (tracks("strength")) trainBlock(root);
  if (tracks("cardio")) {
   cardioBlock(root);
   rideBlock(root);
  }
 }
}, {
 k: "ai",
 name: "Claude",
 when: () => !!AI,
 body(root) {
  root.appendChild(sec("Model tier", null, [ el("div", {
   class: "box pad"
  }, [ segmented([ [ "quick", "Quick" ], [ "default", "Default" ], [ "complex", "Complex" ] ], S.ai.tier, v => {
   S.ai.tier = v;
   saveSettings();
   toast("Saved");
  }) ]) ]));
 }
}, {
 k: "library",
 name: "Foods and recipes",
 page: "library",
 when: () => tracks("food")
}, {
 k: "data",
 name: "Data",
 page: "data"
}, {
 k: "sample",
 name: "Sample data",
 body(root) {
  root.appendChild(sampleBlock());
 }
}, {
 k: "look",
 name: "Appearance",
 body(root) {
  const live = activeTheme();
  const head = el("button", {
   class: "row lookhead",
   type: "button",
   "aria-expanded": LOOKOPEN ? "true" : "false",
   onclick: () => {
    LOOKOPEN = !LOOKOPEN;
    render();
   }
  }, [ swatchStrip(live.modes[themeShownMode(live)]), el("span", {
   class: "nm"
  }, [ el("span", {
   class: "t1",
   text: live.name
  }) ]), el("span", {
   class: "chevron",
   html: LOOKOPEN ? ICONS.up : ICONS.chevr
  }) ]);
  const drawer = LOOKOPEN ? el("div", {
   class: "lookmenu"
  }, allThemes().map(t => themeCard(t, live.id))) : null;
  root.appendChild(sec("Theme", null, [ el("div", {
   class: "box"
  }, [ head, drawer ]), el("div", {
   class: "box rows"
  }, [ row({
   t1: "Theme editor",
   t2: "Make and edit your own",
   go: true,
   onclick: () => go("themelist")
  }) ]) ]));
  root.appendChild(sec("Light and dark", null, [ el("div", {
   class: "box pad"
  }, [ THEMEPIN ? segmented([ [ THEMEPIN, THEMEPIN === "dark" ? "Dark" : "Light" ] ], THEMEPIN, () => {}) : segmented([ [ "", "System" ], [ "light", "Light" ], [ "dark", "Dark" ] ], THEMEPREF, v => {
   applyTheme(v);
   render();
   toast("Appearance saved");
  }) ]) ]));
  root.appendChild(sec("Text size", null, [ el("div", {
   class: "box pad"
  }, [ segmented([ [ "sm", "Small" ], [ "", "Default" ], [ "lg", "Large" ], [ "xl", "Larger" ] ], scalePref("text"), v => {
   applyScale("text", v);
   render();
   toast("Appearance saved");
  }) ]) ]));
  root.appendChild(sec("Density", null, [ el("div", {
   class: "box pad"
  }, [ segmented([ [ "compact", "Compact" ], [ "", "Default" ], [ "roomy", "Roomy" ] ], scalePref("density"), v => {
   applyScale("density", v);
   render();
   toast("Appearance saved");
  }) ]) ]));
 }
}, {
 k: "touch",
 name: "Swipe and touch",
 body(root) {
  const demo = el("div", {
   class: "stack"
  });
  const paintDemo = () => {
   demo.innerHTML = "";
   touchDemo().forEach(n => demo.appendChild(n));
  };
  const pct = k => Math.round(touchPref(k, 1) * 100);
  root.appendChild(sec("Swipe length", null, [ el("div", {
   class: "box pad"
  }, [ rangeDial({
   min: 60,
   max: 160,
   step: 10,
   value: pct("swipe"),
   label: "Swipe length",
   fmt: v => v + "%",
   onCommit: v => {
    touchSet("swipe", v);
    paintDemo();
   }
  }) ]) ]));
  root.appendChild(sec("Dial speed", null, [ el("div", {
   class: "box pad"
  }, [ rangeDial({
   min: 40,
   max: 150,
   step: 10,
   value: pct("dial"),
   label: "Dial speed",
   fmt: v => v + "%",
   onCommit: v => {
    touchSet("dial", v);
    paintDemo();
   }
  }) ]) ]));
  root.appendChild(sec("Try it", null, [ demo ]));
  paintDemo();
 }
} ];

function touchDemo() {
 const said = el("span", {
  class: "v mono",
  text: "—"
 });
 const tell = t => {
  said.textContent = t;
 };
 const load = 135, lu = loadUnit();
 const setRow = swipeScale(row({
  mark: el("span", {
   class: "sw",
   style: "--c:var(--part-chest)"
  }),
  t1: "Bench press",
  t2: load + " " + lu
 }), {
  right: {
   max: 15,
   css: "var(--interactive)",
   fg: "var(--on-interactive)",
   hint: load + " " + lu,
   label: k => load + " × " + k,
   fn: k => tell(load + " × " + k)
  },
  left: {
   max: 2,
   css: "var(--danger)",
   fg: "var(--on-danger)",
   hint: "remove",
   label: k => k === 1 ? "-1 set" : "Off this workout",
   fn: k => tell(k === 1 ? "-1 set" : "Off this workout")
  }
 });
 const foodRow = swipeRow(row({
  t1: "Greek yogurt",
  t2: "185 · 200 g"
 }), {
  right: {
   label: "Add here",
   css: "var(--interactive)",
   fg: "var(--on-interactive)",
   fn: () => tell("Add here")
  },
  left: [ {
   label: "Edit",
   css: "var(--ink2)",
   fg: "var(--bg)",
   fn: () => tell("Edit")
  }, {
   label: "Delete",
   css: "var(--danger)",
   fg: "var(--on-danger)",
   fn: () => tell("Delete")
  } ]
 });
 const reps = rangeDial({
  min: 1,
  max: 30,
  step: 1,
  value: 8,
  label: "Reps",
  compact: true,
  onChange: v => tell(v + " reps")
 });
 return [ el("div", {
  class: "box rows touchdemo"
 }, [ setRow, foodRow ]), el("div", {
  class: "box pad"
 }, [ field("Reps", reps) ]), el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "kv"
 }, [ el("span", {
  class: "k",
  text: "Did"
 }), said ]) ]) ];
}

const setGroup = () => SETGROUPS.find(g => g.k === SETGROUP) || null;

const minSec = n => {
 const v = Math.max(0, Math.round(+n || 0));
 return v >= 60 ? Math.floor(v / 60) + "m" + (v % 60 ? " " + v % 60 + "s" : "") : v + "s";
};

VIEWS.settings = function viewSettings() {
 const root = $("#p-settings");
 root.innerHTML = "";
 const box = el("div", {
  class: "box rows"
 });
 SETGROUPS.forEach(g => {
  if (g.when && !g.when()) return;
  box.appendChild(row({
   t1: g.name,
   go: true,
   onclick: () => {
    if (g.page) return go(g.page);
    SETGROUP = g.k;
    go("setgroup");
   }
  }));
 });
 root.appendChild(el("div", {
  class: "sec"
 }, [ box ]));
};

VIEWS.setgroup = function viewSetGroup() {
 const root = $("#p-setgroup");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 const g = setGroup();
 if (!g || !g.body) {
  root.appendChild(el("div", {
   class: "box empty",
   text: "No such settings group."
  }));
  return;
 }
 g.body(root);
};

function targetBlock() {
 const tgtBox = el("div", {
  class: "box"
 }, [ el("div", {
  class: "row thead"
 }, [ el("span", {
  class: "nm"
 }), el("div", {
  class: "f w84"
 }, [ el("span", {
  text: "Floor"
 }) ]), el("div", {
  class: "f w84"
 }, [ el("span", {
  text: "Ceiling"
 }) ]) ]) ]);
 const inputs = {};
 NUTS.forEach(n => {
  const t = S.targets[n.k] || {
   min: null,
   max: null
  };
  const mkIn = which => {
   const i = el("input", {
    type: "number",
    step: "any",
    min: "0",
    inputmode: "numeric",
    value: t[which] == null ? "" : n.k === "kcal" ? r0(eDisp(t[which])) : t[which],
    placeholder: "—"
   });
   i.addEventListener("input", () => paintRead());
   i.addEventListener("change", () => {
    const v = parseFloat(i.value);
    S.targets[n.k] = {
     ...S.targets[n.k],
     [which]: i.value.trim() === "" || !isFinite(v) ? null : n.k === "kcal" ? r1(eFromDisp(v)) : v
    };
    saveSettings();
    toast(n.label + " target saved");
    paintRead();
   });
   return i;
  };
  inputs[n.k] = {
   min: mkIn("min"),
   max: mkIn("max")
  };
  const name = n.label + (n.unit ? " (" + n.unit + ")" : "");
  inputs[n.k].min.setAttribute("aria-label", name + " floor");
  inputs[n.k].max.setAttribute("aria-label", name + " ceiling");
  tgtBox.appendChild(el("div", {
   class: "row"
  }, [ el("span", {
   class: "nm",
   text: name
  }), el("div", {
   class: "f w84"
  }, [ inputs[n.k].min ]), el("div", {
   class: "f w84"
  }, [ inputs[n.k].max ]) ]));
 });
 const readout = el("div", {
  class: "pad small muted"
 });
 const paintRead = () => {
  const g = k => parseFloat(inputs[k].min.value) || 0;
  const floorKcal = kcalFromMacros({
   p: g("p"),
   c: g("c"),
   f: g("f")
  });
  const ceil = eFromDisp(parseFloat(inputs.kcal.max.value));
  readout.innerHTML = "";
  if (!floorKcal) {
   readout.textContent = "No macro floors set.";
   return;
  }
  readout.appendChild(document.createTextNode(`Macro floors come to ${fmtEU(floorKcal)}` + (isFinite(ceil) && ceil > 0 ? ` of a ${fmtE(ceil)} ceiling — ${fmtE(ceil - floorKcal)} left over.` : ".")));
  if (isFinite(ceil) && ceil > 0 && floorKcal > ceil) {
   readout.appendChild(el("div", {
    class: "bad-line",
    text: "The floors are above the ceiling: those cannot both be met."
   }));
  }
 };
 paintRead();
 return sec("Floors and ceilings", null, [ el("div", {
  class: "box"
 }, [ tgtBox, readout ]) ]);
}

const STYLES = [ [ "eff", "Effective" ], [ "volume", "Volume" ], [ "strength", "Strength" ], [ "sessions", "Sessions" ] ];

function styleBlock(root) {
 root.appendChild(sec("Training is measured by", null, [ el("div", {
  class: "box pad"
 }, [ segmented(STYLES, S.train.style, v => {
  S.train = {
   ...S.train,
   style: v
  };
  saveSettings();
 }) ]) ]));
}

const GOALS = [ [ "lose", "Lose" ], [ "hold", "Maintain" ], [ "gain", "Gain" ] ];

function goalBlock(root) {
 root.appendChild(sec("Goal", null, [ el("div", {
  class: "box pad"
 }, [ segmented(GOALS, S.goal || "", v => {
  S.goal = v;
  saveSettings();
 }) ]) ]));
}

function trainBlock(root) {
 styleBlock(root);
 const rest = rangeDial({
  min: 30,
  max: 300,
  step: 15,
  value: S.train.restSec,
  label: "Rest length in seconds",
  fmt: minSec,
  onCommit: v => {
   if (v !== null) {
    S.train.restSec = v;
    saveSettings();
   }
  }
 });
 root.appendChild(sec("Rest clock", null, [ el("div", {
  class: "box pad"
 }, [ rest ]) ]));
 const u = loadUnit();
 const step = el("input", {
  type: "number",
  min: "0.5",
  step: "0.25",
  inputmode: "decimal",
  value: S.train.step[u]
 });
 step.addEventListener("change", () => {
  const v = parseFloat(step.value);
  if (!(v > 0)) {
   toast("A step has to be more than nothing.");
   return;
  }
  S.train.step[u] = v;
  saveSettings();
  toast("Saved");
 });
 root.appendChild(sec("Weight on the bar", null, [ el("div", {
  class: "box pad"
 }, [ labelled("The plus and minus move by (" + u + ")", step) ]) ]));
 if (S.train.style !== "eff") {
  if (!ONB) sessionsOpen(root);
  return;
 }
 const t = effTarget();
 const lo = el("input", {
  type: "number",
  min: "0",
  step: "1",
  inputmode: "numeric",
  value: t[0]
 });
 const hi = el("input", {
  type: "number",
  min: "1",
  step: "1",
  inputmode: "numeric",
  value: t[1]
 });
 const saveBand = () => {
  const a = parseFloat(lo.value), b = parseFloat(hi.value);
  if (!(a >= 0) || !(b > a)) {
   toast("The top has to be above the bottom.");
   return;
  }
  S.train.effTarget = [ a, b ];
  saveSettings();
  toast("Target band saved");
 };
 [ lo, hi ].forEach(i => i.addEventListener("change", saveBand));
 root.appendChild(sec("Effective reps a week", null, [ el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "grid2"
 }, [ labelled("From", lo), labelled("To", hi) ]) ]) ]));
 if (!ONB) sessionsOpen(root);
}

function sessionsOpen(root) {
 const fin = el("select", {
  "aria-label": "Auto-finish"
 }, [ [ 0, "Never" ], [ 4, "After 4 hours" ], [ 6, "After 6 hours" ], [ 8, "After 8 hours" ], [ 12, "After 12 hours" ], [ 24, "After a day" ] ].map(([v, l]) => el("option", {
  value: v,
  text: l,
  selected: S.train.autoFinishH === v ? "" : null
 })));
 fin.addEventListener("change", () => {
  S.train.autoFinishH = +fin.value;
  saveSettings();
  toast("Saved");
 });
 root.appendChild(sec("Sessions left open", null, [ el("div", {
  class: "box pad"
 }, [ labelled("Finish one on its own", fin) ]) ]));
}

function cardioBlock(root, quick) {
 const on = modsOn();
 const def = defaultMod();
 const setDef = v => {
  S.cardio = {
   ...S.cardio,
   defaultModality: v
  };
  saveSettings();
 };
 if (on.length > 1) root.appendChild(sec("Opens on", null, [ el("div", {
  class: "box pad"
 }, [ on.length <= 4 ? segmented(on.map(m => [ m.k, m.name ]), def, setDef) : selectRow("Opens on", on.map(m => [ m.k, m.name ]), def, setDef) ]) ]));
 const put = (k, patch) => {
  const mods = {
   ...S.cardio.mods,
   [k]: {
    ...modSet(k),
    ...patch
   }
  };
  if (!CARDIO_MODS.some(m => mods[m.k] && mods[m.k].on)) {
   toast("Keep at least one.");
   return;
  }
  S.cardio = {
   ...S.cardio,
   mods: mods
  };
  saveSettings();
 };
 const box = el("div", {
  class: "box rows modlist"
 });
 CARDIO_MODS.forEach(m => {
  const cur = modSet(m.k);
  box.appendChild(row({
   mark: modMark(15, m.k),
   t1: m.name,
   cbx: !!cur.on,
   pressed: !!cur.on,
   onclick: () => put(m.k, {
    on: !cur.on
   })
  }));
  if (!cur.on) return;
  const src = modTracks(m.k, "watts") ? "power" : modTracks(m.k, "met") ? "MET" : null;
  const inner = el("div", {
   class: "pad accbody",
   style: "--c:var(--ser-ride)"
  }, [ chipRow(CARDIO_METRICS.map(x => [ x, METRIC_WORD[x] ]), x => modTracks(m.k, x), x => {
   const ms = modTracks(m.k, x) ? cur.metrics.filter(y => y !== x) : cur.metrics.concat([ x ]);
   put(m.k, {
    metrics: CARDIO_METRICS.filter(y => ms.includes(y))
   });
  }), !quick && modTracks(m.k, "met") ? el("div", {
   class: "mt"
  }, [ field("MET", rangeDial({
   min: 1,
   max: 16,
   step: .5,
   value: cur.met,
   label: m.name + " MET",
   onCommit: v => {
    if (v !== null) put(m.k, {
     met: v
    });
   }
  })) ]) : null, quick ? null : kv("Energy from", src || "—") ].filter(Boolean));
  box.appendChild(inner);
 });
 root.appendChild(sec("Cardio", null, [ box ]));
}

function rideBlock(root) {
 const ftp = el("input", {
  type: "number",
  min: "0",
  step: "1",
  inputmode: "numeric",
  value: S.cardio.ftp || "",
  placeholder: "watts"
 });
 ftp.addEventListener("change", () => {
  S.cardio.ftp = parseFloat(ftp.value) || 0;
  saveSettings();
  toast("FTP saved");
 });
 const band = wattBand();
 const wLo = el("input", {
  type: "number",
  min: "0",
  step: "5",
  inputmode: "numeric",
  value: S.cardio.wLo || "",
  placeholder: String(band[0])
 });
 const wHi = el("input", {
  type: "number",
  min: "0",
  step: "5",
  inputmode: "numeric",
  value: S.cardio.wHi || "",
  placeholder: String(band[1])
 });
 const saveBand = () => {
  const lo = parseFloat(wLo.value), hi = parseFloat(wHi.value);
  if (!(lo >= 0) || !(hi > lo)) {
   toast("The top has to be above the bottom.");
   return;
  }
  S.cardio.wLo = lo;
  S.cardio.wHi = hi;
  saveSettings();
  toast("Power range saved");
 };
 [ wLo, wHi ].forEach(i => i.addEventListener("change", saveBand));
 if (powerOn()) root.appendChild(sec("Power", null, [ el("div", {
  class: "box pad"
 }, [ labelled("FTP (watts)", ftp), el("div", {
  class: "grid2"
 }, [ labelled("Power dial from", wLo), labelled("to", wHi) ]) ]) ]));
 if (ONB) return;
 const pool = rangeDial({
  min: 1,
  max: 14,
  step: 1,
  value: poolDays(),
  label: "Pool window in days",
  fmt: v => v === 1 ? "1 day" : v + " days",
  onCommit: v => {
   if (v !== null) {
    S.ride.poolDays = v;
    saveSettings();
   }
  }
 });
 root.appendChild(sec(cardioWords().short + " calorie pool", null, [ el("div", {
  class: "box pad"
 }, [ field("Spread a " + cardioWords().one + "'s work across", pool) ]) ]));
}

function importBlock(root) {
 const box = el("div", {
  class: "box rows"
 });
 const opt = (k, label, hint) => box.appendChild(optionRow(label, hint, S.imports[k], () => {
  S.imports[k] = !S.imports[k];
  saveSettings();
  render();
 }));
 opt("weight", "Scale weights", "Every weigh-in in the file");
 opt("food", "Food log", "Every logged item, and a food in your library for anything new");
 opt("spend", "Their expenditure", "Drawn beside this app's own estimate, never used in it");
 opt("targets", "Targets", "Overwrites the floors and ceilings you set here");
 const t = el("input", {
  type: "time",
  value: S.imports.weighAt
 });
 t.addEventListener("change", () => {
  if (/^\d{2}:\d{2}$/.test(t.value)) {
   S.imports.weighAt = t.value;
   saveSettings();
   toast("Saved");
  }
 });
 root.appendChild(sec("What an import brings in", null, [ box ]));
 root.appendChild(sec("Imported weigh-ins", null, [ el("div", {
  class: "box pad"
 }, [ labelled("Stamped at", t) ]) ]));
}

function confirmed(title, what, run, verb) {
 return openModal({
  title: title,
  body: [ el("div", {
   class: "note",
   text: what
  }) ],
  footer: [ el("button", {
   class: "btn",
   type: "button",
   text: "Cancel",
   onclick: closeModal
  }), holdButton(verb || "Do it", () => {
   closeModal();
   run();
  }) ]
 });
}

function sampleBlock() {
 const bodyWords = cardioShown() ? "food, weight and " + cardioWords().many : "food and weight";
 const dbtn = (label, bad, onclick) => el("button", {
  class: "btn sm" + (bad ? " bad" : ""),
  type: "button",
  text: label,
  onclick: onclick
 });
 const dataSec = sec("Sample data · testing", null, [ el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "small muted",
  text: "Each set replaces what it covers."
 }), el("div", {
  class: "small busyline hide",
  id: "databusy"
 }) ]), el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "sub-hd",
  text: capFirst(bodyWords)
 }), el("div", {
  class: "small muted",
  text: "26 weeks · days, weigh-ins" + (cardioShown() ? " and " + cardioWords().many : "")
 }), el("div", {
  class: "wrap mt"
 }, Object.entries(BODY_SETS).map(([k, cfg]) => dbtn(cfg.name, false, () => {
  const run = () => dataJob("Loading " + cfg.name.toLowerCase(), () => seedBody(k));
  if (!DAYS.size) return run();
  confirmed("Load " + cfg.name.toLowerCase(), `This replaces all ${DAYS.size} days of food and weight` + (cardioShown() ? `, and every ${cardioWords().one}.` : "."), run, "Replace");
 })).concat([ dbtn("Clear " + bodyWords, true, () => confirmed("Clear " + bodyWords, "Every day" + (cardioShown() ? " and every " + cardioWords().one : "") + " goes. Workouts, exercises, foods and photos stay.", () => dataJob("Clearing " + bodyWords, async () => {
  const n = DAYS.size, r = RIDES.size;
  await clearBodyData();
  toast(n || r ? `Cleared ${n} day${n === 1 ? "" : "s"}` + (r ? ` and ${nCardio(r)}` : "") : "Nothing there to clear");
 }), "Clear")) ])) ]), el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "sub-hd",
  text: "Workouts"
 }), el("div", {
  class: "small muted",
  text: "26 weeks · push, pull, legs · 3 a week"
 }), el("div", {
  class: "wrap mt"
 }, [ dbtn("Load sample workouts", false, () => {
  const run = () => dataJob("Loading sample workouts", () => seedWorkouts());
  if (!WORKOUTS.size) return run();
  confirmed("Load sample workouts", `This replaces the ${WORKOUTS.size} session${WORKOUTS.size === 1 ? "" : "s"} already here, and every plan.`, run, "Replace");
 }), dbtn("Clear workout data", true, () => confirmed("Clear workout data", "Every session and plan goes. Exercises, " + bodyWords + " stay.", () => dataJob("Clearing workouts", async () => {
  const n = WORKOUTS.size;
  await clearWorkoutData();
  toast(n ? `Cleared ${n} session${n === 1 ? "" : "s"} and every plan` : "Nothing there to clear");
 }), "Clear")) ]) ]) ]);
 dataSec.appendChild(el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "sub-hd",
  text: "Onboarding"
 }), el("div", {
  class: "wrap mt"
 }, [ dbtn("Replay onboarding", false, () => {
  mockEnter();
  openOnboarding({
   mock: true
  });
 }) ]) ]));
 dataSec.id = "datatools";
 if (DATABUSY) queueMicrotask(paintBusy);
 return dataSec;
}

function parseCSV(text) {
 const rows = [];
 let row = [], cell = "", q = false;
 const t = text.replace(/\r\n?/g, "\n");
 for (let i = 0; i < t.length; i++) {
  const ch = t[i];
  if (q) {
   if (ch === '"') {
    if (t[i + 1] === '"') {
     cell += '"';
     i++;
    } else q = false;
   } else cell += ch;
  } else if (ch === '"') q = true; else if (ch === "," || ch === "\t") {
   row.push(cell);
   cell = "";
  } else if (ch === "\n") {
   row.push(cell);
   rows.push(row);
   row = [];
   cell = "";
  } else cell += ch;
 }
 if (cell || row.length) {
  row.push(cell);
  rows.push(row);
 }
 return rows.filter(r => r.some(c => c.trim() !== ""));
}

const HINTS = {
 date: [ "date", "day", "logged", "timestamp" ],
 time: [ "time", "logged at" ],
 weight: [ "scale weight", "weight", "bodyweight", "body weight" ],
 kcal: [ "calorie", "energy", "kcal", "cal" ],
 p: [ "protein" ],
 c: [ "carb" ],
 f: [ "fat", "lipid" ],
 name: [ "food name", "food", "name", "item", "description" ],
 amount: [ "serving weight", "amount", "serving", "quantity", "qty", "grams", "portion" ]
};

const AVOID = {
 weight: [ "trend", "target" ],
 kcal: [ "target" ],
 p: [ "target" ],
 c: [ "target" ],
 f: [ "target", "saturated", "trans", "mono", "poly" ]
};

function guessCol(headers, field) {
 const hs = headers.map(h => h.toLowerCase().trim());
 const bad = AVOID[field] || [];
 const ok = i => i >= 0 && !bad.some(b => hs[i].includes(b));
 for (const h of HINTS[field]) {
  const i = hs.findIndex(x => x === h);
  if (ok(i)) return i;
 }
 for (const h of HINTS[field]) {
  const i = hs.findIndex(x => x.includes(h) && !bad.some(b => x.includes(b)));
  if (i >= 0) return i;
 }
 return -1;
}

function parseDateCell(v) {
 const s = String(v).trim();
 let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
 if (m) return `${m[1]}-${String(+m[2]).padStart(2, "0")}-${String(+m[3]).padStart(2, "0")}`;
 m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
 if (m) return `${m[3]}-${String(+m[1]).padStart(2, "0")}-${String(+m[2]).padStart(2, "0")}`;
 const d = new Date(s);
 return isNaN(d) ? null : isoOf(d);
}

const numCell = v => {
 const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
 return isFinite(n) ? n : null;
};

const timeCell = v => {
 const m = String(v).match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
 if (!m) return null;
 let h = +m[1];
 const ap = (m[3] || "").toLowerCase();
 if (ap === "pm" && h < 12) h += 12;
 if (ap === "am" && h === 12) h = 0;
 return `${String(h).padStart(2, "0")}:${m[2]}`;
};

function openCsvImport(text) {
 const ta = {
  value: text || ""
 };
 step2();
 function step2() {
  const rows = parseCSV(ta.value);
  if (rows.length < 2) {
   toast("Need a header row and at least one data row.");
   return;
  }
  const headers = rows[0].map(h => h.trim()), data = rows.slice(1);
  let mode = guessCol(headers, "name") >= 0 && guessCol(headers, "kcal") >= 0 ? "food" : "daily";
  const map = {};
  let unit = S.units.weight;
  function renderMap() {
   const fields = mode === "daily" ? [ [ "date", "Date" ], [ "weight", "Scale weight" ], [ "kcal", NUTS[0].label ], [ "p", "Protein" ], [ "c", "Carbs" ], [ "f", "Fat" ] ] : [ [ "date", "Date" ], [ "time", "Time" ], [ "name", "Food" ], [ "amount", "Amount (g)" ], [ "kcal", NUTS[0].label ], [ "p", "Protein" ], [ "c", "Carbs" ], [ "f", "Fat" ] ];
   const preview = el("div", {
    class: "box scrollx"
   });
   const build = () => {
    preview.innerHTML = "";
    const tb = el("table", {
     class: "t"
    });
    tb.appendChild(el("tr", {}, fields.map(([k, l]) => el("th", {
     class: k === "date" || k === "name" || k === "time" ? "" : "n",
     text: l
    }))));
    data.slice(0, 4).forEach(r => tb.appendChild(el("tr", {}, fields.map(([k]) => {
     const i = +map[k].value, raw = i >= 0 ? r[i] : "";
     const txt = k === "date" ? parseDateCell(raw) || "?" : k === "name" || k === "time" ? String(raw || "") : raw === "" || raw === undefined ? "" : String(numCell(raw) ?? "");
     return el("td", {
      class: k === "date" || k === "name" || k === "time" ? "" : "n",
      text: txt
     });
    }))));
    preview.appendChild(tb);
   };
   const grid = el("div", {}, fields.map(([k, l]) => {
    const s = el("select", {}, [ el("option", {
     value: -1,
     text: "— none —"
    }) ].concat(headers.map((h, i) => el("option", {
     value: i,
     text: h
    }))));
    s.value = guessCol(headers, k);
    map[k] = s;
    s.addEventListener("change", build);
    return labelled(l, s, "mb");
   }));
   openModal({
    title: "Match columns",
    body: [ el("div", {
     class: "small muted",
     text: `${data.length} rows, ${headers.length} columns.`
    }), el("label", {
     class: "f"
    }, [ el("span", {
     text: "Shape"
    }), segmented([ [ "daily", "One row per day" ], [ "food", "One row per food" ] ], mode, v => {
     mode = v;
     closeModal();
     renderMap();
    }) ]), mode === "daily" ? el("label", {
     class: "f"
    }, [ el("span", {
     text: "Weight units in the file being imported"
    }), segmented([ [ "lb", "lb" ], [ "kg", "kg" ] ], unit, v => {
     unit = v;
     closeModal();
     renderMap();
    }) ]) : null, grid, el("div", {
     class: "small muted",
     text: "Preview"
    }), preview ],
    footer: [ el("button", {
     class: "btn",
     type: "button",
     text: "Back",
     onclick: closeModal
    }), el("button", {
     class: "btn pri",
     type: "button",
     text: "Import " + data.length + " rows",
     onclick: doImport
    }) ]
   });
   build();
  }
  async function doImport() {
   const gi = k => {
    const i = map[k] ? +map[k].value : -1;
    return i >= 0 ? i : null;
   };
   if (gi("date") === null) {
    toast("Pick the date column.");
    return;
   }
   clearDemo();
   const touched = new Map;
   const grab = iso => {
    if (!touched.has(iso)) {
     const d = editDay(iso);
     if (mode === "food") d.entries = d.entries.filter(e => !e.imp);
     touched.set(iso, d);
    }
    return touched.get(iso);
   };
   let skipped = 0;
   data.forEach(r => {
    const iso = parseDateCell(r[gi("date")]);
    if (!iso) {
     skipped++;
     return;
    }
    const day = grab(iso);
    const num = k => gi(k) !== null ? (numCell(r[gi(k)]) || 0) * (k === "kcal" ? kScale(headers, gi(k)) : 1) : 0;
    if (mode === "daily") {
     if (gi("weight") !== null) {
      const w = numCell(r[gi("weight")]);
      if (w > 0) day.wKg = unit === "lb" ? w / LB : w;
     }
     const k = num("kcal"), p = num("p"), c = num("c"), f = num("f");
     if (k || p || c || f) {
      day.entries = day.entries.filter(e => e.src !== "import-daily");
      day.entries.push({
       id: uid(),
       t: "12:00",
       name: "Imported daily total",
       src: "import-daily",
       g: 0,
       unit: "day",
       qty: 1,
       kcal: k || kcalFromMacros({
        p: p,
        c: c,
        f: f
       }),
       p: p,
       c: c,
       f: f,
       alc: 0
      });
     }
    } else {
     const nm = gi("name") !== null ? String(r[gi("name")]).trim() : "";
     const k = num("kcal"), p = num("p"), c = num("c"), f = num("f");
     if (!nm && !k) {
      skipped++;
      return;
     }
     const g = num("amount");
     day.entries.push({
      id: uid(),
      t: (gi("time") !== null ? timeCell(r[gi("time")]) : null) || "12:00",
      name: nm || "Imported item",
      src: null,
      imp: 1,
      g: g,
      unit: "g",
      qty: g,
      kcal: k || kcalFromMacros({
       p: p,
       c: c,
       f: f
      }),
      p: p,
      c: c,
      f: f,
      alc: 0
     });
    }
   });
   closeModal();
   const list = [ ...touched.values() ];
   list.forEach(d => {
    d.entries.sort((a, b) => a.t < b.t ? -1 : 1);
    DAYS.set(d.d, d);
   });
   lsSave();
   render();
   toast(`Imported ${list.length} days${skipped ? `, skipped ${skipped}` : ""}`);
   await uploadWithProgress(list.map(d => [ "days/" + d.d, d ]));
  }
  renderMap();
 }
}

function exportCSV() {
 const eu = eUnit().toLowerCase();
 const cw = cardioShown();
 const head = [ "date", "scale_weight_" + wUnit(), basisWord() + "_7d_" + wUnit(), eu === "kcal" ? "calories" : "energy_" + eu, "protein_g", "carbs_g", "fat_g" ].concat(cw ? [ cardioWords().short.toLowerCase() + "_" + eu ] : [], [ "items" ]);
 const rows = [ ...DAYS.values() ].sort((a, b) => a.d < b.d ? -1 : 1).map(d => {
  const t = totalsOf(d.entries), tm = trailingMedian(d.d, 7, 2);
  const rk = [ ...RIDES.values() ].filter(r => r.d === d.d).reduce((s, r) => s + (r.kcal || 0), 0);
  return [ d.d, d.wKg ? r2(kgToDisp(d.wKg)) : "", tm ? r2(kgToDisp(tm.med)) : "", r1(eDisp(t.kcal)), r1(t.p), r1(t.c), r1(t.f) ].concat(cw ? [ rk ? r0(eDisp(rk)) : "" ] : [], [ d.entries.length ]);
 });
 return [ head ].concat(rows).map(r => r.map(c => {
  const s = String(c ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
 }).join(",")).join("\n");
}

async function download(filename, text) {
 const dl = await claudeUse("downloads");
 if (dl) {
  try {
   await dl.save({
    filename: filename,
    data: text
   });
   toast("Saved " + filename);
   return;
  } catch (e) {
   if (e && e.code === "cancelled") return;
  }
 }
 const ta = el("textarea", {
  class: "tall-x"
 });
 ta.value = text;
 openModal({
  title: filename,
  body: [ el("div", {
   class: "small muted",
   text: "Downloads unavailable here — select all and copy."
  }), ta ],
  footer: [ el("button", {
   class: "btn pri",
   type: "button",
   text: "Copy",
   onclick: () => {
    ta.select();
    document.execCommand("copy");
    toast("Copied");
   }
  }) ]
 });
}

const BACKUP_V = 4;

const BACKUP_PARTS = [ [ "days", () => DAYS, d => d.d ], [ "foods", () => FOODS, f => f.id ], [ "recipes", () => RECIPES, r => r.id ], [ "rides", () => RIDES, r => r.id ], [ "presets", () => PRESETS, p => p.id ], [ "exercises", () => EXERCISES, x => x.id ], [ "wplans", () => WPLANS, p => p.id ], [ "workouts", () => WORKOUTS, w => w.id ], [ "photos", () => PHOTOS, p => p.d ] ];

function photoIds() {
 const out = [];
 PHOTOS.forEach(rec => Object.values(rec.shots || {}).forEach(sh => {
  if (sh && sh.id) out.push(sh.id);
 }));
 return out;
}

async function buildBackup(withPix, onProgress) {
 const out = {
  app: "squid",
  version: BACKUP_V,
  exported: (new Date).toISOString(),
  settings: S
 };
 BACKUP_PARTS.forEach(([name, map]) => {
  out[name] = [ ...map().values() ];
 });
 out.pix = [];
 if (withPix) {
  const ids = photoIds();
  for (let i = 0; i < ids.length; i++) {
   if (onProgress) onProgress(i + 1, ids.length);
   const img = await pixGet(ids[i]);
   if (img) out.pix.push({
    id: ids[i],
    img: img
   });
  }
 }
 return out;
}

function backupCounts(b) {
 const n = {};
 BACKUP_PARTS.forEach(([name]) => {
  n[name] = Array.isArray(b[name]) ? b[name].length : 0;
 });
 n.pix = Array.isArray(b.pix) ? b.pix.length : 0;
 return n;
}

async function restoreBackup(b, mode) {
 clearDemo();
 const replace = mode === "replace";
 if (replace) {
  BACKUP_PARTS.forEach(([, map]) => map().clear());
  PIXMEM.clear();
 }
 if (b.settings && replace) S = migrateSettings(b.settings);
 let written = 0;
 for (const [name, map, idOf] of BACKUP_PARTS) {
  const rows = Array.isArray(b[name]) ? b[name] : [];
  for (const raw of rows) {
   const rec = name === "days" ? migrateDay(raw) : name === "foods" ? migrateFood(raw) : name === "exercises" ? migrateExercise(thaw(raw)) : name === "rides" ? migrateRide(thaw(raw)) : thaw(raw);
   const id = idOf(rec);
   if (!id) continue;
   if (!replace && map().has(id)) continue;
   map().set(id, rec);
   written++;
  }
 }
 for (const px of Array.isArray(b.pix) ? b.pix : []) {
  if (!px || !px.id || !px.img) continue;
  if (!replace && PIXMEM.has(px.id)) continue;
  await pixPut(px.id, px.img);
 }
 lsSave();
 photoSave();
 lsFlush();
 applyLook();
 render();
 const items = [];
 for (const [name, map, idOf] of BACKUP_PARTS) map().forEach(v => items.push([ name + "/" + idOf(v), thaw(v) ]));
 if (replace) items.push([ "settings/main", {
  ...S
 } ]);
 await uploadWithProgress(items);
 return written;
}

function openRestore() {
 const file = el("input", {
  type: "file",
  accept: ".json,application/json"
 });
 const status = el("div", {});
 let parsed = null;
 const go1 = el("button", {
  class: "btn pri",
  type: "button",
  text: "Restore",
  disabled: ""
 });
 const fill1 = el("button", {
  class: "btn",
  type: "button",
  text: "Add what's missing",
  disabled: "",
  onclick: () => {
   if (parsed) run("fill");
  }
 });
 file.addEventListener("change", async () => {
  const f = file.files[0];
  if (!f) return;
  parsed = null;
  go1.disabled = true;
  fill1.disabled = true;
  status.innerHTML = "";
  status.appendChild(el("div", {
   class: "box pad bar"
  }, [ el("span", {
   class: "spin"
  }), el("span", {
   class: "small muted",
   text: "Reading " + f.name + "…"
  }) ]));
  try {
   const b = JSON.parse(await f.text());
   if (!b || typeof b !== "object" || !Array.isArray(b.days)) throw new Error("shape");
   parsed = b;
   const n = backupCounts(b);
   status.innerHTML = "";
   status.appendChild(el("div", {
    class: "box pad"
   }, [ el("div", {
    class: "big mono",
    text: String(n.days)
   }), el("div", {
    class: "small muted",
    text: "days in this file" + (b.exported ? ", saved " + fmtDate(b.exported.slice(0, 10), true) : "")
   }), el("hr", {
    class: "hr mt"
   }), kv("Sessions and plans", `${n.workouts} · ${n.wplans}`), kv("Exercises", String(n.exercises)), kv(capFirst(cardioWords().many) + " and presets", `${n.rides} · ${n.presets}`), kv("Foods and recipes", `${n.foods} · ${n.recipes}`), kv("Photos", n.pix ? `${n.photos} sessions, ${n.pix} pictures` : `${n.photos} sessions, thumbnails only`) ]));
   go1.disabled = false;
   fill1.disabled = false;
  } catch (e) {
   status.innerHTML = "";
   status.appendChild(el("div", {
    class: "note",
    text: "That is not a Squid backup file."
   }));
  }
 });
 const run = async mode => {
  closeModal();
  const n = await restoreBackup(parsed, mode);
  toast(mode === "replace" ? `Restored ${n} records` : `Added ${n} records that were missing`);
 };
 openModal({
  title: "Restore a backup",
  body: [ filePicker(file, "Choose a backup"), status ],
  footer: [ fill1, go1 ]
 });
 go1.addEventListener("click", () => {
  if (!parsed) return;
  const n = backupCounts(parsed);
  confirmed("Replace everything?", `Everything on this device is discarded and the file's ${n.days} days, ` + `${n.workouts} sessions and ${n.foods} foods take its place. There is no undo.`, () => run("replace"), "Replace everything");
 });
}

VIEWS.data = function viewData() {
 const root = $("#p-data");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 const fp = lsFootprint();
 root.appendChild(sec("What's stored", null, [ el("div", {
  class: "box pad"
 }, [ kv("Days", String(DAYS.size)), kv("Weigh-ins", String(weighIns().length)), cardioShown() ? kv(capFirst(cardioWords().many), String(RIDES.size)) : null, kv("Sessions and plans", `${WORKOUTS.size} · ${WPLANS.size}`), kv("My foods / recipes", `${FOODS.size} / ${RECIPES.size}`), kv("Presets", String(PRESETS.size)), kv("Photo sessions", String(PHOTOS.size) + photoBytesNote()), kv("Sync", DB ? "your account" : "this browser only"), kv("On this device", DEMO ? "sample data, not kept" : `${Math.round(fp.bytes / 1024)} KB in ${fp.shards} piece${fp.shards === 1 ? "" : "s"}`), fp.full ? el("div", {
  class: "note mt",
  text: DB ? "This device's offline copy is full. Your account still has everything; older months just are not cached here." : "Storage is full and new entries are not being saved on this device. Export a backup now."
 }) : null ].filter(Boolean)) ]));
 root.appendChild(sec("Import", null, [ el("div", {
  class: "box pad"
 }, [ el("button", {
  class: "btn pri wide",
  type: "button",
  text: "Import from MacroFactor",
  onclick: openImport
 }), el("div", {
  class: "small muted mt",
  text: ".xlsx or CSV"
 }), el("button", {
  class: "btn wide mt",
  type: "button",
  text: "Restore a Squid backup",
  onclick: openRestore
 }) ]) ]));
 root.appendChild(sec("Export", null, [ el("div", {
  class: "box pad"
 }, [ el("button", {
  class: "btn wide",
  type: "button",
  text: "Daily summary CSV",
  onclick: () => download("squid-daily.csv", exportCSV())
 }), el("button", {
  class: "btn pri wide mt",
  type: "button",
  text: "Full backup",
  onclick: () => saveBackup(true)
 }), el("button", {
  class: "btn wide mt",
  type: "button",
  text: "Backup without photos",
  onclick: () => saveBackup(false)
 }), el("div", {
  class: "small muted mt",
  text: photoIds().length ? `${photoIds().length} pictures make the full file large; the smaller one keeps everything else.` : "Everything: days, food, cardio, sessions, plans, exercises and settings."
 }) ]) ]));
 root.appendChild(sec("Phone", null, [ el("div", {
  class: "note",
  text: "Share → Add to Home Screen"
 }) ]));
 root.appendChild(sec("Reset", null, [ el("button", {
  class: "btn bad wide",
  type: "button",
  text: "Erase everything",
  onclick: confirmErase
 }) ]));
};

async function saveBackup(withPix) {
 const line = el("div", {
  class: "box pad bar"
 }, [ el("span", {
  class: "spin"
 }), el("span", {
  class: "small muted",
  text: "Gathering…"
 }) ]);
 let open = false;
 if (withPix && photoIds().length) {
  open = true;
  openModal({
   title: "Full backup",
   body: [ line ],
   footer: []
  });
 }
 const b = await buildBackup(withPix, (i, n) => {
  line.lastChild.textContent = `Picture ${i} of ${n}…`;
 });
 if (open) closeModal();
 const stamp = (new Date).toISOString().slice(0, 10);
 await download(`squid-backup-${stamp}.json`, JSON.stringify(b));
}

function confirmErase() {
 openModal({
  title: "Erase everything?",
  body: [ el("div", {
   class: "note",
   text: "Every record goes: weigh-ins, food, workouts, plans, cardio, foods, recipes and photographs. Settings stay. There is no undo."
  }) ],
  footer: [ el("button", {
   class: "btn",
   type: "button",
   text: "Cancel",
   onclick: closeModal
  }), holdButton("Erase everything", async () => {
   closeModal();
   await eraseAll();
  }) ]
 });
}

async function eraseAll() {
 const paths = [];
 Object.entries(COLLMAP).forEach(([c, m]) => m.forEach((v, id) => {
  if (c === "exercises" && v && v.seed) return;
  paths.push(c + "/" + id);
 }));
 const px = [];
 PHOTOS.forEach(rec => Object.values(rec.shots || {}).forEach(sh => {
  if (sh && sh.id) px.push(sh.id);
 }));
 px.forEach(id => {
  paths.push("pix/" + id);
  idbDel(id);
 });
 if (STASH) Object.values(STASH.maps).forEach(m => m.clear());
 STASH = null;
 DEMO = false;
 Object.values(COLLMAP).forEach(m => m.clear());
 PIXMEM.clear();
 PLATE = {
  items: [],
  t: null
 };
 PENDING.clear();
 lsWipe();
 try {
  localStorage.removeItem(PKEY);
 } catch (e) {}
 seedExercises();
 lsSave();
 lsFlush();
 render();
 toast("Erased");
 if (DB) {
  busyToast("Erasing", 0, paths.length);
  await delMany(paths, (i, n) => busyToast("Erasing", i, n));
  busyToast(null);
  seedExercises();
  lsSave("exercises");
  render();
 }
}

const groupOf = k => SETGROUPS.find(g => g.k === k);

const OBSTEPS = [ {
 k: "track",
 name: "What you track",
 body: root => groupOf("track").body(root)
}, {
 k: "units",
 name: "Units and the week",
 body: root => groupOf("units").body(root)
}, {
 k: "weight",
 name: "Bodyweight",
 when: () => tracks("weight") || tracks("cardio"),
 body: weighStep
}, {
 k: "history",
 name: "History",
 full: true,
 when: () => tracks("food"),
 body: historyStep
}, {
 k: "goal",
 name: "Goal and targets",
 when: () => tracks("food") || tracks("weight"),
 body: root => ONB.full ? groupOf("targets").body(root) : goalBlock(root)
}, {
 k: "strength",
 name: "Strength",
 when: () => tracks("strength"),
 body: root => ONB.full ? trainBlock(root) : styleBlock(root)
}, {
 k: "cardio",
 name: "Cardio",
 when: () => tracks("cardio"),
 body: root => {
  cardioBlock(root, !ONB.full);
  if (ONB.full) rideBlock(root);
 }
} ];

const obSteps = () => OBSTEPS.filter(st => (ONB.full || !st.full) && (!st.when || st.when()));

function weighStep(root) {
 const i = el("input", {
  type: "number",
  min: "0",
  step: "0.1",
  inputmode: "decimal",
  value: ONB.wt,
  placeholder: "—",
  "aria-label": "Bodyweight in " + wUnit()
 });
 i.addEventListener("input", () => {
  ONB.wt = i.value;
 });
 root.appendChild(sec(null, null, [ el("div", {
  class: "box pad"
 }, [ labelled("Today (" + wUnit() + ")", i) ]) ]));
}

function historyStep(root) {
 root.appendChild(sec(null, null, [ el("div", {
  class: "box"
 }, [ emptyAdd("Import from MacroFactor", openImport) ]) ]));
}

function openOnboarding(o) {
 o = o || {};
 if (ONB) return;
 ONB = {
  at: -1,
  full: false,
  mock: !!o.mock,
  wt: ""
 };
 document.body.appendChild(el("div", {
  id: "onb",
  class: "onb",
  role: "dialog",
  "aria-modal": "true",
  "aria-label": "Set up"
 }));
 document.body.classList.add("onboarding");
 paintOnboard();
}

function onbClose() {
 const n = document.getElementById("onb");
 if (n) n.remove();
 document.body.classList.remove("onboarding");
 ONB = null;
}

function paintOnboard() {
 const n = document.getElementById("onb");
 if (!n || !ONB) return;
 const old = n.querySelector(".onb-body"), keep = old && old.dataset.at === String(ONB.at) ? old.scrollTop : 0;
 n.innerHTML = "";
 const inner = el("div", {
  class: "onb-in"
 });
 n.appendChild(inner);
 const go = at => {
  ONB.at = at;
  paintOnboard();
 };
 if (ONB.at < 0) {
  inner.appendChild(el("div", {
   class: "onb-body onb-hello",
   "data-at": "-1"
  }, [ el("div", {
   class: "wm",
   text: "Squid"
  }), el("div", {
   class: "onb-acts"
  }, [ el("button", {
   class: "btn pri wide",
   type: "button",
   text: "Quick setup",
   onclick: () => {
    ONB.full = false;
    go(0);
   }
  }), el("button", {
   class: "btn wide",
   type: "button",
   text: "Full setup",
   onclick: () => {
    ONB.full = true;
    go(0);
   }
  }), el("button", {
   class: "btn wide",
   type: "button",
   text: "Skip",
   onclick: onbFinish
  }) ]) ]));
  return;
 }
 const steps = obSteps();
 if (ONB.at >= steps.length) ONB.at = steps.length - 1;
 const st = steps[ONB.at], last = ONB.at === steps.length - 1;
 inner.appendChild(el("div", {
  class: "onb-top"
 }, [ backLink(() => go(ONB.at - 1)), el("span", {
  class: "onb-dots",
  "aria-label": `Step ${ONB.at + 1} of ${steps.length}`
 }, steps.map((x, i) => el("span", {
  class: "dot" + (i === ONB.at ? " on" : i < ONB.at ? " done" : "")
 }))), el("button", {
  class: "btn sm",
  type: "button",
  text: "Skip",
  onclick: onbFinish
 }) ]));
 const body = el("div", {
  class: "onb-body",
  "data-at": String(ONB.at),
  "data-k": st.k
 }, [ el("h2", {
  class: "onb-q",
  text: st.name
 }) ]);
 st.body(body);
 body.querySelectorAll(".sec > h2").forEach(h => {
  if (h.textContent.trim().toLowerCase() === st.name.toLowerCase()) h.remove();
 });
 inner.appendChild(body);
 inner.appendChild(el("div", {
  class: "onb-foot"
 }, [ el("button", {
  class: "btn pri wide",
  type: "button",
  text: last ? "Done" : "Next",
  onclick: () => last ? onbFinish() : go(ONB.at + 1)
 }) ]));
 if (keep) body.scrollTop = keep;
}

function onbFinish() {
 const o = ONB, v = parseFloat(o.wt), kg = v > 0 ? dispToKg(v) : null;
 if (o.mock) {
  const lines = settingsDiff(MOCK.S, S);
  if (kg) lines.push([ "First weigh-in", fmtW(kg) + " " + wUnit() ]);
  onbClose();
  mockLeave();
  openModal({
   title: "The replay would set",
   body: [ el("div", {
    class: "box rows"
   }, lines.length ? lines.map(([k, val]) => row({
    t1: k,
    val: val
   })) : [ row({
    t1: "Nothing",
    val: "—"
   }) ]) ]
  });
  return;
 }
 onbClose();
 if (kg) saveDay({
  ...getDay(todayISO()),
  wKg: kg,
  wT: nowHM()
 });
 S.onboarded = true;
 saveSettings();
 goRoot("dash");
}

function settingsDiff(a, b) {
 const flat = (o, pre, out) => {
  Object.keys(o || {}).forEach(k => {
   const v = o[k], p = pre ? pre + "." + k : k;
   if (isObj(v)) flat(v, p, out); else out[p] = JSON.stringify(v);
  });
  return out;
 };
 const fa = flat(a, "", {}), fb = flat(b, "", {});
 return Object.keys(fb).filter(k => fa[k] !== fb[k] && k !== "onboarded").sort().map(k => [ k, fb[k] ]);
}
