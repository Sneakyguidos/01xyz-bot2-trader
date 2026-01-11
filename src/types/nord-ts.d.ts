declare module '@n1xyz/nord-ts' {
  import { Connection, PublicKey, Keypair } from '@solana/web3.js';
  import BN from 'bn.js';

  // ============================================================================
  // CONFIGURAZIONE PRINCIPALE
  // ============================================================================

  export interface NordConfig {
    app: string;
    solanaConnection: Connection;
    webServerUrl: string;
  }

  // ============================================================================
  // CLASSE NORD - Entry Point principale
  // ============================================================================

  export class Nord {
    /**
     * Crea una nuova istanza di Nord
     * @param config Configurazione per l'inizializzazione
     */
    static new(config: NordConfig): Promise<Nord>;

    /**
     * Ottiene tutti i mercati disponibili
     */
    getMarkets(): Promise<Market[]>;

    /**
     * Ottiene un mercato specifico per ID
     * @param marketId ID del mercato
     */
    getMarket(marketId: number): Promise<Market | null>;

    /**
     * Crea un nuovo utente (NordUser) per il trading
     * @param wallet Keypair del wallet Solana
     */
    createUser(wallet: Keypair): Promise<NordUser>;

    /**
     * Recupera un utente esistente
     * @param userKey Public key dell'utente
     */
    getUser(userKey: PublicKey): Promise<NordUser | null>;
  }

  // ============================================================================
  // INTERFACCIA MARKET
  // ============================================================================

  export interface Market {
    id: number;
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    baseLotSize: BN;
    quoteLotSize: BN;
    minOrderSize: BN;
    tickSize: BN;
    takerFee: BN;
    makerFee: BN;
  }

  // ============================================================================
  // CLASSE NORDUSER - Gestione Trading
  // ============================================================================

  export class NordUser {
    /**
     * Public key dell'utente
     */
    publicKey: PublicKey;

    // ------------------------------------------------------------------------
    // METODI DI TRADING
    // ------------------------------------------------------------------------

    /**
     * Piazza un ordine
     * @param params Parametri dell'ordine
     * @returns ID dell'ordine piazzato
     */
    placeOrder(params: PlaceOrderParams): Promise<string>;

    /**
     * Cancella un ordine
     * @param marketId ID del mercato
     * @param orderId ID dell'ordine da cancellare
     */
    cancelOrder(marketId: number, orderId: string): Promise<void>;

    /**
     * Cancella tutti gli ordini aperti
     * @param marketId ID del mercato (opzionale, se non specificato cancella su tutti i mercati)
     */
    cancelAllOrders(marketId?: number): Promise<void>;

    /**
     * Ottiene gli ordini aperti
     * @param marketId ID del mercato (opzionale)
     */
    getOpenOrders(marketId?: number): Promise<Order[]>;

    /**
     * Ottiene lo storico degli ordini
     * @param marketId ID del mercato (opzionale)
     */
    getOrderHistory(marketId?: number): Promise<Order[]>;

    // ------------------------------------------------------------------------
    // GESTIONE DEPOSITI E PRELIEVI
    // ------------------------------------------------------------------------

    /**
     * Deposita fondi
     * @param tokenId ID del token
     * @param amount Ammontare da depositare
     */
    deposit(tokenId: number, amount: BN | number): Promise<void>;

    /**
     * Preleva fondi
     * @param tokenId ID del token
     * @param amount Ammontare da prelevare
     */
    withdraw(tokenId: number, amount: BN | number): Promise<void>;

    // ------------------------------------------------------------------------
    // INFORMAZIONI ACCOUNT
    // ------------------------------------------------------------------------

    /**
     * Ottiene il saldo per un token specifico
     * @param tokenId ID del token
     */
    getBalance(tokenId: number): Promise<BN>;

    /**
     * Ottiene tutti i saldi
     */
    getBalances(): Promise<Balance[]>;

    /**
     * Ottiene una posizione specifica
     * @param marketId ID del mercato
     */
    getPosition(marketId: number): Promise<Position | null>;

    /**
     * Ottiene tutte le posizioni
     */
    getPositions(): Promise<Position[]>;

    /**
     * Ottiene il valore totale dell'account
     */
    getAccountValue(): Promise<BN>;

    /**
     * Ottiene il margine disponibile
     */
    getAvailableMargin(): Promise<BN>;

    /**
     * Verifica se l'account è in stato di liquidazione
     */
    isLiquidatable(): Promise<boolean>;

    /**
     * Ottiene il leverage corrente dell'account
     */
    getLeverage(): Promise<number>;
  }

  // ============================================================================
  // PARAMETRI ORDINE
  // ============================================================================

  export interface PlaceOrderParams {
    marketId: number;
    side: OrderSide;
    orderType: OrderType;
    size: number | BN;
    price?: number | BN; // Richiesto per ordini limit
    reduceOnly?: boolean;
    clientId?: string;
    postOnly?: boolean; // Per ordini maker-only
    ioc?: boolean; // Immediate-or-Cancel
    fok?: boolean; // Fill-or-Kill
  }

  // ============================================================================
  // INTERFACCIA ORDER
  // ============================================================================

  export interface Order {
    id: string;
    marketId: number;
    userId: string;
    side: OrderSide;
    orderType: OrderType;
    size: BN;
    price?: BN;
    filledSize: BN;
    averagePrice?: BN;
    status: OrderStatus;
    timestamp: number;
    clientId?: string;
    reduceOnly: boolean;
  }

  // ============================================================================
  // INTERFACCIA BALANCE
  // ============================================================================

  export interface Balance {
    tokenId: number;
    symbol: string;
    amount: BN;
    availableAmount: BN;
    lockedAmount: BN;
  }

  // ============================================================================
  // INTERFACCIA POSITION
  // ============================================================================

  export interface Position {
    marketId: number;
    symbol: string;
    size: BN;
    entryPrice: BN;
    markPrice: BN;
    unrealizedPnl: BN;
    realizedPnl: BN;
    leverage: number;
    liquidationPrice?: BN;
    marginUsed: BN;
  }

  // ============================================================================
  // TIPI ED ENUM
  // ============================================================================

  /**
   * Lato dell'ordine (Buy o Sell)
   */
  export type OrderSide = 'buy' | 'sell';

  /**
   * Tipo di ordine
   */
  export type OrderType = 
    | 'limit'      // Ordine limite
    | 'market'     // Ordine a mercato
    | 'postOnly'   // Maker-only (solo se aggiungi liquidità)
    | 'ioc'        // Immediate-or-Cancel
    | 'fok';       // Fill-or-Kill

  /**
   * Stato dell'ordine
   */
  export type OrderStatus = 
    | 'open'       // Ordine aperto
    | 'filled'     // Ordine eseguito completamente
    | 'partially_filled' // Ordine parzialmente eseguito
    | 'cancelled'  // Ordine cancellato
    | 'rejected'   // Ordine rifiutato
    | 'expired';   // Ordine scaduto

  /**
   * ID dei token comunemente usati
   */
  export enum TokenId {
    USDC = 0,
    SOL = 1,
    // Aggiungi altri token secondo necessità
  }

  // ============================================================================
  // UTILITÀ ED HELPER
  // ============================================================================

  /**
   * Converte un numero decimale in BN con la precisione corretta
   * @param amount Ammontare decimale
   * @param decimals Numero di decimali
   */
  export function toBN(amount: number, decimals: number): BN;

  /**
   * Converte un BN in numero decimale
   * @param bn BigNumber da convertire
   * @param decimals Numero di decimali
   */
  export function fromBN(bn: BN, decimals: number): number;
}