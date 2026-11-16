import { useQuery } from '@tanstack/react-query';
import type { ApiSuccess, EmergencyPriority, PaymentMethod, QueueStatus } from '@/types';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';

/**
 * Inclusive date-only range, transmitted as ISO `yyyy-MM-dd` strings.
 * The backend (apps/api/src/modules/analytics) requires `from`/`to` query
 * params, `from <= to`, and a span of at most 366 days.
 */
export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

// ---------------------------------------------------------------------------
// Response DTOs â€” mirror apps/api/src/modules/analytics/analytics.service.ts
// (the authoritative contract, exercised by analytics.test.ts).
// ---------------------------------------------------------------------------

export interface PatientAnalyticsPoint {
  date: string;
  newCount: number;
  returningCount: number;
  totalCount: number;
}

export interface PatientAnalyticsDto {
  daily: PatientAnalyticsPoint[];
  totals: { newCount: number; returningCount: number; totalCount: number };
}

export interface QueueWaitPoint {
  date: string;
  avgWaitMinutes: number | null;
  sampleSize: number;
}

export interface QueueStatusCount {
  status: QueueStatus;
  count: number;
}

export interface QueueNoShowStats {
  noShowCount: number;
  eligibleCount: number;
  /** null when there were no eligible appointments in the range. */
  rate: number | null;
}

export interface QueueAnalyticsDto {
  waitTrend: QueueWaitPoint[];
  statusDistribution: QueueStatusCount[];
  noShow: QueueNoShowStats;
}

export interface RevenuePoint {
  date: string;
  grossPaise: number;
  refundedPaise: number;
  revenuePaise: number;
}

export interface RevenueByMethod {
  method: PaymentMethod;
  grossPaise: number;
  refundedPaise: number;
  revenuePaise: number;
}

export interface RevenueTotals {
  grossPaise: number;
  refundedPaise: number;
  revenuePaise: number;
}

export interface RevenueAnalyticsDto {
  daily: RevenuePoint[];
  byMethod: RevenueByMethod[];
  totals: RevenueTotals;
}

export interface EmergencyVolumePoint {
  date: string;
  count: number;
}

export interface EmergencyPriorityCount {
  priority: EmergencyPriority;
  count: number;
}

export interface EmergencyAnalyticsDto {
  volumeTrend: EmergencyVolumePoint[];
  priorityDistribution: EmergencyPriorityCount[];
  /** Arrival -> first doctor response; null when uncomputable for the range. */
  avgTimeToDoctorMinutes: number | null;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

/** Defensive array read â€” a malformed payload renders as an empty chart, not a crash. */
function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function fetchAnalytics(path: string, range: AnalyticsDateRange): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<ApiSuccess<Record<string, unknown>>>(path, {
    params: { from: range.startDate, to: range.endDate },
  });
  return (data.data ?? {}) as Record<string, unknown>;
}

const ANALYTICS_QUERY_OPTS = {
  retry: 1,
  retryDelay: 1000,
  refetchOnWindowFocus: false,
  staleTime: 60_000,
} as const;

export function useAnalyticsQueryKey(scope: string, range: AnalyticsDateRange) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return ['reports', scope, activeBranchId ?? 'all', range.startDate, range.endDate] as const;
}

export function usePatientAnalyticsQuery(range: AnalyticsDateRange, enabled = true) {
  const queryKey = useAnalyticsQueryKey('patients', range);
  return useQuery({
    queryKey,
    enabled,
    queryFn: async (): Promise<PatientAnalyticsDto> => {
      const raw = await fetchAnalytics('/analytics/patients', range);
      const totals = (raw.totals ?? {}) as Partial<PatientAnalyticsDto['totals']>;
      return {
        daily: toArray<PatientAnalyticsPoint>(raw.daily),
        totals: {
          newCount: totals.newCount ?? 0,
          returningCount: totals.returningCount ?? 0,
          totalCount: totals.totalCount ?? 0,
        },
      };
    },
    ...ANALYTICS_QUERY_OPTS,
  });
}

export function useQueueAnalyticsQuery(range: AnalyticsDateRange, enabled = true) {
  const queryKey = useAnalyticsQueryKey('queue', range);
  return useQuery({
    queryKey,
    enabled,
    queryFn: async (): Promise<QueueAnalyticsDto> => {
      const raw = await fetchAnalytics('/analytics/queue', range);
      const noShow = (raw.noShow ?? {}) as Partial<QueueNoShowStats>;
      return {
        waitTrend: toArray<QueueWaitPoint>(raw.waitTrend),
        statusDistribution: toArray<QueueStatusCount>(raw.statusDistribution),
        noShow: {
          noShowCount: noShow.noShowCount ?? 0,
          eligibleCount: noShow.eligibleCount ?? 0,
          rate: noShow.rate ?? null,
        },
      };
    },
    ...ANALYTICS_QUERY_OPTS,
  });
}

export function useRevenueAnalyticsQuery(range: AnalyticsDateRange, enabled = true) {
  const queryKey = useAnalyticsQueryKey('revenue', range);
  return useQuery({
    queryKey,
    enabled,
    queryFn: async (): Promise<RevenueAnalyticsDto> => {
      const raw = await fetchAnalytics('/analytics/revenue', range);
      const totals = (raw.totals ?? {}) as Partial<RevenueTotals>;
      return {
        daily: toArray<RevenuePoint>(raw.daily),
        byMethod: toArray<RevenueByMethod>(raw.byMethod),
        totals: {
          grossPaise: totals.grossPaise ?? 0,
          refundedPaise: totals.refundedPaise ?? 0,
          revenuePaise: totals.revenuePaise ?? 0,
        },
      };
    },
    ...ANALYTICS_QUERY_OPTS,
  });
}

export function useEmergencyAnalyticsQuery(range: AnalyticsDateRange, enabled = true) {
  const queryKey = useAnalyticsQueryKey('emergency', range);
  return useQuery({
    queryKey,
    enabled,
    queryFn: async (): Promise<EmergencyAnalyticsDto> => {
      const raw = await fetchAnalytics('/analytics/emergency', range);
      return {
        volumeTrend: toArray<EmergencyVolumePoint>(raw.volumeTrend),
        priorityDistribution: toArray<EmergencyPriorityCount>(raw.priorityDistribution),
        avgTimeToDoctorMinutes:
          typeof raw.avgTimeToDoctorMinutes === 'number' ? raw.avgTimeToDoctorMinutes : null,
      };
    },
    ...ANALYTICS_QUERY_OPTS,
  });
}
