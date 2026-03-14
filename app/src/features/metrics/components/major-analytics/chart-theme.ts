export const majorChartColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.31 0.09 244)',
  'oklch(0.55 0.17 24)',
  'oklch(0.68 0.12 246)',
  'oklch(0.4 0.1 241)',
  'oklch(0.74 0.14 32)',
];

export const cohortColors: Record<string, string> = {
  'FTIC 2021': 'var(--chart-1)',
  'FTIC 2022': 'var(--chart-3)',
  'FTIC 2023': 'var(--chart-5)',
  'FTIC 2024': 'var(--chart-2)',
};

export function getCohortColor(cohort: string, index: number) {
  return (
    cohortColors[cohort] ?? majorChartColors[index % majorChartColors.length]
  );
}

const tooltipTextColor = 'var(--popover-foreground)';

export const chartTooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: tooltipTextColor,
};

export const chartTooltipLabelStyle = { color: tooltipTextColor };
export const chartTooltipItemStyle = { color: tooltipTextColor };
