/**
 * Transport for the print-order lane (`/lulu/orders*`) — contract-bound, like
 * everything else in this folder. The flow is Arman's ruled money model:
 * the server captures the live quote + the buyer's plan markup and answers
 * with a REAL Stripe Checkout URL; payment fulfils the order server-side
 * (place at Lulu), and a rejection auto-refunds. This file only moves the
 * typed shapes — no pricing math, no status invention.
 */

import type { components } from "@ai-matrx/api/types";
import { cancelOrder as cancelOrderOp, createOrder as createOrderOp, listOrders as listOrdersOp } from "@ai-matrx/api/publish";
import { serverApi, NO_ERROR_CAPTURE_HEADER } from "@/lib/api/server-api";

export type PrintOrder = components["schemas"]["PrintOrderPublic"];
export type PrintOrderCheckout = components["schemas"]["PrintOrderCheckout"];
export type PrintOrderCreate = components["schemas"]["PrintOrderCreateRequest"];

export async function createOrder(
  body: PrintOrderCreate,
  signal?: AbortSignal,
): Promise<PrintOrderCheckout> {
  const data = await createOrderOp(serverApi, { body: body }, { signal: signal, headers: { [NO_ERROR_CAPTURE_HEADER]: "off" } });
  return data;
}

export async function listOrders(signal?: AbortSignal): Promise<PrintOrder[]> {
  const data = await listOrdersOp(serverApi, {}, { signal: signal, headers: { [NO_ERROR_CAPTURE_HEADER]: "off" } });
  return data;
}

export async function cancelOrder(orderId: string): Promise<PrintOrder> {
  const data = await cancelOrderOp(serverApi, { path: { order_id: orderId } }, { headers: { [NO_ERROR_CAPTURE_HEADER]: "off" } });
  return data;
}

/** Orders a buyer can still back out of (refund + stop production). */
export function isCancelable(order: PrintOrder): boolean {
  return ["pending_payment", "paid", "placed"].includes(order.status);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  payment_expired: "Payment expired",
  paid: "Paid",
  placing: "Placing",
  placed: "Placed",
  in_production: "Printing",
  shipped: "Shipped",
  delivered: "Delivered",
  rejected: "Rejected",
  refund_due: "Refund on the way",
  refunded: "Refunded",
  canceled: "Canceled",
  fulfillment_failed: "Needs attention",
};
