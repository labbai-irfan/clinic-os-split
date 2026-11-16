import { useMemo } from 'react';
import { format } from 'date-fns';
import type { EChartsOption } from 'echarts';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Receipt,
  Stethoscope,
  Timer,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { PAYMENT_METHODS, PERMISSIONS } from '@/types';
import type { DashboardSummaryDto } from '@/types';
import { formatMoney } from '@/config';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Card } from '../../../components/ui/Card';
import { QueryBoundary } from '../../../components/QueryBoundary';
import { Chart, useChartPalette } from '../../../components/charts/Chart';
import { useAuthStore } from '../../../stores/auth-store';
import { usePermission } from '../../../hooks/use-permission';
import { useClinicNameQuery, useDashboardSummaryQuery } from '../api';
import { QuickActions } from '../components/QuickActions';
import { KpiCard } from '../components/KpiCard';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { TrendsSection } from '../components/TrendsSection';
import { formatWaitRange, PAYMENT_METHOD_LABELS, timeOfDayGreeting } from '../utils';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: clinic } = useClinicNameQuery();
  const summaryQuery = useDashboardSummaryQuery();
  const { has } = usePermission();

  const greeting = timeOfDayGreeting();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const title = firstName ? `${greeting}, ${firstName}` : greeting;

  const descriptionParts = [format(new Date(), 'EEEE, d MMMM yyyy')];
  if (clinic?.name) descriptionParts.push(clinic.name);

  return (
    <div className="min-w-0">
      <PageHeader title={title} description={descriptionParts.join(' Â· ')} actions={<QuickActions />} />

      <QueryBoundary
        isLoading={summaryQuery.isLoading}
        isError={summaryQuery.isError}
        data={summaryQuery.data}
        onRetry={() => summaryQuery.refetch()}
        loadingFallback={<DashboardSkeleton />}
      >
        {(summary) => (
          <div className="space-y-8">
            <DashboardContent summary={summary} />
            {/* Clinic-wide analytics â€” only for roles that can open Reports. */}
            {has(PERMISSIONS.REPORTS_VIEW) && <TrendsSection />}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}

function DashboardContent({ summary }: { summary: DashboardSummaryDto }) {
  const palette = useChartPalette();

  const hasCollectedPayments = PAYMENT_METHODS.some(
    (method) => (summary.collectedByMethodPaise[method] ?? 0) > 0,
  );

  const flowOption: EChartsOption = useMemo(() => {
    const categories = ['Waiting', 'Waiting for Nurse', 'Ready for Doctor', 'In Consultation', 'Completed Today'];
    const values = [
      summary.currentlyWaiting,
      summary.waitingForNurse,
      summary.readyForDoctor,
      summary.inConsultation,
      summary.completedToday,
    ];
    return {
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
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
        data: categories,
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
      },
      series: [
        {
          type: 'bar',
          name: 'Patients',
          data: values,
          barMaxWidth: 24,
          itemStyle: { color: palette.primary, borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', color: palette.axisLabel },
        },
      ],
    };
  }, [summary, palette]);

  const flowSummary =
    `Waiting: ${summary.currentlyWaiting}. Waiting for nurse: ${summary.waitingForNurse}. ` +
    `Ready for doctor: ${summary.readyForDoctor}. In consultation: ${summary.inConsultation}. ` +
    `Completed today: ${summary.completedToday}.`;

  const paymentOption: EChartsOption = useMemo(() => {
    const rows = PAYMENT_METHODS.map((method) => ({
      method,
      paise: summary.collectedByMethodPaise[method] ?? 0,
    }));
    return {
      grid: { left: 8, right: 80, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const [point] = params as { dataIndex: number }[];
          const row = point ? rows[point.dataIndex] : undefined;
          if (!row) return '';
          return `${PAYMENT_METHOD_LABELS[row.method]}: ${formatMoney(row.paise)}`;
        },
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
        splitLine: { lineStyle: { color: palette.axisLine } },
      },
      yAxis: {
        type: 'category',
        data: rows.map((row) => PAYMENT_METHOD_LABELS[row.method]),
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel },
      },
      series: [
        {
          type: 'bar',
          name: 'Collected',
          data: rows.map((row) => Math.round(row.paise / 100)),
          barMaxWidth: 24,
          itemStyle: { color: palette.teal, borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            color: palette.axisLabel,
            formatter: (params: { dataIndex: number }) => {
              const row = rows[params.dataIndex];
              return row ? formatMoney(row.paise) : '';
            },
          },
        },
      ],
    };
  }, [summary, palette]);

  const paymentSummary = PAYMENT_METHODS.map(
    (method) => `${PAYMENT_METHOD_LABELS[method]}: ${formatMoney(summary.collectedByMethodPaise[method] ?? 0)}`,
  ).join('. ');

  return (
    <div className="space-y-6">
      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={Users} label="Patients Today" value={summary.patientsToday} />
        <KpiCard icon={Clock} label="Currently Waiting" value={summary.currentlyWaiting} />
        <KpiCard
          icon={Timer}
          label="Average Wait"
          value={formatWaitRange(summary.avgWaitMinutes)}
          caption="Estimated from today's completed waits"
        />
        <KpiCard icon={Wallet} label="Revenue Today" value={formatMoney(summary.revenueTodayPaise)} />
      </div>

      {/* Pipeline KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard icon={Stethoscope} label="Waiting for Nurse" value={summary.waitingForNurse} />
        <KpiCard icon={UserCheck} label="Ready for Doctor" value={summary.readyForDoctor} />
        <KpiCard icon={Activity} label="Currently Consulting" value={summary.inConsultation} />
        <KpiCard icon={CheckCircle2} label="Completed Today" value={summary.completedToday} />
      </div>

      {/* Attention KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiCard
          icon={AlertTriangle}
          label="Active Emergencies"
          value={summary.activeEmergencies}
          tone={summary.activeEmergencies > 0 ? 'danger' : 'success'}
          toneLabel={summary.activeEmergencies > 0 ? 'Needs attention' : 'All clear'}
        />
        <KpiCard icon={Receipt} label="Pending Payments" value={formatMoney(summary.pendingPaymentsPaise)} />
        <KpiCard
          icon={CalendarClock}
          label="Follow-ups Due"
          value={summary.followUpsDue}
          caption="Patients due for a follow-up today"
        />
      </div>

      {/* Today's operations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-text-primary">Today's Patient Flow</h3>
          <div className="mt-3">
            <Chart
              option={flowOption}
              height={260}
              ariaLabel="Bar chart of today's patients by queue stage"
              summary={flowSummary}
            />
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            Where today's patients are right now, from the waiting room through to completed visits.
          </p>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-text-primary">Collected by Payment Method</h3>
          {hasCollectedPayments ? (
            <div className="mt-3">
              <Chart
                option={paymentOption}
                height={260}
                ariaLabel="Bar chart of today's collected revenue by payment method"
                summary={paymentSummary}
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-text-secondary">No payments collected yet today.</p>
          )}
          <p className="mt-2 text-xs text-text-secondary">
            How today's collected revenue splits across cash, UPI, card and bank transfer.
          </p>
        </Card>
      </div>
    </div>
  );
}
