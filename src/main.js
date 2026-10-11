import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createAndroid, disposeModel } from './model.js';

const $ = id => document.getElementById(id);
function notify(message) {
  $('notice').textContent = message;
  $('notice').hidden = !message;
}

try { start(); } catch (error) {
  console.error(error);
  $('status').textContent = 'Renderer unavailable';
  notify('This viewer needs WebGL 2. Update Android System WebView and reopen the app.');
}

function start() {
  const viewport = $('viewport');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'AEGIS-X01 3D model');
  viewport.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#080D14');
  scene.fog = new THREE.Fog('#080D14', 7, 15);
  const camera = new THREE.PerspectiveCamera(35, 1, .02, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = .7;
  controls.minDistance = 1.2;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2 + .1;
  function resetView() {
    controls.target.set(0, 1.15, 0);
    camera.position.set(2.7, 1.9, 4.5);
    controls.update();
  }
  resetView();
  $('rotate').setAttribute('aria-pressed', String(controls.autoRotate));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  pmrem.dispose(); room.dispose();
  RectAreaLightUniformsLib.init();
  for (const [color, intensity, width, height, position] of [
    ['#C5E5FF', 8, 2, 3, [-2.5, 3.2, 3]],
    ['#FFFFFF', 3, 2, 2.5, [2.4, 1.8, 2]],
    ['#FFB06A', 6, 1, 2.5, [1.5, 2.5, -2]],
  ]) {
    const light = new THREE.RectAreaLight(color, intensity, width, height);
    light.position.set(...position); light.lookAt(0, 1.1, 0); scene.add(light);
  }
  const key = new THREE.DirectionalLight('#D9E9FF', 1.4);
  key.position.set(-3, 5, 4); key.target.position.set(0, 1, 0);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1, near: .1, far: 12 });
  key.shadow.normalBias = .012;
  scene.add(key, key.target);
  const cyanSpill = new THREE.PointLight('#00F3FF', .18, .5, 2);
  cyanSpill.position.set(0, 1.7, .3); scene.add(cyanSpill);
  const amberSpill = new THREE.PointLight('#FF7A00', .15, .5, 2);
  amberSpill.position.set(0, 1.55, -.28); scene.add(amberSpill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: '#0B111A', roughness: .62, metalness: .15 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.016; floor.receiveShadow = true; scene.add(floor);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(.62, .67, .035, 64),
    new THREE.MeshStandardMaterial({ color: '#111B26', metalness: .65, roughness: .35 }));
  pedestal.position.y = .003; pedestal.receiveShadow = true; scene.add(pedestal);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .002, 6, 96),
    new THREE.MeshStandardMaterial({ color: '#00F3FF', emissive: '#00F3FF', emissiveIntensity: 1.3 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .023; scene.add(ring);
  const grid = new THREE.GridHelper(20, 50, '#1C3344', '#122333');
  grid.position.y = -.01; scene.add(grid);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .5, .3, 1.2);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  let model = createAndroid(), mixer = null;
  scene.add(model);
  $('status').textContent = 'Procedural model · Offline';
  function resize() {
    const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr); composer.setSize(width, height);
    camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewport); resize();
  const clock = new THREE.Clock();
  let frames = 0, lastReport = performance.now(), running = true;
  function render() {
    if (!running) return;
    const delta = Math.min(clock.getDelta(), .05);
    controls.update(delta); mixer?.update(delta); composer.render();
    viewport.dataset.ready = 'true';
    const now = performance.now(); frames++;
    if (now - lastReport >= 1000) {
      $('fps').textContent = Math.round(frames * 1000 / (now - lastReport)) + ' FPS';
      frames = 0; lastReport = now;
    }
  }
  renderer.setAnimationLoop(render);
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.start(); lastReport = performance.now(); frames = 0; }
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); running = false;
    notify('Graphics context lost. Close and reopen the app to restore the viewer.');
  });

  $('rotate').onclick = () => {
    controls.autoRotate = !controls.autoRotate;
    $('rotate').setAttribute('aria-pressed', String(controls.autoRotate));
  };
  $('reset').onclick = resetView;
  $('settings').onclick = () => {
    const open = $('settings-panel').hidden;
    $('settings-panel').hidden = !open;
    $('settings').setAttribute('aria-expanded', String(open));
  };
  $('exposure').oninput = event => {
    renderer.toneMappingExposure = Number(event.target.value);
    $('exposure-value').textContent = Number(event.target.value).toFixed(1);
  };
  $('bloom').oninput = event => {
    bloom.strength = Number(event.target.value);
    $('bloom-value').textContent = Number(event.target.value).toFixed(1);
  };

  let importVersion = 0;
  function replaceModel(next, nextMixer = null) {
    if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); }
    scene.remove(model); disposeModel(model);
    model = next; mixer = nextMixer; scene.add(model); resetView();
  }
  $('default-model').onclick = () => {
    importVersion++; replaceModel(createAndroid());
    $('status').textContent = 'Procedural model · Offline'; notify('');
  };
  $('import').onclick = () => $('glb-file').click();
  $('glb-file').onchange = async event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file) return;
    const version = ++importVersion;
    let candidate = null;
    try {
      if (!/\.glb$/i.test(file.name)) throw new Error('Choose a binary .glb model.');
      if (file.size > 40 * 1024 * 1024) throw new Error('Choose a GLB smaller than 40 MB.');
      notify('Loading model…');
      const data = await file.arrayBuffer();
      if (data.byteLength < 20 || new DataView(data).getUint32(0, true) !== 0x46546c67) {
        throw new Error('The selected file is not a valid GLB.');
      }
      const manager = new THREE.LoadingManager();
      manager.setURLModifier(url => {
        if (!url.startsWith('blob:') && !url.startsWith('data:')) {
          throw new Error('Use a self-contained GLB with all textures embedded.');
        }
        return url;
      });
      const gltf = await new GLTFLoader(manager).parseAsync(data, '');
      candidate = gltf.scene;
      if (version !== importVersion) { disposeModel(candidate); return; }
      candidate.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(candidate);
      const size = bounds.getSize(new THREE.Vector3());
      if (bounds.isEmpty() || size.y < .0001 || !Number.isFinite(size.length())) {
        throw new Error('The GLB has no usable visible geometry.');
      }
      const largest = Math.max(size.x, size.y, size.z);
      const wrapper = new THREE.Group();
      wrapper.add(candidate);
      wrapper.scale.setScalar(2.2 / largest);
      const center = bounds.getCenter(new THREE.Vector3());
      wrapper.position.set(-center.x * wrapper.scale.x, .023 - bounds.min.y * wrapper.scale.y, -center.z * wrapper.scale.z);
      candidate.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
      const nextMixer = gltf.animations.length ? new THREE.AnimationMixer(wrapper) : null;
      if (nextMixer) nextMixer.clipAction(gltf.animations[0]).play();
      replaceModel(wrapper, nextMixer); candidate = null;
      $('status').textContent = file.name + ' · Local GLB'; notify('');
    } catch (error) {
      if (candidate) disposeModel(candidate);
      if (version === importVersion) notify(error.message || 'Could not load this GLB. Export an uncompressed, self-contained model.');
    }
  };
}
