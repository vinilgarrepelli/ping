# PING Android scaffold

This directory contains a native Android UI prototype for the PING app. It uses Kotlin and Jetpack Compose to demonstrate a single-screen flow: name entry, a room header, local message sending, emoji insertion, media, and hold-to-preview voice controls.

## Prototype boundary

The current milestone keeps the name entry, room transition, and message list local to the process. Text messages can be added locally and the emoji picker inserts reactions into the composer. Media and voice controls remain UI scaffolding; they do not upload or record yet. There is no account system, networking, persistence, microphone access, media picker, or encryption implementation. See `ENCRYPTION_PROTOCOL.md` for protocol notes; that document is not implemented by this prototype.

## Editing the login announcement

Before distributing a release APK, edit `PING_LOGIN_NOTICE` in `app\src\main\java\com\ping\app\MainActivity.kt`. For the browser version, edit `LOGIN_NOTICE` in `..\public\app.js`. Use one short line, for example `New PING APK coming soon`. Leave the setting empty to hide the announcement.

## Required tooling

- Android Studio (recent stable release) or the Android command-line tools
- JDK 17
- Android SDK Platform 35 and matching build tools
- Gradle 8.7 or newer (Android Studio can provide Gradle through its project tooling)
- An emulator or Android device for running the app

No Gradle wrapper is included, and Gradle/Android SDK installation is not required to inspect this scaffold.

GitHub Actions can build the debug APK without installing the Android toolchain
on the local computer. The workflow in `.github\workflows\android-apk.yml`
runs on pushes to `main` and can also be started manually. Its completed run
contains a downloadable `ping-debug-apk` artifact.

## Build a debug APK

From this directory (`C:\capp\android`), with the required tooling installed:

```powershell
gradle assembleDebug
```

The APK is generated at:

```text
app\build\outputs\apk\debug\app-debug.apk
```

You can also open `C:\capp\android` in Android Studio, allow it to sync dependencies, and select **Build > Make Project**.

## Project layout

- `settings.gradle.kts` — project name, repositories, and module inclusion
- `build.gradle.kts` — shared Android/Kotlin/Compose plugin versions
- `app\build.gradle.kts` — Android application configuration and dependencies
- `app\src\main\AndroidManifest.xml` — launcher activity declaration
- `app\src\main\java\com\ping\app\MainActivity.kt` — Compose UI prototype and local interaction state
