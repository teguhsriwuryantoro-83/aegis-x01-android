# AEGIS-X01 Android

An offline Three.js viewer packaged as an Android application. White ceramic armor (`#F4F5F7`), dark titanium (`#1A1D24`), a reflective visor (`#08080C`, metalness 0.95, roughness 0.05), cyan (`#00F3FF`) and amber (`#FF7A00`) emissive inserts, studio lighting, ACES tone mapping, and HDR bloom.

The procedural android is an artist approximation. `519074.png` was not available during implementation; this is not an exact reconstruction of that image.

## Download and install

Download **AEGIS-X01.apk** from the [latest release](https://github.com/teguhsriwuryantoro-83/aegis-x01-android/releases/latest). On Android, allow installation from the browser or file manager when prompted, then open the APK.

Requires Android 8.0 or newer, an up-to-date Android System WebView, and WebGL 2 support. This is a debug-signed APK for sideloading, not a Play Store release. Debug certificates may differ between builds, so uninstall an older build before installing a differently signed update.

## Viewer

- Drag to orbit; pinch or scroll to zoom.
- Toggle automatic orbit and reset the camera.
- Adjust exposure and neon bloom under Lighting.
- Import a local, self-contained `.glb` under 40 MB, including embedded textures.
- Restore the procedural model from the Lighting panel.

Imported GLBs are normalized to fit the viewer, retain their authored PBR materials, and play their first animation when present. Draco/Meshopt/KTX2 assets need decoder integration and are not supported by this initial viewer. External texture and buffer URLs are rejected. Imported files stay on the device and are not persisted between app sessions.

The installed viewer needs no network connection and requests no Internet permission. Web assets are bundled into the APK and served through AndroidX WebViewAssetLoader at a local HTTPS origin. The selected model file is accessed through Android's system file picker; broad storage permissions are not required.

## Build

GitHub Actions builds on pushes to `main` and can be run manually. It builds the web bundle, runs desktop Chromium WebGL smoke checks, compiles and lints Android, verifies the APK signature, uploads screenshots and an APK artifact, and publishes the APK with a SHA-256 checksum as a GitHub release. Hardware/device validation is separate from these automated checks.

Local development:

```sh
npm install
npm run dev
```

Local APK build (Java 17, Gradle 8.11.1, Android SDK 35):

```sh
npm run build
mkdir -p app/src/main/assets/public
cp -R dist/. app/src/main/assets/public/
gradle :app:assembleDebug :app:lintDebug
```

Set `ANDROID_HOME` or an ignored `local.properties` file to your Android SDK location. APK output: `app/build/outputs/apk/debug/app-debug.apk`.

## Production model pipeline

1. In Blender, import the reference with **Add > Image > Reference**. Match a perspective camera for a perspective photograph; use orthographic front/side/rear references only when the corresponding views are available.
2. Block out the silhouette at real-world scale. Build separate beveled armor plates, mechanical joints, a curved visor, and recessed luminous inserts. Hidden geometry must be interpreted from a single image.
3. Create the runtime mesh, unwrap UVs, and bake small surface details from a high-poly model. Retain silhouette details in geometry.
4. Author sRGB base-color/emissive textures and non-color normal/roughness/metallic/AO textures. Use OpenGL normal maps; packed ORM uses R=occlusion, G=roughness, B=metallic.
5. Use export-compatible Principled BSDF connections. Export an uncompressed binary glTF (`.glb`) with textures embedded and the required clearcoat/emissive-strength extensions. Reference image objects and modeling helpers should stay out of the export.
6. Validate with the Khronos glTF Validator, import into this viewer, and compare using matched camera and lighting. A GLB preserves authored geometry; it does not recover unseen mesh data from a photograph.

For a store release, configure a private release signing key, keep that key stable across updates, disable WebView debugging, increment versionCode, and build a signed release APK/AAB.
