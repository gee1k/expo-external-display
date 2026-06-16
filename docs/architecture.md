# @isvend/expo-external-display Architecture

## Purpose

`@isvend/expo-external-display` is an Expo Module that lets React Native content render on a connected external display while the main app remains available on the primary device screen.

The package has two responsibilities:

- discover external displays and expose them to JavaScript as `ScreenInfo`
- move React Native child views into a native external-display container when a target screen is selected

The module does not create an independent React tree for the external display. It renders children through the normal React Native tree first, then the native view moves those native child views into an external `UIWindow` on iOS or an Android `Presentation`.

## Public API

The package exports:

- `ExternalDisplay`: React component that renders its children on an external display when `screen` matches a detected display.
- `useExternalDisplay(options?)`: hook that returns the latest cached `ScreenInfo` and subscribes to native display events.
- `getScreens()`: synchronous accessor for the latest cached `ScreenInfo`.
- `useScreenSize()`: hook that returns the selected `Screen` for the nearest `ExternalDisplay`, or `null` in fallback mode.
- exported TypeScript types from `src/ExpoExternalDisplay.types.ts`.

The public `Screen` shape is:

```ts
type Screen = {
  id: string | number;
  width: number;
  height: number;
  mirrored?: boolean;
  wantsSoftwareDimming?: boolean;
};
```

`width` and `height` are the dimensions after JavaScript normalization. They are also used by `ExternalDisplay` as the React Native layout size for the native view.

## Screen Discovery And Events

Native display events use these names:

- `@ExpoExternalDisplay_screenDidConnect`
- `@ExpoExternalDisplay_screenDidChange`
- `@ExpoExternalDisplay_screenDidDisconnect`

The JavaScript event layer lives in `src/ExternalDisplayEvents.ts`.

It performs four jobs:

1. Reads initial screens from `ExpoExternalDisplayModule.getInitialScreens()` or `getConstants().SCREEN_INFO`.
2. Normalizes native dimensions with `normalizeScreens`.
3. Stores the latest value in the module-level `screenInfo` cache.
4. Registers native event listeners once through `ExpoExternalDisplayModule.init()`.

`listenExternalDisplayEvents` returns three subscriptions: `connect`, `change`, and `disconnect`. Hook callers remove all three in `useEffect` cleanup.

## Dimension Semantics

Current dimension behavior is intentionally platform-dependent:

- iOS native reports `UIScreen.bounds.width` and `UIScreen.bounds.height`.
- Android native reports `DisplayMetrics.widthPixels` and `DisplayMetrics.heightPixels`.
- JavaScript keeps iOS scale at `1`.
- JavaScript divides Android dimensions by `Dimensions.get('window').scale` from the main device window.

This means the same physical TV can produce very different JavaScript dimensions across platforms. For example:

- iOS may expose `3840 x 2160`.
- Android may expose `1920 x 1080`, then JavaScript may divide by a main-device scale such as `2.75`, producing about `698.18 x 392.72`.

Those numbers are not only metadata. `ExternalDisplay` uses them as the React Native layout size for `NativeExternalDisplayView`.

This is why changing the normalization logic can affect visual output even when the native external display still appears full screen. The native layer can fill the TV while the React Native child layout still uses a different logical viewport.

## ExternalDisplay Component Flow

`src/index.tsx` implements the component.

Render flow:

1. `ExternalDisplay` calls `useExternalDisplay`.
2. It resolves `selectedScreen` from `screens[screen]`.
3. If there is no selected screen and `fallbackInMainScreen` is false, it returns `null`.
4. It provides `selectedScreen` through `ScreenContext`.
5. It renders `NativeExternalDisplayView`.
6. If `selectedScreen` exists, it applies:

```ts
StyleSheet.absoluteFillObject
{ width: selectedScreen.width, height: selectedScreen.height }
```

7. It passes `screen` to native only when a selected screen exists; otherwise it passes an empty string for fallback rendering.

`useScreenSize()` reads from `ScreenContext`. This is a convenience for external-display children that need to know the selected display dimensions.

## Why NativeExternalDisplayView Has Explicit Width And Height

The native view's `width` and `height` are not the sole reason the content appears on the TV. Full-screen presentation is handled by native external-display primitives:

- iOS uses an external `UIWindow`.
- Android uses an Android `Presentation`.

The explicit React Native size still matters because React Native needs to measure and lay out the child tree before native moves those child views into the external container.

So the native view size should be treated as the React Native layout viewport for the external content. It influences font wrapping, flex layout, centering, absolute positioning, and any component that depends on parent size.

Using `100%` is not equivalent to using the external display bounds. Percentage layout is resolved inside the original React Native tree, not inside the external `UIWindow` or `Presentation` after the children are moved.

## iOS Native Logic

iOS implementation files:

- `ios/ExpoExternalDisplayModule.swift`
- `ios/ExpoExternalDisplayView.swift`

`ExpoExternalDisplayModule`:

