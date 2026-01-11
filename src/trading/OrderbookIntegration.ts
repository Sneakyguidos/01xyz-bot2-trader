import WebSocket from 'ws';
import { logger } from '../utils/Logger.js';

export interface BigOrder {
  side: 'buy' | 'sell';
  price: number;
  sizeUsd: number;
}

export class OrderbookIntegration {
  private ws: WebSocket | null = null;
  constructor(private market: string, private thresholdUsd: number, private callback: (o: BigOrder) => void) {}

  connect() {
    this.ws = new WebSocket('wss://zo-mainnet.n1.xyz');
    this.ws.on('open', () => {
      this.ws!.send(JSON.stringify({ op: 'subscribe', channel: 'orderbook', market: this.market }));
    });
    this.ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'l2') {
        for (const side of ['bids', 'asks']) {
          for (const [price, size] of msg[side]) {
            const sizeUsd = size * price;
            if (sizeUsd > this.thresholdUsd) {
              this.callback({ side: side === 'bids' ? 'buy' : 'sell', price, sizeUsd });
            }
          }
        }
      }
    });
    this.ws.on('error', (e) => logger.error({ err: e }, 'OB WS error'));
  }

  disconnect() {
    this.ws?.close();
  }
}