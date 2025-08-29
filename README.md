# Autodarts Live Scraper (Chrome Extension)

Scraped **Live-Daten** aus `play.autodarts.io` – im Dashboard sichtbar und optional per **HTTP POST** exportiert. Ideal für Overlays, Analysen & Automationen.
**Version:** 1.0.4 · **Manifest:** MV3

---

## Features

- Dashboard: **Settings & Live-Output**
- Variablen per Klick auswählen (**Picker**)
- Settings speichern + **XML Import/Export** (`settings.xml` mitgeliefert)
- Live-Updates **ohne Reload** (MutationObserver)
- Optional **HTTP POST** (Webhook)
- Zahlen-Fallback: fehlende `legs/sets` → **0**

---

## Installation

1. Repo klonen / Release entpacken.  
2. `chrome://extensions` → **Entwicklermodus** → **Entpackte Erweiterung laden** → Projektordner wählen.  
3. [https://play.autodarts.io](https://play.autodarts.io) öffnen.

---

## Quick Start

1. Dashboard öffnen → **Settings** → **Werkseinstellungen laden** (importiert `settings.xml`).  
2. Variablen anpassen: **„+ Variable per Klick auswählen“**.  
3. Exporte setzen:
   - **HTTP POST** aktivieren + URL (z. B. `http://localhost:3000/hook`)
4. Tab **Output** prüfen – JSON ändert sich live.

---

## Exporte

**Payload (Beispiel)**

```json
{
  "origin": "play.autodarts.io",
  "data": {
    "player1_name": "PLAYER 1",
    "player2_name": "PLAYER 2",
    "player_active": "PLAYER 1",
    "player1_score": 381,
    "player2_score": 381,
    "player1_legs": 0,
    "player2_legs": 0,
    "player1_sets": 0,
    "player2_sets": 0,
    "gamemode": "X01"
  },
  "ts": 1724760000000
}
```

**Webhook-Test (Node/Express)**

```js
app.post("/hook", express.json(), (req, res) => {
  console.log("Webhook:", req.body);
  res.json({ ok: true });
});
```

---

## Troubleshooting

- **Keine Daten / „Receiving end does not exist“** → Seite neu laden, Host-Permission `https://play.autodarts.io/*` prüfen.  
- **Selektoren kaputt** → Picker nutzen und Variablen neu speichern.  
- **`null` bei Zahlen** → Modus `number` nutzen (Fallback auf 0 ist aktiv).

---

## Hinweise

Nicht offiziell mit Autodarts verbunden; bitte Nutzungsbedingungen beachten. Selektoren können sich ändern.

---

## Lizenz

MIT
