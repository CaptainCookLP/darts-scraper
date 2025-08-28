
# Autodarts Live Scraper (Chrome Extension) – WS only

Scrape Live-Daten vom aktuellen Match auf **play.autodarts.io** und sende sie per **WebSocket** weiter.
Außerdem kannst du deine **Settings als XML** exportieren.

## Features
- Dashboard (Settings / Output)
- Variablen per Klick auswählen (Picker)
- Variablen speichern (pro Host)
- Live-Updates für Single-Page-Apps (MutationObserver + Shadow DOM)
- **WebSocket-Export** (bei jeder Änderung)
- **Settings-Download als XML** (pro Origin)

## Installation
1. Chrome → `chrome://extensions` → Entwicklermodus aktivieren.
2. „Entpackte Erweiterung laden“ → Ordner `autodarts_scraper_extension` wählen.

## Nutzung
1. `https://play.autodarts.io` öffnen und Match starten.
2. Erweiterungs-Icon → **Auswahlmodus starten** → Element anklicken → im Dashboard erscheint ein Modal zum Anlegen der Variable.
3. Im Dashboard **WebSocket URL** eintragen (z. B. `ws://localhost:8765`) und **Speichern**.
4. Tab **Output** zeigt Live-JSON, das auch via WebSocket gesendet wird.
5. **Settings als XML**: Im Dashboard auf „Settings als XML herunterladen“ klicken.

## XML Beispiel
```xml
<autodartsConfig origin="play.autodarts.io">
  <wsUrl>ws://localhost:8765</wsUrl>
  <variables>
    <variable>
      <name>score_home</name>
      <selector>div.score.home</selector>
      <mode>number</mode>
      <regex>(\\d+)</regex>
    </variable>
  </variables>
</autodartsConfig>
```
