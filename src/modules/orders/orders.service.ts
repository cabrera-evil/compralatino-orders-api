import { MAX_ORDER_PAGE_SIZE } from '@/constants/orders';
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
import { OrderStatus, Prisma, PrismaClient } from 'prisma/generated/client';
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
