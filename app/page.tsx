import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Axe,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Coins,
  Compass,
  Crown,
  Diamond,
  DoorClosed,
  Eye,
  Flag,
  Flame,
  Hammer,
  Hand,
  Heart,
  Home,
  Layers3,
  Leaf,
  LockKeyhole,
  Maximize,
  Minus,
  MousePointer2,
  Move,
  Music2,
  Pause,
  Pickaxe,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Settings2,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  DungeonAudio,
  readAudioSettings,
  type AudioSettings,
  type SoundCue,
} from './audio';
import {
  ROOMS,
  ROOM_KEYS,
  roomLocked,
  prisoners,
  hostiles,
  prisonCapacity,
  NAMES,
  UNIT_COLORS,
  SIZE,
  createGame,
  tick,
  applyTool,
  countRoom,
  creatures,
  capacity,
  dropUnit,
  grabUnit,
  cancelGrab,
  slapUnit,
  serialize,
  deserialize,
  SAVE_KEY,
  walkable,
  type GameState,
  type Tool,
  type Room,
} from './game';
import { mountScene, type SceneControls } from './scene';
import { freshMapSeed } from './seeds';
import {
  isRoomTool,
  quoteDesignation,
  queueDesignation,
  cancelDesignations,
  isDesignationTool,
  type DesignationTool,
  commitConstruction,
  type ConstructionSelection,
} from './construction';
import { registerGameTools } from './webmcp';
import { translate, translateTree, type Locale } from './i18n';
const clock = (n: number) =>
  `${Math.floor(Math.max(0, n) / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(Math.max(0, n) % 60)
    .toString()
    .padStart(2, '0')}`;
const illustratedRooms = [
  'vault',
  'rest',
  'food',
  'training',
  'library',
  'forge',
];
const illustratedPowers = ['worker', 'heal', 'bolt', 'rally', 'trap', 'door'];
const roomIcons = {
  vault: Coins,
  rest: Home,
  food: Leaf,
  training: Swords,
  library: BookOpen,
  forge: Hammer,
  prison: LockKeyhole,
  torment: Zap,
  ritual: Flame,
};
const toolMeta: Record<
  string,
  {
    name: string;
    description: string;
    icon: typeof Pickaxe;
    cost: string;
    key?: string;
  }
> = {
  inspect: {
    name: 'Auswählen',
    description:
      'Bewohner direkt greifen: anklicken oder ziehen und auf freiem Boden loslassen. Rechtsklick schlägt. Details über die Bewohnerporträts öffnen.',
    icon: MousePointer2,
    cost: '',
    key: '1',
  },
  dig: {
    name: 'Graben',
    description:
      'Ziehe ein Raster über Erde oder Gold. Wähle Nur graben oder einen späteren Raum; Enter setzt den Auftrag.',
    icon: Pickaxe,
    cost: 'Kostenlos',
    key: '2',
  },
  sell: {
    name: 'Verkaufen',
    description:
      'Räume und Verteidigung verkaufen. Du erhältst die Hälfte der Baukosten zurück.',
    icon: Trash2,
    cost: '50 % zurück',
    key: '3',
  },
  rally: {
    name: 'Sammelbanner',
    description:
      'Versammle deine Kämpfer auf eigenem Boden. Löse das Banner, damit sie ihren Aufgaben nachgehen.',
    icon: Flag,
    cost: 'Kostenlos',
    key: '4',
  },
  worker: {
    name: 'Schürfling',
    description:
      'Rufe einen zusätzlichen Schürfling an die Glut. Er gräbt, beansprucht Boden und trägt Gold.',
    icon: Pickaxe,
    cost: '250 Gold',
  },
  heal: {
    name: 'Glutsegen',
    description:
      'Heilt Bewohner im Umkreis um 75 und die nahe Glut um 120 Lebenspunkte.',
    icon: Heart,
    cost: '30 Mana',
    key: '5',
  },
  bolt: {
    name: 'Sturmfunken',
    description:
      'Trifft alle Eindringlinge im Umkreis mit 130 Schaden. Benötigt Forschung.',
    icon: Zap,
    cost: '45 Mana',
  },
  trap: {
    name: 'Fangrune',
    description:
      'Drei Auslösungen mit jeweils 95 Schaden. Auf einem freien Gang errichten.',
    icon: Diamond,
    cost: '150 Gold · 1 Werkstück',
  },
  door: {
    name: 'Schutzpforte',
    description:
      '280 Widerstand. Hält Eindringlinge auf und lässt eigene Bewohner passieren.',
    icon: DoorClosed,
    cost: '150 Gold · 1 Werkstück',
  },
  ritualBlessing: {
    name: 'Aschensegen',
    icon: Flame,
    cost: '250 Gold',
    description:
      'Vier Ritualfelder. Für 250 Gold: 60 Sekunden +20 % Kampfkraft, +2 Mana pro Sekunde und mehr Zufriedenheit. 120 Sekunden Abklingzeit.',
  },
};
for (const [key, value] of Object.entries(ROOMS))
  toolMeta[key] = {
    name: value.name,
    description: value.description,
    icon: roomIcons[key as Room],
    cost: `${value.cost} Gold / Feld`,
  };
const objectives = [
  {
    title: 'Erschließe die Tiefe',
    text: 'Markiere Erdreich oder Gold. Deine Schürflinge graben und beanspruchen neuen Boden.',
  },
  {
    title: 'Stärke deine Bewohner',
    text: 'Baue mindestens 4 Felder Übungshof auf eigenem, freiem Boden.',
  },
  {
    title: 'Wecke altes Wissen',
    text: 'Baue 4 Felder Runenarchiv. Ein Runenweber wird durch das Tiefentor kommen.',
  },
  {
    title: 'Entziffere die Runen',
    text: 'Versorge deine Bewohner, während der Runenweber die Forschung abschließt.',
  },
  {
    title: 'Behaupte dein Reich',
    text: 'Vergrößere deine Ruhestätte, errichte Fallen und überstehe alle vier Angriffswellen.',
  },
  {
    title: 'Die Tiefe gehört dir',
    text: 'Der Sonnenmarsch ist gebrochen. Dein Reich hat bestanden.',
  },
];

