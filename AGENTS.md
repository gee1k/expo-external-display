# AGENTS.md

This file is the first stop for AI agents working in this repository.

## Project Overview

`expo-external-display` is an Expo Module for rendering React Native children on an external display.

The core architecture is:

- JavaScript discovers and caches external screen metadata.
- `ExternalDisplay` renders a native view with explicit layout dimensions.
- Native code moves React Native child views into an external display container.
- iOS uses an external `UIWindow`.
- Android uses a `Presentation`.

Read these docs before changing behavior:

- `docs/architecture.md`: full human-readable architecture and behavior guide.
- `docs/ai-code-map.md`: file-by-file code map, debugging checklist, and maintenance notes.

## Important Mental Model

External display full-screen presentation and React Native layout size are related but not the same thing.

Native code is responsible for presenting content on the external screen. React Native still measures and lays out children before native moves their platform views. The `width` and `height` applied to `NativeExternalDisplayView` therefore affect the child layout, even though native presentation controls the actual external display surface.

Do not assume `width: "100%"` means "100% of the external display." Percentages are resolved in the original React Native tree before child views are moved.

## Source Map

JavaScript:

- `src/index.tsx`: public `ExternalDisplay` component and `useScreenSize`.
- `src/ExternalDisplayEvents.ts`: screen cache, event subscription, dimension normalization.
- `src/useExternalDisplay.ts`: React hook around the event layer.
- `src/ExpoExternalDisplay.types.ts`: public and native prop types.
- `src/ExpoExternalDisplayModule.ts`: native module binding.
- `src/ExpoExternalDisplayView.tsx`: native view binding.
- `src/ExpoExternalDisplayModule.web.ts`: web no-op module.

iOS:

- `ios/ExpoExternalDisplayModule.swift`: module definition, screen discovery, events, props.
- `ios/ExpoExternalDisplayView.swift`: child movement into external `UIWindow`.

Android:

- `android/src/main/java/expo/modules/externaldisplay/ExpoExternalDisplayModule.kt`: module definition, events, props, `GroupView`.
- `android/src/main/java/expo/modules/externaldisplay/ExternalDisplayHelper.kt`: display discovery and `Presentation`.
- `android/src/main/java/expo/modules/externaldisplay/ExpoExternalDisplayView.kt`: child movement into Android presentation.

Tests and example:

- `src/__tests__/index.test.tsx`: JavaScript behavior tests.
- `example/App.tsx`: manual validation app.

## Behavioral Invariants

- `screenInfo` in `ExternalDisplayEvents.ts` is a module-level cache.
- Native event initialization is guarded so `init()` runs once per JS runtime.
- `ExternalDisplay` returns `null` when no selected screen exists and fallback is disabled.
- In fallback mode, native receives an empty `screen` string.
- In external mode, native receives the selected screen id.
- React Native children are moved between native parents. Always detach from the old parent before attaching to a new parent.
- Fallback rendering reattaches children to the original native view.
- Android display ids are native display ids.
- iOS screen ids are `UIScreen.screens` indexes.

## Development Rules

- Keep changes scoped. Do not refactor both platforms while fixing a single-platform issue unless the root cause is shared.
- Document dimension semantics whenever public screen fields change.
- If adding a native prop, update TypeScript types and both native module definitions.
- If changing child movement, inspect fallback and cleanup paths on the same pass.
- Do not rely only on JavaScript tests for native rendering behavior.
- Avoid editing generated `build/` files manually. Run the package build script instead.
- Ignore unrelated untracked files unless the user asks about them.

## Verification

Run these for JavaScript and TypeScript changes:

```sh
npm test -- --runInBand
npm run build
npm run lint
```

For Android native changes, when the example Android project is available:

```sh
cd example/android
./gradlew :app:assembleDebug
```

For iOS native changes, when the example iOS workspace is available:

```sh
cd example/ios
xcodebuild -workspace ExternalDisplayExample.xcworkspace -scheme ExpoExternalDisplay -configuration Debug -sdk iphonesimulator build CODE_SIGNING_ALLOWED=NO
```

Manual validation on real external displays is still required for rendering behavior.

