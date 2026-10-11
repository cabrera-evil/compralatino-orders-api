import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { OrdersService } from '@/modules/orders/orders.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
	OrderStatus,
	PaymentStatus,
	Prisma,
	PrismaClient,
} from 'prisma/generated/client';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentsService } from './payments.service';

const order = (over: object = {}) => ({
	id: 7,
	userId: 3,
	status: OrderStatus.PENDING,
	paymentStatus: PaymentStatus.AWAITING_PAYMENT,
	paymentMethodCode: 'chivo',
	totalAmount: new Prisma.Decimal('100.00'),
	updatedAt: new Date('2026-01-02T00:00:00Z'),
	...over,
});

const event = (over: Partial<PaymentWebhookDto> = {}): PaymentWebhookDto => ({
	eventId: 'evt_1',
	orderId: 7,
	outcome: 'paid',
	...over,
});

describe('PaymentsService', () => {
	const tx = {
		paymentWebhookEvent: { createMany: jest.fn() },
		order: { findUnique: jest.fn(), updateMany: jest.fn() },
	};
	const prisma = {
		$transaction: jest.fn((run: (t: typeof tx) => unknown) => run(tx)),
		order: { findUnique: jest.fn() },
	};
	const orders = { serialize: jest.fn().mockResolvedValue({ id: 7 }) };
	const events = { publishOrderUpdated: jest.fn() };
	let service: PaymentsService;

	beforeEach(() => {
		jest.clearAllMocks();
		tx.paymentWebhookEvent.createMany.mockResolvedValue({ count: 1 });
		tx.order.findUnique.mockResolvedValue(order());
		tx.order.updateMany.mockResolvedValue({ count: 1 });
		prisma.order.findUnique.mockResolvedValue(order());
		service = new PaymentsService(
			prisma as unknown as PrismaClient,
			orders as unknown as OrdersService,
			events as unknown as OrderEventsPublisher
		);
	});

	const applied = () => tx.order.updateMany.mock.calls[0][0].data;

	it('paid confirms the order and records the full amount', async () => {
		await service.handle('chivo', event());
		expect(applied()).toEqual({
			status: OrderStatus.CONFIRMED,
			paymentStatus: PaymentStatus.PAID,
			amountReceived: new Prisma.Decimal('100.00'),
		});
		expect(events.publishOrderUpdated).toHaveBeenCalledTimes(1);
	});

	it.each(['failed', 'expired'] as const)('%s fails the order', async (o) => {
		tx.order.findUnique.mockResolvedValue(order({ paymentMethodCode: 'card' }));
		await service.handle('card', event({ outcome: o }));
		expect(applied().status).toBe(OrderStatus.FAILED);
		expect(applied().paymentStatus).toBe(o.toUpperCase());
	});

	it.each([
		['underpaid', '40.00', PaymentStatus.UNDERPAID],
		['overpaid', '150.00', PaymentStatus.OVERPAID],
	] as const)(
		'%s keeps the order pending for review',
		async (outcome, amount, paymentStatus) => {
			tx.order.findUnique.mockResolvedValue(
				order({ paymentMethodCode: 'bank' })
			);
			await service.handle('bank', event({ outcome, amountReceived: amount }));
			expect(applied()).toEqual({
				paymentStatus,
				amountReceived: new Prisma.Decimal(amount),
			});
			expect(events.publishOrderUpdated).not.toHaveBeenCalled();
		}
	);

	it('rejects an amount inconsistent with the outcome', async () => {
		await expect(
			service.handle(
				'chivo',
				event({ outcome: 'underpaid', amountReceived: '100.00' })
			)
		).rejects.toThrow('AMOUNT_OUTCOME_MISMATCH');
		await expect(
			service.handle('chivo', event({ outcome: 'overpaid' }))
		).rejects.toThrow('AMOUNT_REQUIRED');
	});

	it('ignores a replayed event id without touching the order', async () => {
		tx.paymentWebhookEvent.createMany.mockResolvedValue({ count: 0 });
		const res = await service.handle('chivo', event());
		expect(res).toEqual({ data: { id: 7 }, duplicate: true });
		expect(tx.order.updateMany).not.toHaveBeenCalled();
	});

	it('rejects an unknown channel and a channel/order mismatch', async () => {
		await expect(service.handle('paypal', event())).rejects.toThrow(
			BadRequestException
		);
		await expect(service.handle('card', event())).rejects.toThrow(
			'PAYMENT_CHANNEL_MISMATCH'
		);
	});

	it('conflicts when the order is no longer pending', async () => {
		tx.order.updateMany.mockResolvedValue({ count: 0 });
		await expect(service.handle('chivo', event())).rejects.toThrow(
			ConflictException
		);
	});

	it('404s for an unknown order', async () => {
		tx.order.findUnique.mockResolvedValue(null);
		await expect(service.handle('chivo', event())).rejects.toThrow(
			'ORDER_NOT_FOUND'
		);
	});
});
