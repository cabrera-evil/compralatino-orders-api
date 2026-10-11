import { MAX_INT4 } from '@/constants/orders';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
	IsIn,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	Max,
	MaxLength,
	Min,
} from 'class-validator';

export const PAYMENT_CHANNELS = ['card', 'chivo', 'bank'] as const;
export const PAYMENT_OUTCOMES = [
	'paid',
	'failed',
	'expired',
	'underpaid',
	'overpaid',
] as const;

export type PaymentOutcome = (typeof PAYMENT_OUTCOMES)[number];

export class PaymentWebhookDto {
	@ApiProperty({ description: 'Provider event id; replays are ignored' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(64)
	eventId: string;

	@ApiProperty()
	@IsInt()
	@Min(1)
	@Max(MAX_INT4)
	orderId: number;

	@ApiProperty({ enum: PAYMENT_OUTCOMES })
	@IsIn(PAYMENT_OUTCOMES)
	outcome: PaymentOutcome;

	@ApiPropertyOptional({
		description:
			'Amount actually received (USD). Required for underpaid/overpaid; defaults to the order total when paid',
	})
	@IsOptional()
	@Transform(({ value }) => (typeof value === 'number' ? String(value) : value))
	@IsString()
	@Matches(/^(?!0+(\.0+)?$)\d{1,8}(\.\d{1,2})?$/)
	amountReceived?: string;
}
