import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Card } from '../../../components/ui/Card';
import { Chart, useChartPalette } from '../../../components/charts/Chart';
import { AnalyticsSection } from './AnalyticsSection';
import { formatAxisDate } from '../utils';
import { usePatientAnalyticsQuery, type AnalyticsDateRange, type PatientAnalyticsDto } from '../api';

function PatientTrendChart({ data }: { data: PatientAnalyticsDto }) {
  const palette = useChartPalette();
  const points = data.daily;

  const option: EChartsOption = useMemo(
    () => ({
      grid: { left: 48, right: 16, top: 32, bottom: 32, containLabel: true },
      legend: { top: 0, textStyle: { color: palette.axisLabel } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: points.map((p) => formatAxisDate(p.date)),
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
        splitLine: { lineStyle: { color: palette.axisLine } },
      },
      series: [
        {
          type: 'bar',
          name: 'New patients',
          stack: 'patients',
          data: points.map((p) => p.newCount),
          itemStyle: { color: palette.primary },
        },
        {
          type: 'bar',
          name: 'Returning patients',
          stack: 'patients',
          data: points.map((p) => p.returningCount),
          itemStyle: { color: palette.teal },
        },
      ],
    }),
    [points, palette],
  );

  const { newCount, returningCount, totalCount } = data.totals;
  const summary = `New patients: ${newCount} total. Returning patients: ${returningCount} total. ${totalCount} patients across ${points.length} days.`;

  return (
    <>
      <p className="mb-2 text-sm text-text-secondary">
        New: <span className="font-medium text-text-primary">{newCount}</span>
        {' · '}Returning: <span className="font-medium text-text-primary">{returningCount}</span>
        {' · '}Total: <span className="font-medium text-text-primary">{totalCount}</span>
      </p>
      <Chart
        option={option}
        height={300}
        ariaLabel="Stacked bar chart of new versus returning patients over time"
        summary={summary}
      />
    </>
  );
}

export function PatientAnalyticsTab({ range }: { range: AnalyticsDateRange }) {
  const query = usePatientAnalyticsQuery(range);

  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-text-primary">New vs. Returning Patients</h3>
      <div className="mt-3">
        <AnalyticsSection
          isLoading={query.isLoading}
          isError={query.isError}
          data={query.data}
          isEmpty={(data) => data.daily.length === 0}
        >
          {(data) => <PatientTrendChart data={data} />}
        </AnalyticsSection>
      </div>
      <p className="mt-2 text-xs text-text-secondary">
        Daily count of new patients (first visit) versus returning patients (repeat visit) across the selected date
        range.
      </p>
    </Card>
  );
}
