import { SkipEncryption } from '@/decorators/skip-encryption.decorator';
import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentsService } from './payments.service';

/**
 * Simulated provider callbacks (card / chivo / bank). Deliberately unauthenticated:
 * real providers must sign their requests, so add signature verification before
 * wiring any of them.
 */
@ApiTags('payments')
@SkipEncryption()
@Controller({ path: 'webhooks/payments', version: '1' })
export class PaymentsController {
	constructor(private readonly payments: PaymentsService) {}

	@ApiOperation({
		summary:
			'Simulate a payment notification (paid | failed | expired | underpaid | overpaid) for card, chivo or bank',
	})
	@HttpCode(200)
	@Post(':channel')
	handle(@Param('channel') channel: string, @Body() dto: PaymentWebhookDto) {
		return this.payments.handle(channel, dto);
	}
}
