import { Nord, NordUser } from '@n1xyz/nord-ts';
import { AutoTradingEngine } from './AutoTradingEngine.js';
import { OrderManager } from './OrderManager.js';
import { RiskManager, RiskLimits } from './RiskManager.js';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export interface BotConfig {
  app: string;
  webServerUrl: string;
  wallet: Keypair;
  marketId: number;
  riskLimits: RiskLimits;
}

export class AutoTradingBot {
  private nord: Nord | null = null;
  private user: NordUser | null = null;
  private engine: AutoTradingEngine | null = null;
  private orderManager: OrderManager | null = null;
  private riskManager: RiskManager | null = null;
  private isRunning = false;

  constructor(private config: BotConfig) {}

  async initialize(connection: Connection): Promise<void> {
    console.log('🔄 Inizializzazione bot...');

    this.nord = await Nord.new({
      app: this.config.app,
      solanaConnection: connection,
      webServerUrl: this.config.webServerUrl,
    });

    console.log('✅ Nord inizializzato');

    // Crea NordUser dalla private key
    const privateKeyString = bs58.encode(this.config.wallet.secretKey);
    this.user = NordUser.fromPrivateKey(this.nord, privateKeyString);
    
    await this.user.updateAccountId();
    await this.user.fetchInfo();
    
    console.log('✅ NordUser creato');

    this.orderManager = new OrderManager(this.user);
    this.riskManager = new RiskManager(this.user, this.config.riskLimits);
    await this.riskManager.initialize();

    this.engine = new AutoTradingEngine({
      app: this.config.app,
      webServerUrl: this.config.webServerUrl,
      wallet: this.config.wallet,
    });
    await this.engine.initialize(connection);

    console.log('✅ Bot inizializzato con successo');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Bot già in esecuzione');
      return;
    }

    if (!this.engine || !this.orderManager || !this.riskManager) {
      throw new Error('Bot non inizializzato');
    }

    this.isRunning = true;
    console.log('🚀 Bot avviato');

    this.tradingLoop().catch((error) => {
      console.error('❌ Errore nel loop:', error);
      this.isRunning = false;
    });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 Bot fermato');
  }

  private async tradingLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        if (!this.riskManager) continue;

        const canTrade = await this.riskManager.canPlaceOrder(
          this.config.marketId,
          1
        );

        if (!canTrade) {
          console.warn('⚠️ Condizioni di rischio non soddisfatte');
          await this.sleep(10000);
          continue;
        }

        const stats = await this.riskManager.getStats();
        console.log('📊 Stats:', stats);

        await this.sleep(5000);

      } catch (error) {
        console.error('❌ Errore nel loop:', error);
        await this.sleep(5000);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      hasNord: !!this.nord,
      hasUser: !!this.user,
      hasEngine: !!this.engine,
      marketId: this.config.marketId,
    };
  }
}