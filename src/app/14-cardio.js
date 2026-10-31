function presetLabel(p) {
 const e = cardioEnergy({
  mod: modOf(p),
  d: todayISO(),
  secs: p.secs,
  avgW: p.avgW,
  met: p.met
 });
 return [ secsToHM(p.secs), p.avgW > 0 ? p.avgW + " W" : null, p.dist > 0 ? fmtD(p.dist) + " " + distUnit() : null, e.src ? fmtEU(e.kcal) : null ].filter(Boolean).join(" · ");
}

const METRIC_WORD = {
 dist: "distance",
 hr: "heart rate",
 watts: "watts",
 met: "MET"
};

function metricsLine(k) {
 const w = [ "time" ].concat(CARDIO_METRICS.filter(m => modTracks(k, m)).map(m => METRIC_WORD[m]));
 return w.length === 1 ? w[0] : w.slice(0, -1).join(", ") + " and " + w[w.length - 1];
}

const modVerb = k => cardioMod(k).verb;

function openRide(existing, preset, modK) {
 const src = existing || preset || null;
 const k = existing ? modOf(existing) : preset ? modOf(preset) : modK || defaultMod();
 const has = m => modTracks(k, m);
 const dIn = el("input", {
  type: "date",
  value: existing ? existing.d : SELDATE,
  max: todayISO()
 });
 const tIn = el("input", {
  type: "time",
  value: existing ? existing.t : nowHM()
 });
 const nm = el("input", {
  type: "text",
  placeholder: "e.g. Tuesday intervals",
  value: src ? src.name || "" : ""
 });
 const durDial = rangeDial({
  min: 10,
  max: 180,
  step: 10,
  label: "Duration in minutes",
  fmt: minLabel,
  value: src ? Math.round(src.secs / 60) : "",
  onChange: () => calc()
 });
 const mm = durDial.input;
 const band = wattBand();
 const awDial = has("watts") ? rangeDial({
  min: band[0],
  max: band[1],
  step: 5,
  unit: " W",
  label: "Average watts",
  value: src ? src.avgW || "" : "",
  onChange: () => calc()
 }) : null;
 const aw = awDial ? awDial.input : null;
 const np = has("watts") ? el("input", {
  type: "number",
  min: "0",
  step: "1",
  inputmode: "numeric",
  value: src ? src.npW || "" : "",
  placeholder: "optional"
 }) : null;
 const dist = has("dist") ? el("input", {
  type: "number",
  min: "0",
  step: "0.1",
  inputmode: "decimal",
  value: src && src.dist > 0 ? r2(kmToDisp(src.dist)) : "",
  placeholder: "—"
 }) : null;
 const hr = has("hr") ? el("input", {
  type: "number",
  min: "0",
  step: "1",
  inputmode: "numeric",
  value: existing && existing.hr > 0 ? existing.hr : "",
  placeholder: "—"
 }) : null;
 const metDial = has("met") ? rangeDial({
  min: 1,
  max: 16,
  step: .5,
  label: "MET",
  value: src && src.met > 0 ? src.met : lastMet(k),
  onChange: () => calc()
 }) : null;
 const met = metDial ? metDial.input : null;
 const out = el("div", {
  class: "box pad"
 });
 const calc = () => {
  const secs = (parseInt(mm.value) || 0) * 60;
  const avgW = aw ? parseFloat(aw.value) || 0 : 0;
  const npW = np ? parseFloat(np.value) || 0 : 0;
  const metV = met ? parseFloat(met.value) || 0 : 0;
  const e = cardioEnergy({
   mod: k,
   d: dIn.value,
   secs: secs,
   avgW: avgW,
   met: metV
  });
  out.innerHTML = "";
  out.appendChild(el("div", {
   class: "big mono",
   text: e.src ? fmtEU(e.kcal) : "—"
  }));
  out.appendChild(el("div", {
   class: "small muted",
   text: "burned"
  }));
  out.appendChild(el("hr", {
   class: "hr"
  }));
  out.appendChild(kv("Duration", secs ? secsToHM(secs) : "—"));
  if (has("watts")) {
   const m = rideMetrics({
    secs: secs,
    avgW: avgW,
    npW: npW
   });
   out.appendChild(kv("IF", m.IF ? m.IF.toFixed(2) : "set an FTP"));
   out.appendChild(kv("TSS", m.TSS ? r0(m.TSS) : "—"));
  }
  return {
   secs: secs,
   avgW: avgW,
   npW: npW,
   met: metV,
   ...e
  };
 };
 [ mm, aw, np, met ].filter(Boolean).forEach(i => i.addEventListener("input", calc));
 dIn.addEventListener("change", calc);
 const apply = p => {
  nm.value = p.name || "";
  durDial.set(Math.round(p.secs / 60) || null);
  if (awDial) awDial.set(p.avgW || null);
  if (np) np.value = p.npW || "";
  calc();
  toast("Preset applied");
 };
 const presetRow = () => {
  const list = [ ...PRESETS.values() ];
  if (!list.some(p => modOf(p) === k)) return null;
  return field("Presets", el("div", {
   class: "wrap"
  }, list.filter(p => modOf(p) === k).map(p => el("button", {
   class: "btn sm",
   type: "button",
   text: p.name || secsToHM(p.secs),
   onclick: () => apply(p)
  }))));
 };
 const mods = modsOn();
 const pickMod = v => {
  if (v !== k) {
   closeModal();
   openRide(null, null, v);
  }
 };
 let modRow = null;
 if (!existing && !preset && mods.length > 1) {
  if (mods.length <= 4) modRow = segmented(mods.map(m => [ m.k, m.name ]), k, pickMod); else modRow = selectRow("Kind", mods.map(m => [ m.k, m.name ]), k, pickMod);
 }
 const save = () => {
  const v = calc();
  if (!v.secs) {
   toast(`How long was the ${modVerb(k)}?`);
   return;
  }
  if (has("watts") && !has("met") && !v.avgW) {
   toast("Enter average watts.");
   return;
  }
  const km = dist ? dispToKm(parseFloat(dist.value)) : 0, bpm = hr ? parseInt(hr.value) : 0;
  const r = {
   id: existing ? existing.id : "k" + uid(),
   d: dIn.value,
   t: tIn.value,
   name: nm.value.trim(),
   mod: k,
   secs: v.secs,
   ...has("watts") ? {
    avgW: v.avgW || null,
    npW: v.npW || null
   } : {},
   ...km > 0 ? {
    dist: r2(km)
   } : {},
   ...bpm > 0 ? {
    hr: bpm
   } : {},
   ...has("met") && v.met > 0 ? {
    met: v.met
   } : {},
   kj: v.kj === null ? null : r1(v.kj),
   kcal: r0(v.kcal),
   kSrc: v.src,
   presetId: existing ? existing.presetId || null : preset && preset.id || null
  };
  closeModal();
  saveRide(r);
  toast(capFirst(modVerb(k)) + " saved");
 };
 openModal({
  save: save,
  title: existing ? "Edit " + modVerb(k) : "Log a " + modVerb(k),
  body: [ modRow, presetRow(), el("div", {
   class: "grid2"
  }, [ labelled("Date", dIn), labelled("Start", tIn) ]), labelled("Name (optional)", nm), field("Duration", durDial), awDial ? field("Avg power (W)", awDial) : null, np ? labelled("Norm. power (W)", np) : null, dist ? labelled("Distance (" + distUnit() + ")", dist) : null, hr ? labelled("Avg heart rate (bpm)", hr) : null, metDial ? field("MET", metDial) : null, out, el("button", {
   class: "btn sm start",
   type: "button",
   text: "Save these numbers as a preset",
   onclick: () => {
    const v = calc();
    if (!v.secs) {
     toast("Fill in the duration first.");
     return;
    }
    const km = dist ? dispToKm(parseFloat(dist.value)) : 0;
    openPreset({
     id: "p" + uid(),
     name: nm.value.trim(),
     mod: k,
     secs: v.secs,
     ...v.avgW ? {
      avgW: v.avgW,
      npW: v.npW || null
     } : {},
     ...km > 0 ? {
      dist: r2(km)
     } : {},
     ...v.met > 0 ? {
      met: v.met
     } : {}
    });
   }
  }) ].filter(Boolean),
  footer: [ existing ? el("button", {
   class: "btn bad icon",
   type: "button",
   html: ICONS.trash,
   "aria-label": "Delete " + modVerb(k),
   onclick: () => {
    const gone = {
     ...existing
    };
    delRide(existing.id);
    closeModal();
    toastUndo(capFirst(modVerb(k)) + " deleted", () => saveRide(gone));
   }
  }) : null, el("button", {
   class: "btn pri",
   type: "button",
   text: "Save",
   onclick: save
  }) ]
 });
 calc();
}

