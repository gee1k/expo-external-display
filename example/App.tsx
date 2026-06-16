import React, { useMemo, useCallback } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ExternalDisplay, {
  getScreens,
  useExternalDisplay,
  useScreenSize,
  type Screen,
} from '@isvend/expo-external-display';

function ExternalContent() {
  const screen = useScreenSize();
  const mainWindow = Dimensions.get('window');

  const scaleWidth = screen ? screen.width / mainWindow.width : 1;
  const scaleHeight = screen ? screen.height / mainWindow.height : 1;
  const scale = Math.min(scaleWidth, scaleHeight);

  const scaleSize = useCallback((size: number) => size * scale, [scale]);

  return (
    <View style={styles.externalSurface}>
      <Text style={styles.externalTitle}>External Display</Text>
      <Text style={styles.externalMeta}>
        {screen ? `${screen.width} x ${screen.height}` : 'Fallback on main screen'}
      </Text>
      <Text style={{ fontSize: scaleSize(20), color: '#b6c2cf', marginTop: scaleSize(10) }}>
        Dynamically scaled to fit the screen size. The content should fill the screen while
        maintaining its aspect ratio.
      </Text>
    </View>
  );
}

function screenId(screen: Screen | undefined) {
  return screen?.id == null ? '' : String(screen.id);
}

export default function App() {
  const screens = useExternalDisplay();
  const allScreens = useMemo(() => Object.values(screens), [screens]);
  const firstScreen = allScreens[0];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.panel}>
            <Text style={styles.title}>@isvend/expo-external-display</Text>
            <Text style={styles.label}>Detected screens: {allScreens.length}</Text>
            <Text style={styles.value}>{JSON.stringify(getScreens(), null, 2)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>External Display Preview</Text>
            <Text style={styles.description}>
              Connect HDMI, AirPlay, Sidecar, or an Android presentation display. The content below
              renders on the first detected external screen, and falls back here while no screen is
              connected.
            </Text>
            <ExternalDisplay
              screen={screenId(firstScreen)}
              fallbackInMainScreen
              mainScreenStyle={styles.preview}
            >
              <ExternalContent />
            </ExternalDisplay>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101418',
  },
  scroll: {
    gap: 18,
    padding: 16,
  },
  panel: {
    gap: 10,
  },
  title: {
    color: '#f7f3e8',
    fontSize: 28,
    fontWeight: '700',
  },
  label: {
    color: '#95d5b2',
    fontSize: 16,
  },
  value: {
    color: '#d8dee9',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#f7f3e8',
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    color: '#b6c2cf',
    fontSize: 14,
    lineHeight: 20,
  },
  preview: {
    height: 260,
  },
  externalSurface: {
    alignItems: 'center',
    backgroundColor: '#262a33',
    borderColor: '#ff6b6b',
    borderWidth: 2,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  externalTitle: {
    color: '#ff6b6b',
    fontSize: 38,
    fontWeight: '800',
  },
  externalMeta: {
    color: '#f7f3e8',
    fontSize: 16,
    marginTop: 10,
  },
});
