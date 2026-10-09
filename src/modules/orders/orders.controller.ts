import { Auth } from '@/decorators/auth.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { RisonQuery } from '@/decorators/rison-query.decorator';
import { AuthUser } from '@/types/jwt-payload.type';
import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrdersListQuery, OrdersService } from './orders.service';
import { ParseOrderIdPipe } from './parse-order-id.pipe';

@ApiTags('orders')
@Auth()
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	@ApiOperation({ summary: "List the caller's orders (newest first)" })
	@ApiQuery({
		name: 'q',
		required: false,
		description:
			'Rison: (page:1,pageSize:10,status:pending); status in pending|confirmed|failed|cancelled',
	})
	@Get()
	findAll(
		@CurrentUser() user: AuthUser,
		@RisonQuery({ paginate: true }) query: OrdersListQuery
	) {
		return this.ordersService.findAll(user.id, query);
	}

	@ApiOperation({ summary: "Get one of the caller's orders (404 otherwise)" })
	@Get(':id')
	findOne(
		@CurrentUser() user: AuthUser,
		@Param('id', ParseOrderIdPipe) id: number
	) {
		return this.ordersService.findOne(user.id, id);
	}

	@ApiOperation({ summary: "Cancel the caller's pending order" })
	@HttpCode(200)
	@Post(':id/cancel')
	cancel(
		@CurrentUser() user: AuthUser,
		@Param('id', ParseOrderIdPipe) id: number
	) {
		return this.ordersService.cancel(user.id, id);
	}
}
