import { useEffect, useState } from 'react';
import type { MiniTicker } from '../types/market';

export function useMiniTicker(symbol: string) {
  const [ticker, setTicker] = useState<MiniTicker | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTicker() {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        const json = await response.json();
        if (!json || json.code) return;
        if (active) {
          setTicker({
            symbol: json.symbol,
            lastPrice: parseFloat(json.lastPrice),
            highPrice: parseFloat(json.highPrice),
            lowPrice: parseFloat(json.lowPrice),
            volume: parseFloat(json.volume),
            priceChangePercent: parseFloat(json.priceChangePercent),
          });
        }
      } catch (error) {
        console.error('Failed to fetch ticker', error);
      }
    }

    loadTicker();

    return () => {
      active = false;
    };
  }, [symbol]);

  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@miniTicker`);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setTicker({
        symbol: payload.s,
        lastPrice: parseFloat(payload.c),
        highPrice: parseFloat(payload.h),
        lowPrice: parseFloat(payload.l),
        volume: parseFloat(payload.v),
        priceChangePercent: parseFloat(payload.P),
      });
    };

    ws.onerror = (error) => {
      console.error('Mini ticker socket error', error);
    };

    return () => {
      ws.close(1000);
    };
  }, [symbol]);

  return ticker;
}
