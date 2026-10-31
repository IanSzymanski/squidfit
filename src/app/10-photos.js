const SLOTS = [ [ "front", "Front" ], [ "side", "Side" ], [ "back", "Back" ] ];

const SLOT_PARTS = {
 front: [ "chest", "fdelts", "sdelts", "biceps", "forearms" ],
 side: [ "chest", "fdelts", "sdelts", "biceps", "triceps" ],
 back: [ "rdelts", "lats", "midback", "traps" ]
};

const SLOTNAME = {
 front: "Front",
 side: "Side",
 back: "Back"
};

const PW = 900, PH = 1200, PQ = .68;

const PIXCAP = 25e4;

function fitCrop(bmp, r) {
 let q = PQ, img = renderCrop(bmp, r, PW, PH, q);
 while (img.length > PIXCAP && q > .3) {
  q -= .08;
  img = renderCrop(bmp, r, PW, PH, q);
 }
 return img;
}

const TW = 168, TH = 224, TQ = .55;

async function loadBitmap(file) {
 if (window.createImageBitmap) {
  try {
   return await createImageBitmap(file, {
    imageOrientation: "from-image"
   });
  } catch (e) {}
 }
 return new Promise((res, rej) => {
  const url = URL.createObjectURL(file), im = new Image;
  im.onload = () => {
   URL.revokeObjectURL(url);
   res(im);
  };
  im.onerror = () => {
   URL.revokeObjectURL(url);
   rej(new Error("decode"));
  };
  im.src = url;
 });
}

const bmpW = b => b.width || b.naturalWidth;

const bmpH = b => b.height || b.naturalHeight;

function cropRect(bmp, zoom, cx, cy) {
 const iw = bmpW(bmp), ih = bmpH(bmp);
 let sw, sh;
 if (iw / ih > PW / PH) {
  sh = ih;
  sw = ih * PW / PH;
 } else {
  sw = iw;
  sh = iw * PH / PW;
 }
 sw /= zoom;
 sh /= zoom;
 const x = clamp(cx - sw / 2, 0, Math.max(0, iw - sw));
 const y = clamp(cy - sh / 2, 0, Math.max(0, ih - sh));
 return {
  x: x,
  y: y,
  w: sw,
  h: sh
 };
}

function renderCrop(bmp, r, w, h, q) {
 const cv = document.createElement("canvas");
 cv.width = w;
 cv.height = h;
 const g = cv.getContext("2d");
 g.imageSmoothingQuality = "high";
 g.drawImage(bmp, r.x, r.y, r.w, r.h, 0, 0, w, h);
 return cv.toDataURL("image/jpeg", q);
}

function openCrop(bmp, onDone) {
 const iw = bmpW(bmp), ih = bmpH(bmp);
 let zoom = 1, cx = iw / 2, cy = ih / 2;
 const cv = el("canvas", {
  class: "cropcv",
  width: 300,
  height: 400
 });
 const g = cv.getContext("2d");
 const zin = el("input", {
  type: "range",
  min: "1",
  max: "3",
  step: "0.02",
  value: "1",
  "aria-label": "Zoom",
  "aria-valuetext": "1.0 times"
 });
 const note = el("div", {
  class: "small muted mid"
 });
 const draw = () => {
  const r = cropRect(bmp, zoom, cx, cy);
  cx = r.x + r.w / 2;
  cy = r.y + r.h / 2;
  g.fillStyle = "#000";
  g.fillRect(0, 0, cv.width, cv.height);
  g.imageSmoothingQuality = "high";
  g.drawImage(bmp, r.x, r.y, r.w, r.h, 0, 0, cv.width, cv.height);
  note.textContent = `${iw}×${ih} → ${PW}×${PH}`;
 };
 let live = false, sx = 0, sy = 0, ox = 0, oy = 0;
 cv.addEventListener("pointerdown", ev => {
  live = true;
  sx = ev.clientX;
  sy = ev.clientY;
  ox = cx;
  oy = cy;
  try {
   cv.setPointerCapture(ev.pointerId);
  } catch (e) {}
 });
 cv.addEventListener("pointermove", ev => {
  if (!live) return;
  ev.preventDefault();
  const r = cropRect(bmp, zoom, cx, cy);
  const box = cv.getBoundingClientRect();
  cx = ox - (ev.clientX - sx) * (r.w / (box.width || cv.width));
  cy = oy - (ev.clientY - sy) * (r.h / (box.height || cv.height));
  draw();
 });
 const stop = () => {
  live = false;
 };
 cv.addEventListener("pointerup", stop);
 cv.addEventListener("pointercancel", stop);
 zin.addEventListener("input", () => {
  zoom = +zin.value;
  zin.setAttribute("aria-valuetext", zoom.toFixed(1) + " times");
  draw();
 });
 const use = () => {
  const r = cropRect(bmp, zoom, cx, cy);
  const img = fitCrop(bmp, r);
  const thumb = renderCrop(bmp, r, TW, TH, TQ);
  closeModal();
  onDone({
   img: img,
   thumb: thumb,
   w: PW,
   h: PH,
   bytes: img.length
  });
 };
 openModal({
  guard: true,
  title: "Frame it",
  body: [ el("div", {
   class: "cropwrap"
  }, [ cv ]), el("div", {
   class: "bar"
  }, [ el("span", {
   class: "cap",
   text: "Zoom"
  }), zin ]), note ],
  footer: [ el("button", {
   class: "btn pri",
   type: "button",
   text: "Use this",
   onclick: use
  }) ]
 });
 draw();
}

