import { buildOrderUpdatedEvent } from '@/modules/events/order-event.builder';
import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { ORDER_INCLUDE, OrdersService } from '@/modules/orders/orders.service';
import { singleResponse } from '@/utils/response.util';
import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	OrderStatus,
	PaymentStatus,
	Prisma,
	PrismaClient,
} from 'prisma/generated/client';
import {
	PAYMENT_CHANNELS,
	PaymentOutcome,
	PaymentWebhookDto,
} from './dto/payment-webhook.dto';

const { Decimal } = Prisma;

@Injectable()
export class PaymentsService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly orders: OrdersService,
		private readonly events: OrderEventsPublisher
	) {}

	/** Applies a simulated provider notification to a PENDING order; idempotent by eventId. */
	async handle(channel: string, dto: PaymentWebhookDto) {
		if (!(PAYMENT_CHANNELS as readonly string[]).includes(channel))
			throw new BadRequestException('INVALID_PAYMENT_CHANNEL');

		const { duplicate, changed } = await this.prisma.$transaction(
			async (tx) => {
				const { count: fresh } = await tx.paymentWebhookEvent.createMany({
					data: [
						{
							eventId: dto.eventId,
							orderId: dto.orderId,
							outcome: dto.outcome,
						},
					],
					skipDuplicates: true,
				});
				if (!fresh) return { duplicate: true, changed: false };

				const order = await tx.order.findUnique({ where: { id: dto.orderId } });
				if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
				if (order.paymentMethodCode !== channel)
					throw new ConflictException('PAYMENT_CHANNEL_MISMATCH');

				const data = this.resolve(dto, order.totalAmount);
				const { count } = await tx.order.updateMany({
					where: { id: order.id, status: OrderStatus.PENDING },
					data,
				});
				if (!count) throw new ConflictException('ORDER_NOT_PENDING');
				return { duplicate: false, changed: Boolean(data.status) };
			}
		);

		const order = await this.prisma.order.findUnique({
			where: { id: dto.orderId },
			include: ORDER_INCLUDE,
		});
		if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
		if (changed)
			this.events.publishOrderUpdated(
				buildOrderUpdatedEvent(order, OrderStatus.PENDING)
			);
		const body = singleResponse(await this.orders.serialize(order));
		return duplicate ? { ...body, duplicate } : body;
	}

	/** Maps an outcome to the order update; only `paid` and terminal failures move OrderStatus. */
	private resolve(
		{ outcome, amountReceived }: PaymentWebhookDto,
		total: Prisma.Decimal
	): Prisma.OrderUpdateManyMutationInput {
		const amount = amountReceived ? new Decimal(amountReceived) : undefined;
		const mismatch = () => new BadRequestException('AMOUNT_OUTCOME_MISMATCH');
		const terminal: Record<
			Extract<PaymentOutcome, 'failed' | 'expired'>,
			PaymentStatus
		> = { failed: PaymentStatus.FAILED, expired: PaymentStatus.EXPIRED };

		switch (outcome) {
			case 'paid':
				if (amount && !amount.eq(total)) throw mismatch();
				return {
					status: OrderStatus.CONFIRMED,
					paymentStatus: PaymentStatus.PAID,
					amountReceived: total,
				};
			case 'failed':
			case 'expired':
				return {
					status: OrderStatus.FAILED,
					paymentStatus: terminal[outcome],
				};
			case 'underpaid':
			case 'overpaid': {
				if (!amount) throw new BadRequestException('AMOUNT_REQUIRED');
				if (outcome === 'underpaid' ? !amount.lt(total) : !amount.gt(total))
					throw mismatch();
				return {
					paymentStatus:
						outcome === 'underpaid'
							? PaymentStatus.UNDERPAID
							: PaymentStatus.OVERPAID,
					amountReceived: amount,
				};
			}
		}
	}
}
