import {
	INestApplication,
	NotFoundException,
	ValidationPipe,
	VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController (HTTP)', () => {
	let app: INestApplication;
	const service = { handle: jest.fn() };
	const body = { eventId: 'evt-1', orderId: 7, outcome: 'paid' };

	beforeEach(async () => {
		jest.resetAllMocks();
		service.handle.mockResolvedValue({ data: { ok: true } });
		const mod = await Test.createTestingModule({
			controllers: [PaymentsController],
			providers: [{ provide: PaymentsService, useValue: service }],
		}).compile();
		app = mod.createNestApplication();
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
		app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
		await app.init();
	});
	afterEach(() => app.close());

	const post = (b: object, channel = 'card') =>
		request(app.getHttpServer())
			.post(`/v1/webhooks/payments/${channel}`)
			.send(b);

	it('returns 200 (not 201) and passes the channel through', async () => {
		await post(body, 'chivo').expect(200);
		expect(service.handle).toHaveBeenCalledWith('chivo', body);
	});

	it('coerces a numeric amountReceived to a string', async () => {
		await post({ ...body, outcome: 'underpaid', amountReceived: 5 }).expect(
			200
		);
		expect(service.handle.mock.calls[0][1].amountReceived).toBe('5');
	});

	it.each([
		['missing eventId', { ...body, eventId: undefined }],
		['unknown outcome', { ...body, outcome: 'refunded' }],
		['orderId 0', { ...body, orderId: 0 }],
		['orderId beyond int4', { ...body, orderId: 2147483648 }],
		['string orderId', { ...body, orderId: '7' }],
		['zero amountReceived', { ...body, amountReceived: '0' }],
		['3-decimal amountReceived', { ...body, amountReceived: '1.234' }],
	])('400 on %s', async (_n, b) => {
		await post(b).expect(400);
		expect(service.handle).not.toHaveBeenCalled();
	});

	it('surfaces service errors such as an unknown channel', async () => {
		service.handle.mockRejectedValue(new NotFoundException('UNKNOWN_CHANNEL'));
		await post(body, 'paypal').expect(404);
	});
});
