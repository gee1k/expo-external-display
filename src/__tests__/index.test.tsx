import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import ExpoExternalDisplayModule from '../ExpoExternalDisplayModule';
import { __setScreensForTests, SCREEN_DID_CONNECT } from '../ExternalDisplayEvents';
import ExternalDisplay, { getScreens, useExternalDisplay } from '../index';

jest.mock('react-native', () => ({
  Dimensions: {
    get: () => ({ scale: 2 }),
  },
  Platform: {
    OS: 'android',
  },
  StyleSheet: {
    absoluteFillObject: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    create: (styles: unknown) => styles,
  },
  Text: 'Text',
}));

jest.mock('expo', () => {
  class NativeModule {
    private listeners = new Map<string, Set<(payload: unknown) => void>>();

    addListener(eventName: string, listener: (payload: unknown) => void) {
      const listeners = this.listeners.get(eventName) ?? new Set();
      listeners.add(listener);
      this.listeners.set(eventName, listeners);
      return {
        remove: () => listeners.delete(listener),
      };
    }

    emit(eventName: string, payload: unknown) {
      this.listeners.get(eventName)?.forEach((listener) => listener(payload));
    }
  }

  const module = new NativeModule();
  return {
    NativeModule,
    requireNativeModule: () => module,
    requireNativeView: () => 'ExpoExternalDisplay',
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('expo-external-display public API', () => {
  let consoleErrorSpy: jest.SpyInstance;
  const originalConsoleError = console.error;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) {
        return;
      }
      originalConsoleError(message, ...args);
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    __setScreensForTests({});
  });

  it('returns cached screen info', () => {
    __setScreensForTests({
      '2': { id: 2, width: 1920, height: 1080 },
    });

    expect(getScreens()).toEqual({
      '2': { id: 2, width: 960, height: 540 },
    });
  });

  it('renders null when no screen is selected and fallback is disabled', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExternalDisplay screen="2">
          <Text>External</Text>
        </ExternalDisplay>
      );
    });

    expect(tree!.toJSON()).toBeNull();
  });

  it('renders on the main screen when fallback is enabled', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExternalDisplay screen="2" fallbackInMainScreen mainScreenStyle={{ opacity: 0.5 }}>
          <Text>External</Text>
        </ExternalDisplay>
      );
    });

    expect(tree!.root.findByType('ExpoExternalDisplay').props.screen).toBe('');
    expect(tree!.root.findByType('ExpoExternalDisplay').props.pointerEvents).toBe('box-none');
  });

  it('renders selected screen dimensions when screen exists', () => {
    __setScreensForTests({
      '2': { id: 2, width: 1920, height: 1080 },
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExternalDisplay screen="2">
          <Text>External</Text>
        </ExternalDisplay>
      );
    });
    const view = tree!.root.findByType('ExpoExternalDisplay');

    expect(view.props.screen).toBe('2');
    expect(view.props.pointerEvents).toBe('auto');
    expect(view.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 960, height: 540 })])
    );
  });

  it('updates hook subscribers from native events', () => {
    const received: unknown[] = [];

    function HookProbe() {
      const screens = useExternalDisplay({
        onScreenConnect: (info) => received.push(info),
      });
      return <Text>{Object.keys(screens).join(',')}</Text>;
    }

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<HookProbe />);
    });

    act(() => {
      ExpoExternalDisplayModule.emit(SCREEN_DID_CONNECT, {
        '3': { id: 3, width: 300, height: 200 },
      });
    });

    expect(received).toEqual([{ '3': { id: 3, width: 150, height: 100 } }]);
    expect(tree!.root.findByType(Text).props.children).toBe('3');
  });
});
