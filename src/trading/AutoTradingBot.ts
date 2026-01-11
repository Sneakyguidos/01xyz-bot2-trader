import { NordClient } from '@n1xyz/nord-ts';
import { AutoTradingEngine, GridSpec } from './AutoTradingEngine.js';
import { RiskManager } from './RiskManager.js';
import { OrderManager } from './OrderManager.js';
import { OrderTracker } from './OrderTracker.js';
import { logger } from '../utils/Logger.js';

export class AutoTradingBot {
  private running = false;
  constructor(private client: NordClient, private grids: GridSpec[]) {}

  async start() {
    this.running = true;
    const risk = new RiskManager(this.client, 10, 10);
    const om = new OrderManager(this.client);
    const ot = new OrderTracker(this.client);

    for (const g of this.grids) {
      const engine = new AutoTradingEngine(this.client, risk, om, g);
      const sigs = await engine.run();
      ot.pollFills(sigs, (fill) => logger.info({ fill }, 'Fill detected'));
    }

    process.on('SIGINT', async () => {
      logger.info('SIGINT – shutting down');
      this.running = false;
      process.exit(0);
    });

    while (this.running) await new Promise((r) => setTimeout(r, 60_000));
  }
}