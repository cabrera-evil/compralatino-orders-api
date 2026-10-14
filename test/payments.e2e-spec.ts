import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { OrdersService } from '@/modules/orders/orders.service';
import { PaymentsController } from '@/modules/payments/payments.controller';
import { PaymentsService } from '@/modules/payments/payments.service';
import { PrismaProvider } from '@/modules/prisma/prisma.service';
import {
	INestApplication,
	ValidationPipe,
	VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from 'prisma/generated/client';
import * as request from 'supertest';

// Real database (DATABASE_URL), stubbed events/serializer. Rows are tagged with a
// sentinel user id and removed afterwards.
const TEST_USER_ID = 2_000_000_001;

describe('Payment webhooks (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaClient;
	const ids: number[] = [];

	const newOrder = async (paymentMethodCode: string) => {
		const { id } = await prisma.order.create({
			data: { userId: TEST_USER_ID, totalAmount: '100.00', paymentMethodCode },
		});
		ids.push(id);
		return id;
	};
	const post = (channel: string, body: object) =>
		request(app.getHttpServer())
			.post(`/v1/webhooks/payments/${channel}`)
			.send(body);
	const stored = (id: number) =>
		prisma.order.findUniqueOrThrow({ where: { id } });

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [PaymentsController],
			providers: [
				PrismaProvider,
				PaymentsService,
				{
					provide: OrdersService,
					useValue: { serialize: (o: { id: number }) => ({ id: o.id }) },
				},
				{
					provide: OrderEventsPublisher,
					useValue: { publishOrderUpdated: jest.fn() },
				},
			],
		}).compile();
		app = moduleRef.createNestApplication();
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
		app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
		await app.init();
		prisma = app.get(PrismaClient);
	});

	afterAll(async () => {
		await prisma.paymentWebhookEvent.deleteMany({
			where: { orderId: { in: ids } },
		});
		await prisma.order.deleteMany({ where: { userId: TEST_USER_ID } });
		await app.close();
		await prisma.$disconnect();
	});

	it.each(['card', 'chivo', 'bank'])(
		'%s: paid confirms the order',
		async (channel) => {
			const orderId = await newOrder(channel);
			await post(channel, {
				eventId: `${channel}-${orderId}`,
				orderId,
				outcome: 'paid',
			}).expect(200);
			const order = await stored(orderId);
			expect(order.status).toBe('CONFIRMED');
			expect(order.paymentStatus).toBe('PAID');
			expect(order.amountReceived?.toString()).toBe('100');
		}
	);

	it('failed fails the order', async () => {
		const orderId = await newOrder('card');
		await post('card', {
			eventId: `f-${orderId}`,
			orderId,
			outcome: 'failed',
		}).expect(200);
		expect(await stored(orderId)).toMatchObject({
			status: 'FAILED',
			paymentStatus: 'FAILED',
		});
	});

	it('underpaid keeps the order pending and records the amount', async () => {
		const orderId = await newOrder('chivo');
		await post('chivo', {
			eventId: `u-${orderId}`,
			orderId,
			outcome: 'underpaid',
			amountReceived: '40.00',
		}).expect(200);
		const order = await stored(orderId);
		expect(order).toMatchObject({
			status: 'PENDING',
			paymentStatus: 'UNDERPAID',
		});
		expect(order.amountReceived?.toString()).toBe('40');
	});

	it('replaying an event id is a no-op', async () => {
		const orderId = await newOrder('bank');
		const body = { eventId: `r-${orderId}`, orderId, outcome: 'paid' };
		await post('bank', body).expect(200);
		const res = await post('bank', body).expect(200);
		expect(res.body.duplicate).toBe(true);
	});

	it('rejects bad input and wrong channel', async () => {
		const orderId = await newOrder('chivo');
		await post('paypal', { eventId: 'x', orderId, outcome: 'paid' }).expect(
			400
		);
		await post('chivo', { eventId: 'x', orderId, outcome: 'bogus' }).expect(
			400
		);
		await post('card', {
			eventId: `m-${orderId}`,
			orderId,
			outcome: 'paid',
		}).expect(409);
		await post('chivo', {
			eventId: 'n',
			orderId: 2_000_000_099,
			outcome: 'paid',
		}).expect(404);
		expect((await stored(orderId)).status).toBe('PENDING');
	});

	it('a settled order cannot be paid twice by a new event', async () => {
		const orderId = await newOrder('chivo');
		await post('chivo', {
			eventId: `p1-${orderId}`,
			orderId,
			outcome: 'paid',
		}).expect(200);
		await post('chivo', {
			eventId: `p2-${orderId}`,
			orderId,
			outcome: 'failed',
		}).expect(409);
	});
});
