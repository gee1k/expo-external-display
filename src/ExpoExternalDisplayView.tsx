import { requireNativeView } from 'expo';

import type { NativeExternalDisplayViewProps } from './ExpoExternalDisplay.types';

export default requireNativeView<NativeExternalDisplayViewProps>('ExpoExternalDisplay');
