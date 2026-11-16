import * as React from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { cn } from '../../lib/utils';

/**
 * ECharts renders to canvas, so it needs literal color values, never CSS
 * variables. Instead of hand-tuned hex mirrors that drift when the theme
 * changes, the palette is RESOLVED FROM THE DESIGN TOKENS AT RUNTIME
 * (styles/tokens.css) — rebranding the tokens re-themes every chart for free.
 * Keys keep their historical names (`teal` = the secondary series color) so
 * chart consumers never change.
 */
export interface ChartPalette {
  primary: string;
  teal: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  axisLabel: string;
  axisLine: string;
  surface: string;
  text: string;
}

/** Which CSS token each palette slot reads. */
const PALETTE_TOKENS: Record<keyof ChartPalette, string> = {
  primary: '--chart-1',
  teal: '--chart-2',
  success: '--success',
  warning: '--warning',
  danger: '--danger',
  info: '--info',
  axisLabel: '--text-secondary',
  axisLine: '--border',
  surface: '--surface',
  text: '--text-primary',
};

/** Fallbacks when computed styles are unavailable (tests/SSR) — mono theme values. */
const FALLBACK_PALETTE: { light: ChartPalette; dark: ChartPalette } = {
  light: {
    primary: 'rgb(15, 15, 15)',
    teal: 'rgb(115, 115, 115)',
    success: 'rgb(22, 101, 52)',
    warning: 'rgb(146, 64, 14)',
    danger: 'rgb(153, 27, 27)',
    info: 'rgb(30, 64, 175)',
    axisLabel: 'rgb(82, 82, 82)',
    axisLine: 'rgb(229, 229, 229)',
    surface: 'rgb(255, 255, 255)',
    text: 'rgb(15, 15, 15)',
  },
  dark: {
    primary: 'rgb(245, 245, 245)',
    teal: 'rgb(140, 140, 140)',
    success: 'rgb(96, 190, 130)',
    warning: 'rgb(217, 168, 74)',
    danger: 'rgb(224, 106, 106)',
    info: 'rgb(110, 168, 230)',
    axisLabel: 'rgb(163, 163, 163)',
    axisLine: 'rgb(38, 38, 38)',
    surface: 'rgb(17, 17, 17)',
    text: 'rgb(245, 245, 245)',
  },
};

function detectDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'dark') return true;
  if (explicit === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve the palette from the live CSS tokens ("R G B" triplets) on <html>. */
function readPalette(): ChartPalette {
  const fallback = detectDarkMode() ? FALLBACK_PALETTE.dark : FALLBACK_PALETTE.light;
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const styles = getComputedStyle(document.documentElement);
  const resolved = {} as ChartPalette;
  for (const key of Object.keys(PALETTE_TOKENS) as Array<keyof ChartPalette>) {
    const triplet = styles.getPropertyValue(PALETTE_TOKENS[key]).trim();
    resolved[key] = triplet ? `rgb(${triplet.split(/\s+/).join(', ')})` : fallback[key];
  }
  return resolved;
}

/** Tracks the theme the same way styles/tokens.css resolves it (data-theme override, else OS preference). */
export function useChartPalette(): ChartPalette {
  const [palette, setPalette] = React.useState(readPalette);

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPalette(readPalette());
    media.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      media.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return palette;
}

interface SeriesDatum {
  name?: string;
  value?: unknown;
}

/** Best-effort fallback summary when the caller doesn't pass an explicit one. */
function deriveSummary(option: EChartsOption): string {
  const seriesOption = option.series;
  const seriesList = Array.isArray(seriesOption) ? seriesOption : seriesOption ? [seriesOption] : [];
  const parts: string[] = [];

  for (const series of seriesList) {
    const data = (series as { data?: unknown }).data;
    if (!Array.isArray(data)) continue;
    for (const point of data) {
      if (point && typeof point === 'object' && 'value' in point) {
        const datum = point as SeriesDatum;
        if (datum.name !== undefined) parts.push(`${datum.name}: ${String(datum.value)}`);
      } else if (typeof point === 'number' || typeof point === 'string') {
        parts.push(String(point));
      }
    }
  }

  return parts.length > 0 ? parts.join('; ') : 'No data available for this chart.';
}

export interface ChartProps {
  /** Full ECharts option object — this component only owns mount/resize/dispose lifecycle. */
  option: EChartsOption;
  /** Pixel height of the chart canvas. */
  height?: number;
  /** Accessible name for the chart, announced by screen readers (role="img"). */
  ariaLabel: string;
  /** Plain-text description of the underlying data, rendered visually hidden for screen readers. */
  summary?: string;
  className?: string;
}

/**
 * Thin Apache ECharts wrapper. Owns the imperative init/resize/dispose
 * lifecycle and applies theme-aware tooltip defaults — callers build the rest
 * of the `EChartsOption` (series, axes) using `useChartPalette()` for colors.
 */
export function Chart({ option, height = 280, ariaLabel, summary, className }: ChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<echarts.ECharts | null>(null);
  const palette = useChartPalette();

  // Consumers configure tooltip triggers/formatters but not colors — inject
  // token-derived styling underneath so tooltips follow the theme (the ECharts
  // default is a white card, illegible in dark mode).
  const themedOption = React.useMemo<EChartsOption>(() => {
    const tooltip = option.tooltip;
    if (!tooltip || Array.isArray(tooltip)) return option;
    return {
      ...option,
      tooltip: {
        backgroundColor: palette.surface,
        borderColor: palette.axisLine,
        textStyle: { color: palette.text },
        ...tooltip,
      },
    };
  }, [option, palette]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const instance = echarts.init(containerRef.current);
    chartRef.current = instance;

    const handleResize = () => instance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      instance.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    chartRef.current?.setOption(themedOption, true);
  }, [themedOption]);

  const resolvedSummary = summary ?? deriveSummary(option);

  return (
    <div role="img" aria-label={ariaLabel} className={cn('w-full', className)} style={{ height }}>
      <div ref={containerRef} className="h-full w-full" aria-hidden="true" />
      <span className="sr-only">{resolvedSummary}</span>
    </div>
  );
}
