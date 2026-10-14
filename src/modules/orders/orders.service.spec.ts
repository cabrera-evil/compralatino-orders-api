import { CatalogTablesService } from '@/modules/catalog-tables/catalog-tables.service';
import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
	OrderStatus,
	PaymentStatus,
	Prisma,
	PrismaClient,
} from 'prisma/generated/client';
import { OrdersService } from './orders.service';

const order = (status: OrderStatus) => ({
	id: 7,
	userId: 3,
	status,
	paymentStatus: PaymentStatus.AWAITING_PAYMENT,
	amountReceived: null,
	items: [],
	trackingState: null,
	orderDate: new Date('2026-01-01T00:00:00Z'),
	updatedAt: new Date('2026-01-02T00:00:00Z'),
	totalAmount: new Prisma.Decimal(10),
	totalAmountJpy: null,
	intentSource: null,
	intentBidAmount: null,
});

describe('OrdersService admin', () => {
	const prisma = {
		order: {
			findMany: jest.fn(),
			count: jest.fn(),
			findUnique: jest.fn(),
			updateMany: jest.fn(),
			findFirst: jest.fn(),
		},
	};
	const events = { publishOrderUpdated: jest.fn() };
	const catalogTables = {
		statusLabels: jest.fn().mockResolvedValue(new Map()),
		trackingStates: jest.fn().mockResolvedValue([]),
	};
	let service: OrdersService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new OrdersService(
			prisma as unknown as PrismaClient,
			catalogTables as unknown as CatalogTablesService,
			events as unknown as OrderEventsPublisher
		);
	});

	describe('adminList', () => {
		it('filters by status, paginates and sorts newest first', async () => {
			prisma.order.findMany.mockResolvedValue([order(OrderStatus.PENDING)]);
			prisma.order.count.mockResolvedValue(21);
			const res = await service.adminList({
				page: 2,
				pageSize: 10,
				status: 'pending',
			});
			expect(prisma.order.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { status: OrderStatus.PENDING },
					take: 10,
					skip: 10,
					orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
				})
			);
			expect(res).toMatchObject({ total: 21, page: 2, pageSize: 10 });
			expect(res.items[0]).toMatchObject({ id: 7, userId: 3 });
		});

		it('has no status filter by default and caps page size', async () => {
			prisma.order.findMany.mockResolvedValue([]);
			prisma.order.count.mockResolvedValue(0);
			await service.adminList({});
			expect(prisma.order.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: {}, take: 10, skip: 0 })
			);
			await service.adminList({ pageSize: 9999 });
			expect(prisma.order.findMany).toHaveBeenLastCalledWith(
				expect.objectContaining({ take: 50 })
			);
		});

		it('rejects an unknown status', async () => {
			await expect(service.adminList({ status: 'nope' })).rejects.toThrow(
				BadRequestException
			);
		});
	});

	describe('adminUpdateStatus', () => {
		it.each([OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.FAILED])(
			'moves PENDING to %s and emits order.updated',
			async (to) => {
				prisma.order.updateMany.mockResolvedValue({ count: 1 });
				prisma.order.findFirst.mockResolvedValue(order(to));
				const res = await service.adminUpdateStatus(7, to.toLowerCase());
				expect(prisma.order.updateMany).toHaveBeenCalledWith({
					where: { id: 7, status: OrderStatus.PENDING },
					data: { status: to },
				});
				expect(events.publishOrderUpdated).toHaveBeenCalledWith(
					expect.objectContaining({
						orderId: 7,
						status: to.toLowerCase(),
						previousStatus: 'pending',
					})
				);
				expect(res.status).toBe(to.toLowerCase());
			}
		);

		it('rejects PENDING and unknown targets', async () => {
			await expect(service.adminUpdateStatus(7, 'pending')).rejects.toThrow(
				BadRequestException
			);
			await expect(service.adminUpdateStatus(7, 'x')).rejects.toThrow(
				BadRequestException
			);
			expect(prisma.order.updateMany).not.toHaveBeenCalled();
		});

		it('conflicts when the order is not pending and emits nothing', async () => {
			prisma.order.updateMany.mockResolvedValue({ count: 0 });
			prisma.order.findFirst.mockResolvedValue(order(OrderStatus.CONFIRMED));
			await expect(service.adminUpdateStatus(7, 'cancelled')).rejects.toThrow(
				ConflictException
			);
			expect(events.publishOrderUpdated).not.toHaveBeenCalled();
		});
	});
});
