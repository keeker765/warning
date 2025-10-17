import { useEffect, useState } from 'react';
import type { OrderBookEntry } from '../types/market';

const MAX_DEPTH = 20;

function parseDepth(data: [string, string][]): OrderBookEntry[] {
  return data
    .slice(0, MAX_DEPTH)
    .map(([price, quantity]) => ({ price: parseFloat(price), quantity: parseFloat(quantity) }))
    .filter((entry) => Number.isFinite(entry.price) && Number.isFinite(entry.quantity));
}

export function useDepth(symbol: string) {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);

  useEffect(() => {
    let active = true;

    async function loadInitialDepth() {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`);
        const json = await response.json();
        if (!json) return;
        if (active) {
          setBids(parseDepth(json.bids));
          setAsks(parseDepth(json.asks));
        }
      } catch (error) {
        console.error('Failed to load depth', error);
      }
    }

    loadInitialDepth();

    return () => {
      active = false;
    };
  }, [symbol]);

  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const bidsData: [string, string][] = payload.bids ?? payload.b ?? [];
      const asksData: [string, string][] = payload.asks ?? payload.a ?? [];
      setBids(parseDepth(bidsData));
      setAsks(parseDepth(asksData));
    };

    ws.onerror = (error) => {
      console.error('Depth socket error', error);
    };

    return () => {
      ws.close(1000);
    };
  }, [symbol]);

  return { bids, asks };
}
