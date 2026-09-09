import * as THREE from 'three';
import {
  SIZE,
  idx,
  inBounds,
  walkable,
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
}
export interface SceneOptions {
  state: () => GameState;
  tool: () => Tool;
  canControl: () => boolean;
  onSelect: (i: number, unitId: number | null) => void;
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
  scene.background = new THREE.Color('#0b1114');
  scene.fog = new THREE.FogExp2('#0c1216', 0.019);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.setAttribute(
    'aria-label',
    'Dreidimensionale Dungeon-Karte. Ziehen zum Markieren, rechte Maustaste zum Drehen.',
  );
  renderer.domElement.tabIndex = 0;
  host.appendChild(renderer.domElement);
  const camera = new THREE.OrthographicCamera(-15, 15, 12, -12, 0.1, 150);
  const eye = new THREE.PerspectiveCamera(68, 1, 0.08, 100);
  let target = new THREE.Vector3(13, 0, 14),
    angle = Math.PI / 4,
    elevation = 0.84,
    scale = 16,
    possessed: number | null = null,
    lookAngle = 0,
    lookPitch = 0;
  scene.add(new THREE.HemisphereLight('#b7cfdf', '#413329', 2.2));
  const sun = new THREE.DirectionalLight('#f5d2ad', 3.8);
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
  const rim = new THREE.DirectionalLight('#65bfc7', 2.2);
  rim.position.set(25, 12, 20);
  scene.add(rim);
  const cube = new THREE.BoxGeometry(1, 1, 1),
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 8),
    sphere = new THREE.IcosahedronGeometry(1, 1),
    cone = new THREE.ConeGeometry(1, 1, 6),
    octa = new THREE.OctahedronGeometry(1),
    torus = new THREE.TorusGeometry(1, 0.08, 6, 32);
  const floorTexture = new THREE.TextureLoader().load(
    import.meta.env.BASE_URL + 'art/basalt.webp',
  );
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.anisotropy = Math.min(
    8,
    renderer.capabilities.getMaxAnisotropy(),
  );
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: string, emission = 0, metal = 0) => {
    const key = color + emission + metal;
    if (!materials.has(key)) {
      const tint = new THREE.Color(color),
        hsl = { h: 0, s: 0, l: 0 };
      tint.getHSL(hsl);
      const stone = emission === 0 && metal === 0 && hsl.s < 0.25;
      if (stone) tint.multiplyScalar(1.9);
      materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color: tint,
          map: stone ? floorTexture : null,
          bumpMap: stone ? floorTexture : null,
          bumpScale: 0.065,
          roughness: metal ? 0.45 : 0.93,
          metalness: metal,
          emissive: color,
          emissiveIntensity: emission,
        }),
      );
    }
    return materials.get(key)!;
  };
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
  ) {
    const key = g.uuid + c + emission + metal;
    if (!buckets.has(key))
      buckets.set(key, {
        geometry: g,
        material: mat(c, emission, metal),
        matrices: [],
      });
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, rot, 0);
    dummy.updateMatrix();
    buckets.get(key)!.matrices.push(dummy.matrix.clone());
  }
  function addProp(
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
  ) {
    add(g, c, x, y, z, sx, sy, sz, rot, emission, metal);
  }
  function seeded(x: number, z: number, k = 0) {
    const n = Math.sin(x * 127.1 + z * 311.7 + k * 73.9) * 43758.5453123;
    return n - Math.floor(n);
  }
  let revision = -1;
  function rebuild() {
    const s = options.state();
    revision = s.revision;
    terrain.children.forEach((o) => {
      if (o instanceof THREE.InstancedMesh) o.dispose();
    });
    terrain.clear();
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
        let h = t.kind === 'rock' ? 1.85 : 1.28 + r * 0.22;
        const colors =
          t.kind === 'rock'
            ? ['#2d3740', '#354047', '#414a50']
            : t.kind === 'gold'
              ? ['#696044', '#60543a', '#76633e']
              : ['#45423e', '#504b44', '#3f4241', '#575046'];
        const color = t.seen
          ? colors[Math.floor(r * colors.length)]
          : '#232b30';
        add(cube, color, x, h / 2 - 0.1, z, 0.98, h, 0.98);
        if (t.seen) {
          add(
            cube,
            t.kind === 'gold' ? '#897044' : '#62605a',
            x,
            h - 0.015,
            z,
            0.965,
            0.09,
            0.965,
          );
          if (exposed) {
            for (let b = 0; b < 3; b++)
              add(
                cube,
                color,
                x + 0.014,
                (h * (b + 0.5)) / 3 - 0.1,
                z,
                1.01,
                h / 3 - 0.035,
                1.01,
              );
          }
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
        add(cube, '#174148', x, -0.05, z, 0.98, 0.1, 0.98, 0, 0.28, 0.5);
        if (r > 0.8) add(octa, '#69aa9c', x, 0.14, z, 0.09, 0.2, 0.1, 0, 0.7);
      } else {
        const color = t.room
          ? ROOMS[t.room].color
          : t.owned
            ? '#666459'
            : '#414744';
        const c = new THREE.Color(color).multiplyScalar(t.room ? 0.6 : 0.75);
        add(cube, '#' + c.getHexString(), x, -0.04, z, 0.975, 0.18, 0.975);
        add(
          cube,
          t.owned ? '#85816e' : '#545753',
          x,
          0.055,
          z,
          0.88,
          0.045,
          0.88,
        );
        if (t.room) {
          const rc = ROOMS[t.room].color;
          add(
            cube,
            '#' + new THREE.Color(rc).multiplyScalar(0.55).getHexString(),
            x,
            0.09,
            z,
            0.8,
            0.04,
            0.8,
          );
          for (const [dx, dz] of [
            [-0.44, 0],
            [0.44, 0],
            [0, -0.44],
            [0, 0.44],
          ])
            add(
              cube,
              rc,
              x + dx,
              0.1,
              z + dz,
              dx ? 0.025 : 0.85,
              0.025,
              dz ? 0.025 : 0.85,
              0,
              0.05,
            );
          if (t.room === 'vault') {
            add(cube, '#493824', x, 0.21, z, 0.66, 0.27, 0.5);
            add(cube, '#775b35', x, 0.37, z - 0.23, 0.65, 0.29, 0.09);
            for (const dx of [-0.26, 0.26]) {
              add(
                cube,
                '#b08e4c',
                x + dx,
                0.24,
                z,
                0.065,
                0.29,
                0.52,
                0,
                0,
                0.65,
              );
              add(
                cube,
                '#b08e4c',
                x + dx,
                0.47,
                z - 0.23,
                0.065,
                0.15,
                0.12,
                0,
                0,
                0.65,
              );
            }
            for (let j = 0; j < 5; j++)
              add(
                cylinder,
                j % 2 ? '#ddae50' : '#ba852e',
                x + ((j % 3) - 1) * 0.18,
                0.42 + Math.floor(j / 3) * 0.07,
                z + ((j % 2) - 0.5) * 0.17,
                0.13,
                0.09,
                0.13,
                0,
                0.04,
                0.7,
              );
          }
          if (t.room === 'rest') {
            add(cube, '#49484a', x, 0.18, z, 0.75, 0.22, 0.8);
            add(cube, '#554559', x, 0.31, z, 0.62, 0.12, 0.69);
            add(cube, '#836988', x, 0.39, z + 0.06, 0.58, 0.065, 0.5);
            add(cube, '#b3a79a', x, 0.42, z - 0.23, 0.48, 0.12, 0.17);
            add(cube, '#615c55', x, 0.4, z - 0.4, 0.79, 0.5, 0.1);
            for (const dx of [-0.32, 0.32])
              add(
                cube,
                '#9f8a57',
                x + dx,
                0.29,
                z,
                0.04,
                0.06,
                0.76,
                0,
                0,
                0.4,
              );
          }
          if (t.room === 'food') {
            add(cylinder, '#343e2c', x, 0.13, z, 0.39, 0.12, 0.39);
            for (let j = 0; j < 3; j++) {
              const a = j * 2.4 + r,
                px = x + Math.cos(a) * 0.23,
                pz = z + Math.sin(a) * 0.23,
                h = 0.21 + j * 0.08;
              add(cylinder, '#9aaa87', px, h, pz, 0.035, h, 0.035);
              add(
                sphere,
                j % 2 ? '#84c79d' : '#60a57d',
                px,
                h * 1.7,
                pz,
                0.17,
                0.095,
                0.16,
                0,
                0.2,
              );
            }
          }
          if (t.room === 'training') {
            add(cylinder, '#605247', x, 0.15, z, 0.32, 0.18, 0.32);
            add(cylinder, '#9f7750', x, 0.53, z, 0.045, 0.7, 0.045);
            add(cube, '#a99071', x, 0.69, z, 0.6, 0.08, 0.09);
            add(sphere, '#92614b', x, 0.83, z, 0.12, 0.16, 0.12);
            add(cube, '#8f5744', x, 0.53, z, 0.25, 0.34, 0.19);
          }
          if (t.room === 'library') {
            add(cube, '#2b4a49', x, 0.28, z, 0.58, 0.4, 0.4);
            add(cube, '#c2b389', x, 0.51, z, 0.51, 0.045, 0.35);
            add(cube, '#497d76', x, 0.54, z, 0.04, 0.06, 0.37);
            add(octa, '#6df0ce', x, 0.9, z, 0.1, 0.19, 0.1, r, 0.85, 0.25);
          }
          if (t.room === 'forge') {
            add(cube, '#3a3a3b', x, 0.21, z, 0.54, 0.3, 0.5);
            add(cube, '#b9ad91', x, 0.45, z, 0.66, 0.16, 0.3);
            add(
              cone,
              '#c3753b',
              x + 0.29,
              0.25,
              z + 0.21,
              0.13,
              0.35,
              0.13,
              0,
              0.8,
            );
          }
        } else if (r > 0.85 && t.kind === 'floor') {
          add(cube, '#383e3c', x + 0.27, 0.067, z - 0.23, 0.15, 0.035, 0.19, r);
        }
        if (t.trap) {
          add(cylinder, '#2b4143', x, 0.16, z, 0.38, 0.14, 0.38);
          add(octa, '#63c4b2', x, 0.27, z, 0.18, 0.2, 0.18, 0, 0.7, 0.4);
        }
        if (t.door) {
          add(cube, '#55534e', x, 0.7, z, 0.92, 1.3, 0.17);
          for (let j = -1; j <= 1; j++)
            add(
              cube,
              '#b0935b',
              x + j * 0.27,
              0.7,
              z + 0.1,
              0.05,
              1.2,
              0.05,
              0,
              0,
              0.4,
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
  // The Ember: a suspended geological monument, surrounded by an astrolabe.
  mesh(cylinder, '#353b3c', 13, 0.2, 14, 1.43, 0.35, 1.43);
  mesh(cylinder, '#75664b', 13, 0.43, 14, 1.25, 0.14, 1.25, props, 0, 0.6);
  mesh(cylinder, '#292f31', 13, 0.61, 14, 0.95, 0.28, 0.95);
  mesh(cylinder, '#b78a45', 13, 0.8, 14, 0.7, 0.12, 0.7, props, 0.12, 0.7);
  const crystal = mesh(
    octa,
    '#f5b35a',
    13,
    1.72,
    14,
    0.54,
    1.15,
    0.54,
    props,
    0.9,
    0.3,
  );
  const inner = mesh(
    octa,
    '#ffe8ba',
    13,
    1.72,
    14,
    0.23,
    0.92,
    0.23,
    props,
    2,
    0.1,
  );
  const ring = mesh(
    torus,
    '#bd904e',
    13,
    1.33,
    14,
    0.97,
    0.97,
    0.97,
    props,
    0.15,
    0.7,
  );
  ring.rotation.x = Math.PI * 0.57;
  ring.rotation.y = 0.32;
  const ring2 = mesh(
    torus,
    '#655b47',
    13,
    1.25,
    14,
    1.12,
    1.12,
    1.12,
    props,
    0,
    0.5,
  );
  ring2.rotation.x = 1.1;
  ring2.rotation.z = 0.7;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = 13 + Math.cos(a) * 1.33,
      z = 14 + Math.sin(a) * 1.33;
    mesh(cylinder, '#45494a', x, 0.59, z, 0.13, 0.7, 0.13);
    mesh(octa, '#dda94e', x, 1.01, z, 0.13, 0.21, 0.13, props, 0.55, 0.4);
  }
  const coreLight = new THREE.PointLight('#ffba62', 26, 8, 1.7);
  coreLight.position.set(13, 2.6, 14);
  scene.add(coreLight);
  // Portal architecture; different shape and palette from the central monument.
  mesh(cylinder, '#3e5557', 13, 0.2, 8, 0.92, 0.2, 0.92);
  for (const sign of [-1, 1]) {
    mesh(cube, '#677270', 13 + sign * 0.72, 0.94, 8, 0.25, 1.65, 0.35);
    mesh(octa, '#86e5d4', 13 + sign * 0.72, 1.9, 8, 0.2, 0.3, 0.2, props, 0.7);
  }
  const gate = mesh(
    torus,
    '#5dc8bb',
    13,
    1.14,
    8,
    0.69,
    0.87,
    0.4,
    props,
    1.4,
    0.3,
  );
  mesh(cube, '#6d7b71', 13, 1.88, 8, 1.64, 0.18, 0.43);
  const portalLight = new THREE.PointLight('#48ddc0', 14, 7, 2);
  portalLight.position.set(13, 1.8, 8);
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
  function makeUnit(u: Unit) {
    const g = new THREE.Group();
    const worker = u.kind === 'worker',
      brute = u.kind === 'brute',
      enemy = u.kind === 'invader';
    const body = worker
      ? '#9b8063'
      : enemy
        ? '#bfc0ac'
        : u.kind === 'scholar'
          ? '#426f6e'
          : brute
            ? '#726b80'
            : '#74453b';
    const size = brute ? 1.45 : worker ? 0.87 : 1.09;
    const model = new THREE.Group();
    model.scale.setScalar(size);
    g.add(model);
    const bodyMesh = mesh(cone, body, 0, 0.41, 0, 0.21, 0.49, 0.18, model);
    bodyMesh.rotation.y = Math.PI / 4;
    mesh(
      sphere,
      worker ? '#a5a98a' : enemy ? '#c7c4b6' : '#adb3a3',
      0,
      0.77,
      0,
      0.13,
      0.14,
      0.13,
      model,
    );
    for (const side of [-1, 1]) {
      mesh(
        sphere,
        enemy ? '#1c2b2b' : '#74c4a1',
        side * 0.055,
        0.79,
        0.116,
        0.025,
        0.02,
        0.027,
        model,
        enemy ? 0 : 0.7,
      );
      mesh(cube, body, side * 0.2, 0.46, 0, 0.08, 0.3, 0.1, model);
      mesh(
        sphere,
        '#9b9a82',
        side * 0.23,
        0.32,
        0.035,
        0.055,
        0.055,
        0.055,
        model,
      );
    }
    mesh(cube, '#ad9563', 0, 0.34, 0.16, 0.27, 0.045, 0.045, model, 0, 0.4);
    mesh(cube, '#38342b', 0, 0.35, 0.186, 0.065, 0.066, 0.02, model);
    if (brute) {
      mesh(sphere, '#7b766c', -0.28, 0.64, 0, 0.16, 0.19, 0.18, model);
      mesh(sphere, '#7b766c', 0.28, 0.64, 0, 0.16, 0.19, 0.18, model);
      mesh(octa, '#9dcea5', 0, 0.55, 0.16, 0.045, 0.1, 0.05, model, 0.5);
    }
    if (worker) {
      mesh(sphere, '#6d4c2c', 0, 0.87, 0, 0.17, 0.08, 0.15, model);
      mesh(octa, '#f9c765', 0, 0.88, 0.135, 0.045, 0.06, 0.04, model, 1);
      mesh(cube, '#6e6244', 0.23, 0.43, 0, 0.035, 0.52, 0.035, model);
      const pick = mesh(
        cube,
        '#aab4ae',
        0.23,
        0.7,
        0,
        0.32,
        0.055,
        0.065,
        model,
      );
      pick.rotation.z = 0.3;
    } else if (u.kind === 'scholar') {
      mesh(cone, '#539b8c', 0, 0.98, 0, 0.15, 0.32, 0.15, model);
      mesh(cylinder, '#9a8965', 0.26, 0.48, 0, 0.025, 0.9, 0.025, model);
      mesh(octa, '#6fe4cf', 0.26, 0.98, 0, 0.085, 0.14, 0.085, model, 1);
    } else {
      mesh(
        sphere,
        enemy ? '#e4d9b8' : '#978e79',
        0,
        0.86,
        0,
        0.15,
        0.08,
        0.15,
        model,
      );
      mesh(
        cube,
        enemy ? '#708ba0' : '#a27f4a',
        -0.23,
        0.46,
        0.06,
        0.12,
        0.29,
        0.24,
        model,
        0,
        0.3,
      );
      mesh(cube, '#bfc9c5', 0.23, 0.51, 0, 0.04, 0.52, 0.075, model, 0, 0.55);
      mesh(sphere, body, -0.2, 0.61, 0, 0.12, 0.12, 0.12, model);
      mesh(sphere, body, 0.2, 0.61, 0, 0.12, 0.12, 0.12, model);
    }
    const feet = [
      mesh(cube, '#3c3932', -0.1, 0.13, 0, 0.1, 0.22, 0.13, model),
      mesh(cube, '#3c3932', 0.1, 0.13, 0, 0.1, 0.22, 0.13, model),
    ];
    const bar = new THREE.Group();
    const bg = mesh(
      cube,
      '#141d22',
      0,
      1.18 * size,
      0,
      0.53,
      0.047,
      0.025,
      bar,
    );
    bg.castShadow = false;
    const hp = mesh(
      cube,
      enemy ? '#d97d63' : '#76b69b',
      0,
      1.18 * size,
      0.02,
      0.5,
      0.026,
      0.022,
      bar,
    );
    hp.castShadow = false;
    g.add(bar);
    g.userData = {
      feet,
      model,
      bar,
      hp,
      previous: new THREE.Vector3(u.x, 0, u.z),
    };
    creatures.add(g);
    unitObjects.set(u.id, g);
    return g;
  }
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: '#e8bd6b',
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const markerGeo = new THREE.BoxGeometry(0.97, 0.06, 0.97);
  const marks = new THREE.InstancedMesh(markerGeo, markerMaterial, SIZE * SIZE);
  marks.count = 0;
  scene.add(marks);
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
  const effectObjects: THREE.Mesh[] = [];
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
    if (!raycaster.ray.intersectPlane(ground, point)) return null;
    const x = Math.round(point.x),
      z = Math.round(point.z);
    return inBounds(x, z) ? idx(x, z) : null;
  }
  function area() {
    if (dragStart === null || dragEnd === null) return [];
    const ax = dragStart % SIZE,
      az = Math.floor(dragStart / SIZE),
      bx = dragEnd % SIZE,
      bz = Math.floor(dragEnd / SIZE);
    const result = [];
    for (let z = Math.min(az, bz); z <= Math.max(az, bz); z++)
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++)
        result.push(idx(x, z));
    return result;
  }
  function onDown(e: PointerEvent) {
    renderer.domElement.focus();
    if (e.button === 2 || e.button === 1) {
      rightDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    dragStart = pick(e);
    dragEnd = dragStart;
    dragMoved = false;
    renderer.domElement.setPointerCapture(e.pointerId);
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onMove(e: PointerEvent) {
    if (rightDown) {
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
    if (dragStart !== null) {
      dragEnd = p;
      dragMoved ||= Math.hypot(e.clientX - lastX, e.clientY - lastY) > 5;
    }
  }
  function onUp(e: PointerEvent) {
    if (e.button !== 0) {
      rightDown = false;
      return;
    }
    const end = pick(e),
      tool = options.tool();
    if (end !== null && dragStart !== null) {
      if (
        dragMoved &&
        tool !== 'inspect' &&
        tool !== 'heal' &&
        tool !== 'bolt' &&
        tool !== 'rally'
      )
        options.onArea(area());
      else {
        const t = options.state().tiles[end];
        const u = options
          .state()
          .units.filter((u) => Math.hypot(u.x - t.x, u.z - t.z) < 0.8)
          .sort(
            (a, b) =>
              Math.hypot(a.x - t.x, a.z - t.z) -
              Math.hypot(b.x - t.x, b.z - t.z),
          )[0];
        options.onSelect(end, u?.id ?? null);
      }
    }
    dragStart = null;
    dragEnd = null;
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    scale = Math.max(9, Math.min(35, scale + Math.sign(e.deltaY) * 1.1));
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
    dragStart = null;
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
    if (s.revision !== revision) rebuild();
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
    crystal.rotation.y = time * 0.2;
    crystal.position.y = 1.75 + Math.sin(time * 1.3) * 0.08;
    inner.rotation.y = -time * 0.4;
    ring.rotation.z = time * 0.09;
    coreLight.intensity = 25 + Math.sin(time * 3) * 2;
    gate.rotation.z = Math.sin(time * 0.5) * 0.03;
    dust.rotation.y = Math.sin(time * 0.025) * 0.01;
    const alive = new Set(s.units.map((u) => u.id));
    for (const [id, g] of unitObjects)
      if (!alive.has(id)) {
        creatures.remove(g);
        unitObjects.delete(id);
      }
    for (const u of s.units) {
      const g = unitObjects.get(u.id) ?? makeUnit(u);
      g.visible = u.id !== possessed;
      g.position.set(u.x, 0, u.z);
      const prev = g.userData.previous as THREE.Vector3;
      const moving = Math.hypot(u.x - prev.x, u.z - prev.z) > 0.002;
      if (moving)
        g.userData.model.rotation.y = Math.atan2(u.x - prev.x, u.z - prev.z);
      g.userData.model.position.y = moving
        ? Math.abs(Math.sin(time * 9 + u.id)) * 0.035
        : Math.sin(time * 2 + u.id) * 0.008;
      g.userData.feet.forEach((f: THREE.Mesh, i: number) => {
        f.rotation.x = moving ? Math.sin(time * 10 + i * Math.PI) * 0.4 : 0;
      });
      g.userData.bar.rotation.copy(
        (possessed === null ? camera : eye).rotation,
      );
      g.userData.hp.scale.x = 0.5 * Math.max(0, u.hp / u.maxHp);
      g.userData.bar.visible = u.hp < u.maxHp || u.kind === 'invader';
      prev.set(u.x, 0, u.z);
    }
    let count = 0;
    const selected = new Set(area());
    for (const t of s.tiles) {
      if (t.marked || selected.has(idx(t.x, t.z))) {
        dummy.position.set(t.x, walkable(t) ? 0.15 : 1.42, t.z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        marks.setMatrixAt(count++, dummy.matrix);
      }
    }
    marks.count = count;
    marks.instanceMatrix.needsUpdate = true;
    hover.visible = hovered !== null && possessed === null;
    if (hovered !== null) {
      const t = s.tiles[hovered];
      hover.position.set(t.x, walkable(t) ? 0.16 : 1.5, t.z);
    }
    rallyMarker.visible = s.rally !== null;
    if (s.rally !== null) {
      const t = s.tiles[s.rally];
      rallyMarker.position.set(t.x, 1.6 + Math.sin(time * 2) * 0.1, t.z);
      rallyMarker.rotation.z = Math.PI;
    }
    while (effectObjects.length < s.effects.length) {
      const m = new THREE.Mesh(
        sphere,
        new THREE.MeshBasicMaterial({
          color: '#f1c97b',
          transparent: true,
          opacity: 0.5,
          wireframe: true,
        }),
      );
      scene.add(m);
      effectObjects.push(m);
    }
    effectObjects.forEach((m, i) => {
      const e = s.effects[i];
      m.visible = !!e;
      if (e) {
        m.position.set(e.x, 0.5, e.z);
        m.scale.setScalar((1 - e.life) * 1.2 + 0.2);
        const material = m.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, e.life) * 0.8;
        material.color.set(
          e.type === 'heal'
            ? '#7fe0b4'
            : e.type === 'bolt'
              ? '#76e3e8'
              : e.type === 'hit'
                ? '#eb8b64'
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
      scale = 16;
      angle = Math.PI / 4;
      elevation = 0.84;
      resize();
    },
    zoom: (n) => {
      scale = THREE.MathUtils.clamp(scale + n, 9, 35);
      resize();
    },
    rotate: (n) => {
      angle += n;
    },
    focus: (x, z) => {
      target.set(x, 0, z);
    },
    possess: (id) => {
      possessed = id;
      lookAngle = Math.PI;
      lookPitch = 0;
      options.onPossession(id);
    },
    getPossessed: () => possessed,
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
      materials.forEach((m) => m.dispose());
      floorTexture.dispose();
      dustMaterial.dispose();
      markerMaterial.dispose();
      (hover.material as THREE.Material).dispose();
      effectObjects.forEach((m) => (m.material as THREE.Material).dispose());
      renderer.dispose();
      el.remove();
    },
  };
}
