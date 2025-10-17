import { useMemo, useState } from 'react';
import { useSymbolScreener } from '../../hooks/useSymbolScreener';
import type { SymbolInsight } from '../../types/market';

interface SymbolScreenerProps {
  symbols: string[];
}

type FilterKey = 'all' | 'priceUpVolumeFlat';

const FILTERS: Record<FilterKey, {
  label: string;
  description: string;
  predicate: (insight: SymbolInsight) => boolean;
}> = {
  all: {
    label: '全部',
    description: '显示所有监控的交易对。',
    predicate: () => true,
  },
  priceUpVolumeFlat: {
    label: '价涨量平',
    description: '过去 1 小时价格上涨但成交量未同步放大的交易对。',
    predicate: (insight) => insight.hourPriceChangePercent > 0 && insight.hourVolumeChangePercent <= 0,
  },
};

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '--';
  }
  const rounded = value.toFixed(2);
  return `${rounded}%`;
}

function formatVolume(value: number) {
  if (!Number.isFinite(value)) {
    return '--';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

export default function SymbolScreener({ symbols }: SymbolScreenerProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('priceUpVolumeFlat');
  const { insights, loading, error, filtered } = useSymbolScreener(symbols);

  const filterConfig = FILTERS[activeFilter];
  const rows = useMemo(() => filtered(filterConfig.predicate), [filtered, filterConfig]);

  return (
    <div className="screener-panel">
      <header className="screener-header">
        <div>
          <h2>智能筛选</h2>
          <p>{filterConfig.description}</p>
        </div>
        <div className="screener-filters">
          {Object.entries(FILTERS).map(([key, config]) => (
            <button
              key={key}
              type="button"
              className={activeFilter === key ? 'active' : ''}
              onClick={() => setActiveFilter(key as FilterKey)}
            >
              {config.label}
            </button>
          ))}
        </div>
      </header>

      {loading && <div className="screener-status">更新中...</div>}
      {error && <div className="screener-status error">数据获取异常：{error}</div>}

      <div className="screener-table" role="table">
        <div className="screener-row screener-header-row" role="row">
          <span role="columnheader">交易对</span>
          <span role="columnheader">最新价</span>
          <span role="columnheader">24h 涨跌</span>
          <span role="columnheader">1h 涨跌</span>
          <span role="columnheader">1h 成交量变化</span>
        </div>
        <div className="screener-body" role="rowgroup">
          {rows.length === 0 && !loading ? (
            <div className="screener-row empty" role="row">
              <span role="cell">暂无满足条件的交易对</span>
            </div>
          ) : (
            rows.map((insight) => (
              <div className="screener-row" role="row" key={insight.symbol}>
                <span role="cell">{insight.symbol}</span>
                <span role="cell">{insight.lastPrice.toLocaleString()}</span>
                <span role="cell" className={insight.dayPriceChangePercent >= 0 ? 'up' : 'down'}>
                  {formatPercent(insight.dayPriceChangePercent)}
                </span>
                <span role="cell" className={insight.hourPriceChangePercent >= 0 ? 'up' : 'down'}>
                  {formatPercent(insight.hourPriceChangePercent)}
                </span>
                <span role="cell" className={insight.hourVolumeChangePercent >= 0 ? 'up' : 'down'}>
                  {formatPercent(insight.hourVolumeChangePercent)} ({formatVolume(insight.lastVolume)})
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {insights.length > 0 && (
        <footer className="screener-footer">
          <span>
            共有 {insights.length} 个交易对在监控中，当前筛选命中 {rows.length} 个。
          </span>
        </footer>
      )}
    </div>
  );
}
