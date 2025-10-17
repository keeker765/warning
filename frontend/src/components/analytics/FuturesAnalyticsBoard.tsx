import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFuturesAnalytics } from '../../hooks/useFuturesAnalytics';
import type { FuturesAnalytics } from '../../hooks/useFuturesAnalytics';

interface FuturesAnalyticsBoardProps {
  symbol: string;
  period: string;
  apiKey?: string;
}

function formatTime(time: number) {
  return new Date(time).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(value: number, fraction = 2) {
  if (!Number.isFinite(value)) return '--';
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(fraction)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(fraction)}K`;
  }
  return value.toFixed(fraction);
}

const GRID_COLOR = 'rgba(255, 255, 255, 0.08)';
const AXIS_COLOR = 'rgba(255, 255, 255, 0.55)';
const TOOLTIP_BACKGROUND = '#1e2329';

function tooltipStyle(borderColor: string) {
  return {
    background: TOOLTIP_BACKGROUND,
    borderRadius: 10,
    border: `1px solid ${borderColor}`,
    color: '#f5f7fa',
  };
}

function renderOpenInterestChart(data: FuturesAnalytics) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data.openInterest}>
        <defs>
          <linearGradient id="openInterestGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0b90b" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#0b0e11" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} stroke={AXIS_COLOR} />
        <YAxis
          stroke={AXIS_COLOR}
          tickFormatter={(value) => formatNumber(value, 0)}
          width={70}
        />
        <Tooltip
          contentStyle={tooltipStyle('rgba(240, 185, 11, 0.35)')}
          formatter={(value: number) => [`${formatNumber(value, 0)} 张`, '持仓量']}
          labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
        />
        <Area type="monotone" dataKey="openInterest" stroke="#f0b90b" strokeWidth={2} fill="url(#openInterestGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function periodToMs(value: string): number | null {
  const match = value.match(/^(\d+)([mhd])$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = match[2];
  switch (unit) {
    case 'm':
      return amount * 60_000;
    case 'h':
      return amount * 60 * 60_000;
    case 'd':
      return amount * 24 * 60 * 60_000;
    default:
      return null;
  }
}

export default function FuturesAnalyticsBoard({ symbol, period, apiKey }: FuturesAnalyticsBoardProps) {
  const refreshMs = useMemo(() => {
    const parsed = periodToMs(period);
    if (!parsed) {
      return 5 * 60_000;
    }
    return Math.max(parsed, 60_000);
  }, [period]);
  const { data, loading, error, usingSample } = useFuturesAnalytics(symbol, {
    period,
    apiKey,
    refreshMs,
  });

  return (
    <section className="analytics-board">
      <header className="analytics-header">
        <div>
          <h2>合约智能监控</h2>
          <p>
            追踪持仓、账户多空比与基差变化，当前周期 {period}，辅助判断市场趋势。
          </p>
        </div>
        {loading && <span className="analytics-status">加载中...</span>}
        {error && <span className="analytics-status warning">{error}</span>}
        {usingSample && !error && <span className="analytics-status muted">示例数据</span>}
      </header>
      <div className="analytics-grid">
        <article className="analytics-card">
          <div className="analytics-card-header">
            <h3>合约持仓量</h3>
            <span className="analytics-subtitle">总持仓</span>
          </div>
          {renderOpenInterestChart(data)}
        </article>
        <article className="analytics-card">
          <div className="analytics-card-header">
            <h3>大户持仓多空比</h3>
            <span className="analytics-subtitle">账户</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.topAccountsRatio}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke={AXIS_COLOR} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                stroke={AXIS_COLOR}
                width={60}
              />
              <Tooltip
                contentStyle={tooltipStyle('rgba(240, 185, 11, 0.35)')}
                formatter={(value: number, name) => [`${value.toFixed(2)}%`, name === 'long' ? '多头占比' : '空头占比']}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Line type="monotone" dataKey="long" stroke="#0ecb81" strokeWidth={2} name="多头" dot={false} />
              <Line type="monotone" dataKey="short" stroke="#f6465d" strokeWidth={2} name="空头" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>
        <article className="analytics-card">
          <div className="analytics-card-header">
            <h3>大户持仓多空比</h3>
            <span className="analytics-subtitle">仓位</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.topPositionsRatio}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke={AXIS_COLOR} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                stroke={AXIS_COLOR}
                width={60}
              />
              <Tooltip
                contentStyle={tooltipStyle('rgba(240, 185, 11, 0.35)')}
                formatter={(value: number, name) => [`${value.toFixed(2)}%`, name === 'long' ? '多头仓位' : '空头仓位']}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Line type="monotone" dataKey="long" stroke="#f0b90b" strokeWidth={2} name="多头" dot={false} />
              <Line type="monotone" dataKey="short" stroke="#f6465d" strokeWidth={2} name="空头" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>
        <article className="analytics-card">
          <div className="analytics-card-header">
            <h3>全市场多空账户比</h3>
            <span className="analytics-subtitle">全部账户</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.globalAccountsRatio}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke={AXIS_COLOR} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                stroke={AXIS_COLOR}
                width={60}
              />
              <Tooltip
                contentStyle={tooltipStyle('rgba(240, 185, 11, 0.35)')}
                formatter={(value: number, name) => [`${value.toFixed(2)}%`, name === 'long' ? '多头账户' : '空头账户']}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Line type="monotone" dataKey="long" stroke="#0ecb81" strokeWidth={2} name="多头" dot={false} />
              <Line type="monotone" dataKey="short" stroke="#f6465d" strokeWidth={2} name="空头" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>
        <article className="analytics-card">
          <div className="analytics-card-header">
            <h3>合约持仓变动</h3>
            <span className="analytics-subtitle">增减趋势</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={data.openInterestDelta}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke={AXIS_COLOR} />
              <YAxis
                tickFormatter={(value) => formatNumber(value, 0)}
                stroke={AXIS_COLOR}
                width={70}
              />
              <Tooltip
                contentStyle={tooltipStyle('rgba(240, 185, 11, 0.35)')}
                formatter={(value: number, name) => [
                  `${formatNumber(Math.abs(value), 0)} 张`,
                  name === 'increase' ? '增持' : '减持',
                ]}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Bar dataKey="increase" name="增持" fill="#0ecb81" stackId="delta" radius={[6, 6, 0, 0]} />
              <Bar dataKey="decrease" name="减持" fill="#f6465d" stackId="delta" radius={[6, 6, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </article>
        <article className="analytics-card">
          <div className="analytics-card-header">
            <h3>基差</h3>
            <span className="analytics-subtitle">永续 vs 现货</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={data.basis}>
              <defs>
                <linearGradient id="basisGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f0b90b" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#0b0e11" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke={AXIS_COLOR} />
              <YAxis
                tickFormatter={(value) => formatNumber(value, 2)}
                stroke={AXIS_COLOR}
                width={70}
              />
              <Tooltip
                contentStyle={tooltipStyle('rgba(240, 185, 11, 0.35)')}
                formatter={(value: number, name) => {
                  if (name === 'basis') {
                    return [`${formatNumber(value, 2)}`, '基差'];
                  }
                  return [`${formatNumber(value, 2)}`, name === 'markPrice' ? '永续合约' : '现货指数'];
                }}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Area type="monotone" dataKey="basis" name="基差" fill="url(#basisGradient)" stroke="#f0b90b" strokeWidth={2} />
              <Line type="monotone" dataKey="markPrice" name="永续合约" stroke="#f0b90b" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="indexPrice" name="指数价格" stroke="#8d939e" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </article>
        <article className="analytics-card">
          <div className="analytics-card-header">
            <h3>主动买卖量</h3>
            <span className="analytics-subtitle">Taker 数据</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={data.takerVolume}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke={AXIS_COLOR} />
              <YAxis
                tickFormatter={(value) => formatNumber(value, 0)}
                stroke={AXIS_COLOR}
                width={70}
              />
              <Tooltip
                contentStyle={tooltipStyle('rgba(240, 185, 11, 0.35)')}
                formatter={(value: number, name) => {
                  if (name === 'ratio') {
                    return [`${value.toFixed(3)}`, '买卖比'];
                  }
                  return [`${formatNumber(value, 0)}`, name === 'buyVolume' ? '主动买入' : '主动卖出'];
                }}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Bar dataKey="buyVolume" name="主动买入" fill="#0ecb81" radius={[6, 6, 0, 0]} />
              <Bar dataKey="sellVolume" name="主动卖出" fill="#f6465d" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="ratio" name="买卖比" stroke="#f0b90b" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  );
}
