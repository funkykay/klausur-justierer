# Session-Speicherung, Import und Export

Der Klausur-Justierer unterstützt lokale Sessions und dateibasierte Exporte.

## Lokale Sessions

Sessions werden im Local Storage des Browsers gespeichert.

Eine gespeicherte Session enthält:

- Klausurdaten
- Aufgaben
- Notenschema
- Teilnehmerdaten
- Justierdaten
- berührte Wizard-Schritte
- aktuellen Wizard-Schritt
- Speicherzeitpunkt
- Session-Name

## Session speichern

Über das Menü kann die aktuelle Session gespeichert werden.

Beim Speichern wird ein Session-Name vergeben. Existiert bereits eine Session mit demselben Namen, wird sie durch die neue Version ersetzt.

Ein vorgeschlagener Name wird aus Kurs und Thema gebildet.

## Session laden

Über das Menü kann eine gespeicherte Session geladen werden.

Beim Laden werden die Daten validiert und normalisiert. Falls die Session ungültige oder unvollständige Daten enthält, springt die Anwendung zum ersten ungültigen Schritt.

## JSON-Export

Beim Export erzeugt die Anwendung eine JSON-Datei.

Die Datei enthält:

- Formatkennung
- Versionsnummer
- Exportzeitpunkt
- vollständige Wizard-Daten
- berührte Schritte
- aktuellen Schritt

Der Dateiname wird aus Kurs und Thema erzeugt. Sonderzeichen werden entfernt oder in Bindestriche umgewandelt.

Beispiel:

```text
Mathematik 10a Analysis
```

wird zu:

```text
mathematik-10a-analysis.json
```

## JSON-Import

Beim Import wird eine JSON-Datei gelesen und geprüft.

Die Anwendung akzeptiert nur Dateien mit passender Formatkennung und Versionsnummer. Dadurch wird verhindert, dass beliebige JSON-Dateien als gültige Klausur-Justierer-Sessions behandelt werden.

Bei fehlerhaften Dateien wird ein Importfehler angezeigt.

## Formatkennung

Das aktuelle Exportformat lautet:

```text
klausur-justierer-session
```

Die aktuelle Versionsnummer lautet:

```text
1
```

## Normalisierung

Beim Laden oder Importieren werden Daten normalisiert.

Beispiele:

- ungültige gestrichene Aufgabenindizes werden entfernt
- Teilnehmerpunkte werden an die aktuelle Aufgabenanzahl angepasst
- fehlende justierte Aufgabenpunkte werden aus den ursprünglichen Aufgabenpunkten ergänzt
- justierte Notenschwellen werden an das ursprüngliche Notenschema gekoppelt

## Grenzen der lokalen Speicherung

Local Storage ist browser- und gerätegebunden.

Das bedeutet:

- Sessions sind nicht automatisch zwischen Geräten synchronisiert.
- Beim Löschen der Browserdaten können Sessions verloren gehen.
- Für langfristige Sicherung ist der JSON-Export empfehlenswert.
