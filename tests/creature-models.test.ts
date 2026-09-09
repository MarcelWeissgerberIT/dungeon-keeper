import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCreatureModels, type UnitKind } from '../app/creature-models';

void test('every creature is a finite volumetric model with a grounded silhouette and selectable geometry', () => {
  const factory = createCreatureModels();
  try {
    for (const kind of [
      'worker',
      'guard',
      'scholar',
      'brute',
      'invader',
    ] as UnitKind[]) {
      const model = factory.create(kind);
      model.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model.root);
      assert.ok(
        Math.abs(box.min.y) < 0.025,
        `${kind} feet start on the ground`,
      );
      assert.ok(
        box.max.y > 0.8 && box.max.y < 2,
        `${kind} has a readable in-world scale`,
      );
      assert.ok(box.max.z - box.min.z > 0.2, `${kind} has real depth`);
      let hits = 0;
      model.root.traverse((part) => {
        if (!(part instanceof THREE.Mesh)) return;
        const vertices = part.geometry.getAttribute('position');
        assert.ok([...vertices.array].every(Number.isFinite));
        part.geometry.computeBoundingSphere();
        const centre = part.geometry
          .boundingSphere!.center.clone()
          .applyMatrix4(part.matrixWorld);
        const ray = new THREE.Raycaster(
          centre.clone().add(new THREE.Vector3(0, 0, 5)),
          new THREE.Vector3(0, 0, -1),
        );
        hits += ray.intersectObject(part, false).length;
      });
      assert.ok(hits > 0, `${kind} can be clicked as geometry`);
    }
  } finally {
    factory.dispose();
  }
});

void test('independent creature poses share immutable geometry and retain caller positioning during animations', () => {
  const factory = createCreatureModels();
  try {
    const a = factory.create('worker'),
      b = factory.create('worker');
    const meshesA: THREE.Mesh[] = [],
      meshesB: THREE.Mesh[] = [];
    a.root.traverse((o) => {
      if (o instanceof THREE.Mesh) meshesA.push(o);
    });
    b.root.traverse((o) => {
      if (o instanceof THREE.Mesh) meshesB.push(o);
    });
    assert.equal(meshesA[0].geometry, meshesB[0].geometry);
    a.root.position.set(10, 0, 12);
    a.root.rotation.y = 1.2;
    const bPose = b.root.getObjectByName('armR')!.rotation.x;
    for (const job of [
      'Gräbt',
      'Im Kampf',
      'Trainiert',
      'Schläft',
      'Isst',
      'Forscht',
      'In der Hand',
    ]) {
      for (let t = 0; t < 1; t += 0.05) a.animate(t + 10, 0, job, 0.5);
      a.root.updateMatrixWorld(true);
      a.root.traverse((o) =>
        assert.ok(o.matrixWorld.elements.every(Number.isFinite)),
      );
    }
    assert.deepEqual(a.root.position.toArray(), [10, 0, 12]);
    assert.equal(a.root.rotation.y, 1.2);
    assert.equal(b.root.getObjectByName('armR')!.rotation.x, bPose);
    assert.notEqual(a.root.getObjectByName('armR')!.rotation.x, bPose);
  } finally {
    factory.dispose();
    factory.dispose();
  }
});
