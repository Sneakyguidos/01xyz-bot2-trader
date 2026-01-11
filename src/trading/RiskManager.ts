import { NordClient, Market } from '@n1xyz/nord-ts';
import { logger } from '../utils/Logger.js';

export class RiskManager {
  constructor(
    private client: NordClient,
    private maxLeverage: number,
    private bufferPct: number
  ) {}

  async preTradeCheck(market: Market, notionalUsd: number, leverage: number): Promise<boolean> {
    if (leverage > this.maxLeverage) {
      logger.warn({ leverage, max: this.maxLeverage }, 'Leverage too high');
      return false;
    }
    const mark = await this.client.getMarkPrice(market.address);
    const liqPrice = this.simulateLiquidationPrice(mark, leverage);
    const distance = Math.abs(mark - liqPrice) / mark;
    if (distance < this.bufferPct / 100) {
      logger.warn({ distance, buffer: this.bufferPct }, 'Liquidation buffer too small');
      return false;
    }
    return true;
  }

  private simulateLiquidationPrice(mark: number, leverage: number): number {
    const marginReq = 1 / leverage;
    const maintMargin = 0.05;
    const liqDistance = marginReq - maintMargin;
    return mark * (1 - liqDistance); // simplified long; short mirrored later
  }
}