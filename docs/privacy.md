# Datenschutz

Der Klausur-Justierer ist so aufgebaut, dass Klausurdaten lokal im Browser verarbeitet werden.

## Keine Übertragung eingegebener Klausurdaten

Die Anwendung überträgt die eingegebenen Klausurdaten nicht an den Betreiber.

Dazu gehören insbesondere:

- Kurs
- Thema
- Aufgaben
- Punktzahlen
- Teilnehmernamen
- Notenschema
- Justiereinstellungen
- gespeicherte Sessions
- importierte oder exportierte JSON-Dateien

## Lokale Verarbeitung

Alle Berechnungen erfolgen im Browser des Nutzers.

Das betrifft:

- Validierung der Eingaben
- Berechnung von Punktzahlen
- Berechnung von Prozentwerten
- Notenermittlung
- Durchfallquoten
- Diagramme
- Import und Export von JSON-Dateien

## Local Storage

Wenn eine Session gespeichert wird, legt die Anwendung sie im Local Storage des Browsers ab.

Eigenschaften von Local Storage:

- bleibt grundsätzlich auch nach dem Schließen des Browsers erhalten
- ist an Browser und Gerät gebunden
- kann durch Löschen der Browserdaten entfernt werden
- wird nicht automatisch zwischen Geräten synchronisiert, außer der Browser oder das Betriebssystem bietet eine eigene Synchronisierung an

## Import und Export

Beim Export erzeugt die Anwendung lokal eine JSON-Datei.

Beim Import liest die Anwendung lokal eine ausgewählte JSON-Datei. Die Datei wird geprüft und in den Wizard-State geladen, wenn sie dem erwarteten Format entspricht.

## Technischer Betrieb der Website

Beim Aufruf der Website können durch den technischen Betrieb des Hostings technische Verbindungsdaten verarbeitet werden.

Dazu können gehören:

- IP-Adresse
- Zeitpunkt des Zugriffs
- Browserinformationen
- angeforderte Dateien

Diese Daten entstehen durch den Abruf der Website selbst und sind von den in der Anwendung eingegebenen Klausurdaten zu unterscheiden.

## Empfehlung für sensible Daten

Auch wenn die Anwendung Klausurdaten lokal verarbeitet, sollten personenbezogene Daten bewusst behandelt werden.

Empfehlungen:

- nur notwendige Teilnehmerdaten erfassen
- bei Bedarf Pseudonyme oder Kürzel verwenden
- JSON-Exporte sicher ablegen
- exportierte Dateien nicht unverschlüsselt weitergeben, wenn sie personenbezogene Daten enthalten
- lokale Sessions löschen, wenn sie nicht mehr benötigt werden
