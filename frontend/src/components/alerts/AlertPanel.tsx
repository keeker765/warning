import { useEffect, useMemo, useRef, useState } from 'react';
import type { MiniTicker } from '../../types/market';

interface AlertRule {
  id: string;
  price: number;
  direction: 'above' | 'below';
  createdAt: number;
  triggered?: boolean;
}

interface AlertPanelProps {
  symbol: string;
  currentPrice: number;
  ticker: MiniTicker | null;
}

const STORAGE_KEY = 'binance-alerts';

function loadStoredAlerts(): Record<string, AlertRule[]> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load alerts', error);
    return {};
  }
}

function persistAlerts(alerts: Record<string, AlertRule[]>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch (error) {
    console.error('Failed to persist alerts', error);
  }
}

export default function AlertPanel({ symbol, currentPrice, ticker }: AlertPanelProps) {
  const [alertsBySymbol, setAlertsBySymbol] = useState<Record<string, AlertRule[]>>(loadStoredAlerts);
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const alerts = alertsBySymbol[symbol] ?? [];

  useEffect(() => {
    persistAlerts(alertsBySymbol);
  }, [alertsBySymbol]);

  useEffect(() => {
    if (!ticker) return;
    const price = ticker.lastPrice;

    setAlertsBySymbol((prev) => {
      const updated = { ...prev };
      const list = [...(updated[symbol] ?? [])];
      let changed = false;

      list.forEach((alert) => {
        if (alert.triggered) return;
        if ((alert.direction === 'above' && price >= alert.price) || (alert.direction === 'below' && price <= alert.price)) {
          alert.triggered = true;
          changed = true;
        }
      });

      if (changed) {
        updated[symbol] = list;
        setMessage(`预警触发：${symbol} ${price.toLocaleString()} USDT`);
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => setMessage(null), 4000);
        return updated;
      }

      return prev;
    });
  }, [symbol, ticker]);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  const activeAlerts = useMemo(() => alerts.filter((alert) => !alert.triggered), [alerts]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const price = Number(targetPrice);
    if (!price) return;

    setAlertsBySymbol((prev) => {
      const list = prev[symbol] ? [...prev[symbol]] : [];
      const newAlert: AlertRule = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        price,
        direction,
        createdAt: Date.now(),
      };
      list.push(newAlert);
      return { ...prev, [symbol]: list };
    });
    setTargetPrice('');
  };

  const removeAlert = (id: string) => {
    setAlertsBySymbol((prev) => {
      const list = prev[symbol]?.filter((alert) => alert.id !== id) ?? [];
      return { ...prev, [symbol]: list };
    });
  };

  return (
    <section className="alert-panel">
      <h2 className="panel-title">预警系统</h2>
      <p className="panel-subtitle">当前价格：{currentPrice ? currentPrice.toLocaleString() : '--'} USDT</p>
      <form className="alert-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>目标价位</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="例如 32000"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>方向</span>
          <div className="direction-toggle">
            <button
              type="button"
              className={direction === 'above' ? 'active' : ''}
              onClick={() => setDirection('above')}
            >
              向上突破
            </button>
            <button
              type="button"
              className={direction === 'below' ? 'active' : ''}
              onClick={() => setDirection('below')}
            >
              向下跌破
            </button>
          </div>
        </label>

        <button type="submit" className="submit">添加预警</button>
      </form>

      <div className="alert-list">
        <h3>活跃预警</h3>
        {activeAlerts.length === 0 ? (
          <p className="empty">暂无预警，创建一个吧。</p>
        ) : (
          <ul>
            {activeAlerts.map((alert) => (
              <li key={alert.id}>
                <div>
                  <strong>{alert.direction === 'above' ? '≥' : '≤'} {alert.price.toLocaleString()}</strong>
                  <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                </div>
                <button onClick={() => removeAlert(alert.id)}>删除</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && <div className="alert-toast">{message}</div>}
    </section>
  );
}
