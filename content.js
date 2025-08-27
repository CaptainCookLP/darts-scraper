const observers = {};

function sendValue(name, element) {
  const value = element.textContent.trim();
  chrome.storage.sync.get('values', data => {
    const values = data.values || {};
    values[name] = value;
    chrome.storage.sync.set({values});
    chrome.runtime.sendMessage({type: 'update', name, value});
  });
}

function watchVariable(v) {
  const element = document.querySelector(v.selector);
  if (!element) return;
  sendValue(v.name, element);
  const observer = new MutationObserver(() => sendValue(v.name, element));
  observer.observe(element, {childList: true, subtree: true, characterData: true});
  observers[v.name] = observer;
}

function setupWatchers(vars) {
  Object.values(observers).forEach(o => o.disconnect());
  for (const k in observers) delete observers[k];
  vars.forEach(watchVariable);
}

function init() {
  chrome.storage.sync.get('variables', data => {
    setupWatchers(data.variables || []);
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.variables) {
    setupWatchers(changes.variables.newValue || []);
  }
});

init();
