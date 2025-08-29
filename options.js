const CFG_KEY = "autodartsConfigs";
const ORIGIN = "play.autodarts.io";
const saveBtn = document.getElementById("save");
const varsTbody = document.querySelector("#vars tbody");
const addVarBtn = document.getElementById("addVar");
const manualVarBtn = document.getElementById("manualVar");
const whEnabledIn = document.getElementById("whEnabled");
const whUrlIn = document.getElementById("whUrl");
const livePre = document.getElementById("liveJson");
const copyBtn = document.getElementById("copyJson");
const refreshBtn = document.getElementById("refresh");
const dlXmlBtn = document.getElementById("downloadXml");

function selectTab(id) {
  const tabs = document.querySelectorAll(".tab");
  const views = document.querySelectorAll(".view");
  for (let i = 0; i < tabs.length; i++) tabs[i].classList.remove("active");
  for (let j = 0; j < views.length; j++) views[j].classList.remove("active");
  document.getElementById("tab-" + id).classList.add("active");
  document.getElementById("view-" + id).classList.add("active");
}
document.getElementById("tab-settings").addEventListener("click", function () {
  selectTab("settings");
});
document.getElementById("tab-output").addEventListener("click", function () {
  selectTab("output");
  updateLive();
});

function getConfigs() {
  return chrome.storage.sync.get([CFG_KEY]).then(function (r) {
    return r[CFG_KEY] || {};
  });
}
function setConfigs(cfg) {
  const o = {};
  o[CFG_KEY] = cfg;
  return chrome.storage.sync.set(o);
}
function defaultCfg() {
  return { variables: [], webhook: { enabled: false, url: "" } };
}

function row(def = {}) {
  const tr = document.createElement("tr");

  const nameTd = document.createElement("td");
  const nameIn = document.createElement("input");
  nameIn.className = "v-name";
  nameIn.value = def.name || "";
  nameTd.appendChild(nameIn);
  tr.appendChild(nameTd);

  const selTd = document.createElement("td");
  const selIn = document.createElement("input");
  selIn.className = "v-sel";
  selIn.value = def.selector || "";
  selTd.appendChild(selIn);
  tr.appendChild(selTd);

  const modeTd = document.createElement("td");
  const modeSel = document.createElement("select");
  modeSel.className = "v-mode";
  ["text", "number", "attr"].forEach(function (m) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    if (def.mode === m) opt.selected = true;
    modeSel.appendChild(opt);
  });
  modeTd.appendChild(modeSel);
  tr.appendChild(modeTd);

  const extraTd = document.createElement("td");
  const extraIn = document.createElement("input");
  extraIn.className = "v-extra";
  extraIn.placeholder = "attr-Name oder Regex";
  extraIn.value = def.mode === "attr" ? def.attr || "" : def.regex || "";
  extraTd.appendChild(extraIn);
  tr.appendChild(extraTd);

  const removeTd = document.createElement("td");
  const removeBtn = document.createElement("button");
  removeBtn.className = "remove";
  removeBtn.textContent = "Entfernen";
  removeBtn.addEventListener("click", function () {
    tr.remove();
  });
  removeTd.appendChild(removeBtn);
  tr.appendChild(removeTd);

  return tr;
}

function renderVars(list) {
  varsTbody.innerHTML = "";
  for (let i = 0; i < list.length; i++) varsTbody.appendChild(row(list[i]));
}
function collectVars() {
  const res = [];
  const rows = varsTbody.querySelectorAll("tr");
  for (let i = 0; i < rows.length; i++) {
    const tr = rows[i];
    const name = tr.querySelector(".v-name").value.trim();
    const selector = tr.querySelector(".v-sel").value.trim();
    const mode = tr.querySelector(".v-mode").value;
    const extra = tr.querySelector(".v-extra").value.trim();
    const def = { name: name, selector: selector, mode: mode };
    if (mode === "attr") def.attr = extra;
    if (mode === "number" && extra) def.regex = extra;
    res.push(def);
  }
  return res;
}

function loadCfg() {
  return getConfigs().then(function (cfgs) {
    var cfg = cfgs[ORIGIN] || defaultCfg();
    renderVars(cfg.variables);
    whEnabledIn.checked = !!(cfg.webhook && cfg.webhook.enabled);
    whUrlIn.value = cfg.webhook && cfg.webhook.url ? cfg.webhook.url : "";
  });
}

