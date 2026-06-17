# Bewertungs- und Justierungslogik

Dieses Dokument beschreibt, wie der Klausur-Justierer Rohbewertung und justierte Bewertung berechnet.

## Begriffe

## Rohbewertung

Die Rohbewertung ist die Bewertung ohne nachträgliche Justierung.

Sie verwendet:

- ursprüngliche Aufgabenpunkte
- ursprünglich erreichte Teilnehmerpunkte
- ursprünglichen Notenschlüssel

## Justierte Bewertung

Die justierte Bewertung verwendet die in der Justierung eingestellten Anpassungen.

Sie berücksichtigt:

- gestrichene Aufgaben
- justierte Maximalpunkte je Aufgabe
- justierte Notenschwellen

## Gesamtpunktzahl

### Ursprüngliche Gesamtpunktzahl

Die ursprüngliche Gesamtpunktzahl ist die Summe aller maximal erreichbaren Punkte aller Aufgaben.

Beispiel:

| Aufgabe | Maximalpunkte |
| --- | ---: |
| Aufgabe 1 | 10 |
| Aufgabe 2 | 20 |
| Aufgabe 3 | 15 |

Ursprüngliche Gesamtpunktzahl: 45

### Justierte Gesamtpunktzahl

Die justierte Gesamtpunktzahl ist die Summe aller justierten Maximalpunkte der Aufgaben, die nicht gestrichen wurden.

Beispiel:

| Aufgabe | Justierte Maximalpunkte | Gestrichen |
| --- | ---: | --- |
| Aufgabe 1 | 10 | Nein |
| Aufgabe 2 | 20 | Ja |
| Aufgabe 3 | 12 | Nein |

Justierte Gesamtpunktzahl: 22

## Teilnehmerpunkte

### Ursprüngliche Punkte

Die ursprünglichen Punkte eines Teilnehmers sind die Summe seiner erreichten Punkte über alle Aufgaben.

### Justierte Punkte

Für jede nicht gestrichene Aufgabe wird berechnet:

```text
Teilnehmerpunkte / ursprüngliche Maximalpunkte * justierte Maximalpunkte
```

Diese Werte werden über alle nicht gestrichenen Aufgaben summiert.

Wenn eine Aufgabe ursprünglich 0 Maximalpunkte hat, trägt sie nicht zur justierten Punktzahl bei.

## Prozentwerte

Prozentwerte werden aus Punkten und Gesamtpunktzahl berechnet:

```text
Punkte / Gesamtpunktzahl * 100
```

Wenn die Gesamtpunktzahl 0 ist, wird der Prozentwert als 0 behandelt.

## Notenermittlung

Die Notenermittlung sucht die erste Schwelle, deren Mindestprozentwert kleiner oder gleich dem erreichten Prozentwert ist.

Die Schwellen werden dabei absteigend nach Mindestprozentwert betrachtet.

Beispiel:

| Note | Mindestprozent |
| --- | ---: |
| 1 | 92 |
| 2 | 81 |
| 3 | 67 |
| 4 | 50 |
| 5 | 30 |
| 6 | 0 |

Ein Ergebnis von 74 % erhält Note 3.

## Durchfallstatus

Der Durchfallstatus hängt an der jeweiligen Note. Jede Notenschwelle besitzt ein Feld, das festlegt, ob diese Note als durchgefallen gilt.

Dadurch sind auch nicht-numerische oder institutionsspezifische Notensysteme möglich, solange sie über Schwellen abgebildet werden können.

## Trendberechnung

Der Trend vergleicht Rohbewertung und justierte Bewertung.

Eine Änderung gilt als Verbesserung, wenn:

- ein Teilnehmer vorher durchgefallen und nachher bestanden ist
- oder die justierte Note in der Reihenfolge des Notenschemas besser ist

Eine Änderung gilt als Verschlechterung, wenn:

- ein Teilnehmer vorher bestanden und nachher durchgefallen ist
- oder die justierte Note in der Reihenfolge des Notenschemas schlechter ist

Andernfalls gilt die Bewertung als unverändert.

## Durchfallquote

Die Durchfallquote wird getrennt für Rohbewertung und justierte Bewertung berechnet:

```text
Anzahl durchgefallener Teilnehmer / Anzahl aller Teilnehmer * 100
```

Zusätzlich zeigt die Anwendung:

- Differenz der Anzahl durchgefallener Teilnehmer
- Differenz in Prozentpunkten
- textuelle Einordnung, ob mehr, weniger oder gleich viele Teilnehmer durchgefallen sind

## Notenverteilung

Die Notenverteilung zählt für jede Note:

- Anzahl Teilnehmer mit dieser Note in der Rohbewertung
- Anzahl Teilnehmer mit dieser Note in der justierten Bewertung

Die Verteilung wird in der Notenansicht als Diagramm und Tabelle dargestellt.
