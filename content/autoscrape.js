var ORIGIN_KEY = location.host;
function normalizeConfig(r) {
  var c = r || {};
  if (!Array.isArray(c.variables)) c.variables = [];
  if (!c.webhook)
    c.webhook =
      c.export && c.export.webhook
        ? c.export.webhook
        : { enabled: false, url: "" };
  return c;
}
function fetchConfig() {
  return new Promise(function (e) {
    try {
      chrome.runtime.sendMessage(
        { type: "GET_CONFIG", origin: ORIGIN_KEY },
        function (r) {
          e(normalizeConfig(r && r.config));
        },
      );
    } catch (t) {
      e(normalizeConfig(null));
    }
  });
}
function queryDeep(e) {
  var t = [];
  if (document) t.push(document);
  for (var r = 0; r < t.length; r++) {
    var n = t[r];
    try {
      var o = n.querySelector(e);
      if (o) return o;
    } catch (c) {}
    var a = n.querySelectorAll ? n.querySelectorAll("*") : [];
    for (var i = 0; i < a.length; i++) {
      var l = a[i];
      if (l && l.shadowRoot) t.push(l.shadowRoot);
    }
  }
  return null;
}
function numberFromText(e, t) {
  var r = (e || "").replace(",", ".").trim();
  var n = t ? new RegExp(t) : /-?\d+(\.\d+)?/;
  var o = r.match(n);
  var a = o ? Number(o[0]) : 0;
  return isFinite(a) ? a : 0;
}
function extractValue(e) {
  try {
    var t = queryDeep(e.selector);
    if (e.mode === "number") {
      if (!t) return 0;
      var r = (t.innerText || t.textContent || "").trim();
      return numberFromText(r, e.regex);
    }
    if (!t) return null;
    if (e.mode === "attr" && e.attr) return t.getAttribute(e.attr);
    return (t.innerText || t.textContent || "").trim();
  } catch (n) {
    return e.mode === "number" ? 0 : null;
  }
}
var ZERO_KEYS = {
  player1_legs: 1,
  player2_legs: 1,
  player1_sets: 1,
  player2_sets: 1,
  legs: 1,
  sets: 1,
  p1_legs: 1,
  p2_legs: 1,
  p1_sets: 1,
  p2_sets: 1,
};
function normalizeSpecials(e) {
  for (var t in e) {
    if (!Object.prototype.hasOwnProperty.call(e, t)) continue;
    if (ZERO_KEYS[t]) {
      var r = e[t];
      if (r == null) {
        e[t] = 0;
        continue;
      }
      if (typeof r === "number" && isFinite(r)) continue;
      if (typeof r === "string") {
        var n = numberFromText(r);
        e[t] = isFinite(n) ? n : 0;
      } else {
        var o = Number(r);
        e[t] = isFinite(o) ? o : 0;
      }
    }
  }
  return e;
}
var currentCfg = null;
var lastPayload = null;
var pending = false;
function buildPayload() {
  var e = {};
  var t = currentCfg && currentCfg.variables ? currentCfg.variables : [];
  for (var r = 0; r < t.length; r++) {
    var n = t[r];
    if (!n || !n.name || !n.selector) continue;
    e[n.name] = extractValue(n);
  }
  normalizeSpecials(e);
  return { ts: Date.now(), data: e };
}
function emitIfChanged() {
  var e = buildPayload();
  var t = lastPayload ? lastPayload.data : null;
  var r = JSON.stringify(e.data) !== JSON.stringify(t);
  if (r) {
    lastPayload = e;
    try {
      chrome.runtime.sendMessage(
        { type: "LIVE_DATA", origin: ORIGIN_KEY, data: e.data },
        function () {},
      );
    } catch (n) {
      console.warn("[Autodarts Scraper] sendMessage failed:", n);
    }
  }
  pending = false;
}
function scheduleEmit() {
  if (!pending) {
    pending = true;
    setTimeout(emitIfChanged, 120);
  }
}
function installObserver() {
  var e = document.documentElement || document.body;
  if (!e) return;
  var t = new MutationObserver(scheduleEmit);
  t.observe(e, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });
  window.addEventListener("load", scheduleEmit);
  document.addEventListener("visibilitychange", scheduleEmit);
  setInterval(scheduleEmit, 2000);
}
var __adPickerActive = false;
function __adStartPicker() {
  if (__adPickerActive) return;
  __adPickerActive = true;
  var e = document.createElement("style");
  e.textContent =
    "    .ad-picker-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }    .ad-picker-highlight { position: absolute; border: 2px dashed #00bcd4; background: rgba(0,188,212,0.12); pointer-events: none; }    .ad-picker-tooltip { position: fixed; left: 8px; bottom: 8px; background: #111; color: #fff; padding: 8px 10px; font: 12px/1.4 system-ui, sans-serif; border-radius: 8px; pointer-events: none; opacity: .9; }    .ad-picker-badge { position: fixed; right: 8px; bottom: 8px; background: #00bcd4; color: #00333a; padding: 6px 8px; border-radius: 999px; font: 12px/1.4 system-ui, sans-serif; pointer-events: none; }  ";
  document.documentElement.appendChild(e);
  var t = document.createElement("div");
  t.className = "ad-picker-overlay";
  var r = document.createElement("div");
  r.className = "ad-picker-highlight";
  var n = document.createElement("div");
  n.className = "ad-picker-tooltip";
  n.textContent = "Klicke ein Element (ESC: Abbrechen)";
  var o = document.createElement("div");
  o.className = "ad-picker-badge";
  o.textContent = "Auswahlmodus";
  t.appendChild(r);
  document.documentElement.appendChild(t);
  document.documentElement.appendChild(n);
  document.documentElement.appendChild(o);
  var a;
  var i = function (e) {
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    a = t;
    var n = t.getBoundingClientRect();
    r.style.left = n.left + "px";
    r.style.top = n.top + "px";
    r.style.width = n.width + "px";
    r.style.height = n.height + "px";
  };
  var l = function () {
    document.removeEventListener("mousemove", i, true);
    document.removeEventListener("click", s, true);
    document.removeEventListener("keydown", u, true);
    t.remove();
    n.remove();
    o.remove();
    e.remove();
    __adPickerActive = false;
  };
  var u = function (e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      l();
    }
  };
  function d(e) {
    if (!(e instanceof Element)) return "";
    var t = [];
    var r = e;
    while (e && e.nodeType === Node.ELEMENT_NODE) {
      if (e.id) {
        t.unshift("#" + CSS.escape(e.id));
        break;
      }
      var n = e.nodeName.toLowerCase();
      var o = (e.className || "")
        .toString()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (o.length)
        n +=
          "." +
          o
            .slice(0, 3)
            .map(function (e) {
              return CSS.escape(e);
            })
            .join(".");
      else {
        var a = e,
          nth = 1;
        while ((a = a.previousElementSibling)) nth++;
        n += ":nth-child(" + nth + ")";
      }
      t.unshift(n);
      e = e.parentElement;
      if (t.length > 6) break;
    }
    var c = t.join(" > ");
    try {
      var f = document.querySelectorAll(c);
      if (f.length > 1) {
        var h = 1;
        for (var v = 0; v < f.length; v++)
          if (f[v] === r) {
            h = v + 1;
            break;
          }
        c += ":nth-of-type(" + h + ")";
      }
    } catch (m) {}
    return c;
  }
  var s = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    var n = d(t);
    var o = (t.innerText || t.textContent || "").trim().slice(0, 200);
    try {
      chrome.runtime.sendMessage(
        { type: "PICKED_ELEMENT", selector: n, sampleText: o },
        function () {},
      );
    } catch (a) {}
    l();
  };
  document.addEventListener("mousemove", i, true);
  document.addEventListener("click", s, true);
  document.addEventListener("keydown", u, true);
}
chrome.runtime.onMessage.addListener(function (e, t, r) {
  try {
    if (e && e.type === "START_PICKER") {
      __adStartPicker();
      if (r) r({ ok: true });
      return;
    }
    if (e && e.type === "EXTRACT_ONCE") {
      try {
        if (r) r({ ok: true, data: buildPayload().data });
      } catch (n) {
        if (r) r({ ok: false });
      }
      return;
    }
    if (e && e.type === "CONFIG_UPDATED") {
      fetchConfig().then(function (e) {
        currentCfg = e;
        scheduleEmit();
      });
      if (r) r({ ok: true });
      return;
    }
  } catch (n) {}
});
window.__adStartPicker = __adStartPicker;
function main() {
  fetchConfig().then(function (e) {
    currentCfg = e;
    installObserver();
    scheduleEmit();
  });
}
main();
