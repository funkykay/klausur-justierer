# Überblick

Der Klausur-Justierer ist ein browserbasiertes Werkzeug zur transparenten Auswertung und Nachjustierung von Klausuren.

## Ziel des Tools

Das Tool soll helfen, Bewertungsentscheidungen nachvollziehbar zu machen. Besonders nützlich ist es, wenn nach der Korrektur einer Klausur geprüft werden soll, welche Auswirkungen bestimmte Anpassungen hätten.

Typische Fragen sind:

- Was passiert, wenn eine Aufgabe gestrichen wird?
- Wie verändert sich die Durchfallquote, wenn eine Notenschwelle gesenkt wird?
- Welche Teilnehmer verbessern oder verschlechtern sich durch eine Justierung?
- Wie verschiebt sich die Notenverteilung?
- Bleibt die Bewertung nach einer Anpassung transparent erklärbar?

## Zielgruppe

Das Tool richtet sich an Personen, die Prüfungsleistungen auswerten oder vorbereiten, zum Beispiel:

- Lehrkräfte
- Dozierende
- Ausbilderinnen und Ausbilder
- Fachschaften oder Prüfungsteams
- Personen, die Bewertungsmodelle nachvollziehbar vergleichen möchten

## Grundidee

Die Anwendung trennt die ursprüngliche Bewertung von einer möglichen justierten Bewertung.

Die ursprüngliche Bewertung entsteht aus:

- Aufgaben und deren maximalen Punkten
- erreichten Punkten der Teilnehmer
- ursprünglichem Notenschlüssel

Die justierte Bewertung entsteht aus optionalen Änderungen:

- gestrichene Aufgaben
- angepasste Maximalpunkte je Aufgabe
- angepasste Mindestprozente im Notenschlüssel

Dadurch bleibt sichtbar, welche Ergebnisse vorher galten und welche Ergebnisse nach der Justierung entstehen.

## Datenhaltung

Die Anwendung arbeitet lokal im Browser.

Es gibt keine serverseitige Datenbank und keine Übertragung der eingegebenen Klausurdaten an den Betreiber der Anwendung. Gespeicherte Sessions werden im Local Storage des Browsers abgelegt. Exportierte Sessions sind JSON-Dateien, die lokal gespeichert und später wieder importiert werden können.

## Öffentliche Website

Die Anwendung ist unter https://klausur-justierer.teachies.de verfügbar.
