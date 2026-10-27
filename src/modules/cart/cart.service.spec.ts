import { CatalogClientService } from '@/modules/catalog-client/catalog-client.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartItem, Prisma, PrismaClient } from 'prisma/generated/client';
import { CartService } from './cart.service';

const row = (over: Partial<CartItem> = {}): CartItem =>
	({
		id: 1,
		userId: 3,
		productCode: 'p-1',
		title: 'Camera',
		sellerName: 'S',
		productStatus: 'in_auction',
		quantity: 1,
		unitPrice: new Prisma.Decimal('10.5'),
		unitPriceJpy: new Prisma.Decimal('1500'),
		exchangedAt: null,
		endsAt: new Date('2030-01-01T00:00:00Z'),
		...over,
	}) as CartItem;

// Sum of unit price x quantity, as the shopper sees it in the cart.
const total = (
	items: { quantity: number; bid: { usd: { amount: number } } }[]
) => items.reduce((sum, i) => sum + i.quantity * i.bid.usd.amount, 0);

describe('CartService', () => {
	const cartItem = {
		findMany: jest.fn(),
		findUnique: jest.fn(),
		updateMany: jest.fn(),
		deleteMany: jest.fn(),
		upsert: jest.fn(),
	};
	const prisma = {
		cartItem,
		$transaction: (fn: (tx: unknown) => unknown) => fn({ cartItem }),
	};
	const catalog = { validateProducts: jest.fn() };
	let service: CartService;

	beforeEach(() => {
		jest.resetAllMocks();
		service = new CartService(
			prisma as unknown as PrismaClient,
			catalog as unknown as CatalogClientService
		);
	});

	describe('findAll totals', () => {
		it('is empty with total 0 for an empty cart', async () => {
			cartItem.findMany.mockResolvedValue([]);
			const { data } = await service.findAll(3);
			expect(data).toEqual([]);
			expect(total(data)).toBe(0);
		});

		it('serializes a single item numerically', async () => {
			cartItem.findMany.mockResolvedValue([row()]);
			const { data } = await service.findAll(3);
			expect(data).toHaveLength(1);
			expect(data[0]).toMatchObject({
				id: 'p-1',
				quantity: 1,
				bid: {
					usd: { amount: 10.5, currency: 'USD' },
					jpy: { amount: 1500, currency: 'JPY' },
				},
				endsAt: '2030-01-01T00:00:00.000Z',
			});
			expect(total(data)).toBe(10.5);
		});

		it('sums multiple items with quantities', async () => {
			cartItem.findMany.mockResolvedValue([
				row({ quantity: 2 }),
				row({
					id: 2,
					productCode: 'p-2',
					quantity: 3,
					unitPrice: new Prisma.Decimal('4.25'),
					unitPriceJpy: null,
				}),
			]);
			const { data } = await service.findAll(3);
			expect(data.map((i) => i.quantity)).toEqual([2, 3]);
			expect(data[1].bid.jpy).toBeNull();
			expect(total(data)).toBe(2 * 10.5 + 3 * 4.25);
			expect(cartItem.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: { userId: 3 } })
			);
		});
	});

	describe('add', () => {
		const product = {
			title: 'Camera',
			sellerName: 'S',
			status: 'in_auction',
			endsAt: new Date('2030-01-01'),
			unitPrice: '10.5',
			unitPriceJpy: '1500',
			exchangedAt: null,
		};

		it('validates against the catalog and defaults quantity to 1', async () => {
			catalog.validateProducts.mockResolvedValue([product]);
			cartItem.upsert.mockResolvedValue(row());
			const res = await service.add(3, { productCode: 'p-1' });
			expect(catalog.validateProducts).toHaveBeenCalledWith(['p-1']);
			expect(cartItem.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					create: expect.objectContaining({ quantity: 1, userId: 3 }),
					update: expect.objectContaining({ quantity: { increment: 1 } }),
				})
			);
			expect(res.data.quantity).toBe(1);
		});

		it('rejects when the accumulated quantity exceeds the maximum', async () => {
			catalog.validateProducts.mockResolvedValue([product]);
			cartItem.upsert.mockResolvedValue(row({ quantity: 100 }));
			await expect(
				service.add(3, { productCode: 'p-1', quantity: 5 })
			).rejects.toThrow(new BadRequestException('CART_QUANTITY_EXCEEDED'));
		});

		it('propagates catalog rejection without touching the cart', async () => {
			catalog.validateProducts.mockRejectedValue(new Error('unavailable'));
			await expect(service.add(3, { productCode: 'x' })).rejects.toThrow(
				'unavailable'
			);
			expect(cartItem.upsert).not.toHaveBeenCalled();
		});
	});

	describe('updateQuantity', () => {
		it('sets the quantity and returns the item', async () => {
			cartItem.updateMany.mockResolvedValue({ count: 1 });
			cartItem.findUnique.mockResolvedValue(row({ quantity: 4 }));
			const res = await service.updateQuantity(3, 'p-1', 4);
			expect(cartItem.updateMany).toHaveBeenCalledWith({
				where: { userId: 3, productCode: 'p-1' },
				data: { quantity: 4 },
			});
			expect(res.data.quantity).toBe(4);
		});

		it('404s when the item is missing', async () => {
			cartItem.updateMany.mockResolvedValue({ count: 0 });
			await expect(service.updateQuantity(3, 'nope', 1)).rejects.toThrow(
				NotFoundException
			);
		});

		it('404s when the item vanishes between update and read', async () => {
			cartItem.updateMany.mockResolvedValue({ count: 1 });
			cartItem.findUnique.mockResolvedValue(null);
			await expect(service.updateQuantity(3, 'p-1', 1)).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('remove', () => {
		it('removes an item', async () => {
			cartItem.deleteMany.mockResolvedValue({ count: 1 });
			await expect(service.remove(3, 'p-1')).resolves.toEqual({
				data: { id: 'p-1' },
			});
		});

		it('404s when nothing was removed', async () => {
			cartItem.deleteMany.mockResolvedValue({ count: 0 });
			await expect(service.remove(3, 'p-1')).rejects.toThrow(NotFoundException);
		});
	});
});
