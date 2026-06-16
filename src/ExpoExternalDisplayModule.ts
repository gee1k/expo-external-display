import { NativeModule, requireNativeModule } from 'expo';

import type { ScreenInfo } from './ExpoExternalDisplay.types';

type ExpoExternalDisplayEvents = {
  '@ExpoExternalDisplay_screenDidConnect': (screens: ScreenInfo) => void;
  '@ExpoExternalDisplay_screenDidChange': (screens: ScreenInfo) => void;
  '@ExpoExternalDisplay_screenDidDisconnect': (screens: ScreenInfo) => void;
};

type ExpoExternalDisplayConstants = {
  SCREEN_INFO?: ScreenInfo;
};

declare class ExpoExternalDisplayModule extends NativeModule<ExpoExternalDisplayEvents> {
  getConstants?: () => ExpoExternalDisplayConstants;
  init?: () => void;
  getInitialScreens?: () => { SCREEN_INFO: ScreenInfo };
}

export default requireNativeModule<ExpoExternalDisplayModule>('ExpoExternalDisplay');
