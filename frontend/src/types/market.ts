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
