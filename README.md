# @isvend/expo-external-display

Expo Module for rendering React Native content on an external display in native iOS and Android apps.

This project is inspired by the normal external-display rendering approach in [`react-native-external-display`](https://github.com/livingsocial/react-native-external-display), but it is a standalone Expo Module rather than a wrapper around that package.

## Installation

```sh
npx expo install @isvend/expo-external-display
npx expo prebuild
```

This package is native-only and supports iOS and Android. It does not support web.

## Usage

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import ExternalDisplay, { useExternalDisplay } from '@isvend/expo-external-display';

export default function App() {
  const screens = useExternalDisplay();
  const screen = Object.keys(screens)[0];

  return (
    <ExternalDisplay
      mainScreenStyle={{ flex: 1 }}
      fallbackInMainScreen
      screen={screen}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#333',
        }}
      >
        <Text style={{ color: 'red', fontSize: 40 }}>External Display</Text>
      </View>
    </ExternalDisplay>
  );
}
```

## API

### `getScreens()`

Returns the cached external display map.

```ts
type Screen = {
  id: string | number;
  width: number;
  height: number;
  mirrored?: boolean;
};

type ScreenInfo = Record<string, Screen>;
```

### `useExternalDisplay(options?)`

React hook that subscribes to external display changes.

```ts
useExternalDisplay({
  onScreenConnect: (screens) => {},
  onScreenChange: (screens) => {},
  onScreenDisconnect: (screens) => {},
});
```

### `useScreenSize()`

Returns the screen currently used by the nearest `<ExternalDisplay />`. It returns `null` when the children are rendered as a fallback on the main screen.

### `<ExternalDisplay />`

Props:

- `screen?: string`
- `fallbackInMainScreen?: boolean`
- `mainScreenStyle?: StyleProp<ViewStyle>`
- all React Native `ViewProps`

## Manual Validation

Automated tests cover the JavaScript layer:

```sh
npm test -- --runInBand
npm run build
npm run lint
```

Native display behavior should be validated through the included Expo app:

```sh
cd example
npm install
npm run prebuild
npm run ios
# or
npm run android
```

The example uses `@isvend/expo-external-display` through `file:..`, renders the external surface with `fallbackInMainScreen`, and prints the detected `getScreens()` result on the main screen.

Manual device coverage:

- Android device/emulator with a presentation-capable secondary display
- iOS device/simulator with an external display
