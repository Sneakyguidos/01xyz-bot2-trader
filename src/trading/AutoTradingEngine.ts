import { Nord, NordUser, Side, FillMode } from '@n1xyz/nord-ts';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export interface AutoTradingConfig {
  app: string;
  webServerUrl: string;
  wallet: Keypair;
  maxPositionSize?: number;
  defaultMarketId?: number;
}

export interface GridConfig {
  marketId: number;
  levels: number;
  spacing: number;
  orderSize: number;
  basePrice: number;
}

export class AutoTradingEngine {
  private nord: Nord | null = null;
  private user: NordUser | null = null;
  private isRunning = false;
  private config: AutoTradingConfig;
  private activeGrids: Map<number, GridConfig> = new Map();

  constructor(config: AutoTradingConfig) {
    this.config = config;
  }

  async initialize(connection: Connection): Promise<void> {
    try {
      // Inizializza Nord
      this.nord = await Nord.new({
        app: this.config.app,
        solanaConnection: connection,
        webServerUrl: this.config.webServerUrl,
      });

      console.log('✅ Nord inizializzato');

      // Crea NordUser dalla private key
      const privateKeyString = bs58.encode(this.config.wallet.secretKey);
      this.user = NordUser.fromPrivateKey(this.nord, privateKeyString);
      
      // Aggiorna account ID e fetch info
      await this.user.updateAccountId();
      await this.user.fetchInfo();
      
      console.log('✅ NordUser creato');
      console.log('💰 Saldi:', this.user.balances);
      console.log('📊 Posizioni:', this.user.positions);

    } catch (error) {
      console.error('❌ Errore durante l\'inizializzazione:', error);
      throw error;
    }
  }

  setupGrid(config: GridConfig): void {
    this.activeGrids.set(config.marketId, config);
    console.log(`📊 Grid configurato per market ${config.marketId}`);
  }

  async executeGrid(marketId: number): Promise<void> {
    const gridConfig = this.activeGrids.get(marketId);
    if (!gridConfig || !this.user) {
      console.warn(`⚠️ Nessun grid configurato per market ${marketId}`);
      return;
    }

    try {
      const levels = this.calculateGridLevels(
        gridConfig.basePrice,
        gridConfig.spacing,
        gridConfig.levels
      );

      // Piazza ordini buy
      const buyLevels = levels.filter(price => price < gridConfig.basePrice);
      for (const price of buyLevels) {
        await this.placeLimitOrder(marketId, Side.Bid, gridConfig.orderSize, price);
        await this.sleep(100);
      }

      // Piazza ordini sell
      const sellLevels = levels.filter(price => price > gridConfig.basePrice);
      for (const price of sellLevels) {
        await this.placeLimitOrder(marketId, Side.Ask, gridConfig.orderSize, price);
        await this.sleep(100);
      }

      console.log(`✅ Grid eseguito: ${levels.length} ordini`);

    } catch (error) {
      console.error(`❌ Errore esecuzione grid:`, error);
    }
  }

  private calculateGridLevels(basePrice: number, spacingPercent: number, levels: number): number[] {
    const prices: number[] = [];
    const halfLevels = Math.floor(levels / 2);

    for (let i = halfLevels; i > 0; i--) {
      prices.push(basePrice * (1 - (spacingPercent / 100) * i));
    }

    for (let i = 1; i <= halfLevels; i++) {
      prices.push(basePrice * (1 + (spacingPercent / 100) * i));
    }

    return prices;
  }

  async placeLimitOrder(
    marketId: number,
    side: Side,
    size: number,
    price: number
  ): Promise<bigint | null> {
    if (!this.user) {
      console.error('❌ User non inizializzato');
      return null;
    }

    try {
      const result = await this.user.placeOrder({
        marketId,
        side,
        fillMode: FillMode.Limit,
        isReduceOnly: false,
        size,
        price,
      });

      console.log(`✅ Ordine limite: ${result.orderId} (${side} ${size} @ ${price})`);
      return result.orderId || result.actionId;

    } catch (error) {
      console.error('❌ Errore piazzamento ordine:', error);
      return null;
    }
  }

  async placeMarketOrder(
    marketId: number,
    side: Side,
    size: number
  ): Promise<bigint | null> {
    if (!this.user) {
      console.error('❌ User non inizializzato');
      return null;
    }

    try {
      const result = await this.user.placeOrder({
        marketId,
        side,
        fillMode: FillMode.Market,
        isReduceOnly: false,
        size,
      });

      console.log(`✅ Ordine market: ${result.actionId}`);
      return result.actionId;

    } catch (error) {
      console.error('❌ Errore piazzamento ordine:', error);
      return null;
    }
  }

  async cancelOrder(orderId: bigint | string): Promise<boolean> {
    if (!this.user) {
      console.error('❌ User non inizializzato');
      return false;
    }

    try {
      await this.user.cancelOrder(orderId);
      console.log(`✅ Ordine cancellato: ${orderId}`);
      return true;

    } catch (error) {
      console.error('❌ Errore cancellazione:', error);
      return false;
    }
  }

  async refreshData(): Promise<void> {
    if (!this.user) return;

    try {
      await this.user.fetchInfo();
      console.log('🔄 Dati aggiornati');
    } catch (error) {
      console.error('❌ Errore aggiornamento dati:', error);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Motore già in esecuzione');
      return;
    }

    if (!this.user) {
      throw new Error('Devi inizializzare il motore prima di avviarlo');
    }

    this.isRunning = true;
    console.log('🚀 AutoTradingEngine avviato');

    this.mainLoop().catch((error) => {
      console.error('❌ Errore nel loop:', error);
      this.isRunning = false;
    });
  }

  private async mainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.refreshData();

        for (const [marketId] of this.activeGrids) {
          console.log(`📊 Monitoraggio market ${marketId}`);
        }

        await this.sleep(10000);

      } catch (error) {
        console.error('❌ Errore nel loop:', error);
        await this.sleep(5000);
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 AutoTradingEngine fermato');
  }

  isEngineRunning(): boolean {
    return this.isRunning;
  }

  getUser(): NordUser | null {
    return this.user;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}