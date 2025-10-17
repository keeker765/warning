import { useEffect, useMemo, useState } from 'react';
import type {
  BasisPoint,
  FuturesAnalytics,
  LongShortRatioPoint,
  OpenInterestDeltaPoint,
  OpenInterestPoint,
  TakerVolumePoint,
} from '../types/market';

const API_BASE = 'https://fapi.binance.com/futures/data';
const DEFAULT_PERIOD = '1h';
const LIMIT = 48;

type FetchError = { code?: number; msg?: string };

interface FetchState {
  data: FuturesAnalytics;
  loading: boolean;
  error: string | null;
  usingSample: boolean;
}

const SAMPLE_STATE: FetchState = {
  data: createSampleAnalytics('BTCUSDT', LIMIT),
  loading: false,
  error: null,
  usingSample: true,
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  if (Array.isArray(payload)) {
    return payload as T;
  }
  const error = payload as FetchError;
  throw new Error(error.msg || 'Unexpected response from Binance');
}

function parseOpenInterest(payload: any[]): OpenInterestPoint[] {
  return payload
    .map((item) => ({
      time: Number(item.timestamp),
      openInterest: Number(item.sumOpenInterest),
      openInterestValue: Number(item.sumOpenInterestValue),
    }))
    .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.openInterest));
}

function parseLongShort(payload: any[]): LongShortRatioPoint[] {
  return payload
    .map((item) => ({
      time: Number(item.timestamp),
      long: Number(item.longAccount ?? item.longPosition ?? 0),
      short: Number(item.shortAccount ?? item.shortPosition ?? 0),
      ratio: Number(item.longShortRatio ?? 0),
    }))
    .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.long) && Number.isFinite(item.short));
}

function parseTakerVolume(payload: any[]): TakerVolumePoint[] {
  return payload
    .map((item) => ({
      time: Number(item.timestamp),
      buyVolume: Number(item.buyVol ?? 0),
      sellVolume: Number(item.sellVol ?? 0),
      ratio: Number(item.buySellRatio ?? 0),
    }))
    .filter((item) => Number.isFinite(item.time));
}

function parseBasis(payload: any[]): BasisPoint[] {
  return payload
    .map((item) => {
      const markPrice = Number(item.markPrice ?? 0);
      const indexPrice = Number(item.indexPrice ?? 0);
      return {
        time: Number(item.time ?? item.timestamp ?? 0),
        markPrice,
        indexPrice,
        basis: markPrice - indexPrice,
      };
    })
    .filter((item) => Number.isFinite(item.time));
}

function computeDelta(series: OpenInterestPoint[]): OpenInterestDeltaPoint[] {
  const result: OpenInterestDeltaPoint[] = [];
  for (let i = 0; i < series.length; i += 1) {
    const current = series[i];
    const previous = series[i - 1];
    if (!previous) {
      result.push({ time: current.time, increase: 0, decrease: 0 });
      continue;
    }
    const diff = current.openInterest - previous.openInterest;
    result.push({
      time: current.time,
      increase: diff > 0 ? diff : 0,
      decrease: diff < 0 ? diff : 0,
    });
  }
  return result;
}

function createSampleAnalytics(symbol: string, limit: number): FuturesAnalytics {
  const points: OpenInterestPoint[] = [];
  const topAccounts: LongShortRatioPoint[] = [];
  const topPositions: LongShortRatioPoint[] = [];
  const globalAccounts: LongShortRatioPoint[] = [];
  const takerVolume: TakerVolumePoint[] = [];
  const basis: BasisPoint[] = [];

  const now = Date.now();
  const start = now - limit * 60 * 60 * 1000;
  const factor = symbol
    .split('')
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);

  let openInterestLevel = 85_000 + (factor % 1_000);

  for (let i = 0; i < limit; i += 1) {
    const time = start + i * 60 * 60 * 1000;
    const seasonal = Math.sin((i + factor / 10) / 3) * 2_500;
    const momentum = (i % 12) * 140 - 400;
    openInterestLevel = Math.max(60_000, openInterestLevel + seasonal * 0.1 + momentum);

    const openInterestValue = openInterestLevel * (240 + Math.sin(i / 6));
    points.push({
      time,
      openInterest: Number(openInterestLevel.toFixed(2)),
      openInterestValue: Number(openInterestValue.toFixed(2)),
    });

    const longAccount = 55 + Math.sin(i / 2 + factor) * 7;
    const longPosition = 52 + Math.sin(i / 1.8 + factor / 2) * 9;
    const globalAccount = 49 + Math.sin(i / 3 + factor / 3) * 6;

    topAccounts.push({
      time,
      long: Number(longAccount.toFixed(2)),
      short: Number((100 - longAccount).toFixed(2)),
      ratio: Number((longAccount / (100 - longAccount)).toFixed(3)),
    });

    topPositions.push({
      time,
      long: Number(longPosition.toFixed(2)),
      short: Number((100 - longPosition).toFixed(2)),
      ratio: Number((longPosition / (100 - longPosition)).toFixed(3)),
    });

    globalAccounts.push({
      time,
      long: Number(globalAccount.toFixed(2)),
      short: Number((100 - globalAccount).toFixed(2)),
      ratio: Number((globalAccount / (100 - globalAccount)).toFixed(3)),
    });

    const buyVolume = 18_000 + Math.sin(i / 2.5 + factor) * 3_000 + i * 120;
    const sellVolume = 17_000 + Math.cos(i / 2.7 + factor / 4) * 2_800 + (limit - i) * 90;

    takerVolume.push({
      time,
      buyVolume: Number(Math.max(0, buyVolume).toFixed(2)),
      sellVolume: Number(Math.max(0, sellVolume).toFixed(2)),
      ratio: Number((buyVolume / Math.max(1, sellVolume)).toFixed(3)),
    });

    const basePrice = 25_000 + Math.sin(i / 4 + factor) * 400 + i * 15;
    const markPrice = basePrice + Math.sin(i / 3) * 45;
    const indexPrice = basePrice - Math.cos(i / 5) * 35;
    basis.push({
      time,
      markPrice: Number(markPrice.toFixed(2)),
      indexPrice: Number(indexPrice.toFixed(2)),
      basis: Number((markPrice - indexPrice).toFixed(2)),
    });
  }

  const openInterestDelta = computeDelta(points);

  return {
    openInterest: points,
    openInterestDelta,
    topAccountsRatio: topAccounts,
    topPositionsRatio: topPositions,
    globalAccountsRatio: globalAccounts,
    takerVolume,
    basis,
  };
}

