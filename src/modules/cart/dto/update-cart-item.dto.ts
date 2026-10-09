import { MAX_CART_ITEM_QUANTITY } from '@/constants/orders';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
	@ApiProperty({ minimum: 1, maximum: MAX_CART_ITEM_QUANTITY })
	@IsInt()
	@Min(1)
	@Max(MAX_CART_ITEM_QUANTITY)
	quantity: number;
}
