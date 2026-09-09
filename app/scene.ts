import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createCreatureModels } from './creature-models';
import {
  rectangleIndices,
  quoteDesignation,
  isDesignationTool,
  type ConstructionSelection,
} from './construction';
import {
  SIZE,
  idx,
  inBounds,
  walkable,
  canDropUnit,
  type GameState,
  type Unit,
  type Tool,
  ROOMS,
} from './game';

export interface SceneControls {
  dispose: () => void;
  center: () => void;
  zoom: (n: number) => void;
  rotate: (n: number) => void;
  focus: (x: number, z: number) => void;
  possess: (id: number | null) => void;
  getPossessed: () => number | null;
  cancelDrag: () => void;
  setAccessibleLabel: (label: string) => void;
}
export interface SceneOptions {
  state: () => GameState;
  tool: () => Tool;
  construction: () => ConstructionSelection | null;
  onPreview: (indices: number[] | null) => void;
  canControl: () => boolean;
  onSelect: (i: number, unitId: number | null) => void;
  onGrab: (id: number) => boolean;
  onDrop: (i: number) => void;
  onCancelGrab: () => void;
  onSlap: (id: number) => void;
  onArea: (indices: number[]) => void;
  onHover: (i: number | null) => void;
  onPossession: (id: number | null) => void;
  onError: (message: string) => void;
}
export function mountScene(
  host: HTMLElement,
  options: SceneOptions,
): SceneControls {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#080706');
  scene.fog = new THREE.FogExp2('#0b0907', 0.011);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute(
    'aria-label',
    'Dreidimensionale Dungeon-Karte. Ziehen zum Markieren, rechte Maustaste zum Drehen.',
  );
  renderer.domElement.tabIndex = 0;
  host.appendChild(renderer.domElement);
  const camera = new THREE.OrthographicCamera(-15, 15, 12, -12, 0.1, 150);
  const eye = new THREE.PerspectiveCamera(68, 1, 0.08, 100);
  const target = new THREE.Vector3(13, 0, 14);
  let angle = Math.PI / 4,
    elevation = 1.04,
    scale = 13.5,
    possessed: number | null = null,
    lookAngle = 0,
    lookPitch = 0;
  scene.add(new THREE.HemisphereLight('#b7ada0', '#282016', 1.4));
  const sun = new THREE.DirectionalLight('#eace9d', 2.2);
  sun.position.set(8, 25, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -22,
    right: 22,
    top: 22,
    bottom: -22,
    near: 0.1,
    far: 70,
  });
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(13, 0, 13);
  const rim = new THREE.DirectionalLight('#83968d', 0.65);
  rim.position.set(25, 12, 20);
  scene.add(rim);
  const cube = new RoundedBoxGeometry(1, 1, 1, 1, 0.035),
    slab = new THREE.BoxGeometry(1, 1, 1),
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 8),
    sphere = new THREE.IcosahedronGeometry(1, 1),
    cone = new THREE.ConeGeometry(1, 1, 6),
    octa = new THREE.OctahedronGeometry(1),
    torus = new THREE.TorusGeometry(1, 0.08, 6, 32);
  const textureLoader = new THREE.TextureLoader();
  const surfaceTextures = new Map<string, THREE.Texture>();
  for (const name of ['floor', 'wall', 'earth', 'gold', 'water']) {
    const texture = textureLoader.load(
      import.meta.env.BASE_URL + `art/openart/${name}.webp`,
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    if (name === 'wall') texture.repeat.set(0.33, 0.2);
    if (name === 'earth' || name === 'gold') texture.repeat.set(0.5, 0.34);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    surfaceTextures.set(name, texture);
  }
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: string, emission = 0, metal = 0, surface = '') => {
    const key = color + emission + metal + surface;
    if (!materials.has(key)) {
      const tint = new THREE.Color(color);
      const texture = surfaceTextures.get(surface) ?? null;
      materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color: tint,
          map: texture,
          bumpMap: texture,
          bumpScale: 0.11,
          roughness: metal ? 0.63 : 0.97,
          metalness: metal,
          emissive: color,
          emissiveIntensity: emission,
        }),
      );
    }
    return materials.get(key)!;
  };
  const atlasTextures: THREE.Texture[] = [];
  let reportedAssetError = false;
  const atlasSources = new Map<string, THREE.Texture>();
  const atlasWaiters = new Map<
    string,
    Array<(texture: THREE.Texture) => void>
  >();
  const spriteMaterials = new Map<string, THREE.SpriteMaterial>();
  function atlasMaterial(
    name: string,
    cols: number,
    rows: number,
    col: number,
    row: number,
  ) {
    const key = `${name}:${col}:${row}`;
    if (!spriteMaterials.has(key)) {
      const material = new THREE.SpriteMaterial({
        color: '#ece0cd',
        transparent: true,
        alphaTest: 0.08,
        depthWrite: true,
        fog: true,
        toneMapped: false,
        opacity: 0,
      });
      spriteMaterials.set(key, material);
      const attach = (source: THREE.Texture) => {
        const texture = source.clone();
        texture.repeat.set(1 / cols, 1 / rows);
        texture.offset.set(col / cols, 1 - (row + 1) / rows);
        texture.needsUpdate = true;
        atlasTextures.push(texture);
        material.map = texture;
        material.opacity = 1;
        material.needsUpdate = true;
      };
      let source = atlasSources.get(name);
      if (!source) {
        atlasWaiters.set(name, []);
        source = textureLoader.load(
          import.meta.env.BASE_URL + `art/openart/${name}.webp`,
          (loaded) => {
            atlasWaiters.get(name)?.forEach((callback) => callback(loaded));
            atlasWaiters.delete(name);
          },
          undefined,
          () => {
            if (!reportedAssetError) {
              reportedAssetError = true;
              options.onError(
                'Eine Spielgrafik konnte nicht geladen werden. Bitte lade das Spiel erneut.',
              );
            }
          },
        );
        source.colorSpace = THREE.SRGBColorSpace;
        atlasSources.set(name, source);
      }
      if (source.image && (source.image as HTMLImageElement).naturalWidth > 0)
        attach(source);
      else atlasWaiters.get(name)?.push(attach);
    }
    return spriteMaterials.get(key)!;
  }
  function illustration(
    name: string,
    cols: number,
    rows: number,
    col: number,
    row: number,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    parent: THREE.Object3D,
  ) {
    const sprite = new THREE.Sprite(atlasMaterial(name, cols, rows, col, row));
    sprite.center.set(0.5, 0.05);
    sprite.position.set(x, y, z);
    sprite.scale.set(width, height, 1);
    parent.add(sprite);
    return sprite;
  }
  const shadowGeometry = new THREE.CircleGeometry(1, 24);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: '#070503',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  function contactShadow(
    x: number,
    z: number,
    width: number,
    parent: THREE.Object3D,
  ) {
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.085, z);
    shadow.scale.set(width, width * 0.65, 1);
    parent.add(shadow);
  }
  const furnishings = new THREE.Group();
  scene.add(furnishings);
  const terrain = new THREE.Group();
  scene.add(terrain);
  const props = new THREE.Group();
  scene.add(props);
  const creatures = new THREE.Group();
  scene.add(creatures);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(SIZE + 1, 1.3, SIZE + 1),
    mat('#171c21'),
  );
  base.position.set(13, -0.75, 13);
  base.receiveShadow = true;
  scene.add(base);
  const buckets = new Map<
    string,
    {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      matrices: THREE.Matrix4[];
    }
  >();
  const dummy = new THREE.Object3D();
  function add(
    g: THREE.BufferGeometry,
    c: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rot = 0,
    emission = 0,
    metal = 0,
    surface = '',
  ) {
    const key = g.uuid + c + emission + metal + surface;
    if (!buckets.has(key))
      buckets.set(key, {
        geometry: g,
        material: mat(c, emission, metal, surface),
        matrices: [],
      });
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, rot, 0);
    dummy.updateMatrix();
    buckets.get(key)!.matrices.push(dummy.matrix.clone());
  }
  function seeded(x: number, z: number, k = 0) {
    const n = Math.sin(x * 127.1 + z * 311.7 + k * 73.9) * 43758.5453123;
    return n - Math.floor(n);
  }
  const torchLights = Array.from({ length: 5 }, () => {
    const light = new THREE.PointLight('#f59b3c', 0, 4.8, 2);
    scene.add(light);
    return light;
  });
  const torchPositions: THREE.Vector3[] = [];
  function darkRoomFixtures(room: string, x: number, z: number) {
    const bronze = '#876445',
      stone = '#383138',
      iron = '#42474f';
    if (room === 'prison') {
      // An open front keeps the bound creature visible and easy to pick up.
      for (const dx of [-0.4, 0.4]) {
        add(
          cube,
          stone,
          x + dx,
          0.43,
          z - 0.38,
          0.13,
          0.8,
          0.13,
          0,
          0,
          0,
          'wall',
        );
        add(cone, bronze, x + dx, 0.9, z - 0.38, 0.12, 0.18, 0.12, 0, 0, 0.65);
      }
      for (let j = -2; j <= 2; j++)
        add(
          cylinder,
          iron,
          x + j * 0.13,
          0.47,
          z - 0.38,
          0.028,
          0.75,
          0.028,
          0,
          0,
          0.7,
        );
      add(cube, bronze, x, 0.78, z - 0.38, 0.87, 0.055, 0.06, 0, 0, 0.7);
      add(octa, '#b694e8', x - 0.4, 0.63, z - 0.25, 0.08, 0.13, 0.08, 0, 1);
      add(cylinder, '#59496c', x, 0.08, z, 0.35, 0.03, 0.35, 0, 0.2);
    } else if (room === 'torment') {
      add(cylinder, stone, x, 0.12, z, 0.43, 0.14, 0.43, 0, 0, 0.2);
      add(cube, stone, x, 0.27, z - 0.14, 0.34, 0.23, 0.34, 0, 0, 0, 'wall');
      add(cube, stone, x, 0.6, z - 0.34, 0.35, 0.72, 0.08, 0, 0, 0, 'wall');
      add(cube, '#d9a476', x, 0.62, z - 0.29, 0.025, 0.52, 0.025, 0, 0.6, 0.3);
      for (const dx of [-0.3, 0.3]) {
        add(
          cylinder,
          bronze,
          x + dx,
          0.46,
          z - 0.1,
          0.03,
          0.68,
          0.03,
          0,
          0,
          0.8,
        );
        add(
          octa,
          '#c278de',
          x + dx,
          0.91,
          z - 0.1,
          0.09,
          0.22,
          0.09,
          dx * 2,
          0.9,
          0.25,
        );
        add(cube, bronze, x + dx * 0.7, 0.36, z, 0.06, 0.08, 0.38, 0, 0, 0.6);
        for (let k = 0; k < 4; k++)
          add(
            torus,
            iron,
            x + dx,
            0.24 + k * 0.075,
            z + 0.16,
            0.035,
            0.05,
            0.035,
            ((k % 2) * Math.PI) / 2,
            0,
            0.7,
          );
      }
    } else if (room === 'ritual') {
      add(cylinder, stone, x, 0.11, z, 0.44, 0.1, 0.44, 0, 0, 0.1);
      add(cylinder, '#d89a50', x, 0.168, z, 0.35, 0.015, 0.35, 0, 0.6);
      add(cylinder, stone, x, 0.18, z, 0.32, 0.02, 0.32);
      for (const dx of [-0.33, 0.33]) {
        add(
          cube,
          stone,
          x + dx,
          0.46,
          z - 0.26,
          0.12,
          0.64,
          0.14,
          0.12,
          0,
          0,
          'wall',
        );
        add(cone, stone, x + dx, 0.87, z - 0.26, 0.14, 0.2, 0.16);
        add(octa, '#edbd73', x + dx, 0.67, z - 0.17, 0.035, 0.09, 0.03, 0, 1.1);
      }
      add(cylinder, bronze, x, 0.23, z, 0.12, 0.11, 0.12, 0, 0, 0.6);
      add(octa, '#ffb750', x, 0.37, z, 0.09, 0.2, 0.09, 0, 1.2);
      torchPositions.push(new THREE.Vector3(x, 0.8, z));
    }
  }
  let revision = -1;
  let renderedState: GameState | null = null;
  function rebuild() {
    const s = options.state();
    revision = s.revision;
    terrain.children.forEach((o) => {
      if (o instanceof THREE.InstancedMesh) o.dispose();
    });
    terrain.clear();
    furnishings.clear();
    torchPositions.length = 0;
    buckets.clear();
    for (const t of s.tiles) {
      const { x, z } = t;
      const r = seeded(x, z);
      const isWall = !walkable(t) && t.kind !== 'water';
      if (isWall) {
        const exposed = [
          [x - 1, z],
          [x + 1, z],
          [x, z - 1],
          [x, z + 1],
        ].some(([a, b]) => inBounds(a, b) && walkable(s.tiles[idx(a, b)]));
        const h = t.kind === 'rock' ? 1.6 + r * 0.2 : 1.18 + r * 0.18;
        const surface =
          t.kind === 'gold' ? 'gold' : t.kind === 'rock' ? 'wall' : 'earth';
        const color = t.seen
          ? t.kind === 'gold'
            ? '#e7bd72'
            : '#b0a58f'
          : '#25231e';
        // Dark mortar sits behind separate worn courses, breaking the perfect cube silhouette.
        add(cube, '#17140f', x, h / 2 - 0.12, z, 0.995, h, 0.995);
        if (t.seen) {
          if (exposed) {
            for (let row = 0; row < 3; row++) {
              for (let col = 0; col < 2; col++) {
                const j = row * 2 + col;
                add(
                  cube,
                  color,
                  x + (col - 0.5) * 0.496,
                  (h * (row + 0.5)) / 3 - 0.1,
                  z,
                  0.487,
                  h / 3 - 0.028,
                  1.01 + seeded(x, z, j) * 0.025,
                  (seeded(x, z, j + 9) - 0.5) * 0.025,
                  0,
                  0,
                  surface,
                );
              }
            }
          } else {
            add(
              cube,
              color,
              x,
              h / 2 - 0.1,
              z,
              0.985,
              h,
              0.985,
              0,
              0,
              0,
              surface,
            );
          }
          add(
            cube,
            '#9d917b',
            x,
            h - 0.035,
            z,
            1.035,
            0.15,
            1.035,
            r * 0.025,
            0,
            0,
            surface,
          );
          if (t.kind === 'gold')
            for (let j = 0; j < 4; j++)
              add(
                octa,
                j % 2 ? '#e3b55d' : '#9d7037',
                x + (seeded(x, z, j + 3) - 0.5) * 0.67,
                h + 0.02 + seeded(x, z, j + 2) * 0.13,
                z + (seeded(x, z, j + 8) - 0.5) * 0.67,
                0.12,
                0.22,
                0.1,
                r * 4,
                0.12,
                0.65,
              );
          if (r > 0.83 && t.kind !== 'gold')
            add(
              sphere,
              '#696662',
              x + 0.15,
              h + 0.07,
              z - 0.16,
              0.22,
              0.1,
              0.17,
              r * 3,
            );
        }
      } else if (t.kind === 'water') {
        add(
          cube,
          '#659e98',
          x,
          -0.05,
          z,
          0.999,
          0.1,
          0.999,
          0,
          0.08,
          0.4,
          'water',
        );
        if (r > 0.8) add(octa, '#69aa9c', x, 0.14, z, 0.09, 0.2, 0.1, 0, 0.7);
      } else {
        const color = t.room
          ? ROOMS[t.room].color
          : t.owned
            ? '#aba18a'
            : '#797566';
        add(slab, '#211d16', x, -0.08, z, 0.995, 0.16, 0.995);
        // The generated texture supplies small cobbles within each continuous floor field.
        const tint = new THREE.Color(color)
          .lerp(new THREE.Color('#b0a28b'), t.room ? 0.58 : 0.12)
          .multiplyScalar(0.88 + Math.floor(seeded(x, z, 7) * 3) * 0.07);
        add(
          slab,
          '#' + tint.getHexString(),
          x,
          0.015,
          z,
          0.995,
          0.08,
          0.995,
          0,
          0,
          0,
          'floor',
        );
        if (t.room) {
          const rc = ROOMS[t.room].color;
          // Ornament only the room perimeter, so adjacent fields form a room rather than trays.
          for (const [dx, dz] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]) {
            const n = inBounds(x + dx, z + dz)
              ? s.tiles[idx(x + dx, z + dz)]
              : null;
            if (n?.room === t.room) continue;
            add(
              cube,
              rc,
              x + dx * 0.46,
              0.075,
              z + dz * 0.46,
              dx ? 0.045 : 0.94,
              0.06,
              dz ? 0.045 : 0.94,
              0,
              0,
              0.2,
            );
          }
          const roomIndex = [
            'vault',
            'rest',
            'food',
            'training',
            'library',
            'forge',
          ].indexOf(t.room);
          if (roomIndex < 0) darkRoomFixtures(t.room, x, z);
          // Gaps leave walking space and keep dense rooms legible when creatures move through them.
          if (
            roomIndex >= 0 &&
            ((x + z) % 2 === 0 ||
              t.room === 'food' ||
              ![
                [x - 1, z],
                [x + 1, z],
                [x, z - 1],
                [x, z + 1],
              ].some(
                ([nx, nz]) =>
                  inBounds(nx, nz) && s.tiles[idx(nx, nz)].room === t.room,
              ))
          ) {
            const size = 0.88 + r * 0.15;
            contactShadow(x, z, 0.38, furnishings);
            illustration(
              'room-atlas',
              3,
              2,
              roomIndex % 3,
              Math.floor(roomIndex / 3),
              x,
              0.07,
              z,
              size,
              size,
              furnishings,
            );
          }
        } else if (r > 0.85 && t.kind === 'floor') {
          add(cube, '#383e3c', x + 0.27, 0.067, z - 0.23, 0.15, 0.035, 0.19, r);
        }
        if (t.trap) {
          illustration(
            'monuments',
            4,
            1,
            3,
            0,
            x,
            0.09,
            z,
            0.85,
            0.85,
            furnishings,
          );
        }
        if (t.door) {
          illustration(
            'monuments',
            4,
            1,
            2,
            0,
            x,
            0.08,
            z,
            1.35,
            1.6,
            furnishings,
          );
        }
      }
      // Brass fire bowls along the excavated boundary.
      if (
        t.seen &&
        isWall &&
        r > 0.48 &&
        r < 0.66 &&
        [
          [x - 1, z],
          [x + 1, z],
          [x, z - 1],
          [x, z + 1],
        ].some(([a, b]) => inBounds(a, b) && s.tiles[idx(a, b)].owned)
      ) {
        torchPositions.push(new THREE.Vector3(x, 1.65, z));
        add(cylinder, '#80735b', x, 1.43, z, 0.12, 0.28, 0.12, 0, 0, 0.5);
        add(cone, '#ffb252', x, 1.68, z, 0.095, 0.32, 0.095, 0, 2);
        add(octa, '#ffe4a3', x, 1.63, z, 0.07, 0.15, 0.07, 0, 3);
      }
    }
    for (const b of buckets.values()) {
      const mesh = new THREE.InstancedMesh(
        b.geometry,
        b.material,
        b.matrices.length,
      );
      b.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      terrain.add(mesh);
    }
  }
  function mesh(
    g: THREE.BufferGeometry,
    c: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: THREE.Object3D = props,
    e = 0,
    metal = 0,
  ) {
    const m = new THREE.Mesh(g, mat(c, e, metal));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  // Unique landmarks: a mineral furnace and a fractured stone passage.
  contactShadow(13, 14, 1.4, props);
  const crystal = illustration(
    'monuments',
    4,
    1,
    0,
    0,
    13,
    0.08,
    14,
    3.15,
    3.15,
    props,
  );
  const coreLight = new THREE.PointLight('#ffab44', 22, 8, 1.7);
  coreLight.position.set(13, 1.8, 14);
  scene.add(coreLight);
  contactShadow(13, 8, 0.85, props);
  const gate = illustration(
    'monuments',
    4,
    1,
    1,
    0,
    13,
    0.08,
    8,
    2.2,
    2.5,
    props,
  );
  const portalLight = new THREE.PointLight('#58d4b9', 10, 6, 2);
  portalLight.position.set(13, 1.5, 8);
  scene.add(portalLight);
  for (const [x, z] of [
    [8, 13],
    [12, 19],
    [16, 19],
  ]) {
    const light = new THREE.PointLight(
      z === 13 ? '#edbd66' : x === 12 ? '#b5a1d7' : '#78d29a',
      5,
      5,
      2,
    );
    light.position.set(x, 2, z);
    scene.add(light);
  }
  // Dust gives depth without obscuring the game board.
  const dustGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(150 * 3);
  for (let i = 0; i < 150; i++) {
    positions[i * 3] = seeded(i, 1) * 27;
    positions[i * 3 + 1] = seeded(i, 2) * 5;
    positions[i * 3 + 2] = seeded(i, 3) * 27;
  }
  dustGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3),
  );
  const dustMaterial = new THREE.PointsMaterial({
    color: '#caac73',
    size: 0.028,
    transparent: true,
    opacity: 0.45,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);
  const unitObjects = new Map<number, THREE.Group>();
  const creatureModels = createCreatureModels();
  function makeUnit(u: Unit) {
    const g = new THREE.Group();
    const rig = creatureModels.create(u.kind);
    const model = rig.root;
    model.traverse((part) => {
      part.userData.unitId = u.id;
    });
    g.add(model);
    contactShadow(0, 0, u.kind === 'brute' ? 0.42 : 0.26, g);
    const bar = new THREE.Group();
    const bg = mesh(
      cube,
      '#141d22',
      0,
      rig.height + 0.16,
      0,
      0.53,
      0.047,
      0.025,
      bar,
    );
    bg.castShadow = false;
    const hp = mesh(
      cube,
      u.prisoner ? '#bb92e2' : u.kind === 'invader' ? '#d97d63' : '#76b69b',
      0,
      rig.height + 0.16,
      0.02,
      0.5,
      0.026,
      0.022,
      bar,
    );
    hp.castShadow = false;
    g.add(bar);
    g.position.set(u.x, 0, u.z);
    g.userData = {
      kind: u.kind,
      prisoner: u.prisoner,
      model,
      rig,
      direction: Math.PI / 4,
      speed: 0,
      lastHp: u.hp,
      hitUntil: 0,
      bar,
      hp,
      previous: new THREE.Vector3(u.x, 0, u.z),
    };
    model.rotation.y = Math.PI / 4;
    creatures.add(g);
    unitObjects.set(u.id, g);
    return g;
  }
  const markerGeo = new THREE.BoxGeometry(0.97, 0.035, 0.97);
  const planMaterial = new THREE.MeshBasicMaterial({
    vertexColors: false,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    toneMapped: false,
  });
  const planTiles = new THREE.InstancedMesh(
    markerGeo,
    planMaterial,
    SIZE * SIZE,
  );
  planTiles.count = 0;
  planTiles.frustumCulled = false;
  planTiles.renderOrder = 3;
  scene.add(planTiles);
  const planLineGeometry = new THREE.BufferGeometry();
  const planLinePositions = new Float32Array(SIZE * SIZE * 16 * 3);
  const planLineColors = new Float32Array(planLinePositions.length);
  planLineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(planLinePositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  planLineGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(planLineColors, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  planLineGeometry.setDrawRange(0, 0);
  const planLineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    toneMapped: false,
  });
  const planLines = new THREE.LineSegments(planLineGeometry, planLineMaterial);
  planLines.frustumCulled = false;
  planLines.renderOrder = 4;
  scene.add(planLines);
  const invalidPlanColor = new THREE.Color('#ed7666');
  const gridColor = new THREE.Color('#485048');
  const digColor = new THREE.Color('#edc57a');
  const roomPlanColors = new Map(
    Object.entries(ROOMS).map(([key, room]) => [
      key,
      new THREE.Color(room.color).lerp(new THREE.Color('#e4ecd8'), 0.25),
    ]),
  );
  const hover = new THREE.Mesh(
    new THREE.BoxGeometry(1.01, 0.04, 1.01),
    new THREE.MeshBasicMaterial({
      color: '#f8d386',
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  scene.add(hover);
  hover.visible = false;
  const rallyMarker = mesh(
    cone,
    '#efbb64',
    0,
    1.5,
    0,
    0.2,
    0.42,
    0.2,
    scene,
    1,
  );
  rallyMarker.visible = false;
  const effectCanvas = document.createElement('canvas');
  effectCanvas.width = effectCanvas.height = 64;
  const effectContext = effectCanvas.getContext('2d')!;
  const glow = effectContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.18, '#ffffffcc');
  glow.addColorStop(0.5, '#ffffff35');
  glow.addColorStop(1, '#ffffff00');
  effectContext.fillStyle = glow;
  effectContext.fillRect(0, 0, 64, 64);
  const effectTexture = new THREE.CanvasTexture(effectCanvas);
  const effectObjects: THREE.Sprite[] = [];
  const raycaster = new THREE.Raycaster(),
    mouse = new THREE.Vector2(),
    ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let hovered: number | null = null,
    dragStart: number | null = null,
    dragEnd: number | null = null,
    rightDown = false,
    lastX = 0,
    lastY = 0,
    dragMoved = false;
  let handGesture: 'grab' | 'drop' | null = null;
  let slapCandidate: number | null = null;
  let rightMoved = false;
  const keys = new Set<string>();
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    const aspect = w / h;
    camera.left = (-scale * aspect) / 2;
    camera.right = (scale * aspect) / 2;
    camera.top = scale / 2;
    camera.bottom = -scale / 2;
    camera.updateProjectionMatrix();
    eye.aspect = aspect;
    eye.updateProjectionMatrix();
  }
  function updateCamera() {
    camera.position.set(
      target.x + Math.sin(angle) * 30,
      target.y + 30 * elevation,
      target.z + Math.cos(angle) * 30,
    );
    camera.lookAt(target);
  }
  function pick(e: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouse, possessed === null ? camera : eye);
    const point = new THREE.Vector3();
    // Pick the visible rock surface, not the ground hidden behind a raised wall.
    const surface = raycaster.intersectObject(terrain, true)[0];
    if (surface)
      point.copy(surface.point).addScaledVector(raycaster.ray.direction, 0.015);
    else if (!raycaster.ray.intersectPlane(ground, point)) return null;
    const x = Math.round(point.x),
      z = Math.round(point.z);
    return inBounds(x, z) ? idx(x, z) : null;
  }
  const liftPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -3.2);
  const liftPoint = new THREE.Vector3();
  function area() {
    return rectangleIndices(dragStart, dragEnd);
  }
  function cancelDrag() {
    dragStart = dragEnd = null;
    dragMoved = false;
    handGesture = null;
    rightDown = false;
    rightMoved = false;
    slapCandidate = null;
  }
  function pickUnit() {
    const candidates: THREE.Object3D[] = [];
    for (const [id, group] of unitObjects) {
      if (group.visible && id !== options.state().heldUnitId)
        candidates.push(group.userData.model);
    }
    const hit = raycaster.intersectObjects(candidates, true)[0];
    const wall = hit ? raycaster.intersectObject(terrain, true)[0] : null;
    if (!hit || (wall && hit.distance > wall.distance + 0.05)) return null;
    return (
      options.state().units.find((u) => u.id === hit.object.userData.unitId) ??
      null
    );
  }
  function onDown(e: PointerEvent) {
    renderer.domElement.focus();
    if (e.button === 2 || e.button === 1) {
      if (options.state().heldUnitId !== null) options.onCancelGrab();
      else {
        rightDown = true;
        renderer.domElement.setPointerCapture(e.pointerId);
        rightMoved = false;
        pick(e);
        slapCandidate =
          e.button === 2 && possessed === null
            ? (pickUnit()?.id ?? null)
            : null;
        lastX = e.clientX;
        lastY = e.clientY;
      }
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    dragStart = pick(e);
    dragEnd = dragStart;
    dragMoved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
    if (options.state().heldUnitId !== null) handGesture = 'drop';
    else if (
      possessed === null &&
      (options.tool() === 'inspect' || isDesignationTool(options.tool()))
    ) {
      const unit = pickUnit();
      if (unit && options.onGrab(unit.id)) handGesture = 'grab';
    }
    if (!handGesture && isDesignationTool(options.tool()) && dragStart !== null)
      options.onPreview(area());
  }
  function onMove(e: PointerEvent) {
    if (rightDown) {
      if (!rightMoved && Math.hypot(e.clientX - lastX, e.clientY - lastY) <= 5)
        return;
      rightMoved = true;
      if (possessed !== null) {
        lookAngle -= (e.clientX - lastX) * 0.009;
        lookPitch = Math.max(
          -0.9,
          Math.min(0.9, lookPitch - (e.clientY - lastY) * 0.006),
        );
      } else {
        angle -= (e.clientX - lastX) * 0.007;
        elevation = Math.max(
          0.45,
          Math.min(1.6, elevation + (e.clientY - lastY) * 0.005),
        );
      }
      lastX = e.clientX;
      lastY = e.clientY;
      return;
    }
    const p = pick(e);
    if (p !== hovered) {
      hovered = p;
      options.onHover(p);
    }
    if (dragStart !== null || handGesture) {
      if (p !== null && dragEnd !== p) {
        dragEnd = p;
        if (!handGesture && isDesignationTool(options.tool()))
          options.onPreview(area());
      }
      dragMoved ||= Math.hypot(e.clientX - lastX, e.clientY - lastY) > 5;
    }
  }
  function onUp(e: PointerEvent) {
    if (e.button !== 0) {
      if (e.button === 2 && rightDown && !rightMoved && slapCandidate !== null)
        options.onSlap(slapCandidate);
      rightDown = false;
      slapCandidate = null;
      if (renderer.domElement.hasPointerCapture(e.pointerId))
        renderer.domElement.releasePointerCapture(e.pointerId);
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom &&
      document.elementFromPoint(e.clientX, e.clientY) === renderer.domElement;
    const end = inside ? pick(e) : null;
    const tool = options.tool();
    if (handGesture) {
      if ((handGesture === 'drop' || dragMoved) && end !== null)
        options.onDrop(end);
      // Outside the viewport or over invalid terrain: keep the resident safely in hand.
    } else if (end !== null && dragStart !== null) {
      dragEnd = end;
      if (dragMoved && !['inspect', 'heal', 'bolt', 'rally'].includes(tool))
        options.onArea(area());
      else {
        const unit = pickUnit();
        const tile =
          unit && tool === 'inspect'
            ? idx(Math.round(unit.x), Math.round(unit.z))
            : end;
        options.onSelect(tile, unit?.id ?? null);
      }
    }
    if (end === null && !handGesture && isDesignationTool(tool))
      options.onPreview(null);
    cancelDrag();
    if (renderer.domElement.hasPointerCapture(e.pointerId))
      renderer.domElement.releasePointerCapture(e.pointerId);
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    scale = Math.max(7, Math.min(35, scale + Math.sign(e.deltaY) * 1.1));
    resize();
  }
  function onContext(e: Event) {
    e.preventDefault();
  }
  function onKey(e: KeyboardEvent) {
    if (
      ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(
        (e.target as HTMLElement).tagName,
      )
    )
      return;
    if (e.key === 'Escape') cancelDrag();
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'w',
        'a',
        's',
        'd',
        'q',
        'e',
      ].includes(e.key.toLowerCase()) ||
      e.key.startsWith('Arrow')
    ) {
      keys.add(e.key.toLowerCase());
      e.preventDefault();
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.key.toLowerCase());
  }
  function blur() {
    keys.clear();
    rightDown = false;
    if (options.state().heldUnitId !== null) options.onCancelGrab();
    if (dragStart !== null && isDesignationTool(options.tool()))
      options.onPreview(null);
    cancelDrag();
  }
  const el = renderer.domElement;
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', blur);
  el.addEventListener('contextmenu', onContext);
  el.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', blur);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  updateCamera();
  let frame = 0,
    last = performance.now(),
    disposed = false;
  function render(now: number) {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = now / 1000,
      s = options.state();
    if (s !== renderedState) {
      creatures.clear();
      unitObjects.clear();
      renderedState = s;
      rebuild();
    } else if (s.revision !== revision) rebuild();
    if (possessed === null) {
      const forward =
          (keys.has('w') || keys.has('arrowup') ? 1 : 0) -
          (keys.has('s') || keys.has('arrowdown') ? 1 : 0),
        side =
          (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
          (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      target.x +=
        dt * 7 * (-Math.sin(angle) * forward + Math.cos(angle) * side);
      target.z +=
        dt * 7 * (-Math.cos(angle) * forward - Math.sin(angle) * side);
      target.x = THREE.MathUtils.clamp(target.x, 0, 26);
      target.z = THREE.MathUtils.clamp(target.z, 0, 26);
      if (keys.has('q')) angle += dt;
      if (keys.has('e')) angle -= dt;
      updateCamera();
    } else {
      const u = s.units.find((u) => u.id === possessed);
      if (!u) {
        possessed = null;
        options.onPossession(null);
      } else {
        let dx = 0,
          dz = 0;
        if (keys.has('w') || keys.has('arrowup')) {
          dx -= Math.sin(lookAngle);
          dz -= Math.cos(lookAngle);
        }
        if (keys.has('s') || keys.has('arrowdown')) {
          dx += Math.sin(lookAngle);
          dz += Math.cos(lookAngle);
        }
        if (keys.has('a')) {
          dx -= Math.cos(lookAngle);
          dz += Math.sin(lookAngle);
        }
        if (keys.has('d')) {
          dx += Math.cos(lookAngle);
          dz -= Math.sin(lookAngle);
        }
        const nx = u.x + dx * dt * 2.5,
          nz = u.z + dz * dt * 2.5;
        if (
          options.canControl() &&
          inBounds(Math.round(nx), Math.round(nz)) &&
          walkable(s.tiles[idx(Math.round(nx), Math.round(nz))])
        ) {
          u.x = nx;
          u.z = nz;
          u.path = [];
          u.target = null;
          u.state = 'Direkt gesteuert';
        }
        eye.position.set(u.x, 0.83, u.z);
        eye.rotation.set(lookPitch, lookAngle, 0, 'YXZ');
      }
    }
    crystal.scale.setScalar(3.15 + Math.sin(time * 1.3) * 0.015);
    coreLight.intensity = 25 + Math.sin(time * 3) * 2;
    if (gate.material.map)
      gate.material.opacity = 0.94 + Math.sin(time * 1.7) * 0.06;
    dust.rotation.y = Math.sin(time * 0.025) * 0.01;
    const lightFocus = possessed === null ? target : eye.position;
    const nearbyTorches = [...torchPositions].sort(
      (a, b) =>
        a.distanceToSquared(lightFocus) - b.distanceToSquared(lightFocus),
    );
    const water = surfaceTextures.get('water');
    if (water) {
      water.offset.set(Math.sin(time * 0.05) * 0.035, time * 0.005);
    }
    torchLights.forEach((light, i) => {
      const position = nearbyTorches[i];
      light.intensity = position
        ? 6 + Math.sin(time * 7 + i * 2) * 0.8 + Math.sin(time * 13 + i) * 0.4
        : 0;
      if (position) light.position.copy(position);
    });
    const alive = new Set(s.units.map((u) => u.id));
    for (const [id, g] of unitObjects)
      if (!alive.has(id)) {
        creatures.remove(g);
        unitObjects.delete(id);
      }
    for (const u of s.units) {
      const previousModel = unitObjects.get(u.id);
      if (
        previousModel &&
        (previousModel.userData.kind !== u.kind ||
          previousModel.userData.prisoner !== u.prisoner)
      ) {
        creatures.remove(previousModel);
        unitObjects.delete(u.id);
      }
      const g = unitObjects.get(u.id) ?? makeUnit(u);
      g.userData.model.rotation.x = u.prisoner ? 0.14 : 0;
      g.visible = u.id !== possessed;
      const prev = g.userData.previous as THREE.Vector3;
      if (u.id === s.heldUnitId) {
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(liftPlane, liftPoint)) {
          g.position.copy(liftPoint);
          g.position.y -= g.userData.rig.height;
        }
        g.userData.wasHeld = true;
        g.userData.model.rotation.y = angle + Math.PI;
        g.userData.model.rotation.z = Math.sin(time * 4) * 0.13;
        g.userData.rig.animate(
          time + u.id * 0.73,
          0,
          'In der Hand',
          u.hp / u.maxHp,
        );
        g.userData.bar.visible = false;
        // Contact shadows belong on the dungeon floor, never beneath a dangling model.
        for (const child of g.children)
          if (child !== g.userData.model) child.visible = false;
        prev.set(u.x, 0, u.z);
        continue;
      }
      if (g.userData.wasHeld) {
        g.userData.wasHeld = false;
        g.userData.throwOrigin = g.position.clone();
        g.userData.throwStart = time;
        for (const child of g.children) child.visible = true;
      }
      const distance = Math.hypot(u.x - prev.x, u.z - prev.z);
      if (distance > 0.002)
        g.userData.direction = Math.atan2(u.x - prev.x, u.z - prev.z);
      else if (
        u.target !== null &&
        /Gräbt|Baut Gold|Kampf|Trainiert|Schmiedet/.test(u.state)
      ) {
        const destination = s.tiles[u.target];
        if (
          destination &&
          Math.hypot(destination.x - u.x, destination.z - u.z) > 0.1
        )
          g.userData.direction = Math.atan2(
            destination.x - u.x,
            destination.z - u.z,
          );
      }
      const flight = g.userData.throwOrigin
        ? Math.min(
            1,
            Math.max(
              (time - g.userData.throwStart) / 0.4,
              1 - u.dropTimer / 0.45,
            ),
          )
        : 1;
      if (flight < 1) {
        g.position
          .copy(g.userData.throwOrigin)
          .lerp(new THREE.Vector3(u.x, 0, u.z), flight);
        g.position.y += Math.sin(flight * Math.PI) * 0.8;
      } else if (distance > 2) g.position.set(u.x, 0, u.z);
      else {
        g.position.x = THREE.MathUtils.damp(g.position.x, u.x, 24, dt);
        g.position.z = THREE.MathUtils.damp(g.position.z, u.z, 24, dt);
      }
      if (flight >= 1) {
        g.position.y = 0;
        g.userData.throwOrigin = null;
      }
      g.userData.speed = THREE.MathUtils.damp(
        g.userData.speed,
        Math.min(6, distance / Math.max(dt, 0.001)),
        10,
        dt,
      );
      const yaw = g.userData.model.rotation.y;
      const turn = Math.atan2(
        Math.sin(g.userData.direction - yaw),
        Math.cos(g.userData.direction - yaw),
      );
      g.userData.model.rotation.y += turn * (1 - Math.exp(-dt * 13));
      g.userData.rig.animate(
        s.time + u.id * 0.73,
        g.userData.speed,
        u.state,
        u.hp / u.maxHp,
      );
      if (u.hp < g.userData.lastHp) g.userData.hitUntil = time + 0.3;
      g.userData.lastHp = u.hp;
      const recoil = Math.max(0, g.userData.hitUntil - time) / 0.3;
      g.userData.model.rotation.z =
        Math.sin(recoil * Math.PI * 3) * recoil * 0.12;
      g.userData.bar.rotation.copy(
        (possessed === null ? camera : eye).rotation,
      );
      g.userData.hp.scale.x = 0.5 * Math.max(0, u.hp / u.maxHp);
      g.userData.bar.visible = u.hp < u.maxHp || u.kind === 'invader';
      prev.set(u.x, 0, u.z);
    }
    const plan = options.construction();
    const quote = plan ? quoteDesignation(s, plan.room, plan.indices) : null;
    const preview = new Set(quote?.selected ?? []),
      valid = new Set(quote?.valid ?? []);
    const planning = s.heldUnitId === null && isDesignationTool(options.tool());
    let planCount = 0,
      lineVertex = 0;
    const line = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
      color: THREE.Color,
    ) => {
      planLinePositions.set([ax, ay, az, bx, by, bz], lineVertex * 3);
      for (let n = 0; n < 2; n++) {
        planLineColors.set([color.r, color.g, color.b], lineVertex * 3);
        lineVertex++;
      }
    };
    // One pass means draft and saved orders never overflow the SIZE² instance budget.
    if (possessed === null)
      for (const t of s.tiles) {
        const i = idx(t.x, t.z),
          drafted = preview.has(i),
          ordered = !!t.plannedRoom || t.marked;
        if (!drafted && !ordered && !(planning && t.seen)) continue;
        const room = drafted ? plan!.room : t.plannedRoom;
        const blocked = drafted && !valid.has(i);
        const color = blocked
          ? invalidPlanColor
          : drafted || ordered
            ? room && room !== 'dig'
              ? roomPlanColors.get(room)!
              : digColor
            : gridColor;
        const x = t.x,
          z = t.z,
          y = walkable(t) ? 0.12 : 1.48,
          d = 0.47,
          ly = y + 0.025;
        if (drafted || ordered) {
          dummy.position.set(x, y, z);
          dummy.scale.set(1, 1, 1);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          planTiles.setMatrixAt(planCount, dummy.matrix);
          planTiles.setColorAt(planCount++, color);
        }
        line(x - d, ly, z - d, x + d, ly, z - d, color);
        line(x + d, ly, z - d, x + d, ly, z + d, color);
        line(x + d, ly, z + d, x - d, ly, z + d, color);
        line(x - d, ly, z + d, x - d, ly, z - d, color);
        if (blocked) {
          line(x - 0.18, ly, z - 0.18, x + 0.18, ly, z + 0.18, color);
          line(x - 0.18, ly, z + 0.18, x + 0.18, ly, z - 0.18, color);
        } else if ((drafted || ordered) && room && room !== 'dig') {
          // An inset diamond distinguishes a future room from a plain excavation grid.
          line(x, ly, z - 0.13, x + 0.13, ly, z, color);
          line(x + 0.13, ly, z, x, ly, z + 0.13, color);
          line(x, ly, z + 0.13, x - 0.13, ly, z, color);
          line(x - 0.13, ly, z, x, ly, z - 0.13, color);
        }
      }
    planTiles.count = planCount;
    planTiles.instanceMatrix.needsUpdate = true;
    if (planTiles.instanceColor) planTiles.instanceColor.needsUpdate = true;
    planLineGeometry.setDrawRange(0, lineVertex);
    planLineGeometry.attributes.position.needsUpdate = true;
    planLineGeometry.attributes.color.needsUpdate = true;
    planMaterial.opacity = plan?.dragging
      ? 0.32
      : 0.22 + Math.sin(time * 3) * 0.035;
    hover.visible =
      hovered !== null &&
      possessed === null &&
      !quote?.selected.includes(hovered);
    if (hovered !== null) {
      const t = s.tiles[hovered];
      hover.position.set(t.x, walkable(t) ? 0.16 : 1.5, t.z);
      hover.material.color.set(
        s.heldUnitId === null
          ? '#f8d386'
          : canDropUnit(s, hovered)
            ? '#7debb4'
            : '#ef6d59',
      );
      hover.material.opacity = s.heldUnitId === null ? 0.45 : 0.65;
    }
    rallyMarker.visible = s.rally !== null;
    if (s.rally !== null) {
      const t = s.tiles[s.rally];
      rallyMarker.position.set(t.x, 1.6 + Math.sin(time * 2) * 0.1, t.z);
      rallyMarker.rotation.z = Math.PI;
    }
    while (effectObjects.length < s.effects.length) {
      const m = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: effectTexture,
          color: '#f1c97b',
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      scene.add(m);
      effectObjects.push(m);
    }
    effectObjects.forEach((m, i) => {
      const e = s.effects[i];
      m.visible = !!e && s.time > 0;
      if (e) {
        m.position.set(e.x, 0.5, e.z);
        m.scale.setScalar((1 - e.life) * 1.2 + 0.2);
        const material = m.material;
        material.opacity = Math.max(0, e.life) * 0.8;
        material.color.set(
          e.type === 'heal'
            ? '#7fe0b4'
            : e.type === 'bolt'
              ? '#76e3e8'
              : e.type === 'hit'
                ? '#eb8b64'
                : e.type === 'torment' || e.type === 'capture'
                  ? '#be81e4'
                  : '#f1c97b',
        );
      }
    });
    renderer.render(scene, possessed === null ? camera : eye);
    frame = requestAnimationFrame(render);
  }
  frame = requestAnimationFrame(render);
  const contextLost = (e: Event) => {
    e.preventDefault();
    options.onError(
      'Die 3D-Ansicht wurde unterbrochen. Speichere dein Reich und lade die Seite neu.',
    );
  };
  el.addEventListener('webglcontextlost', contextLost);
  return {
    center: () => {
      target.set(13, 0, 14);
      scale = 13.5;
      angle = Math.PI / 4;
      elevation = 1.04;
      resize();
    },
    zoom: (n) => {
      scale = THREE.MathUtils.clamp(scale + n, 7, 35);
      resize();
    },
    rotate: (n) => {
      angle += n;
    },
    focus: (x, z) => {
      target.set(x, 0, z);
    },
    possess: (id) => {
      if (id !== null) {
        const unit = options.state().units.find((u) => u.id === id);
        if (!unit || unit.kind === 'invader') return;
        options.onCancelGrab();
      }
      possessed = id;
      lookAngle = Math.PI;
      lookPitch = 0;
      options.onPossession(id);
    },
    getPossessed: () => possessed,
    cancelDrag,
    setAccessibleLabel: (label) =>
      renderer.domElement.setAttribute('aria-label', label),
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', blur);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', blur);
      el.removeEventListener('contextmenu', onContext);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('webglcontextlost', contextLost);
      scene.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) o.dispose();
      });
      [
        cube,
        slab,
        cylinder,
        sphere,
        cone,
        octa,
        torus,
        markerGeo,
        dustGeometry,
        base.geometry,
        hover.geometry,
      ].forEach((g) => g.dispose());
      creatureModels.dispose();
      materials.forEach((m) => m.dispose());
      surfaceTextures.forEach((texture) => texture.dispose());
      atlasTextures.forEach((texture) => texture.dispose());
      atlasSources.forEach((texture) => texture.dispose());
      spriteMaterials.forEach((material) => material.dispose());
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      effectTexture.dispose();
      dustMaterial.dispose();
      planMaterial.dispose();
      planLineGeometry.dispose();
      planLineMaterial.dispose();
      (hover.material as THREE.Material).dispose();
      effectObjects.forEach((m) => (m.material as THREE.Material).dispose());
      renderer.dispose();
      el.remove();
    },
  };
}
