document.getElementById('add').addEventListener('click', async () => {
  const name = document.getElementById('var-name').value.trim();
  const selector = document.getElementById('var-selector').value.trim();
  if (!name || !selector) return;
  const {variables = []} = await chrome.storage.sync.get('variables');
  variables.push({name, selector});
  await chrome.storage.sync.set({variables});
  document.getElementById('var-name').value = '';
  document.getElementById('var-selector').value = '';
});

document.getElementById('select').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, {type: 'start-selection'});
  }
});

document.getElementById('open').addEventListener('click', () => {
  chrome.windows.create({
    url: chrome.runtime.getURL('dashboard.html'),
    type: 'popup',
    width: 400,
    height: 600
  });
});
