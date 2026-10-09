import { MAX_CART_ITEM_QUANTITY } from '@/constants/orders';
import { CatalogClientService } from '@/modules/catalog-client/catalog-client.service';
import { singleResponse } from '@/utils/response.util';
import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/client';
import { serializeCartItem } from './cart.serializer';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Injectable()
export class CartService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly catalog: CatalogClientService
	) {}

	async findAll(userId: number) {
		const items = await this.prisma.cartItem.findMany({
			where: { userId },
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
		});
		return singleResponse(items.map(serializeCartItem));
	}

	async add(userId: number, { productCode, quantity = 1 }: AddCartItemDto) {
		const [product] = await this.catalog.validateProducts([productCode]);
		const snapshot = {
			title: product.title,
			sellerName: product.sellerName,
			productStatus: product.status,
			endsAt: product.endsAt,
			unitPrice: product.unitPrice,
			unitPriceJpy: product.unitPriceJpy,
			exchangedAt: product.exchangedAt,
		};
		const item = await this.prisma.$transaction(async (tx) => {
			const row = await tx.cartItem.upsert({
				where: { userId_productCode: { userId, productCode } },
				create: { userId, productCode, quantity, ...snapshot },
				update: { quantity: { increment: quantity }, ...snapshot },
			});
			if (row.quantity > MAX_CART_ITEM_QUANTITY)
				throw new BadRequestException('CART_QUANTITY_EXCEEDED');
			return row;
		});
		return singleResponse(serializeCartItem(item));
	}

	async updateQuantity(userId: number, productCode: string, quantity: number) {
		const { count } = await this.prisma.cartItem.updateMany({
			where: { userId, productCode },
			data: { quantity },
		});
		if (!count) throw new NotFoundException('CART_ITEM_NOT_FOUND');
		const item = await this.prisma.cartItem.findUnique({
			where: { userId_productCode: { userId, productCode } },
		});
		if (!item) throw new NotFoundException('CART_ITEM_NOT_FOUND');
		return singleResponse(serializeCartItem(item));
	}

	async remove(userId: number, productCode: string) {
		const { count } = await this.prisma.cartItem.deleteMany({
			where: { userId, productCode },
		});
		if (!count) throw new NotFoundException('CART_ITEM_NOT_FOUND');
		return singleResponse({ id: productCode });
	}
}
