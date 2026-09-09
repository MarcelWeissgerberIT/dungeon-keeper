# Gefangene und dunkle Künste

Diese Erweiterung fügt drei eigene Räume hinzu. Alle Beschreibungen, Hinweise und Statusmeldungen sind über DE/EN umschaltbar. Bestehende Spielstände bleiben verwendbar.

| Raum | Gold je Feld | Funktion |
|---|---:|---|
| Gefängnis | 160 | Je zwei fertig gebaute Felder halten einen besiegten Sonnenritter. Eine freie eigene Zelle muss vom Kampfplatz erreichbar sein. |
| Folterkammer | 240 | Nach abgeschlossener Runenforschung und ab vier Feldern: Ein anwesender Runenweber bekehrt einen Gefangenen in 75 Sekunden. |
| Ritualkammer | 220 | Nach abgeschlossener Runenforschung und ab vier Feldern: Der Aschensegen wird unter Mächte verfügbar. |

Vor der Belagerung ein Gefängnis bauen oder seinen Ausbau planen. Besiegte Gegner werden durch Bindungsrunen in eine freie Zelle gebracht; die bisherige Belohnung fällt genau einmal an. Volle oder unerreichbare Zellen nehmen niemanden auf.

Die Gefangenenliste öffnet die Details. Gefangene lassen sich direkt greifen und auf einem freien eigenen Gefängnis- oder Folterfeld absetzen. Während des Tragens bleibt ihre Ursprungszelle reserviert. Escape oder Rechtsklick bricht ab. Belegte Zellen und zur Kapazität benötigte Felder können nicht verkauft werden.

Ein Runenweber sucht eine besetzte Folterkammer automatisch auf, sobald seine Bedürfnisse und die Verteidigung es erlauben. Bekehrung benötigt seine Anwesenheit. Greifen, direkte Steuerung, Kampf oder ein zu kleiner Raum pausieren die Arbeit. Der Fortschritt bleibt erhalten. Am Ende braucht der neue Aschewächter einen freien Ruheplatz und mindestens vier Pilzgartenfelder. Fehlende Versorgung hält den Fortschritt bei 100 %, bis ausgebaut wurde. Überläufer behalten ihre Stufe und erhalten die normalen Wächterwerte und den üblichen Lohn.

Der Aschensegen kostet beim erfolgreichen Auslösen 250 Gold. Für 60 Spielsekunden verursachen eigene Kreaturen 20 % mehr Schaden, das Reich gewinnt zusätzlich 2 Mana pro Sekunde, und Bewohner gewinnen zusätzlich 0,4 Zufriedenheit pro Sekunde. Die Abklingzeit beträgt 120 Spielsekunden ab Aktivierung. Dauer und Abklingzeit werden gespeichert; Pausieren hält beide an.

Gefangene kämpfen nicht, erhalten keinen Lohn und blockieren den Sieg nach der letzten Welle nicht. Gewonnene/verlorene Expeditionen enden wie bisher.

## Gestaltung und Herkunft

- Eigene räumliche Einrichtungen: Gitter und Bindungslicht, Basaltstuhl mit Ketten/Kristallständern, Glutkreis mit Obelisken. Geometrien nutzen die bestehenden Instanz- und Materialpools.
- Drei neue OpenArt-Raumikonen: [Prompts, Generierungen und Hashes](dark-room-generations.json), [Gefängnis](../public/art/openart/dark-rooms/prison.webp), [Folterkammer](../public/art/openart/dark-rooms/torment.webp), [Ritualkammer](../public/art/openart/dark-rooms/ritual.webp).
- Die erhaltenen PNGs wurden verlustfrei als WebP kodiert; ihre Bildpunkte wurden nicht geändert. Keine Originalspielgrafiken wurden als Vorlage hochgeladen.
- Kettenklang, dissonante Runentöne und Ritualklang werden eigenständig synthetisiert und ausschließlich über den getrennten Geräuschkanal geregelt. Der Soundtrack bleibt unabhängig.
- Die Bekehrung wird abstrakt durch Runen, Licht, Bewegung und einen Fortschrittsbalken inszeniert.
