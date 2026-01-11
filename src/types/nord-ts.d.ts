declare module '@n1xyz/nord-ts' {
  export interface Market {
    address: string;
    name: string;
    // Aggiungi altre proprietà necessarie
  }

  export class Nord {
    constructor(config: { webServerUrl: string; app: string; solanaUrl: string });

    static initNord(config: { webServerUrl: string; app: string; solanaUrl: string }): Promise<Nord>;
    getOrderbook(marketId: number): Promise<{ bids: any[]; asks: any[] }>;
    getTrades(marketId: number, pageSize: number): Promise<{ trades: any[] }>;
    subscribeOrderbook(marketName: string): { on: (event: string, callback: (data: any) => void) => void };
  }

  export class NordUser {
    constructor(nord: Nord, privateKey: string, connection?: any);

    static fromPrivateKey(nord: Nord, privateKey: string, connection?: any): NordUser;
    updateAccountId(): Promise<void>;
    fetchInfo(): Promise<void>;
    placeOrder(order: { marketId: number; side: 'Bid' | 'Ask'; fillMode: 'Limit'; isReduceOnly: boolean; size: number; price: number }): Promise<string>;
    cancelOrder(orderId: string): Promise<void>;
    withdraw({ tokenId, amount }: { tokenId: number; amount: number }): Promise<void>;
    depositSpl(amount: number, tokenId: number): Promise<string>;

    get balances(): any;
    get positions(): any;
    get orders(): any;
  }

  export enum Side {
    Bid = 'Bid',
    Ask = 'Ask'
  }

  export enum FillMode {
    Limit = 'Limit'
  }
}