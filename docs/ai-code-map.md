# AI Code Map

This document is optimized for AI agents and future maintainers. It explains where behavior lives, what to inspect first, and which assumptions are easy to break.

## Repository Shape

Primary package files:

- `src/index.tsx`: public React component and `useScreenSize`.
- `src/ExternalDisplayEvents.ts`: screen cache, native event subscription, dimension normalization.
- `src/useExternalDisplay.ts`: React hook wrapper around the event layer.
- `src/ExpoExternalDisplay.types.ts`: public and native prop types.
- `src/ExpoExternalDisplayModule.ts`: Expo native module binding.
- `src/ExpoExternalDisplayView.tsx`: Expo native view binding.
- `ios/ExpoExternalDisplayModule.swift`: iOS module, events, screen discovery.
- `ios/ExpoExternalDisplayView.swift`: iOS native view that moves children to an external `UIWindow`.
- `android/src/main/java/expo/modules/externaldisplay/ExpoExternalDisplayModule.kt`: Android module, events, view props, `GroupView`.
- `android/src/main/java/expo/modules/externaldisplay/ExternalDisplayHelper.kt`: Android display discovery and `Presentation` class.
- `android/src/main/java/expo/modules/externaldisplay/ExpoExternalDisplayView.kt`: Android native view that moves children to a `Presentation`.
- `src/__tests__/index.test.tsx`: JS behavior tests.
- `example/App.tsx`: manual validation app.

Build and package config:

- `package.json`: npm scripts and package entrypoints.
- `expo-module.config.json`: Expo autolinking metadata.
- `tsconfig.json`: TypeScript build emits declarations to `build/`.
- `android/build.gradle`: Android module build config.
- `ios/ExpoExternalDisplay.podspec`: iOS podspec.

## Data Flow Summary

External-display data flows like this:

1. Native discovers external screens.
2. Native returns a `SCREEN_INFO` object from constants or `getInitialScreens`.
3. `ExternalDisplayEvents.ts` normalizes the object.
4. The normalized object is stored in module-level `screenInfo`.
5. `getScreens()` returns the cached object.
6. `useExternalDisplay()` initializes React state from the cache.
7. Native events update the cache and hook state.
8. `ExternalDisplay` selects one screen from the hook result.
9. `ExternalDisplay` gives selected screen info to descendants via context.
10. `ExternalDisplay` renders `NativeExternalDisplayView` with fixed width, height, `screen`, and fallback props.
11. The native view moves child views into the platform external-display container.

## ScreenInfo Contract

Native modules should return:

```ts
Record<string, {
  id: string | number;
  width: number;
  height: number;
  mirrored?: boolean;
  wantsSoftwareDimming?: boolean;
}>
```

JavaScript may change `width` and `height` during normalization.

Current normalization:

- iOS scale: `1`
- Android scale: `Dimensions.get('window').scale || 1`
- normalized width: `native width / scale`
- normalized height: `native height / scale`

The module currently does not preserve raw native dimensions separately.

## Component Contract

`ExternalDisplay` has three operating modes:

| Selected screen | `fallbackInMainScreen` | Result |
| --- | --- | --- |
| yes | any | render native view targeting external screen |
| no | false | render `null` |
| no | true | render native view with empty screen id on main screen |

When selected screen exists:

- `pointerEvents` is `auto`
- style includes `StyleSheet.absoluteFillObject`
- style includes `{ width: selectedScreen.width, height: selectedScreen.height }`
- native `screen` prop is the selected screen id

When selected screen does not exist but fallback is enabled:

- `pointerEvents` is `box-none`
- native `screen` prop is `""`
- `mainScreenStyle` is applied

## Native Child Movement

The most important architectural detail: children are not rendered by a separate external-display React root.

The children are normal React Native children first. Then native code detaches their platform views from the current parent and attaches them to the external container.

This means:

- parent ownership matters
- child insertion order matters
- removing a child must detach it from any parent
- fallback must reattach children to the original native view
- layout size computed in React Native can differ from the external container size

## iOS Maintenance Notes

Start with `ios/ExpoExternalDisplayView.swift` when debugging iOS rendering.

Key fields:

- `externalWindow`: currently active external window
- `storedSubviews`: native child views that should be moved
- `screen`: selected screen id as a string
- `fallbackInMainScreen`: whether children should render in-place when no external target exists

Key methods:

