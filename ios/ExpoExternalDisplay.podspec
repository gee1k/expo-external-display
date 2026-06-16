Pod::Spec.new do |s|
  s.name           = 'ExpoExternalDisplay'
  s.version        = '0.1.0'
  s.summary        = 'Render React Native content on an external display'
  s.description    = 'Expo Module implementation of the react-native-external-display API.'
  s.author         = 'Svend'
  s.homepage       = 'https://github.com/gee1k/expo-external-display'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: 'https://github.com/gee1k/expo-external-display.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
