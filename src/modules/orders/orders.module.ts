import { CatalogTablesModule } from '@/modules/catalog-tables/catalog-tables.module';
import { EventsModule } from '@/modules/events/events.module';
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
	imports: [CatalogTablesModule, EventsModule],
	controllers: [OrdersController],
	providers: [OrdersService],
	exports: [OrdersService],
})
export class OrdersModule {}
