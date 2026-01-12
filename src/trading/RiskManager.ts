import { NordUser } from '@n1xyz/nord-ts';

export interface RiskLimits {
  maxPositionSize: number;
  maxLeverage: number;
  maxDrawdown: number;
  maxDailyLoss: number;
  maxOrderSize: number;
  minAccountValue: number;
}

export class RiskManager {
  private dailyTrades = 0;
  private maxDailyTrades: number;

  constructor(
    private user: NordUser,
    private limits: RiskLimits,
    maxDailyTrades: number = 100
  ) {
    this.maxDailyTrades = maxDailyTrades;
  }

  async initialize(): Promise<void> {
    try {
      await this.user.fetchInfo();
      console.log('RiskManager: Inizializzato');
      console.log('Saldi:', this.user.balances);
    } catch (error) {
      console.error('RiskManager: Errore inizializzazione', error);
      throw error;
    }
  }

  async checkPositionSize(marketId: number, newSize: number): Promise<boolean> {
    try {
      const position = this.user.positions[marketId];
      const currentSize = position ? Math.abs(position.size) : 0;
      const totalSize = currentSize + Math.abs(newSize);

      if (totalSize > this.limits.maxPositionSize) {
        console.warn(`RiskManager: Posizione ${totalSize} supera limite ${this.limits.maxPositionSize}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('RiskManager: Errore verifica', error);
      return false;
    }
  }

  checkOrderSize(size: number): boolean {
    if (size > this.limits.maxOrderSize) {
      console.warn(`RiskManager: Ordine ${size} supera limite ${this.limits.maxOrderSize}`);
      return false;
    }
    return true;
  }

  checkDailyTradeLimit(): boolean {
    if (this.dailyTrades >= this.maxDailyTrades) {
      console.warn(`RiskManager: Limite ${this.maxDailyTrades} trade raggiunto`);
      return false;
    }
    return true;
  }

  async canPlaceOrder(marketId: number, size: number): Promise<boolean> {
    const checks = [
      await this.checkPositionSize(marketId, size),
      this.checkOrderSize(size),
      this.checkDailyTradeLimit(),
    ];

    if (checks.every(check => check)) {
      this.dailyTrades++;
      return true;
    }

    return false;
  }

  resetDailyMetrics(): void {
    this.dailyTrades = 0;
    console.log('RiskManager: Metriche resettate');
  }

  async getStats() {
    await this.user.fetchInfo();

    return {
      balances: this.user.balances,
      positions: this.user.positions,
      orders: Object.keys(this.user.orders).length,
      dailyTrades: this.dailyTrades,
    };
  }
}