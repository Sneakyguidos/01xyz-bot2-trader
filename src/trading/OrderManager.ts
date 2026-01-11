import { NordUser, Order, OrderSide, OrderType, PlaceOrderParams } from '@n1xyz/nord-ts';
import BN from 'bn.js';

export interface OrderOptions {
  reduceOnly?: boolean;
  clientId?: string;
  postOnly?: boolean;
  ioc?: boolean;
  fok?: boolean;
}

export class OrderManager {
  constructor(private user: NordUser) {}

  /**
   * Piazza un ordine con opzioni avanzate
   */
  async placeOrder(
    marketId: number,
    side: OrderSide,
    orderType: OrderType,
    size: number | BN,
    price?: number | BN,
    options?: OrderOptions
  ): Promise<string | null> {
    try {
      const params: PlaceOrderParams = {
        marketId,
        side,
        orderType,
        size,
        price,
        ...options,
      };

      const orderId = await this.user.placeOrder(params);
      console.log(`OrderManager: Ordine piazzato ${orderId}`);
      return orderId;

    } catch (error) {
      console.error('OrderManager: Errore nel piazzare l\'ordine', error);
      return null;
    }
  }

  /**
   * Piazza un ordine limite
   */
  async placeLimitOrder(
    marketId: number,
    side: OrderSide,
    size: number | BN,
    price: number | BN,
    options?: OrderOptions
  ): Promise<string | null> {
    return this.placeOrder(marketId, side, 'limit', size, price, options);
  }

  /**
   * Piazza un ordine a mercato
   */
  async placeMarketOrder(
    marketId: number,
    side: OrderSide,
    size: number | BN,
    options?: OrderOptions
  ): Promise<string | null> {
    return this.placeOrder(marketId, side, 'market', size, undefined, options);
  }

  /**
   * Piazza un ordine post-only (maker only)
   */
  async placePostOnlyOrder(
    marketId: number,
    side: OrderSide,
    size: number | BN,
    price: number | BN,
    options?: OrderOptions
  ): Promise<string | null> {
    return this.placeOrder(marketId, side, 'postOnly', size, price, {
      ...options,
      postOnly: true,
    });
  }

  /**
   * Cancella un ordine specifico
   */
  async cancelOrder(marketId: number, orderId: string): Promise<boolean> {
    try {
      await this.user.cancelOrder(marketId, orderId);
      console.log(`OrderManager: Ordine ${orderId} cancellato`);
      return true;

    } catch (error) {
      console.error('OrderManager: Errore nella cancellazione', error);
      return false;
    }
  }

  /**
   * Ottiene gli ordini aperti
   */
  async getOpenOrders(marketId?: number): Promise<Order[]> {
    try {
      return await this.user.getOpenOrders(marketId);
    } catch (error) {
      console.error('OrderManager: Errore nel recuperare gli ordini aperti', error);
      return [];
    }
  }

  /**
   * Ottiene lo storico degli ordini
   */
  async getOrderHistory(marketId?: number): Promise<Order[]> {
    try {
      return await this.user.getOrderHistory(marketId);
    } catch (error) {
      console.error('OrderManager: Errore nel recuperare lo storico', error);
      return [];
    }
  }

  /**
   * Cancella tutti gli ordini aperti
   */
  async cancelAllOrders(marketId?: number): Promise<number> {
    try {
      const openOrders = await this.getOpenOrders(marketId);
      let cancelledCount = 0;

      for (const order of openOrders) {
        const success = await this.cancelOrder(order.marketId, order.id);
        if (success) cancelledCount++;
      }

      console.log(`OrderManager: ${cancelledCount}/${openOrders.length} ordini cancellati`);
      return cancelledCount;

    } catch (error) {
      console.error('OrderManager: Errore nella cancellazione di tutti gli ordini', error);
      return 0;
    }
  }

  /**
   * Modifica un ordine (cancella e ricrea)
   */
  async modifyOrder(
    marketId: number,
    orderId: string,
    newSize: number | BN,
    newPrice: number | BN,
    side: OrderSide
  ): Promise<string | null> {
    try {
      // Cancella l'ordine esistente
      await this.cancelOrder(marketId, orderId);

      // Piazza un nuovo ordine
      return await this.placeLimitOrder(marketId, side, newSize, newPrice);

    } catch (error) {
      console.error('OrderManager: Errore nella modifica dell\'ordine', error);
      return null;
    }
  }
}