function openPhotoAdd(iso, slot) {
 let day = iso || SELDATE;
 let which = slot || "front";
 const dIn = el("input", {
  type: "date",
  value: day,
  max: todayISO()
 });
 const status = el("div", {});
 const file = el("input", {
  type: "file",
  accept: "image/*"
 });
 const cam = el("input", {
  type: "file",
  accept: "image/*",
  capture: "environment",
  class: "hide"
 });
 const camBtn = el("button", {
  class: "btn wide",
  type: "button",
  onclick: () => cam.click()
 }, [ icon("camera"), el("span", {
  text: "Take a photo"
 }) ]);
 const seg = el("div", {
  class: "seg"
 });
 const paintSeg = () => {
  seg.innerHTML = "";
  SLOTS.forEach(([k, label]) => {
   const has = !!(photoDay(dIn.value || day).shots || {})[k];
   seg.appendChild(el("button", {
    type: "button",
    "aria-pressed": k === which ? "true" : "false",
    onclick: () => {
     which = k;
     paintSeg();
    }
   }, [ el("span", {
    text: label + (has ? " ✓" : "")
   }) ]));
  });
 };
 dIn.addEventListener("change", paintSeg);
 const takeFile = async src => {
  const f = src.files && src.files[0];
  if (!f) return;
  status.innerHTML = "";
  status.appendChild(el("div", {
   class: "box pad bar"
  }, [ el("span", {
   class: "spin"
  }), el("span", {
   class: "small muted",
   text: "Opening …"
  }) ]));
  let bmp;
  try {
   bmp = await loadBitmap(f);
  } catch (e) {
   status.innerHTML = "";
   status.appendChild(el("div", {
    class: "note",
    text: "That file couldn't be read as an image."
   }));
   return;
  }
  status.innerHTML = "";
  const target = dIn.value || day, k = which;
  closeModal();
  openCrop(bmp, async out => {
   const id = "px" + uid();
   const rec = photoDay(target);
   const next = {
    d: target,
    shots: {
     ...rec.shots || {}
    }
   };
   const prev = next.shots[k];
   next.shots[k] = {
    id: id,
    w: out.w,
    h: out.h,
    thumb: out.thumb,
    ts: Date.now()
   };
   await pixPut(id, out.img);
   if (prev && prev.id) pixDel(prev.id);
   savePhotoDay(next);
   SELDATE = target;
   toast(SLOTNAME[k] + " saved, " + Math.round(out.bytes / 1024) + " KB");
   const missing = SLOTS.filter(([s]) => !next.shots[s]);
   if (missing.length) openPhotoAdd(target, missing[0][0]); else go("photos");
  });
 };
 file.addEventListener("change", () => takeFile(file));
 cam.addEventListener("change", () => takeFile(cam));
 openModal({
  title: "Add a photo",
  body: [ labelled("Day", dIn), labelled("View", seg), camBtn, cam, filePicker(file, "Choose from your photos", "cam"), status ]
 });
 paintSeg();
}

