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
const DEFAULT_SAMPLE_INTERVAL_MS = 60 * 60 * 1000;
const REMOTE_PERIODS = new Set([
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '12h',
  '1d',
]);

type FetchError = { code?: number; msg?: string };

interface FetchState {
  data: FuturesAnalytics;
  loading: boolean;
  error: string | null;
  usingSample: boolean;
}

function parsePeriodToMs(value: string): number | null {
  const match = value.match(/^(\d+)([mhd])$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2];
  switch (unit) {
    case 'm':
      return amount * 60_000;
    case 'h':
      return amount * 60 * 60_000;
    case 'd':
      return amount * 24 * 60 * 60_000;
    default:
      return null;
  }
}

function resolveTargetIntervalMs(period: string): number {
  return parsePeriodToMs(period) ?? DEFAULT_SAMPLE_INTERVAL_MS;
}

function resolveRemotePeriod(period: string): string {
  if (period === '1m' || period === '2m') {
    return '5m';
  }
  if (REMOTE_PERIODS.has(period)) {
    return period;
  }
  return DEFAULT_PERIOD;
}

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

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const scaled = value <= 1 ? value * 100 : value;
  return Number(scaled.toFixed(2));
}

function parseLongShort(payload: any[]): LongShortRatioPoint[] {
  return payload
    .map((item) => {
      const longRaw = Number(item.longAccount ?? item.longPosition ?? 0);
      const shortRaw = Number(item.shortAccount ?? item.shortPosition ?? 0);
      const long = normalizePercent(longRaw);
      const short = normalizePercent(shortRaw);
      const ratio = short === 0 ? 0 : Number((long / short).toFixed(3));
      return {
        time: Number(item.timestamp),
        long,
        short,
        ratio,
      };
    })
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

function createSampleAnalytics(
  symbol: string,
  limit: number,
  intervalMs: number = DEFAULT_SAMPLE_INTERVAL_MS,
): FuturesAnalytics {
  const points: OpenInterestPoint[] = [];
  const topAccounts: LongShortRatioPoint[] = [];
  const topPositions: LongShortRatioPoint[] = [];
  const globalAccounts: LongShortRatioPoint[] = [];
  const takerVolume: TakerVolumePoint[] = [];
  const basis: BasisPoint[] = [];

  const now = Date.now();
  const effectiveInterval = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_SAMPLE_INTERVAL_MS;
  const start = now - limit * effectiveInterval;
  const factor = symbol
    .split('')
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);

  let openInterestLevel = 85_000 + (factor % 1_000);

  for (let i = 0; i < limit; i += 1) {
    const time = start + i * effectiveInterval;
    const scaledIndex = (i * effectiveInterval) / DEFAULT_SAMPLE_INTERVAL_MS;
    const seasonal = Math.sin((scaledIndex + factor / 10) / 3) * 2_500;
    const momentum = (scaledIndex % 12) * 140 - 400;
    openInterestLevel = Math.max(60_000, openInterestLevel + seasonal * 0.1 + momentum);

    const openInterestValue = openInterestLevel * (240 + Math.sin(scaledIndex / 6));
    points.push({
      time,
      openInterest: Number(openInterestLevel.toFixed(2)),
      openInterestValue: Number(openInterestValue.toFixed(2)),
    });

    const longAccount = 55 + Math.sin(scaledIndex / 2 + factor) * 7;
    const longPosition = 52 + Math.sin(scaledIndex / 1.8 + factor / 2) * 9;
    const globalAccount = 49 + Math.sin(scaledIndex / 3 + factor / 3) * 6;

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

    const buyVolume = 18_000 + Math.sin(scaledIndex / 2.5 + factor) * 3_000 + scaledIndex * 120;
    const sellVolume =
      17_000 + Math.cos(scaledIndex / 2.7 + factor / 4) * 2_800 + Math.max(0, limit - scaledIndex) * 90;

    takerVolume.push({
      time,
      buyVolume: Number(Math.max(0, buyVolume).toFixed(2)),
      sellVolume: Number(Math.max(0, sellVolume).toFixed(2)),
      ratio: Number((buyVolume / Math.max(1, sellVolume)).toFixed(3)),
    });

    const basePrice = 25_000 + Math.sin(scaledIndex / 4 + factor) * 400 + scaledIndex * 15;
    const markPrice = basePrice + Math.sin(scaledIndex / 3) * 45;
    const indexPrice = basePrice - Math.cos(scaledIndex / 5) * 35;
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

function mergeAnalytics(
  overrides: Partial<FuturesAnalytics>,
  symbol: string,
  intervalMs: number,
): FuturesAnalytics {
  const fallback = createSampleAnalytics(symbol, LIMIT, intervalMs);
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

function resampleSeries<T extends { time: number }>(
  series: T[],
  targetIntervalMs: number,
  interpolate: (current: T, next: T, ratio: number, time: number) => T,
): T[] {
  if (!series.length || !Number.isFinite(targetIntervalMs) || targetIntervalMs <= 0) {
    return [...series];
  }
  const sorted = [...series].sort((a, b) => a.time - b.time);
  const result: T[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    result.push({ ...current });
    const next = sorted[i + 1];
    if (!next) {
      break;
    }
    const span = next.time - current.time;
    if (!(span > targetIntervalMs)) {
      continue;
    }
    const steps = Math.floor(span / targetIntervalMs);
    for (let step = 1; step < steps; step += 1) {
      const time = current.time + step * targetIntervalMs;
      const ratio = (step * targetIntervalMs) / span;
      result.push(interpolate(current, next, ratio, time));
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

function resampleOpenInterestSeries(
  series: OpenInterestPoint[],
  targetIntervalMs: number,
): OpenInterestPoint[] {
  const resampled = resampleSeries(series, targetIntervalMs, (current, next, ratio, time) => ({
    time,
    openInterest: current.openInterest + (next.openInterest - current.openInterest) * ratio,
    openInterestValue:
      current.openInterestValue + (next.openInterestValue - current.openInterestValue) * ratio,
  }));
  return resampled.map((item) => ({
    time: item.time,
    openInterest: Number(item.openInterest),
    openInterestValue: Number(item.openInterestValue),
  }));
}

function resampleLongShortSeries(
  series: LongShortRatioPoint[],
  targetIntervalMs: number,
): LongShortRatioPoint[] {
  const resampled = resampleSeries(series, targetIntervalMs, (current, next, ratio, time) => {
    const long = current.long + (next.long - current.long) * ratio;
    const short = current.short + (next.short - current.short) * ratio;
    return {
      time,
      long,
      short,
      ratio: short === 0 ? 0 : long / short,
    };
  });
  return resampled.map((item) => {
    const long = Number(item.long);
    const short = Number(item.short);
    const ratio = short === 0 ? 0 : long / short;
    return {
      time: item.time,
      long,
      short,
      ratio: Number(ratio.toFixed(3)),
    };
  });
}

function resampleTakerVolumeSeries(
  series: TakerVolumePoint[],
  targetIntervalMs: number,
): TakerVolumePoint[] {
  const resampled = resampleSeries(series, targetIntervalMs, (current, next, ratio, time) => {
    const buyVolume = current.buyVolume + (next.buyVolume - current.buyVolume) * ratio;
    const sellVolume = current.sellVolume + (next.sellVolume - current.sellVolume) * ratio;
    return {
      time,
      buyVolume,
      sellVolume,
      ratio: sellVolume === 0 ? 0 : buyVolume / sellVolume,
    };
  });
  return resampled.map((item) => {
    const buyVolume = Number(item.buyVolume);
    const sellVolume = Number(item.sellVolume);
    const ratio = sellVolume === 0 ? 0 : buyVolume / sellVolume;
    return {
      time: item.time,
      buyVolume,
      sellVolume,
      ratio: Number(ratio.toFixed(3)),
    };
  });
}

function resampleBasisSeries(series: BasisPoint[], targetIntervalMs: number): BasisPoint[] {
  const resampled = resampleSeries(series, targetIntervalMs, (current, next, ratio, time) => {
    const markPrice = current.markPrice + (next.markPrice - current.markPrice) * ratio;
    const indexPrice = current.indexPrice + (next.indexPrice - current.indexPrice) * ratio;
    return {
      time,
      markPrice,
      indexPrice,
      basis: markPrice - indexPrice,
    };
  });
  return resampled.map((item) => {
    const markPrice = Number(item.markPrice);
    const indexPrice = Number(item.indexPrice);
    return {
      time: item.time,
      markPrice,
      indexPrice,
      basis: Number((markPrice - indexPrice).toFixed(2)),
    };
  });
}

function resampleAnalytics(data: FuturesAnalytics, targetIntervalMs: number): FuturesAnalytics {
  const openInterest = resampleOpenInterestSeries(data.openInterest, targetIntervalMs);
  return {
    openInterest,
    openInterestDelta: computeDelta(openInterest),
    topAccountsRatio: resampleLongShortSeries(data.topAccountsRatio, targetIntervalMs),
    topPositionsRatio: resampleLongShortSeries(data.topPositionsRatio, targetIntervalMs),
    globalAccountsRatio: resampleLongShortSeries(data.globalAccountsRatio, targetIntervalMs),
    takerVolume: resampleTakerVolumeSeries(data.takerVolume, targetIntervalMs),
    basis: resampleBasisSeries(data.basis, targetIntervalMs),
  };
}

export interface UseFuturesAnalyticsOptions {
  period?: string;
  apiKey?: string;
  refreshMs?: number;
}

export function useFuturesAnalytics(symbol: string, options: UseFuturesAnalyticsOptions = {}) {
  const { period = DEFAULT_PERIOD, apiKey, refreshMs } = options;
  const targetIntervalMs = resolveTargetIntervalMs(period);
  const remotePeriod = resolveRemotePeriod(period);
  const [state, setState] = useState<FetchState>(() => ({
    data: createSampleAnalytics(symbol, LIMIT, targetIntervalMs),
    loading: true,
    error: null,
    usingSample: true,
  }));
  const headers = useMemo<HeadersInit | undefined>(() => {
    if (!apiKey) return undefined;
    return { 'X-MBX-APIKEY': apiKey };
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function load() {
      setState({
        data: createSampleAnalytics(symbol, LIMIT, targetIntervalMs),
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
          request<any[]>(`${API_BASE}/openInterestHist?symbol=${symbol}&period=${remotePeriod}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/topLongShortAccountRatio?symbol=${symbol}&period=${remotePeriod}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/topLongShortPositionRatio?symbol=${symbol}&period=${remotePeriod}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/globalLongShortAccountRatio?symbol=${symbol}&period=${remotePeriod}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/takerlongshortRatio?symbol=${symbol}&period=${remotePeriod}&limit=${LIMIT}`, requestInit),
          request<any[]>(`${API_BASE}/premiumIndex?symbol=${symbol}&interval=${remotePeriod}&limit=${LIMIT}`, requestInit),
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

        const finalData = remotePeriod === period ? analytics : resampleAnalytics(analytics, targetIntervalMs);

        if (!cancelled) {
          setState({ data: finalData, loading: false, error: null, usingSample: false });
        }
      } catch (error) {
        console.error('Failed to load futures analytics', error);
        if (!cancelled) {
          const fallback = mergeAnalytics({}, symbol, targetIntervalMs);
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
  }, [headers, remotePeriod, refreshMs, symbol, targetIntervalMs, period]);

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
