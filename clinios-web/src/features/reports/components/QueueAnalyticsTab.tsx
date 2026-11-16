import { useMemo } from 'react';
import type { EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts';
import { Card } from '../../../components/ui/Card';
import { Chart, useChartPalette } from '../../../components/charts/Chart';
import { AnalyticsSection } from './AnalyticsSection';
import { formatAxisDate, titleCase } from '../utils';
import { useQueueAnalyticsQuery, type AnalyticsDateRange, type QueueAnalyticsDto, type QueueWaitPoint } from '../api';

function formatWaitPoint(point: QueueWaitPoint): string {
  if (point.avgWaitMinutes === null) return 'no data';
  return `${point.avgWaitMinutes} min (${point.sampleSize} ${point.sampleSize === 1 ? 'patient' : 'patients'})`;
}

function WaitTimeTrendChart({ data }: { data: QueueAnalyticsDto }) {
  const palette = useChartPalette();
  const points = data.waitTrend;

  const option: EChartsOption = useMemo(
    () => ({
      grid: { left: 48, right: 16, top: 24, bottom: 32, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          const list = Array.isArray(params) ? params : [params];
          return list
            .map((p) => {
              const point = points[p.dataIndex];
              return `${p.name}: ${point ? formatWaitPoint(point) : 'no data'}`;
            })
            .join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        data: points.map((p) => formatAxisDate(p.date)),
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
      },
      yAxis: {
        type: 'value',
        name: 'Minutes',
        nameTextStyle: { color: palette.axisLabel },
        minInterval: 1,
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
        splitLine: { lineStyle: { color: palette.axisLine } },
      },
      series: [
        {
          type: 'line',
          name: 'Avg wait (min)',
          data: points.map((p) => p.avgWaitMinutes),
          smooth: true,
          connectNulls: true,
          itemStyle: { color: palette.primary },
          lineStyle: { color: palette.primary, width: 2 },
          areaStyle: { color: palette.primary, opacity: 0.12 },
        },
      ],
    }),
    [points, palette],
  );

  const summary = points.map((p) => `${formatAxisDate(p.date)}: ${formatWaitPoint(p)}`).join('; ');

  return (
    <Chart option={option} height={280} ariaLabel="Line chart of average patient waiting time over time" summary={summary} />
  );
}

function StatusDistributionChart({ data }: { data: QueueAnalyticsDto }) {
  const palette = useChartPalette();
  const rows = data.statusDistribution;

  const option: EChartsOption = useMemo(
    () => ({
      grid: { left: 150, right: 24, top: 16, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
        splitLine: { lineStyle: { color: palette.axisLine } },
      },
      yAxis: {
        type: 'category',
        data: rows.map((r) => titleCase(r.status)),
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
      },
      series: [
        {
          type: 'bar',
          name: 'Queue entries',
          data: rows.map((r) => r.count),
          barMaxWidth: 22,
          itemStyle: { color: palette.teal, borderRadius: [0, 4, 4, 0] },
        },
      ],
    }),
    [rows, palette],
  );

  const { noShow } = data;
  const noShowText =
    noShow.rate === null
      ? 'No-show rate unavailable.'
      : `No-show rate ${(noShow.rate * 100).toFixed(1)}% (${noShow.noShowCount} of ${noShow.eligibleCount} eligible).`;
  const summary = `${rows.map((r) => `${titleCase(r.status)}: ${r.count}`).join('; ')}. ${noShowText}`;
  const height = Math.max(220, rows.length * 32);

  return (
    <>
      <p className="mb-2 text-sm text-text-secondary">
        No-show rate:{' '}
        <span className="font-medium text-text-primary">
          {noShow.rate === null ? '—' : `${(noShow.rate * 100).toFixed(1)}%`}
        </span>
        {noShow.rate === null ? '' : ` — ${noShow.noShowCount} of ${noShow.eligibleCount} eligible`}
      </p>
      <Chart option={option} height={height} ariaLabel="Bar chart of queue entries by status" summary={summary} />
    </>
  );
}

export function QueueAnalyticsTab({ range }: { range: AnalyticsDateRange }) {
  const query = useQueueAnalyticsQuery(range);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="min-w-0 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-text-primary">Average Waiting Time Trend</h3>
        <div className="mt-3">
          <AnalyticsSection
            isLoading={query.isLoading}
            isError={query.isError}
            data={query.data}
            isEmpty={(data) => data.waitTrend.length === 0}
          >
            {(data) => <WaitTimeTrendChart data={data} />}
          </AnalyticsSection>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          Average minutes patients waited each day, from check-in to being called, across the selected range.
        </p>
      </Card>

      <Card className="min-w-0 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-text-primary">Queue Status Distribution</h3>
        <div className="mt-3">
          <AnalyticsSection
            isLoading={query.isLoading}
            isError={query.isError}
            data={query.data}
            isEmpty={(data) => data.statusDistribution.length === 0}
          >
            {(data) => <StatusDistributionChart data={data} />}
          </AnalyticsSection>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          How many queue entries landed in each status during the selected range.
        </p>
      </Card>
    </div>
  );
}
