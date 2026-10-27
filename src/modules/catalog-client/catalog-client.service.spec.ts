import {
	Logger,
	ServiceUnavailableException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { NEVER, of, throwError } from 'rxjs';
import { CatalogClientService } from './catalog-client.service';
import { CatalogProductReply } from './catalog-product.type';

const item = (
	over: Partial<CatalogProductReply> = {}
): CatalogProductReply => ({
	code: 'p-1',
	found: true,
	available: true,
	title: 'Camera',
	sellerName: 'S',
	status: 'in_auction',
	endsAt: '2030-01-01T00:00:00Z',
	price: { usd: '10.50', jpy: '1500', exchangedAt: '2026-01-01T00:00:00Z' },
	currentBidUsd: '10.50',
	minIncrementUsd: 'bad',
	...over,
});

describe('CatalogClientService', () => {
	const send = jest.fn();
	const service = new CatalogClientService({ send } as unknown as ClientProxy);

	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
	});

	it('returns validated products in request order and dedupes codes', async () => {
		send.mockReturnValue(
			of({ items: [item({ code: 'b' }), item({ code: 'a' })] })
		);
		const res = await service.validateProducts(['a', 'b', 'a']);
		expect(send.mock.calls[0][1]).toEqual({ codes: ['a', 'b'] });
		expect(res.map((p) => p.code)).toEqual(['a', 'b']);
		expect(res[0]).toMatchObject({
			unitPrice: '10.50',
			unitPriceJpy: '1500',
			currentBidUsd: '10.50',
			minIncrementUsd: null,
			exchangedAt: new Date('2026-01-01T00:00:00Z'),
		});
	});

	it.each([
		['unknown product', item({ found: false })],
		['unavailable product', item({ available: false })],
		['missing title', item({ title: undefined })],
		['bad end date', item({ endsAt: 'soon' })],
		['missing price', item({ price: undefined })],
		['non-decimal usd', item({ price: { usd: '1e3', jpy: '1' } })],
	])('422 PRODUCT_UNAVAILABLE for %s', async (_n, bad) => {
		send.mockReturnValue(of({ items: [bad] }));
		const error = await service.validateProducts(['p-1']).catch((e) => e);
		expect(error).toBeInstanceOf(UnprocessableEntityException);
		expect(error.getResponse()).toMatchObject({
			message: 'PRODUCT_UNAVAILABLE',
			productCodes: ['p-1'],
		});
	});

	it('422 lists codes missing from the reply', async () => {
		send.mockReturnValue(of({ items: [] }));
		await expect(service.validateProducts(['zz'])).rejects.toBeInstanceOf(
			UnprocessableEntityException
		);
	});

	it('503 CATALOG_UNAVAILABLE when the transport fails', async () => {
		send.mockReturnValue(throwError(() => new Error('conn refused')));
		await expect(service.validateProducts(['p-1'])).rejects.toThrow(
			new ServiceUnavailableException('CATALOG_UNAVAILABLE')
		);
	});

	it('503 on a malformed reply', async () => {
		send.mockReturnValue(of({ nope: true }));
		await expect(service.validateProducts(['p-1'])).rejects.toBeInstanceOf(
			ServiceUnavailableException
		);
	});

	it('503 on timeout', async () => {
		process.env.CATALOG_RPC_TIMEOUT_MS = '10';
		send.mockReturnValue(NEVER);
		try {
			await expect(service.validateProducts(['p-1'])).rejects.toBeInstanceOf(
				ServiceUnavailableException
			);
		} finally {
			delete process.env.CATALOG_RPC_TIMEOUT_MS;
		}
	});

	it('503 when RabbitMQ is disabled (no client)', async () => {
		await expect(
			new CatalogClientService().validateProducts(['p-1'])
		).rejects.toBeInstanceOf(ServiceUnavailableException);
	});
});