function photoFrame(shot, opts) {
 const o = opts || {};
 const box = el("div", {
  class: "pframe" + (o.small ? " sm" : "")
 });
 if (!shot) {
  box.classList.add("none");
  box.appendChild(el("span", {
   class: "small muted",
   text: o.label || "—"
  }));
  return box;
 }
 const im = el("img", {
  src: shot.thumb,
  alt: o.alt || "Progress photo",
  class: "blur"
 });
 box.appendChild(im);
 if (o.caption) box.appendChild(el("span", {
  class: "pcap",
  text: o.caption
 }));
 box.setImage = src => {
  im.src = src;
  im.classList.remove("blur");
 };
 pixGet(shot.id).then(src => {
  if (src) box.setImage(src);
 });
 return box;
}

function openPhotoView(iso, slot) {
 const rec = photoDay(iso);
 let which = slot || SLOTS.find(([k]) => rec.shots && rec.shots[k])[0];
 const host = el("div", {});
 const paint = () => {
  const cur = photoDay(iso);
  const shot = (cur.shots || {})[which];
  host.innerHTML = "";
  const seg = el("div", {
   class: "seg"
  });
  SLOTS.forEach(([k, label]) => {
   const has = !!(cur.shots || {})[k];
   seg.appendChild(el("button", {
    type: "button",
    "aria-pressed": k === which ? "true" : "false",
    class: has ? null : "off",
    onclick: () => {
     which = k;
     paint();
    }
   }, [ el("span", {
    text: label
   }) ]));
  });
  host.appendChild(seg);
  host.appendChild(photoFrame(shot, {
   alt: SLOTNAME[which] + " on " + fmtDate(iso, true),
   label: "No " + SLOTNAME[which].toLowerCase() + " photo for this day"
  }));
  const ctx = photoContext(iso, which);
  if (ctx.length) host.appendChild(el("div", {
   class: "box pad mt"
  }, ctx.map(c => kv(c.k, c.v))));
  host.appendChild(el("div", {
   class: "wrap"
  }, [ el("button", {
   class: "btn sm",
   type: "button",
   text: shot ? "Replace" : "Add",
   onclick: () => {
    closeModal();
    openPhotoAdd(iso, which);
   }
  }), shot ? holdButton("Delete", () => {
   const cur2 = photoDay(iso);
   const gone = cur2.shots[which];
   const next = {
    d: iso,
    shots: {
     ...cur2.shots
    }
   };
   delete next.shots[which];
   savePhotoDay(next);
   pixDel(gone.id);
   toast(SLOTNAME[which] + " deleted");
   if (!Object.keys(next.shots).length) closeModal(); else paint();
  }, {
   cls: "sm"
  }) : null ].filter(Boolean)));
 };
 openModal({
  title: fmtDate(iso, true),
  body: [ host ]
 });
 paint();
}

