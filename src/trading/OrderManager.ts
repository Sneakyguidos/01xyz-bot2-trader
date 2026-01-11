import { NordClient, Market, OrderType, OrderSide } from '@n1xyz/nord-ts';
import { logger } from '../utils/Logger.js';

export class OrderManager {
  constructor(private client: NordClient) {}

  async placeGridOrders(market: Market, orders: { side: OrderSide; price: number; size: number }[]) {
    const placed: string[] = [];
    for (const o of orders) {
      try {
        const tx = await this.client.placeOrder({
          market: market.address,
          side: o.side,
          price: o.price,
          size: o.size,
          type: OrderType.Limit,
          postOnly: true,
        });
        placed.push(tx.signature);
        logger.info({ side: o.side, price: o.price, size: o.size, sig: tx.signature }, 'Grid order placed');
      } catch (e) {
        logger.error({ err: e, order: o }, 'Failed to place grid order');
      }
    }
    return placed;
  }

  async cancelUnfilled(orders: string[]) {
    for (const sig of orders) {
      try {
        await this.client.cancelOrder(sig);
        logger.info({ sig }, 'Cancelled unfilled grid order');
      } catch (e) {
        logger.error({ err: e, sig }, 'Cancel failed');
      }
    }
  }
}