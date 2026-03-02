const MINUTE_IN_MS = 60 * 1000;

export const DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES = 30;

export const getWidgetRefreshIntervalMs = (
  minutes = DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES,
): number => minutes * MINUTE_IN_MS;

