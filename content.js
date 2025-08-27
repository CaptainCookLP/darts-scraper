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

function getSelector(el) {
  if (el.id) return `#${el.id}`;
  const path = [];
  while (el && el.nodeType === 1 && el.tagName.toLowerCase() !== 'html') {
    let tag = el.tagName.toLowerCase();
    const siblings = Array.from(el.parentNode.children).filter(c => c.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      tag += `:nth-of-type(${index})`;
    }
    path.unshift(tag);
    el = el.parentElement;
  }
  return path.join(' > ');
}

function startSelection() {
  let last;
  function over(e) {
    e.target.style.outline = '2px solid red';
    last = e.target;
  }
  function out(e) {
    e.target.style.outline = '';
  }
  function click(e) {
    e.preventDefault();
    e.stopPropagation();
    cleanup();
    const selector = getSelector(e.target);
    const name = prompt('Variablenname?');
    if (name) {
      chrome.storage.sync.get('variables', data => {
        const variables = data.variables || [];
        variables.push({name, selector});
        chrome.storage.sync.set({variables});
      });
    }
  }
  function cleanup() {
    document.removeEventListener('mouseover', over);
    document.removeEventListener('mouseout', out);
    document.removeEventListener('click', click, true);
    if (last) last.style.outline = '';
  }
  document.addEventListener('mouseover', over);
  document.addEventListener('mouseout', out);
  document.addEventListener('click', click, true);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'start-selection') {
    startSelection();
  }
});

init();
