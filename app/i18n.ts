import {
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react';
export type Locale = 'de' | 'en';
const messages: Record<string, string> = {
  'Nur graben': 'Excavate only',
  'Nutzung nach dem Graben': 'Use after excavation',
  'DANACH ANLEGEN': 'BUILD AFTERWARDS',
  geplant: 'planned',
  Geplant: 'Planned',
  graben: 'excavate',
  beanspruchen: 'claim',
  baubereit: 'ready to build',
  'Auftrag setzen': 'Place order',
  'Aufträge löschen': 'Remove orders',
  'Gesetzte Aufträge': 'Placed orders',
  AUFTRÄGE: 'ORDERS',
  'In Bearbeitung': 'Pending',
  'Wartet auf Baugold': 'Waiting for building gold',
  'Errichtet Raum': 'Constructing room',
  'Graben → Beanspruchen → Bauen': 'Excavate → Claim → Build',
  'Geplanter Ausbau:': 'Planned construction:',
  Grabungsauftrag: 'Excavation order',
  'Grabungsauftrag gesetzt.': 'Excavation order placed.',
  'Raumplan gesetzt. Deine Schürflinge übernehmen den Ausbau.':
    'Room plan placed. Your delvers will carry out the work.',
  'Auftrag entfernt.': 'Order removed.',
  'Aufträge entfernt.': 'Orders removed.',
  'Fels, Wasser und besondere Orte bleiben frei.':
    'Rock, water and special locations must remain clear.',
  'Hier ist bereits ausgegraben.': 'This ground is already excavated.',
  'Keine geeigneten Felder ausgewählt.': 'No suitable tiles selected.',
  'Wähle einen freien Gang ohne Raumplan.':
    'Choose an empty corridor without a room plan.',
  'Schürflinge graben erreichbare Felder aus.':
    'Delvers excavate reachable tiles.',
  'Erst graben, dann beanspruchen und bauen. Gold wird je fertigem Feld bezahlt.':
    'Excavate, then claim and build. Gold is paid for each completed tile.',
  'Fehlendes Gold stoppt nur den Bau. Der Grabungsauftrag bleibt aktiv.':
    'A lack of gold only pauses construction. Excavation remains active.',
  'Gesetzte Aufträge in dieser Fläche entfernen':
    'Remove placed orders within this area',
  'Raster ziehen · Nutzung wählen · Enter setzt Auftrag':
    'Draw grid · Choose use · Enter places order',

  Bauplan: 'Construction plan',
  BAUPLAN: 'CONSTRUCTION PLAN',
  'FLÄCHE MARKIEREN': 'DESIGNATE AREA',
  'Bauplan verwerfen': 'Discard construction plan',
  bebaubar: 'buildable',
  blockiert: 'blocked',
  Gold: 'Gold',
  'Fehlendes Gold:': 'Gold needed:',
  'Bereich bauen': 'Build area',
  Verwerfen: 'Discard',
  'Loslassen, um den Bauplan zu setzen.':
    'Release to place the construction plan.',
  'Fläche ziehen · Enter baut · Esc verwirft':
    'Drag an area · Enter builds · Esc discards',
  'Nicht genug Gold für den gesamten Bauplan.':
    'Not enough gold for the entire construction plan.',
  'Keine bebaubaren Felder ausgewählt.': 'No buildable tiles selected.',
  'Bauplan errichtet.': 'Construction plan built.',
  'Diese Expedition ist beendet.': 'This expedition has ended.',

  'Dungeon und Bauwerkzeuge': 'Dungeon and building tools',
  'Vollbild umschalten': 'Toggle fullscreen',
  'Eine Spielgrafik konnte nicht geladen werden. Bitte lade das Spiel erneut.':
    'A game graphic could not be loaded. Please reload the game.',
  'Vollbild ist in diesem Browser nicht verfügbar.':
    'Fullscreen is unavailable in this browser.',
  'Dein Reich': 'Your domain',
  'Zahltag in': 'Payday in',
  STUFE: 'LEVEL',
  '+0,7/s': '+0.7/s',
  'Kluftkrone – Ansicht zentrieren': 'Kluftkrone – centre view',
  'Reichsübersicht ein- oder ausblenden': 'Toggle domain overview',
  'Übersichtskarte: anklicken, um die Ansicht zu zentrieren':
    'Overview map: click to centre the view',
  'HERRSCHAFT DER TIEFE': 'DOMINION BELOW',
  GOLD: 'GOLD',
  MANA: 'MANA',
  BEWOHNER: 'CREATURES',
  'Lokal gesichert': 'Saved locally',
  'Lokales Spiel': 'Local game',
  Spielanleitung: 'How to play',
  'Einstellungen und Spielstand': 'Settings and saved game',
  'Die erste Glut': 'The First Ember',
  'Unter den Aschebergen': 'Beneath the Ashen Mountains',
  'EXPEDITION 01': 'EXPEDITION 01',
  ENTSPANNT: 'RELAXED',
  ERBARMUNGSLOS: 'RELENTLESS',
  STANDARD: 'STANDARD',
  'DIE EWIGE GLUT': 'THE ETERNAL EMBER',
  Stabil: 'Stable',
  Bedroht: 'Threatened',
  Kritisch: 'Critical',
  'DEIN NÄCHSTER SCHRITT': 'YOUR NEXT OBJECTIVE',
  'Erschließe die Tiefe': 'Uncover the depths',
  'Stärke deine Bewohner': 'Strengthen your creatures',
  'Wecke altes Wissen': 'Awaken ancient knowledge',
  'Entziffere die Runen': 'Decipher the runes',
  'Behaupte dein Reich': 'Defend your domain',
  'Die Tiefe gehört dir': 'The depths are yours',
  'Die Glut entfachen': 'Kindle the ember',
  'Gespeichertes Reich fortsetzen': 'Continue saved domain',
  'DEINE BEWOHNER': 'YOUR CREATURES',
  Schürfling: 'Delver',
  Aschewächter: 'Ash Warden',
  Runenweber: 'Rune Weaver',
  Basaltkoloss: 'Basalt Colossus',
  Sonnenritter: 'Sun Knight',
  'Graben · Gold · Ausbau': 'Digging · Gold · Expansion',
  'Forschung · Magie': 'Research · Magic',
  'Kampf · Werkstatt': 'Combat · Workshop',
  'Training · Verteidigung': 'Training · Defence',
  'Benötigt 4 Runenarchiv-Felder': 'Requires 4 archive tiles',
  'Benötigt Forschung & Übungshof': 'Requires research & training',
  RUNENFORSCHUNG: 'RUNE RESEARCH',
  'Sturmfunken freigeschaltet': 'Stormspark unlocked',
  'Runen werden entziffert': 'Deciphering ancient runes',
  'Runenarchiv erforderlich': 'Rune archive required',
  'AUS DER TIEFE': 'FROM THE DEPTHS',
  'DEIN REICH WÄCHST IM VERBORGENEN': 'YOUR DOMAIN GROWS IN SECRET',
  'DIE ASCHENKAMMERN': 'THE ASHEN HALLS',
  'EBENE −01': 'DEPTH −01',
  'Letzte Belagerung': 'Final siege',
  REICHSKARTE: 'DOMAIN MAP',
  'DEIN REICH': 'YOUR DOMAIN',
  'Ein Funke. Ein Anfang. Dein Reich.':
    'One spark. One beginning. Your domain.',
  'DIE TIEFE WARTET': 'THE DEPTHS AWAIT',
  Fortsetzen: 'Resume',
  'Du siehst durch die Augen eines Bewohners.':
    'You see through the eyes of a creature.',
  'WASD bewegen · Rechte Maustaste ziehen: umsehen':
    'WASD to move · Drag right mouse button to look',
  Verlassen: 'Leave',
  'Ziehen und loslassen oder Boden anklicken. ESC: zurück.':
    'Drag and release or click the ground. ESC: return.',
  'Wähle erkundeten, begehbaren Boden. Die Kreatur bleibt in deiner Hand.':
    'Choose explored, walkable ground. The creature stays in your hand.',
  'In der Hand': 'In your hand',
  'Karten-Seed': 'Map seed',
  'Umsetzen abbrechen': 'Cancel pickup',
  'Bewohnerdetails schließen': 'Close creature details',
  Lebenskraft: 'Health',
  Sättigung: 'Hunger',
  Energie: 'Energy',
  Zufriedenheit: 'Happiness',
  Umsetzen: 'Pick up',
  Übernehmen: 'Possess',
  'Nach links drehen': 'Rotate left',
  'Nach rechts drehen': 'Rotate right',
  'Drehen (Q)': 'Rotate (Q)',
  'Drehen (E)': 'Rotate (E)',
  Herauszoomen: 'Zoom out',
  Hineinzoomen: 'Zoom in',
  'Ansicht zentrieren': 'Centre view',
  'Zentrieren (F)': 'Centre (F)',
  'Neu laden': 'Reload',
  '3D-Ansicht nicht verfügbar': '3D view unavailable',
  Räume: 'Rooms',
  Mächte: 'Powers',
  Verteidigung: 'Defences',
  'Banner lösen': 'Dismiss banner',
  'Ziehen für mehrere Felder': 'Drag to select multiple tiles',
  'Bereit, die Tiefe zu erwecken': 'Ready to awaken the depths',
  'Spiel pausieren': 'Pause game',
  'Spiel starten oder fortsetzen': 'Start or resume game',
  LEERTASTE: 'SPACE',
  Speichern: 'Save',
  'Musik einschalten': 'Enable music',
  'Musik stummschalten': 'Mute music',
  'Geräusche einschalten': 'Enable sound effects',
  'Geräusche stummschalten': 'Mute sound effects',
  'DAS BUCH DER TIEFE': 'THE BOOK OF DEPTHS',
  'So wächst dein Reich.': 'Grow your domain.',
  Einstellungen: 'Settings',
  Musik: 'Music',
  Geräusche: 'Sound effects',
  'Musik ein- oder ausschalten': 'Toggle music',
  'Geräusche ein- oder ausschalten': 'Toggle sound effects',
  Musiklautstärke: 'Music volume',
  Geräuschlautstärke: 'Sound effects volume',
  Spielstand: 'Saved game',
  'Auf diesem Gerät, in diesem Browser': 'On this device, in this browser',
  'Reich speichern': 'Save domain',
  'Reich laden': 'Load domain',
  'Neue Expedition beginnen': 'Begin a new expedition',
  'EIN NEUER ANFANG': 'A NEW BEGINNING',
  'Eine neue Glut entfachen': 'Kindle a new ember',
  Schwierigkeitsgrad: 'Difficulty',
  'Entspannt – mehr Aufbauzeit': 'Relaxed – more time to build',
  'Standard – ausgewogen': 'Standard – balanced',
  'Erbarmungslos – frühe Angriffe': 'Relentless – earlier invasions',
  'Neue Expedition': 'New expedition',
  'EXPEDITION BEENDET': 'EXPEDITION COMPLETE',
  'Die Tiefe gehört dir.': 'The depths are yours.',
  'Die Glut ist erloschen.': 'The ember has faded.',
  Zeit: 'Time',
  'Besiegte Gegner': 'Enemies defeated',
  'Gold gefördert': 'Gold mined',
  'Erneut spielen': 'Play again',
  Auswählen: 'Select',
  Graben: 'Excavate',
  Verkaufen: 'Sell',
  Sammelbanner: 'Rally banner',
  Glutsegen: 'Ember blessing',
  Sturmfunken: 'Stormspark',
  Fangrune: 'Snare rune',
  Schutzpforte: 'Ward gate',
  Schatzkammer: 'Treasury',
  Ruhestätte: 'Sanctuary',
  Pilzgarten: 'Fungal garden',
  Übungshof: 'Training yard',
  Runenarchiv: 'Rune archive',
  Werkstatt: 'Workshop',
  Kostenlos: 'Free',
  '50 % zurück': '50% refund',
  '250 Gold': '250 gold',
  '30 Mana': '30 mana',
  '45 Mana': '45 mana',
  '150 Gold · 1 Werkstück': '150 gold · 1 component',
  '/ Feld': '/ tile',
  'Unzerstörbarer Fels': 'Impenetrable rock',
  Erdreich: 'Earth',
  Goldader: 'Gold vein',
  'Unbeanspruchter Boden': 'Unclaimed ground',
  'Die ewige Glut': 'The eternal ember',
  Tiefentor: 'Deep gate',
  Sonnenpfad: 'Sunward path',
  'Unterirdischer See': 'Underground lake',
  'Wartet auf Arbeit': 'Awaiting work',
  'Greift an': 'Attacking',
  'Orientiert sich': 'Looking around',
  'Trägt Gold': 'Hauling gold',
  'Goldlager voll': 'Treasury full',
  'Baut Gold ab': 'Mining gold',
  Gräbt: 'Excavating',
  'Beansprucht Boden': 'Claiming ground',
  'Im Kampf': 'Fighting',
  Isst: 'Eating',
  Schläft: 'Sleeping',
  'Sammelt sich': 'Rallying',
  'Erforscht Runen': 'Researching runes',
  Schmiedet: 'Forging',
  Trainiert: 'Training',
  Patrouilliert: 'Patrolling',
  'Zieht zur Glut': 'Marching to the ember',
  'Zerstört Pforte': 'Breaking gate',
  'Direkt gesteuert': 'Possessed',
  Abgesetzt: 'Dropped',
  '01 / Erschließen': '01 / Excavate',
  '02 / Errichten': '02 / Build',
  '03 / Versorgen': '03 / Sustain',
  '04 / Entwickeln': '04 / Develop',
  '05 / Verteidigen': '05 / Defend',
  '06 / Eingreifen': '06 / Intervene',
  'Karte bewegen': 'Move camera',
  Drehen: 'Rotate',
  Zentrieren: 'Centre',
  MAUSRAD: 'MOUSE WHEEL',
  Zoomen: 'Zoom',
  Pause: 'Pause',
  'Markiere Erdreich oder Gold. Deine Schürflinge graben und beanspruchen neuen Boden.':
    'Designate earth or gold. Your delvers excavate and claim new ground.',
  'Baue mindestens 4 Felder Übungshof auf eigenem, freiem Boden.':
    'Build at least 4 training-yard tiles on your claimed, empty ground.',
  'Baue 4 Felder Runenarchiv. Ein Runenweber wird durch das Tiefentor kommen.':
    'Build 4 rune-archive tiles. A rune weaver will arrive through the deep gate.',
  'Versorge deine Bewohner, während der Runenweber die Forschung abschließt.':
    'Care for your creatures while the rune weaver completes their research.',
  'Vergrößere deine Ruhestätte, errichte Fallen und überstehe alle vier Angriffswellen.':
    'Expand your sanctuary, set traps and survive all four invasions.',
  'Der Sonnenmarsch ist gebrochen. Dein Reich hat bestanden.':
    'The Sun March is broken. Your domain has endured.',
  'Bewohner direkt greifen: anklicken oder ziehen und auf freiem Boden loslassen. Rechtsklick schlägt. Details über die Bewohnerporträts öffnen.':
    'Grab creatures directly: click, or drag and release over open ground. Right-click to slap. Open details through creature portraits.',
  'Ziehe ein Raster über Erde oder Gold. Wähle Nur graben oder einen späteren Raum; Enter setzt den Auftrag.':
    'Draw a grid over earth or gold. Choose Excavate only or a future room; Enter places the order.',
  'Räume und Verteidigung verkaufen. Du erhältst die Hälfte der Baukosten zurück.':
    'Sell rooms and defences to recover half their construction cost.',
  'Versammle deine Kämpfer auf eigenem Boden. Löse das Banner, damit sie ihren Aufgaben nachgehen.':
    'Gather fighters on your ground. Dismiss the banner to let them return to work.',
  'Rufe einen zusätzlichen Schürfling an die Glut. Er gräbt, beansprucht Boden und trägt Gold.':
    'Summon another delver at the ember to excavate, claim ground and haul gold.',
  'Heilt Bewohner im Umkreis um 75 und die nahe Glut um 120 Lebenspunkte.':
    'Restores 75 health to nearby creatures and 120 health to the nearby ember.',
  'Trifft alle Eindringlinge im Umkreis mit 130 Schaden. Benötigt Forschung.':
    'Deals 130 damage to nearby invaders. Requires research.',
  'Drei Auslösungen mit jeweils 95 Schaden. Auf einem freien Gang errichten.':
    'Three charges dealing 95 damage each. Build in an empty corridor.',
  '280 Widerstand. Hält Eindringlinge auf und lässt eigene Bewohner passieren.':
    '280 durability. Delays invaders while letting your creatures pass.',
  'Lagert abgebautes Gold. Jedes Feld erweitert die Kapazität um 700.':
    'Stores mined gold. Each tile adds 700 storage capacity.',
  'Bewohner schlafen und erholen sich. Vier Felder locken neue Wächter an.':
    'Creatures sleep and recover here. Four tiles attract new wardens.',
  'Nährende Leuchtpilze stillen den Hunger. Nahrung wächst ohne weitere Kosten.':
    'Nutritious glowing mushrooms feed your creatures. Food grows at no extra cost.',
  'Wächter trainieren automatisch. Erfahrung erhöht Stärke und Lebenskraft; kostet Gold.':
    'Wardens train automatically. Experience increases strength and health; training costs gold.',
  'Vier Felder locken Runenweber an. Forschung schaltet Sturmfunken und die Werkstatt frei.':
    'Four tiles attract rune weavers. Research unlocks Stormspark and the workshop.',
  'Bewohner schmieden Vorräte für Fangrunen und Schutzpforten. Benötigt abgeschlossene Forschung.':
    'Creatures forge components for snares and gates. Requires completed research.',
  'Die Glut erwacht. Markiere Erdreich, um dein Reich zu erweitern.':
    'The ember awakens. Designate earth to expand your domain.',
  'Ein neuer Schürfling steht bereit.': 'A new delver is ready.',
  'Deine Kämpfer sammeln sich am Banner.':
    'Your fighters are gathering at the banner.',
  'Leere Kassen. Deine Bewohner warten auf ihren Lohn.':
    'Empty coffers. Your creatures are waiting for their wages.',
  'Unzufriedene Bewohner haben dein Reich verlassen.':
    'Unhappy creatures have abandoned your domain.',
  'Runen entziffert: Sturmfunken, Fangrune und Werkstatt freigeschaltet.':
    'Runes deciphered: Stormspark, snare runes and the workshop unlocked.',
  'Der Sonnenmarsch ist hier. Halte der letzten Belagerung stand!':
    'The Sun March is here. Withstand the final siege!',
  'Die letzte Glut ist erloschen.': 'The final ember has faded.',
  'Der Sonnenmarsch ist gebrochen. Die Tiefe gehört dir.':
    'The Sun March is broken. The depths are yours.',
  'Dieses Gebiet ist noch nicht erkundet.':
    'This area has not been explored yet.',
  'Hier gibt es kein abbaubares Erdreich.': 'There is no diggable earth here.',
  'Du benötigst 250 Gold.': 'You need 250 gold.',
  'Maximal 12 Schürflinge.': 'A maximum of 12 delvers.',
  'Du benötigst 30 Mana.': 'You need 30 mana.',
  'Du benötigst 45 Mana.': 'You need 45 mana.',
  'Wirke Heilung in der Nähe deiner Bewohner oder der Glut.':
    'Cast healing near your creatures or the ember.',
  'Erforsche zuerst Sturmfunken im Runenarchiv.':
    'Research Stormspark in the rune archive first.',
  'In diesem Gebiet stehen keine Gegner.': 'There are no enemies in this area.',
  'Wähle freigelegten Boden, den deine Schürflinge beansprucht haben.':
    'Choose exposed ground that your delvers have claimed.',
  'Hier steht nichts zum Verkaufen.': 'There is nothing to sell here.',
  'Benötigt abgeschlossene Forschung.': 'Requires completed research.',
  'Wähle einen freien Gang.': 'Choose an empty corridor.',
  'Du benötigst 1 Werkstück und 150 Gold.':
    'You need 1 component and 150 gold.',
  'Dieses Feld ist bereits bebaut.': 'This tile is already occupied.',
  'Die Werkstatt benötigt abgeschlossene Forschung.':
    'The workshop requires completed research.',
  'Dein Gold reicht für dieses Feld nicht aus.':
    'You do not have enough gold for this tile.',
  'Bewohner abgesetzt.': 'Creature dropped.',
  'Bewohner können nur auf eigenem, freiem Boden abgesetzt werden.':
    'Creatures can only be dropped on your own open ground.',
  'Die Glut ist das Zentrum deines Reichs. Wenn sie erlischt, ist das Spiel verloren.':
    'The ember is the centre of your domain. If it dies, you lose.',
  'Ausreichend Ruheplätze und Nahrung locken neue Bewohner durch das Tiefentor.':
    'Enough rest spaces and food attract creatures through the deep gate.',
  'Wähle einen Bewohner, um seine Bedürfnisse zu sehen.':
    'Select a creature to inspect its needs.',
  'Dein Browser konnte die 3D-Ansicht nicht starten. Aktiviere Hardwarebeschleunigung und verwende einen aktuellen Browser.':
    'Your browser could not start the 3D view. Enable hardware acceleration and use a current browser.',
  'Die 3D-Ansicht wurde unterbrochen. Speichere dein Reich und lade die Seite neu.':
    'The 3D view was interrupted. Save your domain and reload the page.',
  'Dein Reich wurde in diesem Browser gespeichert.':
    'Your domain was saved in this browser.',
  'Speichern ist in diesem Browser nicht verfügbar.':
    'Saving is unavailable in this browser.',
  'Es wurde kein gültiger Spielstand gefunden.':
    'No valid saved game was found.',
  'Dein Reich wurde wiederhergestellt.': 'Your domain has been restored.',
  'Der Spielstand konnte nicht geladen werden.':
    'The saved game could not be loaded.',
  'Baue ein Runenarchiv und schließe die Forschung ab.':
    'Build a rune archive and complete research.',
  'Sammelbanner aufgelöst.': 'Rally banner dismissed.',
  'Kluftkrone ist ein eigenständiges Dungeon-Strategiespiel. Deine Bewohner handeln selbstständig; du gestaltest ihre Welt.':
    'Kluftkrone is an original dungeon strategy game. Your creatures act independently; you shape their world.',
  'Wähle Graben (2) und markiere Erde oder Gold. Ziehen markiert ganze Flächen. Nur erreichbare Flächen werden abgebaut. Schürflinge beanspruchen den Boden danach automatisch.':
    'Choose Excavate (2) and designate earth or gold. Drag to designate areas. Only reachable tiles are excavated. Delvers then claim the ground automatically.',
  'Ziehe mit Graben oder einem Raumwerkzeug ein Raster über bekanntes Erdreich oder freien Boden. Wähle danach Nur graben oder einen Raum und bestätige mit Enter. Schürflinge graben, beanspruchen und bauen selbstständig; Gold wird erst beim Bau je Feld bezahlt. Aufträge bleiben im Spielstand gespeichert. Ruheplätze und mindestens 4 Pilzgarten-Felder ermöglichen neue Bewohner; zwei Ruhefelder bieten einen Platz.':
    'Drag a grid over known earth or empty ground using Excavate or a room tool. Choose Excavate only or a future room, then press Enter. Delvers excavate, claim and build automatically; gold is paid per completed tile. Orders are included in saved games. Rest spaces and at least 4 fungal-garden tiles allow new creatures to arrive; every two sanctuary tiles provide one place.',
  'Bewohner suchen Nahrung und Ruhe selbst. Alle 100 Sekunden ist Zahltag. Schürflinge liefern Gold in die Schatzkammer, deren Felder die Lagerkapazität erhöhen.':
    'Creatures find food and rest themselves. Payday occurs every 100 seconds. Delvers deliver gold to the treasury, whose tiles expand storage capacity.',
  'Training kostet Gold und stärkt Kämpfer. Vier Archivfelder locken einen Runenweber. Seine Forschung erschließt Sturmfunken, Fallen, Pforten und die Werkstatt.':
    'Training costs gold and strengthens fighters. Four archive tiles attract a rune weaver. Their research unlocks Stormspark, traps, gates and the workshop.',
  'Überstehe vier Angriffswellen und bewahre die Glut. Kämpfer greifen automatisch an. Glutsegen heilt auch die Glut. Das Sammelbanner (4) bündelt Kräfte; danach wieder lösen.':
    'Survive four invasions and protect the ember. Fighters attack automatically. Ember blessing also heals the ember. Rally banner (4) gathers forces; dismiss it afterwards.',
  'Bewohner direkt anklicken und danach den Zielboden anklicken – oder mit gedrückter Maustaste ziehen und loslassen. Auch unbeanspruchter Boden ist erlaubt. Escape oder Rechtsklick setzt eine getragene Kreatur zurück. Rechtsklick auf einen freien Bewohner schlägt ihn. Porträts öffnen die Bedürfnisse; „Übernehmen“ wechselt in ihre Sicht.':
    'Click a creature, then click its destination – or drag it with the left mouse button and release. Unclaimed ground is allowed. Escape or right-click returns a held creature. Right-click a resident on the ground to slap it. Portraits show its needs; Possess switches to its view.',
  'Speicherstände bleiben lokal in diesem Browser. Automatische Sicherung alle 30 Sekunden. Desktop und Maus werden empfohlen.':
    'Saves stay in this browser. Automatic saving every 30 seconds. Desktop and mouse recommended.',
  'Das Spiel pausiert, während dieses Fenster geöffnet ist.':
    'The game pauses while this window is open.',
  'Dunkle Klangflächen, ferne Glocken und ein eigener, sich wandelnder Soundtrack.':
    'Dark drones, distant bells and an original evolving soundtrack.',
  'Graben, Gold, Bau, Magie und Kampf. Im Raum verteilt und getrennt von der Musik regelbar.':
    'Digging, gold, building, magic and combat. Spatial effects controlled separately from music.',
  'Eigenständiges Spiel mit eigenen Welten, Figuren und Spielwerten.':
    'An original game with its own world, creatures and game values.',
  'Die laufende Expedition wird ersetzt. Speichere sie vorher, wenn du sie behalten möchtest.':
    'The current expedition will be replaced. Save it first if you want to keep it.',
  'Deine Bewohner haben dem Sonnenmarsch standgehalten. Unter den Aschebergen beginnt eine neue Zeit.':
    'Your creatures have withstood the Sun March. A new age begins beneath the Ashen Mountains.',
  'Die Sonnenritter haben das Zentrum deines Reichs zerstört. Jede neue Glut birgt eine neue Chance.':
    'The Sun Knights destroyed the centre of your domain. Every new ember holds another chance.',
  Sprache: 'Language',
  Deutsch: 'Deutsch',
  English: 'English',
  Greifen: 'Grab',
  Schlagen: 'Slap',
  Vollbild: 'Fullscreen',
};
export function translate(text: string, locale: Locale): string {
  if (locale === 'de') return text;
  if (messages[text]) return messages[text];
  const stripped = text.trim();
  if (messages[stripped]) return text.replace(stripped, messages[stripped]);
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^Geplant: (.+)$/)))
    return `Planned: ${translate(m[1], locale)}`;
  if ((m = text.match(/^Aufträge löschen: (.+)$/)))
    return `Remove orders: ${translate(m[1], locale)}`;
  if (
    (m = text.match(
      /^(Schürfling|Aschewächter|Runenweber|Basaltkoloss) · (\d+)$/,
    ))
  )
    return `${messages[m[1]]} · ${m[2]}`;
  if ((m = text.match(/^(\d+) Gold \/ Feld$/))) return `${m[1]} gold / tile`;
  if ((m = text.match(/^Angriff (\d+) von 4$/))) return `Invasion ${m[1]} of 4`;
  if (
    (m = text.match(
      /^Angriff (\d+)\/4: Sonnenritter dringen in dein Reich ein\.$/,
    ))
  )
    return `Invasion ${m[1]}/4: Sun Knights enter your domain.`;
  if ((m = text.match(/^Zahltag: (\d+) Gold an deine Bewohner\.$/)))
    return `Payday: ${m[1]} gold paid to your creatures.`;
  if ((m = text.match(/^(.+) erreicht Stufe (\d+)\.$/)))
    return `${translate(m[1], locale)} reached level ${m[2]}.`;
  if ((m = text.match(/^(.+) tritt durch das Tiefentor\.$/)))
    return `${translate(m[1], locale)} arrives through the deep gate.`;
  if ((m = text.match(/^(.+) ist gefallen\.$/)))
    return `${translate(m[1], locale)} has fallen.`;
  if ((m = text.match(/^(\d+) Gegner$/))) return `${m[1]} enemies`;
  if ((m = text.match(/^(\d+)-fache Geschwindigkeit$/)))
    return `${m[1]}× speed`;
  if ((m = text.match(/^Schritt (\d+) von 6$/))) return `Step ${m[1]} of 6`;
  if ((m = text.match(/^(Musik|Geräusche): (.+)$/)))
    return `${translate(m[1], locale)}: ${m[2].replace('stumm', 'muted').replace(' – klicken zum Umschalten', ' – click to toggle')}`;
  const chunks: Record<string, string> = {
    'STUFE ': 'LEVEL ',
    'Zahltag in ': 'Payday in ',
    'Expedition ': 'Expedition ',
    ' G': ' G',
    ' G / Feld': ' G / tile',
  };
  return chunks[text] ?? text;
}
/** Translate the same JSX tree, preserving state, refs, interactions and primitive components. */
export function translateTree(node: ReactNode, locale: Locale): ReactNode {
  if (locale === 'de') return node;
  if (typeof node === 'string') return translate(node, locale);
  if (Array.isArray(node))
    return node.map((child) => translateTree(child, locale));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const props: Record<string, unknown> = {};
  for (const key of ['title', 'aria-label', 'alt', 'placeholder'])
    if (typeof element.props[key] === 'string')
      props[key] = translate(element.props[key] as string, locale);
  if (element.props.children !== undefined) {
    const children = translateTree(element.props.children as ReactNode, locale);
    return Array.isArray(children)
      ? cloneElement(element, props, ...children)
      : cloneElement(element, props, children);
  }
  return cloneElement(element, props);
}
export const translationCatalog = messages;
