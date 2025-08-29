const ORIGIN = "play.autodarts.io";

function startPicker() {
  chrome.tabs
    .query({ active: true, currentWindow: true })
    .then(function (tabs) {
      var tab = tabs && tabs[0];
      if (!tab) return;
      var isAd = false;
      try {
        isAd = new URL(tab.url || "").host === ORIGIN;
      } catch (e) {}
      if (!isAd) {
        return chrome.tabs.create({ url: "https://" + ORIGIN }).then(function (created) {
          var tabId = created.id;
          var listener = function (id, info) {
            if (id === tabId && info && info.status === "complete") {
              chrome.runtime.sendMessage({ type: "EXECUTE_PICKER", tabId: tabId }, function () {});
              chrome.tabs.onUpdated.removeListener(listener);
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
        });
      }
      return chrome.runtime.sendMessage({ type: "EXECUTE_PICKER", tabId: tab.id }, function () {});
    });
}

document.getElementById("openOptions").addEventListener("click", function () {
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
});

document.getElementById("addVar").addEventListener("click", function () {
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  setTimeout(startPicker, 300);
});

