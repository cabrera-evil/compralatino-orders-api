import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import {
	ExecutionContext,
	INestApplication,
	ValidationPipe,
	VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

const valid = {
	deliveryMethod: 'courier',
	paymentMethod: 'card',
	destination: 'San Salvador',
	contact: { fullName: 'Ana Perez', phone: '+503 7000-0000', email: 'a@b.sv' },
};
const intent = {
	...valid,
	productCode: 'p-1',
	source: 'bid',
	bidAmount: '105',
};

describe('CheckoutController (HTTP)', () => {
	let app: INestApplication;
	const service = {
		checkout: jest.fn(),
		createIntent: jest.fn(),
	};

	beforeEach(async () => {
		jest.resetAllMocks();
		service.checkout.mockResolvedValue({ data: { id: 1 } });
		service.createIntent.mockResolvedValue({ data: { id: 2 } });
		const mod = await Test.createTestingModule({
			controllers: [CheckoutController],
			providers: [{ provide: CheckoutService, useValue: service }],
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

	const post = (path: string, body: object) =>
		request(app.getHttpServer()).post(path).send(body);

	it('POST /v1/orders returns 201 for a valid checkout', async () => {
		await post('/v1/orders', valid).expect(201, { data: { id: 1 } });
		expect(service.checkout).toHaveBeenCalledWith(3, valid);
	});

	it.each([
		['missing deliveryMethod', { ...valid, deliveryMethod: undefined }],
		['empty paymentMethod', { ...valid, paymentMethod: '' }],
		['short name', { ...valid, contact: { ...valid.contact, fullName: 'Al' } }],
		['bad email', { ...valid, contact: { ...valid.contact, email: 'nope' } }],
		['bad phone', { ...valid, contact: { ...valid.contact, phone: 'abc' } }],
		['empty itemIds', { ...valid, itemIds: [] }],
		['duplicate itemIds', { ...valid, itemIds: ['a', 'a'] }],
		[
			'more than 50 itemIds',
			{ ...valid, itemIds: [...Array(51).keys()].map(String) },
		],
		['non-string itemIds', { ...valid, itemIds: [1] }],
		['empty destination', { ...valid, destination: '' }],
	])('POST /v1/orders 400 on %s', async (_n, body) => {
		await post('/v1/orders', body).expect(400);
		expect(service.checkout).not.toHaveBeenCalled();
	});

	// DEFECT: CheckoutDto.contact has @ValidateNested() but no @IsDefined(), so a missing
	// contact passes validation (201) and the service later dereferences undefined.
	it.failing('POST /v1/orders 400 on missing contact', async () => {
		await post('/v1/orders', { ...valid, contact: undefined }).expect(400);
	});

	it('POST /v1/orders/purchase-intents returns 201 for a valid intent', async () => {
		await post('/v1/orders/purchase-intents', intent).expect(201);
		expect(service.createIntent).toHaveBeenCalledWith(3, intent);
	});

	it('coerces a numeric bidAmount to a string', async () => {
		await post('/v1/orders/purchase-intents', {
			...intent,
			bidAmount: 105,
		}).expect(201);
		expect(service.createIntent.mock.calls[0][1].bidAmount).toBe('105');
	});

	it.each([
		['unknown source', { ...intent, source: 'gift' }],
		['zero bid', { ...intent, bidAmount: '0' }],
		['3 decimals', { ...intent, bidAmount: '1.234' }],
		['missing productCode', { ...intent, productCode: undefined }],
	])('POST /v1/orders/purchase-intents 400 on %s', async (_n, body) => {
		await post('/v1/orders/purchase-intents', body).expect(400);
		expect(service.createIntent).not.toHaveBeenCalled();
	});
});
