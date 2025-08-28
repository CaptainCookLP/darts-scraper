
var CFG_KEY = 'autodartsConfigs';
var ORIGIN_INPUT = document.getElementById('origin');
var loadBtn = document.getElementById('loadOrigin');
var saveBtn = document.getElementById('save');
var varsTbody = document.querySelector('#vars tbody');
var addVarBtn = document.getElementById('addVar');
var manualVarBtn = document.getElementById('manualVar');
var wsUrlIn = document.getElementById('wsUrl');
var whEnabledIn = document.getElementById('whEnabled');
var whUrlIn = document.getElementById('whUrl');
var livePre = document.getElementById('liveJson');
var copyBtn = document.getElementById('copyJson');
var refreshBtn = document.getElementById('refresh');
var dlXmlBtn = document.getElementById('downloadXml');

function selectTab(id) {
  var tabs = document.querySelectorAll('.tab');
  var views = document.querySelectorAll('.view');
  for (var i=0;i<tabs.length;i++) tabs[i].classList.remove('active');
  for (var j=0;j<views.length;j++) views[j].classList.remove('active');
  document.getElementById('tab-' + id).classList.add('active');
  document.getElementById('view-' + id).classList.add('active');
}
document.getElementById('tab-settings').addEventListener('click', function(){ selectTab('settings'); });
document.getElementById('tab-output').addEventListener('click', function(){ selectTab('output'); updateLive(); });

function getConfigs() { return chrome.storage.sync.get([CFG_KEY]).then(function(r){ return r[CFG_KEY] || {}; }); }
function setConfigs(cfg) { var o={}; o[CFG_KEY]=cfg; return chrome.storage.sync.set(o); }
function defaultCfg() { return { variables: [], wsUrl: '', webhook: { enabled:false, url:'' } }; }

function row(def) {
  var tr = document.createElement('tr');
  tr.innerHTML = '' +
    '<td><input class="v-name" value="'+(def.name||'')+'"></td>' +
    '<td><input class="v-sel" value="'+(def.selector||'')+'"></td>' +
    '<td><select class="v-mode">' +
    '<option value="text"'+(def.mode==='text'?' selected':'')+'>text</option>' +
    '<option value="number"'+(def.mode==='number'?' selected':'')+'>number</option>' +
    '<option value="attr"'+(def.mode==='attr'?' selected':'')+'>attr</option>' +
    '</select></td>' +
    '<td><input class="v-extra" placeholder="attr-Name oder Regex" value="'+(def.mode==='attr'?(def.attr||''):(def.regex||''))+'"></td>' +
    '<td><button class="remove">Entfernen</button></td>';
  tr.querySelector('.remove').addEventListener('click', function(){ tr.remove(); });
  return tr;
}

function renderVars(list) {
  varsTbody.innerHTML = '';
  for (var i=0;i<list.length;i++) varsTbody.appendChild(row(list[i]));
}
function collectVars() {
  var res = [];
  var rows = varsTbody.querySelectorAll('tr');
  for (var i=0;i<rows.length;i++) {
    var tr = rows[i];
    var name = tr.querySelector('.v-name').value.trim();
    var selector = tr.querySelector('.v-sel').value.trim();
    var mode = tr.querySelector('.v-mode').value;
    var extra = tr.querySelector('.v-extra').value.trim();
    var def = { name:name, selector:selector, mode:mode };
    if (mode === 'attr') def.attr = extra;
    if (mode === 'number' && extra) def.regex = extra;
    res.push(def);
  }
  return res;
}

function loadCfg() {
  var origin = (ORIGIN_INPUT.value || 'play.autodarts.io').trim();
  return getConfigs().then(function(cfgs){
    var cfg = cfgs[origin] || defaultCfg();
    renderVars(cfg.variables);
    wsUrlIn.value = cfg.wsUrl || '';
    whEnabledIn.checked = !!(cfg.webhook && cfg.webhook.enabled);
    whUrlIn.value = (cfg.webhook && cfg.webhook.url) ? cfg.webhook.url : '';
  });
}

