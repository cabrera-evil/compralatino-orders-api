import { CatalogClientService } from '@/modules/catalog-client/catalog-client.service';
import { CatalogTablesService } from '@/modules/catalog-tables/catalog-tables.service';
import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { OrdersService } from '@/modules/orders/orders.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, PrismaClient } from 'prisma/generated/client';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';

const dto = (over: Partial<CheckoutDto> = {}): CheckoutDto => ({
	deliveryMethod: 'courier',
	paymentMethod: 'card',
	destination: 'San Salvador',
	contact: { fullName: 'Ana Perez', phone: '+503 7000-0000', email: 'a@b.sv' },
	...over,
});

const line = (productCode: string, quantity: number) => ({
	productCode,
	quantity,
});

const validated = (code: string, usd: string, jpy: string) => ({
	code,
	title: code,
	sellerName: 'S',
	status: 'in_auction',
	endsAt: new Date('2030-01-01'),
	unitPrice: usd,
	unitPriceJpy: jpy,
	exchangedAt: null,
	currentBidUsd: null,
	minIncrementUsd: null,
});

describe('CheckoutService.checkout', () => {
	const orderCreate = jest.fn();
	const cartFindMany = jest.fn();
	const cartDeleteMany = jest.fn();
	const prisma = {
		cartItem: { findMany: cartFindMany },
		$transaction: (fn: (tx: unknown) => unknown) =>
			fn({
				order: { create: orderCreate },
				cartItem: { deleteMany: cartDeleteMany },
			}),
	};
	const catalog = { validateProducts: jest.fn() };
	const tables = { activeCodes: jest.fn() };
	const orders = { serialize: jest.fn().mockResolvedValue({ id: 1 }) };
	const events = { publishOrderCreated: jest.fn() };
	let service: CheckoutService;

	beforeEach(() => {
		jest.clearAllMocks();
		orderCreate.mockImplementation(async ({ data }) => ({
			id: 1,
			status: 'PENDING',
			orderDate: new Date('2026-01-01T00:00:00Z'),
			intentSource: null,
			intentBidAmount: null,
			...data,
			items: data.items.create,
		}));
		cartDeleteMany.mockResolvedValue({ count: 2 });
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
	});

	it('totals quantity x price for multiple lines in USD and JPY', async () => {
		cartFindMany.mockResolvedValue([line('a', 2), line('b', 3)]);
		catalog.validateProducts.mockResolvedValue([
			validated('a', '10.50', '1500'),
			validated('b', '0.10', '15'),
		]);
		await service.checkout(3, dto());
		const { data } = orderCreate.mock.calls[0][0];
		expect(data.totalAmount.toString()).toBe('21.3');
		expect(data.totalAmountJpy.toString()).toBe('3045');
		expect(
			data.items.create.map((i: { quantity: number }) => i.quantity)
		).toEqual([2, 3]);
		expect(events.publishOrderCreated).toHaveBeenCalledTimes(1);
	});

	it('totals a single unit line exactly', async () => {
		cartFindMany.mockResolvedValue([line('a', 1)]);
		cartDeleteMany.mockResolvedValue({ count: 1 });
		catalog.validateProducts.mockResolvedValue([validated('a', '9.99', '1')]);
		await service.checkout(3, dto());
		const { data } = orderCreate.mock.calls[0][0];
		expect(data.totalAmount).toEqual(new Prisma.Decimal('9.99'));
	});

	it('rejects an empty cart', async () => {
		cartFindMany.mockResolvedValue([]);
		await expect(service.checkout(3, dto())).rejects.toThrow(
			new BadRequestException('EMPTY_CART')
		);
		expect(orderCreate).not.toHaveBeenCalled();
	});

	it('rejects itemIds that are not in the cart', async () => {
		cartFindMany.mockResolvedValue([line('a', 1)]);
		await expect(
			service.checkout(3, dto({ itemIds: ['a', 'zz'] }))
		).rejects.toThrow(new BadRequestException('CART_ITEM_NOT_FOUND'));
	});

	it.each([
		['delivery', { deliveryMethod: 'drone' }, 'INVALID_DELIVERY_METHOD'],
		['payment', { paymentMethod: 'barter' }, 'INVALID_PAYMENT_METHOD'],
		['pickup', { pickupPoint: 'moon' }, 'INVALID_PICKUP_POINT'],
		['destination', { destination: undefined }, 'DESTINATION_REQUIRED'],
	])('rejects invalid %s', async (_n, over, code) => {
		await expect(service.checkout(3, dto(over))).rejects.toThrow(
			new BadRequestException(code)
		);
		expect(orderCreate).not.toHaveBeenCalled();
	});

	it('conflicts when the cart changed under a concurrent checkout', async () => {
		cartFindMany.mockResolvedValue([line('a', 1), line('b', 1)]);
		cartDeleteMany.mockResolvedValue({ count: 1 });
		catalog.validateProducts.mockResolvedValue([
			validated('a', '1', '1'),
			validated('b', '1', '1'),
		]);
		await expect(service.checkout(3, dto())).rejects.toThrow(ConflictException);
		expect(orderCreate).not.toHaveBeenCalled();
		expect(events.publishOrderCreated).not.toHaveBeenCalled();
	});
});
