import { useMemo, useState, type ReactNode } from 'react';
import type { EChartsOption } from 'echarts';
import type { UseQueryResult } from '@tanstack/react-query';
import { formatMoney } from '@/config';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Chart, useChartPalette, type ChartPalette } from '../../../components/charts/Chart';
import {
  useEmergencyAnalyticsQuery,
  usePatientAnalyticsQuery,
  useQueueAnalyticsQuery,
  useRevenueAnalyticsQuery,
  type AnalyticsDateRange,
} from '../../reports/api';
import { rangeForLastDays } from '../../reports/components/DateRangePicker';
import { formatAxisDate, titleCase, PAYMENT_METHOD_LABELS } from '../../reports/utils';

const RANGE_PRESETS = [7, 30, 90] as const;
type RangeDays = (typeof RANGE_PRESETS)[number];

const CHART_HEIGHT = 240;

/** Shared cartesian axis styling â€” hairline grid, secondary-ink labels. */
function axisDefaults(palette: ChartPalette) {
  return {
    axisLine: { lineStyle: { color: palette.axisLine } },
    axisLabel: { color: palette.axisLabel },
    splitLine: { lineStyle: { color: palette.axisLine } },
  } as const;
}

/** Label / value pairs rendered as a compact stat strip under a chart. */
function StatStrip({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-border-subtle pt-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <dt className="text-xs text-text-secondary">{item.label}</dt>
          <dd className="text-sm font-semibold text-text-primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Chart card with unified loading / error / empty handling for one query. */
function TrendCard({
  title,
  description,
  query,
  isEmpty,
  children,
}: {
  title: string;
  description: string;
  query: Pick<UseQueryResult, 'isLoading' | 'isError' | 'refetch'>;
  isEmpty?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {query.isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : query.isError ? (
        <div className="mt-6 flex flex-col items-start gap-2">
          <p className="text-sm text-text-secondary">Couldn't load this report.</p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      ) : isEmpty ? (
        <p className="mt-6 text-sm text-text-secondary">No data for this range.</p>
      ) : (
        <div className="mt-3">{children}</div>
      )}
      <p className="mt-2 text-xs text-text-secondary">{description}</p>
    </Card>
  );
}

/**
 * Clinic-wide trend analytics for the dashboard (spec Â§40 endpoints). Rendered
 * only for roles holding `reports.view` â€” the caller gates it. Range presets
 * keep this an at-a-glance section; the Reports page has full pickers.
 */
export function TrendsSection() {
  const [days, setDays] = useState<RangeDays>(30);
  const range: AnalyticsDateRange = useMemo(() => rangeForLastDays(days), [days]);
  const palette = useChartPalette();

  const patientsQuery = usePatientAnalyticsQuery(range);
  const queueQuery = useQueueAnalyticsQuery(range);
  const revenueQuery = useRevenueAnalyticsQuery(range);
  const emergencyQuery = useEmergencyAnalyticsQuery(range);

  // ---- Patient visits: stacked columns, new (ink) vs returning (gray) ------
  const patients = patientsQuery.data;
  const patientsOption: EChartsOption = useMemo(() => {
    const daily = patients?.daily ?? [];
    return {
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      legend: {
        top: 0,
        left: 0,
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: palette.axisLabel },
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: daily.map((d) => formatAxisDate(d.date)),
        ...axisDefaults(palette),
        splitLine: { show: false },
      },
      yAxis: { type: 'value', minInterval: 1, ...axisDefaults(palette) },
      series: [
        {
          name: 'New',
          type: 'bar',
          stack: 'patients',
          data: daily.map((d) => d.newCount),
          barMaxWidth: 20,
          itemStyle: { color: palette.primary, borderColor: palette.surface, borderWidth: 2 },
        },
        {
          name: 'Returning',
          type: 'bar',
          stack: 'patients',
          data: daily.map((d) => d.returningCount),
          barMaxWidth: 20,
          itemStyle: {
            color: palette.teal,
            borderColor: palette.surface,
            borderWidth: 2,
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [patients, palette]);

  // ---- Average wait: single-series line with a quiet area wash -------------
  const queue = queueQuery.data;
  const waitOption: EChartsOption = useMemo(() => {
    const trend = queue?.waitTrend ?? [];
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const [point] = params as { dataIndex: number; axisValueLabel: string }[];
          if (!point) return '';
          const day = trend[point.dataIndex];
          if (!day || day.avgWaitMinutes === null) return `${point.axisValueLabel}: no data`;
          const patients = day.sampleSize === 1 ? '1 patient' : `${day.sampleSize} patients`;
          return `${point.axisValueLabel}: ${day.avgWaitMinutes} min (${patients})`;
        },
      },
      xAxis: {
        type: 'category',
        data: trend.map((d) => formatAxisDate(d.date)),
        ...axisDefaults(palette),
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...axisDefaults(palette),
        axisLabel: { color: palette.axisLabel, formatter: '{value} min' },
      },
      series: [
        {
          name: 'Avg wait',
          type: 'line',
          data: trend.map((d) => d.avgWaitMinutes),
          connectNulls: false,
          lineStyle: { width: 2, color: palette.primary },
          itemStyle: { color: palette.primary, borderColor: palette.surface, borderWidth: 2 },
          symbolSize: 7,
          showSymbol: false,
          areaStyle: { color: palette.primary, opacity: 0.08 },
        },
      ],
    };
  }, [queue, palette]);

  const noShowRate =
    queue && queue.noShow.rate !== null ? `${(queue.noShow.rate * 100).toFixed(1)}%` : 'â€”';

  // ---- Revenue: net daily columns; gross/refunds live in the tooltip -------
  const revenue = revenueQuery.data;
  const revenueOption: EChartsOption = useMemo(() => {
    const daily = revenue?.daily ?? [];
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const [point] = params as { dataIndex: number; axisValueLabel: string }[];
          if (!point) return '';
          const day = daily[point.dataIndex];
          if (!day) return '';
          return [
            point.axisValueLabel,
            `Net: ${formatMoney(day.revenuePaise)}`,
            `Gross: ${formatMoney(day.grossPaise)}`,
            `Refunded: ${formatMoney(day.refundedPaise)}`,
          ].join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        data: daily.map((d) => formatAxisDate(d.date)),
        ...axisDefaults(palette),
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...axisDefaults(palette),
        axisLabel: { color: palette.axisLabel, formatter: (value: number) => `â‚¹${value}` },
      },
      series: [
        {
          name: 'Net revenue',
          type: 'bar',
          data: daily.map((d) => Math.round(d.revenuePaise / 100)),
          barMaxWidth: 20,
          itemStyle: { color: palette.primary, borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [revenue, palette]);

  // ---- Payment mix: horizontal bars with direct value labels ---------------
  const mixOption: EChartsOption = useMemo(() => {
    const byMethod = revenue?.byMethod ?? [];
    return {
      grid: { left: 8, right: 72, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const [point] = params as { dataIndex: number }[];
          const row = point ? byMethod[point.dataIndex] : undefined;
          if (!row) return '';
          return `${PAYMENT_METHOD_LABELS[row.method]}: ${formatMoney(row.revenuePaise)}`;
        },
      },
      xAxis: { type: 'value', ...axisDefaults(palette) },
      yAxis: {
        type: 'category',
        data: byMethod.map((row) => PAYMENT_METHOD_LABELS[row.method]),
        ...axisDefaults(palette),
      },
      series: [
        {
          name: 'Net revenue',
          type: 'bar',
          data: byMethod.map((row) => Math.round(row.revenuePaise / 100)),
          barMaxWidth: 20,
          itemStyle: { color: palette.teal, borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            color: palette.axisLabel,
            formatter: (params: { dataIndex: number }) => {
              const row = byMethod[params.dataIndex];
              return row ? formatMoney(row.revenuePaise) : '';
            },
          },
        },
      ],
    };
  }, [revenue, palette]);

  // ---- Emergencies: volume line + priority mix in status colors ------------
  const emergency = emergencyQuery.data;
  const emergencyVolumeOption: EChartsOption = useMemo(() => {
    const trend = emergency?.volumeTrend ?? [];
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: trend.map((d) => formatAxisDate(d.date)),
        ...axisDefaults(palette),
        splitLine: { show: false },
      },
      yAxis: { type: 'value', minInterval: 1, ...axisDefaults(palette) },
      series: [
        {
          name: 'Emergency cases',
          type: 'line',
          data: trend.map((d) => d.count),
          lineStyle: { width: 2, color: palette.primary },
          itemStyle: { color: palette.primary, borderColor: palette.surface, borderWidth: 2 },
          symbolSize: 7,
          showSymbol: false,
          areaStyle: { color: palette.primary, opacity: 0.08 },
        },
      ],
    };
  }, [emergency, palette]);

  const priorityOption: EChartsOption = useMemo(() => {
    const distribution = emergency?.priorityDistribution ?? [];
    const priorityColor: Record<string, string> = {
      critical: palette.danger,
      urgent: palette.warning,
      standard: palette.info,
      unconfirmed: palette.axisLabel,
    };
    return {
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', minInterval: 1, ...axisDefaults(palette) },
      yAxis: {
        type: 'category',
        data: distribution.map((row) => titleCase(row.priority)),
        ...axisDefaults(palette),
      },
      series: [
        {
          name: 'Cases',
          type: 'bar',
          data: distribution.map((row) => ({
            value: row.count,
            itemStyle: {
              color: priorityColor[row.priority] ?? palette.axisLabel,
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barMaxWidth: 20,
          label: { show: true, position: 'right', color: palette.axisLabel },
        },
      ],
    };
  }, [emergency, palette]);

  const avgToDoctor =
    emergency && emergency.avgTimeToDoctorMinutes !== null
      ? `${Math.round(emergency.avgTimeToDoctorMinutes)} min`
      : 'â€”';

  return (
    <section aria-label="Clinic trends" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Trends</h2>
          <p className="text-sm text-text-secondary">Clinic-wide analytics for the selected period.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1" role="group" aria-label="Trend range">
          {RANGE_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={days === preset ? 'primary' : 'ghost'}
              aria-pressed={days === preset}
              onClick={() => setDays(preset)}
            >
              {preset} days
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendCard
          title="Patient Visits"
          description="Daily first-time and returning patients across the clinic."
          query={patientsQuery}
          isEmpty={!patients || patients.daily.length === 0}
        >
          <Chart
            option={patientsOption}
            height={CHART_HEIGHT}
            ariaLabel={`Stacked bar chart of new and returning patients over the last ${days} days`}
            summary={
              patients
                ? `New patients: ${patients.totals.newCount}. Returning patients: ${patients.totals.returningCount}. Total visits: ${patients.totals.totalCount}.`
                : undefined
            }
          />
          {patients && (
            <StatStrip
              items={[
                { label: 'New', value: String(patients.totals.newCount) },
                { label: 'Returning', value: String(patients.totals.returningCount) },
                { label: 'Total', value: String(patients.totals.totalCount) },
              ]}
            />
          )}
        </TrendCard>

        <TrendCard
          title="Average Wait Time"
          description="Daily average from check-in to consultation start. Gaps are days without completed waits."
          query={queueQuery}
          isEmpty={!queue || queue.waitTrend.length === 0}
        >
          <Chart
            option={waitOption}
            height={CHART_HEIGHT}
            ariaLabel={`Line chart of average patient wait time over the last ${days} days`}
            summary={
              queue
                ? `No-show rate ${noShowRate} (${queue.noShow.noShowCount} of ${queue.noShow.eligibleCount} eligible appointments).`
                : undefined
            }
          />
          {queue && (
            <StatStrip
              items={[
                { label: 'No-show rate', value: noShowRate },
                {
                  label: 'No-shows',
                  value: `${queue.noShow.noShowCount} of ${queue.noShow.eligibleCount}`,
                },
              ]}
            />
          )}
        </TrendCard>

        <TrendCard
          title="Revenue"
          description="Daily net collections (gross minus refunds), from recorded payments."
          query={revenueQuery}
          isEmpty={!revenue || revenue.daily.length === 0}
        >
          <Chart
            option={revenueOption}
            height={CHART_HEIGHT}
            ariaLabel={`Bar chart of daily net revenue over the last ${days} days`}
            summary={
              revenue
                ? `Gross ${formatMoney(revenue.totals.grossPaise)}, refunded ${formatMoney(revenue.totals.refundedPaise)}, net ${formatMoney(revenue.totals.revenuePaise)}.`
                : undefined
            }
          />
          {revenue && (
            <StatStrip
              items={[
                { label: 'Gross', value: formatMoney(revenue.totals.grossPaise) },
                { label: 'Refunded', value: formatMoney(revenue.totals.refundedPaise) },
                { label: 'Net', value: formatMoney(revenue.totals.revenuePaise) },
              ]}
            />
          )}
        </TrendCard>

        <TrendCard
          title="Payment Mix"
          description="Net revenue by payment method for the selected period."
          query={revenueQuery}
          isEmpty={!revenue || revenue.byMethod.length === 0}
        >
          <Chart
            option={mixOption}
            height={CHART_HEIGHT}
            ariaLabel="Bar chart of net revenue by payment method"
            summary={revenue?.byMethod
              .map((row) => `${PAYMENT_METHOD_LABELS[row.method]}: ${formatMoney(row.revenuePaise)}`)
              .join('. ')}
          />
        </TrendCard>

        <TrendCard
          title="Emergency Volume"
          description="Emergency arrivals per day."
          query={emergencyQuery}
          isEmpty={!emergency || emergency.volumeTrend.length === 0}
        >
          <Chart
            option={emergencyVolumeOption}
            height={CHART_HEIGHT}
            ariaLabel={`Line chart of emergency case volume over the last ${days} days`}
          />
          {emergency && <StatStrip items={[{ label: 'Avg arrival â†’ doctor', value: avgToDoctor }]} />}
        </TrendCard>

        <TrendCard
          title="Emergency Priorities"
          description="Case mix by triage priority for the selected period."
          query={emergencyQuery}
          isEmpty={!emergency || emergency.priorityDistribution.length === 0}
        >
          <Chart
            option={priorityOption}
            height={CHART_HEIGHT}
            ariaLabel="Bar chart of emergency cases by triage priority"
            summary={emergency?.priorityDistribution
              .map((row) => `${titleCase(row.priority)}: ${row.count}`)
              .join('. ')}
          />
        </TrendCard>
      </div>
    </section>
  );
}
