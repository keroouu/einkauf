# 🛒 Einkauf – unsere gemeinsame Einkaufsliste

Web-App fürs iPhone (über Safari „Zum Home-Bildschirm“). Kostenlos, ohne App Store.

## Funktionen
- **Mehrere Listen** (Supermarkt, Drogerie, … – beliebig viele)
- **Automatische Kategorien** in Laufreihenfolge (Obst & Gemüse → Brot → Kühlregal → …).
  Einmal korrigiert, merkt sich die App die Kategorie.
- **Mengen & Notizen**: „2 Milch“, „500g Hack“, „3x Joghurt“ werden automatisch erkannt
- **Vorrat**: Stammartikel („immer im Haus“) – antippen, was fehlt, und es steht auf der Liste.
  Darunter „Ab und zu gekauft“ zum schnellen Wieder-Hinzufügen; ☆ macht daraus einen Stammartikel.
- **Echtzeit-Abgleich** zwischen beiden iPhones, funktioniert auch offline im Laden

---

## Einrichtung (einmalig, ca. 15 Minuten)

### 1. Firebase (gemeinsamer Speicher, kostenlos)
1. <https://console.firebase.google.com> öffnen → **Projekt hinzufügen** → Name z. B. `einkauf`
   (Google Analytics kann aus bleiben).
2. Links **Build → Authentication → Jetzt starten** → Reiter **Anmeldemethode** →
   **Anonym** aktivieren → Speichern.
3. Links **Build → Firestore Database → Datenbank erstellen** →
   Standort `europe-west3 (Frankfurt)` → **Im Produktionsmodus starten**.
4. In Firestore oben auf den Reiter **Regeln** → den Inhalt von `firestore.rules`
   aus diesem Ordner hineinkopieren → **Veröffentlichen**.
5. Zahnrad ⚙️ → **Projekteinstellungen** → unten bei „Meine Apps“ auf **</>** (Web) →
   Name `einkauf` → **App registrieren** (Hosting-Haken NICHT nötig).
6. Den angezeigten `firebaseConfig = { ... }`-Block kopieren und in
   `firebase-config.js` statt `null` einfügen.

> Die Werte in `firebaseConfig` sind keine Geheimnisse – sie dürfen öffentlich sein.
> Geschützt wird die Liste durch die Regeln + euren 12-stelligen Haushalts-Code.

### 2. GitHub Pages (kostenloses Hosting)
1. Auf <https://github.com/new> ein Repository anlegen, z. B. `einkauf`, **Public**.
2. Im neuen Repo: **Add file → Upload files** → alle Dateien und Ordner aus diesem
   Ordner hineinziehen (außer dem Ordner `tools`, der wird nicht gebraucht) → **Commit changes**.
3. **Settings → Pages** → Source: **Deploy from a branch** → Branch `main`, Ordner `/ (root)` → Save.
4. Nach ca. 1 Minute ist die App erreichbar unter
   `https://<dein-github-name>.github.io/einkauf/`

### 3. Auf die iPhones
1. Link in **Safari** öffnen → **Teilen** (□↑) → **Zum Home-Bildschirm**.
2. App über das neue Icon öffnen → **Neuen Haushalt anlegen**.
3. In den Einstellungen auf **Einladen** tippen und deiner Frau den Link/Code schicken.
4. Sie macht Schritt 1 ebenfalls und gibt in der App den **Code** ein → fertig.

---

## Später etwas ändern
Datei anpassen → bei GitHub erneut hochladen. Damit die iPhones die neue Version
sicher laden, in `sw.js` die Zeile `const VERSION = 'einkauf-v1'` hochzählen (`v2`, `v3`, …).

## Lokal am PC testen
```powershell
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```
Dann <http://localhost:8123> öffnen. Ohne Firebase-Konfiguration läuft die App im **Demo-Modus**
(Daten nur in diesem Browser).