function mergeAnalytics(overrides: Partial<FuturesAnalytics>, symbol: string): FuturesAnalytics {
  const fallback = createSampleAnalytics(symbol, LIMIT);
  return {
    openInterest: overrides.openInterest ?? fallback.openInterest,
    openInterestDelta: overrides.openInterestDelta ?? fallback.openInterestDelta,
    topAccountsRatio: overrides.topAccountsRatio ?? fallback.topAccountsRatio,
    topPositionsRatio: overrides.topPositionsRatio ?? fallback.topPositionsRatio,
    globalAccountsRatio: overrides.globalAccountsRatio ?? fallback.globalAccountsRatio,
    takerVolume: overrides.takerVolume ?? fallback.takerVolume,
    basis: overrides.basis ?? fallback.basis,
  };
}

export interface UseFuturesAnalyticsOptions {
  period?: string;
  apiKey?: string;
  refreshMs?: number;
}

export function useFuturesAnalytics(symbol: string, options: UseFuturesAnalyticsOptions = {}) {
  const [state, setState] = useState<FetchState>(() => SAMPLE_STATE);
  const { period = DEFAULT_PERIOD, apiKey, refreshMs } = options;
  const headers = useMemo<HeadersInit | undefined>(() => {
    if (!apiKey) return undefined;
    return { 'X-MBX-APIKEY': apiKey };
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function load() {
      setState({
        data: createSampleAnalytics(symbol, LIMIT),
        loading: true,
        error: null,
        usingSample: true,
      });

      try {
        const requestInit: RequestInit = {
          headers,
          signal: abortController.signal,
        };

        const [
          openInterestRaw,
          topAccountsRaw,
          topPositionsRaw,
          globalAccountsRaw,
          takerVolumeRaw,
          basisRaw,
        ] = await Promise.all([
          request<any[]>(`${API_BASE}/openInterestHist?symbol=${symbol}&period=${period}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/topLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/topLongShortPositionRatio?symbol=${symbol}&period=${period}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/takerlongshortRatio?symbol=${symbol}&period=${period}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/premiumIndex?symbol=${symbol}&interval=${period}&limit=${LIMIT}`, requestInit),
        ]);

        const openInterest = parseOpenInterest(openInterestRaw);
        const analytics: FuturesAnalytics = {
          openInterest,
          openInterestDelta: computeDelta(openInterest),
          topAccountsRatio: parseLongShort(topAccountsRaw),
          topPositionsRatio: parseLongShort(topPositionsRaw),
          globalAccountsRatio: parseLongShort(globalAccountsRaw),
          takerVolume: parseTakerVolume(takerVolumeRaw),
          basis: parseBasis(basisRaw),
        };

        if (!cancelled) {
          setState({ data: analytics, loading: false, error: null, usingSample: false });
        }
      } catch (error) {
        console.error('Failed to load futures analytics', error);
        if (!cancelled) {
          const fallback = mergeAnalytics({}, symbol);
          setState({
            data: fallback,
            loading: false,
            error: '未能从 Binance 获取合约数据，正在展示示例趋势。',
            usingSample: true,
          });
        }
      }
    }

    load();

    let intervalId: number | null = null;
    if (refreshMs && refreshMs > 0) {
      intervalId = window.setInterval(load, refreshMs);
    }

    return () => {
      cancelled = true;
      abortController.abort();
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [headers, period, refreshMs, symbol]);

  return useMemo(
    () => ({
      data: state.data,
      loading: state.loading,
      error: state.error,
      usingSample: state.usingSample,
    }),
    [state],
  );
}

export type { FuturesAnalytics };
