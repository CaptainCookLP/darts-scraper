function render(values) {
  const tbody = document.querySelector('#values tbody');
  tbody.innerHTML = '';
  Object.entries(values).forEach(([name, value]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${name}</td><td>${value}</td>`;
    tbody.appendChild(tr);
  });
}

async function init() {
  const {values = {}} = await chrome.storage.sync.get('values');
  render(values);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'update') {
    chrome.storage.sync.get('values', data => render(data.values || {}));
  }
});

init();
