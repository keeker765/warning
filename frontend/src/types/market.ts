export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
}

export interface Trade {
  id: string;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}

export interface MiniTicker {
  symbol: string;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  priceChangePercent: number;
}

export interface SymbolInsight {
  symbol: string;
  lastPrice: number;
  dayPriceChangePercent: number;
  hourPriceChangePercent: number;
  hourVolumeChangePercent: number;
  lastVolume: number;
}

export interface OpenInterestPoint {
  time: number;
  openInterest: number;
  openInterestValue: number;
}

export interface OpenInterestDeltaPoint {
  time: number;
  increase: number;
  decrease: number;
}

export interface LongShortRatioPoint {
  time: number;
  long: number;
  short: number;
  ratio: number;
}

export interface TakerVolumePoint {
  time: number;
  buyVolume: number;
  sellVolume: number;
  ratio: number;
}

export interface BasisPoint {
  time: number;
  markPrice: number;
  indexPrice: number;
  basis: number;
}

export interface FuturesAnalytics {
  openInterest: OpenInterestPoint[];
  openInterestDelta: OpenInterestDeltaPoint[];
  topAccountsRatio: LongShortRatioPoint[];
  topPositionsRatio: LongShortRatioPoint[];
  globalAccountsRatio: LongShortRatioPoint[];
  takerVolume: TakerVolumePoint[];
  basis: BasisPoint[];
}
