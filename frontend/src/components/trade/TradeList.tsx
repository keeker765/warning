import type { Trade } from '../../types/market';

interface TradeListProps {
  trades: Trade[];
}

const formatPrice = (price: number) => price.toLocaleString(undefined, { maximumFractionDigits: 6 });
const formatQuantity = (quantity: number) => quantity.toFixed(4);

export default function TradeList({ trades }: TradeListProps) {
  return (
    <div className="trade-list">
      <div className="trade-header">
        <span>时间</span>
        <span>价格</span>
        <span>数量</span>
      </div>
      <ul>
        {trades.map((trade) => (
          <li key={trade.id} className={trade.isBuyerMaker ? 'sell' : 'buy'}>
            <span>{new Date(trade.time).toLocaleTimeString()}</span>
            <span>{formatPrice(trade.price)}</span>
            <span>{formatQuantity(trade.quantity)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
