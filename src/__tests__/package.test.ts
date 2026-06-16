import expoModuleConfig from '../../expo-module.config.json';
import packageJson from '../../package.json';

describe('package release configuration', () => {
  it('only declares native Expo module platforms', () => {
    expect(expoModuleConfig.platforms).toEqual(['apple', 'android']);
  });

  it('publishes only runtime package files', () => {
    expect(packageJson.files).toEqual([
      'build',
      'ios',
      'android/src',
      'android/build.gradle',
      'expo-module.config.json',
      'README.md',
      'LICENSE',
    ]);
  });
});
