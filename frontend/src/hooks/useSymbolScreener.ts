import { useEffect, useMemo, useState } from 'react';
import type { SymbolInsight } from '../types/market';

interface ScreenerResult {
  insights: SymbolInsight[];
  loading: boolean;
  error: string | null;
  filtered: (filter: (insight: SymbolInsight) => boolean) => SymbolInsight[];
}

const KLINE_INTERVAL = '1h';
const KLINE_LIMIT = 2;

export function useSymbolScreener(symbols: string[]): ScreenerResult {
  const [insights, setInsights] = useState<SymbolInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!symbols.length) {
        setInsights([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await Promise.all(
          symbols.map(async (symbol) => {
            try {
              const [tickerResponse, klineResponse] = await Promise.all([
                fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`),
                fetch(
                  `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${KLINE_INTERVAL}&limit=${KLINE_LIMIT}`,
                ),
              ]);

              if (!tickerResponse.ok) {
                throw new Error(`Ticker request failed with status ${tickerResponse.status}`);
              }
              if (!klineResponse.ok) {
                throw new Error(`Kline request failed with status ${klineResponse.status}`);
              }

              const ticker = await tickerResponse.json();
              const klines = await klineResponse.json();

              if (!Array.isArray(klines) || klines.length < 2) {
                throw new Error('Kline response missing data');
              }

              const previous = klines[klines.length - 2];
              const latest = klines[klines.length - 1];

              const previousClose = Number(previous[4]);
              const latestClose = Number(latest[4]);
              const previousVolume = Number(previous[5]);
              const latestVolume = Number(latest[5]);

              if (
                !Number.isFinite(previousClose) ||
                !Number.isFinite(latestClose) ||
                !Number.isFinite(previousVolume) ||
                !Number.isFinite(latestVolume)
              ) {
                throw new Error('Non numeric kline data');
              }

              const hourPriceChangePercent = ((latestClose - previousClose) / previousClose) * 100;
              const hourVolumeChangePercent =
                previousVolume === 0 ? 0 : ((latestVolume - previousVolume) / previousVolume) * 100;

              const insight: SymbolInsight = {
                symbol,
                lastPrice: Number(ticker.lastPrice ?? latestClose),
                dayPriceChangePercent: Number(ticker.priceChangePercent ?? 0),
                hourPriceChangePercent,
                hourVolumeChangePercent,
                lastVolume: latestVolume,
              };

              return insight;
            } catch (innerError) {
              console.error(`Failed to build screener data for ${symbol}`, innerError);
              return null;
            }
          }),
        );

        if (!cancelled) {
          setInsights(result.filter((item): item is SymbolInsight => Boolean(item)));
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    const intervalId = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [symbols]);

  const filterFn = useMemo(
    () =>
      (predicate: (insight: SymbolInsight) => boolean) =>
        insights.filter((insight) => {
          try {
            return predicate(insight);
          } catch (error) {
            console.error('Screener filter failed', error);
            return false;
          }
        }),
    [insights],
  );

  return {
    insights,
    loading,
    error,
    filtered: filterFn,
  };
}