- `didAddSubview`: tracks child views and triggers `updateScreen`.
- `updateScreen`: moves children to external window or fallback parent.
- `targetScreenWindow`: validates screen id, creates `UIWindow`, assigns target `UIScreen`.
- `ensureRootViewController`: creates a black root view for the external window.
- `invalidateWindow`: hides and releases the external window.

Risk points:

- `UIScreen.screens` indexes are used as ids.
- Child frames are not explicitly recalculated after moving to the external window.
- A screen change invalidates the window, but child view state remains in `storedSubviews`.

## Android Maintenance Notes

Start with `ExpoExternalDisplayModule.kt` for prop/event wiring, then `ExpoExternalDisplayView.kt` for rendering.

Key fields in `ExpoExternalDisplayView`:

- `children`: tracked child views
- `displayScreen`: active `Presentation`
- `presentationContainer`: `FrameLayout` set as presentation content
- `screen`: selected Android display id as an `Int`
- `fallbackInMainScreen`: fallback rendering flag

Key methods:

- `addExternalDisplayChild`: stores child and triggers screen update.
- `removeExternalDisplayChild`: removes from list and detaches from parent.
- `setScreen`: parses screen id and destroys old presentation when id changes.
- `updateScreen`: creates or updates presentation, attaches children, or falls back.
- `destroyScreen`: dismisses the presentation and clears presentation state.

Risk points:

- `helperProvider` is a companion-object global set by the module.
- `screen > 0` is required before targeting an external display.
- `Presentation` display ids are Android display ids, not list indexes.
- Children are attached to the presentation with `MATCH_PARENT`.
- Presentation lifecycle must be cleaned up on view destruction.

## Event Lifecycle Notes

`listenExternalDisplayEvents` is called once at module import time in `src/index.tsx` with empty handlers. This eagerly initializes native observation for the runtime.

Hooks also call `listenExternalDisplayEvents`. Native `init()` is guarded by `isInitialized`, so it only runs once, but each hook still creates event subscriptions that must be removed on cleanup.

If changing this behavior, check:

- duplicate event listeners
- stale hook state
- native observer registration timing
- initial `screenInfo` value before React components mount

## Dimension Debugging Checklist

When external display content is visually wrong, inspect values in this order:

1. Native-reported screen info before JS normalization.
2. JavaScript `getScreens()` result after normalization.
3. `selectedScreen` chosen by `ExternalDisplay`.
4. Style passed to `NativeExternalDisplayView`.
5. Whether native view receives a non-empty `screen` prop.
6. Whether children are attached to external container or fallback parent.
7. Native external container bounds.
8. Child native view frame after it is moved.

Useful symptoms:

- External screen is black: selected screen id may be wrong, no children are attached, or presentation/window is not visible.
- Main preview works but external does not: child movement or native target selection is likely involved.
- External content is full screen but text size is wrong: React Native layout dimensions differ from expected visual viewport.
- Android dimensions look very small: JS likely divided native pixels by main device scale.
- iOS dimensions look very large: iOS path does not divide by scale.

## Safe Change Strategy

For behavioral changes:

1. Add or update JS tests when the behavior crosses JS/native prop boundaries.
2. Keep native child movement changes small and platform-specific.
3. Validate JS with:

```sh
npm test -- --runInBand
npm run build
npm run lint
```

4. Validate Android native changes with the example Android project when available:

```sh
cd example/android
./gradlew :app:assembleDebug
```

5. Validate iOS native changes with the example workspace when available:

```sh
cd example/ios
xcodebuild -workspace ExternalDisplayExample.xcworkspace -scheme ExpoExternalDisplay -configuration Debug -sdk iphonesimulator build CODE_SIGNING_ALLOWED=NO
```

6. Still do manual device validation for actual external display behavior.

## Common Pitfalls

- Treating native full-screen presentation and React Native layout size as the same concept.
- Assuming `width: '100%'` resolves against the external display.
- Changing JavaScript dimensions without adjusting native child measurement.
- Forgetting Android uses display ids while iOS uses screen indexes.
- Forgetting that fallback mode uses the original main-screen parent.
- Adding native props but not exposing them in both Expo module definitions.
- Relying only on JS tests for native rendering behavior.

## AI Editing Guidelines

- Do not rewrite the architecture while fixing a single symptom.
- Prefer documenting the current behavior before changing dimension semantics.
- If normalizing dimensions, preserve or expose enough raw native data to debug platform differences.
- If changing child movement, verify parent detach and cleanup paths on both platforms.
- Keep docs and README semantics aligned after public API changes.
- Avoid broad refactors in `ExpoExternalDisplayView` files unless tests and manual validation cover both fallback and external-screen paths.
