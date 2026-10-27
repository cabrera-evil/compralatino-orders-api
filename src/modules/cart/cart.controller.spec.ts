import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { JwtStrategy } from '@/modules/auth/jwt.strategy';
import {
	ExecutionContext,
	INestApplication,
	UnauthorizedException,
	ValidationPipe,
	VersioningType,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

const fakeGuard = {
	canActivate: (ctx: ExecutionContext) => {
		const req = ctx.switchToHttp().getRequest();
		if (!req.headers.authorization) throw new UnauthorizedException();
		req.user = { id: 3 };
		return true;
	},
};

const boot = async (
	configure: (b: ReturnType<typeof Test.createTestingModule>) => void = (b) =>
		b.overrideGuard(JwtAuthGuard).useValue(fakeGuard) as unknown as void,
	extra: { imports?: unknown[]; providers?: unknown[] } = {}
) => {
	const service = {
		findAll: jest.fn().mockResolvedValue({ data: [] }),
		add: jest.fn().mockResolvedValue({ data: { id: 'p-1' } }),
		updateQuantity: jest.fn().mockResolvedValue({ data: { id: 'p-1' } }),
		remove: jest.fn().mockResolvedValue({ data: { id: 'p-1' } }),
	};
	const builder = Test.createTestingModule({
		imports: (extra.imports ?? []) as never[],
		controllers: [CartController],
		providers: [
			{ provide: CartService, useValue: service },
			...((extra.providers ?? []) as never[]),
		],
	});
	configure(builder);
	const app = (await builder.compile()).createNestApplication();
	app.useGlobalPipes(new ValidationPipe({ transform: true }));
	app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
	await app.init();
	return { app, service };
};

describe('CartController (HTTP)', () => {
	let app: INestApplication;
	let service: Awaited<ReturnType<typeof boot>>['service'];
	const auth = { Authorization: 'Bearer token' };

	beforeEach(async () => ({ app, service } = await boot()));
	afterEach(() => app.close());

	it('GET /v1/cart returns 200 with the caller id', async () => {
		await request(app.getHttpServer())
			.get('/v1/cart')
			.set(auth)
			.expect(200, { data: [] });
		expect(service.findAll).toHaveBeenCalledWith(3);
	});

	it('POST /v1/cart/items returns 201 for valid input', async () => {
		await request(app.getHttpServer())
			.post('/v1/cart/items')
			.set(auth)
			.send({ productCode: 'p-1', quantity: 2 })
			.expect(201);
		expect(service.add).toHaveBeenCalledWith(3, {
			productCode: 'p-1',
			quantity: 2,
		});
	});

	it.each([
		['missing productCode', {}],
		['empty productCode', { productCode: '' }],
		['quantity 0', { productCode: 'p', quantity: 0 }],
		['quantity above max', { productCode: 'p', quantity: 100 }],
		['fractional quantity', { productCode: 'p', quantity: 1.5 }],
		['string quantity', { productCode: 'p', quantity: 'two' }],
	])('POST /v1/cart/items 400 on %s', async (_n, body) => {
		await request(app.getHttpServer())
			.post('/v1/cart/items')
			.set(auth)
			.send(body)
			.expect(400);
		expect(service.add).not.toHaveBeenCalled();
	});

	it('PATCH /v1/cart/items/:code returns 200 and 400 on bad quantity', async () => {
		await request(app.getHttpServer())
			.patch('/v1/cart/items/p-1')
			.set(auth)
			.send({ quantity: 5 })
			.expect(200);
		expect(service.updateQuantity).toHaveBeenCalledWith(3, 'p-1', 5);
		await request(app.getHttpServer())
			.patch('/v1/cart/items/p-1')
			.set(auth)
			.send({ quantity: -1 })
			.expect(400);
	});

	it('DELETE /v1/cart/items/:code returns 200', async () => {
		await request(app.getHttpServer())
			.delete('/v1/cart/items/p-1')
			.set(auth)
			.expect(200);
		expect(service.remove).toHaveBeenCalledWith(3, 'p-1');
	});

	it('401 without credentials and the service is untouched', async () => {
		await request(app.getHttpServer()).get('/v1/cart').expect(401);
		expect(service.findAll).not.toHaveBeenCalled();
	});
});

describe('CartController with the real JWT guard', () => {
	let app: INestApplication;
	let token: string;
	const secret = 'test-secret';

	beforeEach(async () => {
		process.env.JWT_SECRET = secret;
		({ app } = await boot(() => undefined, {
			imports: [PassportModule],
			providers: [JwtStrategy],
		}));
		token = new JwtService({ secret }).sign({ id: 3 });
	});
	afterEach(() => app.close());

	it('accepts a valid bearer token', () =>
		request(app.getHttpServer())
			.get('/v1/cart')
			.set('Authorization', `Bearer ${token}`)
			.expect(200));

	it('rejects a missing token', () =>
		request(app.getHttpServer()).get('/v1/cart').expect(401));

	it('rejects a token signed with another secret', () =>
		request(app.getHttpServer())
			.get('/v1/cart')
			.set(
				'Authorization',
				`Bearer ${new JwtService({ secret: 'other' }).sign({ id: 3 })}`
			)
			.expect(401));

	it('rejects a token whose id is not a positive integer', () =>
		request(app.getHttpServer())
			.get('/v1/cart')
			.set(
				'Authorization',
				`Bearer ${new JwtService({ secret }).sign({ id: 0 })}`
			)
			.expect(401));
});