function saveCfg() {
  return getConfigs()
    .then(function (cfgs) {
      cfgs[ORIGIN] = {
        variables: collectVars(),
        webhook: { enabled: !!whEnabledIn.checked, url: whUrlIn.value.trim() },
      };
      return setConfigs(cfgs);
    })
    .then(function () {
      const urlPat = "https://" + ORIGIN + "/*";
      return chrome.tabs.query({ url: urlPat }).then(function (tabs) {
        const ps = [];
        for (let i = 0; i < tabs.length; i++) {
          try {
            ps.push(
              chrome.tabs.sendMessage(tabs[i].id, { type: "CONFIG_UPDATED" }),
            );
          } catch (e) {}
        }
        return Promise.all(ps);
      });
    })
    .then(function () {
      console.log("Gespeichert ✓");
    })
    .catch(function (err) {
      console.error("Speichern fehlgeschlagen", err);
    });
}

function updateLive() {
  return chrome.runtime.sendMessage(
    { type: "GET_LIVE", origin: ORIGIN },
    function (resp) {
      livePre.textContent = JSON.stringify((resp && resp.data) || {}, null, 2);
    },
  );
}

// Picker
function startPicker() {
  return chrome.tabs
    .query({ active: true, currentWindow: true })
    .then(function (tabs) {
      var tab = tabs && tabs[0];
      if (!tab) {
        alert("Kein aktiver Tab gefunden.");
        return;
      }
      var isAd = false;
      try {
        isAd = new URL(tab.url || "").host === "play.autodarts.io";
      } catch (e) {}
      if (!isAd) {
        return chrome.tabs
          .create({ url: "https://play.autodarts.io" })
          .then(function (created) {
            var tabId = created.id;
            var listener = function (id, info) {
              if (id === tabId && info && info.status === "complete") {
                chrome.runtime.sendMessage(
                  { type: "EXECUTE_PICKER", tabId: tabId },
                  function () {},
                );
                chrome.tabs.onUpdated.removeListener(listener);
              }
            };
            chrome.tabs.onUpdated.addListener(listener);
          });
      }
      return chrome.runtime.sendMessage(
        { type: "EXECUTE_PICKER", tabId: tab.id },
        function (resp) {
          if (!resp || !resp.ok)
            alert(
              "Fehler beim Starten des Auswahlmodus: " +
                (resp && resp.error ? resp.error : ""),
            );
        },
      );
    });
}

chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (msg && msg.type === "PICKED_ELEMENT") {
    var modal = document.getElementById("addVarModal");
    var selIn = document.getElementById("m-selector");
    var sampleIn = document.getElementById("m-sample");
    var nameIn = document.getElementById("m-name");
    var modeSel = document.getElementById("m-mode");
    var extraRow = document.getElementById("m-extra-row");
    var extraIn = document.getElementById("m-extra");
    var extraLabel = document.getElementById("m-extra-label");

    selIn.value = msg.selector || "";
    sampleIn.value = msg.sampleText || "";
    nameIn.value = "";
    modeSel.value = "text";
    extraIn.value = "";
    extraRow.style.display = "flex";
    extraLabel.textContent = "Regex / Attribut";

    function updateExtra() {
      var mode = modeSel.value;
      if (mode === "attr") {
        extraRow.style.display = "flex";
        extraIn.placeholder = "Attribut-Name (z. B. value, title, data-*)";
      } else if (mode === "number") {
        extraRow.style.display = "flex";
        extraIn.placeholder = "Optional: Regex (z. B. (\\d+))";
      } else {
        extraRow.style.display = "none";
      }
    }
    updateExtra();
    modeSel.onchange = updateExtra;

    var addBtn = document.getElementById("m-add");
    var cancelBtn = document.getElementById("m-cancel");
    function close() {
      modal.classList.add("hidden");
      addBtn.onclick = null;
      cancelBtn.onclick = null;
    }

    addBtn.onclick = function () {
      var def = {
        name: nameIn.value.trim(),
        selector: selIn.value.trim(),
        mode: modeSel.value,
      };
      if (!def.name || !def.selector) {
        alert("Bitte Name und Selector angeben.");
        return;
      }
      if (def.mode === "attr") def.attr = extraIn.value.trim();
      if (def.mode === "number" && extraIn.value.trim())
        def.regex = extraIn.value.trim();
      varsTbody.appendChild(row(def));
      close();
      selectTab("settings");
    };
    cancelBtn.onclick = function () {
      close();
    };
    modal.classList.remove("hidden");
  }
});

