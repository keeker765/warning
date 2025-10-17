import { useEffect, useRef } from 'react';
import {
  CandlestickData,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
  Time,
  createChart,
} from 'lightweight-charts';
import type { Candle } from '../../types/market';

interface CandleChartProps {
  data: Candle[];
  theme?: 'dark' | 'light';
  height?: number;
}

const CHART_BACKGROUND = {
  dark: '#101522',
  light: '#ffffff',
} as const;

const TEXT_COLOR = {
  dark: '#f7f8f8',
  light: '#1f2933',
} as const;

function CandleChart({ data, theme = 'dark', height = 420 }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: CHART_BACKGROUND[theme] },
        textColor: TEXT_COLOR[theme],
      },
      rightPriceScale: {
        visible: true,
        borderColor: '#1f2933',
      },
      timeScale: {
        borderColor: '#1f2933',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(224, 224, 255, 0.3)',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: 'rgba(224, 224, 255, 0.3)',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#3b82f6',
        },
      },
      grid: {
        vertLines: { color: 'rgba(47, 49, 65, 0.6)' },
        horzLines: { color: 'rgba(47, 49, 65, 0.6)' },
      },
      height,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0fba81',
      downColor: '#ef4444',
      borderUpColor: '#0fba81',
      borderDownColor: '#ef4444',
      wickUpColor: '#0fba81',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, theme]);

  useEffect(() => {
    if (!seriesRef.current) return;

    const mapped: CandlestickData[] = data.map((candle) => ({
      time: (candle.time / 1000) as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    seriesRef.current.setData(mapped);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} className="chart-root" />;
}

export default CandleChart;
