import { useEffect, useState } from 'react';

import type { ScreenInfo, UseExternalDisplayOptions } from './ExpoExternalDisplay.types';
import { getScreens, listenExternalDisplayEvents } from './ExternalDisplayEvents';

export function useExternalDisplay(options: UseExternalDisplayOptions = {}): ScreenInfo {
  const [screens, setScreens] = useState(getScreens);

  useEffect(() => {
    const { connect, change, disconnect } = listenExternalDisplayEvents({
      onScreenConnect: (info) => {
        setScreens(info);
        options.onScreenConnect?.(info);
      },
      onScreenChange: (info) => {
        setScreens(info);
        options.onScreenChange?.(info);
      },
      onScreenDisconnect: (info) => {
        setScreens(info);
        options.onScreenDisconnect?.(info);
      },
    });

    return () => {
      connect.remove();
      change.remove();
      disconnect.remove();
    };
  }, []);

  return screens;
}
