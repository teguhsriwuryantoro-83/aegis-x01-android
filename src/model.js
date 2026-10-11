import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createAndroid() {
  const root = new THREE.Group();
  root.name = 'AEGIS-X01';
  const materials = {
    armor: new THREE.MeshPhysicalMaterial({ color: '#F4F5F7', metalness: 0, roughness: .2, clearcoat: 1, clearcoatRoughness: .1 }),
    dark: new THREE.MeshStandardMaterial({ color: '#1A1D24', metalness: .9, roughness: .32 }),
    visor: new THREE.MeshStandardMaterial({ color: '#08080C', metalness: .95, roughness: .05, envMapIntensity: 1.4 }),
    cyan: new THREE.MeshStandardMaterial({ color: '#00F3FF', emissive: '#00F3FF', emissiveIntensity: 3.5, roughness: .25 }),
    amber: new THREE.MeshStandardMaterial({ color: '#FF7A00', emissive: '#FF7A00', emissiveIntensity: 2.5, roughness: .3 }),
    steel: new THREE.MeshStandardMaterial({ color: '#53616D', metalness: 1, roughness: .28 }),
  };
  const add = (geometry, material, position, parent = root) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (size, position, mat = 'armor', parent = root, radius = .015) =>
    add(new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(v => v / 4))), materials[mat], position, parent);
  const sphere = (radius, position, mat = 'dark', parent = root) =>
    add(new THREE.SphereGeometry(radius, 20, 16), materials[mat], position, parent);
  const cylinder = (r1, r2, length, position, mat = 'dark', parent = root) =>
    add(new THREE.CylinderGeometry(r1, r2, length, 24), materials[mat], position, parent);
  const rail = (points, mat = 'cyan', radius = .004, parent = root) =>
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 6, false), materials[mat], [0, 0, 0], parent);
  const plate = (points, depth, position, mat = 'armor', parent = root) => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    return add(new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelSegments: 2, steps: 1,
      bevelSize: .008, bevelThickness: .008,
    }), materials[mat], position, parent);
  };

  // Mechanical frame, with separate overlapping armor shells.
  box([.31, .34, .23], [0, 1.31, 0], 'dark');
  box([.53, .36, .24], [0, 1.63, -.01], 'dark', root, .03);
  box([.34, .21, .25], [0, 1.1, 0], 'dark');
  for (let n = 0; n < 4; n++) {
    box([.23 - n * .013, .045, .045], [0, 1.24 + n * .057, .143], n % 2 ? 'dark' : 'steel');
  }
  for (const side of [-1, 1]) {
    const chest = plate([[-.10, -.13], [.095, -.08], [.13, .115], [-.09, .145]], .055,
      [side * .135, 1.62, .105]);
    chest.rotation.y = side * .12;
    chest.rotation.z = -side * .07;
    box([.16, .045, .08], [side * .13, 1.83, .01], 'armor');
    box([.09, .19, .16], [side * .20, 1.34, 0], 'armor');
    box([.16, .09, .10], [side * .16, 1.12, .13], 'armor');
    rail([[side * .07, 1.77, .18], [side * .17, 1.765, .18], [side * .235, 1.73, .15]]);
    // Back vents and amber accents.
    box([.14, .25, .06], [side * .115, 1.60, -.17], 'armor');
    box([.012, .16, .012], [side * .15, 1.60, -.207], 'amber');
    for (let v = 0; v < 4; v++) box([.10, .014, .012], [side * .115, 1.53 + v * .034, -.209], 'dark');
  }
  box([.07, .21, .06], [0, 1.64, .17], 'dark');
  box([.042, .07, .007], [0, 1.67, .205], 'cyan');
  box([.023, .015, .008], [0, 1.60, .206], 'amber');
  plate([[-.11, .09], [.11, .09], [.085, -.09], [-.085, -.09]], .045, [0, 1.09, .126]);

  // Neck rings and helmet assembly.
  for (let i = 0; i < 3; i++) cylinder(.071, .071, .021, [0, 1.86 + i * .025, 0], i === 1 ? 'steel' : 'dark');
  const head = new THREE.Group();
  head.position.set(0, 2.035, 0);
  root.add(head);
  box([.285, .28, .245], [0, .025, -.01], 'armor', head, .045);
  box([.225, .044, .145], [0, .177, -.02], 'armor', head);
  box([.03, .012, .19], [0, .204, -.005], 'dark', head);

  // Curved metallic visor; borders share the same surface coordinates.
  const visor = new THREE.PlaneGeometry(1, 1, 48, 10);
  const positions = visor.attributes.position;
  const visorPoint = (x, y) => [Math.sin(x) * .151, y, Math.cos(x) * .151 + .033];
  for (let i = 0; i < positions.count; i++) {
    const angle = positions.getX(i) * 2 * 1.05;
    const y = positions.getY(i) * .115 + .025;
    positions.setXYZ(i, ...visorPoint(angle, y));
  }
  visor.computeVertexNormals();
  add(visor, materials.visor, [0, 0, 0], head);
  for (const y of [-.036, .086]) {
    rail(Array.from({ length: 17 }, (_, i) => visorPoint(-1.05 + i / 16 * 2.1, y)), 'cyan', .003, head);
  }
  for (const side of [-1, 1]) {
    const jaw = box([.05, .13, .11], [side * .113, -.08, .06], 'armor', head);
    jaw.rotation.z = side * -.15;
    const ear = cylinder(.070, .070, .040, [side * .157, .02, -.024], 'dark', head);
    ear.rotation.z = Math.PI / 2;
    const earPlate = cylinder(.057, .057, .045, [side * .169, .02, -.024], 'armor', head);
    earPlate.rotation.z = Math.PI / 2;
    const ring = add(new THREE.TorusGeometry(.048, .0035, 8, 36), materials.cyan, [side * .196, .02, -.024], head);
    ring.rotation.y = Math.PI / 2;
    const antenna = new THREE.Group();
    antenna.position.set(side * .12, .15, -.06);
    antenna.rotation.z = -side * .19;
    head.add(antenna);
    cylinder(.009, .012, .17, [0, .07, 0], 'dark', antenna);
    box([.015, .025, .016], [0, .164, 0], 'cyan', antenna);
  }
  box([.13, .065, .09], [0, -.125, .06], 'armor', head);
  box([.06, .012, .014], [0, -.116, .115], 'dark', head);

  // Arm and leg plates, recessed rails, exposed bearings, articulated fingers.
  for (const side of [-1, 1]) {
    sphere(.09, [side * .33, 1.73, 0]);
    const shoulder = box([.23, .16, .255], [side * .34, 1.78, 0], 'armor', root, .03);
    shoulder.rotation.z = -side * .12;
    box([.11, .012, .02], [side * .35, 1.835, .135], 'cyan');
    const arm = new THREE.Group();
    arm.position.set(side * .35, 1.66, 0);
    arm.rotation.z = side * .10;
    root.add(arm);
    cylinder(.065, .056, .27, [0, -.12, 0], 'dark', arm);
    box([.15, .23, .145], [0, -.12, .025], 'armor', arm);
    box([.01, .13, .01], [side * .067, -.12, .101], 'cyan', arm);
    sphere(.064, [0, -.285, 0], 'dark', arm);
    const elbowRing = cylinder(.058, .058, .10, [0, -.285, 0], 'steel', arm);
    elbowRing.rotation.z = Math.PI / 2;
    cylinder(.07, .054, .26, [0, -.45, 0], 'dark', arm);
    box([.17, .255, .16], [0, -.435, .02], 'armor', arm);
    box([.04, .19, .019], [0, -.435, .107], 'dark', arm);
    box([.012, .15, .006], [0, -.43, .12], 'cyan', arm);
    sphere(.044, [0, -.59, 0], 'steel', arm);
    box([.105, .11, .085], [0, -.67, 0], 'dark', arm);
    box([.095, .07, .025], [0, -.65, .05], 'armor', arm);
    for (let finger = 0; finger < 4; finger++) {
      const x = -.036 + finger * .024;
      box([.018, .075, .022], [x, -.756, .014], 'dark', arm, .005);
      box([.018, .025, .026], [x, -.73, .017], 'steel', arm, .005);
    }
    const thumb = box([.025, .07, .03], [-side * .065, -.69, .025], 'dark', arm, .005);
    thumb.rotation.z = side * -.45;

    const x = side * .155;
    sphere(.08, [x, 1.035, 0]);
    cylinder(.08, .066, .31, [x, .84, 0]);
    box([.185, .30, .175], [x, .84, .025], 'armor', root, .025);
    box([.025, .23, .014], [x + side * .07, .84, .12], 'dark');
    box([.007, .19, .008], [x + side * .07, .84, .13], 'cyan');
    sphere(.073, [x, .65, 0]);
    box([.14, .115, .08], [x, .65, .095], 'armor');
    cylinder(.055, .07, .35, [x, .42, 0]);
    plate([[-.075, .16], [.075, .16], [.06, -.16], [-.055, -.16]], .055, [x, .43, .055]);
    box([.14, .24, .095], [x, .45, -.075], 'armor');
    box([.009, .23, .008], [x, .44, .123], 'cyan');
    box([.009, .18, .012], [x + side * .05, .44, -.13], 'amber');
    cylinder(.052, .052, .055, [x, .215, 0], 'steel');
    box([.18, .11, .29], [x, .125, .055], 'dark', root, .02);
    box([.175, .055, .25], [x, .18, .06], 'armor');
    box([.17, .024, .08], [x, .137, .197], 'armor');
    box([.07, .007, .007], [x, .185, .187], 'cyan');
  }
  root.position.y = -.067;
  return root;
}

export function disposeModel(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    const list = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
    for (const material of list) {
      materials.add(material);
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}