- registers module name `ExpoExternalDisplay`
- exports connect/change/disconnect events
- exposes `getConstants`, `init`, and `getInitialScreens`
- exposes native view props `screen` and `fallbackInMainScreen`
- registers observers for:
  - `UIScreen.didConnectNotification`
  - `UIScreen.didDisconnectNotification`
  - `UIDevice.orientationDidChangeNotification`

`getScreenInfo()` iterates `UIScreen.screens`, skips `UIScreen.main`, and returns entries keyed by screen index. Each entry contains:

- `id`: index
- `width`: `screen.bounds.width`
- `height`: `screen.bounds.height`
- `mirrored`: whether the screen mirrors the main screen

`ExpoExternalDisplayView`:

- extends `ExpoView`
- stores inserted child views in `storedSubviews`
- creates a `UIWindow(frame: targetScreen.bounds)` for the selected external screen
- sets `externalWindow.screen = targetScreen`
- inserts stored children into `window.rootViewController?.view`
- calls `window.makeKeyAndVisible()`
- hides and releases the window when the selected screen changes or becomes invalid

Fallback behavior:

- if no target external window is available and `fallbackInMainScreen` is true, stored children are inserted back into the original Expo view
- if fallback is false, children are detached from the external path and no fallback surface is rendered

## Android Native Logic

Android implementation files:

- `android/src/main/java/expo/modules/externaldisplay/ExpoExternalDisplayModule.kt`
- `android/src/main/java/expo/modules/externaldisplay/ExpoExternalDisplayView.kt`
- `android/src/main/java/expo/modules/externaldisplay/ExternalDisplayHelper.kt`

`ExternalDisplayHelper`:

- wraps `DisplayManager`
- registers as a `DisplayManager.DisplayListener`
- reads presentation-capable displays from `DISPLAY_CATEGORY_PRESENTATION`
- filters out `Display.DEFAULT_DISPLAY`
- requires `Display.FLAG_PRESENTATION`
- reports `width` and `height` from `DisplayMetrics.widthPixels` and `heightPixels`

`ExpoExternalDisplayModule`:

- exports module name `ExpoExternalDisplay`
- exports connect/change/disconnect events
- exposes `getConstants`, `init`, and `getInitialScreens`
- lazily creates one `ExternalDisplayHelper`
- wires helper callbacks to native events
- exposes native view props `screen` and `fallbackInMainScreen`
- defines `GroupView` child-management handlers so React Native children are routed through `ExpoExternalDisplayView`

`ExpoExternalDisplayView`:

- extends `ExpoView`
- stores child views in a `children` list instead of relying on default parent behavior
- parses `screen` to an Android display id
- creates an `ExternalDisplayScreen`, which extends `Presentation`
- creates a `FrameLayout` presentation container
- detaches each child from its current parent
- adds each child to the presentation container with `MATCH_PARENT`
- calls `Presentation.setContentView(container)`
- shows the presentation if needed

Fallback behavior:

- if no matching external display exists and `fallbackInMainScreen` is true, children are attached back to the original view with `MATCH_PARENT`
- otherwise the presentation is dismissed and children are detached

## Platform Support

This package is native-only. It supports iOS and Android through Expo Modules and does not provide a web implementation.

## Example App Logic

The example app:

- calls `useExternalDisplay()` to list connected screens
- selects the first detected screen
- renders `ExternalDisplay` with `fallbackInMainScreen`
- uses `useScreenSize()` inside external content
- shows `getScreens()` output on the main screen
- demonstrates app-level scaling by comparing selected screen size against `Dimensions.get('window')`

The example scaling is demonstration logic, not core module behavior.

## Tests

Tests live in `src/__tests__/index.test.tsx`.

They mock:

- `react-native` platform, dimensions, style sheet, and text
- Expo native module and native view registration

Covered behavior:

- cached screen info is normalized
- no selected screen returns `null` when fallback is disabled
- fallback mode renders the native view on the main screen
- selected screens apply dimensions to the native view
- native events update hook subscribers

The existing automated tests cover the JavaScript layer. Native external-display behavior still needs manual validation on real devices or representative simulators because CI cannot attach a physical external display.

## Important Invariants

- `screenInfo` is a module-level cache, not React state.
- `listenExternalDisplayEvents` calls native `init()` only once per JS runtime.
- Android divides native dimensions by the main window scale in JavaScript.
- iOS does not divide native dimensions in JavaScript.
- `ExternalDisplay` uses screen dimensions as React Native layout dimensions.
- Native full-screen presentation and React Native layout size are related but not the same thing.
- Child views are moved between parents. Any change to native child management must carefully detach from the previous parent first.
- Fallback rendering is implemented by reattaching moved children to the original native view.

## Known Design Tradeoffs

- Cross-platform visual parity is not guaranteed by the current dimension model.
- Using the main device scale for Android makes external display dimensions feel like React Native dp, but the scale does not come from the external display itself.
- iOS external display dimensions can be much larger than Android dimensions for the same TV.
- Attempts to normalize dimensions across platforms must also account for native child movement, measurement, transforms, and parent ownership; changing only JavaScript dimensions is not enough.