function openScrub(slot) {
 let which = slot || "front";
 const host = el("div", {});
 const paint = () => {
  const series = photoSeries(which);
  host.innerHTML = "";
  const seg = el("div", {
   class: "seg"
  });
  SLOTS.forEach(([k, label]) => {
   const n = photoSeries(k).length;
   seg.appendChild(el("button", {
    type: "button",
    "aria-pressed": k === which ? "true" : "false",
    onclick: () => {
     which = k;
     paint();
    }
   }, [ el("span", {
    text: label + " " + n
   }) ]));
  });
  host.appendChild(seg);
  if (!series.length) {
   host.appendChild(el("div", {
    class: "box empty",
    text: "No " + SLOTNAME[which].toLowerCase() + " photos yet."
   }));
   return;
  }
  let i = series.length - 1;
  const frame = el("div", {
   class: "pframe"
  });
  const im = el("img", {
   src: series[i].shot.thumb,
   alt: "Progress photo",
   class: "blur"
  });
  frame.appendChild(im);
  const cap = el("div", {
   class: "scrubcap"
  });
  const slider = el("input", {
   type: "range",
   min: "0",
   max: String(series.length - 1),
   step: "1",
   value: String(i),
   "aria-label": SLOTNAME[which] + " photos over time"
  });
  let token = 0;
  const show = async k => {
   i = clamp(k, 0, series.length - 1);
   const s = series[i];
   const mine = ++token;
   im.src = s.shot.thumb;
   im.classList.add("blur");
   cap.textContent = fmtDate(s.d, true) + weightSuffix(s.d);
   slider.setAttribute("aria-valuetext", fmtDate(s.d, true));
   const full = await pixGet(s.shot.id);
   if (full && mine === token) {
    im.src = full;
    im.classList.remove("blur");
   }
   [ series[i - 1], series[i + 1], series[i + 2] ].forEach(n => n && pixGet(n.shot.id));
  };
  slider.addEventListener("input", () => show(+slider.value));
  host.appendChild(frame);
  host.appendChild(cap);
  host.appendChild(slider);
  host.appendChild(el("div", {
   class: "wrap between"
  }, [ el("span", {
   class: "small muted",
   text: fmtDate(series[0].d)
  }), el("span", {
   class: "small muted",
   text: series.length + " sessions"
  }), el("span", {
   class: "small muted",
   text: fmtDate(series[series.length - 1].d)
  }) ]));
  show(i);
 };
 openModal({
  title: "Scrub",
  body: [ host ]
 });
 paint();
}

function photoBytesNote() {
 let shots = 0;
 PHOTOS.forEach(rec => {
  shots += Object.keys(rec.shots || {}).length;
 });
 return shots ? "  (" + shots + " photo" + (shots === 1 ? "" : "s") + ")" : "";
}

function weightSuffix(iso) {
 const m = trailingMedian(iso, 7, 2);
 if (m) return "  ·  " + fmtW(m.med) + " " + wUnit();
 const d = DAYS.get(iso);
 return d && d.wKg > 0 ? "  ·  " + fmtW(d.wKg) + " " + wUnit() : "";
}

function photoContext(iso, slot) {
 const out = [];
 const m = trailingMedian(iso, 7, 2);
 if (m) out.push({
  k: basisTitle() + " weight",
  v: fmtW(m.med) + " " + wUnit() + "  (of " + m.n + ")"
 }); else {
  const d = DAYS.get(iso);
  if (d && d.wKg > 0) out.push({
   k: "Scale weight",
   v: fmtW(d.wKg) + " " + wUnit()
  });
 }
 const want = SLOT_PARTS[slot] || null;
 const tops = new Map;
 WORKOUTS.forEach(w => {
  const back = daysBetween(w.d, iso);
  if (back < 0 || back >= 7) return;
  (w.sets || []).forEach(s => {
   const ex = exById(s.exId);
   if (!ex) return;
   exParts(ex).forEach(({k: k, share: share}) => {
    if (want && !want.includes(k)) return;
    const cur = tops.get(k) || {
     top: 0,
     eff: 0
    };
    if (share >= 1) cur.top = Math.max(cur.top, s.w || 0);
    cur.eff += setScore(s) * share;
    tops.set(k, cur);
   });
  });
 });
 (want || [ ...tops.keys() ]).forEach(k => {
  const v = tops.get(k);
  if (!v) return;
  out.push({
   k: partName(k),
   v: (v.top ? fmtLoad(v.top) + " " + loadUnit() + "  ·  " : "") + fmtMetric(v.eff)
  });
 });
 return out;
}

