import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

await mkdir('playwright-output', { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const response = await fetch('http://127.0.0.1:4173'); ready = response.ok; } catch {}
    if (ready) break;
    if (server.exitCode !== null) throw new Error('Preview server exited.');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Preview server should start');
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:4173/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    external.push(url); return route.abort();
  });
  await page.goto('http://127.0.0.1:4173');
  await page.waitForSelector('#viewport[data-ready="true"]', { timeout: 90000 });
  assert.match(await page.locator('#status').textContent(), /Procedural model/);
  assert.equal(await page.locator('#rotate').getAttribute('aria-pressed'), 'false');
  const image = await page.screenshot({ path: 'playwright-output/portrait.png' });
  assert.ok(image.length > 20000, 'Rendered mobile screenshot should contain visible scene detail');
  await page.locator('#rotate').click();
  assert.equal(await page.locator('#rotate').getAttribute('aria-pressed'), 'true');
  await page.locator('#rotate').click();
  await page.locator('#settings').click();
  assert.equal(await page.locator('#settings').getAttribute('aria-expanded'), 'true');
  await page.locator('#exposure').evaluate(input => { input.value = '1.3'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.locator('#exposure-value').textContent(), '1.3');
  await page.locator('#bloom').evaluate(input => { input.value = '0.2'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.locator('#bloom-value').textContent(), '0.2');
  await page.locator('#reset').click();

  // A genuine binary glTF triangle exercises buffer parsing and replacement.
  const binary = Buffer.alloc(80);
  [-.5, 0, 0, .5, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1].forEach((v, i) => binary.writeFloatLE(v, i * 4));
  [0, 1, 2].forEach((v, i) => binary.writeUInt16LE(v, 72 + i * 2));
  const json = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [.8, .9, 1, 1], metallicFactor: 0, roughnessFactor: .5 }, doubleSided: true }],
    buffers: [{ byteLength: 80 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 36 }, { buffer: 0, byteOffset: 72, byteLength: 6 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-.5, 0, 0], max: [.5, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
  };
  const raw = Buffer.from(JSON.stringify(json)), padded = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 32);
  raw.copy(padded);
  const glb = Buffer.alloc(12 + 8 + padded.length + 8 + binary.length);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(padded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); padded.copy(glb, 20);
  const offset = 20 + padded.length;
  glb.writeUInt32LE(binary.length, offset); glb.writeUInt32LE(0x004e4942, offset + 4); binary.copy(glb, offset + 8);
  await writeFile('playwright-output/test.glb', glb);
  await page.locator('#glb-file').setInputFiles('playwright-output/test.glb');
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('Local GLB'));
  assert.equal(await page.locator('#notice').isVisible(), false);
  await page.locator('#default-model').click();
  assert.match(await page.locator('#status').textContent(), /Procedural model/);
  await page.locator('#glb-file').setInputFiles({ name: 'invalid.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from('invalid') });
  await page.waitForFunction(() => document.getElementById('notice').textContent.includes('not a valid GLB'));
  assert.match(await page.locator('#status').textContent(), /Procedural model/);
  await page.locator('#default-model').click();
  await page.locator('#settings').click();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: 'playwright-output/landscape.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: 'playwright-output/desktop.png' });
  assert.deepEqual(errors, [], 'Viewer should have no JavaScript runtime errors');
  assert.deepEqual(external, [], 'Viewer should not need external resources');
  console.log('PASS: WebGL render, offline resources, responsive layouts, orbit/reset, lighting, GLB import and invalid-file recovery.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
