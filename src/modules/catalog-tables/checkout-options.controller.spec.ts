import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import {
	INestApplication,
	UnauthorizedException,
	VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CatalogTablesService } from './catalog-tables.service';
import { CheckoutOptionsController } from './checkout-options.controller';

describe('CheckoutOptionsController (HTTP)', () => {
	let app: INestApplication;
	const service = {
		getCheckoutOptions: jest
			.fn()
			.mockResolvedValue({ data: { departments: [] } }),
	};

	beforeEach(async () => {
		jest.clearAllMocks();
		const mod = await Test.createTestingModule({
			controllers: [CheckoutOptionsController],
			providers: [{ provide: CatalogTablesService, useValue: service }],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({
				canActivate: (ctx) => {
					if (!ctx.switchToHttp().getRequest().headers.authorization)
						throw new UnauthorizedException();
					return true;
				},
			})
			.compile();
		app = mod.createNestApplication();
		app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
		await app.init();
	});
	afterEach(() => app.close());

	it('GET /v1/checkout-options returns 200 when authenticated', () =>
		request(app.getHttpServer())
			.get('/v1/checkout-options')
			.set('Authorization', 'Bearer token')
			.expect(200, { data: { departments: [] } }));

	it('returns 401 without credentials', async () => {
		await request(app.getHttpServer()).get('/v1/checkout-options').expect(401);
		expect(service.getCheckoutOptions).not.toHaveBeenCalled();
	});
});
