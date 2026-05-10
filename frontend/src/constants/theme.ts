export const CHART_COLORS = {
  UP: '#e63946',
  DOWN: '#1a936f',
  FLAT: '#ffffff',
  GRID: '#e8e8e8',
  BG: '#ffffff',
  PRICE_LINE: '#333333',
  AVG_LINE: '#ff8c00',
  YEST_CLOSE: '#1e90ff',
} as const;

export const CHART_CONFIG = {
  WIDTH: 800,
  HEIGHT: 400,
  PADDING: { TOP: 50, BOTTOM: 50, LEFT: 60, RIGHT: 60 },
} as const;

export const TRADING_TIME = {
  MORNING_START: 9 * 60 + 30,
  MORNING_END: 11 * 60 + 30,
  AFTERNOON_START: 13 * 60,
  AFTERNOON_END: 15 * 60,
} as const;
