const MINUTE_IN_MS = 60 * 1000;

export const DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES = 30;
export const MIN_WIDGET_REFRESH_INTERVAL_MINUTES = 5;
export const MAX_WIDGET_REFRESH_INTERVAL_MINUTES = 24 * 60;

const clampMinutes = (minutes: number): number =>
  Math.min(MAX_WIDGET_REFRESH_INTERVAL_MINUTES, Math.max(MIN_WIDGET_REFRESH_INTERVAL_MINUTES, minutes));

export const getWidgetRefreshIntervalMs = (
  minutes = DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES,
): number => clampMinutes(minutes) * MINUTE_IN_MS;

export const getNextWidgetRefreshAt = (
  now: Date,
  status: 'ready' | 'error',
  minutes = DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES,
): string => {
  const effectiveMinutes = status === 'error' ? Math.max(MIN_WIDGET_REFRESH_INTERVAL_MINUTES, Math.floor(minutes / 2)) : minutes;

  return new Date(now.getTime() + getWidgetRefreshIntervalMs(effectiveMinutes)).toISOString();
};
