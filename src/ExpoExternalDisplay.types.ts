import type { NativeEventSubscription, StyleProp, ViewProps, ViewStyle } from 'react-native';

export type Screen = {
  id: string | number;
  width: number;
  height: number;
  mirrored?: boolean;
  wantsSoftwareDimming?: boolean;
};

export type ScreenInfo = Record<string, Screen>;

export type UseExternalDisplayOptions = {
  onScreenConnect?: (screens: ScreenInfo) => void;
  onScreenChange?: (screens: ScreenInfo) => void;
  onScreenDisconnect?: (screens: ScreenInfo) => void;
};

export type ExternalDisplayProps = ViewProps &
  UseExternalDisplayOptions & {
    mainScreenStyle?: StyleProp<ViewStyle>;
    screen?: string;
    fallbackInMainScreen?: boolean;
  };

export type NativeExternalDisplayViewProps = ViewProps & {
  screen?: string;
  fallbackInMainScreen?: boolean;
};

export type ExternalDisplayEventMap = {
  connect: NativeEventSubscription;
  change: NativeEventSubscription;
  disconnect: NativeEventSubscription;
};
