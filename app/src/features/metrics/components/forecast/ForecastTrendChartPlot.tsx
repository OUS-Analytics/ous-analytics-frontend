import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ForecastData } from './types';

interface ForecastTrendChartPlotProps {
  combinedData: ForecastData[];
  historicalCount: number;
  lastHistoricalPeriod?: string;
}

interface TooltipFormatterContext {
  payload?: ForecastData;
}

interface ForecastChartPoint extends ForecastData {
  historicalTotal: number | null;
  forecastTotal: number | null;
}

const tooltipStyle = {
  backgroundColor: 'oklch(0.18 0.01 260)',
  border: '1px solid oklch(0.28 0.01 260)',
  borderRadius: '8px',
  color: 'oklch(0.95 0 0)',
};

export const formatForecastYAxisTick = (value: number) => {
  if (value >= 1_000_000) {
    const rounded = value / 1_000_000;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const rounded = value / 1_000;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}k`;
  }
  return value.toLocaleString();
};

export function ForecastTrendChartPlot({
  combinedData,
  historicalCount,
  lastHistoricalPeriod,
}: ForecastTrendChartPlotProps) {
  const chartData: ForecastChartPoint[] = combinedData.map((point, index) => ({
    ...point,
    historicalTotal: index < historicalCount ? point.total : null,
    forecastTotal:
      index >= Math.max(0, historicalCount - 1) ? point.total : null,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="oklch(0.70 0.18 170)"
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor="oklch(0.70 0.18 170)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(0.28 0.01 260)"
          vertical={false}
        />
        <XAxis
          dataKey="period"
          tick={{ fill: 'oklch(0.65 0 0)', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'oklch(0.28 0.01 260)' }}
        />
        <YAxis
          tick={{ fill: 'oklch(0.65 0 0)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatForecastYAxisTick}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(
            value: number,
            _name,
            context: TooltipFormatterContext
          ) => [
            `${value.toLocaleString()} ${context.payload?.isForecasted ? '(Projected)' : ''}`,
            'Students',
          ]}
        />
        <ReferenceLine
          x={lastHistoricalPeriod}
          stroke="oklch(0.65 0 0)"
          strokeDasharray="5 5"
        />
        <Area
          type="monotone"
          dataKey="forecastTotal"
          stroke="transparent"
          fill="url(#forecastGradient)"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="historicalTotal"
          stroke="oklch(0.70 0.18 170)"
          strokeWidth={2}
          dot={{ fill: 'oklch(0.70 0.18 170)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: 'oklch(0.70 0.18 170)' }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="forecastTotal"
          stroke="oklch(0.64 0.12 224)"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: 'oklch(0.64 0.12 224)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: 'oklch(0.64 0.12 224)' }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
