# Tesla-Kilometer

Kleine iPhone-App (Web-App/PWA), mit der du die Leasing-Kilometer deines Firmenwagens im Blick behältst.

Beim Öffnen siehst du sofort, **wie viele Kilometer du bis heute gefahren sein darfst**. Wenn du deinen aktuellen Kilometerstand einträgst, zeigt die App außerdem:

- wie viele Kilometer Puffer du hast (oder wie viele du drüber bist),
- eine Prognose für das Leasingende bei deinem aktuellen Fahrtempo,
- wie viele Kilometer pro Tag dir noch zur Verfügung stehen,
- einen Verlauf deiner eingetragenen Kilometerstände.

Voreingestellt sind die Werte: Übergabe am **22.09.2026**, Laufzeit **3 Jahre**, **20.000 km/Jahr**, also 60.000 km bis zum 22.09.2029 (ca. 54,7 km pro Tag). Alles lässt sich unter „Einstellungen“ ändern, auch der Kilometerstand bei der Übergabe.

## Datenschutz

Die App läuft komplett lokal. Die Daten liegen nur im Speicher des iPhones, es gibt keinen Server und kein Konto. Nach dem ersten Laden funktioniert sie auch offline. Über „Backup exportieren“ kannst du deine Daten z. B. in iCloud Drive sichern.

## Auf das iPhone bringen

1. Auf GitHub unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** auswählen.
2. Diesen Stand in den Branch `main` mergen. Der Workflow `.github/workflows/pages.yml` veröffentlicht dann den Ordner `app/`. Die Adresse lautet
   `https://svenunruh83.github.io/Tesla-Kilometer/`.
3. Die Adresse auf dem iPhone in **Safari** öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.

Danach startet die App wie eine normale App vom Home-Bildschirm aus, im Vollbild und ohne Internetverbindung.

## Lokal testen

```sh
cd app && python3 -m http.server 8000
```

Dann `http://localhost:8000` aufrufen.
