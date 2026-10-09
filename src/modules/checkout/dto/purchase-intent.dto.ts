import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const PURCHASE_INTENT_SOURCES = ['bid', 'buy_now'] as const;

export class PurchaseIntentDto {
	@ApiProperty({ example: 'ya-882190', description: 'Catalog product code' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(64)
	productCode: string;

	@ApiProperty({ enum: PURCHASE_INTENT_SOURCES })
	@IsIn(PURCHASE_INTENT_SOURCES)
	source: (typeof PURCHASE_INTENT_SOURCES)[number];
}