// XML helpers
function xmlEscape(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function toXml(origin, cfg) {
  var parts = [];
  parts.push('<autodartsConfig origin="' + xmlEscape(origin) + '">');
  parts.push("  <webhook>");
  parts.push(
    "    <enabled>" +
      (cfg.webhook && cfg.webhook.enabled ? "true" : "false") +
      "</enabled>",
  );
  parts.push(
    "    <url>" + xmlEscape((cfg.webhook && cfg.webhook.url) || "") + "</url>",
  );
  parts.push("  </webhook>");
  parts.push("  <variables>");
  const list = cfg.variables || [];
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    parts.push("    <variable>");
    parts.push("      <name>" + xmlEscape(v.name || "") + "</name>");
    parts.push(
      "      <selector>" + xmlEscape(v.selector || "") + "</selector>",
    );
    parts.push("      <mode>" + xmlEscape(v.mode || "text") + "</mode>");
    if (v.regex) parts.push("      <regex>" + xmlEscape(v.regex) + "</regex>");
    if (v.attr) parts.push("      <attr>" + xmlEscape(v.attr) + "</attr>");
    parts.push("    </variable>");
  }
  parts.push("  </variables>");
  parts.push("</autodartsConfig>");
  return parts.join("\n");
}
function parseXmlToCfg(text, fallbackOrigin) {
  var parser = new DOMParser();
  var xml = parser.parseFromString(text, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Ungültiges XML");
  var root = xml.querySelector("autodartsConfig");
  if (!root) throw new Error("autodartsConfig root fehlt");
  var origin = (
    root.getAttribute("origin") ||
    fallbackOrigin ||
    "play.autodarts.io"
  ).trim();
  var webhook = { enabled: false, url: "" };
  var whNode = root.querySelector("webhook");
  if (whNode) {
    var en = (
      whNode.querySelector("enabled")
        ? whNode.querySelector("enabled").textContent || ""
        : ""
    )
      .trim()
      .toLowerCase();
    var url = (
      whNode.querySelector("url")
        ? whNode.querySelector("url").textContent || ""
        : ""
    ).trim();
    webhook.enabled = en === "true";
    webhook.url = url;
  }
  var variables = [];
  const vars = root.querySelectorAll("variables > variable");
  for (let i = 0; i < vars.length; i++) {
    const v = vars[i];
    const name = (
      v.querySelector("name") ? v.querySelector("name").textContent || "" : ""
    ).trim();
    const selector = (
      v.querySelector("selector")
        ? v.querySelector("selector").textContent || ""
        : ""
    ).trim();
    const mode = (
      v.querySelector("mode")
        ? v.querySelector("mode").textContent || "text"
        : "text"
    ).trim();
    const regex = (
      v.querySelector("regex") ? v.querySelector("regex").textContent || "" : ""
    ).trim();
    const attr = (
      v.querySelector("attr") ? v.querySelector("attr").textContent || "" : ""
    ).trim();
    const def = { name: name, selector: selector, mode: mode };
    if (regex) def.regex = regex;
    if (attr) def.attr = attr;
    if (name && selector) variables.push(def);
  }
  return {
    origin: origin,
    webhook: webhook,
    variables: variables,
  };
}

// Export XML
if (dlXmlBtn)
  dlXmlBtn.addEventListener("click", function () {
    getConfigs().then(function (cfgs) {
      var cfg = cfgs[ORIGIN] || defaultCfg();
      var xml = toXml(ORIGIN, cfg);
      var blob = new Blob([xml], { type: "application/xml" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "autodarts_settings_" + ORIGIN + ".xml";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(url);
        a.remove();
      }, 100);
    });
  });

// Import XML (file)
var importInput = document.getElementById("importXml");
var importBtn = document.getElementById("importBtn");
if (importBtn)
  importBtn.addEventListener("click", function () {
    importInput.click();
  });
if (importInput)
  importInput.addEventListener("change", function () {
    var file = importInput.files && importInput.files[0];
    if (!file) return;
    file
      .text()
      .then(function (text) {
        var parsed = parseXmlToCfg(text, ORIGIN);
        return getConfigs().then(function (cfgs) {
          cfgs[ORIGIN] = {
            variables: parsed.variables,
            webhook: parsed.webhook,
          };
          return setConfigs(cfgs).then(function () {
            renderVars(parsed.variables);
            whEnabledIn.checked = !!parsed.webhook.enabled;
            whUrlIn.value = parsed.webhook.url || "";
            return chrome.tabs
              .query({ url: "https://" + ORIGIN + "/*" })
              .then(function (tabs) {
                var ps = [];
                for (let i = 0; i < tabs.length; i++) {
                  try {
                    ps.push(
                      chrome.tabs.sendMessage(tabs[i].id, {
                        type: "CONFIG_UPDATED",
                      }),
                    );
                  } catch (e) {}
                }
                return Promise.all(ps);
              });
          });
        });
      })
      .then(function () {
        alert("Settings importiert ✅");
      })
      .catch(function (e) {
        alert("Import fehlgeschlagen: " + (e.message || e));
      })
      .finally(function () {
        importInput.value = "";
      });
  });

// Import Defaults (packaged settings.xml)
var importDefaultsBtn = document.getElementById("importDefaultsBtn");
if (importDefaultsBtn)
  importDefaultsBtn.addEventListener("click", function () {
    var url = chrome.runtime.getURL("settings.xml");
    fetch(url)
      .then(function (r) {
        return r.text();
      })
      .then(function (text) {
        var parsed = parseXmlToCfg(text, ORIGIN);
        return getConfigs().then(function (cfgs) {
          cfgs[ORIGIN] = {
            variables: parsed.variables,
            webhook: parsed.webhook,
          };
          return setConfigs(cfgs).then(function () {
            renderVars(parsed.variables);
            whEnabledIn.checked = !!parsed.webhook.enabled;
            whUrlIn.value = parsed.webhook.url || "";
            return chrome.tabs
              .query({ url: "https://" + ORIGIN + "/*" })
              .then(function (tabs) {
                var ps = [];
                for (let i = 0; i < tabs.length; i++) {
                  try {
                    ps.push(
                      chrome.tabs.sendMessage(tabs[i].id, {
                        type: "CONFIG_UPDATED",
                      }),
                    );
                  } catch (e) {}
                }
                return Promise.all(ps);
              });
          });
        });
      })
      .then(function () {
        alert("Werkseinstellungen importiert ✅");
      })
      .catch(function (e) {
        alert("Konnte defaults nicht laden: " + (e.message || e));
      });
  });

// Test button
document.getElementById("testVars").addEventListener("click", function () {
  saveCfg()
    .then(function () {
      return chrome.tabs.query({ active: true, currentWindow: true });
    })
    .then(function (tabs) {
      var tab = tabs && tabs[0];
      if (!tab) {
        alert("Kein aktiver Tab");
        return;
      }
      return chrome.tabs
        .sendMessage(tab.id, {
          type: "EXTRACT_ONCE",
          origin: ORIGIN,
        })
        .then(
          function (resp) {
            if (resp && resp.ok)
              alert("Snapshot:\n" + JSON.stringify(resp.data, null, 2));
            else
              alert(
                "Konnte keine Daten extrahieren. Bist du auf play.autodarts.io?",
              );
          },
          function () {
            alert("Konnte nicht mit dem Tab kommunizieren.");
          },
        );
    });
});

// Events
saveBtn.addEventListener("click", function () {
  saveCfg();
});
addVarBtn.addEventListener("click", startPicker);
manualVarBtn.addEventListener("click", function () {
  varsTbody.appendChild(row({ name: "", selector: "", mode: "text" }));
});
copyBtn.addEventListener("click", function () {
  navigator.clipboard.writeText(livePre.textContent).then(function () {
    copyBtn.textContent = "Kopiert ✓";
    setTimeout(function () {
      copyBtn.textContent = "JSON kopieren";
    }, 1200);
  });
});
refreshBtn.addEventListener("click", updateLive);

// Init + auto-load defaults on first run
(function init() {
  getConfigs().then(function (cfgs) {
    if (
      !cfgs[ORIGIN] ||
      !cfgs[ORIGIN].variables ||
      cfgs[ORIGIN].variables.length === 0
    ) {
      var url = chrome.runtime.getURL("settings.xml");
      fetch(url)
        .then(function (r) {
          return r.text();
        })
        .then(function (text) {
          var parsed = parseXmlToCfg(text, ORIGIN);
          cfgs[ORIGIN] = {
            variables: parsed.variables,
            webhook: parsed.webhook,
          };
          return setConfigs(cfgs);
        })
        .then(loadCfg, loadCfg);
    } else {
      loadCfg();
    }
  });
})();

setInterval(function () {
  if (document.getElementById("view-output").classList.contains("active"))
    updateLive();
}, 1500);
