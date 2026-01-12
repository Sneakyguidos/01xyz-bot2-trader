import { NordUser, Side, FillMode } from '@n1xyz/nord-ts';

export class OrderManager {
  constructor(private user: NordUser) {}

  async placeLimitOrder(
    marketId: number,
    side: Side,
    size: number,
    price: number,
    isReduceOnly: boolean = false
  ): Promise<bigint | null> {
    try {
      const result = await this.user.placeOrder({
        marketId,
        side,
        fillMode: FillMode.Limit,
        isReduceOnly,
        size,
        price,
      });

      console.log(`OrderManager: Ordine limite ${result.orderId}`);
      return result.orderId || result.actionId;

    } catch (error) {
      console.error('OrderManager: Errore', error);
      return null;
    }
  }

  async placeMarketOrder(
    marketId: number,
    side: Side,
    size: number,
    isReduceOnly: boolean = false
  ): Promise<bigint | null> {
    try {
      const result = await this.user.placeOrder({
        marketId,
        side,
        fillMode: FillMode.Market,
        isReduceOnly,
        size,
      });

      console.log(`OrderManager: Ordine market ${result.actionId}`);
      return result.actionId;

    } catch (error) {
      console.error('OrderManager: Errore', error);
      return null;
    }
  }

  async cancelOrder(orderId: bigint | string): Promise<boolean> {
    try {
      await this.user.cancelOrder(orderId);
      console.log(`OrderManager: Ordine ${orderId} cancellato`);
      return true;

    } catch (error) {
      console.error('OrderManager: Errore cancellazione', error);
      return false;
    }
  }

  async cancelAllOrders(): Promise<number> {
    try {
      await this.user.fetchInfo();
      const orders = Object.keys(this.user.orders);
      let cancelledCount = 0;

      for (const orderId of orders) {
        const success = await this.cancelOrder(BigInt(orderId));
        if (success) cancelledCount++;
      }

      console.log(`OrderManager: ${cancelledCount}/${orders.length} ordini cancellati`);
      return cancelledCount;

    } catch (error) {
      console.error('OrderManager: Errore cancellazione tutti gli ordini', error);
      return 0;
    }
  }

  async refreshOrders(): Promise<void> {
    try {
      await this.user.fetchInfo();
      console.log('OrderManager: Ordini aggiornati');
    } catch (error) {
      console.error('OrderManager: Errore aggiornamento', error);
    }
  }
}