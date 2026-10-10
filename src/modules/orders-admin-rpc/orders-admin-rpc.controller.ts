import { SkipEncryption } from '@/decorators/skip-encryption.decorator';
import {
	AdminOrdersListQuery,
	OrdersService,
} from '@/modules/orders/orders.service';
import { Controller, HttpException } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import {
	ORDERS_ADMIN_GET_PATTERN,
	ORDERS_ADMIN_LIST_PATTERN,
	ORDERS_ADMIN_UPDATE_STATUS_PATTERN,
} from './orders-admin-rpc.constants';

// Surface domain errors (HttpException) to the RPC caller instead of a generic 500.
const rpc = async <T>(run: () => Promise<T>): Promise<T> => {
	try {
		return await run();
	} catch (error) {
		if (error instanceof HttpException)
			throw new RpcException({
				statusCode: error.getStatus(),
				message: error.message,
			});
		throw error;
	}
};

const orderId = (id: unknown): number => {
	if (typeof id !== 'number' || !Number.isInteger(id) || id < 1)
		throw new RpcException({ statusCode: 400, message: 'INVALID_ORDER_ID' });
	return id;
};

@Controller()
@SkipEncryption()
export class OrdersAdminRpcController {
	constructor(private readonly orders: OrdersService) {}

	@MessagePattern(ORDERS_ADMIN_LIST_PATTERN)
	list(@Payload() payload: AdminOrdersListQuery) {
		return rpc(() => this.orders.adminList(payload ?? {}));
	}

	@MessagePattern(ORDERS_ADMIN_GET_PATTERN)
	get(@Payload() payload: { id: unknown }) {
		return rpc(() => this.orders.adminGet(orderId(payload?.id)));
	}

	@MessagePattern(ORDERS_ADMIN_UPDATE_STATUS_PATTERN)
	updateStatus(@Payload() payload: { id: unknown; status: unknown }) {
		return rpc(() =>
			this.orders.adminUpdateStatus(orderId(payload?.id), payload?.status)
		);
	}
}
