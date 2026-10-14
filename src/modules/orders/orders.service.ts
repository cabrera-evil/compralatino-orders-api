import {
	DELIVERED_TRACKING_CODE,
	MATCH_SAMPLE_LIMIT,
	MAX_ORDER_PAGE_SIZE,
	TOP_PRODUCTS_LIMIT,
} from '@/constants/orders';
import { CatalogTablesService } from '@/modules/catalog-tables/catalog-tables.service';
import { buildOrderUpdatedEvent } from '@/modules/events/order-event.builder';
import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { paginatedResponse, singleResponse } from '@/utils/response.util';
import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	OrderStatus,
	PaymentStatus,
	Prisma,
	PrismaClient,
} from 'prisma/generated/client';
import {
	OrderWithRelations,
	SerializerRefs,
	serializeOrder,
} from './order.serializer';

export const ORDER_INCLUDE = {
	items: { orderBy: { id: 'asc' } },
	trackingState: true,
} satisfies Prisma.OrderInclude;

export type OrdersListQuery = {
	take?: number;
	skip?: number;
	status?: unknown;
};

export type AdminOrdersListQuery = {
	page?: number;
	pageSize?: number;
	status?: unknown;
};

const NON_SALE_STATUSES = [OrderStatus.CANCELLED, OrderStatus.FAILED];

export type AdminAnalyticsQuery = { from?: unknown; to?: unknown };

type ProductTotals = {
	productCode: string;
	title: string;
	units: number;
	revenue: Prisma.Decimal;
};