function openPreset(preset, modK) {
 const isNew = !PRESETS.has(preset && preset.id);
 const k = preset && preset.mod ? modOf(preset) : modK || defaultMod();
 const p = preset || {
  id: "p" + uid(),
  name: "",
  mod: k,
  secs: 3600
 };
 const has = m => modTracks(k, m);
 const nm = el("input", {
  type: "text",
  value: p.name || "",
  placeholder: k === "ride" ? "e.g. Threshold hour" : "e.g. Sunday long " + modVerb(k)
 });
 const st0 = rideStyle(p);
 let mark = {
  color: st0.color,
  shape: st0.shape
 };
 const marks = markPicker(mark, v => {
  mark = v;
 });
 const durDial2 = rangeDial({
  min: 10,
  max: 180,
  step: 10,
  label: "Duration in minutes",
  fmt: minLabel,
  value: Math.round(p.secs / 60) || "",
  onChange: () => calc()
 });
 const mm = durDial2.input;
 const awDial2 = has("watts") ? rangeDial({
  min: wattBand()[0],
  max: wattBand()[1],
  step: 5,
  unit: " W",
  label: "Average watts",
  value: p.avgW || "",
  onChange: () => calc()
 }) : null;
 const aw = awDial2 ? awDial2.input : null;
 const np = has("watts") ? el("input", {
  type: "number",
  min: "0",
  step: "1",
  inputmode: "numeric",
  value: p.npW || "",
  placeholder: "optional"
 }) : null;
 const dist = has("dist") ? el("input", {
  type: "number",
  min: "0",
  step: "0.1",
  inputmode: "decimal",
  value: p.dist > 0 ? r2(kmToDisp(p.dist)) : "",
  placeholder: "—"
 }) : null;
 const metDial = has("met") ? rangeDial({
  min: 1,
  max: 16,
  step: .5,
  label: "MET",
  value: p.met > 0 ? p.met : lastMet(k),
  onChange: () => calc()
 }) : null;
 const met = metDial ? metDial.input : null;
 const out = el("div", {
  class: "box pad"
 });
 const calc = () => {
  const secs = (parseInt(mm.value) || 0) * 60;
  const avgW = aw ? parseFloat(aw.value) || 0 : 0, metV = met ? parseFloat(met.value) || 0 : 0;
  const e = cardioEnergy({
   mod: k,
   d: todayISO(),
   secs: secs,
   avgW: avgW,
   met: metV
  });
  out.innerHTML = "";
  out.appendChild(kv("Duration", secs ? secsToHM(secs) : "—"));
  out.appendChild(kv("Energy", e.src ? fmtEU(e.kcal) : "—"));
  if (has("watts")) {
   const m = rideMetrics({
    secs: secs,
    avgW: avgW,
    npW: np ? parseFloat(np.value) || 0 : 0
   });
   out.appendChild(kv("TSS", m.TSS ? r0(m.TSS) : "—"));
  }
  return {
   secs: secs,
   avgW: avgW,
   npW: np ? parseFloat(np.value) || null : null,
   met: metV,
   dist: dist ? dispToKm(parseFloat(dist.value)) : 0
  };
 };
 [ mm, aw, np, met ].filter(Boolean).forEach(i => i.addEventListener("input", calc));
 const savePresetNow = () => {
  const v = calc();
  if (!v.secs) {
   toast("Needs a duration.");
   return;
  }
  if (has("watts") && !has("met") && !v.avgW) {
   toast("Needs a wattage.");
   return;
  }
  savePreset({
   id: p.id,
   name: nm.value.trim() || secsToHM(v.secs),
   mod: k,
   secs: v.secs,
   ...has("watts") ? {
    avgW: v.avgW || null,
    npW: v.npW
   } : {},
   ...v.dist > 0 ? {
    dist: r2(v.dist)
   } : {},
   ...has("met") && v.met > 0 ? {
    met: v.met
   } : {},
   color: mark.color,
   shape: mark.shape
  });
  closeModal();
  toast("Preset saved");
 };
 const mods = modsOn();
 const repick = v => {
  if (v !== k) {
   closeModal();
   openPreset(null, v);
  }
 };
 const modRow = isNew && !preset && mods.length > 1 ? mods.length <= 4 ? segmented(mods.map(m => [ m.k, m.name ]), k, repick) : selectRow("Kind", mods.map(m => [ m.k, m.name ]), k, repick) : null;
 openModal({
  save: savePresetNow,
  title: isNew ? "New preset" : "Edit preset",
  body: [ modRow, labelled("Name", nm), field("Mark", marks), field("Duration", durDial2), awDial2 ? field("Avg power (W)", awDial2) : null, np ? labelled("Norm. power (W)", np) : null, dist ? labelled("Distance (" + distUnit() + ")", dist) : null, metDial ? field("MET", metDial) : null, out ].filter(Boolean),
  footer: [ !isNew ? el("button", {
   class: "btn bad icon",
   type: "button",
   html: ICONS.trash,
   "aria-label": "Delete preset",
   onclick: () => {
    const gone = {
     ...p
    };
    delPreset(p.id);
    closeModal();
    toastUndo("Preset deleted", () => savePreset(gone));
   }
  }) : null, el("button", {
   class: "btn pri",
   type: "button",
   text: "Save",
   onclick: savePresetNow
  }) ]
 });
 calc();
}

