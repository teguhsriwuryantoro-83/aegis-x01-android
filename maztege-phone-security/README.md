# MAZTEGE PHONE SECURITY

A local, read-only Android security posture checker.

## What it checks
- Installed package inventory and granted sensitive permissions visible to Android.
- Active device administrators.
- Enabled accessibility services.
- Active VPN transport.
- Android release, API level, and security patch date.

## Privacy and permission model
- No INTERNET permission; no telemetry or cloud upload.
- Does not read SMS, call contents, contacts, photos, files, or WhatsApp data.
- Does not enable Accessibility, Device Admin, VPN, or other special access on your behalf.
- Opens Android Settings so the device owner can review settings manually.
- Uses QUERY_ALL_PACKAGES to inspect the installed-app inventory, and ACCESS_NETWORK_STATE only to identify an active VPN transport.

## Important limitation
This is not a forensic Pegasus detector. A clean result does not prove a device is free of Pegasus or other advanced spyware. Android sandboxing prevents an ordinary non-root app from inspecting kernel/system implants, other apps' private data, or all forensic traces. For suspected targeted compromise, preserve the device state and seek qualified mobile-forensics assistance (for example, Amnesty International Security Lab's Mobile Verification Toolkit workflow).

## Build
Open this folder as an independent Android Gradle project, or use the repository's GitHub Actions workflow to build a debug APK.

Package: `id.maztege.phonesecurity`
Minimum Android: 8.0 (API 26)
