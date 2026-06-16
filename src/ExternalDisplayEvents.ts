import { Dimensions, NativeEventSubscription, Platform } from 'react-native';

import type {
  ExternalDisplayEventMap,
  ScreenInfo,
  UseExternalDisplayOptions,
} from './ExpoExternalDisplay.types';
import ExpoExternalDisplayModule from './ExpoExternalDisplayModule';

export const SCREEN_DID_CONNECT = '@ExpoExternalDisplay_screenDidConnect';
export const SCREEN_DID_CHANGE = '@ExpoExternalDisplay_screenDidChange';
export const SCREEN_DID_DISCONNECT = '@ExpoExternalDisplay_screenDidDisconnect';

const getScale = () => {
  if (Platform.OS === 'ios') {
    return 1;
  }
  return Dimensions.get('window').scale || 1;
};

function normalizeScreens(info: ScreenInfo | null | undefined): ScreenInfo {
  const scale = getScale();

  return Object.entries(info ?? {}).reduce<ScreenInfo>((result, [screenId, screen]) => {
    result[screenId] = {
      ...screen,
      width: screen.width / scale,
      height: screen.height / scale,
    };
    return result;
  }, {});
}

function readInitialScreens(): ScreenInfo {
  const constants = ExpoExternalDisplayModule.getConstants?.() ?? {};
  const initial = ExpoExternalDisplayModule.getInitialScreens?.();

  return normalizeScreens(initial?.SCREEN_INFO ?? constants.SCREEN_INFO ?? {});
}

let screenInfo = readInitialScreens();
let isInitialized = false;

export function getScreens(): ScreenInfo {
  return screenInfo;
}

function updateScreens(info: ScreenInfo) {
  screenInfo = normalizeScreens(info);
  return screenInfo;
}

export function listenExternalDisplayEvents({
  onScreenConnect,
  onScreenChange,
  onScreenDisconnect,
}: UseExternalDisplayOptions): ExternalDisplayEventMap {
  if (!isInitialized) {
    ExpoExternalDisplayModule.init?.();
    isInitialized = true;
  }

  const connect = ExpoExternalDisplayModule.addListener(SCREEN_DID_CONNECT, (info: ScreenInfo) => {
    onScreenConnect?.(updateScreens(info));
  });
  const change = ExpoExternalDisplayModule.addListener(SCREEN_DID_CHANGE, (info: ScreenInfo) => {
    onScreenChange?.(updateScreens(info));
  });
  const disconnect = ExpoExternalDisplayModule.addListener(
    SCREEN_DID_DISCONNECT,
    (info: ScreenInfo) => {
      onScreenDisconnect?.(updateScreens(info));
    }
  );

  return { connect, change, disconnect };
}

export function __setScreensForTests(nextScreens: ScreenInfo) {
  screenInfo = normalizeScreens(nextScreens);
}

export type { NativeEventSubscription };
