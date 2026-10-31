function hexParse(s) {
 const t = String(s == null ? "" : s).trim().replace(/^#/, "");
 if (!/^[0-9a-fA-F]+$/.test(t)) return null;
 if (t.length === 3) return [ 0, 1, 2 ].map(i => parseInt(t[i] + t[i], 16));
 if (t.length === 6) return [ 0, 2, 4 ].map(i => parseInt(t.slice(i, i + 2), 16));
 return null;
}

function hexNorm(s) {
 const v = hexParse(s);
 return v ? hexOut(v) : null;
}

function hexOut(rgb) {
 return "#" + rgb.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("");
}

const sRGBtoLin = n => (n /= 255) <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;

const linTosRGB = n => 255 * (n <= .0031308 ? n * 12.92 : 1.055 * n ** (1 / 2.4) - .055);

function rgbToOklab(rgb) {
 const [r, g, b] = rgb.map(sRGBtoLin);
 const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
 const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
 const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
 return [ .2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s ];
}

function oklabToRgb(lab) {
 const [L, A, B] = lab;
 const l = (L + .3963377774 * A + .2158037573 * B) ** 3;
 const m = (L - .1055613458 * A - .0638541728 * B) ** 3;
 const s = (L - .0894841775 * A - 1.291485548 * B) ** 3;
 return [ linTosRGB(+4.0767416621 * l - 3.3077115913 * m + .2309699292 * s), linTosRGB(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s), linTosRGB(-.0041960863 * l - .7034186147 * m + 1.707614701 * s) ];
}

function oklch(hex) {
 const rgb = hexParse(hex);
 if (!rgb) return null;
 const [L, a, b] = rgbToOklab(rgb);
 return {
  L: L,
  C: Math.hypot(a, b),
  h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360
 };
}

function lchToLab(c) {
 const r = c.h * Math.PI / 180;
 return [ c.L, Math.cos(r) * c.C, Math.sin(r) * c.C ];
}

const inGamut = rgb => rgb.every(n => n >= -.5 && n <= 255.5);

function oklchClamp(c) {
 const at = C => oklabToRgb(lchToLab({
  L: c.L,
  C: C,
  h: c.h
 }));
 const L = Math.max(0, Math.min(1, c.L));
 if (inGamut(at(c.C))) return {
  L: L,
  C: c.C,
  h: c.h
 };
 let lo = 0, hi = c.C;
 for (let i = 0; i < 24; i++) {
  const mid = (lo + hi) / 2;
  if (inGamut(at(mid))) lo = mid; else hi = mid;
 }
 return {
  L: L,
  C: lo,
  h: c.h
 };
}

function oklchHex(c) {
 return hexOut(oklabToRgb(lchToLab(oklchClamp(c))));
}

function relLum(hex) {
 const rgb = hexParse(hex);
 if (!rgb) return 0;
 const [r, g, b] = rgb.map(sRGBtoLin);
 return .2126 * r + .7152 * g + .0722 * b;
}

function contrast(a, b) {
 const x = relLum(a), y = relLum(b);
 return +((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(3);
}

function colourGap(a, b) {
 const x = rgbToOklab(hexParse(a) || [ 0, 0, 0 ]), y = rgbToOklab(hexParse(b) || [ 0, 0, 0 ]);
 return +Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]).toFixed(4);
}

const SWATCHES = [ {
 k: "green",
 kind: "hue",
 name: "Green",
 uses: "buttons, progress, logged, quads"
}, {
 k: "forest",
 kind: "hue",
 name: "Forest",
 uses: "carbs, logged days, traps, a mark"
}, {
 k: "lime",
 kind: "hue",
 name: "Lime",
 uses: "hamstrings, a mark"
}, {
 k: "teal",
 kind: "hue",
 name: "Teal",
 uses: "biceps, a mark"
}, {
 k: "blue",
 kind: "hue",
 name: "Blue",
 uses: "kcal, AI, intake, lats, mid back"
}, {
 k: "violet",
 kind: "hue",
 name: "Violet",
 uses: "triceps, a mark"
}, {
 k: "plum",
 kind: "hue",
 name: "Plum",
 uses: "forearms, a mark"
}, {
 k: "red",
 kind: "hue",
 name: "Red",
 uses: "delete, a mark"
}, {
 k: "crimson",
 kind: "hue",
 name: "Crimson",
 uses: "protein, cardio, chest"
}, {
 k: "orange",
 kind: "hue",
 name: "Orange",
 uses: "glutes, a mark"
}, {
 k: "amber",
 kind: "hue",
 name: "Amber",
 uses: "fat, lifts, rest done, the three delts"
}, {
 k: "slate",
 kind: "hue",
 name: "Slate",
 uses: "calves, a mark"
}, {
 k: "bg",
 kind: "surface",
 name: "Page",
 uses: "the page"
}, {
 k: "panel",
 kind: "surface",
 name: "Panel",
 uses: "cards and rows"
}, {
 k: "alt",
 kind: "surface",
 name: "Inset",
 uses: "insets and tracks"
}, {
 k: "ink",
 kind: "surface",
 name: "Text",
 uses: "text, today, selected"
}, {
 k: "ink2",
 kind: "surface",
 name: "Second text",
 uses: "second text, core"
}, {
 k: "ink3",
 kind: "surface",
 name: "Quiet text",
 uses: "quiet text"
}, {
 k: "line",
 kind: "surface",
 name: "Hairline",
 uses: "hairlines"
}, {
 k: "line2",
 kind: "surface",
 name: "Strong line",
 uses: "control edges"
}, {
 k: "shadow",
 kind: "surface",
 name: "Shadow",
 uses: "shadows and scrims"
} ];

const SWATCH_KEYS = SWATCHES.map(s => s.k);

const SURFACE_KEYS = SWATCHES.filter(s => s.kind === "surface").map(s => s.k);

const SWATCH_GROUPS = [ [ "Interactive and alerts", [ "green", "red", "blue" ] ], [ "Food and body", [ "crimson", "forest", "amber" ] ], [ "Marks", [ "teal", "violet", "plum", "orange", "lime", "slate" ] ], [ "Surfaces", SURFACE_KEYS ] ];

const DERIVED = [ "on-green", "on-red", "on-blue", "green-ink", "amber2", "amber3", "blue2" ];

const ROLE_OF = {
 bg: "bg",
 panel: "panel",
 alt: "alt",
 ink: "ink",
 ink2: "ink2",
 ink3: "ink3",
 line: "line",
 line2: "line2",
 interactive: "green",
 "interactive-ink": "green-ink",
 "on-interactive": "on-green",
 selected: "ink",
 "on-selected": "bg",
 today: "ink",
 now: "green",
 focus: "green",
 progress: "green",
 timer: "green",
 "timer-done": "amber",
 danger: "red",
 "danger-btn": "red",
 "on-danger": "on-red",
 "on-danger-btn": "on-red",
 ai: "blue",
 "on-ai": "on-blue",
 "nut-p": "crimson",
 "nut-c": "forest",
 "nut-f": "amber",
 "nut-k": "blue",
 weight: "green",
 "ser-weight": "green",
 "ser-intake": "blue",
 "ser-tdee": "green",
 "ser-logged": "forest",
 "ser-ride": "crimson",
 "ser-lift": "amber",
 "ser-load": "blue",
 "ser-adaptive": "amber",
 "part-chest": "crimson",
 "part-fdelts": "amber2",
 "part-sdelts": "amber",
 "part-rdelts": "amber3",
 "part-triceps": "violet",
 "part-lats": "blue",
 "part-midback": "blue2",
 "part-traps": "forest",
 "part-biceps": "teal",
 "part-forearms": "plum",
 "part-quads": "green",
 "part-hams": "lime",
 "part-glutes": "orange",
 "part-calves": "slate",
 "part-core": "ink2",
 "cat-1": "blue",
 "cat-2": "green",
 "cat-3": "amber",
 "cat-4": "violet",
 "cat-5": "teal",
 "cat-6": "orange",
 "cat-7": "plum",
 "cat-8": "forest",
 "cat-9": "red",
 "cat-10": "slate"
};

const COLOUR_SETS = [ [ "Plan marks", [ "cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6", "cat-7", "cat-8", "cat-9", "cat-10" ] ], [ "Lift colours", [ "cat-1", "cat-9", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6", "cat-7", "cat-8", "cat-10" ] ], [ "Body parts", [ "part-chest", "part-fdelts", "part-sdelts", "part-rdelts", "part-triceps", "part-lats", "part-midback", "part-traps", "part-biceps", "part-forearms", "part-quads", "part-hams", "part-glutes", "part-calves", "part-core" ] ], [ "Macros", [ "nut-p", "nut-c", "nut-f", "nut-k" ] ] ];

const ALIKE = .03;

function inkOn(fill, against, near) {
 const c = oklch(fill);
 if (!c) return "#000000";
 const on = against || fill, onL = (oklch(on) || {
  L: 1
 }).L;
 const C = near ? c.C : c.C / 5;
 const floor = near ? 7 : 4.5;
 const at = L => oklchHex({
  L: L,
  C: C,
  h: c.h
 });
 const walk = (from, dir) => {
  for (let L = from; L >= 0 && L <= 1; L += dir * .01) {
   const hex = at(L);
   if (contrast(hex, on) >= floor) return hex;
  }
  return dir < 0 ? "#000000" : "#ffffff";
 };
 if (near) return walk(c.L, onL > c.L ? -1 : 1);
 const up = contrast(at(.97), on) >= contrast(at(.22), on);
 return walk(up ? .97 : .22, up ? 1 : -1);
}

function shadeOf(base, avoid, dir, bg) {
 const c = oklch(base);
 if (!c) return base;
 let best = base, bestGap = -1;
 for (const step of [ .12, .16, .2, .08, .26, .32 ]) {
  for (const d of [ dir * step, -dir * step ]) {
   const L = c.L + d;
   if (L < .12 || L > .97) continue;
   const hex = oklchHex(oklchClamp({
    L: L,
    C: c.C,
    h: c.h
   }));
   if (bg && contrast(hex, bg) < 3) continue;
   const gap = Math.min(...avoid.map(a => colourGap(hex, a)));
   if (gap >= ALIKE * 1.5) return hex;
   if (gap > bestGap) {
    bestGap = gap;
    best = hex;
   }
  }
 }
 return best;
}

function themeDerive(m) {
 const parts = [ "crimson", "amber", "violet", "blue", "teal", "green", "lime", "orange", "slate", "ink2", "forest", "plum", "bg", "panel" ].map(k => m[k]).filter(Boolean);
 const amber2 = shadeOf(m.amber, parts, -1, m.bg);
 const amber3 = shadeOf(m.amber, parts.concat([ amber2 ]), 1, m.bg);
 const blue2 = shadeOf(m.blue, parts.concat([ amber2, amber3 ]), 1, m.bg);
 return {
  "on-green": inkOn(m.green),
  "on-red": inkOn(m.red),
  "on-blue": inkOn(m.blue),
  "green-ink": inkOn(m.green, m.bg, true),
  amber2: amber2,
  amber3: amber3,
  blue2: blue2
 };
}

const THEME_SCHEMA = 1;

const PRESETS_T = [ {
 id: "default",
 name: "Default",
 schema: THEME_SCHEMA,
 pairedWith: null,
 modes: {
  light: {
   bg: "#ffffff",
   panel: "#ffffff",
   alt: "#f4f4f4",
   ink: "#111111",
   ink2: "#555555",
   ink3: "#6e6e6e",
   line: "#d6d6d6",
   line2: "#949494",
   shadow: "#000000",
   green: "#0a874f",
   forest: "#2e7d32",
   lime: "#7a9a2e",
   teal: "#0e8c99",
   blue: "#1f6feb",
   violet: "#7b4fc7",
   plum: "#8a2e6b",
   red: "#b3392e",
   crimson: "#96150e",
   orange: "#c0651c",
   amber: "#b5860b",
   slate: "#546e7a"
  },
  dark: {
   bg: "#111111",
   panel: "#181818",
   alt: "#212121",
   ink: "#ededed",
   ink2: "#a8a8a8",
   ink3: "#949494",
   line: "#343434",
   line2: "#666666",
   shadow: "#000000",
   green: "#2ecc9a",
   forest: "#3fab6e",
   lime: "#9bc24a",
   teal: "#2bb5c2",
   blue: "#4a82ff",
   violet: "#a583f0",
   plum: "#c27aa8",
   red: "#e0705f",
   crimson: "#bc382f",
   orange: "#e68a45",
   amber: "#c18815",
   slate: "#8fa3ad"
  }
 }
}, {
 id: "contrast",
 name: "High contrast",
 schema: THEME_SCHEMA,
 pairedWith: null,
 modes: {
  light: {
   bg: "#ffffff",
   panel: "#ffffff",
   alt: "#ebebeb",
   ink: "#000000",
   ink2: "#2e2e2e",
   ink3: "#404040",
   line: "#707070",
   line2: "#333333",
   shadow: "#000000",
   green: "#046b3d",
   forest: "#14561a",
   lime: "#4a6300",
   teal: "#045f6b",
   blue: "#0b3fb0",
   violet: "#57219f",
   plum: "#6d0f4e",
   red: "#8f1a10",
   crimson: "#c0342a",
   orange: "#8c4204",
   amber: "#6e5200",
   slate: "#37474f"
  },
  dark: {
   bg: "#000000",
   panel: "#0b0b0b",
   alt: "#1c1c1c",
   ink: "#ffffff",
   ink2: "#d8d8d8",
   ink3: "#bcbcbc",
   line: "#5c5c5c",
   line2: "#949494",
   shadow: "#000000",
   green: "#5ef0b8",
   forest: "#79d992",
   lime: "#c9e35e",
   teal: "#5ad8e4",
   blue: "#8fb0ff",
   violet: "#cbabff",
   plum: "#f2a6d1",
   red: "#ff9d88",
   crimson: "#d8554a",
   orange: "#ffb06b",
   amber: "#e6c24d",
   slate: "#b9cdd8"
  }
 }
}, {
 id: "nautical",
 name: "Nautical",
 schema: THEME_SCHEMA,
 pairedWith: null,
 modes: {
  light: {
   bg: "#f7fbfd",
   panel: "#ffffff",
   alt: "#e9f2f7",
   ink: "#0d2635",
   ink2: "#3c5a6b",
   ink3: "#4f7284",
   line: "#cfe0ea",
   line2: "#6e8b9c",
   shadow: "#0d2635",
   green: "#0e7a6a",
   forest: "#155e52",
   lime: "#5d8f4a",
   teal: "#0f86a8",
   blue: "#14559e",
   violet: "#4a55ad",
   plum: "#7a4080",
   red: "#c04434",
   crimson: "#d96a52",
   orange: "#c1743a",
   amber: "#9a7a1c",
   slate: "#55707e"
  },
  dark: {
   bg: "#0a1620",
   panel: "#101f2b",
   alt: "#182c3a",
   ink: "#e7f2f8",
   ink2: "#a9c2ce",
   ink3: "#8ba6b5",
   line: "#22394a",
   line2: "#51707f",
   shadow: "#000000",
   green: "#3fd6bb",
   forest: "#4fb39f",
   lime: "#9dcb72",
   teal: "#42b8db",
   blue: "#5a9bf0",
   violet: "#8e97f0",
   plum: "#c78ad0",
   red: "#ff8a72",
   crimson: "#e6604a",
   orange: "#f0a05e",
   amber: "#d9b04a",
   slate: "#9db3c0"
  }
 }
}, {
 id: "nocturne",
 name: "Nocturne",
 schema: THEME_SCHEMA,
 pairedWith: null,
 modes: {
  light: {
   bg: "#f8f5fc",
   panel: "#ffffff",
   alt: "#efe9f7",
   ink: "#1e1730",
   ink2: "#4c4067",
   ink3: "#63557f",
   line: "#ddd4ec",
   line2: "#9084b0",
   shadow: "#1e1730",
   green: "#5e3d9e",
   forest: "#3e2f72",
   lime: "#915e9c",
   teal: "#3e6596",
   blue: "#2c488e",
   violet: "#522288",
   plum: "#5d0c4a",
   red: "#ac2f3b",
   crimson: "#6d1240",
   orange: "#b55f40",
   amber: "#a67f38",
   slate: "#686679"
  },
  dark: {
   bg: "#14101f",
   panel: "#1a1528",
   alt: "#241d36",
   ink: "#ece6f7",
   ink2: "#b5a9cc",
   ink3: "#9a8cb3",
   line: "#2f2745",
   line2: "#7a6aa3",
   shadow: "#000000",
   green: "#be9df7",
   forest: "#8f88cc",
   lime: "#f3bbf5",
   teal: "#73a9e1",
   blue: "#708ee2",
   violet: "#9364ce",
   plum: "#a5538c",
   red: "#f68389",
   crimson: "#b35682",
   orange: "#ffad88",
   amber: "#fada99",
   slate: "#a4a2b7"
  }
 }
}, {
 id: "sepia",
 name: "Sepia",
 schema: THEME_SCHEMA,
 pairedWith: null,
 modes: {
  light: {
   bg: "#faf4e8",
   panel: "#fffaf0",
   alt: "#f0e6d2",
   ink: "#2e2317",
   ink2: "#5c4a33",
   ink3: "#6f5c44",
   line: "#ded0b8",
   line2: "#7a684e",
   shadow: "#2e2317",
   green: "#7e541b",
   forest: "#534f1d",
   lime: "#90782a",
   teal: "#286265",
   blue: "#264a6c",
   violet: "#52394f",
   plum: "#541e29",
   red: "#9a3322",
   crimson: "#681b1b",
   orange: "#ad5c15",
   amber: "#a28137",
   slate: "#6b6157"
  },
  dark: {
   bg: "#1c1710",
   panel: "#241d14",
   alt: "#2f271b",
   ink: "#f0e4d0",
   ink2: "#c0ac90",
   ink3: "#a3907a",
   line: "#3a3124",
   line2: "#7a684e",
   shadow: "#000000",
   green: "#d2a061",
   forest: "#97965b",
   lime: "#e7d17a",
   teal: "#67acb0",
   blue: "#6c96c2",
   violet: "#9b7998",
   plum: "#a25d68",
   red: "#d86353",
   crimson: "#a94f4b",
   orange: "#f7a062",
   amber: "#f7db98",
   slate: "#ada397"
  }
 }
}, {
 id: "crimson",
 name: "Crimson",
 schema: THEME_SCHEMA,
 pairedWith: null,
 modes: {
  light: {
   bg: "#fdf7f6",
   panel: "#ffffff",
   alt: "#f6e9e7",
   ink: "#2a1412",
   ink2: "#5e3a36",
   ink3: "#74504b",
   line: "#e8d2ce",
   line2: "#805857",
   shadow: "#2a1412",
   green: "#97182f",
   forest: "#216253",
   lime: "#817531",
   teal: "#246c73",
   blue: "#2d4e78",
   violet: "#5e2a4e",
   plum: "#570e33",
   red: "#b6341f",
   crimson: "#6e0017",
   orange: "#b85e31",
   amber: "#9f7932",
   slate: "#6e5f5e"
  },
  dark: {
   bg: "#170f0f",
   panel: "#1f1616",
   alt: "#2b1e1e",
   ink: "#f7e6e4",
   ink2: "#cfa8a4",
   ink3: "#b08e8a",
   line: "#3a2727",
   line2: "#805857",
   shadow: "#000000",
   green: "#ed7477",
   forest: "#65af9c",
   lime: "#d9cc7e",
   teal: "#69bac3",
   blue: "#6c95c9",
   violet: "#a46b91",
   plum: "#9f5172",
   red: "#ff8b75",
   crimson: "#bf525a",
   orange: "#ffad88",
   amber: "#f5d293",
   slate: "#b1a09f"
  }
 }
}, {
 id: "forest",
 name: "Forest",
 schema: THEME_SCHEMA,
 pairedWith: null,
 modes: {
  light: {
   bg: "#f5f8f2",
   panel: "#ffffff",
   alt: "#e6efe1",
   ink: "#14251a",
   ink2: "#3d5a45",
   ink3: "#4f6e5c",
   line: "#cfdfcb",
   line2: "#74907d",
   shadow: "#14251a",
   green: "#0a6d37",
   forest: "#0e471d",
   lime: "#718516",
   teal: "#157171",
   blue: "#1b5274",
   violet: "#46375f",
   plum: "#531b39",
   red: "#a43427",
   crimson: "#76151a",
   orange: "#ae6626",
   amber: "#9e8337",
   slate: "#616c63"
  },
  dark: {
   bg: "#0e150f",
   panel: "#141d16",
   alt: "#1d2a1f",
   ink: "#e6f2e6",
   ink2: "#a8c2ac",
   ink3: "#8ca492",
   line: "#26362a",
   line2: "#547a5c",
   shadow: "#000000",
   green: "#6bc987",
   forest: "#66a36f",
   lime: "#c3df7b",
   teal: "#57b6b6",
   blue: "#5c9ac4",
   violet: "#8775a9",
   plum: "#9d587a",
   red: "#e87a69",
   crimson: "#bb5757",
   orange: "#f8aa6d",
   amber: "#efd689",
   slate: "#9ca89e"
  }
 }
}, {
 id: "murica",
 name: "Murica",
 schema: THEME_SCHEMA,
 pairedWith: null,
 modes: {
  light: {
   bg: "#ffffff",
   panel: "#ffffff",
   alt: "#eef2f8",
   ink: "#101a2e",
   ink2: "#3c4a63",
   ink3: "#566078",
   line: "#d3dae6",
   line2: "#8794aa",
   shadow: "#101a2e",
   green: "#1a3680",
   forest: "#1659b5",
   lime: "#4f7eae",
   teal: "#4e6981",
   blue: "#0a46b9",
   violet: "#282162",
   plum: "#520c17",
   red: "#ba2c25",
   crimson: "#810010",
   orange: "#c64e31",
   amber: "#81393b",
   slate: "#65696f"
  },
  dark: {
   bg: "#0c1220",
   panel: "#121a2c",
   alt: "#1b2539",
   ink: "#eef2fa",
   ink2: "#adb9cf",
   ink3: "#8e9bb3",
   line: "#24304a",
   line2: "#55648a",
   shadow: "#000000",
   green: "#77a4f6",
   forest: "#4885df",
   lime: "#bbdbff",
   teal: "#78a1bd",
   blue: "#6492ff",
   violet: "#6163b8",
   plum: "#a55156",
   red: "#f9786a",
   crimson: "#ca5553",
   orange: "#ffb69f",
   amber: "#c8787b",
   slate: "#d7dfe8"
  }
 }
}, {
 id: "matrix",
 name: "Matrix",
 schema: THEME_SCHEMA,
 pairedWith: null,
 mono: true,
 modes: {
  dark: {
   bg: "#000000",
   panel: "#040a05",
   alt: "#0b160c",
   ink: "#4dff85",
   ink2: "#2fd96d",
   ink3: "#23b058",
   line: "#123d1f",
   line2: "#1f7a3c",
   shadow: "#000000",
   green: "#39ff78",
   forest: "#1fbb57",
   lime: "#8dff6a",
   teal: "#2ee6a4",
   blue: "#27d97f",
   violet: "#63ff9b",
   plum: "#9dffbb",
   red: "#a8ff4d",
   crimson: "#16a34a",
   orange: "#c7ff8f",
   amber: "#5ce07a",
   slate: "#7fbf8f"
  }
 }
} ];

const THEME_RENAMED = {
 americana: "murica"
};

const themeId = id => THEME_RENAMED[id] || String(id || "default");

function modeFill(mode, fallback) {
 const src = mode && typeof mode === "object" ? mode : {};
 const out = {}, have = [];
 SWATCHES.forEach(s => {
  const v = hexNorm(src[s.k]);
  if (v) {
   out[s.k] = v;
   have.push(s);
  }
 });
 SWATCHES.forEach(s => {
  if (out[s.k]) return;
  const stock = hexNorm((fallback || {})[s.k]) || PRESETS_T[0].modes.light[s.k];
  const kin = have.filter(h => h.kind === s.kind);
  if (!kin.length) {
   out[s.k] = stock;
   return;
  }
  let best = kin[0], bd = Infinity;
  kin.forEach(h => {
   const d = colourGap(stock, out[h.k]);
   if (d < bd) {
    bd = d;
    best = h;
   }
  });
  out[s.k] = out[best.k];
 });
 return out;
}

function themeNorm(t, fallbackId) {
 const src = t && typeof t === "object" ? t : {};
 const base = PRESETS_T.find(p => p.id === (fallbackId || src.pairedWith)) || PRESETS_T[0];
 const modes = src.modes && typeof src.modes === "object" ? src.modes : {};
 const has = k => modes[k] && typeof modes[k] === "object" && Object.keys(modes[k]).length;
 const out = {
  id: String(src.id || "t" + Math.random().toString(36).slice(2, 9)),
  name: String(src.name || "Theme").slice(0, 40),
  schema: THEME_SCHEMA,
  pairedWith: src.pairedWith ? String(src.pairedWith) : null,
  modes: {}
 };
 if (src.mono) out.mono = true;
 const lk = src.link && typeof src.link === "object" ? src.link : null;
 out.link = {
  on: !!(lk && lk.on),
  off: {
   light: {},
   dark: {}
  }
 };
 [ "light", "dark" ].forEach(m => {
  const o = lk && lk.off && lk.off[m];
  if (!o || typeof o !== "object") return;
  SURFACE_KEYS.forEach(k => {
   const v = o[k];
   if (v && isFinite(v.dL) && isFinite(v.dC)) out.link.off[m][k] = {
    dL: +v.dL,
    dC: +v.dC
   };
  });
 });
 if (has("light")) out.modes.light = modeFill(modes.light, base.modes.light);
 if (has("dark")) out.modes.dark = modeFill(modes.dark, base.modes.dark || base.modes.light);
 if (!out.modes.light && !out.modes.dark) out.modes = JSON.parse(JSON.stringify(base.modes));
 return out;
}

function linkCapture(t, mode) {
 const m = t.modes[mode];
 if (!m) return;
 const base = oklch(m.bg) || {
  L: 1,
  C: 0,
  h: 0
 };
 const off = {};
 SURFACE_KEYS.forEach(k => {
  const c = oklch(m[k]) || base;
  off[k] = {
   dL: +(c.L - base.L).toFixed(4),
   dC: +(c.C - base.C).toFixed(4)
  };
 });
 t.link = t.link || {
  on: false,
  off: {
   light: {},
   dark: {}
  }
 };
 t.link.off[mode] = off;
}

function linkEdit(t, mode, key, hex) {
 const m = t.modes[mode], off = ((t.link || {}).off || {})[mode] || {};
 const c = oklch(hex);
 if (!c) return;
 const mine = off[key] || {
  dL: 0,
  dC: 0
 };
 const base = {
  L: c.L - mine.dL,
  C: Math.max(0, c.C - mine.dC),
  h: c.h
 };
 SURFACE_KEYS.forEach(k => {
  const d = off[k] || {
   dL: 0,
   dC: 0
  };
  m[k] = k === key ? hexNorm(hex) : oklchHex({
   L: Math.max(0, Math.min(1, base.L + d.dL)),
   C: Math.max(0, base.C + d.dC),
   h: base.h
  });
 });
}

function themeDup(t) {
 const copy = JSON.parse(JSON.stringify(t));
 copy.id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
 copy.name = (t.name + " copy").slice(0, 40);
 copy.pairedWith = t.pairedWith || (PRESETS_T.some(p => p.id === t.id) ? t.id : null);
 delete copy.mono;
 return themeNorm(copy);
}

function themeHalf(t, mode) {
 const from = t.modes.light || t.modes.dark;
 t.modes[mode] = JSON.parse(JSON.stringify(from));
 if (t.link && t.link.off) linkCapture(t, mode);
}

function themeRevertTo(t) {
 const src = PRESETS_T.find(p => p.id === t.pairedWith);
 if (!src) return false;
 Object.keys(t.modes).forEach(m => {
  if (src.modes[m]) t.modes[m] = JSON.parse(JSON.stringify(src.modes[m]));
 });
 Object.keys(src.modes).forEach(m => {
  if (!t.modes[m]) t.modes[m] = JSON.parse(JSON.stringify(src.modes[m]));
 });
 return true;
}

const THEME_WRAP = "squid-theme";

function themeExport(t) {
 const out = {
  app: THEME_WRAP,
  schema: THEME_SCHEMA,
  theme: themeNorm(JSON.parse(JSON.stringify(t)))
 };
 delete out.theme.id;
 return JSON.stringify(out, null, 1);
}

function themeImport(text) {
 let raw;
 try {
  raw = JSON.parse(String(text || ""));
 } catch (e) {
  return null;
 }
 if (!raw || typeof raw !== "object") return null;
 const src = raw.theme && typeof raw.theme === "object" ? raw.theme : raw;
 if (!src.modes || typeof src.modes !== "object") return null;
 const t = themeNorm({
  ...src,
  id: null
 });
 t.id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
 t.name = String(src.name || "Imported").slice(0, 40);
 t.pairedWith = PRESETS_T.some(p => p.id === src.pairedWith) ? src.pairedWith : null;
 delete t.mono;
 return t;
}

function themeUpsert(t) {
 const list = (S.look && S.look.themes || []).filter(x => x.id !== t.id);
 list.push(t);
 S.look = {
  ...S.look || {},
  themes: list
 };
}

function themeRemove(id) {
 const list = (S.look && S.look.themes || []).filter(x => x.id !== id);
 S.look = {
  id: (S.look || {}).id === id ? "default" : (S.look || {}).id,
  themes: list
 };
}

function themePin(t) {
 return t.modes.light && t.modes.dark ? "" : t.modes.dark ? "dark" : "light";
}

const LOOKCSS = "ledgerscale.themecss", LOOKPIN = "ledgerscale.themepin", LOOKSEL = "ledgerscale.look";

function allThemes() {
 const mine = (S.look && S.look.themes || []).map(t => themeNorm(t));
 return PRESETS_T.concat(mine);
}

function activeTheme() {
 const id = themeId(S.look && S.look.id || "default");
 return allThemes().find(t => t.id === id) || PRESETS_T[0];
}

function modeCSS(m) {
 const d = themeDerive(m);
 return SWATCH_KEYS.map(k => `--pal-${k}:${m[k]}`).concat(DERIVED.map(k => `--pal-${k}:${d[k]}`)).join(";");
}

function themeCSS(t) {
 const out = [];
 if (t.modes.light) out.push(":root:root{" + modeCSS(t.modes.light) + "}");
 if (t.modes.dark) out.push(':root:root[data-scheme="dark"]{' + modeCSS(t.modes.dark) + "}");
 if (t.modes.dark && !t.modes.light) out.push(":root:root{" + modeCSS(t.modes.dark) + "}");
 return out.join("\n");
}

function themeVars(t, mode) {
 const m = (t.modes || {})[mode] || (t.modes || {}).light || (t.modes || {}).dark;
 if (!m) return "";
 const v = {
  ...m,
  ...themeDerive(m)
 };
 const out = SWATCH_KEYS.concat(DERIVED).map(k => "--pal-" + k + ":" + v[k]);
 Object.keys(ROLE_OF).forEach(r => out.push("--" + r + ":" + v[ROLE_OF[r]]));
 return out.join(";");
}

function themeInstall(t) {
 const css = themeCSS(t);
 THEMEPIN = themePin(t);
 themeCSSApply(css);
 themeResolve();
 try {
  localStorage.setItem(LOOKCSS, css);
  localStorage.setItem(LOOKPIN, THEMEPIN);
  localStorage.setItem(LOOKSEL, JSON.stringify(S.look || {
   id: "default",
   themes: []
  }));
 } catch (e) {}
}

function lookFromCache() {
 try {
  const raw = JSON.parse(localStorage.getItem(LOOKSEL) || "null");
  if (!raw || typeof raw !== "object") return;
  const themes = (Array.isArray(raw.themes) ? raw.themes : []).slice(0, 40).map(t => themeNorm(t));
  const id = themeId(raw.id);
  const known = PRESETS_T.some(p => p.id === id) || themes.some(t => t.id === id);
  S.look = {
   id: known ? id : "default",
   themes: themes
  };
 } catch (e) {}
}

function applyLook() {
 themeInstall(activeTheme());
}

function pickTheme(id) {
 S.look = {
  ...S.look || {},
  id: String(id)
 };
 applyLook();
 saveSettings();
}

function themeFindings(t, mode) {
 const m = t.modes[mode];
 if (!m) return [];
 const v = {
  ...m,
  ...themeDerive(m)
 };
 const at = role => v[ROLE_OF[role]];
 const out = [];
 const say = (level, swatch, affects, detail) => out.push({
  level: level,
  mode: mode,
  swatch: swatch,
  affects: affects,
  detail: detail
 });
 [ [ "ink", "Text" ], [ "ink2", "Second text" ], [ "ink3", "Quiet text" ] ].forEach(([k, name]) => {
  [ [ "bg", "the page" ], [ "panel", "a panel" ], [ "alt", "an inset" ] ].forEach(([s, where]) => {
   const r = contrast(v[k], v[s]);
   if (r < 4.5) say("unreadable", k, name + " on " + where, r.toFixed(1) + ":1");
  });
 });
 [ [ "on-green", "green", "Text on the green fill" ], [ "on-red", "red", "Text on the red fill" ], [ "on-blue", "blue", "Text on the blue fill" ] ].forEach(([k, fill, name]) => {
  const r = contrast(v[k], v[fill]);
  if (r < 4.5) say("unreadable", fill, name, r.toFixed(1) + ":1");
 });
 const gi = contrast(v["green-ink"], v.bg);
 if (gi < 4.5) say("unreadable", "green", "The active tab label", gi.toFixed(1) + ":1");
 const marks = new Set([ "line2" ]);
 COLOUR_SETS.forEach(([, roles]) => roles.forEach(r => marks.add(ROLE_OF[r])));
 [ ...marks ].forEach(k => {
  const r = contrast(v[k], v.bg);
  if (r < 3) say("hidden", k, (SWATCHES.find(s => s.k === k) || {
   name: k
  }).name + " against the page", r.toFixed(1) + ":1");
 });
 if (t.mono) return out;
 COLOUR_SETS.forEach(([name, roles]) => {
  const seen = [];
  roles.forEach(r => {
   const k = ROLE_OF[r], hex = at(r);
   seen.forEach(p => {
    if (p.k === k) return;
    const d = colourGap(p.hex, hex);
    if (d < ALIKE && !out.some(f => f.level === "alike" && f.swatch === k && f.affects === name)) say("alike", k, name, (SWATCHES.find(s => s.k === p.k) || {
     name: p.k
    }).name + " is this close: " + d.toFixed(3));
   });
   seen.push({
    k: k,
    hex: hex
   });
  });
 });
 return out;
}
