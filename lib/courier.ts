import type { Courier, ShipmentStatus } from './types';

export const SHIPMENT_FLOW: ShipmentStatus[] =
  ['label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];

export const SHIPMENT_LABEL: Record<ShipmentStatus, string> = {
  label_created: 'Label created', picked_up: 'Picked up', in_transit: 'In transit',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered',
  returned: 'Returned', failed: 'Failed'
};

/** Build a public tracking URL from the courier's template. */
export function trackUrl(courier: Courier | undefined, tracking: string | null): string | null {
  if (!courier?.track_url_template || !tracking) return null;
  return courier.track_url_template.replace('{tracking}', encodeURIComponent(tracking));
}

/**
 * Provider abstraction. Today everything is 'manual' (staff key in the tracking
 * number from the courier's own portal). To automate later, implement create()
 * /sync() per courier code against their API and call it from the shipment action.
 * Network calls to courier APIs aren't possible from the build sandbox, so these
 * adapters are intentionally left as integration points.
 */
export interface CourierAdapter {
  code: string;
  createShipment?(input: { orderId: string; address: Record<string, unknown>; cod?: number }): Promise<{ tracking: string }>;
  sync?(tracking: string): Promise<{ status: ShipmentStatus }>;
}
export const adapters: Record<string, CourierAdapter> = {
  // koombiyo: { code: 'koombiyo', async createShipment(i){ /* call API with KEY */ } },
};
