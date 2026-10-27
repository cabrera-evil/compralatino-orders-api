import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import {
	ExecutionContext,
	INestApplication,
	NotFoundException,
	ValidationPipe,
	VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController (HTTP)', () => {
	let app: INestApplication;
	const service = { findAll: jest.fn(), findOne: jest.fn(), cancel: jest.fn() };

	beforeEach(async () => {
		jest.resetAllMocks();
		service.findAll.mockResolvedValue({ data: [] });
		service.findOne.mockResolvedValue({ data: { id: 7 } });
		service.cancel.mockResolvedValue({ data: { id: 7 } });
		const mod = await Test.createTestingModule({
			controllers: [OrdersController],
			providers: [{ provide: OrdersService, useValue: service }],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({
				canActivate: (ctx: ExecutionContext) => {
					ctx.switchToHttp().getRequest().user = { id: 3 };
					return true;
				},
			})
			.compile();
		app = mod.createNestApplication();
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
		app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
		await app.init();
	});
	afterEach(() => app.close());

	const http = () => request(app.getHttpServer());

	it('GET /v1/orders returns 200 and parses the rison query', async () => {
		await http()
			.get('/v1/orders?q=(page:2,pageSize:5,status:pending)')
			.expect(200);
		expect(service.findAll).toHaveBeenCalledWith(
			3,
			expect.objectContaining({ status: 'pending', take: 5, skip: 5 })
		);
	});

	it('GET /v1/orders ignores a malformed rison query (defaults)', async () => {
		await http().get('/v1/orders?q=(((').expect(200);
		expect(service.findAll).toHaveBeenCalledWith(3, expect.any(Object));
	});

	it('GET /v1/orders/:id returns 200', async () => {
		await http()
			.get('/v1/orders/7')
			.expect(200, { data: { id: 7 } });
		expect(service.findOne).toHaveBeenCalledWith(3, 7);
	});

	it.each(['abc', '1.5'])('GET /v1/orders/%s is 400', async (id) => {
		await http().get(`/v1/orders/${id}`).expect(400);
		expect(service.findOne).not.toHaveBeenCalled();
	});

	it.each(['0', '-4', '2147483648'])('GET /v1/orders/%s is 404', async (id) => {
		await http().get(`/v1/orders/${id}`).expect(404);
		expect(service.findOne).not.toHaveBeenCalled();
	});

	it('GET /v1/orders/:id surfaces service 404', async () => {
		service.findOne.mockRejectedValue(new NotFoundException('ORDER_NOT_FOUND'));
		await http().get('/v1/orders/7').expect(404);
	});

	it('POST /v1/orders/:id/cancel returns 200 (not 201)', async () => {
		await http().post('/v1/orders/7/cancel').expect(200);
		expect(service.cancel).toHaveBeenCalledWith(3, 7);
	});

	it('POST /v1/orders/abc/cancel is 400', async () => {
		await http().post('/v1/orders/abc/cancel').expect(400);
		expect(service.cancel).not.toHaveBeenCalled();
	});
});
