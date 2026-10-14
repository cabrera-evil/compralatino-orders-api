import { EventsModule } from '@/modules/events/events.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
	imports: [EventsModule, OrdersModule],
	controllers: [PaymentsController],
	providers: [PaymentsService],
})
export class PaymentsModule {}
