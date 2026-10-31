var THEMEPREF = "";

var THEMEPIN = "";

function themeCSSApply(css) {
 var s = document.getElementById("themecss");
 if (!s) {
  s = document.createElement("style");
  s.id = "themecss";
  document.head.appendChild(s);
 }
 s.textContent = css || "";
}

function themeBar() {
 try {
  var m = document.querySelector('meta[name="theme-color"]');
  var v = getComputedStyle(document.documentElement).getPropertyValue("--pal-bg").trim();
  if (m && v) m.setAttribute("content", v);
 } catch (e) {}
}

function themeResolve() {
 var d = document.documentElement, host = d.getAttribute("data-theme");
 var dark = THEMEPIN ? THEMEPIN === "dark" : THEMEPREF ? THEMEPREF === "dark" : host === "dark" || host === "light" ? host === "dark" : window.matchMedia("(prefers-color-scheme:dark)").matches;
 d.setAttribute("data-scheme", dark ? "dark" : "light");
 themeBar();
}

try {
 THEMEPREF = localStorage.getItem("ledgerscale.theme") || "";
} catch (e) {}

try {
 THEMEPIN = localStorage.getItem("ledgerscale.themepin") || "";
} catch (e) {}

try {
 themeCSSApply(localStorage.getItem("ledgerscale.themecss") || "");
} catch (e) {}

function scaleResolve() {
 var d = document.documentElement, t = "", n = "";
 try {
  t = localStorage.getItem("ledgerscale.text") || "";
  n = localStorage.getItem("ledgerscale.density") || "";
 } catch (e) {}
 if (t) d.setAttribute("data-text", t); else d.removeAttribute("data-text");
 if (n) d.setAttribute("data-density", n); else d.removeAttribute("data-density");
}

scaleResolve();

themeResolve();

try {
 window.matchMedia("(prefers-color-scheme:dark)").addEventListener("change", themeResolve);
} catch (e) {}

try {
 new MutationObserver(themeResolve).observe(document.documentElement, {
  attributes: true,
  attributeFilter: [ "data-theme" ]
 });
} catch (e) {}
