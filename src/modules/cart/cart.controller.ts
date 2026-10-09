import { Auth } from '@/decorators/auth.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { AuthUser } from '@/types/jwt-payload.type';
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@Auth()
@Controller({ path: 'cart', version: '1' })
export class CartController {
	constructor(private readonly cartService: CartService) {}

	@ApiOperation({ summary: "List the caller's cart" })
	@Get()
	findAll(@CurrentUser() user: AuthUser) {
		return this.cartService.findAll(user.id);
	}

	@ApiOperation({
		summary: 'Add a product (validated against catalog); repeats add quantity',
	})
	@Post('items')
	add(@CurrentUser() user: AuthUser, @Body() dto: AddCartItemDto) {
		return this.cartService.add(user.id, dto);
	}

	@ApiOperation({ summary: 'Set the quantity of a cart item' })
	@Patch('items/:productCode')
	update(
		@CurrentUser() user: AuthUser,
		@Param('productCode') productCode: string,
		@Body() dto: UpdateCartItemDto
	) {
		return this.cartService.updateQuantity(user.id, productCode, dto.quantity);
	}

	@ApiOperation({ summary: 'Remove a cart item' })
	@Delete('items/:productCode')
	remove(
		@CurrentUser() user: AuthUser,
		@Param('productCode') productCode: string
	) {
		return this.cartService.remove(user.id, productCode);
	}
}
