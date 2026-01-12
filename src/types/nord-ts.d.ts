declare module '@n1xyz/nord-ts' {
  import { Connection, PublicKey, Keypair } from '@solana/web3.js';

  // ============================================================================
  // ENUMS E TIPI
  // ============================================================================

  export enum Side {
    Bid = 'Bid',   // Buy
    Ask = 'Ask',   // Sell
  }

  export enum FillMode {
    Limit = 'Limit',
    Market = 'Market',
  }

  export enum TriggerKind {
    StopLoss = 'StopLoss',
    TakeProfit = 'TakeProfit',
  }

  // ============================================================================
  // INTERFACCE
  // ============================================================================

  export interface NordConfig {
    app: string;
    solanaConnection: Connection;
    webServerUrl: string;
    wallet?: Keypair;
  }

  export interface PlaceOrderParams {
    marketId: number;
    side: Side;
    fillMode: FillMode;
    isReduceOnly: boolean;
    size: number;
    price?: number;
    accountId?: number;
    clientOrderId?: bigint;
  }

  export interface PlaceOrderResponse {
    actionId: bigint;
    orderId?: bigint;
    fills?: any[];
  }

  export interface CancelResult {
    actionId: bigint;
    orderId: bigint;
    accountId: number;
  }

  export interface DepositConfig {
    amount: number;
    tokenId: number;
    recipient?: PublicKey;
  }

  export interface WithdrawConfig {
    amount: number;
    tokenId: number;
    destPubkey?: string;
  }

  export interface TriggerConfig {
    marketId: number;
    side: Side;
    kind: TriggerKind;
    triggerPrice: number;
    limitPrice?: number;
  }

  export interface Balance {
    tokenId: number;
    amount: number;
  }

  export interface Position {
    size: number;
    price: number;
    marketId: number;
  }

  export interface Order {
    orderId: bigint;
    marketId: number;
    side: Side;
    size: number;
    price?: number;
  }

  // ============================================================================
  // CLASSE NORD
  // ============================================================================

  export class Nord {
    static new(config: NordConfig): Promise<Nord>;
    
    getInfo(): Promise<any>;
    getAccount(): Promise<any>;
    getAccountOrders(): Promise<any>;
    getOrderbook(marketId: number): Promise<any>;
    getTrades(marketId: number): Promise<any>;
  }

  // ============================================================================
  // CLASSE NORDUSER - Per Trading
  // ============================================================================

  export class NordUser {
    balances: Record<number, Balance>;
    positions: Record<number, Position>;
    orders: Record<string, Order>;

    /**
     * Crea un NordUser da una private key
     */
    static fromPrivateKey(nord: Nord, privateKey: string | Uint8Array): NordUser;

    /**
     * Aggiorna l'account ID
     */
    updateAccountId(): Promise<void>;

    // Trading
    placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResponse>;
    cancelOrder(orderId: bigint | string, accountId?: number): Promise<CancelResult>;
    atomic(actions: any[], accountId?: number): Promise<any>;

    // Triggers
    addTrigger(config: TriggerConfig): Promise<any>;
    removeTrigger(config: Omit<TriggerConfig, 'triggerPrice' | 'limitPrice'>): Promise<any>;

    // Fund Management
    deposit(config: DepositConfig): Promise<{ signature: string }>;
    withdraw(config: WithdrawConfig): Promise<{ actionId: bigint }>;

    // Information
    fetchInfo(): Promise<void>;
    getSolanaBalances(options?: { includeZeroBalances?: boolean }): Promise<any>;
  }
}