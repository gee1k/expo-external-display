import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';

import type {
  ExternalDisplayProps,
  Screen,
  UseExternalDisplayOptions,
} from './ExpoExternalDisplay.types';
import NativeExternalDisplayView from './ExpoExternalDisplayView';
import { getScreens, listenExternalDisplayEvents } from './ExternalDisplayEvents';
import { useExternalDisplay } from './useExternalDisplay';

const styles = StyleSheet.create({
  screen: StyleSheet.absoluteFillObject,
});

const ScreenContext = React.createContext<Screen | null>(null);

listenExternalDisplayEvents({
  onScreenConnect: () => {},
  onScreenChange: () => {},
  onScreenDisconnect: () => {},
});

export function useScreenSize(): Screen | null {
  return useContext(ScreenContext);
}

function ExternalDisplay(props: ExternalDisplayProps) {
  const {
    screen = '',
    fallbackInMainScreen = false,
    mainScreenStyle,
    style,
    onScreenConnect,
    onScreenChange,
    onScreenDisconnect,
    ...nativeProps
  } = props;
  const screens = useExternalDisplay({
    onScreenConnect,
    onScreenChange,
    onScreenDisconnect,
  } satisfies UseExternalDisplayOptions);
  const selectedScreen = screen ? screens[screen] : undefined;

  if (!selectedScreen && !fallbackInMainScreen) {
    return null;
  }

  return (
    <ScreenContext.Provider value={selectedScreen ?? null}>
      <NativeExternalDisplayView
        pointerEvents={!selectedScreen ? 'box-none' : 'auto'}
        {...nativeProps}
        style={[
          selectedScreen && styles.screen,
          selectedScreen && {
            width: selectedScreen.width,
            height: selectedScreen.height,
          },
          style,
          !selectedScreen && mainScreenStyle,
        ]}
        screen={selectedScreen ? screen : ''}
        fallbackInMainScreen={fallbackInMainScreen}
      />
    </ScreenContext.Provider>
  );
}

export { getScreens, useExternalDisplay };
export * from './ExpoExternalDisplay.types';
export default ExternalDisplay;
