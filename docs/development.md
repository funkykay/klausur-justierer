# Entwicklung

Dieses Dokument beschreibt den technischen Aufbau des Projekts.

## Projektart

Der Klausur-Justierer ist eine Angular-Anwendung mit Standalone Components.

Die Anwendung verwendet keinen klassischen Angular-Router, sondern einen zentralen Wizard-State, der den aktuellen Schritt und die eingegebenen Daten hält.

## Wichtige Technologien

- Angular 20
- TypeScript
- Tailwind CSS 4
- Chart.js
- Handsontable
- pnpm
- GitHub Pages

## Projektstruktur

Wichtige Bereiche:

```text
src/app/core/
src/app/features/wizard/
src/app/shared/
src/styles.css
public/
.github/workflows/
```

## Core

Der Ordner `src/app/core/` enthält zentrale Logik und Modelle.

Wichtige Dateien:

- `wizard.models.ts`: Typdefinitionen für Wizard, Aufgaben, Teilnehmer, Notenschema und Sessions
- `wizard.service.ts`: zentraler State-Service des Wizards
- `wizard-defaults.ts`: Initialdaten und Clone-Funktionen
- `wizard-validation.ts`: Validierungslogik je Wizard-Schritt
- `wizard-evaluation.ts`: Berechnung von Rohbewertung, Justierung, Notenverteilung und Durchfallquote
- `wizard-session-codec.ts`: Validierung und Parsing von Session-JSON
- `wizard-session-storage.ts`: Local-Storage-Speicherung und Exportdateinamen
- `theme.service.ts`: Light-/Dark-Mode-Verwaltung
- `view-width.service.ts`: Speicherung der schmalen oder breiten Ansicht

## Wizard-Feature

Der Ordner `src/app/features/wizard/` enthält UI-Komponenten und Schritte des Wizards.

Wichtige Komponenten:

- `wizard-shell`: Layout und Schrittumschaltung
- `wizard-navigation`: feste untere Navigation
- `step-chain`: Fortschrittsanzeige
- `session-actions`: Menü, Theme, Sessions, Import/Export, rechtliche Modale
- `basis-step`: Kurs und Thema
- `aufgaben-step`: Aufgabenverwaltung
- `notenschema-step`: Notenschema
- `teilnehmer-step`: Teilnehmer- und Punktetabelle
- `justierung-step`: Auswertung und Justieroptionen

## State-Modell

Der zentrale State liegt im `WizardService`.

Der State enthält:

- Titel
- Wizard-Daten
- Schrittdefinitionen
- aktuellen Schrittindex
- Validierungsstatus

Änderungen erfolgen über `updateData`, `replaceData`, `replaceSession`, `next`, `previous`, `goTo` und `reset`.

Nach jeder Datenänderung wird der State validiert und normalisiert.

## Validierung

Die Validierung ist in `wizard-validation.ts` gekapselt.

Jeder Schritt hat eine eigene Validierungsfunktion:

- `validateBasis`
- `validateAufgaben`
- `validateNotenschema`
- `validateTeilnehmer`
- `validateJustierung`

Fehler werden als `FieldErrors` mit Feldpfaden gespeichert. Diese Feldpfade werden in `wizard-error-labels.ts` für die Anzeige in nutzerfreundliche Labels umgewandelt.

## Bewertung

Die Bewertungslogik liegt in `wizard-evaluation.ts`.

Sie berechnet:

- ursprüngliche Gesamtpunkte
- justierte Gesamtpunkte
- Teilnehmerzeilen
- Notenvergleich
- Trend
- Durchfallquote
- Notenverteilung
- Gruppierungen nach Status und Note

Die UI-Komponente `justierung-step` konsumiert diese Auswertung und stellt sie als Tabelle oder Diagramm dar.

## Styling

Globales Styling liegt in `src/styles.css`.

Das Projekt verwendet Tailwind CSS mit:

- globalen Komponentenklassen
- Dark-Mode-Variante über `.dark`
- angepassten Styles für Handsontable im Dark Mode
- responsiven Utility-Klassen direkt in den Templates

## Build und Entwicklung

Installation:

```bash
pnpm install
```

Entwicklungsserver:

```bash
pnpm dev
```

Produktionsbuild:

```bash
pnpm build
```

Entwicklungsprüfung:

```bash
pnpm check
```

## Deployment

Das Deployment erfolgt über GitHub Actions nach GitHub Pages.

Workflow:

```text
.github/workflows/deploy.yml
```

Der Workflow:

1. checkt das Repository aus
2. installiert pnpm
3. richtet Node.js 22 ein
4. installiert Dependencies mit frozen lockfile
5. baut die Angular-Anwendung
6. lädt `dist/klausur-justierer/browser` als GitHub-Pages-Artefakt hoch
7. deployed nach GitHub Pages

Die Custom Domain liegt in:

```text
public/CNAME
```

## Hinweise für Beiträge

Bei Änderungen sollte die bestehende Architektur beibehalten werden.

Empfehlungen:

- zentrale Fachlogik in `core/` halten
- UI-Schritte möglichst schlank halten
- bestehende Typen in `wizard.models.ts` erweitern statt parallele Modelle aufzubauen
- Validierung und Anzeige getrennt halten
- Session-Format bei inkompatiblen Änderungen versionieren
- bestehende responsive und Dark-Mode-Konventionen beibehalten
