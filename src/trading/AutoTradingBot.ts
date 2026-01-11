import { Nord, NordUser } from '@n1xyz/nord-ts';
import { AutoTradingEngine } from './AutoTradingEngine.js';
import { OrderManager } from './OrderManager.js';
import { RiskManager, RiskLimits } from './RiskManager.js';
import { Connection, Keypair } from '@solana/web3.js';

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

    // Inizializza Nord
    this.nord = await Nord.new({
      app: this.config.app,
      solanaConnection: connection,
      webServerUrl: this.config.webServerUrl,
    });

    // Crea l'utente
    this.user = await this.nord.createUser(this.config.wallet);
    console.log('✅ User creato:', this.user.publicKey.toString());

    // Inizializza i componenti
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
      throw new Error('Bot non inizializzato. Chiama initialize() prima di start()');
    }

    this.isRunning = true;
    console.log('🚀 Bot avviato');

    // Avvia il loop di trading
    this.tradingLoop().catch((error) => {
      console.error('❌ Errore nel loop di trading:', error);
      this.isRunning = false;
    });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.orderManager) {
      // Cancella tutti gli ordini aperti
      await this.orderManager.cancelAllOrders(this.config.marketId);
    }

    console.log('🛑 Bot fermato');
  }

  private async tradingLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Verifica lo stato del rischio
        if (!this.riskManager) continue;

        const canTrade = await this.riskManager.canPlaceOrder(
          this.config.marketId,
          1 // Dimensione test
        );

        if (!canTrade) {
          console.warn('⚠️ Condizioni di rischio non soddisfatte, skip trading');
          await this.sleep(10000); // Aspetta 10 secondi
          continue;
        }

        // Qui implementa la tua logica di trading
        // Ad esempio: analizza il mercato, piazza ordini, ecc.
        
        const stats = await this.riskManager.getStats();
        console.log('📊 Stats:', stats);

        // Aspetta prima del prossimo ciclo
        await this.sleep(5000); // 5 secondi

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
      hasUser: !!this.user,
      hasEngine: !!this.engine,
      marketId: this.config.marketId,
    };
  }
}