function saveCfg() {
  var origin = (ORIGIN_INPUT.value || 'play.autodarts.io').trim();
  return getConfigs().then(function(cfgs){
    cfgs[origin] = {
      variables: collectVars(),
      wsUrl: wsUrlIn.value.trim(),
      webhook: { enabled: !!whEnabledIn.checked, url: whUrlIn.value.trim() }
    };
    return setConfigs(cfgs);
  }).then(function(){
    var urlPat = 'https://' + (ORIGIN_INPUT.value || 'play.autodarts.io').trim() + '/*';
    return chrome.tabs.query({ url: urlPat }).then(function(tabs){
      var ps = [];
      for (var i=0;i<tabs.length;i++) {
        try { ps.push(chrome.tabs.sendMessage(tabs[i].id, { type: 'CONFIG_UPDATED' })); } catch(e){}
      }
      return Promise.all(ps);
    });
  }).then(function(){ alert('Gespeichert ✅'); });
}

function updateLive() {
  var origin = (ORIGIN_INPUT.value || 'play.autodarts.io').trim();
  return chrome.runtime.sendMessage({ type: 'GET_LIVE', origin: origin }, function(resp){
    livePre.textContent = JSON.stringify((resp && resp.data) || {}, null, 2);
  });
}

// Picker
function startPicker() {
  return chrome.tabs.query({active:true, currentWindow:true}).then(function(tabs){
    var tab = tabs && tabs[0];
    if (!tab) { alert('Kein aktiver Tab gefunden.'); return; }
    var isAd = false;
    try { isAd = (new URL(tab.url || '')).host === 'play.autodarts.io'; } catch(e){}
    if (!isAd) {
      return chrome.tabs.create({ url: 'https://play.autodarts.io' }).then(function(created){
        var tabId = created.id;
        var listener = function(id, info) {
          if (id === tabId && info && info.status === 'complete') {
            chrome.runtime.sendMessage({ type: 'EXECUTE_PICKER', tabId: tabId }, function(){});
            chrome.tabs.onUpdated.removeListener(listener);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
    }
    return chrome.runtime.sendMessage({ type: 'EXECUTE_PICKER', tabId: tab.id }, function(resp){
      if (!resp || !resp.ok) alert('Fehler beim Starten des Auswahlmodus: ' + (resp && resp.error ? resp.error : ''));
    });
  });
}

chrome.runtime.onMessage.addListener(function(msg, sender) {
  if (msg && msg.type === 'PICKED_ELEMENT') {
    var modal = document.getElementById('addVarModal');
    var selIn = document.getElementById('m-selector');
    var sampleIn = document.getElementById('m-sample');
    var nameIn = document.getElementById('m-name');
    var modeSel = document.getElementById('m-mode');
    var extraRow = document.getElementById('m-extra-row');
    var extraIn = document.getElementById('m-extra');
    var extraLabel = document.getElementById('m-extra-label');

    selIn.value = (msg.selector || '');
    sampleIn.value = (msg.sampleText || '');
    nameIn.value = '';
    modeSel.value = 'text';
    extraIn.value = '';
    extraRow.style.display = 'flex';
    extraLabel.textContent = 'Regex / Attribut';

    function updateExtra() {
      var mode = modeSel.value;
      if (mode === 'attr') {
        extraRow.style.display = 'flex';
        extraIn.placeholder = 'Attribut-Name (z. B. value, title, data-*)';
      } else if (mode === 'number') {
        extraRow.style.display = 'flex';
        extraIn.placeholder = 'Optional: Regex (z. B. (\\d+))';
      } else {
        extraRow.style.display = 'none';
      }
    }
    updateExtra();
    modeSel.onchange = updateExtra;

    var addBtn = document.getElementById('m-add');
    var cancelBtn = document.getElementById('m-cancel');
    function close() { modal.classList.add('hidden'); addBtn.onclick = null; cancelBtn.onclick = null; }

    addBtn.onclick = function() {
      var def = { name: nameIn.value.trim(), selector: selIn.value.trim(), mode: modeSel.value };
      if (!def.name || !def.selector) { alert('Bitte Name und Selector angeben.'); return; }
      if (def.mode === 'attr') def.attr = extraIn.value.trim();
      if (def.mode === 'number' && extraIn.value.trim()) def.regex = extraIn.value.trim();
      varsTbody.appendChild(row(def));
      close(); selectTab('settings');
    };
    cancelBtn.onclick = function() { close(); };
    modal.classList.remove('hidden');
  }
});

// XML helpers
function xmlEscape(s) { return (s||'').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&apos;'); }
function toXml(origin, cfg) {
  var parts = [];
  parts.push('<autodartsConfig origin="'+xmlEscape(origin)+'">');
  parts.push('  <wsUrl>'+xmlEscape(cfg.wsUrl || '')+'</wsUrl>');
  parts.push('  <webhook>');
  parts.push('    <enabled>'+((cfg.webhook && cfg.webhook.enabled) ? 'true' : 'false')+'</enabled>');
  parts.push('    <url>'+xmlEscape((cfg.webhook && cfg.webhook.url) || '')+'</url>');
  parts.push('  </webhook>');
  parts.push('  <variables>');
  var list = cfg.variables || [];
  for (var i=0;i<list.length;i++) {
    var v = list[i];
    parts.push('    <variable>');
    parts.push('      <name>'+xmlEscape(v.name || '')+'</name>');
    parts.push('      <selector>'+xmlEscape(v.selector || '')+'</selector>');
    parts.push('      <mode>'+xmlEscape(v.mode || 'text')+'</mode>');
    if (v.regex) parts.push('      <regex>'+xmlEscape(v.regex)+'</regex>');
    if (v.attr) parts.push('      <attr>'+xmlEscape(v.attr)+'</attr>');
    parts.push('    </variable>');
  }
  parts.push('  </variables>');
  parts.push('</autodartsConfig>');
  return parts.join('\n');
}
function parseXmlToCfg(text, fallbackOrigin) {
  var parser = new DOMParser();
  var xml = parser.parseFromString(text, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('Ungültiges XML');
  var root = xml.querySelector('autodartsConfig');
  if (!root) throw new Error('autodartsConfig root fehlt');
  var origin = (root.getAttribute('origin') || fallbackOrigin || 'play.autodarts.io').trim();
  var wsUrl = ''; var wsNode = root.querySelector('wsUrl');
  if (wsNode) wsUrl = (wsNode.textContent || '').trim();
  var webhook = { enabled:false, url:'' };
  var whNode = root.querySelector('webhook');
  if (whNode) {
    var en = (whNode.querySelector('enabled') ? (whNode.querySelector('enabled').textContent || '') : '').trim().toLowerCase();
    var url = (whNode.querySelector('url') ? (whNode.querySelector('url').textContent || '') : '').trim();
    webhook.enabled = (en === 'true');
    webhook.url = url;
  }
  var variables = [];
  var vars = root.querySelectorAll('variables > variable');
  for (var i=0;i<vars.length;i++) {
    var v = vars[i];
    var name = (v.querySelector('name') ? (v.querySelector('name').textContent || '') : '').trim();
    var selector = (v.querySelector('selector') ? (v.querySelector('selector').textContent || '') : '').trim();
    var mode = (v.querySelector('mode') ? (v.querySelector('mode').textContent || 'text') : 'text').trim();
    var regex = (v.querySelector('regex') ? (v.querySelector('regex').textContent || '') : '').trim();
    var attr = (v.querySelector('attr') ? (v.querySelector('attr').textContent || '') : '').trim();
    var def = { name:name, selector:selector, mode:mode };
    if (regex) def.regex = regex;
    if (attr) def.attr = attr;
    if (name && selector) variables.push(def);
  }
  return { origin:origin, wsUrl:wsUrl, webhook:webhook, variables:variables };
}

// Export XML
if (dlXmlBtn) dlXmlBtn.addEventListener('click', function(){
  var origin = (ORIGIN_INPUT.value || 'play.autodarts.io').trim();
  getConfigs().then(function(cfgs){
    var cfg = cfgs[origin] || defaultCfg();
    var xml = toXml(origin, cfg);
    var blob = new Blob([xml], { type: 'application/xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'autodarts_settings_'+origin+'.xml';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 100);
  });
});

// Import XML (file)
var importInput = document.getElementById('importXml');
var importBtn = document.getElementById('importBtn');
if (importBtn) importBtn.addEventListener('click', function(){ importInput.click(); });
if (importInput) importInput.addEventListener('change', function(){
  var file = importInput.files && importInput.files[0];
  if (!file) return;
  file.text().then(function(text){
    var parsed = parseXmlToCfg(text, ORIGIN_INPUT.value.trim());
    return getConfigs().then(function(cfgs){
      cfgs[parsed.origin] = { variables: parsed.variables, wsUrl: parsed.wsUrl, webhook: parsed.webhook };
      return setConfigs(cfgs).then(function(){
        ORIGIN_INPUT.value = parsed.origin; renderVars(parsed.variables);
        wsUrlIn.value = parsed.wsUrl || '';
        whEnabledIn.checked = !!parsed.webhook.enabled;
        whUrlIn.value = parsed.webhook.url || '';
        return chrome.tabs.query({ url: 'https://' + parsed.origin + '/*' }).then(function(tabs){
          var ps = [];
          for (var i=0;i<tabs.length;i++) { try { ps.push(chrome.tabs.sendMessage(tabs[i].id, { type: 'CONFIG_UPDATED' })); } catch(e){} }
          return Promise.all(ps);
        });
      });
    });
  }).then(function(){ alert('Settings importiert ✅'); }).catch(function(e){ alert('Import fehlgeschlagen: ' + (e.message || e)); }).finally(function(){ importInput.value=''; });
});

// Import Defaults (packaged settings.xml)
var importDefaultsBtn = document.getElementById('importDefaultsBtn');
if (importDefaultsBtn) importDefaultsBtn.addEventListener('click', function(){
  var url = chrome.runtime.getURL('settings.xml');
  fetch(url).then(function(r){ return r.text(); }).then(function(text){
    var parsed = parseXmlToCfg(text, ORIGIN_INPUT.value.trim());
    return getConfigs().then(function(cfgs){
      cfgs[parsed.origin] = { variables: parsed.variables, wsUrl: parsed.wsUrl, webhook: parsed.webhook };
      return setConfigs(cfgs).then(function(){
        ORIGIN_INPUT.value = parsed.origin; renderVars(parsed.variables);
        wsUrlIn.value = parsed.wsUrl || '';
        whEnabledIn.checked = !!parsed.webhook.enabled;
        whUrlIn.value = parsed.webhook.url || '';
        return chrome.tabs.query({ url: 'https://' + parsed.origin + '/*' }).then(function(tabs){
          var ps = [];
          for (var i=0;i<tabs.length;i++) { try { ps.push(chrome.tabs.sendMessage(tabs[i].id, { type: 'CONFIG_UPDATED' })); } catch(e){} }
          return Promise.all(ps);
        });
      });
    });
  }).then(function(){ alert('Werkseinstellungen importiert ✅'); }).catch(function(e){ alert('Konnte defaults nicht laden: ' + (e.message || e)); });
});

// Test button
document.getElementById('testVars').addEventListener('click', function(){
  saveCfg().then(function(){
    return chrome.tabs.query({active:true, currentWindow:true});
  }).then(function(tabs){
    var tab = tabs && tabs[0];
    if (!tab) { alert('Kein aktiver Tab'); return; }
    return chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ONCE', origin: (ORIGIN_INPUT.value || 'play.autodarts.io').trim() }).then(function(resp){
      if (resp && resp.ok) alert('Snapshot:\n' + JSON.stringify(resp.data, null, 2));
      else alert('Konnte keine Daten extrahieren. Bist du auf play.autodarts.io?');
    }, function(){ alert('Konnte nicht mit dem Tab kommunizieren.'); });
  });
});

// Events
loadBtn.addEventListener('click', loadCfg);
saveBtn.addEventListener('click', function(){ saveCfg(); });
addVarBtn.addEventListener('click', startPicker);
manualVarBtn.addEventListener('click', function(){ varsTbody.appendChild(row({name:'', selector:'', mode:'text'})); });
copyBtn.addEventListener('click', function(){ navigator.clipboard.writeText(livePre.textContent).then(function(){ copyBtn.textContent='Kopiert ✓'; setTimeout(function(){ copyBtn.textContent='JSON kopieren'; }, 1200); }); });
refreshBtn.addEventListener('click', updateLive);

// Init + auto-load defaults on first run
ORIGIN_INPUT.value = 'play.autodarts.io';
(function init(){
  var origin = (ORIGIN_INPUT.value || 'play.autodarts.io').trim();
  getConfigs().then(function(cfgs){
    if (!cfgs[origin] || !cfgs[origin].variables || cfgs[origin].variables.length === 0) {
      var url = chrome.runtime.getURL('settings.xml');
      fetch(url).then(function(r){ return r.text(); }).then(function(text){
        var parsed = parseXmlToCfg(text, origin);
        cfgs[parsed.origin] = { variables: parsed.variables, wsUrl: parsed.wsUrl, webhook: parsed.webhook };
        return setConfigs(cfgs);
      }).then(loadCfg, loadCfg);
    } else {
      loadCfg();
    }
  });
})();

setInterval(function(){ if (document.getElementById('view-output').classList.contains('active')) updateLive(); }, 1500);
