import { OrdersService } from '@/modules/orders/orders.service';
import { ConflictException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { OrdersAdminRpcController } from './orders-admin-rpc.controller';

describe('OrdersAdminRpcController', () => {
	const orders = {
		adminList: jest.fn().mockResolvedValue({ data: [] }),
		adminAnalytics: jest.fn().mockResolvedValue({ data: {} }),
		adminGet: jest.fn().mockResolvedValue({ id: 7 }),
		adminUpdateStatus: jest.fn().mockResolvedValue({ id: 7 }),
	};
	const controller = new OrdersAdminRpcController(
		orders as unknown as OrdersService
	);

	beforeEach(() => jest.clearAllMocks());

	it('list/analytics default a missing payload to {}', async () => {
		await controller.list(undefined as never);
		await controller.analytics(undefined as never);
		expect(orders.adminList).toHaveBeenCalledWith({});
		expect(orders.adminAnalytics).toHaveBeenCalledWith({});
	});

	it('get and updateStatus forward a valid integer id', async () => {
		await expect(controller.get({ id: 7 })).resolves.toEqual({ id: 7 });
		await controller.updateStatus({ id: 7, status: 'confirmed' });
		expect(orders.adminUpdateStatus).toHaveBeenCalledWith(7, 'confirmed');
	});

	it.each([[0], [-1], [1.5], ['7'], [null], [undefined]])(
		'rejects invalid order id %p with a 400 RpcException',
		async (id) => {
			const run = controller.get({ id });
			await expect(run).rejects.toBeInstanceOf(RpcException);
			await expect(run).rejects.toMatchObject({
				error: { statusCode: 400, message: 'INVALID_ORDER_ID' },
			});
			expect(orders.adminGet).not.toHaveBeenCalled();
		}
	);

	it('rejects a missing payload on updateStatus', async () => {
		await expect(
			controller.updateStatus(undefined as never)
		).rejects.toBeInstanceOf(RpcException);
	});

	it('maps domain HttpExceptions to RpcException with the status', async () => {
		orders.adminUpdateStatus.mockRejectedValue(
			new ConflictException('ORDER_NOT_PENDING')
		);
		await expect(
			controller.updateStatus({ id: 7, status: 'cancelled' })
		).rejects.toMatchObject({
			error: { statusCode: 409, message: 'ORDER_NOT_PENDING' },
		});
	});

	it('rethrows unexpected errors untouched', async () => {
		const boom = new Error('db down');
		orders.adminList.mockRejectedValue(boom);
		await expect(controller.list({})).rejects.toBe(boom);
	});
});
