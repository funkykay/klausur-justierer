# Klausur-Justierer

Klausur-Justierer ist ein Open-Source-Tool zur transparenten Erfassung, Auswertung und Justierung von Klausurergebnissen.

Die Anwendung richtet sich an Lehrkräfte, Dozierende und andere Personen, die Klausuren strukturiert auswerten möchten. Sie hilft dabei, Aufgaben, Notenschlüssel und Teilnehmerpunkte zu erfassen und anschließend nachvollziehbar zu prüfen, wie sich Bewertungsjustierungen auf Noten, Punktzahlen und Durchfallquoten auswirken.

Die öffentliche Version ist unter https://klausur-justierer.teachies.de erreichbar.

## Worum geht es?

In Klausuren kommt es vor, dass eine Aufgabe nachträglich gestrichen wird, eine Aufgabenpunktzahl angepasst werden soll oder ein Notenschlüssel korrigiert werden muss. Der Klausur-Justierer macht diese Änderungen sichtbar, ohne die ursprüngliche Bewertung aus dem Blick zu verlieren.

Das Tool zeigt unter anderem:

- ursprüngliche und justierte Punktzahlen
- ursprüngliche und justierte Prozentwerte
- Notenveränderungen je Teilnehmer
- Durchfallquote vor und nach der Justierung
- Notenverteilung als Tabelle und Diagramm
- gruppierte Ergebnisübersichten nach Bestanden/Durchgefallen und Note

## Grundprinzip

Die Anwendung führt durch fünf Schritte:

1. **Basisdaten**: Kurs und Thema der Klausur erfassen.
2. **Aufgaben**: Aufgaben mit maximal erreichbaren Punkten anlegen.
3. **Notenschema**: Noten, Mindestprozente und Durchfallstatus definieren.
4. **Teilnehmer**: Teilnehmer und erreichte Punkte erfassen.
5. **Justierung**: Aufgaben streichen, Aufgabenpunkte anpassen oder Notenschwellen verändern und Auswirkungen prüfen.

Alle Daten werden lokal im Browser verarbeitet. Sessions können im Local Storage gespeichert oder als JSON-Datei exportiert und später wieder importiert werden.

## Funktionen

- Mehrstufiger Wizard für strukturierte Eingabe
- Responsive Oberfläche mit mobiler Eingabemaske und Desktop-Tabelle
- Dark Mode
- Optionale breite Ansicht
- Lokale Session-Speicherung im Browser
- JSON-Import und JSON-Export
- Validierung der Eingaben vor der Justierung
- Diagramm zur Notenverteilung
- Vergleich von Rohbewertung und justierter Bewertung

## Datenschutz

Der Klausur-Justierer verarbeitet eingegebene Klausurdaten lokal im Browser. Die Anwendung überträgt diese Daten nicht an den Betreiber.

Beim Speichern einer Session werden die Daten im Local Storage des verwendeten Browsers abgelegt. Beim Import und Export werden JSON-Dateien lokal im Browser gelesen beziehungsweise erzeugt.

Weitere Details stehen in [`docs/privacy.md`](docs/privacy.md).

## Technischer Überblick

Das Projekt ist eine Angular-Anwendung mit Standalone Components.

Wichtige Technologien:

- Angular 20
- TypeScript
- Tailwind CSS 4
- Chart.js
- Handsontable
- pnpm
- GitHub Pages

## Entwicklung

Voraussetzungen:

- Node.js 22
- pnpm 10

Installation:

```bash
pnpm install
```

Entwicklungsserver starten:

```bash
pnpm dev
```

Build ausführen:

```bash
pnpm build
```

Entwicklungs-Build zur Prüfung:

```bash
pnpm check
```

## Dokumentation

Die ausführliche Tool-Dokumentation liegt im Ordner [`docs/`](docs/):

- [`docs/overview.md`](docs/overview.md): Überblick und Zielsetzung
- [`docs/user-guide.md`](docs/user-guide.md): Bedienungsanleitung
- [`docs/evaluation.md`](docs/evaluation.md): Bewertungs- und Justierungslogik
- [`docs/session-management.md`](docs/session-management.md): Speichern, Laden, Import und Export
- [`docs/development.md`](docs/development.md): Technische Projektstruktur und Entwicklung
- [`docs/privacy.md`](docs/privacy.md): Datenschutz und lokale Verarbeitung
