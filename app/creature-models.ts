/**
 * Kluftkrone — original articulated creature sculptures.
 * Authored from procedural geometry; no raster assets, downloaded models,
 * copied meshes, fonts, or game-specific imports. Three.js r186 compatible.
 *
 * Coordinates: +Y up, +Z forward; root origin is ground contact. Caller owns
 * root position/yaw/visibility and passes time in SECONDS, speed in tiles/sec,
 * a job/state string, and health as a fraction [0,1]. All mesh parts raycast.
 *
 * Factory templates share merged joint geometries and materials. Removing an
 * instance needs no disposal; call factory.dispose() once after ALL instances
 * are removed. Calling dispose twice is harmless. No animation mixers, skinning,
 * per-frame allocations, textures, lights, or additional dependencies are used.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type UnitKind = 'worker' | 'guard' | 'scholar' | 'brute' | 'invader';
export interface CreatureModel {
  root: THREE.Group;
  height: number;
  animate(time: number, speed: number, job: string, health: number): void;
}
export interface CreatureModels {
  create(kind: UnitKind): CreatureModel;
  dispose(): void;
}
type V3 = readonly [number, number, number];
type Finish = 'surface' | 'metal' | 'amber' | 'teal';
type Shape =
  | 'round'
  | 'organic'
  | 'rock'
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'torus';
interface RigSpec {
  height: number;
  hip: number;
  chest: number;
  shoulder: number;
  width: number;
  arm: number;
  forearm: number;
  thigh: number;
  shin: number;
  legX: number;
  bulk: number;
  head: number;
  skin: string;
  cloth: string;
  metal: string;
}
const P = {
  dark: '#242523',
  iron: '#4c514e',
  edge: '#aaa18a',
  copper: '#9a6b3e',
  gold: '#c69a59',
  leather: '#533b2c',
  seam: '#231d1b',
  stitch: '#b19569',
  skin: '#637163',
  skinLight: '#818b79',
  purple: '#514156',
  purpleLight: '#6e5672',
  stone: '#343b41',
  stoneLight: '#5a6164',
  amber: '#ffc05b',
  teal: '#74ded1',
  bone: '#d5c8a6',
  saffron: '#a18442',
  mouth: '#292325',
  wood: '#655039',
};
const SPECS: Record<UnitKind, RigSpec> = {
  worker: {
    height: 0.94,
    hip: 0.3,
    chest: 0.51,
    shoulder: 0.63,
    width: 0.225,
    arm: 0.18,
    forearm: 0.16,
    thigh: 0.14,
    shin: 0.13,
    legX: 0.105,
    bulk: 1.12,
    head: 0.76,
    skin: P.skin,
    cloth: P.leather,
    metal: P.copper,
  },
  guard: {
    height: 1.34,
    hip: 0.47,
    chest: 0.68,
    shoulder: 0.86,
    width: 0.21,
    arm: 0.235,
    forearm: 0.2,
    thigh: 0.23,
    shin: 0.21,
    legX: 0.115,
    bulk: 1,
    head: 1.035,
    skin: P.skin,
    cloth: '#343330',
    metal: '#8b6846',
  },
  scholar: {
    height: 1.25,
    hip: 0.46,
    chest: 0.69,
    shoulder: 0.85,
    width: 0.17,
    arm: 0.23,
    forearm: 0.21,
    thigh: 0.22,
    shin: 0.21,
    legX: 0.085,
    bulk: 0.77,
    head: 1.035,
    skin: '#6b736a',
    cloth: P.purple,
    metal: '#87643c',
  },
  brute: {
    height: 1.62,
    hip: 0.37,
    chest: 0.66,
    shoulder: 0.85,
    width: 0.345,
    arm: 0.265,
    forearm: 0.255,
    thigh: 0.19,
    shin: 0.15,
    legX: 0.19,
    bulk: 1.7,
    head: 1.005,
    skin: P.stone,
    cloth: P.dark,
    metal: '#766a51',
  },
  invader: {
    height: 1.32,
    hip: 0.47,
    chest: 0.7,
    shoulder: 0.86,
    width: 0.18,
    arm: 0.235,
    forearm: 0.205,
    thigh: 0.23,
    shin: 0.21,
    legX: 0.098,
    bulk: 0.87,
    head: 1.04,
    skin: '#948a72',
    cloth: '#b7aa8b',
    metal: '#777463',
  },
};

export function createCreatureModels(): CreatureModels {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  let disposed = false,
    sequence = 0;
  const keep = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.add(g);
    return g;
  };
  const material = (p: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...p });
    materials.add(m);
    return m;
  };
  const finishes: Record<Finish, THREE.Material> = {
    surface: material({ roughness: 0.92, metalness: 0.04 }),
    metal: material({ roughness: 0.58, metalness: 0.63 }),
    amber: material({
      roughness: 0.6,
      metalness: 0.12,
      emissive: '#ff9d32',
      emissiveIntensity: 1.15,
    }),
    teal: material({
      roughness: 0.45,
      metalness: 0.18,
      emissive: '#36b9ad',
      emissiveIntensity: 0.85,
    }),
  };
  // A continuous, asymmetrical sculpt surface. Broad anatomical irregularity
  // breaks perfect ellipsoids without relying on a noisy material or a texture.
  const organic = keep(new THREE.SphereGeometry(1, 18, 14));
  const organicVertices = organic.getAttribute('position');
  for (let i = 0; i < organicVertices.count; i++) {
    const x = organicVertices.getX(i),
      y = organicVertices.getY(i),
      z = organicVertices.getZ(i);
    const radial =
      1 +
      0.049 * Math.sin(x * 3.8 + y * 2.1 - z * 3.4) +
      0.027 * Math.sin(x * 7.3 - y * 4.9 + z * 5.2);
    organicVertices.setXYZ(
      i,
      x * radial + 0.018 * y * y,
      y * radial,
      z * radial,
    );
  }
  organic.computeVertexNormals();
  const primitive: Record<Shape, THREE.BufferGeometry> = {
    round: keep(new THREE.SphereGeometry(1, 16, 12)),
    organic,
    rock: keep(new THREE.IcosahedronGeometry(1, 1)),
    box: keep(new RoundedBoxGeometry(1, 1, 1, 2, 0.11)),
    cylinder: keep(new THREE.CylinderGeometry(1, 1, 1, 12, 1)),
    cone: keep(new THREE.ConeGeometry(1, 1, 8, 1)),
    torus: keep(new THREE.TorusGeometry(1, 0.13, 6, 18)),
  };
  // Basalt has broken planes and uneven mass, not smoothly shaded balls.
  const rockVertices = primitive.rock.getAttribute('position');
  for (let i = 0; i < rockVertices.count; i++) {
    const x = rockVertices.getX(i),
      y = rockVertices.getY(i),
      z = rockVertices.getZ(i);
    const fracture =
      1 +
      0.16 * Math.sin(x * 6.2 + y * 3.8 - z * 4.7) +
      0.06 * Math.cos(z * 8 + y * 7);
    rockVertices.setXYZ(i, x * fracture, y * fracture, z * fracture);
  }
  primitive.rock.computeVertexNormals();
  const matrix = new THREE.Matrix4(),
    quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3(),
    scale = new THREE.Vector3(),
    euler = new THREE.Euler();
  const color = new THREE.Color();

  // One merged mesh per rigid joint and surface finish, including fine rivets,
  // fingers, seams, teeth and relief carving. Instance clones share these meshes.
  class Sculpt {
    buckets = new Map<Finish, THREE.BufferGeometry[]>();
    constructor(readonly node: THREE.Group) {}
    add(
      shape: Shape | THREE.BufferGeometry,
      tint: string,
      p: V3,
      s: V3,
      r: V3 = [0, 0, 0],
      finish: Finish = 'surface',
      variation = 0.09,
    ) {
      const source = typeof shape === 'string' ? primitive[shape] : shape;
      const g = source.index ? source.toNonIndexed() : source.clone();
      g.deleteAttribute('uv');
      g.deleteAttribute('uv1');
      position.set(...p);
      scale.set(...s);
      euler.set(...r);
      quaternion.setFromEuler(euler);
      matrix.compose(position, quaternion, scale);
      g.applyMatrix4(matrix);
      const verts = g.getAttribute('position');
      const colors = new Float32Array(verts.count * 3);
      color.set(tint);
      for (let i = 0; i < verts.count; i++) {
        // Continuous 3D color variation avoids a confetti-like per-face pattern.
        const x = verts.getX(i),
          y = verts.getY(i),
          z = verts.getZ(i);
        const noise =
          Math.sin(x * 51 + y * 17 + z * 29) * Math.sin(z * 37 - y * 31);
        const brightness = 1 + variation * noise;
        colors[i * 3] = color.r * brightness;
        colors[i * 3 + 1] = color.g * brightness;
        colors[i * 3 + 2] = color.b * brightness;
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const bucket = this.buckets.get(finish) ?? [];
      bucket.push(g);
      this.buckets.set(finish, bucket);
      return this;
    }
    // Cylinder between points; useful for brow ridges, rolled seams and straps.
    link(
      tint: string,
      a: V3,
      b: V3,
      radius: number,
      finish: Finish = 'surface',
      endRadius = radius,
    ) {
      const av = new THREE.Vector3(...a),
        bv = new THREE.Vector3(...b),
        direction = bv.clone().sub(av);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      );
      const rotation = new THREE.Euler().setFromQuaternion(q);
      const geometry =
        endRadius === radius
          ? primitive.cylinder
          : new THREE.CylinderGeometry(endRadius / radius, 1, 1, 10);
      this.add(
        geometry,
        tint,
        av.add(bv).multiplyScalar(0.5).toArray() as [number, number, number],
        [radius, direction.length(), radius],
        [rotation.x, rotation.y, rotation.z],
        finish,
      );
      if (geometry !== primitive.cylinder) geometry.dispose();
      return this;
    }
    rivets(
      points: V3[],
      radius = 0.011,
      tint = P.gold,
      finish: Finish = 'metal',
    ) {
      for (const p of points)
        this.add(
          'round',
          tint,
          p,
          [radius, radius, radius * 0.6],
          [0, 0, 0],
          finish,
        );
      return this;
    }
    finish() {
      for (const [finish, parts] of this.buckets) {
        const geometry = mergeGeometries(parts, false);
        if (!geometry) throw new Error('Could not merge creature geometry');
        for (const p of parts) p.dispose();
        keep(geometry);
        geometry.computeBoundingSphere();
        const mesh = new THREE.Mesh(geometry, finishes[finish]);
        mesh.name = this.node.name + '.' + finish;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.creaturePart = true;
        this.node.add(mesh);
      }
      this.buckets.clear();
    }
  }
  function joint(parent: THREE.Object3D, name: string, p: V3): THREE.Group {
    const n = new THREE.Group();
    n.name = name;
    n.position.set(...p);
    parent.add(n);
    return n;
  }
  function polygon(
    points: readonly (readonly [number, number])[],
    depth = 0.05,
    bevel = 0.008,
  ): THREE.BufferGeometry {
    const path = new THREE.Shape();
    points.forEach((p, i) => (i ? path.lineTo(...p) : path.moveTo(...p)));
    path.closePath();
    const g = new THREE.ExtrudeGeometry(path, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 8,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  function relief(
    s: Sculpt,
    points: readonly (readonly [number, number])[],
    tint: string,
    p: V3,
    depth: number,
    finish: Finish = 'surface',
    r: V3 = [0, 0, 0],
  ) {
    const g = polygon(points, depth);
    s.add(g, tint, p, [1, 1, 1], r, finish);
    g.dispose();
  }
  function armorBands(
    s: Sculpt,
    y: number,
    width: number,
    z: number,
    tint: string,
    finish: Finish = 'metal',
  ) {
    s.add('box', tint, [0, y, z], [width, 0.038, 0.025], [0, 0, 0], finish);
    s.rivets(
      [
        [-width * 0.39, y, z + 0.018],
        [width * 0.39, y, z + 0.018],
      ],
      0.008,
      P.gold,
      finish,
    );
  }
  function hand(
    s: Sculpt,
    kind: UnitKind,
    y: number,
    width: number,
    side: number,
  ) {
    const stone = kind === 'brute',
      skin = kind === 'worker',
      finish: Finish = skin || stone ? 'surface' : 'metal';
    const tint = skin ? P.skin : stone ? P.stoneLight : P.iron;
    s.add(
      stone ? 'rock' : 'round',
      tint,
      [0, y, 0.016],
      [width, 0.055 * (stone ? 1.4 : 1), width * 0.82],
      [0, 0, side * 0.12],
      finish,
    );
    for (let i = 0; i < 3; i++)
      s.add(
        stone ? 'rock' : 'box',
        tint,
        [(i - 1) * width * 0.46, y - 0.032, 0.049],
        [width * 0.36, 0.053, width * 0.49],
        [0.15, 0, 0],
        finish,
      );
    s.add(
      'round',
      tint,
      [-side * width * 0.8, y + 0.005, 0.055],
      [width * 0.35, 0.045, width * 0.4],
      [0, 0, -side * 0.4],
      finish,
    );
    if (!skin && !stone)
      s.add(
        'box',
        P.copper,
        [0, y + 0.012, 0.062],
        [width * 1.4, 0.033, 0.015],
        [0, 0, 0],
        finish,
      );
  }
  function makeHead(kind: UnitKind, spec: RigSpec, head: THREE.Group) {
    const s = new Sculpt(head);
    if (kind === 'worker') {
      s.add(
        'organic',
        P.skin,
        [-0.008, 0, 0],
        [0.181, 0.167, 0.144],
        [0.035, -0.035, -0.045],
        'surface',
        0.075,
      );
      s.add(
        'organic',
        P.skinLight,
        [0.002, -0.07, 0.112],
        [0.125, 0.078, 0.088],
        [0, 0.045, 0.035],
        'surface',
        0.065,
      );
      // Wide downturned mouth, articulated lip, cheek pads, heavy asymmetric nose.
      s.add('box', P.mouth, [0, -0.078, 0.185], [0.117, 0.032, 0.019]);
      s.link(P.skinLight, [-0.063, -0.094, 0.19], [0.063, -0.094, 0.19], 0.015);
      s.add(
        'organic',
        P.skinLight,
        [0.006, -0.006, 0.159],
        [0.049, 0.057, 0.065],
        [0.14, 0.09, -0.08],
        'surface',
        0.07,
      );
      s.add(
        'organic',
        '#596757',
        [-0.024, -0.017, 0.205],
        [0.013, 0.01, 0.006],
      );
      s.add(
        'organic',
        '#596757',
        [0.029, -0.019, 0.211],
        [0.011, 0.009, 0.005],
      );
      for (const side of [-1, 1]) {
        s.add(
          'organic',
          P.skinLight,
          [side * 0.094, -0.035 + (side < 0 ? 0.009 : 0), 0.112],
          [0.054, 0.04, 0.046],
          [0, side * 0.17, side * 0.05],
        );
        s.add(
          'round',
          P.dark,
          [side * 0.065, 0.035, 0.129],
          [0.043, 0.025, 0.033],
        );
        s.add(
          'round',
          P.bone,
          [side * 0.065, 0.037, 0.154],
          [0.025, 0.013, 0.012],
        );
        s.add(
          'round',
          P.amber,
          [side * 0.06, 0.037, 0.165],
          [0.01, 0.011, 0.006],
          [0, 0, 0],
          'amber',
        );
        s.link(
          P.skinLight,
          [side * 0.025, 0.065, 0.141],
          [side * 0.113, 0.05, 0.119],
          0.019,
        );
        s.add(
          'cone',
          P.bone,
          [side * 0.046, -0.062, 0.191],
          [0.013, 0.035, 0.013],
          [Math.PI, 0, side * 0.1],
        );
        const ear = joint(head, side < 0 ? 'earL' : 'earR', [
          side * 0.153,
          0.037,
          -0.015,
        ]);
        const e = new Sculpt(ear);
        relief(
          e,
          [
            [0, -0.045],
            [side * 0.103, 0.015],
            [side * 0.144, 0.105],
            [side * 0.025, 0.073],
          ],
          P.skin,
          [0, 0, 0],
          0.027,
        );
        relief(
          e,
          [
            [side * 0.025, -0.014],
            [side * 0.105, 0.07],
            [side * 0.038, 0.05],
          ],
          '#6a6254',
          [0, 0, 0.025],
          0.008,
        );
        ear.scale.set(side < 0 ? 0.91 : 1.1, side < 0 ? 1.06 : 0.89, 1);
        e.finish();
      }
      // Mineral plates are embedded in the scalp, not a separate ball helmet.
      for (let i = 0; i < 7; i++) {
        const a = (i / 6 - 0.5) * 2.5,
          wear = 0.82 + 0.22 * Math.sin(i * 2.7);
        s.add(
          'rock',
          i % 2 ? '#555f53' : P.skin,
          [
            Math.sin(a) * 0.123,
            0.119 + Math.cos(a) * 0.02,
            -0.033 + 0.013 * Math.sin(i * 1.4),
          ],
          [0.047 * wear, 0.035 + 0.01 * Math.sin(i * 3), 0.052 * wear],
          [0.11 * Math.sin(i), a, 0.2 + 0.17 * Math.cos(i)],
        );
      }
      // Flattened embedded mineral flakes on one temple and a healed cheek scar.
      s.add(
        'rock',
        '#596557',
        [-0.145, 0.068, 0.034],
        [0.031, 0.048, 0.018],
        [0, -0.4, -0.25],
      );
      s.add(
        'rock',
        '#6c7867',
        [-0.157, 0.019, 0.034],
        [0.026, 0.028, 0.018],
        [0.2, -0.4, 0.25],
      );
      s.link('#596757', [0.111, -0.013, 0.132], [0.095, -0.05, 0.154], 0.0035);
      s.link(P.leather, [-0.147, 0.1, 0.023], [0.146, 0.1, 0.023], 0.018);
      s.add(
        'box',
        P.copper,
        [0, 0.11, 0.123],
        [0.052, 0.042, 0.018],
        [0, 0, 0],
        'metal',
      );
      s.add(
        'round',
        P.amber,
        [0, 0.11, 0.139],
        [0.016, 0.015, 0.005],
        [0, 0, 0],
        'amber',
      );
    } else if (kind === 'brute') {
      s.add('rock', P.dark, [0, 0, 0], [0.165, 0.151, 0.145]);
      for (const side of [-1, 1]) {
        s.add(
          'rock',
          P.stoneLight,
          [side * 0.08, 0.027, 0.074],
          [0.091, 0.104, 0.107],
          [0.08, side * 0.28, side * 0.12],
        );
        s.add(
          'rock',
          P.stone,
          [side * 0.088, -0.069, 0.095],
          [0.08, 0.068, 0.074],
          [0, 0, side * 0.23],
        );
        s.add(
          'box',
          P.amber,
          [side * 0.057, 0.009, 0.172],
          [0.047, 0.013, 0.012],
          [0, 0, -side * 0.14],
          'amber',
        );
        s.link(
          P.stoneLight,
          [side * 0.025, 0.048, 0.163],
          [side * 0.11, 0.063, 0.145],
          0.02,
        );
      }
      s.add(
        'rock',
        P.stone,
        [0, 0.116, -0.017],
        [0.107, 0.063, 0.11],
        [0.13, 0.3, 0.14],
      );
      s.add('rock', P.stoneLight, [0, -0.105, 0.068], [0.109, 0.055, 0.083]);
      s.link(
        P.amber,
        [-0.025, 0.134, 0.016],
        [0.002, 0.072, 0.137],
        0.006,
        'amber',
      );
      s.link(
        P.amber,
        [0.002, 0.072, 0.137],
        [0.005, 0.024, 0.17],
        0.005,
        'amber',
      );
      s.add('box', P.dark, [0, -0.066, 0.163], [0.07, 0.018, 0.008]);
    } else if (kind === 'guard') {
      s.add(
        'round',
        P.iron,
        [0, 0, 0],
        [0.126, 0.15, 0.115],
        [0, 0, 0],
        'metal',
      );
      // Raised copper helmet plates wrap the volume; slit is recessed in front.
      for (const side of [-1, 1]) {
        s.add(
          'round',
          spec.metal,
          [side * 0.057, 0.025, -0.004],
          [0.074, 0.124, 0.112],
          [0, 0, side * 0.16],
          'metal',
        );
        s.add(
          'box',
          P.iron,
          [side * 0.083, -0.073, 0.07],
          [0.071, 0.14, 0.065],
          [0, side * -0.28, side * 0.12],
          'metal',
        );
        s.link(
          P.gold,
          [side * 0.113, -0.116, 0.102],
          [side * 0.118, 0.006, 0.076],
          0.008,
          'metal',
        );
      }
      s.add('box', P.dark, [0, 0.004, 0.106], [0.163, 0.037, 0.028]);
      s.add(
        'box',
        P.copper,
        [0, -0.05, 0.134],
        [0.027, 0.152, 0.024],
        [0.05, 0, 0],
        'metal',
      );
      s.add(
        'box',
        P.edge,
        [0, 0.132, 0.003],
        [0.021, 0.055, 0.21],
        [0.1, 0, 0],
        'metal',
      );
      relief(
        s,
        [
          [-0.02, 0.12],
          [0, 0.228],
          [0.035, 0.125],
        ],
        P.iron,
        [0, 0, -0.008],
        0.033,
        'metal',
      );
      s.rivets(
        [
          [-0.07, -0.11, 0.108],
          [0.07, -0.11, 0.108],
          [-0.1, 0.05, 0.09],
          [0.1, 0.05, 0.09],
        ],
        0.009,
      );
    } else {
      const invader = kind === 'invader',
        hood = invader ? '#b8ac8e' : P.purple;
      // Open-faced, pointed hood built as separate draped lobes around a face.
      s.add('round', P.dark, [0, -0.01, 0.0], [0.109, 0.14, 0.104]);
      s.add('round', spec.skin, [0, -0.047, 0.097], [0.065, 0.074, 0.038]);
      for (const side of [-1, 1]) {
        s.add(
          'round',
          hood,
          [side * 0.077, 0.02, -0.012],
          [0.081, 0.155, 0.108],
          [0, side * 0.1, side * 0.22],
        );
        s.link(
          invader ? P.bone : P.purpleLight,
          [side * 0.084, -0.097, 0.094],
          [side * 0.102, 0.044, 0.1],
          0.018,
        );
        s.add(
          'round',
          invader ? P.dark : P.teal,
          [side * 0.036, -0.013, 0.13],
          [0.013, 0.009, 0.007],
          [0, 0, 0],
          invader ? 'surface' : 'teal',
        );
      }
      s.add('round', hood, [0, 0.113, -0.01], [0.09, 0.09, 0.108], [0.2, 0, 0]);
      relief(
        s,
        [
          [-0.065, 0.11],
          [0.006, 0.225],
          [0.08, 0.105],
        ],
        hood,
        [0, 0, -0.015],
        0.12,
      );
      s.add('round', spec.skin, [0, -0.052, 0.139], [0.018, 0.031, 0.022]);
      if (invader) {
        s.add('round', P.saffron, [0, -0.11, 0.055], [0.13, 0.071, 0.12]);
        s.link(P.gold, [-0.106, -0.102, 0.112], [0.1, -0.135, 0.12], 0.017);
      } else {
        s.add('box', P.dark, [0, -0.095, 0.111], [0.05, 0.03, 0.01]);
        s.add(
          'cone',
          '#8d9585',
          [0, -0.117, 0.091],
          [0.027, 0.083, 0.023],
          [0.2, 0, 0],
        );
      }
    }
    s.finish();
  }

  function makeTorso(
    kind: UnitKind,
    spec: RigSpec,
    torso: THREE.Group,
    pelvis: THREE.Group,
  ) {
    const s = new Sculpt(torso),
      p = new Sculpt(pelvis),
      b = spec.bulk;
    const worker = kind === 'worker',
      brute = kind === 'brute',
      robe = kind === 'scholar' || kind === 'invader';
    s.add(
      brute ? 'rock' : 'round',
      brute ? P.dark : spec.cloth,
      [0, -0.018, -0.006],
      [0.176 * b, 0.218, 0.125 * b],
      [0.025, 0, 0],
    );
    if (brute) {
      for (const side of [-1, 1]) {
        s.add(
          'rock',
          P.stoneLight,
          [side * 0.136, 0.079, 0.052],
          [0.178, 0.157, 0.13],
          [0.09, side * 0.25, -side * 0.14],
        );
        s.add(
          'rock',
          P.stone,
          [side * 0.137, -0.104, 0.046],
          [0.144, 0.104, 0.139],
          [0.12, -side * 0.1, side * 0.2],
        );
        s.add(
          'rock',
          P.stoneLight,
          [side * 0.151, 0.125, -0.116],
          [0.165, 0.099, 0.148],
          [0.2, side * 0.35, 0],
        );
        s.link(
          P.amber,
          [side * 0.019, 0.136, 0.155],
          [side * 0.036, 0.024, 0.17],
          0.007,
          'amber',
        );
        s.link(
          P.amber,
          [side * 0.036, 0.024, 0.17],
          [side * 0.106, -0.025, 0.142],
          0.006,
          'amber',
        );
      }
      s.add(
        'rock',
        P.stoneLight,
        [0, -0.146, 0.105],
        [0.118, 0.106, 0.108],
        [0, 0.4, 0.15],
      );
      s.add(
        'rock',
        P.stone,
        [0, 0.111, -0.146],
        [0.123, 0.116, 0.092],
        [0.2, 0.2, 0],
      );
      p.add('rock', P.stone, [0, 0.01, 0], [0.246, 0.123, 0.145], [0, 0.2, 0]);
      p.add('rock', P.stoneLight, [0, -0.071, 0.071], [0.149, 0.085, 0.108]);
    } else if (worker) {
      // Broad shoulder harness, buckles, pick-worn work apron and rear satchel.
      for (const side of [-1, 1]) {
        s.add(
          'box',
          P.leather,
          [side * 0.12, 0.005, 0.106],
          [0.055, 0.35, 0.03],
          [0, 0, -side * 0.13],
        );
        s.add(
          'box',
          P.copper,
          [side * 0.126, 0.075, 0.134],
          [0.063, 0.058, 0.014],
          [0, 0, -side * 0.1],
          'metal',
        );
        s.add(
          'box',
          P.seam,
          [side * 0.126, 0.075, 0.144],
          [0.035, 0.029, 0.009],
        );
        s.rivets(
          [
            [side * 0.116, -0.049, 0.132],
            [side * 0.108, -0.1, 0.139],
          ],
          0.009,
        );
      }
      s.add(
        'box',
        '#71533b',
        [0, -0.11, 0.095],
        [0.254, 0.171, 0.046],
        [0.03, 0, 0],
      );
      s.link(P.stitch, [-0.115, -0.04, 0.13], [0.115, -0.04, 0.13], 0.004);
      s.add(
        'box',
        P.leather,
        [0, 0.013, -0.157],
        [0.26, 0.25, 0.13],
        [0.1, 0, 0],
      );
      s.add(
        'box',
        '#72563c',
        [0, 0.074, -0.232],
        [0.271, 0.094, 0.03],
        [0.08, 0, 0],
      );
      s.add(
        'box',
        P.copper,
        [0, 0.011, -0.235],
        [0.042, 0.052, 0.012],
        [0, 0, 0],
        'metal',
      );
      for (const side of [-1, 1])
        s.add(
          'box',
          P.leather,
          [side * 0.12, -0.04, -0.197],
          [0.045, 0.195, 0.08],
        );
      s.add(
        'cylinder',
        '#8a795c',
        [0, 0.156, -0.142],
        [0.054, 0.29, 0.054],
        [0, 0, Math.PI / 2],
      );
      for (const side of [-1, 1])
        s.add(
          'torus',
          P.leather,
          [side * 0.08, 0.156, -0.142],
          [0.056, 0.056, 0.09],
          [0, Math.PI / 2, 0],
        );
      p.add('round', P.leather, [0, 0.015, 0], [0.176, 0.108, 0.118]);
      armorBands(p, 0.044, 0.31, 0.117, P.copper);
      p.add(
        'box',
        P.gold,
        [0, 0.044, 0.137],
        [0.054, 0.061, 0.015],
        [0, 0, 0],
        'metal',
      );
    } else {
      if (robe) {
        const robeColor = kind === 'scholar' ? P.purple : '#a4997e';
        // Thick hanging fabric panels have actual volume, folds and an open slit.
        for (const side of [-1, 1]) {
          relief(
            p,
            [
              [side * 0.018, 0.09],
              [side * 0.14, 0.05],
              [side * 0.17, -0.29],
              [side * 0.075, -0.34],
              [side * 0.015, -0.21],
            ],
            robeColor,
            [0, 0, 0.052],
            0.05,
          );
          p.link(
            kind === 'scholar' ? P.purpleLight : P.bone,
            [side * 0.043, 0.03, 0.085],
            [side * 0.106, -0.276, 0.09],
            0.013,
          );
          s.link(
            kind === 'scholar' ? P.purpleLight : P.bone,
            [side * 0.103, 0.174, 0.06],
            [side * 0.076, -0.14, 0.123],
            0.013,
          );
        }
        s.add('round', robeColor, [0, 0.17, -0.016], [0.175, 0.087, 0.136]);
        s.add(
          'torus',
          spec.metal,
          [0, 0.103, 0.134],
          [0.04, 0.04, 0.08],
          [0, 0, 0],
          'metal',
        );
        s.add(
          'rock',
          kind === 'scholar' ? P.teal : P.gold,
          [0, 0.095, 0.154],
          [0.016, 0.035, 0.013],
          [0, 0, 0],
          kind === 'scholar' ? 'teal' : 'metal',
        );
      } else {
        // Convex breastplate with raised overlapping flutes and a rolled edge.
        s.add(
          'round',
          spec.metal,
          [0, 0.029, 0.045],
          [0.181, 0.2, 0.124],
          [0, 0, 0],
          'metal',
        );
        for (const side of [-1, 1]) {
          s.link(
            P.gold,
            [side * 0.155, 0.137, 0.092],
            [side * 0.125, -0.089, 0.128],
            0.009,
            'metal',
          );
          s.add(
            'box',
            P.iron,
            [side * 0.172, -0.014, -0.02],
            [0.055, 0.27, 0.185],
            [0, 0, -side * 0.11],
            'metal',
          );
        }
        s.link(P.copper, [0, 0.17, 0.143], [0, -0.115, 0.167], 0.014, 'metal');
        armorBands(s, -0.136, 0.266, 0.108, P.iron);
        for (let i = 0; i < 3; i++)
          p.add(
            'box',
            i % 2 ? P.iron : spec.metal,
            [0, -0.025 - i * 0.032, 0.07],
            [0.287 - i * 0.022, 0.066, 0.113],
            [0.04, 0, 0],
            'metal',
          );
        for (const side of [-1, 1])
          relief(
            p,
            [
              [side * 0.02, -0.025],
              [side * 0.138, -0.02],
              [side * 0.144, -0.2],
              [side * 0.043, -0.225],
            ],
            spec.metal,
            [0, 0, 0.107],
            0.025,
            'metal',
          );
      }
      s.add(
        'box',
        P.leather,
        [0, -0.143, 0.098],
        [0.284, 0.051, 0.03],
        [0, 0, 0.06],
      );
      s.add(
        'box',
        P.gold,
        [0, -0.143, 0.123],
        [0.054, 0.058, 0.015],
        [0, 0, 0.06],
        'metal',
      );
      if (kind === 'scholar') {
        s.add(
          'box',
          P.leather,
          [-0.16, -0.171, 0.04],
          [0.085, 0.103, 0.065],
          [0, 0, -0.13],
        );
        s.add(
          'cylinder',
          P.bone,
          [0.158, -0.09, 0.064],
          [0.021, 0.16, 0.021],
          [0, 0, 0.17],
        );
        s.add(
          'torus',
          P.copper,
          [0.158, -0.109, 0.064],
          [0.024, 0.024, 0.04],
          [Math.PI / 2, 0, 0.17],
          'metal',
        );
      }
    }
    s.finish();
    p.finish();
  }
  function makeCape(kind: UnitKind, torso: THREE.Group): THREE.Group | null {
    if (kind === 'worker' || kind === 'brute') return null;
    const n = joint(torso, 'cape', [0, 0.146, -0.094]),
      s = new Sculpt(n);
    const cloth =
      kind === 'guard' ? '#514337' : kind === 'scholar' ? P.purple : '#b1a386';
    const w = kind === 'guard' ? 0.16 : 0.185,
      len = kind === 'guard' ? 0.46 : 0.65;
    relief(
      s,
      [
        [-w, 0.02],
        [w, 0.02],
        [w * 1.2, -len * 0.68],
        [w * 0.93, -len],
        [w * 0.45, -len * 0.94],
        [w * 0.16, -len * 1.02],
        [-w * 0.16, -len * 0.95],
        [-w * 0.69, -len],
        [-w * 1.14, -len * 0.89],
      ],
      cloth,
      [0, 0, -0.045],
      0.035,
      'surface',
      [0.1, 0, 0],
    );
    for (const side of [-1, 1]) {
      s.link(
        kind === 'scholar' ? P.purpleLight : cloth,
        [side * w * 0.6, -0.045, -0.074],
        [side * w * 0.8, -len * 0.89, -0.124],
        0.018,
      );
      s.link(
        kind === 'scholar' ? '#3b303f' : '#746957',
        [side * w * 0.3, -0.02, -0.068],
        [side * w * 0.4, -len * 0.92, -0.137],
        0.01,
      );
    }
    s.finish();
    return n;
  }
  function makeArm(
    kind: UnitKind,
    spec: RigSpec,
    torso: THREE.Group,
    side: number,
  ) {
    const suffix = side < 0 ? 'L' : 'R',
      upper = joint(torso, 'arm' + suffix, [
        side * spec.width,
        spec.shoulder - spec.chest,
        0,
      ]);
    const lower = joint(upper, 'fore' + suffix, [0, -spec.arm, 0]);
    const u = new Sculpt(upper),
      f = new Sculpt(lower),
      worker = kind === 'worker',
      brute = kind === 'brute';
    const armor = kind === 'guard' || kind === 'invader',
      width =
        ((brute ? 0.106 : worker ? 0.075 : 0.054) * spec.bulk) /
        (brute ? 1.2 : 1);
    const finish: Finish = armor ? 'metal' : 'surface';
    const tint = brute
      ? P.stone
      : worker
        ? P.skin
        : armor
          ? P.iron
          : spec.cloth;
    u.add(
      brute ? 'rock' : 'round',
      tint,
      [0, -spec.arm * 0.49, 0],
      [width, spec.arm * 0.62, width * 0.91],
      [0, 0, side * 0.04],
      finish,
    );
    if (brute) {
      u.add(
        'rock',
        P.stoneLight,
        [side * 0.027, 0.015, 0],
        [0.153, 0.132, 0.142],
        [0.2, side * 0.14, side * 0.3],
      );
      u.add(
        'rock',
        P.stone,
        [side * 0.01, -0.155, 0.022],
        [0.109, 0.12, 0.113],
        [0.2, 0.1, -side * 0.3],
      );
      u.link(
        P.amber,
        [side * 0.03, 0.024, 0.128],
        [side * 0.01, -0.085, 0.118],
        0.006,
        'amber',
      );
    } else if (worker || armor) {
      u.add(
        worker ? 'organic' : 'round',
        worker ? '#554b38' : spec.metal,
        [
          side * 0.019,
          worker ? (side < 0 ? -0.018 : -0.005) : -0.002,
          worker ? -0.008 : 0,
        ],
        [
          width * (worker ? (side < 0 ? 1.36 : 1.45) : 1.5),
          worker ? (side < 0 ? 0.064 : 0.072) : 0.09,
          width * (worker ? 1.2 : 1.48),
        ],
        [
          worker ? side * 0.13 : 0,
          worker ? side * 0.2 : 0,
          -side * (worker ? 0.32 : 0.22),
        ],
        worker ? 'surface' : 'metal',
        worker ? 0.1 : 0.035,
      );
      if (worker) {
        u.add(
          'organic',
          '#71614a',
          [side * 0.016, -0.03, 0.046],
          [width * 0.85, 0.045, 0.02],
          [0.12, side * 0.12, side * 0.1],
          'surface',
          0.09,
        );
        u.link(
          '#302f25',
          [side * 0.066, -0.018, 0.021],
          [side * 0.055, -0.055, 0.045],
          0.004,
        );
        u.link(
          '#302f25',
          [-side * 0.026, 0.009, 0.052],
          [-side * 0.016, -0.023, 0.066],
          0.0035,
        );
      }
      u.link(
        worker ? P.stitch : P.gold,
        [side * 0.07, -0.065, 0.055],
        [0, -0.055, 0.09],
        0.007,
        worker ? 'surface' : 'metal',
      );
      if (armor)
        u.rivets(
          [
            [side * 0.072, 0.01, 0.042],
            [side * 0.053, -0.044, 0.068],
          ],
          0.009,
        );
    } else {
      u.add(
        'round',
        P.purpleLight,
        [0, -0.042, 0],
        [width * 1.34, 0.092, width * 1.3],
        [0, 0, side * 0.1],
      );
    }
    f.add(
      brute ? 'rock' : 'round',
      tint,
      [0, -spec.forearm * 0.43, 0.01],
      [width * 0.91, spec.forearm * 0.57, width * 0.9],
      [0, 0, 0],
      finish,
    );
    if (brute) {
      f.add(
        'rock',
        P.stoneLight,
        [side * 0.025, -0.061, 0.043],
        [0.13, 0.131, 0.105],
        [0.15, 0.2, -side * 0.15],
      );
      f.add('rock', P.stone, [0, -0.157, -0.018], [0.113, 0.092, 0.101]);
    } else {
      f.add(
        'box',
        worker ? P.leather : spec.metal,
        [0, -spec.forearm * 0.54, 0.034],
        [width * 1.85, spec.forearm * 0.58, width * 1.21],
        [0.04, 0, 0],
        worker ? 'surface' : armor ? 'metal' : 'surface',
      );
      armorBands(
        f,
        -spec.forearm * 0.73,
        width * 1.8,
        0.07,
        worker ? P.copper : spec.metal,
        worker ? 'surface' : finish,
      );
    }
    hand(f, kind, -spec.forearm, 0.049 * spec.bulk, side);
    u.finish();
    f.finish();
    upper.rotation.z = side * 0.105;
    lower.rotation.x = -0.1;
    return {
      upper,
      lower,
      grip: joint(lower, 'grip' + suffix, [0, -spec.forearm, 0.035]),
    };
  }
  function makeLeg(
    kind: UnitKind,
    spec: RigSpec,
    pelvis: THREE.Group,
    side: number,
  ) {
    const suffix = side < 0 ? 'L' : 'R',
      upper = joint(pelvis, 'leg' + suffix, [side * spec.legX, 0, 0]);
    const lower = joint(upper, 'shin' + suffix, [0, -spec.thigh, 0]);
    const u = new Sculpt(upper),
      s = new Sculpt(lower),
      brute = kind === 'brute';
    const armor = kind === 'guard' || kind === 'invader',
      worker = kind === 'worker';
    const width =
        (brute ? 0.1 : worker ? 0.07 : 0.057) * (brute ? 1.3 : spec.bulk),
      finish: Finish = armor ? 'metal' : 'surface';
    u.add(
      brute ? 'rock' : 'round',
      brute ? P.stone : armor ? P.iron : worker ? '#65513d' : spec.cloth,
      [0, -spec.thigh * 0.46, 0],
      [width, spec.thigh * 0.64, width * 0.95],
      [0, 0, -side * 0.02],
      finish,
    );
    s.add(
      brute ? 'rock' : 'round',
      brute ? P.stone : P.leather,
      [0, -spec.shin * 0.44, -0.004],
      [width * 0.81, spec.shin * 0.59, width * 0.82],
      [0, 0, 0],
      finish,
    );
    s.add(
      brute ? 'rock' : 'round',
      brute ? P.stoneLight : armor ? spec.metal : P.leather,
      [0, 0.005, 0.027],
      [width * 1.15, 0.065, width * 0.86],
      [0, 0, 0],
      finish,
    );
    s.add(
      brute ? 'rock' : 'box',
      brute ? P.stoneLight : armor ? P.iron : '#493b2d',
      [0, -spec.shin + 0.012, 0.044],
      [width * 1.9, 0.074, width * 2.38],
      [0.06, 0, 0],
      finish,
    );
    if (brute) {
      s.add(
        'rock',
        P.stone,
        [side * 0.045, -0.05, 0.005],
        [0.089, 0.08, 0.091],
        [0.2, 0.4, 0.3],
      );
      for (let i = 0; i < 3; i++)
        s.add(
          'rock',
          P.stoneLight,
          [(i - 1) * 0.075, -spec.shin + 0.005, 0.122],
          [0.042, 0.043, 0.064],
          [0.1, i * 0.1, 0],
        );
    } else {
      s.add(
        'box',
        armor ? P.copper : '#302b24',
        [0, -spec.shin - 0.016, 0.046],
        [width * 1.97, 0.021, width * 2.4],
        [0, 0, 0],
        finish,
      );
      for (const y of [-0.065, -0.12])
        if (-y < spec.shin - 0.01)
          armorBands(
            s,
            y,
            width * 1.47,
            0.042,
            armor ? spec.metal : '#8b7350',
            finish,
          );
      if (armor)
        s.link(
          P.edge,
          [0, -0.047, 0.055],
          [0, -spec.shin + 0.069, 0.057],
          0.007,
          'metal',
        );
    }
    u.finish();
    s.finish();
    return { upper, lower };
  }
  function makeEquipment(
    kind: UnitKind,
    right: THREE.Group,
    left: THREE.Group,
  ) {
    const n = joint(right, 'weapon', [0, 0, 0]),
      s = new Sculpt(n);
    if (kind === 'worker') {
      s.link(P.wood, [0, -0.15, 0], [0, 0.39, 0], 0.021);
      for (let i = 0; i < 4; i++)
        s.add(
          'torus',
          P.leather,
          [0, 0.025 + i * 0.024, 0],
          [0.024, 0.024, 0.04],
          [Math.PI / 2, 0, 0],
        );
      s.add(
        'box',
        P.copper,
        [0, 0.345, 0],
        [0.083, 0.115, 0.055],
        [0, 0, 0.08],
        'metal',
      );
      relief(
        s,
        [
          [-0.25, 0.26],
          [-0.19, 0.34],
          [-0.07, 0.397],
          [0.06, 0.403],
          [0.19, 0.363],
          [0.282, 0.245],
          [0.168, 0.311],
          [0.05, 0.33],
          [-0.08, 0.333],
          [-0.185, 0.304],
        ],
        P.iron,
        [0, 0, 0],
        0.05,
        'metal',
      );
      s.link(
        P.edge,
        [-0.244, 0.264, 0.031],
        [-0.079, 0.346, 0.031],
        0.005,
        'metal',
      );
      s.link(
        P.edge,
        [0.104, 0.33, 0.031],
        [0.266, 0.256, 0.031],
        0.005,
        'metal',
      );
      s.rivets(
        [
          [0, 0.328, 0.036],
          [0, 0.374, 0.036],
        ],
        0.01,
      );
      n.rotation.z = -0.28;
    } else if (kind === 'guard') {
      s.link(P.wood, [0, -0.28, 0], [0, 0.71, 0], 0.018);
      for (const y of [-0.15, 0.1, 0.5])
        s.add(
          'cylinder',
          P.copper,
          [0, y, 0],
          [0.024, 0.045, 0.024],
          [0, 0, 0],
          'metal',
        );
      relief(
        s,
        [
          [-0.06, 0.665],
          [-0.028, 0.823],
          [0, 0.932],
          [0.037, 0.796],
          [0.057, 0.661],
          [0, 0.714],
        ],
        P.iron,
        [0, 0, 0],
        0.035,
        'metal',
      );
      s.link(P.edge, [0, 0.72, 0.024], [0, 0.905, 0.024], 0.008, 'metal');
      s.add(
        'cone',
        P.iron,
        [0, -0.308, 0],
        [0.019, 0.09, 0.019],
        [Math.PI, 0, 0],
        'metal',
      );
      const shield = joint(left, 'shield', [0, -0.005, 0.077]),
        sh = new Sculpt(shield);
      const outline: readonly (readonly [number, number])[] = [
        [-0.142, 0.181],
        [0, 0.218],
        [0.142, 0.181],
        [0.134, -0.1],
        [0.075, -0.208],
        [0, -0.244],
        [-0.092, -0.195],
        [-0.14, -0.08],
      ];
      relief(sh, outline, P.copper, [0, 0, 0], 0.05, 'metal');
      relief(
        sh,
        outline.map(([x, y]) => [x * 0.84, y * 0.86] as const),
        P.iron,
        [0, 0, 0.032],
        0.021,
        'metal',
      );
      sh.add(
        'round',
        P.copper,
        [0, 0, 0.061],
        [0.063, 0.078, 0.027],
        [0, 0, 0],
        'metal',
      );
      sh.link(P.gold, [0, 0.17, 0.06], [0, -0.171, 0.059], 0.012, 'metal');
      sh.rivets(
        [
          [-0.1, 0.139, 0.058],
          [0.1, 0.139, 0.058],
          [-0.103, -0.058, 0.058],
          [0.103, -0.058, 0.058],
          [0, -0.192, 0.05],
        ],
        0.011,
      );
      sh.finish();
      shield.rotation.y = -0.18;
    } else if (kind === 'scholar') {
      s.link(P.wood, [0, -0.28, 0], [0, 0.68, 0], 0.023);
      for (let i = 0; i < 3; i++)
        s.add(
          'cylinder',
          P.copper,
          [0, 0.43 + i * 0.065, 0],
          [0.031, 0.026, 0.031],
          [0, 0, 0],
          'metal',
        );
      for (const side of [-1, 1]) {
        s.link(P.gold, [0, 0.65, 0], [side * 0.068, 0.74, 0], 0.013, 'metal');
        s.link(
          P.gold,
          [side * 0.068, 0.74, 0],
          [side * 0.051, 0.83, 0],
          0.01,
          'metal',
        );
      }
      s.add(
        'rock',
        P.teal,
        [0, 0.772, 0],
        [0.047, 0.1, 0.044],
        [0, 0.3, 0],
        'teal',
      );
      const book = joint(left, 'book', [0, 0.035, 0.07]),
        bk = new Sculpt(book);
      for (const side of [-1, 1]) {
        bk.add(
          'box',
          P.leather,
          [side * 0.065, 0, 0],
          [0.135, 0.023, 0.172],
          [0, 0, side * 0.1],
        );
        bk.add(
          'box',
          P.bone,
          [side * 0.064, 0.019, 0],
          [0.116, 0.025, 0.148],
          [0, 0, side * 0.1],
        );
        for (let i = 0; i < 4; i++)
          bk.link(
            '#8b7958',
            [side * 0.017, 0.038, -0.054 + i * 0.027],
            [side * 0.108, 0.045, -0.054 + i * 0.027],
            0.0028,
          );
      }
      bk.add(
        'box',
        P.copper,
        [0, 0.003, 0],
        [0.015, 0.037, 0.177],
        [0, 0, 0],
        'metal',
      );
      bk.finish();
    } else if (kind === 'invader') {
      s.link(P.leather, [0, -0.072, 0], [0, 0.087, 0], 0.019);
      s.add(
        'round',
        P.copper,
        [0, -0.077, 0],
        [0.029, 0.032, 0.025],
        [0, 0, 0],
        'metal',
      );
      s.add(
        'box',
        P.copper,
        [0, 0.089, 0],
        [0.18, 0.022, 0.038],
        [0, 0, 0.04],
        'metal',
      );
      relief(
        s,
        [
          [-0.034, 0.105],
          [-0.028, 0.523],
          [0, 0.656],
          [0.03, 0.532],
          [0.034, 0.105],
        ],
        P.edge,
        [0, 0, 0],
        0.02,
        'metal',
      );
      s.link(P.iron, [0, 0.117, 0.016], [0, 0.603, 0.016], 0.008, 'metal');
      n.rotation.x = -0.48;
      n.rotation.z = -0.17;
      const knife = joint(left, 'knife', [0, -0.01, 0.015]),
        k = new Sculpt(knife);
      k.add('box', P.leather, [0, -0.015, 0], [0.033, 0.11, 0.03]);
      relief(
        k,
        [
          [-0.022, -0.065],
          [0.01, -0.26],
          [0.036, -0.07],
        ],
        P.iron,
        [0, 0, 0],
        0.015,
        'metal',
      );
      k.finish();
    }
    s.finish();
    return n;
  }

  const templates = new Map<UnitKind, { root: THREE.Group; height: number }>();
  for (const kind of Object.keys(SPECS) as UnitKind[]) {
    const spec = SPECS[kind],
      root = new THREE.Group();
    root.name = 'Kluftkrone.' + kind;
    const motion = joint(root, 'motion', [0, 0, 0]),
      pelvis = joint(motion, 'pelvis', [0, spec.hip, 0]);
    const torso = joint(pelvis, 'torso', [0, spec.chest - spec.hip, 0]);
    const head = joint(torso, 'head', [0, spec.head - spec.chest, 0.016]);
    makeTorso(kind, spec, torso, pelvis);
    makeHead(kind, spec, head);
    makeCape(kind, torso);
    const left = makeArm(kind, spec, torso, -1),
      right = makeArm(kind, spec, torso, 1);
    makeLeg(kind, spec, pelvis, -1);
    makeLeg(kind, spec, pelvis, 1);
    makeEquipment(kind, right.grip, left.grip);
    if (kind === 'scholar') left.upper.rotation.x = -0.52;
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const modelScale = spec.height / (bounds.max.y - bounds.min.y);
    motion.position.y = -bounds.min.y;
    root.scale.setScalar(modelScale);
    root.userData.kind = kind;
    root.userData.forwardAxis = '+Z';
    root.userData.height = spec.height;
    let meshes = 0,
      triangles = 0;
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        meshes++;
        triangles +=
          (o.geometry.index?.count ??
            o.geometry.getAttribute('position').count) / 3;
        o.userData.kind = kind;
      }
    });
    root.userData.drawCalls = meshes;
    root.userData.triangles = triangles;
    templates.set(kind, { root, height: spec.height });
  }

  function create(kind: UnitKind): CreatureModel {
    if (disposed) throw new Error('Creature model factory has been disposed');
    const template = templates.get(kind);
    if (!template)
      throw new Error('Unknown Kluftkrone creature kind: ' + String(kind));
    const root = template.root.clone(true),
      spec = SPECS[kind];
    const bone = (name: string) => root.getObjectByName(name) as THREE.Group;
    const motion = bone('motion'),
      pelvis = bone('pelvis'),
      torso = bone('torso'),
      head = bone('head');
    const armL = bone('armL'),
      armR = bone('armR'),
      foreL = bone('foreL'),
      foreR = bone('foreR');
    const legL = bone('legL'),
      legR = bone('legR'),
      shinL = bone('shinL'),
      shinR = bone('shinR');
    const cape = bone('cape'),
      earL = bone('earL'),
      earR = bone('earR'),
      weapon = bone('weapon');
    const baseY = motion.position.y,
      weaponX = weapon.rotation.x,
      weaponZ = weapon.rotation.z;
    const phase = (++sequence * 2.3999632297) % (Math.PI * 2);
    let lastTime = NaN,
      walk = 0,
      work = 0,
      fight = 0,
      sleep = 0,
      eat = 0,
      study = 0;
    let previousJob = '',
      digJob = false,
      fightJob = false,
      sleepJob = false,
      eatJob = false,
      studyJob = false;
    const clamp = (x: number) => Math.max(0, Math.min(1, x));
    function animate(time: number, speed: number, job: string, health: number) {
      if (disposed) return;
      const t = Number.isFinite(time) ? time : 0;
      const dt = Number.isFinite(lastTime)
        ? Math.min(0.08, Math.max(0, t - lastTime))
        : 1 / 60;
      lastTime = t;
      const blend = 1 - Math.exp(-dt * 10),
        velocity = Number.isFinite(speed) ? Math.abs(speed) : 0;
      if (job !== previousJob) {
        previousJob = job;
        const label = (job ?? '').toLowerCase();
        digJob =
          /gräb|grab|baut gold ab|schürf|dig|mining|claim|beansprucht|abbau/.test(
            label,
          );
        fightJob = /kampf|greift an|trainier|attack|fight|zerstört/.test(label);
        sleepJob = /schläf|schlaf|sleep|ruht|rest/.test(label);
        eatJob = /isst|essen|eat/.test(label);
        studyJob = /forsch|studier|liest|research|study|schmied|errichtet/.test(
          label,
        );
      }
      const stationary = 1 - clamp(velocity * 2);
      walk += (clamp(velocity / 1.2) - walk) * blend;
      work += ((digJob ? stationary : 0) - work) * blend;
      fight += ((fightJob ? 1 : 0) - fight) * blend;
      sleep += ((sleepJob ? stationary : 0) - sleep) * blend;
      eat += ((eatJob ? stationary : 0) - eat) * blend;
      study += ((studyJob ? stationary : 0) - study) * blend;
      const hp = Number.isFinite(health) ? clamp(health) : 1;
      const exhausted = (1 - hp) * 0.15;
      const gait =
        t * (kind === 'brute' ? 5.3 : kind === 'worker' ? 9.0 : 7.1) + phase;
      const stride = Math.sin(gait),
        opposite = -stride,
        breathe = Math.sin(t * 2.1 + phase);
      const active = walk * (1 - sleep),
        step = active * (kind === 'brute' ? 0.4 : 0.65);
      const kneeL = Math.max(0, -stride) * active * 0.85,
        kneeR = Math.max(0, stride) * active * 0.85;
      motion.position.y =
        baseY +
        Math.abs(Math.sin(gait)) * active * (kind === 'brute' ? 0.023 : 0.027) +
        breathe * 0.004 -
        sleep * spec.hip * 0.37;
      motion.rotation.x = 0;
      motion.rotation.z =
        Math.sin(gait) * active * (kind === 'brute' ? 0.028 : 0.016);
      pelvis.rotation.y = Math.sin(gait) * active * 0.075;
      torso.rotation.set(
        exhausted + active * 0.07 + sleep * 0.24,
        Math.sin(gait) * active * -0.075,
        Math.sin(t * 0.79 + phase) * 0.008,
      );
      head.rotation.set(
        -exhausted * 0.5 + Math.sin(t * 1.2 + phase) * 0.025 + sleep * 0.31,
        Math.sin(t * 0.62 + phase) * 0.072,
        0,
      );
      armL.rotation.set(
        opposite * step * 0.72 - (kind === 'scholar' ? 0.45 : 0),
        0,
        -0.105,
      );
      armR.rotation.set(stride * step * 0.72, 0, 0.105);
      foreL.rotation.set(-0.13 - Math.max(0, stride) * active * 0.3, 0, 0);
      foreR.rotation.set(-0.13 - Math.max(0, opposite) * active * 0.3, 0, 0);
      legL.rotation.set(stride * step - sleep * 0.95, 0, 0);
      legR.rotation.set(opposite * step - sleep * 0.95, 0, 0);
      shinL.rotation.set(kneeL + sleep * 1.25, 0, 0);
      shinR.rotation.set(kneeR + sleep * 1.25, 0, 0);
      weapon.rotation.x = weaponX;
      weapon.rotation.z = weaponZ;
      if (work > 0.001) {
        const swing = Math.sin(t * 5.8 + phase),
          lift = 0.5 + 0.5 * swing;
        const right = -0.35 - lift * 1.65,
          left = -0.65 - lift * 1.2;
        armR.rotation.x += (right - armR.rotation.x) * work;
        armL.rotation.x += (left - armL.rotation.x) * work;
        armR.rotation.z += work * 0.12;
        armL.rotation.z += work * 0.4;
        foreR.rotation.x +=
          (-0.4 - (1 - lift) * 0.65 - foreR.rotation.x) * work;
        foreL.rotation.x +=
          (-0.85 - (1 - lift) * 0.36 - foreL.rotation.x) * work;
        torso.rotation.x += work * (0.1 + (1 - lift) * 0.19);
        torso.rotation.y += work * swing * 0.075;
        head.rotation.x -= work * 0.08;
        weapon.rotation.z += work * 0.2;
      }
      if (fight > 0.001) {
        const swing = Math.sin(t * (kind === 'brute' ? 4.1 : 7.2) + phase),
          thrust = 0.5 + 0.5 * swing;
        const r =
          kind === 'brute'
            ? -0.65 - thrust * 1.5
            : kind === 'scholar'
              ? -0.65
              : -0.4 - thrust * 1.2;
        armR.rotation.x += (r - armR.rotation.x) * fight;
        foreR.rotation.x += (-0.22 - thrust * 0.48 - foreR.rotation.x) * fight;
        armL.rotation.x +=
          ((kind === 'brute' ? -0.65 - (1 - thrust) * 1.4 : -0.85) -
            armL.rotation.x) *
          fight;
        foreL.rotation.x += (-0.85 - foreL.rotation.x) * fight;
        torso.rotation.y += fight * swing * 0.17;
        torso.rotation.x += fight * 0.12;
        weapon.rotation.x -=
          fight *
          thrust *
          (kind === 'invader' ? 0.95 : kind === 'guard' ? 0.6 : 0);
      }
      if (eat > 0.001) {
        armL.rotation.x += (-1.72 - armL.rotation.x) * eat;
        foreL.rotation.x += (-1.12 - foreL.rotation.x) * eat;
        head.rotation.x += Math.sin(t * 4) * 0.06 * eat;
      }
      if (study > 0.001) {
        armL.rotation.x += (-0.92 - armL.rotation.x) * study;
        foreL.rotation.x += (-0.95 - foreL.rotation.x) * study;
        head.rotation.x += 0.23 * study;
        head.rotation.y += Math.sin(t * 0.8) * 0.09 * study;
      }
      if (sleep > 0.001) {
        armL.rotation.x += (-0.43 - armL.rotation.x) * sleep;
        armR.rotation.x += (-0.43 - armR.rotation.x) * sleep;
        foreL.rotation.x += (-1.03 - foreL.rotation.x) * sleep;
        foreR.rotation.x += (-1.03 - foreR.rotation.x) * sleep;
        head.rotation.z += sleep * 0.16;
      }
      if (cape) {
        cape.rotation.x =
          0.08 +
          active * (0.08 + 0.055 * Math.sin(gait - 1.1)) +
          Math.sin(t * 1.8 + phase) * 0.015;
        cape.rotation.z = Math.sin(gait - 0.6) * active * 0.035;
      }
      if (earL) {
        earL.rotation.z = Math.sin(t * 2.5 + phase) * 0.032 + work * 0.06;
        earL.rotation.x = Math.sin(t * 3.1 + phase) * 0.03;
      }
      if (earR) {
        earR.rotation.z =
          -Math.sin(t * 2.5 + phase + 0.4) * 0.032 - work * 0.06;
        earR.rotation.x = Math.sin(t * 3.1 + phase + 0.8) * 0.03;
      }
    }
    animate(0, 0, 'Idle', 1);
    return { root, height: template.height, animate };
  }
  return {
    create,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      geometries.clear();
      materials.clear();
      templates.clear();
    },
  };
}