@Injectable()
export class OrdersService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly catalogTables: CatalogTablesService,
		private readonly events: OrderEventsPublisher
	) {}

	async findAll(userId: number, { take, skip, status }: OrdersListQuery) {
		const where: Prisma.OrderWhereInput = { userId };
		if (status) where.status = this.parseStatus(status);
		const page = {
			take: Math.min(take ?? 10, MAX_ORDER_PAGE_SIZE),
			skip: skip ?? 0,
		};
		const [orders, count, refs] = await Promise.all([
			this.prisma.order.findMany({
				where,
				...page,
				orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
				include: ORDER_INCLUDE,
			}),
			this.prisma.order.count({ where }),
			this.refs(),
		]);
		return paginatedResponse(
			orders.map((order) => serializeOrder(order, refs)),
			count,
			page
		);
	}

	async findOne(userId: number, id: number) {
		const order = await this.prisma.order.findFirst({
			where: { id, userId },
			include: ORDER_INCLUDE,
		});
		if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
		return singleResponse(serializeOrder(order, await this.refs()));
	}

	async cancel(userId: number, id: number) {
		const order = await this.transition(
			{ id, userId },
			OrderStatus.CANCELLED,
			'ORDER_NOT_CANCELLABLE'
		);
		return singleResponse(serializeOrder(order, await this.refs()));
	}

	async adminList({ page, pageSize, status }: AdminOrdersListQuery) {
		const where: Prisma.OrderWhereInput = {};
		if (status) where.status = this.parseStatus(status);
		const take = Math.min(
			Math.max(1, Math.trunc(pageSize ?? 10)),
			MAX_ORDER_PAGE_SIZE
		);
		const currentPage = Math.max(1, Math.trunc(page ?? 1));
		const [orders, total, refs] = await Promise.all([
			this.prisma.order.findMany({
				where,
				take,
				skip: (currentPage - 1) * take,
				orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
				include: ORDER_INCLUDE,
			}),
			this.prisma.order.count({ where }),
			this.refs(),
		]);
		return {
			items: orders.map((order) => this.serializeAdmin(order, refs)),
			total,
			page: currentPage,
			pageSize: take,
		};
	}

	/** BI aggregates for orders placed in [from, to] (ISO instants, both inclusive). */
	async adminAnalytics({ from, to }: AdminAnalyticsQuery) {
		const gte = new Date(from as string);
		const lte = new Date(to as string);
		if (!from || !to || isNaN(+gte) || isNaN(+lte) || gte > lte)
			throw new BadRequestException('INVALID_DATE_RANGE');
		const cohort: Prisma.OrderWhereInput = { orderDate: { gte, lte } };
		// Each stage narrows the previous one, so no stage can exceed its predecessor.
		const confirmed = { ...cohort, status: OrderStatus.CONFIRMED };
		const paid = { ...confirmed, paymentStatus: PaymentStatus.PAID };
		const delivered = {
			...paid,
			trackingState: { code: DELIVERED_TRACKING_CODE },
		};
		const [[placed, nConfirmed, nPaid, nDelivered], items, sample] =
			await Promise.all([
				Promise.all(
					[cohort, confirmed, paid, delivered].map((where) =>
						this.prisma.order.count({ where })
					)
				),
				// ponytail: aggregated in memory over the range's lines; move to SQL if ranges get huge
				this.prisma.orderItem.findMany({
					where: {
						order: {
							...cohort,
							status: { notIn: NON_SALE_STATUSES },
						},
					},
					select: {
						productCode: true,
						title: true,
						quantity: true,
						unitPrice: true,
					},
				}),
				this.prisma.order.findMany({
					where: { ...cohort, status: { notIn: NON_SALE_STATUSES } },
					select: {
						id: true,
						userId: true,
						items: { select: { productCode: true } },
					},
					orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
					take: MATCH_SAMPLE_LIMIT,
				}),
			]);

		const totals = new Map<string, ProductTotals>();
		for (const { productCode, title, quantity, unitPrice } of items) {
			const row = totals.get(productCode) ?? {
				productCode,
				title,
				units: 0,
				revenue: new Prisma.Decimal(0),
			};
			row.units += quantity;
			row.revenue = row.revenue.plus(unitPrice.times(quantity));
			totals.set(productCode, row);
		}
		const top = (cmp: (a: ProductTotals, b: ProductTotals) => number) =>
			[...totals.values()]
				.sort((a, b) => cmp(a, b) || a.productCode.localeCompare(b.productCode))
				.slice(0, TOP_PRODUCTS_LIMIT)
				.map((row) => ({ ...row, revenue: row.revenue.toString() }));

		return {
			funnel: {
				placed,
				confirmed: nConfirmed,
				paid: nPaid,
				delivered: nDelivered,
			},
			topProducts: {
				byUnits: top((a, b) => b.units - a.units),
				byRevenue: top((a, b) => b.revenue.comparedTo(a.revenue)),
			},
			matchSample: sample.map(({ id, userId, items }) => ({
				orderId: id,
				userId,
				productCodes: items.map((i) => i.productCode),
			})),
		};
	}

	async adminGet(id: number) {
		const order = await this.prisma.order.findUnique({
			where: { id },
			include: ORDER_INCLUDE,
		});
		if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
		return this.serializeAdmin(order, await this.refs());
	}

	async adminUpdateStatus(id: number, status: unknown) {
		const to = this.parseStatus(status);
		if (to === OrderStatus.PENDING)
			throw new BadRequestException('INVALID_ORDER_STATUS_TRANSITION');
		const order = await this.transition({ id }, to, 'ORDER_NOT_PENDING');
		return this.serializeAdmin(order, await this.refs());
	}

	/** Moves a PENDING order to `to` atomically and emits order.updated. */
	private async transition(
		where: { id: number; userId?: number },
		to: OrderStatus,
		conflictCode: string
	) {
		const { count } = await this.prisma.order.updateMany({
			where: { ...where, status: OrderStatus.PENDING },
			data: { status: to },
		});
		const order = await this.prisma.order.findFirst({
			where,
			include: ORDER_INCLUDE,
		});
		if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
		if (!count) throw new ConflictException(conflictCode);
		this.events.publishOrderUpdated(
			buildOrderUpdatedEvent(order, OrderStatus.PENDING)
		);
		return order;
	}

	private serializeAdmin(order: OrderWithRelations, refs: SerializerRefs) {
		return { ...serializeOrder(order, refs), userId: order.userId };
	}

	async refs(): Promise<SerializerRefs> {
		const [statusLabels, trackingStates] = await Promise.all([
			this.catalogTables.statusLabels(),
			this.catalogTables.trackingStates(),
		]);
		return { statusLabels, trackingStates };
	}

	async serialize(order: OrderWithRelations) {
		return serializeOrder(order, await this.refs());
	}

	private parseStatus(code: unknown): OrderStatus {
		const status =
			typeof code === 'string'
				? OrderStatus[code.toUpperCase() as keyof typeof OrderStatus]
				: undefined;
		if (!status) throw new BadRequestException('INVALID_ORDER_STATUS');
		return status;
	}
}
