import { OrdersModule } from '@/modules/orders/orders.module';
import { Module } from '@nestjs/common';
import { OrdersAdminRpcController } from './orders-admin-rpc.controller';

@Module({
	imports: [OrdersModule],
	controllers: [OrdersAdminRpcController],
})
export class OrdersAdminRpcModule {}
