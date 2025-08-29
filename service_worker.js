var CFG_KEY = "autodartsConfigs";
var LIVE_KEY_PREFIX = "liveData::";
function getConfigs() {
  return chrome.storage.sync.get([CFG_KEY]).then(function (r) {
    return r && r[CFG_KEY] ? r[CFG_KEY] : {};
  });
}
function setConfigs(c) {
  var o = {};
  o[CFG_KEY] = c;
  return chrome.storage.sync.set(o);
}
function getConfigFor(origin) {
  return getConfigs().then(function (cfgs) {
    var cfg = cfgs[origin] || {
      variables: [],
      webhook: { enabled: false, url: "" },
    };
    if (!cfg.webhook)
      cfg.webhook =
        cfg.export && cfg.export.webhook
          ? cfg.export.webhook
          : { enabled: false, url: "" };
    return cfg;
  });
}
function saveLiveData(origin, payload) {
  var o = {};
  o[LIVE_KEY_PREFIX + origin] = payload;
  return chrome.storage.local.set(o).then(function () {
    return chrome.storage.local.set({ lastUpdate: Date.now() });
  });
}
function pushPOST(origin, data, webhook) {
  if (!webhook || !webhook.enabled || !webhook.url) return Promise.resolve();
  try {
    return fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: origin, data: data, ts: Date.now() }),
    }).then(
      function () {},
      function () {},
    );
  } catch (e) {
    return Promise.resolve();
  }
}
function pushExports(origin, data) {
  return getConfigFor(origin).then(function (cfg) {
    return pushPOST(origin, data, cfg.webhook || { enabled: false, url: "" });
  });
}
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  (function () {
    if (msg && msg.type === "LIVE_DATA") {
      var origin = msg.origin;
      var data = msg.data || {};
      return saveLiveData(origin, data)
        .then(function () {
          return pushExports(origin, data);
        })
        .then(function () {
          sendResponse({ ok: true });
        });
    }
    if (msg && msg.type === "GET_CONFIG") {
      return getConfigFor(msg.origin).then(function (cfg) {
        sendResponse({ ok: true, config: cfg });
      });
    }
    if (msg && msg.type === "SAVE_CONFIG") {
      return getConfigs()
        .then(function (cfgs) {
          cfgs[msg.origin] = msg.config;
          return setConfigs(cfgs);
        })
        .then(function () {
          sendResponse({ ok: true });
        });
    }
    if (msg && msg.type === "GET_LIVE") {
      var key = LIVE_KEY_PREFIX + msg.origin;
      return chrome.storage.local.get([key]).then(function (obj) {
        sendResponse({ ok: true, data: obj[key] || {} });
      });
    }
    if (msg && msg.type === "EXECUTE_PICKER") {
      var tabId =
        sender && sender.tab && sender.tab.id ? sender.tab.id : msg.tabId;
      if (!tabId) {
        sendResponse({ ok: false, error: "No tabId" });
        return Promise.resolve();
      }
      return chrome.tabs.sendMessage(tabId, { type: "START_PICKER" }).then(
        function () {
          sendResponse({ ok: true, path: "sendMessage" });
        },
        function () {
          return chrome.scripting
            .executeScript({
              target: { tabId: tabId },
              files: ["content/picker.js"],
            })
            .then(
              function () {
                sendResponse({ ok: true, path: "executeScript" });
              },
              function (e) {
                sendResponse({ ok: false, error: String(e) });
              },
            );
        },
      );
    }
    sendResponse({ ok: false, error: "Unknown message type" });
    return Promise.resolve();
  })().catch(function (err) {
    try {
      sendResponse({ ok: false, error: String(err) });
    } catch (e) {}
  });
  return true;
});
if (
  chrome &&
  chrome.contextMenus &&
  chrome.runtime &&
  chrome.runtime.onInstalled
) {
  chrome.runtime.onInstalled.addListener(function () {
    try {
      chrome.contextMenus.create({
        id: "openOptions",
        title: "Autodarts Scraper: Einstellungen",
        contexts: ["action"],
      });
    } catch (e) {}
  });
  if (chrome.contextMenus.onClicked) {
    chrome.contextMenus.onClicked.addListener(function (info) {
      if (info && info.menuItemId === "openOptions") {
        chrome.runtime.openOptionsPage();
      }
    });
  }
}
