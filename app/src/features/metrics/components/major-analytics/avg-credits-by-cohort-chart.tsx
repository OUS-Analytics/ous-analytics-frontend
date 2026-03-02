'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MajorCohortRecord } from '@/features/metrics/types';
import { MajorAnalyticsChartCard } from './chart-card';
import { chartTooltipStyle, getCohortColor } from './chart-theme';
import { selectCohortOptions, selectCohortRowsByMajor } from './selectors';

interface MajorAnalyticsChartsProps {
  data: MajorCohortRecord[];
}

export function AvgCreditsByCohortChart({ data }: MajorAnalyticsChartsProps) {
  const cohorts = useMemo(() => selectCohortOptions(data), [data]);
  const chartData = useMemo(
    () => selectCohortRowsByMajor(data, 'avgCredits'),
    [data]
  );
  const cohortLabelByKey = useMemo(
    () =>
      cohorts.reduce<Record<string, string>>((acc, cohort) => {
        acc[cohort.cohortKey] = cohort.cohortLabel;
        return acc;
      }, {}),
    [cohorts]
  );
  const chartHeight = Math.max(500, chartData.length * 52);

  return (
    <MajorAnalyticsChartCard
      title="Average Credits Earned by Major and FTIC Cohort"
      subtitle="Comparison across cohort years"
    >
      <div data-testid="cohort-legend" className="flex items-center gap-4 pb-3">
        {cohorts.map((cohort, index) => (
          <div key={cohort.cohortKey} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor: getCohortColor(cohort.cohortLabel, index),
              }}
            />
            <span
              data-testid="cohort-legend-label"
              className="text-xs text-muted-foreground"
            >
              {cohort.cohortLabel}
            </span>
          </div>
        ))}
      </div>
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            barCategoryGap="20%"
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.28 0.01 260)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: 'oklch(0.65 0 0)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'oklch(0.28 0.01 260)' }}
            />
            <YAxis
              dataKey="major"
              type="category"
              tick={{ fill: 'oklch(0.85 0 0)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={150}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value: number, name: string) => [
                value,
                cohortLabelByKey[name] ?? name,
              ]}
            />
            {cohorts.map((cohort, index) => (
              <Bar
                key={cohort.cohortKey}
                dataKey={cohort.cohortKey}
                fill={getCohortColor(cohort.cohortLabel, index)}
                radius={[0, 3, 3, 0]}
                barSize={10}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </MajorAnalyticsChartCard>
  );
}
