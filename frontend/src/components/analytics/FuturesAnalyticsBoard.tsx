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

function renderOpenInterestChart(data: FuturesAnalytics) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data.openInterest}>
        <defs>
          <linearGradient id="openInterestGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} stroke="rgba(148, 163, 184, 0.6)" />
        <YAxis
          stroke="rgba(148, 163, 184, 0.6)"
          tickFormatter={(value) => formatNumber(value, 0)}
          width={70}
        />
        <Tooltip
          contentStyle={{ background: 'rgba(15,23,42,0.9)', borderRadius: 12, border: '1px solid rgba(56,189,248,0.4)' }}
          formatter={(value: number) => [`${formatNumber(value, 0)} 张`, '持仓量']}
          labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
        />
        <Area type="monotone" dataKey="openInterest" stroke="#38bdf8" strokeWidth={2} fill="url(#openInterestGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function FuturesAnalyticsBoard({ symbol }: FuturesAnalyticsBoardProps) {
  const { data, loading, error, usingSample } = useFuturesAnalytics(symbol);

  return (
    <section className="analytics-board">
      <header className="analytics-header">
        <div>
          <h2>合约智能监控</h2>
          <p>追踪持仓、账户多空比与基差变化，辅助判断市场趋势。</p>
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
              <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke="rgba(148, 163, 184, 0.6)" />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                stroke="rgba(148, 163, 184, 0.6)"
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  borderRadius: 12,
                  border: '1px solid rgba(129,140,248,0.35)',
                }}
                formatter={(value: number, name) => [`${value.toFixed(2)}%`, name === 'long' ? '多头占比' : '空头占比']}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Line type="monotone" dataKey="long" stroke="#4ade80" strokeWidth={2} name="多头" dot={false} />
              <Line type="monotone" dataKey="short" stroke="#f87171" strokeWidth={2} name="空头" dot={false} />
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
              <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke="rgba(148, 163, 184, 0.6)" />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                stroke="rgba(148, 163, 184, 0.6)"
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  borderRadius: 12,
                  border: '1px solid rgba(96,165,250,0.35)',
                }}
                formatter={(value: number, name) => [`${value.toFixed(2)}%`, name === 'long' ? '多头仓位' : '空头仓位']}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Line type="monotone" dataKey="long" stroke="#38bdf8" strokeWidth={2} name="多头" dot={false} />
              <Line type="monotone" dataKey="short" stroke="#facc15" strokeWidth={2} name="空头" dot={false} />
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
              <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke="rgba(148, 163, 184, 0.6)" />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                stroke="rgba(148, 163, 184, 0.6)"
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  borderRadius: 12,
                  border: '1px solid rgba(45,212,191,0.35)',
                }}
                formatter={(value: number, name) => [`${value.toFixed(2)}%`, name === 'long' ? '多头账户' : '空头账户']}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Line type="monotone" dataKey="long" stroke="#2dd4bf" strokeWidth={2} name="多头" dot={false} />
              <Line type="monotone" dataKey="short" stroke="#f97316" strokeWidth={2} name="空头" dot={false} />
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
              <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke="rgba(148, 163, 184, 0.6)" />
              <YAxis
                tickFormatter={(value) => formatNumber(value, 0)}
                stroke="rgba(148, 163, 184, 0.6)"
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  borderRadius: 12,
                  border: '1px solid rgba(249,115,22,0.35)',
                }}
                formatter={(value: number, name) => [
                  `${formatNumber(Math.abs(value), 0)} 张`,
                  name === 'increase' ? '增持' : '减持',
                ]}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Bar dataKey="increase" name="增持" fill="#4ade80" stackId="delta" radius={[6, 6, 0, 0]} />
              <Bar dataKey="decrease" name="减持" fill="#f97316" stackId="delta" radius={[6, 6, 0, 0]} />
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
                  <stop offset="0%" stopColor="#facc15" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke="rgba(148, 163, 184, 0.6)" />
              <YAxis
                tickFormatter={(value) => formatNumber(value, 2)}
                stroke="rgba(148, 163, 184, 0.6)"
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  borderRadius: 12,
                  border: '1px solid rgba(250,204,21,0.35)',
                }}
                formatter={(value: number, name) => {
                  if (name === 'basis') {
                    return [`${formatNumber(value, 2)}`, '基差'];
                  }
                  return [`${formatNumber(value, 2)}`, name === 'markPrice' ? '永续合约' : '现货指数'];
                }}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Area type="monotone" dataKey="basis" name="基差" fill="url(#basisGradient)" stroke="#facc15" strokeWidth={2} />
              <Line type="monotone" dataKey="markPrice" name="永续合约" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="indexPrice" name="指数价格" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
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
              <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke="rgba(148, 163, 184, 0.6)" />
              <YAxis
                tickFormatter={(value) => formatNumber(value, 0)}
                stroke="rgba(148, 163, 184, 0.6)"
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.9)',
                  borderRadius: 12,
                  border: '1px solid rgba(56,189,248,0.35)',
                }}
                formatter={(value: number, name) => {
                  if (name === 'ratio') {
                    return [`${value.toFixed(3)}`, '买卖比'];
                  }
                  return [`${formatNumber(value, 0)}`, name === 'buyVolume' ? '主动买入' : '主动卖出'];
                }}
                labelFormatter={(label) => `时间：${formatTime(Number(label))}`}
              />
              <Legend />
              <Bar dataKey="buyVolume" name="主动买入" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="sellVolume" name="主动卖出" fill="#f87171" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="ratio" name="买卖比" stroke="#c084fc" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  );
}
