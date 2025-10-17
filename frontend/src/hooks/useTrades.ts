import { useEffect, useState } from 'react';
import type { Trade } from '../types/market';

const MAX_TRADES = 30;

export function useTrades(symbol: string) {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    let active = true;

    async function loadTrades() {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=${MAX_TRADES}`);
        const data = await response.json();
        if (!Array.isArray(data)) return;
        if (active) {
          setTrades(
            data
              .map((item: any) => ({
                id: item.id?.toString() ?? String(item.id),
                price: Number(item.price),
                quantity: Number(item.qty ?? item.quantity),
                time: Number(item.time),
                isBuyerMaker: Boolean(item.isBuyerMaker),
              }))
              .filter((trade: Trade) => Number.isFinite(trade.price) && Number.isFinite(trade.quantity)),
          );
        }
      } catch (error) {
        console.error('Failed to load trades', error);
      }
    }

    loadTrades();

    return () => {
      active = false;
    };
  }, [symbol]);

  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const trade: Trade = {
        id:
          payload.t?.toString() ??
          (typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`),
        price: parseFloat(payload.p),
        quantity: parseFloat(payload.q),
        time: payload.T,
        isBuyerMaker: payload.m,
      };

      setTrades((prev) => {
        if (!Number.isFinite(trade.price) || !Number.isFinite(trade.quantity)) {
          return prev;
        }
        const list = [trade, ...prev];
        return list.slice(0, MAX_TRADES);
      });
    };

    ws.onerror = (error) => {
      console.error('Trade socket error', error);
    };

    return () => {
      ws.close(1000);
    };
  }, [symbol]);

  return trades;
}
