import { useEffect, useMemo, useRef, useState } from 'react';
import type { Candle } from '../types/market';

const MAX_LENGTH = 500;
const FUTURES_REST = 'https://fapi.binance.com';
const FUTURES_STREAM = 'wss://fstream.binance.com/ws';

interface AggregateTrade {
  price: number;
  quantity: number;
  time: number;
}

function parseIntervalToMs(interval: string): number | null {
  const match = interval.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 60 * 60_000;
    case 'd':
      return value * 24 * 60 * 60_000;
    default:
      return null;
  }
}

function aggregateTrades(trades: AggregateTrade[], bucketSize: number): Candle[] {
  const map = new Map<number, Candle>();
  trades.forEach((trade) => {
    if (!Number.isFinite(trade.price) || !Number.isFinite(trade.quantity) || !Number.isFinite(trade.time)) {
      return;
    }
    const bucketTime = Math.floor(trade.time / bucketSize) * bucketSize;
    const existing = map.get(bucketTime);
    if (existing) {
      map.set(bucketTime, {
        time: bucketTime,
        open: existing.open,
        high: Math.max(existing.high, trade.price),
        low: Math.min(existing.low, trade.price),
        close: trade.price,
        volume: Number((existing.volume + trade.quantity).toFixed(6)),
      });
    } else {
      map.set(bucketTime, {
        time: bucketTime,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: Number(trade.quantity.toFixed(6)),
      });
    }
  });

  return Array.from(map.values())
    .sort((a, b) => a.time - b.time)
    .slice(-MAX_LENGTH);
}

function mergeTradeIntoCandles(previous: Candle[], trade: AggregateTrade, bucketSize: number): Candle[] {
  if (!Number.isFinite(trade.price) || !Number.isFinite(trade.quantity) || !Number.isFinite(trade.time)) {
    return previous;
  }
  const bucketTime = Math.floor(trade.time / bucketSize) * bucketSize;
  const next = [...previous];
  const index = next.findIndex((item) => item.time === bucketTime);
  if (index >= 0) {
    const candle = next[index];
    next[index] = {
      time: bucketTime,
      open: candle.open,
      high: Math.max(candle.high, trade.price),
      low: Math.min(candle.low, trade.price),
      close: trade.price,
      volume: Number((candle.volume + trade.quantity).toFixed(6)),
    };
  } else {
    const candle: Candle = {
      time: bucketTime,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: Number(trade.quantity.toFixed(6)),
    };
    next.push(candle);
  }

  return next
    .sort((a, b) => a.time - b.time)
    .slice(-MAX_LENGTH);
}

export function useCandles(symbol: string, interval: string) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  const bucketSize = useMemo(() => parseIntervalToMs(interval), [interval]);
  const isSubMinute = bucketSize !== null && bucketSize < 60_000;

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        if (!bucketSize) {
          throw new Error('Invalid interval');
        }

        if (isSubMinute) {
          const response = await fetch(
            `${FUTURES_REST}/fapi/v1/aggTrades?symbol=${symbol}&limit=${Math.min(1000, MAX_LENGTH * 4)}`,
          );
          const trades = (await response.json()) as any[];
          if (!Array.isArray(trades)) return;
          const aggregated = aggregateTrades(
            trades.map((item) => ({
              price: Number(item.p),
              quantity: Number(item.q),
              time: Number(item.T ?? item.t ?? item.E ?? Date.now()),
            })),
            bucketSize,
          );
          if (active) {
            setCandles(aggregated);
          }
          return;
        }

        const response = await fetch(
          `${FUTURES_REST}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${MAX_LENGTH}`,
        );
        const data: unknown[] = await response.json();
        if (!Array.isArray(data)) return;
        const mapped: Candle[] = data.map((item: any) => ({
          time: Number(item[0]),
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
  }, [bucketSize, interval, isSubMinute, symbol]);

  useEffect(() => {
    if (!bucketSize) {
      return () => undefined;
    }

    const endpoint = isSubMinute
      ? `${FUTURES_STREAM}/${symbol.toLowerCase()}@aggTrade`
      : `${FUTURES_STREAM}/${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(endpoint);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (isSubMinute) {
        const trade: AggregateTrade = {
          price: parseFloat(payload.p),
          quantity: parseFloat(payload.q),
          time: Number(payload.T ?? Date.now()),
        };
        if (!Number.isFinite(trade.price) || !Number.isFinite(trade.quantity)) {
          return;
        }
        setCandles((prev) => mergeTradeIntoCandles(prev, trade, bucketSize));
        return;
      }

      const kline = payload.k;
      if (!kline) return;
      const candle: Candle = {
        time: Number(kline.t),
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
      };

      if (!Number.isFinite(candle.open) || !Number.isFinite(candle.close)) {
        return;
      }

      setCandles((prev) => {
        const list = prev.filter((item) => item.time !== candle.time);
        list.push(candle);
        return list.sort((a, b) => a.time - b.time).slice(-MAX_LENGTH);
      });
    };

    ws.onerror = (error) => {
      console.error('Candle socket error', error);
    };

    return () => {
      ws.close(1000);
      socketRef.current = null;
    };
  }, [bucketSize, interval, isSubMinute, symbol]);

  return candles;
}
