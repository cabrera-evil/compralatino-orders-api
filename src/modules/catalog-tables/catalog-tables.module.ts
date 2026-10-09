import { Module } from '@nestjs/common';
import { CatalogTablesService } from './catalog-tables.service';
import { CheckoutOptionsController } from './checkout-options.controller';

@Module({
	controllers: [CheckoutOptionsController],
	providers: [CatalogTablesService],
	exports: [CatalogTablesService],
})
export class CatalogTablesModule {}
