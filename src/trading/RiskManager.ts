import { NordUser, Position, Balance } from '@n1xyz/nord-ts';
import BN from 'bn.js';

export interface RiskLimits {
  maxPositionSize: number;
  maxLeverage: number;
  maxDrawdown: number;
  maxDailyLoss: number;
  maxOrderSize: number;
  minAccountValue: number;
}

export class RiskManager {
  private dailyPnl = 0;
  private startingBalance = 0;
  private dailyTrades = 0;
  private maxDailyTrades: number;

  constructor(
    private user: NordUser,
    private limits: RiskLimits,
    maxDailyTrades: number = 100
  ) {
    this.maxDailyTrades = maxDailyTrades;
  }

  /**
   * Inizializza il Risk Manager
   */
  async initialize(): Promise<void> {
    try {
      const accountValue = await this.user.getAccountValue();
      this.startingBalance = this.bnToNumber(accountValue);
      console.log(`RiskManager: Inizializzato con saldo ${this.startingBalance}`);
    } catch (error) {
      console.error('RiskManager: Errore nell\'inizializzazione', error);
      throw error;
    }
  }

  /**
   * Verifica se la dimensione della posizione è accettabile
   */
  async checkPositionSize(marketId: number, newSize: number): Promise<boolean> {
    try {
      const position = await this.user.getPosition(marketId);
      const currentSize = position ? this.bnToNumber(position.size) : 0;
      const totalSize = Math.abs(currentSize) + Math.abs(newSize);

      if (totalSize > this.limits.maxPositionSize) {
        console.warn(`RiskManager: Dimensione posizione ${totalSize} supera il limite ${this.limits.maxPositionSize}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('RiskManager: Errore nella verifica della dimensione', error);
      return false;
    }
  }

  /**
   * Verifica il leverage dell'account
   */
  async checkLeverage(): Promise<boolean> {
    try {
      const leverage = await this.user.getLeverage();

      if (leverage > this.limits.maxLeverage) {
        console.warn(`RiskManager: Leverage ${leverage}x supera il limite ${this.limits.maxLeverage}x`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('RiskManager: Errore nella verifica del leverage', error);
      return false;
    }
  }

  /**
   * Verifica il drawdown
   */
  async checkDrawdown(): Promise<boolean> {
    try {
      const positions = await this.user.getPositions();
      const totalUnrealizedPnl = positions.reduce(
        (sum, p) => sum + this.bnToNumber(p.unrealizedPnl),
        0
      );

      const drawdown = Math.abs(totalUnrealizedPnl) / this.startingBalance;

      if (drawdown > this.limits.maxDrawdown) {
        console.warn(`RiskManager: Drawdown ${(drawdown * 100).toFixed(2)}% supera il limite ${(this.limits.maxDrawdown * 100).toFixed(2)}%`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('RiskManager: Errore nella verifica del drawdown', error);
      return false;
    }
  }

  /**
   * Verifica la perdita giornaliera
   */
  async checkDailyLoss(): Promise<boolean> {
    try {
      const positions = await this.user.getPositions();
      this.dailyPnl = positions.reduce(
        (sum, p) => sum + this.bnToNumber(p.realizedPnl) + this.bnToNumber(p.unrealizedPnl),
        0
      );

      if (Math.abs(this.dailyPnl) > this.limits.maxDailyLoss) {
        console.warn(`RiskManager: Perdita giornaliera ${Math.abs(this.dailyPnl)} supera il limite ${this.limits.maxDailyLoss}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('RiskManager: Errore nella verifica della perdita giornaliera', error);
      return false;
    }
  }

  /**
   * Verifica la dimensione dell'ordine
   */
  checkOrderSize(size: number): boolean {
    if (size > this.limits.maxOrderSize) {
      console.warn(`RiskManager: Dimensione ordine ${size} supera il limite ${this.limits.maxOrderSize}`);
      return false;
    }
    return true;
  }

  /**
   * Verifica il valore minimo dell'account
   */
  async checkMinAccountValue(): Promise<boolean> {
    try {
      const accountValue = await this.user.getAccountValue();
      const value = this.bnToNumber(accountValue);

      if (value < this.limits.minAccountValue) {
        console.warn(`RiskManager: Valore account ${value} sotto il minimo ${this.limits.minAccountValue}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('RiskManager: Errore nella verifica del valore account', error);
      return false;
    }
  }

  /**
   * Verifica se l'account è in stato di liquidazione
   */
  async checkLiquidationRisk(): Promise<boolean> {
    try {
      const isLiquidatable = await this.user.isLiquidatable();

      if (isLiquidatable) {
        console.error('RiskManager: ⚠️ ACCOUNT A RISCHIO LIQUIDAZIONE!');
        return false;
      }

      return true;
    } catch (error) {
      console.error('RiskManager: Errore nella verifica del rischio di liquidazione', error);
      return false;
    }
  }

  /**
   * Verifica il numero di trade giornalieri
   */
  checkDailyTradeLimit(): boolean {
    if (this.dailyTrades >= this.maxDailyTrades) {
      console.warn(`RiskManager: Raggiunto il limite giornaliero di ${this.maxDailyTrades} trade`);
      return false;
    }
    return true;
  }

  /**
   * Verifica completa prima di piazzare un ordine
   */
  async canPlaceOrder(marketId: number, size: number): Promise<boolean> {
    // Verifica tutti i limiti
    const checks = await Promise.all([
      this.checkPositionSize(marketId, size),
      this.checkLeverage(),
      this.checkDrawdown(),
      this.checkDailyLoss(),
      this.checkMinAccountValue(),
      this.checkLiquidationRisk(),
    ]);

    // Verifica anche i controlli sincroniza
    const syncChecks = [
      this.checkOrderSize(size),
      this.checkDailyTradeLimit(),
    ];

    const allChecks = [...checks, ...syncChecks];

    if (allChecks.every(check => check)) {
      this.dailyTrades++;
      return true;
    }

    return false;
  }

  /**
   * Reset delle metriche giornaliere
   */
  resetDailyMetrics(): void {
    this.dailyPnl = 0;
    this.dailyTrades = 0;
    console.log('RiskManager: Metriche giornaliere resettate');
  }

  /**
   * Ottiene le statistiche correnti
   */
  async getStats() {
    const accountValue = await this.user.getAccountValue();
    const leverage = await this.user.getLeverage();
    const positions = await this.user.getPositions();

    return {
      accountValue: this.bnToNumber(accountValue),
      leverage,
      dailyPnl: this.dailyPnl,
      dailyTrades: this.dailyTrades,
      openPositions: positions.length,
      startingBalance: this.startingBalance,
    };
  }

  /**
   * Utility: Converte BN in numero
   */
  private bnToNumber(bn: BN): number {
    return bn.toNumber();
  }
}