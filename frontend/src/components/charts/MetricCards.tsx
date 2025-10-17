import type { ReactNode } from 'react';

interface MetricItem {
  label: string;
  value: string;
  delta?: number;
  icon?: ReactNode;
}

interface MetricCardsProps {
  metrics: MetricItem[];
}

function renderDelta(delta?: number) {
  if (delta === undefined) return null;
  const positive = delta >= 0;
  return (
    <span className={`metric-delta ${positive ? 'up' : 'down'}`}>
      {positive ? '+' : ''}
      {delta.toFixed(2)}%
    </span>
  );
}

export default function MetricCards({ metrics }: MetricCardsProps) {
  if (!metrics.length) {
    return null;
  }

  return (
    <section className="metric-grid">
      {metrics.map((metric) => (
        <article key={metric.label} className="metric-card">
          <div className="metric-header">
            <span className="metric-label">{metric.label}</span>
            {metric.icon}
          </div>
          <div className="metric-value">{metric.value}</div>
          {renderDelta(metric.delta)}
        </article>
      ))}
    </section>
  );
}
