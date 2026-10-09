import { randomUUID } from 'node:crypto';
import { Order, OrderItem } from 'prisma/generated/client';
import { OrderCreatedEvent, OrderUpdatedEvent } from './order-events.publisher';

export const statusCode = (status: Order['status']): string =>
	status.toLowerCase();

export const buildOrderCreatedEvent = (
	order: Order & { items: OrderItem[] }
): OrderCreatedEvent => ({
	eventId: randomUUID(),
	orderId: order.id,
	userId: order.userId,
	status: statusCode(order.status),
	totalAmount: order.totalAmount.toString(),
	totalAmountJpy: order.totalAmountJpy?.toString() ?? null,
	orderDate: order.orderDate.toISOString(),
	intentSource: order.intentSource?.toLowerCase() ?? null,
	items: order.items.map(({ productCode, quantity, unitPrice }) => ({
		productCode,
		quantity,
		unitPrice: unitPrice.toString(),
	})),
});

export const buildOrderUpdatedEvent = (
	order: Order,
	previousStatus: Order['status']
): OrderUpdatedEvent => ({
	eventId: randomUUID(),
	orderId: order.id,
	userId: order.userId,
	status: statusCode(order.status),
	previousStatus: statusCode(previousStatus),
	updatedAt: order.updatedAt.toISOString(),
});
