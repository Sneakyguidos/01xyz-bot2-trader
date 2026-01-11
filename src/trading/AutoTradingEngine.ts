// ============================================================================
// FILE: src/trading/AutoTradingEngine.ts
// ============================================================================

import { Nord, NordUser, OrderSide, OrderType, PlaceOrderParams } from '@n1xyz/nord-ts';
import { Connection, Keypair } from '@solana/web3.js';
import BN from 'bn.js';

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
  spacing: number; // Percentuale
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

  /**
   * Inizializza il motore di trading
   */
  async initialize(connection: Connection): Promise<void> {
    try {
      // Inizializza Nord
      this.nord = await Nord.new({
        app: this.config.app,
        solanaConnection: connection,
        webServerUrl: this.config.webServerUrl,
      });

      console.log('✅ Nord inizializzato con successo');

      // Crea o recupera l'utente
      this.user = await this.nord.createUser(this.config.wallet);
      console.log('✅ NordUser creato:', this.user.publicKey.toString());

      // Verifica i saldi
      const balances = await this.user.getBalances();
      console.log('💰 Saldi disponibili:', balances.map(b => ({
        symbol: b.symbol,
        amount: b.amount.toString(),
      })));

    } catch (error) {
      console.error('❌ Errore durante l\'inizializzazione:', error);
      throw error;
    }
  }

  /**
   * Configura una strategia grid trading
   */
  setupGrid(config: GridConfig): void {
    this.activeGrids.set(config.marketId, config);
    console.log(`📊 Grid configurato per market ${config.marketId}:`, config);
  }

  /**
   * Rimuove una strategia grid
   */
  removeGrid(marketId: number): void {
    this.activeGrids.delete(marketId);
    console.log(`🗑️ Grid rimosso per market ${marketId}`);
  }

  /**
   * Esegue la strategia grid per un mercato
   */
  async executeGrid(marketId: number): Promise<void> {
    const gridConfig = this.activeGrids.get(marketId);
    if (!gridConfig || !this.user) {
      console.warn(`⚠️ Nessun grid configurato per market ${marketId}`);
      return;
    }

    try {
      // Cancella gli ordini esistenti
      await this.user.cancelAllOrders(marketId);

      // Calcola i prezzi dei livelli
      const levels = this.calculateGridLevels(
        gridConfig.basePrice,
        gridConfig.spacing,
        gridConfig.levels
      );

      // Piazza ordini buy sotto il prezzo base
      const buyLevels = levels.filter(price => price < gridConfig.basePrice);
      for (const price of buyLevels) {
        await this.placeOrder(
          marketId,
          'buy',
          'limit',
          gridConfig.orderSize,
          price
        );
        await this.sleep(100); // Piccolo delay tra ordini
      }

      // Piazza ordini sell sopra il prezzo base
      const sellLevels = levels.filter(price => price > gridConfig.basePrice);
      for (const price of sellLevels) {
        await this.placeOrder(
          marketId,
          'sell',
          'limit',
          gridConfig.orderSize,
          price
        );
        await this.sleep(100);
      }

      console.log(`✅ Grid eseguito per market ${marketId}: ${levels.length} ordini piazzati`);

    } catch (error) {
      console.error(`❌ Errore nell'esecuzione del grid per market ${marketId}:`, error);
    }
  }

  /**
   * Calcola i livelli di prezzo per la grid
   */
  private calculateGridLevels(
    basePrice: number,
    spacingPercent: number,
    levels: number
  ): number[] {
    const prices: number[] = [];
    const halfLevels = Math.floor(levels / 2);

    // Livelli sotto il prezzo base
    for (let i = halfLevels; i > 0; i--) {
      const price = basePrice * (1 - (spacingPercent / 100) * i);
      prices.push(price);
    }

    // Livelli sopra il prezzo base
    for (let i = 1; i <= halfLevels; i++) {
      const price = basePrice * (1 + (spacingPercent / 100) * i);
      prices.push(price);
    }

    return prices;
  }

  /**
   * Piazza un ordine
   */
  async placeOrder(
    marketId: number,
    side: OrderSide,
    orderType: OrderType,
    size: number,
    price?: number
  ): Promise<string | null> {
    if (!this.user) {
      console.error('❌ User non inizializzato');
      return null;
    }

    try {
      const params: PlaceOrderParams = {
        marketId,
        side,
        orderType,
        size,
        price,
      };

      const orderId = await this.user.placeOrder(params);
      console.log(`✅ Ordine piazzato: ${orderId} (${side} ${size} @ ${price || 'market'})`);
      return orderId;

    } catch (error) {
      console.error('❌ Errore nel piazzare l\'ordine:', error);
      return null;
    }
  }

  /**
   * Piazza un ordine limite
   */
  async placeLimitOrder(
    marketId: number,
    side: OrderSide,
    size: number,
    price: number
  ): Promise<string | null> {
    return this.placeOrder(marketId, side, 'limit', size, price);
  }

  /**
   * Piazza un ordine a mercato
   */
  async placeMarketOrder(
    marketId: number,
    side: OrderSide,
    size: number
  ): Promise<string | null> {
    return this.placeOrder(marketId, side, 'market', size);
  }

  /**
   * Cancella un ordine
   */
  async cancelOrder(marketId: number, orderId: string): Promise<boolean> {
    if (!this.user) {
      console.error('❌ User non inizializzato');
      return false;
    }

    try {
      await this.user.cancelOrder(marketId, orderId);
      console.log(`✅ Ordine cancellato: ${orderId}`);
      return true;

    } catch (error) {
      console.error('❌ Errore nella cancellazione:', error);
      return false;
    }
  }

  /**
   * Cancella tutti gli ordini aperti
   */
  async cancelAllOrders(marketId?: number): Promise<boolean> {
    if (!this.user) {
      console.error('❌ User non inizializzato');
      return false;
    }

    try {
      await this.user.cancelAllOrders(marketId);
      console.log('✅ Tutti gli ordini cancellati');
      return true;

    } catch (error) {
      console.error('❌ Errore nella cancellazione di tutti gli ordini:', error);
      return false;
    }
  }

  /**
   * Ottiene gli ordini aperti
   */
  async getOpenOrders(marketId?: number) {
    if (!this.user) return [];
    
    try {
      return await this.user.getOpenOrders(marketId);
    } catch (error) {
      console.error('❌ Errore nel recuperare gli ordini aperti:', error);
      return [];
    }
  }

  /**
   * Ottiene le posizioni correnti
   */
  async getPositions() {
    if (!this.user) return [];
    
    try {
      return await this.user.getPositions();
    } catch (error) {
      console.error('❌ Errore nel recuperare le posizioni:', error);
      return [];
    }
  }

  /**
   * Ottiene il valore totale dell'account
   */
  async getAccountValue(): Promise<number> {
    if (!this.user) return 0;
    
    try {
      const value = await this.user.getAccountValue();
      return value.toNumber();
    } catch (error) {
      console.error('❌ Errore nel recuperare il valore dell\'account:', error);
      return 0;
    }
  }

  /**
   * Monitora e ribilancia le grid attive
   */
  private async monitorGrids(): Promise<void> {
    for (const [marketId, gridConfig] of this.activeGrids) {
      try {
        const openOrders = await this.getOpenOrders(marketId);
        
        // Se ci sono meno ordini del previsto, riesegui la grid
        const expectedOrders = gridConfig.levels;
        if (openOrders.length < expectedOrders * 0.5) {
          console.log(`🔄 Ribilanciamento grid per market ${marketId}`);
          await this.executeGrid(marketId);
        }

      } catch (error) {
        console.error(`❌ Errore nel monitoraggio grid per market ${marketId}:`, error);
      }
    }
  }

  /**
   * Avvia il motore di trading
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Il motore è già in esecuzione');
      return;
    }

    if (!this.user) {
      throw new Error('Devi inizializzare il motore prima di avviarlo');
    }

    this.isRunning = true;
    console.log('🚀 AutoTradingEngine avviato');

    // Loop principale
    this.mainLoop().catch((error) => {
      console.error('❌ Errore nel loop principale:', error);
      this.isRunning = false;
    });
  }

  /**
   * Loop principale del motore
   */
  private async mainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Monitora e ribilancia le grid
        await this.monitorGrids();

        // Mostra statistiche
        const stats = await this.getStats();
        console.log('📊 Stats:', stats);

        // Aspetta prima del prossimo ciclo
        await this.sleep(10000); // 10 secondi

      } catch (error) {
        console.error('❌ Errore nel loop principale:', error);
        await this.sleep(5000);
      }
    }
  }

  /**
   * Ottiene le statistiche correnti
   */
  async getStats() {
    if (!this.user) {
      return {
        accountValue: 0,
        openOrders: 0,
        activePositions: 0,
        activeGrids: 0,
      };
    }

    const [accountValue, positions, allOrders] = await Promise.all([
      this.getAccountValue(),
      this.getPositions(),
      this.getOpenOrders(),
    ]);

    return {
      accountValue,
      openOrders: allOrders.length,
      activePositions: positions.length,
      activeGrids: this.activeGrids.size,
    };
  }

  /**
   * Ferma il motore di trading
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Opzionalmente cancella tutti gli ordini aperti
    if (this.user) {
      console.log('🧹 Cancellazione ordini aperti...');
      await this.cancelAllOrders();
    }

    console.log('🛑 AutoTradingEngine fermato');
  }

  /**
   * Verifica se il motore è in esecuzione
   */
  isEngineRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Ottiene l'istanza NordUser
   */
  getUser(): NordUser | null {
    return this.user;
  }

  /**
   * Helper per dormire
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}