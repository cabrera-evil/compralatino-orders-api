import { Auth } from '@/decorators/auth.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { AuthUser } from '@/types/jwt-payload.type';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { PurchaseIntentDto } from './dto/purchase-intent.dto';

@ApiTags('checkout')
@Auth()
@Controller({ path: 'orders', version: '1' })
export class CheckoutController {
	constructor(private readonly checkoutService: CheckoutService) {}

	@ApiOperation({
		summary:
			'Checkout: create an order from the cart and clear it (503 CATALOG_UNAVAILABLE creates no order)',
	})
	@Post()
	checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
		return this.checkoutService.checkout(user.id, dto);
	}

	@ApiOperation({
		summary:
			'Record a pending bid / buy-now purchase intent (no YAuctions call)',
	})
	@Post('purchase-intents')
	createIntent(@CurrentUser() user: AuthUser, @Body() dto: PurchaseIntentDto) {
		return this.checkoutService.createIntent(user.id, dto);
	}
}