function Minimap({
  state,
  onFocus,
  label,
}: {
  state: GameState;
  onFocus: (x: number, z: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    const cell = 6;
    c.clearRect(0, 0, 162, 162);
    for (const t of state.tiles) {
      c.fillStyle = !t.seen
        ? '#151e22'
        : t.kind === 'core'
          ? '#f2c37b'
          : t.kind === 'portal'
            ? '#78d4c2'
            : t.kind === 'entry'
              ? '#ed8f70'
              : t.room
                ? ROOMS[t.room].color
                : t.kind === 'gold'
                  ? '#aa8546'
                  : t.kind === 'water'
                    ? '#3d6468'
                    : walkable(t)
                      ? t.owned
                        ? '#777967'
                        : '#464f4e'
                      : '#303c40';
      c.fillRect(t.x * cell, t.z * cell, 5, 5);
      if (t.marked || t.plannedRoom) {
        c.fillStyle = t.plannedRoom ? ROOMS[t.plannedRoom].color : '#e8bb67';
        c.fillRect(t.x * cell + 1, t.z * cell + 1, 3, 3);
      }
    }
    for (const u of state.units) {
      if (u.id === state.heldUnitId) continue;
      c.fillStyle = u.prisoner ? '#c796e3' : UNIT_COLORS[u.kind];
      c.beginPath();
      c.arc(u.x * cell + 3, u.z * cell + 3, 2, 0, Math.PI * 2);
      c.fill();
    }
  }, [state, state.time, state.revision]);
  return (
    <canvas
      ref={ref}
      width={162}
      height={162}
      aria-label={label}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onFocus(
          ((e.clientX - r.left) / r.width) * SIZE,
          ((e.clientY - r.top) / r.height) * SIZE,
        );
      }}
    />
  );
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      return localStorage.getItem('kluftkrone-locale') === 'en' ? 'en' : 'de';
    } catch {
      return 'de';
    }
  });
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === 'de'
        ? 'Kluftkrone — Herrschaft der Tiefe'
        : 'Kluftkrone — Dominion Below';
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        translate(
          'Baue dein Reich unter der Erde. Kluftkrone ist ein eigenständiges 3D-Dungeon-Strategiespiel mit autonomen Bewohnern, Forschung und Belagerungen.',
          locale,
        ),
      );
    try {
      localStorage.setItem('kluftkrone-locale', locale);
    } catch {}
  }, [locale]);
  const fmt = (n: number) =>
    Math.floor(n).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US');
  const [snapshot, setSnapshot] = useState<GameState>(() => createGame());
  const stateRef = useRef<GameState>(snapshot);
  const [started, setStarted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const pauseRef = useRef(true);
  const speedRef = useRef(1);
  const [tool, setTool] = useState<Tool>('dig');
  const toolRef = useRef<Tool>('dig');
  const [category, setCategory] = useState('rooms');
  const [construction, setConstruction] =
    useState<ConstructionSelection | null>(null);
  const constructionRef = useRef<ConstructionSelection | null>(null);
  const updateConstruction = useCallback(
    (next: ConstructionSelection | null) => {
      constructionRef.current = next;
      setConstruction(next);
    },
    [],
  );
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const carrying = snapshot.heldUnitId;
  const [possessed, setPossessed] = useState<number | null>(null);
  const possessedRef = useRef<number | null>(null);
  const [help, setHelp] = useState(false);
  const [settings, setSettings] = useState(false);
  const [newGameDialog, setNewGameDialog] = useState(false);
  const [difficulty, setDifficulty] =
    useState<GameState['difficulty']>('normal');
  const [toast, setToast] = useState('');
  const [webglError, setWebglError] = useState('');
  const [audioSettings, setAudioSettings] =
    useState<AudioSettings>(readAudioSettings);
  const [saved, setSaved] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [showRoster, setShowRoster] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const sceneHost = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneControls | null>(null);
  const soundRef = useRef<DungeonAudio | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioSettingsRef = useRef(audioSettings);
  const playedEffectsRef = useRef(new WeakSet<object>());
  const refresh = useCallback(() => setSnapshot({ ...stateRef.current }), []);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  }, []);
  const sound = useCallback((tone: SoundCue = 'click', x = 13) => {
    if (!soundRef.current)
      soundRef.current = new DungeonAudio(audioSettingsRef.current);
    soundRef.current.start();
    soundRef.current.cue(tone, x);
  }, []);
  const updateAudio = useCallback((patch: Partial<AudioSettings>) => {
    const next = { ...audioSettingsRef.current, ...patch };
    audioSettingsRef.current = next;
    setAudioSettings(next);
    if (!soundRef.current) soundRef.current = new DungeonAudio(next);
    soundRef.current.start();
    soundRef.current.update(next);
  }, []);
  useEffect(() => {
    const begin = () => {
      if (!soundRef.current)
        soundRef.current = new DungeonAudio(audioSettingsRef.current);
      soundRef.current.start();
    };
    const hidden = () => soundRef.current?.setPaused(document.hidden);
    window.addEventListener('pointerdown', begin, { once: true });
    window.addEventListener('keydown', begin, { once: true });
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('pointerdown', begin);
      window.removeEventListener('keydown', begin);
      document.removeEventListener('visibilitychange', hidden);
      soundRef.current?.dispose();
      soundRef.current = null;
    };
  }, []);
  const releaseGrab = useCallback(() => {
    cancelGrab(stateRef.current);
    sceneRef.current?.cancelDrag();
    refresh();
  }, [refresh]);
  const pickupResident = useCallback(
    (id: number) => {
      if (possessedRef.current !== null || !grabUnit(stateRef.current, id))
        return false;
      updateConstruction(null);
      setSelected(null);
      const unit = stateRef.current.units.find((u) => u.id === id)!;
      sound('click');
      soundRef.current?.voice(unit.kind, 'grab');
      refresh();
      return true;
    },
    [refresh, sound, updateConstruction],
  );
  const placeResident = useCallback(
    (i: number) => {
      const s = stateRef.current;
      const id = s.heldUnitId;
      if (id === null) return;
      const unit = s.units.find((u) => u.id === id);
      if (dropUnit(s, id, i)) {
        notify('Bewohner abgesetzt.');
        soundRef.current?.voice(unit?.kind ?? 'worker', 'drop');
      } else if (unit?.prisoner)
        notify(
          'Gefangene benötigen eine freie eigene Gefängniszelle oder ein Folterfeld.',
        );
      else
        notify(
          'Wähle erkundeten, begehbaren Boden. Die Kreatur bleibt in deiner Hand.',
        );
      refresh();
    },
    [refresh, notify],
  );
  const slapResident = useCallback(
    (id: number) => {
      if (!slapUnit(stateRef.current, id)) return;
      const unit = stateRef.current.units.find((u) => u.id === id)!;
      sound('hit', unit.x);
      soundRef.current?.voice(unit.kind, 'hurt');
      const effect = stateRef.current.effects.at(-1);
      if (effect) playedEffectsRef.current.add(effect);
      refresh();
    },
    [refresh, sound],
  );
  const changeTool = useCallback(
    (next: Tool) => {
      const previousPlan = constructionRef.current;
      updateConstruction(
        isDesignationTool(next) && previousPlan && !previousPlan.dragging
          ? { ...previousPlan, room: next }
          : null,
      );
      sceneRef.current?.cancelDrag();
      setTool(next);
      if (isDesignationTool(next)) setSelected(null);
      toolRef.current = next;
      cancelGrab(stateRef.current);
      refresh();
      sound();
      if (next === 'worker' || next === 'ritualBlessing') {
        const result = applyTool(stateRef.current, next, 13 + 14 * SIZE);
        if (result.message) notify(result.message);
        refresh();
      }
    },
    [notify, refresh, sound, updateConstruction],
  );
  const applySelection = useCallback(
    (indices: number[]) => {
      if (!indices.length) return;
      const s = stateRef.current;
      if (isDesignationTool(toolRef.current)) {
        updateConstruction({ room: toolRef.current, indices, dragging: false });
        sound('click');
        return;
      }
      let successes = 0,
        lastMessage = '';
      for (const i of indices) {
        const result = applyTool(s, toolRef.current, i);
        if (result.ok) successes++;
        else if (result.message) lastMessage = result.message;
      }
      if (!successes && lastMessage) notify(lastMessage);
      if (successes) sound(toolRef.current in ROOMS ? 'build' : 'click');
      refresh();
    },
    [notify, refresh, sound, updateConstruction],
  );
  const buildConstruction = useCallback(() => {
    const plan = constructionRef.current;
    if (!plan || plan.dragging) return;
    const result = queueDesignation(stateRef.current, plan.room, plan.indices);
    notify(result.message);
    if (result.queued) {
      updateConstruction(null);
      sound('click');
    }
    refresh();
  }, [notify, refresh, sound, updateConstruction]);
  useEffect(() => {
    try {
      setHasSave(!!localStorage.getItem(SAVE_KEY));
    } catch {
      /* unavailable storage */
    }
    if (!sceneHost.current) return;
    try {
      sceneRef.current = mountScene(sceneHost.current, {
        state: () => stateRef.current,
        tool: () => toolRef.current,
        construction: () => constructionRef.current,
        onPreview: (indices) => {
          if (indices === null) updateConstruction(null);
          else if (isDesignationTool(toolRef.current))
            updateConstruction({
              room: toolRef.current,
              indices,
              dragging: true,
            });
        },
        canControl: () =>
          !pauseRef.current && stateRef.current.status === 'playing',
        onSelect: (i, unitId) => {
          if (toolRef.current === 'inspect') {
            setSelected(unitId);
            if (unitId === null) {
              const t = stateRef.current.tiles[i];
              notify(
                t.room
                  ? ROOMS[t.room].description
                  : t.kind === 'core'
                    ? 'Die Glut ist das Zentrum deines Reichs. Wenn sie erlischt, ist das Spiel verloren.'
                    : t.kind === 'portal'
                      ? 'Ausreichend Ruheplätze und Nahrung locken neue Bewohner durch das Tiefentor.'
                      : 'Wähle einen Bewohner, um seine Bedürfnisse zu sehen.',
              );
            }
          } else applySelection([i]);
        },
        onSlap: slapResident,
        onGrab: pickupResident,
        onDrop: placeResident,
        onCancelGrab: releaseGrab,
        onArea: applySelection,
        onHover: setHovered,
        onPossession: (id) => {
          if (id !== null) updateConstruction(null);
          setPossessed(id);
          possessedRef.current = id;
        },
        onError: setWebglError,
      });
    } catch {
      setWebglError(
        'Dein Browser konnte die 3D-Ansicht nicht starten. Aktiviere Hardwarebeschleunigung und verwende einen aktuellen Browser.',
      );
    }
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [
    notify,
    refresh,
    applySelection,
    updateConstruction,
    pickupResident,
    placeResident,
    releaseGrab,
    slapResident,
  ]);
  useEffect(() => {
    sceneRef.current?.setAccessibleLabel(
      translate(
        'Dreidimensionale Dungeon-Karte. Ziehen zum Markieren, rechte Maustaste zum Drehen.',
        locale,
      ),
    );
  }, [locale]);
  useEffect(() => {
    pauseRef.current = !started || paused || help || settings || newGameDialog;
    speedRef.current = speed;
  }, [started, paused, help, settings, newGameDialog, speed]);
  const saveGame = useCallback(
    (automatic = false) => {
      try {
        localStorage.setItem(SAVE_KEY, serialize(stateRef.current));
        setHasSave(true);
        setSaved(true);
        if (!automatic)
          notify('Dein Reich wurde in diesem Browser gespeichert.');
      } catch {
        if (!automatic)
          notify('Speichern ist in diesem Browser nicht verfügbar.');
      }
    },
    [notify],
  );
  const loadGame = useCallback(() => {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      const loaded = data && deserialize(data);
      if (!loaded) {
        notify('Es wurde kein gültiger Spielstand gefunden.');
        return;
      }
      updateConstruction(null);
      sceneRef.current?.cancelDrag();
      stateRef.current = loaded;
      setStarted(true);
      setPaused(false);
      setSettings(false);
      setSelected(null);
      cancelGrab(stateRef.current);
      refresh();
      sceneRef.current?.possess(null);
      sceneRef.current?.center();
      setDifficulty(loaded.difficulty);
      refresh();
      notify('Dein Reich wurde wiederhergestellt.');
    } catch {
      notify('Der Spielstand konnte nicht geladen werden.');
    }
  }, [notify, refresh, updateConstruction]);
  useEffect(() => {
    let previous = performance.now(),
      uiElapsed = 0,
      saveElapsed = 0,
      lastWave = 0;
    const previousEffects = playedEffectsRef.current;
    const timer = setInterval(() => {
      const now = performance.now(),
        elapsed = Math.min((now - previous) / 1000, 0.2);
      previous = now;
      if (!pauseRef.current) {
        let remaining = elapsed * speedRef.current;
        while (remaining > 0) {
          const step = Math.min(0.1, remaining);
          tick(stateRef.current, step, possessedRef.current);
          remaining -= step;
        }
        saveElapsed += elapsed;
        if (saveElapsed > 30) {
          saveGame(true);
          saveElapsed = 0;
        }
        if (stateRef.current.wave > lastWave) {
          lastWave = stateRef.current.wave;
          sound('warn');
        }
      }
      for (const effect of stateRef.current.effects) {
        if (!previousEffects.has(effect)) {
          soundRef.current?.cue(effect.type, effect.x);
          if (effect.type === 'hit') {
            const victim = stateRef.current.units.find(
              (u) =>
                u.id !== stateRef.current.heldUnitId &&
                Math.hypot(u.x - effect.x, u.z - effect.z) < 0.7,
            );
            if (victim) soundRef.current?.voice(victim.kind, 'hurt');
          }
          previousEffects.add(effect);
        }
      }
      soundRef.current?.setTension(hostiles(stateRef.current).length / 8);
      uiElapsed += elapsed;
      if (uiElapsed > 0.18) {
        refresh();
        uiElapsed = 0;
      }
    }, 50);
    return () => clearInterval(timer);
  }, [refresh, saveGame, sound]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        help ||
        settings ||
        newGameDialog ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      )
        return;
      if (stateRef.current.heldUnitId !== null && e.key === 'Escape') {
        e.preventDefault();
        releaseGrab();
        return;
      }
      if (constructionRef.current && e.key === 'Escape') {
        e.preventDefault();
        updateConstruction(null);
        sceneRef.current?.cancelDrag();
        return;
      }
      if (
        constructionRef.current &&
        e.key === 'Enter' &&
        !e.repeat &&
        target.closest('.designation-choice, .build-cards, .queued-order-focus')
      ) {
        e.preventDefault();
        buildConstruction();
        return;
      }
      if (target.tagName === 'BUTTON') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (started) setPaused((p) => !p);
        else setStarted(true);
      }
      if (e.key === 'Enter' && !e.repeat && constructionRef.current) {
        e.preventDefault();
        buildConstruction();
      }
      if (e.key === 'Escape') {
        if (constructionRef.current) {
          updateConstruction(null);
          sceneRef.current?.cancelDrag();
        } else if (possessedRef.current !== null)
          sceneRef.current?.possess(null);
        else changeTool('inspect');
      }
      if (e.key.toLowerCase() === 'f') sceneRef.current?.center();
      const map: Record<string, Tool> = {
        '1': 'inspect',
        '2': 'dig',
        '3': 'sell',
        '4': 'rally',
        '5': 'heal',
      };
      if (map[e.key]) changeTool(map[e.key]);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveGame();
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [
    started,
    help,
    settings,
    newGameDialog,
    changeTool,
    saveGame,
    buildConstruction,
    updateConstruction,
    releaseGrab,
  ]);
  useEffect(
    () =>
      registerGameTools(
        {
          state: () => stateRef.current,
          act: (t, indices) => {
            if (isRoomTool(t)) {
              const result = commitConstruction(stateRef.current, t, indices);
              refresh();
              return {
                ok: result.built,
                messages: result.built
                  ? []
                  : [translate(result.message, locale)],
              };
            }
            let ok = 0;
            const messages: string[] = [];
            for (const i of indices) {
              const r = applyTool(stateRef.current, t, i);
              if (r.ok) ok++;
              else if (r.message) messages.push(translate(r.message, locale));
            }
            refresh();
            return { ok, messages };
          },
          pause: () => {
            setPaused(true);
            return true;
          },
        },
        locale,
      ),
    [refresh, locale],
  );
  const startNew = () => {
    stateRef.current = createGame(
      freshMapSeed(stateRef.current.seed),
      difficulty,
    );
    setStarted(true);
    setPaused(false);
    setSpeed(1);
    setSelected(null);

    sceneRef.current?.possess(null);
    setNewGameDialog(false);
    setSettings(false);
    changeTool('dig');
    sceneRef.current?.center();
    refresh();
  };
  const selectResident = (id: number) => {
    setSelected(id);
    changeTool('inspect');
    const u = stateRef.current.units.find((u) => u.id === id);
    if (u) sceneRef.current?.focus(u.x, u.z);
  };
  const s = snapshot,
    residents = creatures(s),
    selectedUnit = s.units.find((u) => u.id === selected),
    next = Math.max(0, s.nextWave - s.time),
    objective = objectives[s.tutorial],
    meta = toolMeta[tool];
  const items =
    category === 'rooms'
      ? (ROOM_KEYS as Tool[])
      : category === 'powers'
        ? (['worker', 'heal', 'bolt', 'rally', 'ritualBlessing'] as Tool[])
        : (['trap', 'door', 'sell'] as Tool[]);
  const constructionQuote = construction
    ? quoteDesignation(s, construction.room, construction.indices)
    : null;
  const queuedOrders = (['dig', ...ROOM_KEYS] as DesignationTool[])
    .map((kind) => {
      const indices = s.tiles.flatMap((t, i) =>
        t.plannedRoom === kind || (kind === 'dig' && t.marked && !t.plannedRoom)
          ? [i]
          : [],
      );
      return {
        kind,
        indices,
        cost: kind === 'dig' ? 0 : indices.length * ROOMS[kind].cost,
        waitingForGold:
          kind !== 'dig' &&
          indices.some(
            (i) =>
              s.tiles[i].owned &&
              s.tiles[i].kind === 'floor' &&
              s.gold < ROOMS[kind].cost,
          ),
      };
    })
    .filter((order) => order.indices.length);
  const hoverTile = hovered === null ? null : s.tiles[hovered];
  const hoverName = hoverTile
    ? hoverTile.plannedRoom
      ? `Geplant: ${ROOMS[hoverTile.plannedRoom].name}`
      : hoverTile.marked
        ? 'Grabungsauftrag'
        : hoverTile.room
          ? ROOMS[hoverTile.room].name
          : {
              rock: 'Unzerstörbarer Fels',
              earth: 'Erdreich',
              gold: 'Goldader',
              floor: hoverTile.owned ? 'Dein Reich' : 'Unbeanspruchter Boden',
              core: 'Die ewige Glut',
              portal: 'Tiefentor',
              entry: 'Sonnenpfad',
              water: 'Unterirdischer See',
            }[hoverTile.kind]
    : null;
  return translateTree(
    <main
      className={`game-shell ${started ? 'is-playing' : ''} ${carrying !== null ? 'is-carrying' : ''}`}
    >
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            sceneRef.current?.center();
          }}
          aria-label="Kluftkrone – Ansicht zentrieren"
        >
          <span className="brand-mark">
            <Flame size={29} strokeWidth={1.3} />
          </span>
          <span>
            KLUFTKRONE<small>HERRSCHAFT DER TIEFE</small>
          </span>
        </a>
        <div className="resources">
          <div className="resource gold">
            <Coins />
            <span>
              <strong>{fmt(s.gold)}</strong>
              <small>
                GOLD <span>/ {fmt(capacity(s))}</span>
              </small>
            </span>
          </div>
          <div className="resource mana">
            <Sparkles />
            <span>
              <strong>
                {fmt(s.mana)}
                <i>+0,7/s</i>
              </strong>
              <small>
                MANA <span>/ 200</span>
              </small>
            </span>
          </div>
          <div className="resource population">
            <Users />
            <span>
              <strong>
                {residents.length}
                <i>
                  /{' '}
                  {Math.floor(countRoom(s, 'rest') / 2) +
                    residents.filter((u) => u.kind === 'worker').length}
                </i>
              </strong>
              <small>BEWOHNER</small>
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Vollbild umschalten"
            title="Vollbild umschalten"
            onClick={() => {
              if (!document.documentElement.requestFullscreen) {
                notify('Vollbild ist in diesem Browser nicht verfügbar.');
                return;
              }
              const action = document.fullscreenElement
                ? document.exitFullscreen()
                : document.documentElement.requestFullscreen();
              action.catch(() =>
                notify('Vollbild ist in diesem Browser nicht verfügbar.'),
              );
            }}
          >
            <Maximize size={16} />
          </button>
          <button
            className="language-toggle"
            onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
            aria-label={
              locale === 'de' ? 'Switch to English' : 'Auf Deutsch umschalten'
            }
          >
            <b>{locale === 'de' ? 'DE' : 'EN'}</b>
            <span>{locale === 'de' ? 'EN' : 'DE'}</span>
          </button>
          <span className="local-save">
            <span className={saved ? 'status-dot' : 'status-dot amber'} />
            {saved ? 'Lokal gesichert' : 'Lokales Spiel'}
          </span>
          <button
            className="icon-button"
            onClick={() => setHelp(true)}
            title="Spielanleitung"
            aria-label="Spielanleitung"
          >
            <CircleHelp size={20} />
          </button>
          <button
            className="icon-button"
            onClick={() => setSettings(true)}
            title="Einstellungen und Spielstand"
            aria-label="Einstellungen und Spielstand"
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className={`sidebar ${compactSidebar ? 'mobile-open' : ''}`}>
          <section className="chapter-card">
            <img
              src={`${import.meta.env.BASE_URL}art/openart/sanctuary.webp`}
              alt="Bernsteinfarbener Obelisk in einer gewaltigen unterirdischen Festung"
            />
            <div className="chapter-shade" />
            <div className="chapter-copy">
              <span className="eyebrow">
                EXPEDITION 01 <span>◆</span>
              </span>
              <h1>Die erste Glut</h1>
              <p>Unter den Aschebergen</p>
            </div>
            <span className="difficulty-chip">
              {s.difficulty === 'relaxed'
                ? 'ENTSPANNT'
                : s.difficulty === 'hard'
                  ? 'ERBARMUNGSLOS'
                  : 'STANDARD'}
            </span>
          </section>
          <section className="core-status">
            <div className="section-label">
              <Flame size={15} />
              <span>DIE EWIGE GLUT</span>
              <strong>{Math.ceil((s.coreHp / 1500) * 100)} %</strong>
            </div>
            <Progress value={s.coreHp / 15} className="core-progress" />
            <div className="subline">
              <span>
                {fmt(s.coreHp)} / {fmt(1500)}
              </span>
              <span>
                {s.coreHp > 900
                  ? 'Stabil'
                  : s.coreHp > 400
                    ? 'Bedroht'
                    : 'Kritisch'}
              </span>
            </div>
          </section>
          <section className="objective">
            <div className="section-label">
              <Compass size={15} />
              <span>DEIN NÄCHSTER SCHRITT</span>
            </div>
            <div className="objective-heading">
              <span className="objective-number">
                0{Math.min(5, s.tutorial + 1)}
              </span>
              <h2>{objective.title}</h2>
            </div>
            <p>{objective.text}</p>
            <div
              className="steps"
              aria-label={`Schritt ${s.tutorial + 1} von 6`}
            >
              {objectives.map((_, i) => (
                <span key={i} className={i <= s.tutorial ? 'complete' : ''} />
              ))}
            </div>
            {!started && (
              <button
                className="primary-button start-button"
                onClick={() => {
                  setStarted(true);
                  sound('build');
                }}
              >
                Die Glut entfachen <ArrowUpRight size={17} />
              </button>
            )}
            {!started && hasSave && (
              <button className="text-button resume-save" onClick={loadGame}>
                Gespeichertes Reich fortsetzen <ChevronRight size={14} />
              </button>
            )}
          </section>
          <section className="residents">
            <button
              className="section-label section-toggle"
              onClick={() => setShowRoster(!showRoster)}
            >
              <Users size={15} />
              <span>DEINE BEWOHNER</span>
              <strong>{residents.length}</strong>
              <ChevronRight
                size={14}
                className={showRoster ? 'rotate-90' : ''}
              />
            </button>
            {showRoster && (
              <div className="resident-list">
                {(['worker', 'guard', 'scholar', 'brute'] as const).map(
                  (kind) => {
                    const group = residents.filter((u) => u.kind === kind),
                      Icon =
                        kind === 'worker'
                          ? Pickaxe
                          : kind === 'guard'
                            ? Shield
                            : kind === 'scholar'
                              ? WandSparkles
                              : Axe;
                    return (
                      <button
                        key={kind}
                        className={`resident-row ${group.length ? '' : 'absent'}`}
                        disabled={!group.length}
                        aria-label={`${NAMES[kind]} · ${group.length}`}
                        title={NAMES[kind]}
                        onClick={() => selectResident(group[0].id)}
                      >
                        <span className={`resident-icon ${kind}`}>
                          <Icon size={18} />
                        </span>
                        <span>
                          <strong>{NAMES[kind]}</strong>
                          <small>
                            {group.length
                              ? kind === 'worker'
                                ? 'Graben · Gold · Ausbau'
                                : kind === 'scholar'
                                  ? 'Forschung · Magie'
                                  : kind === 'brute'
                                    ? 'Kampf · Werkstatt'
                                    : 'Training · Verteidigung'
                              : kind === 'scholar'
                                ? 'Benötigt 4 Runenarchiv-Felder'
                                : 'Benötigt Forschung & Übungshof'}
                          </small>
                        </span>
                        <b>{group.length.toString().padStart(2, '0')}</b>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </section>
          <section className="research">
            <div className="section-label">
              <BookOpen size={15} />
              <span>RUNENFORSCHUNG</span>
              <strong>{Math.floor(s.research)} %</strong>
            </div>
            <Progress value={s.research} className="research-progress" />
            <div className="subline">
              <span>
                {s.unlocked
                  ? 'Sturmfunken freigeschaltet'
                  : countRoom(s, 'library')
                    ? 'Runen werden entziffert'
                    : 'Runenarchiv erforderlich'}
              </span>
              {s.unlocked && <Check size={13} />}
            </div>
          </section>
          <section className="event-log">
            <div className="section-label">
              <Activity size={15} />
              <span>AUS DER TIEFE</span>
            </div>
            <div className="events">
              {s.messages.slice(0, 3).map((message) => (
                <div key={message.id} className={`event ${message.tone}`}>
                  <span className="event-dot" />
                  <p>
                    {message.text}
                    <time>{clock(message.time)}</time>
                  </p>
                </div>
              ))}
            </div>
          </section>
          <div className="sidebar-foot">
            <span className="status-dot" /> DEIN REICH WÄCHST IM VERBORGENEN
          </div>
        </aside>
        <section
          className={`world ${possessed !== null ? 'possessed' : ''}`}
          aria-label="Dungeon und Bauwerkzeuge"
        >
          <div ref={sceneHost} className="scene" />
          <div className="world-vignette" />
          <div className="map-topline">
            <div className="depth-label">
              <Layers3 size={15} />
              <span>DIE ASCHENKAMMERN</span>
              <i>/</i>
              <span>EBENE −01</span>
            </div>
            <div
              className={`wave-pill ${next < 30 && started ? 'danger' : ''}`}
            >
              <Swords size={16} />
              <span>
                {s.wave === 4
                  ? 'Letzte Belagerung'
                  : `Angriff ${s.wave + 1} von 4`}
              </span>
              <b>
                {s.wave === 4 ? hostiles(s).length + ' Gegner' : clock(next)}
              </b>
            </div>
          </div>
          <button
            className="mobile-sidebar icon-button"
            aria-label="Reichsübersicht ein- oder ausblenden"
            onClick={() => setCompactSidebar(!compactSidebar)}
          >
            <Layers3 />
          </button>
          <div className={`minimap-panel ${showMap ? '' : 'collapsed'}`}>
            <button
              className="minimap-title"
              onClick={() => setShowMap(!showMap)}
            >
              <span>
                <Compass size={14} /> REICHSKARTE
              </span>
              <span>{showMap ? '−' : '+'}</span>
            </button>
            {showMap && (
              <>
                <Minimap
                  state={s}
                  label={translate(
                    'Übersichtskarte: anklicken, um die Ansicht zu zentrieren',
                    locale,
                  )}
                  onFocus={(x, z) => sceneRef.current?.focus(x, z)}
                />
                <div className="minimap-caption">
                  <span>
                    <i />
                    DEIN REICH
                  </span>
                  <span>
                    N <span>↑</span>
                  </span>
                </div>
              </>
            )}
          </div>
          {!started && (
            <div className="welcome-hint">
              <span className="thin-rule" />
              <span>Ein Funke. Ein Anfang. Dein Reich.</span>
              <span className="thin-rule" />
            </div>
          )}
          {started && paused && (
            <div className="pause-banner">
              <Pause size={18} /> DIE TIEFE WARTET{' '}
              <button onClick={() => setPaused(false)}>
                Fortsetzen <Play size={14} />
              </button>
            </div>
          )}
          {!selectedUnit && !construction && possessed === null && (
            <div className="right-hud">
              {started &&
                (countRoom(s, 'prison') > 0 ||
                  prisoners(s).length > 0 ||
                  s.ritualUntil > s.time) && (
                  <aside
                    className="prison-ledger"
                    aria-label="Gefangene und Rituale"
                  >
                    <div className="prison-ledger-heading">
                      <LockKeyhole size={15} />
                      <strong>GEFANGENE</strong>
                      <b>{prisoners(s).length}</b>
                    </div>
                    <div className="prison-summary">
                      <span>Zellen</span>
                      <b>{prisonCapacity(s)}</b>
                      <span>Überläufer</span>
                      <b>{s.converted}</b>
                    </div>
                    <div className="prison-list">
                      {prisoners(s).map((u) => (
                        <button
                          key={u.id}
                          onClick={() => selectResident(u.id)}
                          title="Gefangenen ansehen"
                        >
                          <span>
                            <LockKeyhole size={12} />
                            {u.name} <small>#{u.id}</small>
                          </span>
                          <small>{u.state}</small>
                          {u.conversion > 0 && (
                            <Progress value={u.conversion} />
                          )}
                        </button>
                      ))}
                    </div>
                    {!prisoners(s).length && (
                      <small>
                        Besiegte Gegner werden in freie Zellen gebunden.
                      </small>
                    )}
                    {s.ritualUntil > s.time && (
                      <div className="ritual-status">
                        <Flame size={14} />
                        <span>ASCHENSEGEN</span>
                        <b>{clock(s.ritualUntil - s.time)}</b>
                      </div>
                    )}
                  </aside>
                )}
              {queuedOrders.length > 0 && possessed === null && (
                <aside className="queued-orders" aria-label="Gesetzte Aufträge">
                  <h3>
                    <Layers3 size={14} />
                    AUFTRÄGE
                  </h3>
                  {queuedOrders.map((order) => (
                    <div className="queued-order" key={order.kind}>
                      <button
                        className="queued-order-focus"
                        onClick={() => {
                          changeTool(order.kind);
                          updateConstruction({
                            room: order.kind,
                            indices: order.indices,
                            dragging: false,
                          });
                          const first =
                            stateRef.current.tiles[order.indices[0]];
                          sceneRef.current?.focus(first.x, first.z);
                        }}
                      >
                        <i
                          style={{
                            background:
                              order.kind === 'dig'
                                ? '#e8bb67'
                                : ROOMS[order.kind].color,
                          }}
                        />
                        <span>
                          {order.kind === 'dig'
                            ? 'Nur graben'
                            : ROOMS[order.kind].name}
                          <small>
                            {order.waitingForGold
                              ? 'Wartet auf Baugold'
                              : 'Geplant'}
                          </small>
                        </span>
                        <b>{order.indices.length}</b>
                      </button>
                      <button
                        className="queued-order-cancel"
                        aria-label={`Aufträge löschen: ${order.kind === 'dig' ? 'Nur graben' : ROOMS[order.kind].name}`}
                        onClick={() => {
                          cancelDesignations(stateRef.current, order.indices);
                          updateConstruction(null);
                          refresh();
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <p>
                    {queuedOrders.some((order) => order.kind !== 'dig')
                      ? 'Graben → Beanspruchen → Bauen'
                      : 'Schürflinge graben erreichbare Felder aus.'}
                  </p>
                  {queuedOrders.some((order) => order.cost > 0) && (
                    <p>
                      <span>Geplanter Ausbau:</span>{' '}
                      {fmt(
                        queuedOrders.reduce(
                          (sum, order) => sum + order.cost,
                          0,
                        ),
                      )}{' '}
                      <span>Gold</span>
                    </p>
                  )}
                </aside>
              )}
            </div>
          )}
          {construction && constructionQuote && possessed === null && (
            <aside
              className={`construction-command ${construction.dragging ? 'is-drawing' : ''}`}
              aria-label="Bauplan"
            >
              <div className="construction-heading">
                <Layers3 size={21} />
                <div>
                  <small>
                    {construction.dragging ? 'FLÄCHE MARKIEREN' : 'BAUPLAN'}
                  </small>
                  <strong>
                    {construction.room === 'dig'
                      ? 'Nur graben'
                      : ROOMS[construction.room].name}
                  </strong>
                </div>
                <b className="construction-size">
                  {constructionQuote.width} × {constructionQuote.depth}
                </b>
                <button
                  className="construction-cancel"
                  aria-label="Bauplan verwerfen"
                  onClick={() => {
                    updateConstruction(null);
                    sceneRef.current?.cancelDrag();
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div
                className="designation-choice"
                role="group"
                aria-label="Nutzung nach dem Graben"
              >
                <small>DANACH ANLEGEN</small>
                {(['dig', ...ROOM_KEYS] as DesignationTool[]).map((kind) => {
                  const Icon = kind === 'dig' ? Pickaxe : roomIcons[kind];
                  return (
                    <button
                      key={kind}
                      title={kind === 'dig' ? 'Nur graben' : ROOMS[kind].name}
                      aria-label={
                        kind === 'dig' ? 'Nur graben' : ROOMS[kind].name
                      }
                      aria-pressed={construction.room === kind}
                      disabled={roomLocked(s, kind)}
                      onClick={() => changeTool(kind)}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
              <div className="construction-counts" aria-live="polite">
                <span className="valid">
                  <i />
                  {constructionQuote.valid.length} <span>geplant</span>
                </span>
                {constructionQuote.blocked.length > 0 && (
                  <span className="blocked">
                    <i />
                    {constructionQuote.blocked.length} <span>blockiert</span>
                  </span>
                )}
                <strong>
                  <Coins size={15} />
                  {fmt(constructionQuote.cost)} <span>Gold</span>
                </strong>
              </div>
              <div className="designation-stages">
                <span>
                  <Pickaxe size={13} />
                  {constructionQuote.excavate.length} <span>graben</span>
                </span>
                {construction.room !== 'dig' && (
                  <>
                    <span>→</span>
                    <span>
                      {constructionQuote.claim.length} <span>beanspruchen</span>
                    </span>
                    <span>→</span>
                    <span>
                      <Hammer size={13} />
                      {constructionQuote.ready.length} <span>baubereit</span>
                    </span>
                  </>
                )}
              </div>
              <p className="construction-instruction">
                {construction.room === 'dig'
                  ? 'Schürflinge graben erreichbare Felder aus.'
                  : 'Erst graben, dann beanspruchen und bauen. Gold wird je fertigem Feld bezahlt.'}
              </p>
              {constructionQuote.shortfall > 0 && (
                <p className="construction-warning">
                  Fehlendes Gold stoppt nur den Bau. Der Grabungsauftrag bleibt
                  aktiv.
                </p>
              )}
              {!constructionQuote.valid.length && constructionQuote.reason && (
                <p className="construction-warning">
                  {constructionQuote.reason}
                </p>
              )}
              {construction.dragging ? (
                <p className="construction-instruction">
                  Loslassen, um den Bauplan zu setzen.
                </p>
              ) : (
                <div className="construction-actions">
                  <button
                    className="construction-build"
                    disabled={!constructionQuote.canPlan}
                    onClick={buildConstruction}
                  >
                    <Hammer size={16} />
                    <span>Auftrag setzen</span>
                    <kbd>ENTER</kbd>
                  </button>
                  {constructionQuote.existing.length > 0 && (
                    <button
                      className="designation-remove"
                      title="Gesetzte Aufträge in dieser Fläche entfernen"
                      onClick={() => {
                        cancelDesignations(
                          stateRef.current,
                          construction.indices,
                        );
                        updateConstruction(null);
                        refresh();
                        notify('Aufträge entfernt.');
                      }}
                    >
                      <X size={14} />
                      <span>Aufträge löschen</span>
                    </button>
                  )}
                  <button onClick={() => updateConstruction(null)}>
                    <span>Verwerfen</span>
                    <kbd>ESC</kbd>
                  </button>
                </div>
              )}
            </aside>
          )}
          {possessed !== null && (
            <div className="possession-banner">
              <Eye size={18} />
              <span>
                Du siehst durch die Augen eines Bewohners.
                <small>WASD bewegen · Rechte Maustaste ziehen: umsehen</small>
              </span>
              <button onClick={() => sceneRef.current?.possess(null)}>
                Verlassen <kbd>ESC</kbd>
              </button>
            </div>
          )}
          {carrying !== null && (
            <div className="carry-banner">
              <Hand size={18} /> Ziehen und loslassen oder Boden anklicken. ESC:
              zurück.{' '}
              <button onClick={releaseGrab} aria-label="Umsetzen abbrechen">
                <X size={16} />
              </button>
            </div>
          )}
          {selectedUnit && (
            <div className="unit-panel">
              <div className="unit-panel-heading">
                <div>
                  <span className="eyebrow">STUFE {selectedUnit.level}</span>
                  <h3>{selectedUnit.name}</h3>
                </div>
                <button
                  className="icon-button"
                  aria-label="Bewohnerdetails schließen"
                  onClick={() => setSelected(null)}
                >
                  <X size={17} />
                </button>
              </div>
              <p className="unit-state">
                <span className="status-dot" />
                {selectedUnit.state}
              </p>
              {selectedUnit.prisoner && (
                <div className="prisoner-detail">
                  <div className="need">
                    <span>Bekehrung</span>
                    <Progress value={selectedUnit.conversion} />
                    <b>{Math.floor(selectedUnit.conversion)}%</b>
                  </div>
                  <p>
                    Greifen und auf einem freien Folterfeld absetzen. Ab vier
                    Feldern übernimmt ein Runenweber die Bekehrung.
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      changeTool('inspect');
                      pickupResident(selectedUnit.id);
                    }}
                  >
                    <Hand size={15} />
                    Gefangenen greifen
                  </button>
                </div>
              )}
              {!selectedUnit.prisoner &&
                [
                  ['Lebenskraft', (selectedUnit.hp / selectedUnit.maxHp) * 100],
                  ['Sättigung', selectedUnit.hunger],
                  ['Energie', selectedUnit.energy],
                  ['Zufriedenheit', selectedUnit.mood],
                ].map(([name, value]) => (
                  <div className="need" key={name}>
                    <span>{name}</span>
                    <Progress value={Number(value)} />
                    <b>{Math.ceil(Number(value))}%</b>
                  </div>
                ))}
              {selectedUnit.kind !== 'invader' && (
                <div className="unit-buttons">
                  <button
                    onClick={() => {
                      changeTool('inspect');
                      pickupResident(selectedUnit.id);
                    }}
                  >
                    <Hand size={15} /> Greifen
                  </button>
                  <button onClick={() => slapResident(selectedUnit.id)}>
                    <Hand size={15} /> Schlagen
                  </button>
                  <button
                    onClick={() => sceneRef.current?.possess(selectedUnit.id)}
                  >
                    <Eye size={15} /> Übernehmen
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="view-controls">
            <button
              aria-label="Nach links drehen"
              title="Drehen (Q)"
              onClick={() => sceneRef.current?.rotate(0.25)}
            >
              <RotateCcw size={17} />
            </button>
            <button
              aria-label="Nach rechts drehen"
              title="Drehen (E)"
              onClick={() => sceneRef.current?.rotate(-0.25)}
            >
              <RotateCw size={17} />
            </button>
            <i />
            <button
              aria-label="Herauszoomen"
              onClick={() => sceneRef.current?.zoom(2)}
            >
              <Minus size={18} />
            </button>
            <button
              aria-label="Hineinzoomen"
              onClick={() => sceneRef.current?.zoom(-2)}
            >
              <Plus size={18} />
            </button>
            <button
              aria-label="Ansicht zentrieren"
              title="Zentrieren (F)"
              onClick={() => sceneRef.current?.center()}
            >
              <Maximize size={17} />
            </button>
          </div>
          {hoverName && (
            <div className="tile-tooltip">
              <span className="status-dot amber" />
              {hoverName}
              <small>
                {hoverTile!.x} · {hoverTile!.z}
              </small>
              {hoverTile!.gold > 0 && <b>{hoverTile!.gold} G</b>}
            </div>
          )}
          {toast && (
            <div className="toast" role="status">
              <Flame size={17} />
              {toast}
            </div>
          )}
          {webglError && (
            <div className="error-panel" role="alert">
              <h2>3D-Ansicht nicht verfügbar</h2>
              <p>{webglError}</p>
              <button
                className="primary-button"
                onClick={() => window.location.reload()}
              >
                Neu laden
              </button>
            </div>
          )}
          <div className="build-dock">
            <div className="dock-top">
              <Tabs
                value={category}
                onValueChange={(v) => setCategory(String(v))}
              >
                <TabsList className="build-tabs" variant="line">
                  <TabsTrigger value="rooms">
                    <Layers3 /> Räume <small>{ROOM_KEYS.length}</small>
                  </TabsTrigger>
                  <TabsTrigger value="powers">
                    <Sparkles /> Mächte
                  </TabsTrigger>
                  <TabsTrigger value="defense">
                    <Shield /> Verteidigung
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="tool-shortcuts">
                {(['inspect', 'dig', 'rally'] as Tool[]).map((t) => {
                  const m = toolMeta[t],
                    Icon = m.icon;
                  return (
                    <button
                      key={t}
                      className={tool === t ? 'active' : ''}
                      onClick={() => changeTool(t)}
                      title={`${m.name} (${m.key})`}
                      aria-label={m.name}
                    >
                      <Icon size={16} />
                      <span>{m.name}</span>
                      <kbd>{m.key}</kbd>
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className="build-cards"
              aria-label="Räume und Mächte – für weitere Einträge scrollen"
            >
              {items.map((t) => {
                const m = toolMeta[t],
                  Icon = m.icon,
                  locked =
                    !s.unlocked &&
                    [
                      'forge',
                      'bolt',
                      'trap',
                      'door',
                      'torment',
                      'ritual',
                      'ritualBlessing',
                    ].includes(t);
                return (
                  <button
                    key={t}
                    className={`build-card ${tool === t ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                    onClick={() => {
                      if (locked) {
                        notify(
                          'Baue ein Runenarchiv und schließe die Forschung ab.',
                        );
                        return;
                      }
                      changeTool(t);
                    }}
                    aria-pressed={tool === t}
                    aria-disabled={locked}
                    title={m.description}
                    style={
                      {
                        '--room-color':
                          t in ROOMS
                            ? ROOMS[t as Room].color
                            : t === 'heal'
                              ? '#84b297'
                              : '#a48cbd',
                      } as CSSProperties
                    }
                  >
                    <span
                      className={`card-visual ${illustratedRooms.includes(t as Room) ? 'room-art' : ['prison', 'torment', 'ritual'].includes(t) ? 'dark-room-art' : illustratedPowers.includes(t) ? 'power-art' : ''}`}
                      style={
                        ['prison', 'torment', 'ritual'].includes(t)
                          ? {
                              backgroundImage: `url(${import.meta.env.BASE_URL}art/openart/dark-rooms/${t}.webp)`,
                            }
                          : illustratedRooms.includes(t as Room) ||
                              illustratedPowers.includes(t)
                            ? {
                                backgroundPosition: `${((t in ROOMS ? illustratedRooms : illustratedPowers).indexOf(t) % 3) * 50}% ${Math.floor((t in ROOMS ? illustratedRooms : illustratedPowers).indexOf(t) / 3) * 100}%`,
                              }
                            : undefined
                      }
                    >
                      {!(t in ROOMS) && !illustratedPowers.includes(t) && (
                        <Icon strokeWidth={1.2} />
                      )}
                      {locked && (
                        <LockKeyhole className="lock-badge" size={13} />
                      )}
                    </span>
                    <strong>{m.name}</strong>
                    <span className="card-price" title={m.cost}>
                      {t in ROOMS ? (
                        <>
                          <Coins size={11} />
                          {ROOMS[t as Room].cost}
                          <small>/ Feld</small>
                        </>
                      ) : t === 'ritualBlessing' && s.ritualReadyAt > s.time ? (
                        <span>{clock(s.ritualReadyAt - s.time)}</span>
                      ) : t === 'trap' || t === 'door' ? (
                        <>
                          <span className="defence-cost" aria-hidden="true">
                            <Coins size={11} />
                            150 <Hammer size={11} />1
                          </span>
                          <span className="sr-only">{m.cost}</span>
                        </>
                      ) : (
                        m.cost
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="dock-description">
              <div>
                <meta.icon size={15} />
                <strong>{meta.name}</strong>
                <span>{meta.description}</span>
              </div>
              {s.rally !== null ? (
                <button
                  className="text-button"
                  onClick={() => {
                    stateRef.current.rally = null;
                    notify('Sammelbanner aufgelöst.');
                    refresh();
                  }}
                >
                  Banner lösen <X size={13} />
                </button>
              ) : (
                <span className="drag-hint">
                  <Move size={13} />{' '}
                  {isDesignationTool(tool)
                    ? 'Raster ziehen · Nutzung wählen · Enter setzt Auftrag'
                    : 'Ziehen für mehrere Felder'}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
      <footer className="bottom-bar">
        <div className="bottom-left">
          <span className="status-dot amber" />
          <span>
            {started
              ? `Expedition ${clock(s.time)}`
              : 'Bereit, die Tiefe zu erwecken'}
          </span>
          <i />
          <span className="payday">
            <Coins size={13} /> Zahltag in {clock(s.nextPayday - s.time)}
          </span>
        </div>
        <div className="playback">
          <button
            aria-label={
              started && !paused
                ? 'Spiel pausieren'
                : 'Spiel starten oder fortsetzen'
            }
            onClick={() => {
              if (!started) setStarted(true);
              else setPaused(!paused);
            }}
          >
            {started && !paused ? <Pause size={15} /> : <Play size={15} />}
          </button>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              className={speed === n ? 'active' : ''}
              onClick={() => setSpeed(n)}
              aria-label={`${n}-fache Geschwindigkeit`}
            >
              {n}×
            </button>
          ))}
          <kbd>LEERTASTE</kbd>
        </div>
        <div className="footer-actions">
          <button
            className={`audio-button ${audioSettings.musicMuted ? 'muted' : ''}`}
            title={`Musik: ${audioSettings.musicMuted ? 'stumm' : audioSettings.musicVolume + ' %'} – klicken zum Umschalten`}
            aria-label={
              audioSettings.musicMuted
                ? 'Musik einschalten'
                : 'Musik stummschalten'
            }
            onClick={() =>
              updateAudio({ musicMuted: !audioSettings.musicMuted })
            }
          >
            <Music2 size={16} />
          </button>
          <button
            className={`audio-button ${audioSettings.effectsMuted ? 'muted' : ''}`}
            title={`Geräusche: ${audioSettings.effectsMuted ? 'stumm' : audioSettings.effectsVolume + ' %'}`}
            aria-label={
              audioSettings.effectsMuted
                ? 'Geräusche einschalten'
                : 'Geräusche stummschalten'
            }
            onClick={() =>
              updateAudio({ effectsMuted: !audioSettings.effectsMuted })
            }
          >
            {audioSettings.effectsMuted ? (
              <VolumeX size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>
          <button
            onClick={() => saveGame()}
            aria-label="Speichern"
            title="Speichern"
          >
            <Save size={15} />
            <span>Speichern</span>
          </button>
        </div>
      </footer>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent
          className="game-dialog help-dialog"
          closeLabel={translate('Schließen', locale)}
        >
          <DialogHeader>
            <span className="eyebrow">DAS BUCH DER TIEFE</span>
            <DialogTitle>So wächst dein Reich.</DialogTitle>
            <DialogDescription>
              Kluftkrone ist ein eigenständiges Dungeon-Strategiespiel. Deine
              Bewohner handeln selbstständig; du gestaltest ihre Welt.
            </DialogDescription>
          </DialogHeader>
          <div className="manual-grid">
            {[
              {
                icon: Pickaxe,
                title: '01 / Erschließen',
                text: 'Wähle Graben (2) und markiere Erde oder Gold. Ziehen markiert ganze Flächen. Nur erreichbare Flächen werden abgebaut. Schürflinge beanspruchen den Boden danach automatisch.',
              },
              {
                icon: Layers3,
                title: '02 / Errichten',
                text: 'Ziehe mit Graben oder einem Raumwerkzeug ein Raster über bekanntes Erdreich oder freien Boden. Wähle danach Nur graben oder einen Raum und bestätige mit Enter. Schürflinge graben, beanspruchen und bauen selbstständig; Gold wird erst beim Bau je Feld bezahlt. Aufträge bleiben im Spielstand gespeichert. Ruheplätze und mindestens 4 Pilzgarten-Felder ermöglichen neue Bewohner; zwei Ruhefelder bieten einen Platz.',
              },
              {
                icon: Users,
                title: '03 / Versorgen',
                text: 'Bewohner suchen Nahrung und Ruhe selbst. Alle 100 Sekunden ist Zahltag. Schürflinge liefern Gold in die Schatzkammer, deren Felder die Lagerkapazität erhöhen.',
              },
              {
                icon: BookOpen,
                title: '04 / Entwickeln',
                text: 'Training kostet Gold und stärkt Kämpfer. Vier Archivfelder locken einen Runenweber. Seine Forschung erschließt Sturmfunken, Fallen, Pforten und die Werkstatt.',
              },
              {
                icon: Shield,
                title: '05 / Verteidigen',
                text: 'Überstehe vier Angriffswellen und bewahre die Glut. Kämpfer greifen automatisch an. Glutsegen heilt auch die Glut. Das Sammelbanner (4) bündelt Kräfte; danach wieder lösen.',
              },
              {
                icon: Hand,
                title: '06 / Eingreifen',
                text: 'Bewohner direkt anklicken und danach den Zielboden anklicken – oder mit gedrückter Maustaste ziehen und loslassen. Auch unbeanspruchter Boden ist erlaubt. Escape oder Rechtsklick setzt eine getragene Kreatur zurück. Rechtsklick auf einen freien Bewohner schlägt ihn. Porträts öffnen die Bedürfnisse; „Übernehmen“ wechselt in ihre Sicht.',
              },
              {
                icon: LockKeyhole,
                title: '07 / Gefangen nehmen',
                text: 'Baue vor einem Angriff ein Gefängnis. Je zwei Felder halten einen besiegten Sonnenritter; die Zelle muss erreichbar und frei sein. In der Gefangenenliste öffnest du seine Details. Greife ihn und wirf ihn auf ein freies Folterfeld. Belegte Zellen können nicht verkauft werden.',
              },
              {
                icon: Zap,
                title: '08 / Dunkle Künste',
                text: 'Nach der Runenforschung: Baue mindestens vier Folterfelder. Ein Runenweber bekehrt dort Gefangene in 75 Sekunden zu Aschewächtern. Freie Ruheplätze und vier Pilzgartenfelder sind erforderlich. Vier Ritualfelder ermöglichen unter Mächte den Aschensegen für 250 Gold: 60 Sekunden mehr Schaden, Mana und Zufriedenheit; 120 Sekunden Abklingzeit.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <Icon size={22} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="keyboard-legend">
            <span>
              <kbd>WASD</kbd> Karte bewegen
            </span>
            <span>
              <kbd>Q / E</kbd> Drehen
            </span>
            <span>
              <kbd>F</kbd> Zentrieren
            </span>
            <span>
              <kbd>MAUSRAD</kbd> Zoomen
            </span>
            <span>
              <kbd>LEERTASTE</kbd> Pause
            </span>
          </div>
          <p className="manual-note">
            Speicherstände bleiben lokal in diesem Browser. Automatische
            Sicherung alle 30 Sekunden. Desktop und Maus werden empfohlen.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent
          className="game-dialog settings-dialog"
          closeLabel={translate('Schließen', locale)}
        >
          <DialogHeader>
            <span className="eyebrow">DEIN REICH</span>
            <DialogTitle>Einstellungen</DialogTitle>
            <DialogDescription>
              Das Spiel pausiert, während dieses Fenster geöffnet ist.
            </DialogDescription>
          </DialogHeader>
          <div className="audio-channel">
            <div className="audio-heading">
              <strong>
                <Music2 size={17} /> Musik
              </strong>
              <span>
                {audioSettings.musicVolume}%
                <Switch
                  checked={!audioSettings.musicMuted}
                  onCheckedChange={(v) => updateAudio({ musicMuted: !v })}
                  aria-label="Musik ein- oder ausschalten"
                />
              </span>
            </div>
            <Slider
              value={[audioSettings.musicVolume]}
              onValueChange={(v) =>
                updateAudio({ musicVolume: Array.isArray(v) ? v[0] : v })
              }
              min={0}
              max={100}
              step={1}
              aria-label="Musiklautstärke"
            />
            <small>
              Dunkle Klangflächen, ferne Glocken und ein eigener, sich
              wandelnder Soundtrack.
            </small>
          </div>
          <div className="audio-channel">
            <div className="audio-heading">
              <strong>
                <Volume2 size={17} /> Geräusche
              </strong>
              <span>
                {audioSettings.effectsVolume}%
                <Switch
                  checked={!audioSettings.effectsMuted}
                  onCheckedChange={(v) => updateAudio({ effectsMuted: !v })}
                  aria-label="Geräusche ein- oder ausschalten"
                />
              </span>
            </div>
            <Slider
              value={[audioSettings.effectsVolume]}
              onValueChange={(v) =>
                updateAudio({ effectsVolume: Array.isArray(v) ? v[0] : v })
              }
              min={0}
              max={100}
              step={1}
              aria-label="Geräuschlautstärke"
            />
            <small>
              Graben, Gold, Bau, Magie und Kampf. Im Raum verteilt und getrennt
              von der Musik regelbar.
            </small>
          </div>
          <div className="setting-row">
            <span>
              <strong>Spielstand</strong>
              <small>Auf diesem Gerät, in diesem Browser</small>
            </span>
            <span className="status-dot" />
          </div>
          <button className="secondary-button" onClick={() => saveGame()}>
            <Save size={17} /> Reich speichern
          </button>
          <button
            className="secondary-button"
            disabled={!hasSave}
            onClick={loadGame}
          >
            <ArrowDownToLine size={17} /> Reich laden
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              if (!document.fullscreenElement)
                void document.documentElement.requestFullscreen?.();
              else void document.exitFullscreen?.();
            }}
          >
            <Maximize size={17} /> Vollbild
          </button>
          <button
            className="text-button danger-text"
            onClick={() => setNewGameDialog(true)}
          >
            <RotateCcw size={15} /> Neue Expedition beginnen
          </button>
          <p className="credits">
            <span>Karten-Seed</span>: <code>{s.seed}</code>
            <br />
            KLUFTKRONE · Version 1.0
            <br />
            Eigenständiges Spiel mit eigenen Welten, Figuren und Spielwerten.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={newGameDialog} onOpenChange={setNewGameDialog}>
        <DialogContent
          className="game-dialog settings-dialog"
          closeLabel={translate('Schließen', locale)}
        >
          <DialogHeader>
            <span className="eyebrow">EIN NEUER ANFANG</span>
            <DialogTitle>Eine neue Glut entfachen</DialogTitle>
            <DialogDescription>
              Die laufende Expedition wird ersetzt. Speichere sie vorher, wenn
              du sie behalten möchtest.
            </DialogDescription>
          </DialogHeader>
          <label className="difficulty-select">
            Schwierigkeitsgrad
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as GameState['difficulty'])
              }
            >
              <option value="relaxed">Entspannt – mehr Aufbauzeit</option>
              <option value="normal">Standard – ausgewogen</option>
              <option value="hard">Erbarmungslos – frühe Angriffe</option>
            </select>
          </label>
          <button className="primary-button" onClick={startNew}>
            Neue Expedition <ArrowUpRight size={17} />
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={s.status !== 'playing'}>
        <DialogContent
          className="game-dialog result-dialog"
          showCloseButton={false}
        >
          <div className="result-emblem">
            {s.status === 'won' ? <Crown size={50} /> : <Flame size={50} />}
          </div>
          <DialogHeader>
            <span className="eyebrow">EXPEDITION BEENDET</span>
            <DialogTitle>
              {s.status === 'won'
                ? 'Die Tiefe gehört dir.'
                : 'Die Glut ist erloschen.'}
            </DialogTitle>
            <DialogDescription>
              {s.status === 'won'
                ? 'Deine Bewohner haben dem Sonnenmarsch standgehalten. Unter den Aschebergen beginnt eine neue Zeit.'
                : 'Die Sonnenritter haben das Zentrum deines Reichs zerstört. Jede neue Glut birgt eine neue Chance.'}
            </DialogDescription>
          </DialogHeader>
          <div className="result-stats">
            <span>
              <strong>{clock(s.time)}</strong>Zeit
            </span>
            <span>
              <strong>{s.kills}</strong>Besiegte Gegner
            </span>
            <span>
              <strong>{fmt(s.mined)}</strong>Gold gefördert
            </span>
          </div>
          <button className="primary-button" onClick={startNew}>
            Erneut spielen <RotateCcw size={17} />
          </button>
        </DialogContent>
      </Dialog>
    </main>,
    locale,
  );
}
