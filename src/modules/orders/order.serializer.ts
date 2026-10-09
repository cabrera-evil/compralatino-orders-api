import { statusCode } from '@/modules/events/order-event.builder';
import { toDualMoney } from '@/utils/money.util';
import {
	Order,
	OrderItem,
	Prisma,
	TrackingState,
} from 'prisma/generated/client';

export type OrderWithRelations = Order & {
	items: OrderItem[];
	trackingState: TrackingState | null;
};

export type SerializerRefs = {
	statusLabels: Map<string, string>;
	trackingStates: TrackingState[];
};

const trackingView = ({ code, label, description }: TrackingState) => ({
	code,
	label,
	description,
});

export const serializeOrder = (
	order: OrderWithRelations,
	{ statusLabels, trackingStates }: SerializerRefs
) => {
	const status = statusCode(order.status);
	return {
		id: order.id,
		status,
		statusLabel: statusLabels.get(status) ?? status,
		intent: order.intentSource
			? {
					source: order.intentSource.toLowerCase(),
					bidAmount: order.intentBidAmount
						? toDualMoney(order.intentBidAmount, null)
						: null,
				}
			: null,
		orderDate: order.orderDate.toISOString(),
		total: toDualMoney(order.totalAmount, order.totalAmountJpy),
		items: order.items.map((item) => {
			const quantity = new Prisma.Decimal(item.quantity);
			return {
				productCode: item.productCode,
				title: item.title,
				quantity: item.quantity,
				unitPrice: toDualMoney(item.unitPrice, item.unitPriceJpy),
				lineTotal: toDualMoney(
					item.unitPrice.times(quantity),
					item.unitPriceJpy?.times(quantity)
				),
			};
		}),
		delivery: {
			method: order.deliveryMethodCode,
			pickupPoint: order.pickupPointCode,
			destination: order.destination,
		},
		paymentMethod: order.paymentMethodCode,
		contact: order.contactEmail
			? {
					fullName: order.contactFullName,
					phone: order.contactPhone,
					email: order.contactEmail,
				}
			: null,
		tracking: {
			current: order.trackingState ? trackingView(order.trackingState) : null,
			states: trackingStates.map(trackingView),
		},
	};
};
