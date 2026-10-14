import { CatalogClientService } from '@/modules/catalog-client/catalog-client.service';
import { ValidatedProduct } from '@/modules/catalog-client/catalog-product.type';
import { CatalogTablesService } from '@/modules/catalog-tables/catalog-tables.service';
import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { OrdersService } from '@/modules/orders/orders.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient } from 'prisma/generated/client';
import { CheckoutService } from './checkout.service';
import { PurchaseIntentDto } from './dto/purchase-intent.dto';

const product = (over: Partial<ValidatedProduct> = {}): ValidatedProduct => ({
	code: 'yac-1',
	title: 'Camera',
	sellerName: 'S',
	status: 'in_auction',
	endsAt: new Date('2030-01-01'),
	unitPrice: '100',
	unitPriceJpy: '15000',
	exchangedAt: null,
	currentBidUsd: '100',
	minIncrementUsd: '5',
	...over,
});

const dto = (over: Partial<PurchaseIntentDto> = {}): PurchaseIntentDto => ({
	productCode: 'yac-1',
	source: 'bid',
	bidAmount: '105',
	deliveryMethod: 'courier',
	paymentMethod: 'card',
	destination: 'San Salvador',
	contact: { fullName: 'Ana Perez', phone: '+503 7000-0000', email: 'a@b.sv' },
	...over,
});

describe('CheckoutService.createIntent', () => {
	const created = { id: 1, items: [] };
	const orderCreate = jest.fn();
	const prisma = {
		$transaction: (fn: (tx: unknown) => unknown) =>
			fn({ order: { create: orderCreate } }),
	};
	const catalog = { validateProducts: jest.fn() };
	const tables = { activeCodes: jest.fn() };
	const orders = { serialize: jest.fn().mockResolvedValue({ id: 1 }) };
	const events = { publishOrderCreated: jest.fn() };
	let service: CheckoutService;

	beforeEach(() => {
		jest.clearAllMocks();
		orderCreate.mockResolvedValue(created);
		catalog.validateProducts.mockResolvedValue([product()]);
		tables.activeCodes.mockImplementation(async (kind: string) =>
			kind === 'DELIVERY_METHOD'
				? new Set(['courier'])
				: kind === 'PAYMENT_METHOD'
					? new Set(['card'])
					: new Set(['sv-central'])
		);
		service = new CheckoutService(
			prisma as unknown as PrismaClient,
			catalog as unknown as CatalogClientService,
			tables as unknown as CatalogTablesService,
			orders as unknown as OrdersService,
			events as unknown as OrderEventsPublisher
		);
		(service as unknown as { finish: jest.Mock }).finish = jest
			.fn()
			.mockResolvedValue({ data: {} });
	});

	const reject = async (body: PurchaseIntentDto, message: string) => {
		const error = await service.createIntent(3, body).then(
			() => undefined,
			(e) => e
		);
		expect(error).toBeInstanceOf(BadRequestException);
		expect((error as BadRequestException).message).toBe(message);
		expect(orderCreate).not.toHaveBeenCalled();
	};

	it('rejects a bid without bidAmount', () =>
		reject(dto({ bidAmount: undefined }), 'BID_AMOUNT_REQUIRED'));

	it('rejects a bid below current bid + increment', () =>
		reject(dto({ bidAmount: '104.99' }), 'BID_BELOW_MINIMUM'));

	it('falls back to unitPrice when currentBidUsd is absent', async () => {
		catalog.validateProducts.mockResolvedValue([
			product({ currentBidUsd: null, minIncrementUsd: null }),
		]);
		await reject(dto({ bidAmount: '99' }), 'BID_BELOW_MINIMUM');
	});

	it('accepts a bid exactly at the minimum and stores full purchase data', async () => {
		await service.createIntent(3, dto());
		const { data } = orderCreate.mock.calls[0][0];
		expect(data).toMatchObject({
			userId: 3,
			intentSource: 'BID',
			deliveryMethodCode: 'courier',
			paymentMethodCode: 'card',
			destination: 'San Salvador',
			contactFullName: 'Ana Perez',
			contactEmail: 'a@b.sv',
		});
		expect(data.intentBidAmount.eq(new Prisma.Decimal('105'))).toBe(true);
		expect(data.totalAmount.eq(new Prisma.Decimal('100'))).toBe(true);
	});

	it('buy_now ignores bidAmount and keeps the catalog price as total', async () => {
		await service.createIntent(3, dto({ source: 'buy_now', bidAmount: '1' }));
		const { data } = orderCreate.mock.calls[0][0];
		expect(data.intentSource).toBe('BUY_NOW');
		expect(data.intentBidAmount).toBeNull();
		expect(data.totalAmount.eq(new Prisma.Decimal('100'))).toBe(true);
	});

	it('rejects an invalid payment method', () =>
		reject(dto({ paymentMethod: 'bitcoin' }), 'INVALID_PAYMENT_METHOD'));

	it('requires a destination or pickup point', () =>
		reject(dto({ destination: undefined }), 'DESTINATION_REQUIRED'));
});
