export const FIVE_YEAR_WINDOW_SIZE = 5;

export interface WindowGrowthSummary {
  years: number[];
  startYear: number | null;
  endYear: number | null;
  startValue: number;
  endValue: number;
  total: number;
  delta: number;
  growthPercent: number;
  cagrPercent: number;
}

export function sortYearsAsc(years: number[]) {
  return [...years].sort((a, b) => a - b);
}

/** Build a trailing window of up to `windowSize` years ending at `endYear`. */
export function buildTrailingYearWindow(
  years: number[],
  endYear: number,
  windowSize: number = FIVE_YEAR_WINDOW_SIZE,
) {
  const eligible = sortYearsAsc(years).filter(y => y <= endYear);
  if (!eligible.length) return [];
  return eligible.slice(Math.max(0, eligible.length - windowSize));
}

/** Build all rolling windows of `windowSize` from a sorted year list. */
export function buildRollingYearWindows(
  years: number[],
  windowSize: number = FIVE_YEAR_WINDOW_SIZE,
) {
  const sorted = sortYearsAsc(years);
  if (!sorted.length) return [];
  if (sorted.length <= windowSize) return [sorted];
  const windows: number[][] = [];
  for (let i = 0; i <= sorted.length - windowSize; i++) {
    windows.push(sorted.slice(i, i + windowSize));
  }
  return windows;
}

export function formatYearWindowLabel(years: number[]) {
  if (!years.length) return 'sem período';
  if (years.length === 1) return String(years[0]);
  return `${years[0]}–${years[years.length - 1]}`;
}

export function summarizeSeriesWindow(
  valuesByYear: Map<number, number>,
  years: number[],
): WindowGrowthSummary {
  const sorted = sortYearsAsc(years);
  if (!sorted.length) {
    return { years: [], startYear: null, endYear: null, startValue: 0, endValue: 0, total: 0, delta: 0, growthPercent: 0, cagrPercent: 0 };
  }
  const series = sorted.map(y => valuesByYear.get(y) ?? 0);
  const startValue = series[0];
  const endValue = series[series.length - 1];
  const delta = endValue - startValue;
  const total = series.reduce((s, v) => s + v, 0);

  let growthPercent = 0;
  if (startValue > 0) growthPercent = (delta / startValue) * 100;
  else if (endValue > 0 && delta > 0) growthPercent = 100;

  const periods = Math.max(sorted.length - 1, 1);
  let cagrPercent = 0;
  if (startValue > 0 && endValue > 0) cagrPercent = (Math.pow(endValue / startValue, 1 / periods) - 1) * 100;
  else if (startValue === 0 && endValue > 0) cagrPercent = 100 / periods;

  return { years: sorted, startYear: sorted[0], endYear: sorted[sorted.length - 1], startValue, endValue, total, delta, growthPercent, cagrPercent };
}

export function pickBestWindow(valuesByYear: Map<number, number>, windows: number[][]) {
  if (!windows.length) return summarizeSeriesWindow(valuesByYear, []);
  let best = summarizeSeriesWindow(valuesByYear, windows[0]);
  for (const w of windows.slice(1)) {
    const s = summarizeSeriesWindow(valuesByYear, w);
    if (s.growthPercent > best.growthPercent || (s.growthPercent === best.growthPercent && s.delta > best.delta)) best = s;
  }
  return best;
}

export function roundTrend(v: number) { return Math.round(v * 10) / 10; }