let CARDIOF = null;

VIEWS.cardio = function viewCardio() {
 const root = $("#p-cardio");
 root.innerHTML = "";
 root.appendChild(pageBar([ tracks("cardio") && everRode() ? el("button", {
  class: "btn sm",
  type: "button",
  text: "Log a " + modVerb(defaultMod()),
  onclick: () => openRide(null, null, defaultMod())
 }) : null ]));
 if (!tracks("cardio")) {
  root.appendChild(el("div", {
   class: "sec"
  }, [ el("div", {
   class: "box"
  }, [ emptyAdd("Track cardio", () => {
   S.track.cardio = true;
   saveSettings();
  }) ]) ]));
  return;
 }
 const kinds = CARDIO_MODS.filter(m => modSet(m.k).on || [ ...RIDES.values() ].some(r => modOf(r) === m.k));
 if (CARDIOF && !kinds.some(m => m.k === CARDIOF)) CARDIOF = null;
 if (kinds.length > 1) {
  const opts = [ [ "", "All" ] ].concat(kinds.map(m => [ m.k, m.name ]));
  const pick = v => {
   CARDIOF = v || null;
   render();
  };
  root.appendChild(el("div", {
   class: "sec"
  }, [ opts.length <= 4 ? segmented(opts, CARDIOF || "", pick) : selectRow("Showing", opts, CARDIOF || "", pick) ]));
 }
 const power = CARDIOF ? modTracks(CARDIOF, "watts") && modSet(CARDIOF).on : powerOn();
 const rides = [ ...RIDES.values() ].filter(r => !CARDIOF || modOf(r) === CARDIOF).sort((a, b) => a.d + (a.t || "") < b.d + (b.t || "") ? 1 : -1);
 const today = todayISO();
 const wkRides = rides.filter(r => {
  const k = daysBetween(r.d, today);
  return k >= 0 && k < 7;
 });
 const secs = wkRides.reduce((s, r) => s + r.secs, 0);
 const kcal = wkRides.reduce((s, r) => s + (r.kcal || 0), 0);
 const tss = wkRides.reduce((s, r) => s + (rideMetrics(r).TSS || 0), 0);
 const L = sections(root, "cardio");
 L.add("week", "Last seven days", rides.length && sec("Last seven days", null, [ el("div", {
  class: "box pad"
 }, [ el("div", {
  class: "big mono",
  text: (secs / 3600).toFixed(1) + " h"
 }), el("div", {
  class: "small muted",
  text: `${nCardio(wkRides.length, CARDIOF)} since ${fmtDate(addDays(today, -6))}`
 }), el("hr", {
  class: "hr"
 }), kv("Burned", fmtEU(kcal)), power ? kv("TSS", tss ? r0(tss) : "—") : null, power ? kv("FTP", S.cardio.ftp ? S.cardio.ftp + " W" : "not set") : null ].filter(Boolean)) ]));
 {
  const plist = inOrder([ ...PRESETS.values() ], S.order.presets, p => p.id).filter(p => !CARDIOF || modOf(p) === CARDIOF);
  const pbox = el("div", {
   class: "box" + (plist.length ? " rows" : "")
  });
  if (!plist.length) pbox.appendChild(emptyAdd("New preset", () => openPreset(null, CARDIOF)));
  plist.forEach(p => pbox.appendChild(holdDrag(withId(swipeRow(el("div", {
   class: "row split"
  }, [ el("button", {
   class: "pick",
   type: "button",
   "aria-label": "Edit " + (p.name || "preset"),
   onclick: () => openPreset(p)
  }, [ rideMark(15, p), el("span", {
   class: "nm"
  }, [ el("span", {
   class: "t1",
   text: p.name || secsToHM(p.secs)
  }), el("span", {
   class: "t2",
   text: presetLabel(p)
  }) ]) ]), el("button", {
   class: "btn sm go",
   type: "button",
   text: "Log",
   onclick: () => openRide(null, p)
  }) ]), {
   right: {
    label: "Log it",
    css: "var(--interactive)",
    fg: "var(--on-interactive)",
    fn: () => openRide(null, p)
   },
   left: [ {
    label: "Edit",
    css: "var(--ink2)",
    fg: "var(--bg)",
    fn: () => openPreset(p)
   }, {
    label: "Delete",
    css: "var(--danger)",
    fg: "var(--on-danger)",
    fn: () => {
     const gone = {
      ...p
     };
     delPreset(p.id);
     toastUndo("Preset deleted", () => savePreset(gone));
    }
   } ]
  }), p.id), {
   drop: ids => {
    S.order = {
     ...S.order,
     presets: ids
    };
    saveSettings();
   }
  })));
  L.add("presets", "Presets", sec("Presets", plist.length ? el("button", {
   class: "btn sm",
   type: "button",
   text: "New",
   onclick: () => openPreset(null, CARDIOF)
  }) : null, [ pbox ]));
 }
 const wins = [];
 for (let i = 9; i >= 0; i--) {
  const end = addDays(today, -7 * i);
  const secs7 = rides.reduce((a, r) => {
   const k = daysBetween(r.d, end);
   return a + (k >= 0 && k < 7 ? r.secs || 0 : 0);
  }, 0);
  wins.push({
   d: end,
   v: secs7 / 3600,
   label: fmtDate(end)
  });
 }
 const busy = wins.filter(w => w.v > 0);
 if (busy.length > 1) {
  const host = el("div", {
   class: "box pad"
  });
  const hold = el("div", {});
  host.appendChild(hold);
  L.add("hours", "Hours per seven days", sec("Hours per seven days", null, [ host ]));
  queueMicrotask(() => hold.appendChild(simpleBars(busy, hold.clientWidth || 600, 84, "var(--ser-ride)", v => v.toFixed(1) + "h")));
 }
 const recent = rides.filter(r => r.avgW > 0).slice(0, 14).reverse();
 if (power && recent.length > 1) {
  const host = el("div", {
   class: "box pad"
  });
  const hold = el("div", {});
  host.appendChild(hold);
  L.add("power", "Average power", sec("Average power per " + cardioWords(CARDIOF).one, null, [ host ]));
  queueMicrotask(() => hold.appendChild(simpleBars(recent.map(r => ({
   d: r.d,
   v: r.avgW
  })), hold.clientWidth || 600, 84, "var(--ser-ride)", v => r0(v) + "W")));
 }
 const isos = [];
 for (let k = 29; k >= 0; k--) isos.push(addDays(today, -k));
 const pool = poolSpread(isos.map(iso => rides.reduce((a, r) => a + (r.d === iso ? r.kcal || 0 : 0), 0)));
 if (pool.some(v => v > 0)) {
  const avg = pool.reduce((s, v) => s + v, 0) / pool.length;
  const host = el("div", {
   class: "box pad"
  });
  host.appendChild(el("div", {
   class: "big mono",
   text: fmtEU(avg)
  }));
  host.appendChild(el("div", {
   class: "small muted",
   text: "average per day across the last 30, pooled"
  }));
  const hold = el("div", {
   class: "mt"
  });
  host.appendChild(hold);
  L.add("burned", "Burned per day", sec("Burned per day", null, [ host ]));
  queueMicrotask(() => hold.appendChild(simpleBars(isos.map((iso, i) => ({
   d: iso,
   v: pool[i]
  })), hold.clientWidth || 600, 84, "var(--ser-ride)", v => fmtE(v))));
 }
 const list = el("div", {
  class: "box" + (rides.length ? " rows" : "")
 });
 if (!rides.length) list.appendChild(emptyAdd("Log a " + modVerb(CARDIOF || defaultMod()), () => openRide(null, null, CARDIOF || defaultMod())));
 rides.slice(0, 30).forEach(r => {
  const m = rideMetrics(r);
  const line = row({
   t1: r.name || fmtDate(r.d, true),
   t2: [ fmtDate(r.d), secsToHM(r.secs), r.avgW > 0 ? r.avgW + " W" : null, r.dist > 0 ? fmtD(r.dist) + " " + distUnit() : null, m.TSS && r.avgW > 0 ? r0(m.TSS) + " TSS" : null ].filter(Boolean).join(" · "),
   val: r.kSrc === null && !(r.kcal > 0) ? "—" : fmtEU(r.kcal),
   onclick: () => openRide(r)
  });
  list.appendChild(swipeRow(line, {
   right: {
    label: "Log another",
    css: "var(--interactive)",
    fg: "var(--on-interactive)",
    fn: () => openRide(null, r)
   },
   left: [ {
    label: "Edit",
    css: "var(--ink2)",
    fg: "var(--bg)",
    fn: () => openRide(r)
   }, {
    label: "Delete",
    css: "var(--danger)",
    fg: "var(--on-danger)",
    fn: () => {
     const gone = {
      ...r
     };
     delRide(r.id);
     toastUndo(capFirst(modVerb(modOf(r))) + " deleted", () => saveRide(gone));
    }
   } ]
  }));
 });
 const barSays = !rides.length && everRode() && (CARDIOF || defaultMod()) === defaultMod();
 L.add("list", capFirst(cardioWords(CARDIOF).many), !barSays && sec(capFirst(cardioWords(CARDIOF).many), null, [ list ]));
 L.done();
};

