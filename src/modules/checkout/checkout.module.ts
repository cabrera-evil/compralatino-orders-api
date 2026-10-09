import { CatalogClientModule } from '@/modules/catalog-client/catalog-client.module';
import { CatalogTablesModule } from '@/modules/catalog-tables/catalog-tables.module';
import { EventsModule } from '@/modules/events/events.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
	imports: [
		CatalogClientModule,
		CatalogTablesModule,
		EventsModule,
		OrdersModule,
	],
	controllers: [CheckoutController],
	providers: [CheckoutService],
})
export class CheckoutModule {}