function openCompare(slot) {
 let which = slot || "front";
 const host = el("div", {});
 let a = null, b = null;
 const paint = () => {
  const series = photoSeries(which);
  host.innerHTML = "";
  const seg = el("div", {
   class: "seg"
  });
  SLOTS.forEach(([k, label]) => {
   seg.appendChild(el("button", {
    type: "button",
    "aria-pressed": k === which ? "true" : "false",
    onclick: () => {
     which = k;
     a = b = null;
     paint();
    }
   }, [ el("span", {
    text: label
   }) ]));
  });
  host.appendChild(seg);
  if (series.length < 2) {
   host.appendChild(el("div", {
    class: "box empty",
    text: "Two " + SLOTNAME[which].toLowerCase() + " photos are needed to compare."
   }));
   return;
  }
  if (a === null || !series.some(s => s.d === a)) a = series[0].d;
  if (b === null || !series.some(s => s.d === b)) b = series[series.length - 1].d;
  const pickFor = (val, set) => {
   const sel = el("select", {
    "aria-label": "Date"
   }, series.map(s => el("option", {
    value: s.d,
    text: fmtDate(s.d),
    selected: s.d === val ? "" : null
   })));
   sel.addEventListener("change", () => {
    set(sel.value);
    paint();
   });
   return sel;
  };
  const shotOn = d => (photoDay(d).shots || {})[which];
  host.appendChild(el("div", {
   class: "cmp"
  }, [ el("div", {}, [ photoFrame(shotOn(a), {
   alt: "Earlier",
   caption: fmtDate(a) + weightSuffix(a)
  }), pickFor(a, v => {
   a = v;
  }) ]), el("div", {}, [ photoFrame(shotOn(b), {
   alt: "Later",
   caption: fmtDate(b) + weightSuffix(b)
  }), pickFor(b, v => {
   b = v;
  }) ]) ]));
  const gap = daysBetween(a, b);
  if (gap) host.appendChild(el("div", {
   class: "small muted mid",
   text: Math.abs(gap) + " days apart" + weightGap(a, b)
  }));
 };
 openModal({
  title: "Compare",
  body: [ host ]
 });
 paint();
}

function weightGap(a, b) {
 const x = DAYS.get(a), y = DAYS.get(b);
 if (!(x && x.wKg > 0 && y && y.wKg > 0)) return "";
 return "  ·  " + signedW(y.wKg - x.wKg) + " " + wUnit();
}

VIEWS.photos = function viewPhotos() {
 const root = $("#p-photos");
 root.innerHTML = "";
 const dates = photoDates().reverse();
 root.appendChild(pageBar([ dates.length ? el("button", {
  class: "btn sm",
  type: "button",
  text: "Add",
  onclick: () => openPhotoAdd(todayISO())
 }) : null ]));
 if (!dates.length) {
  const a = firstAct("photos");
  root.appendChild(el("div", {
   class: "sec"
  }, [ el("div", {
   class: "box"
  }, [ emptyAdd(a.text, a.fn) ]) ]));
  return;
 }
 root.appendChild(el("div", {
  class: "sec bar"
 }, [ el("button", {
  class: "btn grow",
  type: "button",
  text: "Scrub",
  onclick: () => openScrub()
 }), el("button", {
  class: "btn grow",
  type: "button",
  text: "Compare",
  onclick: () => openCompare()
 }) ]));
 let month = null;
 const stream = el("div", {
  class: "sec"
 });
 dates.forEach(iso => {
  const m = iso.slice(0, 7);
  if (m !== month) {
   month = m;
   stream.appendChild(el("div", {
    class: "grouphd loose"
   }, [ el("span", {
    text: parseISO(m + "-01").toLocaleDateString(undefined, {
     month: "long",
     year: "numeric"
    })
   }) ]));
  }
  const rec = PHOTOS.get(iso);
  stream.appendChild(row({
   cls: "card",
   label: "Photos from " + fmtDate(iso, true),
   onclick: () => openPhotoView(iso),
   mark: el("span", {
    class: "pshots"
   }, SLOTS.map(([k, label]) => photoFrame(rec.shots[k], {
    small: true,
    label: label,
    alt: label
   }))),
   t1: el("span", {
    class: "t1 bar"
   }, [ el("span", {
    class: "grow",
    text: fmtDate(iso, true)
   }), chevron() ]),
   t2: SLOTS.filter(([k]) => rec.shots[k]).map(([, l]) => l).join(", ") + weightSuffix(iso)
  }));
 });
 root.appendChild(stream);
};
