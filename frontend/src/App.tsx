import { useMemo, useState } from 'react';
import CandleChart from './components/charts/CandleChart';
import DepthChart from './components/charts/DepthChart';
import MetricCards from './components/charts/MetricCards';
import TradeList from './components/trade/TradeList';
import AlertPanel from './components/alerts/AlertPanel';
import { useCandles } from './hooks/useCandles';
import { useDepth } from './hooks/useDepth';
import { useMiniTicker } from './hooks/useMiniTicker';
import { useTrades } from './hooks/useTrades';
import './styles/app.css';

const symbols = [
  { label: 'BTC / USDT', value: 'BTCUSDT' },
  { label: 'ETH / USDT', value: 'ETHUSDT' },
  { label: 'BNB / USDT', value: 'BNBUSDT' },
  { label: 'XRP / USDT', value: 'XRPUSDT' }
];

const intervals = ['1m', '5m', '15m', '1h'];

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0].value);
  const [interval, setInterval] = useState(intervals[0]);
  const candles = useCandles(selectedSymbol, interval);
  const { bids, asks } = useDepth(selectedSymbol);
  const trades = useTrades(selectedSymbol);
  const ticker = useMiniTicker(selectedSymbol);

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
          <span className="selector-label">交易对</span>
          <div className="selector-grid">
            {symbols.map((symbol) => (
              <button
                key={symbol.value}
                className={`selector-button ${selectedSymbol === symbol.value ? 'active' : ''}`}
                onClick={() => setSelectedSymbol(symbol.value)}
              >
                {symbol.label}
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group">
          <span className="selector-label">周期</span>
          <div className="selector-grid">
            {intervals.map((item) => (
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
