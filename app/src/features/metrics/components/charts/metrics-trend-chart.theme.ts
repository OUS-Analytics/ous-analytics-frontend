const tooltipTextColor = 'var(--popover-foreground)';

export const trendTooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: tooltipTextColor,
};

export const trendTooltipLabelStyle = { color: tooltipTextColor };
export const trendTooltipItemStyle = { color: tooltipTextColor };

export const trendGradientStops = [
  { offset: '5%', stopColor: 'var(--chart-1)', stopOpacity: 0.3 },
  { offset: '95%', stopColor: 'var(--chart-1)', stopOpacity: 0 },
];
