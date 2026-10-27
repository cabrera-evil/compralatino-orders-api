import { CatalogTablesService } from '@/modules/catalog-tables/catalog-tables.service';
import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { ConflictException, NotFoundException } from '@nestjs/common';
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

describe('OrdersService transitions and user reads', () => {
	const prisma = {
		order: {
			findMany: jest.fn(),
			count: jest.fn(),
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

	it('cancels a PENDING order of the caller', async () => {
		prisma.order.updateMany.mockResolvedValue({ count: 1 });
		prisma.order.findFirst.mockResolvedValue(order(OrderStatus.CANCELLED));
		const res = await service.cancel(3, 7);
		expect(prisma.order.updateMany).toHaveBeenCalledWith({
			where: { id: 7, userId: 3, status: OrderStatus.PENDING },
			data: { status: OrderStatus.CANCELLED },
		});
		expect(res.data.status).toBe('cancelled');
		expect(events.publishOrderUpdated).toHaveBeenCalledTimes(1);
	});

	it.each([OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.FAILED])(
		'rejects cancelling an order already %s (invalid transition)',
		async (current) => {
			prisma.order.updateMany.mockResolvedValue({ count: 0 });
			prisma.order.findFirst.mockResolvedValue(order(current));
			await expect(service.cancel(3, 7)).rejects.toThrow(
				new ConflictException('ORDER_NOT_CANCELLABLE')
			);
			expect(events.publishOrderUpdated).not.toHaveBeenCalled();
		}
	);

	it.each([OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.FAILED])(
		'admin cannot move a %s order to another status',
		async (current) => {
			prisma.order.updateMany.mockResolvedValue({ count: 0 });
			prisma.order.findFirst.mockResolvedValue(order(current));
			await expect(service.adminUpdateStatus(7, 'confirmed')).rejects.toThrow(
				new ConflictException('ORDER_NOT_PENDING')
			);
			expect(events.publishOrderUpdated).not.toHaveBeenCalled();
		}
	);

	it("404s when cancelling someone else's or a missing order", async () => {
		prisma.order.updateMany.mockResolvedValue({ count: 0 });
		prisma.order.findFirst.mockResolvedValue(null);
		await expect(service.cancel(99, 7)).rejects.toThrow(NotFoundException);
	});

	it('findOne scopes to the owner and 404s otherwise', async () => {
		prisma.order.findFirst.mockResolvedValue(null);
		await expect(service.findOne(3, 7)).rejects.toThrow(NotFoundException);
		expect(prisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 7, userId: 3 } })
		);
		prisma.order.findFirst.mockResolvedValue(order(OrderStatus.PENDING));
		const res = await service.findOne(3, 7);
		expect(res.data).toMatchObject({ id: 7, status: 'pending' });
	});

	it('findAll filters by status, caps the page size and counts', async () => {
		prisma.order.findMany.mockResolvedValue([order(OrderStatus.PENDING)]);
		prisma.order.count.mockResolvedValue(1);
		const res = await service.findAll(3, {
			take: 500,
			skip: 0,
			status: 'pending',
		});
		expect(prisma.order.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: 3, status: OrderStatus.PENDING },
				take: 50,
			})
		);
		expect(res.data).toHaveLength(1);
	});

	it('findAll rejects an unknown status', async () => {
		await expect(
			service.findAll(3, { take: 10, skip: 0, status: 'bogus' })
		).rejects.toThrow('INVALID_ORDER_STATUS');
		expect(prisma.order.findMany).not.toHaveBeenCalled();
	});
});
