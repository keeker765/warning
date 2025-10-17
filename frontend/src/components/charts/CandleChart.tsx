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
  dark: '#11161c',
  light: '#ffffff',
} as const;

const TEXT_COLOR = {
  dark: '#f5f7fa',
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
        borderColor: '#2b3139',
      },
      timeScale: {
        borderColor: '#2b3139',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#f0b90b',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#f0b90b',
        },
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.06)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.06)' },
      },
      height,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderUpColor: '#0ecb81',
      borderDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
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
