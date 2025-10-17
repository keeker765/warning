import { memo, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OrderBookEntry } from '../../types/market';

interface DepthChartProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

const tooltipFormatter = (value: number | string | Array<number | string>) => {
  if (Array.isArray(value)) {
    return value.map((item) => tooltipFormatter(item) as string).join(' / ');
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value ?? '');
  }
  return numeric.toLocaleString();
};

interface DepthPoint {
  price: number;
  bidTotal: number | null;
  askTotal: number | null;
}

function DepthChart({ bids, asks }: DepthChartProps) {
  const depthData = useMemo(() => {
    const mapSeries = (entries: OrderBookEntry[], reverse: boolean) => {
      const sorted = [...entries].sort((a, b) => (reverse ? b.price - a.price : a.price - b.price));
      let total = 0;
      return sorted.map((entry) => {
        total += entry.quantity;
        return { price: entry.price, total };
      });
    };

    const bidSeries = mapSeries(bids, true)
      .map((entry) => ({ price: entry.price, bidTotal: entry.total, askTotal: null }))
      .sort((a, b) => a.price - b.price);
    const askSeries = mapSeries(asks, false).map((entry) => ({ price: entry.price, bidTotal: null, askTotal: entry.total }));

    return [...bidSeries, ...askSeries].sort((a, b) => a.price - b.price);
  }, [bids, asks]);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={depthData as DepthPoint[]} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0fba81" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#0fba81" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" />
        <XAxis
          dataKey="price"
          type="number"
          tickFormatter={(value) => value.toLocaleString()}
          domain={['auto', 'auto']}
          stroke="rgba(148, 163, 184, 0.8)"
        />
        <YAxis tickFormatter={(value) => value.toLocaleString()} stroke="rgba(148, 163, 184, 0.8)" />
        <Tooltip
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
          labelFormatter={(label) => `价格 ${Number(label).toLocaleString()}`}
          formatter={tooltipFormatter}
        />
        <Area
          type="monotone"
          dataKey="bidTotal"
          stroke="#0fba81"
          fill="url(#bidGradient)"
          isAnimationActive={false}
          connectNulls
        />
        <Area
          type="monotone"
          dataKey="askTotal"
          stroke="#ef4444"
          fill="url(#askGradient)"
          isAnimationActive={false}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default memo(DepthChart);
