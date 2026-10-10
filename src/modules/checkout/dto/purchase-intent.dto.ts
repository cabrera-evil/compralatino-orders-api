import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
	IsIn,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
} from 'class-validator';
import { CheckoutDto } from './checkout.dto';

export const PURCHASE_INTENT_SOURCES = ['bid', 'buy_now'] as const;

/** Same delivery/payment/pickup/destination/contact rules as the cart checkout. */
export class PurchaseIntentDto extends OmitType(CheckoutDto, [
	'itemIds',
] as const) {
	@ApiProperty({ example: 'ya-882190', description: 'Catalog product code' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(64)
	productCode: string;

	@ApiProperty({ enum: PURCHASE_INTENT_SOURCES })
	@IsIn(PURCHASE_INTENT_SOURCES)
	source: (typeof PURCHASE_INTENT_SOURCES)[number];

	@ApiPropertyOptional({
		example: '1250.50',
		description:
			'USD, positive, max 2 decimals. Required when source=bid; ignored for buy_now',
	})
	@IsOptional()
	@Transform(({ value }) => (typeof value === 'number' ? String(value) : value))
	@IsString()
	@Matches(/^(?!0+(\.0+)?$)\d{1,8}(\.\d{1,2})?$/)
	bidAmount?: string;
}
