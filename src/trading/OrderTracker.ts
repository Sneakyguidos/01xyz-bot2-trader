import { NordUser, Order, OrderStatus } from '@n1xyz/nord-ts';

export interface TrackedOrder {
  order: Order;
  timestamp: number;
  lastUpdate: number;
  status: OrderStatus;
}

export class OrderTracker {
  private trackedOrders: Map<string, TrackedOrder> = new Map();

  constructor(private user: NordUser) {}

  /**
   * Aggiunge un ordine al tracking
   */
  trackOrder(order: Order): void {
    const now = Date.now();
    this.trackedOrders.set(order.id, {
      order,
      timestamp: now,
      lastUpdate: now,
      status: order.status,
    });
    console.log(`📝 Tracking ordine: ${order.id}`);
  }

  /**
   * Rimuove un ordine dal tracking
   */
  untrackOrder(orderId: string): void {
    this.trackedOrders.delete(orderId);
    console.log(`🗑️ Rimosso tracking ordine: ${orderId}`);
  }

  /**
   * Aggiorna lo stato di tutti gli ordini tracciati
   */
  async updateAllOrders(marketId?: number): Promise<void> {
    try {
      const openOrders = await this.user.getOpenOrders(marketId);
      const openOrderIds = new Set(openOrders.map(o => o.id));

      // Aggiorna gli ordini ancora aperti
      for (const order of openOrders) {
        const tracked = this.trackedOrders.get(order.id);
        if (tracked) {
          tracked.lastUpdate = Date.now();
          tracked.status = order.status;
          tracked.order = order;
        }
      }

      // Rimuovi gli ordini che non sono più aperti
      for (const [orderId, tracked] of this.trackedOrders) {
        if (!openOrderIds.has(orderId)) {
          if (tracked.status === 'open') {
            console.log(`✅ Ordine ${orderId} completato o cancellato`);
          }
          this.untrackOrder(orderId);
        }
      }

    } catch (error) {
      console.error('❌ Errore nell\'aggiornamento degli ordini:', error);
    }
  }

  /**
   * Ottiene un ordine tracciato
   */
  getTrackedOrder(orderId: string): TrackedOrder | undefined {
    return this.trackedOrders.get(orderId);
  }

  /**
   * Ottiene tutti gli ordini tracciati
   */
  getAllTrackedOrders(): TrackedOrder[] {
    return Array.from(this.trackedOrders.values());
  }

  /**
   * Ottiene il numero di ordini tracciati
   */
  getTrackedOrdersCount(): number {
    return this.trackedOrders.size;
  }

  /**
   * Pulisce gli ordini tracciati più vecchi di un certo tempo
   */
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
      console.log(`🧹 Rimossi ${removedCount} ordini vecchi dal tracking`);
    }
  }

  /**
   * Ottiene statistiche sugli ordini tracciati
   */
  getStats() {
    const orders = this.getAllTrackedOrders();
    const statusCounts: Record<string, number> = {};

    for (const tracked of orders) {
      const status = tracked.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    return {
      total: orders.length,
      byStatus: statusCounts,
      oldestTimestamp: orders.length > 0 
        ? Math.min(...orders.map(o => o.timestamp))
        : null,
    };
  }

  /**
   * Pulisce tutti gli ordini tracciati
   */
  clear(): void {
    this.trackedOrders.clear();
    console.log('🧹 Tutti gli ordini rimossi dal tracking');
  }
}