import { useEffect, useMemo, useState, type FormEvent } from 'react';
import CandleChart from './components/charts/CandleChart';
import DepthChart from './components/charts/DepthChart';
import MetricCards from './components/charts/MetricCards';
import TradeList from './components/trade/TradeList';
import AlertPanel from './components/alerts/AlertPanel';
import SymbolScreener from './components/analytics/SymbolScreener';
import FuturesAnalyticsBoard from './components/analytics/FuturesAnalyticsBoard';
import { useCandles } from './hooks/useCandles';
import { useDepth } from './hooks/useDepth';
import { useMiniTicker } from './hooks/useMiniTicker';
import { useTrades } from './hooks/useTrades';
import './styles/app.css';

const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT'];
const AVAILABLE_INTERVALS = ['15s', '30s', '1m', '3m', '5m', '15m', '1h'];
const ANALYTICS_PERIODS = ['1m', '2m', '5m', '15m', '1h'];
const SYMBOL_STORAGE_KEY = 'guardian-futures-symbols';
const API_KEY_STORAGE_KEY = 'guardian-futures-api-key';

function loadStoredSymbols(): string[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_SYMBOLS];
  }
  try {
    const stored = window.localStorage.getItem(SYMBOL_STORAGE_KEY);
    if (!stored) {
      return [...DEFAULT_SYMBOLS];
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      const unique = Array.from(new Set(parsed.map((item) => item.toUpperCase())));
      return unique.length ? unique : [...DEFAULT_SYMBOLS];
    }
    return [...DEFAULT_SYMBOLS];
  } catch (error) {
    console.error('Failed to load stored symbols', error);
    return [...DEFAULT_SYMBOLS];
  }
}

function loadStoredApiKey(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return window.localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
  } catch (error) {
    console.error('Failed to load API key', error);
    return '';
  }
}

function formatSymbol(symbol: string) {
  if (symbol.endsWith('USDT')) {
    return `${symbol.slice(0, -4)} / USDT`;
  }
  return symbol;
}

function App() {
  const [trackedSymbols, setTrackedSymbols] = useState<string[]>(loadStoredSymbols);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    const initial = loadStoredSymbols();
    return initial[0] ?? DEFAULT_SYMBOLS[0];
  });
  const [interval, setInterval] = useState<string>('1m');
  const [symbolInput, setSymbolInput] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<string>(ANALYTICS_PERIODS[0]);
  const [apiKey, setApiKey] = useState<string>(loadStoredApiKey);
  const candles = useCandles(selectedSymbol, interval);
  const { bids, asks } = useDepth(selectedSymbol);
  const trades = useTrades(selectedSymbol);
  const ticker = useMiniTicker(selectedSymbol);

  useEffect(() => {
    if (!trackedSymbols.includes(selectedSymbol) && trackedSymbols.length) {
      setSelectedSymbol(trackedSymbols[0]);
    }
  }, [selectedSymbol, trackedSymbols]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SYMBOL_STORAGE_KEY, JSON.stringify(trackedSymbols));
  }, [trackedSymbols]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (apiKey) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [apiKey]);

  const handleAddSymbol = (event: FormEvent) => {
    event.preventDefault();
    const normalized = symbolInput.trim().toUpperCase();
    if (!normalized) return;
    setTrackedSymbols((prev) => {
      if (prev.includes(normalized)) {
        return prev;
      }
      return [...prev, normalized];
    });
    setSelectedSymbol(normalized);
    setSymbolInput('');
  };

  const currentPrice = ticker?.lastPrice ?? (candles.length ? candles[candles.length - 1].close : 0);

  const metrics = useMemo(() => {
    if (!ticker) {
      return [];
    }
    return [
      {
        label: '最新价',
        value: ticker.lastPrice.toLocaleString(),
        delta: ticker.priceChangePercent,
      },
      {
        label: '24h 最高',
        value: ticker.highPrice.toLocaleString(),
      },
      {
        label: '24h 最低',
        value: ticker.lowPrice.toLocaleString(),
      },
      {
        label: '24h 成交量',
        value: `${Number(ticker.volume).toLocaleString()} ${ticker.symbol.replace('USDT', '')}`,
      },
    ];
  }, [ticker]);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h1 className="logo">Binance Guardian</h1>
        <div className="selector-group">
          <span className="selector-label">合约交易对</span>
          <form className="symbol-form" onSubmit={handleAddSymbol}>
            <input
              value={symbolInput}
              onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
              placeholder="输入如 BTCUSDT"
              className="symbol-input"
              aria-label="添加合约交易对"
            />
            <button type="submit" className="add-button">
              添加
            </button>
          </form>
          <div className="selector-grid">
            {trackedSymbols.map((value) => (
              <button
                key={value}
                className={`selector-button ${selectedSymbol === value ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedSymbol(value)}
              >
                {formatSymbol(value)}
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group">
          <span className="selector-label">周期</span>
          <div className="selector-grid">
            {AVAILABLE_INTERVALS.map((item) => (
              <button
                key={item}
                className={`selector-button ${interval === item ? 'active' : ''}`}
                onClick={() => setInterval(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group compact">
          <span className="selector-label">合约监控周期</span>
          <div className="selector-grid small">
            {ANALYTICS_PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                className={`selector-button ${analyticsPeriod === period ? 'active' : ''}`}
                onClick={() => setAnalyticsPeriod(period)}
              >
                {period}
              </button>
            ))}
          </div>
          <label className="field compact">
            <span>API Key（可选，本地保存）</span>
            <input
              type="text"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value.trim())}
              placeholder="用于访问受限接口"
            />
          </label>
        </div>

        <AlertPanel symbol={selectedSymbol} currentPrice={currentPrice} ticker={ticker} />
      </aside>

      <main className="content">
        <div className="chart-card candle">
          <header className="card-header">
            <h2>{selectedSymbol} K线</h2>
            <span className="price">{currentPrice ? currentPrice.toLocaleString() : '--'}</span>
          </header>
          <CandleChart data={candles} theme="dark" />
        </div>

        <MetricCards metrics={metrics} />

        <div className="chart-card analytics">
          <FuturesAnalyticsBoard symbol={selectedSymbol} period={analyticsPeriod} apiKey={apiKey || undefined} />
        </div>

        <div className="chart-card screener">
          <SymbolScreener symbols={trackedSymbols} />
        </div>

        <div className="chart-grid">
          <div className="chart-card depth">
            <header className="card-header">
              <h2>深度图</h2>
            </header>
            <DepthChart bids={bids} asks={asks} />
          </div>

          <div className="chart-card trades">
            <header className="card-header">
              <h2>最新成交</h2>
            </header>
            <TradeList trades={trades} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
