import { CatalogTablesService } from '@/modules/catalog-tables/catalog-tables.service';
import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { BadRequestException } from '@nestjs/common';
import {
	OrderStatus,
	PaymentStatus,
	Prisma,
	PrismaClient,
} from 'prisma/generated/client';
import { OrdersService } from './orders.service';

const range = {
	from: '2026-01-01T06:00:00.000Z',
	to: '2026-02-01T05:59:59.999Z',
};
const item = (productCode: string, quantity: number, unitPrice: string) => ({
	productCode,
	title: `Lot ${productCode}`,
	quantity,
	unitPrice: new Prisma.Decimal(unitPrice),
});

describe('OrdersService adminAnalytics', () => {
	const prisma = {
		order: { count: jest.fn(), findMany: jest.fn() },
		orderItem: { findMany: jest.fn() },
	};
	let service: OrdersService;

	beforeEach(() => {
		jest.clearAllMocks();
		prisma.order.count.mockResolvedValue(0);
		prisma.order.findMany.mockResolvedValue([]);
		prisma.orderItem.findMany.mockResolvedValue([]);
		service = new OrdersService(
			prisma as unknown as PrismaClient,
			{} as CatalogTablesService,
			{} as OrderEventsPublisher
		);
	});

	it('rejects a missing or inverted range', async () => {
		await expect(service.adminAnalytics({})).rejects.toThrow(
			BadRequestException
		);
		await expect(
			service.adminAnalytics({ from: range.to, to: range.from })
		).rejects.toThrow(BadRequestException);
	});

	it('builds a nested funnel over the orderDate cohort', async () => {
		prisma.order.count
			.mockResolvedValueOnce(10)
			.mockResolvedValueOnce(6)
			.mockResolvedValueOnce(4)
			.mockResolvedValueOnce(1);
		const { funnel } = await service.adminAnalytics(range);
		expect(funnel).toEqual({ placed: 10, confirmed: 6, paid: 4, delivered: 1 });
		const cohort = {
			orderDate: { gte: new Date(range.from), lte: new Date(range.to) },
		};
		const wheres = prisma.order.count.mock.calls.map(([a]) => a.where);
		expect(wheres[0]).toEqual(cohort);
		expect(wheres[1]).toEqual({ ...cohort, status: OrderStatus.CONFIRMED });
		expect(wheres[2]).toEqual({
			...cohort,
			status: OrderStatus.CONFIRMED,
			paymentStatus: PaymentStatus.PAID,
		});
		expect(wheres[3]).toEqual({
			...cohort,
			status: OrderStatus.CONFIRMED,
			paymentStatus: PaymentStatus.PAID,
			trackingState: { code: 'delivery' },
		});
	});

	it('ranks products by units and revenue from non failed/cancelled lines', async () => {
		prisma.orderItem.findMany.mockResolvedValue([
			item('a', 5, '1.00'),
			item('b', 1, '50.00'),
			item('a', 1, '1.00'),
		]);
		const { topProducts } = await service.adminAnalytics(range);
		expect(prisma.orderItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					order: {
						orderDate: { gte: new Date(range.from), lte: new Date(range.to) },
						status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
					},
				},
			})
		);
		expect(topProducts.byUnits.map((p) => [p.productCode, p.units])).toEqual([
			['a', 6],
			['b', 1],
		]);
		expect(
			topProducts.byRevenue.map((p) => [p.productCode, p.revenue])
		).toEqual([
			['b', '50'],
			['a', '6'],
		]);
	});

	it('returns the latest range orders as the purchase-match sample', async () => {
		prisma.order.findMany.mockResolvedValue([
			{ id: 9, userId: 2, items: [{ productCode: 'a' }, { productCode: 'b' }] },
		]);
		const { matchSample } = await service.adminAnalytics(range);
		expect(prisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					orderDate: { gte: new Date(range.from), lte: new Date(range.to) },
					status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
				},
				orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
				take: 50,
			})
		);
		expect(matchSample).toEqual([
			{ orderId: 9, userId: 2, productCodes: ['a', 'b'] },
		]);
	});
});