VIEWS.energy = function viewEnergy() {
 const root = $("#p-energy");
 root.innerHTML = "";
 root.appendChild(pageBar([]));
 const e = estimateTDEE();
 const box = el("div", {
  class: "box pad"
 });
 box.appendChild(el("div", {
  class: "bar"
 }, [ el("div", {
  class: "big mono grow",
  text: e.ok ? fmtE(e.tdee) : "—"
 }), ctlSelect([ 2, 3, 4, 5, 6, 8, 10, 12, 16 ].map(v => [ v, v + " weeks" ]), S.tdeeWeeks, v => {
  S.tdeeWeeks = +v;
  saveSettings();
 }, "Weeks compared") ]));
 box.appendChild(el("div", {
  class: "small muted",
  text: e.ok ? eUnit() + " per day" : e.why
 }));
 const L = sections(root, "energy");
 const wk = everWeighed(), ate = everAte(), need = !wk ? firstAct("weight") : !ate ? firstAct("food") : null;
 L.add("estimate", "Estimated expenditure", sec("Estimated expenditure", null, [ need ? el("div", {
  class: "box"
 }, [ emptyAdd(need.text, need.fn) ]) : box ]));
 if (!wk && !ate) {
  L.done();
  return;
 }
 L.add("chart", "In against out", energyBlock());
 if (e.ok) {
  const why = e.why ? el("div", {
   class: "note",
   text: e.why
  }) : null;
  const perDay = e.deltaKg * KCAL_PER_KG / e.span;
  const rideDay = rideKcalPerDay(e.span);
  L.add("math", "The arithmetic", sec("The arithmetic", null, [ why, el("div", {
   class: "box pad"
  }, [ kv("Average intake", fmtEU(e.meanIntake) + "/day"), kv("Change in the 7-day " + basisWord(), signedW(e.deltaKg) + " " + wUnit() + " over " + e.span + " days"), kv("Energy that represents", signed(eDisp(perDay), 0) + " " + eUnit() + "/day"), el("hr", {
   class: "hr"
  }), kv("Expenditure", fmtEU(e.tdee) + "/day"), tracks("cardio") && rideDay > 0 ? kv("of which " + cardioWords().noun.toLowerCase(), fmtEU(rideDay) + "/day") : null, tracks("cardio") && rideDay > 0 ? kv("everything else", fmtEU(e.tdee - rideDay) + "/day") : null, el("div", {
   class: "small muted mt",
   text: fmtDate(e.from) + " to " + fmtDate(e.to) + " · " + e.logged + " of " + e.total + " days logged"
  }) ]) ]));
 }
 const rows = windowTable(12).filter(r => r.median !== null || r.meanKcal !== null).reverse();
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
  text: "Δ"
 }), el("th", {
  class: "n",
  text: "Avg " + eUnit()
 }), cardioShown() ? el("th", {
  class: "n",
  text: cardioWords().short + " " + eUnit()
 }) : null ].filter(Boolean)));
 rows.forEach(r => tb.appendChild(el("tr", {}, [ el("td", {
  text: fmtDate(r.end)
 }), el("td", {
  class: "n",
  text: r.median === null ? "—" : fmtW(r.median)
 }), el("td", {
  class: "n",
  text: r.change === null ? "—" : signedW(r.change)
 }), el("td", {
  class: "n",
  text: r.meanKcal ? fmtE(r.meanKcal) : "—"
 }), cardioShown() ? el("td", {
  class: "n",
  text: r.rideKcal ? fmtE(r.rideKcal) : "—"
 }) : null ].filter(Boolean))));
 L.add("windows", "By window", sec("By window", null, [ el("div", {
  class: "box scrollx"
 }, [ tb ]) ]));
 L.done();
};

