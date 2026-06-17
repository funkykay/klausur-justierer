# Bedienungsanleitung

Der Klausur-Justierer führt Schritt für Schritt durch die Erfassung und Auswertung einer Klausur.

## 1. Basisdaten

Im ersten Schritt werden Kurs und Thema der Klausur eingetragen.

Diese Angaben helfen dabei, Sessions und Exportdateien später eindeutig zuzuordnen. Beim Export werden Kurs und Thema außerdem zur Erzeugung eines Dateinamens verwendet.

Pflichtfelder:

- Kurs
- Thema

## 2. Aufgaben

Im Schritt **Aufgaben** werden alle Aufgaben der Klausur erfasst.

Für jede Aufgabe werden angegeben:

- Aufgabenname
- maximal erreichbare Punktzahl

Die Gesamtpunktzahl wird automatisch aus allen Aufgaben berechnet.

Hinweise:

- Es muss mindestens eine Aufgabe vorhanden sein.
- Punkte müssen mindestens 0 sein.
- Aufgaben können hinzugefügt oder entfernt werden.
- Wenn eine Aufgabe entfernt wird, werden die zugehörigen Teilnehmerpunkte und Justierdaten entsprechend angepasst.

## 3. Notenschema

Im Schritt **Notenschema** wird definiert, ab welchem Prozentwert welche Note vergeben wird.

Für jede Note werden angegeben:

- Notenbezeichnung
- Mindestprozentwert
- Durchgefallen-Status

Die Reihenfolge läuft von der höchsten zur niedrigsten Schwelle. Jede Schwelle muss unterhalb der vorherigen Schwelle liegen.

Beispiel:

| Note | Ab Prozent | Durchgefallen |
| --- | ---: | --- |
| 1 | 92 | Nein |
| 2 | 81 | Nein |
| 3 | 67 | Nein |
| 4 | 50 | Nein |
| 5 | 30 | Ja |
| 6 | 0 | Ja |

## 4. Teilnehmer

Im Schritt **Teilnehmer** werden Namen und erreichte Punkte pro Aufgabe erfasst.

Auf Geräten mit feiner Zeigersteuerung, zum Beispiel Desktop oder Laptop, wird eine tabellarische Eingabe mit Handsontable verwendet. Auf Touch-Geräten wird eine mobile Formularansicht angezeigt.

Für jeden Teilnehmer werden angegeben:

- Name
- Punkte je Aufgabe

Validierung:

- Es muss mindestens ein Teilnehmer vorhanden sein.
- Jeder Teilnehmer benötigt einen Namen.
- Punkte müssen angegeben und mindestens 0 sein.
- Punkte dürfen die maximale Punktzahl der jeweiligen Aufgabe nicht überschreiten.

## 5. Justierung

Im Schritt **Justierung** werden die Ergebnisse ausgewertet und mögliche Anpassungen geprüft.

Die Justierung ist erst sinnvoll nutzbar, wenn die vorherigen Schritte gültig sind. Sind noch Eingaben unvollständig oder ungültig, zeigt die Anwendung eine Vorprüfung mit den offenen Punkten an.

In der Justierung sind drei Arten von Anpassungen möglich:

### Aufgaben streichen

Eine Aufgabe kann aus der justierten Bewertung entfernt werden.

Auswirkung:

- Die Aufgabe zählt nicht mehr zur justierten Gesamtpunktzahl.
- Punkte aus dieser Aufgabe werden nicht mehr in die justierte Punktzahl der Teilnehmer eingerechnet.

### Aufgabenpunkte anpassen

Für jede Aufgabe kann eine justierte Maximalpunktzahl angegeben werden.

Auswirkung:

- Die erreichten Punkte werden proportional auf die neue Maximalpunktzahl umgerechnet.
- Beispiel: Eine Aufgabe hatte ursprünglich 10 Punkte. Ein Teilnehmer erreichte 8 Punkte. Wird die Aufgabe auf 5 Punkte justiert, zählen für diese Aufgabe justiert 4 Punkte.

### Notenschlüssel anpassen

Die Mindestprozente der Noten können für die justierte Bewertung angepasst werden.

Auswirkung:

- Die ursprüngliche Note bleibt als Vergleich erhalten.
- Die justierte Note wird auf Basis der justierten Prozentwerte und justierten Schwellen berechnet.

## Ergebnisansichten

Die Justierung bietet zwei Ergebnisansichten.

### Teilnehmeransicht

Die Teilnehmeransicht gruppiert Ergebnisse nach:

1. Bestanden/Durchgefallen
2. Note
3. Teilnehmer

Für jeden Teilnehmer werden angezeigt:

- Punkte vorher und justiert
- Prozent vorher und justiert
- Note vorher und justiert
- Trend der Änderung

Trendbedeutung:

- `↗`: Verbesserung
- `→`: unverändert
- `↘`: Verschlechterung

### Notenansicht

Die Notenansicht zeigt eine Verteilung der Noten vor und nach der Justierung.

Sie besteht aus:

- Balkendiagramm
- tabellarischer Verteilung
- Vergleich der Anzahl pro Note

## Aktionen im Menü

Über das Aktionsmenü stehen zusätzliche Funktionen bereit:

- Breite Ansicht aktivieren oder deaktivieren
- Einführung öffnen
- Session speichern
- Session laden
- JSON-Datei importieren
- JSON-Datei exportieren
- Impressum öffnen
- Datenschutzerklärung öffnen

## Theme

Die Anwendung unterstützt Light Mode und Dark Mode. Die Auswahl wird lokal im Browser gespeichert.
