import { NativeModules, Platform } from 'react-native';

import { AsyncStorageWidgetBridge, NativeWidgetBridge, type WidgetBridge } from './widget-bridge';

const WIDGET_NATIVE_MODULE_NAME = 'JoplinTodoWidgetBridge';

const getNativeWidgetModule = () => {
  const module = NativeModules[WIDGET_NATIVE_MODULE_NAME];
  return module ?? null;
};

export const createWidgetBridge = (): WidgetBridge => {
  if (Platform.OS !== 'android') {
    return new AsyncStorageWidgetBridge();
  }

  const nativeModule = getNativeWidgetModule();
  if (!nativeModule) {
    return new AsyncStorageWidgetBridge();
  }

  return new NativeWidgetBridge(nativeModule);
};
