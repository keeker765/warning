import { useEffect, useRef, useState } from 'react';
import type { Candle } from '../types/market';

const MAX_LENGTH = 500;

export function useCandles(symbol: string, interval: string) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${MAX_LENGTH}`,
        );
        const data: unknown[] = await response.json();
        if (!Array.isArray(data)) return;
        const mapped: Candle[] = data.map((item: any) => ({
          time: item[0],
          open: Number(item[1]),
          high: Number(item[2]),
          low: Number(item[3]),
          close: Number(item[4]),
          volume: Number(item[5]),
        }));
        if (active) {
          setCandles(mapped);
        }
      } catch (error) {
        console.error('Failed to load candles', error);
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, [interval, symbol]);

  useEffect(() => {
    const endpoint = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(endpoint);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const kline = payload.k;
      const candle: Candle = {
        time: kline.t,
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
      };

      setCandles((prev) => {
        const list = prev.filter((item) => item.time !== candle.time);
        list.push(candle);
        return list.slice(-MAX_LENGTH);
      });
    };

    ws.onerror = (error) => {
      console.error('Candle socket error', error);
    };

    return () => {
      ws.close(1000);
      socketRef.current = null;
    };
  }, [interval, symbol]);

  return candles;
}
