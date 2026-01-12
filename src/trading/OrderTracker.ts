import { NordUser, Order } from '@n1xyz/nord-ts';

export interface TrackedOrder {
  order: Order;
  timestamp: number;
  lastUpdate: number;
}

export class OrderTracker {
  private trackedOrders: Map<string, TrackedOrder> = new Map();

  constructor(private user: NordUser) {}

  trackOrder(order: Order): void {
    const now = Date.now();
    const orderId = order.orderId.toString();
    
    this.trackedOrders.set(orderId, {
      order,
      timestamp: now,
      lastUpdate: now,
    });
    
    console.log(`📝 Tracking ordine: ${orderId}`);
  }

  untrackOrder(orderId: string): void {
    this.trackedOrders.delete(orderId);
    console.log(`🗑️ Rimosso tracking ordine: ${orderId}`);
  }

  async updateAllOrders(): Promise<void> {
    try {
      await this.user.fetchInfo();
      
      const currentOrders = this.user.orders;
      const currentOrderIds = new Set(
        Object.keys(currentOrders).map(id => id.toString())
      );

      for (const [orderId, orderData] of Object.entries(currentOrders)) {
        const tracked = this.trackedOrders.get(orderId.toString());
        if (tracked) {
          tracked.lastUpdate = Date.now();
          tracked.order = orderData as Order;
        }
      }

      for (const [orderId] of this.trackedOrders) {
        if (!currentOrderIds.has(orderId)) {
          console.log(`✅ Ordine ${orderId} completato o cancellato`);
          this.untrackOrder(orderId);
        }
      }

    } catch (error) {
      console.error('❌ Errore aggiornamento ordini:', error);
    }
  }

  getTrackedOrder(orderId: string): TrackedOrder | undefined {
    return this.trackedOrders.get(orderId);
  }

  getAllTrackedOrders(): TrackedOrder[] {
    return Array.from(this.trackedOrders.values());
  }

  getTrackedOrdersCount(): number {
    return this.trackedOrders.size;
  }

  cleanOldOrders(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [orderId, tracked] of this.trackedOrders) {
      if (now - tracked.lastUpdate > maxAgeMs) {
        this.untrackOrder(orderId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Rimossi ${removedCount} ordini vecchi`);
    }
  }

  getStats() {
    const orders = this.getAllTrackedOrders();

    return {
      total: orders.length,
      oldestTimestamp: orders.length > 0 
        ? Math.min(...orders.map(o => o.timestamp))
        : null,
    };
  }

  clear(): void {
    this.trackedOrders.clear();
    console.log('🧹 Tutti gli ordini rimossi dal tracking');
  }
}