let ENSHOW = {
 intake: true,
 tdee: true,
 ride: true,
 mf: true
}, ENH = 1;

const enSpan = () => ZSPAN.energy || S.spans.energy;

function energyBlock() {
 const host = el("div", {
  class: "box pad"
 });
 const paint = () => {
  const rows = energySeries(Math.min(enSpan(), 365));
  host.innerHTML = "";
  if (rows.every(r => !r.intake && r.tdee === null)) {
   host.appendChild(el("div", {
    class: "empty",
    text: "Nothing logged in this window."
   }));
   return;
  }
  host.appendChild(energyChart(rows, host.clientWidth || 330, {
   show: ENSHOW,
   plotH: graphPlotHeight(),
   zoom: ENH,
   onPick: iso => {
    SELDATE = iso;
    STRIPMON = null;
   }
  }));
 };
 pinchSpan(host, {
  min: 14,
  max: 365,
  get: () => enSpan(),
  set: v => {
   ZSPAN.energy = v;
  },
  draw: paint,
  end: () => render()
 });
 queueMicrotask(paint);
 return sec("In against out", null, [ host, el("div", {
  class: "small muted bar wrap mt"
 }, [ el("span", {
  class: "sp"
 }), ctlSelect([ [ 30, "30d" ], [ 60, "60d" ], [ 90, "90d" ], [ 180, "180d" ] ], enSpan(), v => {
  S.spans.energy = +v;
  delete ZSPAN.energy;
  saveSettings();
  render();
 }, "Span") ]), chipRow([ [ "intake", "Eaten", "var(--ser-intake)" ], [ "tdee", "Burned", "var(--ser-tdee)" ], tracks("cardio") ? [ "ride", cardioWords().noun, "var(--ser-ride)" ] : null ].filter(Boolean).concat([ ...DAYS.values() ].some(d => d.mfE > 0) ? [ [ "mf", "Imported", "var(--ink2)" ] ] : []), k => ENSHOW[k], k => {
  ENSHOW[k] = !ENSHOW[k];
  render();
 }, {
  line: true
 }) ]);
}
