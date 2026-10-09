import { MAX_CART_ITEM_QUANTITY } from '@/constants/orders';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from 'class-validator';

export class AddCartItemDto {
	@ApiProperty({ example: 'ya-882190', description: 'Catalog product code' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(64)
	productCode: string;

	@ApiPropertyOptional({ default: 1, maximum: MAX_CART_ITEM_QUANTITY })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(MAX_CART_ITEM_QUANTITY)
	quantity?: number;
}
