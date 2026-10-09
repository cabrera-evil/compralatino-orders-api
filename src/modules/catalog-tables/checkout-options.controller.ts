import { Auth } from '@/decorators/auth.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogTablesService } from './catalog-tables.service';

@ApiTags('checkout-options')
@Controller({ path: 'checkout-options', version: '1' })
export class CheckoutOptionsController {
	constructor(private readonly catalogTables: CatalogTablesService) {}

	@Auth()
	@ApiOperation({
		summary: 'Delivery/payment methods, pickup points and departments',
	})
	@Get()
	findAll() {
		return this.catalogTables.getCheckoutOptions();
	}
}
