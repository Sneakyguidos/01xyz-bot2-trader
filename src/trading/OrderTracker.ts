import { NordClient } from '@n1xyz/nord-ts';
import { logger } from '../utils/Logger.js';

export class OrderTracker {
  constructor(private client: NordClient) {}

  async pollFills(sigs: string[], cb: (fill: { sig: string; size: number; price: number }) => void) {
    setInterval(async () => {
      for (const sig of sigs) {
        const order = await this.client.getOrder(sig);
        if (order.filledSize > 0) {
          cb({ sig, size: order.filledSize, price: order.avgFillPrice! });
        }
      }
    }, 5_000);
  }
}