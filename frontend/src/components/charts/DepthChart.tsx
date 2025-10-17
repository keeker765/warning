import { memo, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OrderBookEntry } from '../../types/market';

interface DepthChartProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

const tooltipFormatter = (value: number | string | Array<number | string>): string => {
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
            <stop offset="5%" stopColor="#0ecb81" stopOpacity={0.75} />
            <stop offset="95%" stopColor="#0ecb81" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f6465d" stopOpacity={0.75} />
            <stop offset="95%" stopColor="#f6465d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255, 255, 255, 0.08)" />
        <XAxis
          dataKey="price"
          type="number"
          tickFormatter={(value) => value.toLocaleString()}
          domain={['auto', 'auto']}
          stroke="rgba(255, 255, 255, 0.55)"
        />
        <YAxis tickFormatter={(value) => value.toLocaleString()} stroke="rgba(255, 255, 255, 0.55)" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e2329', border: '1px solid #2b3139', borderRadius: 8, color: '#f5f7fa' }}
          labelFormatter={(label) => `价格 ${Number(label).toLocaleString()}`}
          formatter={tooltipFormatter}
        />
        <Area
          type="monotone"
          dataKey="bidTotal"
          stroke="#0ecb81"
          fill="url(#bidGradient)"
          isAnimationActive={false}
          connectNulls
        />
        <Area
          type="monotone"
          dataKey="askTotal"
          stroke="#f6465d"
          fill="url(#askGradient)"
          isAnimationActive={false}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default memo(DepthChart);
