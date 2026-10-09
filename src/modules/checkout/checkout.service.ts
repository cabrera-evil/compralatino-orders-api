import { CatalogClientService } from '@/modules/catalog-client/catalog-client.service';
import { ValidatedProduct } from '@/modules/catalog-client/catalog-product.type';
import { CatalogTablesService } from '@/modules/catalog-tables/catalog-tables.service';
import { buildOrderCreatedEvent } from '@/modules/events/order-event.builder';
import { OrderEventsPublisher } from '@/modules/events/order-events.publisher';
import { ORDER_INCLUDE, OrdersService } from '@/modules/orders/orders.service';
import { sumDecimals } from '@/utils/money.util';
import { singleResponse } from '@/utils/response.util';
import {
	BadRequestException,
	ConflictException,
	Injectable,
} from '@nestjs/common';
import {
	CartItem,
	CheckoutOptionKind,
	Prisma,
	PrismaClient,
	PurchaseIntentSource,
} from 'prisma/generated/client';
import { CheckoutDto } from './dto/checkout.dto';
import { PurchaseIntentDto } from './dto/purchase-intent.dto';

type OrderLine = { product: ValidatedProduct; quantity: number };

@Injectable()
export class CheckoutService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly catalog: CatalogClientService,
		private readonly catalogTables: CatalogTablesService,
		private readonly orders: OrdersService,
		private readonly events: OrderEventsPublisher
	) {}

	async checkout(userId: number, dto: CheckoutDto) {
		await this.assertOptions(dto);
		const cart = await this.loadCart(userId, dto.itemIds);
		const products = await this.catalog.validateProducts(
			cart.map(({ productCode }) => productCode)
		);
		const byCode = new Map(products.map((p) => [p.code, p]));
		const lines = cart.map(({ productCode, quantity }) => ({
			product: byCode.get(productCode),
			quantity,
		}));

		// Deleting the exact cart rows first is the double-submit guard: a concurrent twin blocks, then sees count 0
		const order = await this.prisma.$transaction(async (tx) => {
			const { count } = await tx.cartItem.deleteMany({
				where: {
					userId,
					OR: cart.map(({ productCode, quantity }) => ({
						productCode,
						quantity,
					})),
				},
			});
			if (count !== cart.length) throw new ConflictException('CART_CHANGED');
			return this.createOrder(tx, userId, lines, {
				deliveryMethodCode: dto.deliveryMethod,
				paymentMethodCode: dto.paymentMethod,
				pickupPointCode: dto.pickupPoint,
				destination: dto.destination,
				contactFullName: dto.contact.fullName,
				contactPhone: dto.contact.phone,
				contactEmail: dto.contact.email,
			});
		});
		return this.finish(order);
	}

	async createIntent(userId: number, dto: PurchaseIntentDto) {
		const [product] = await this.catalog.validateProducts([dto.productCode]);
		const order = await this.prisma.$transaction((tx) =>
			this.createOrder(tx, userId, [{ product, quantity: 1 }], {
				intentSource: dto.source.toUpperCase() as PurchaseIntentSource,
			})
		);
		return this.finish(order);
	}

	private async finish(
		order: Awaited<ReturnType<CheckoutService['createOrder']>>
	) {
		this.events.publishOrderCreated(buildOrderCreatedEvent(order));
		return singleResponse(await this.orders.serialize(order));
	}

	private async createOrder(
		tx: Prisma.TransactionClient,
		userId: number,
		lines: OrderLine[],
		extra: Partial<Prisma.OrderUncheckedCreateInput>
	) {
		const priced = lines.map(({ product, quantity }) => {
			const factor = new Prisma.Decimal(quantity);
			return {
				product,
				quantity,
				unitPrice: new Prisma.Decimal(product.unitPrice),
				unitPriceJpy: new Prisma.Decimal(product.unitPriceJpy),
				factor,
			};
		});
		return tx.order.create({
			data: {
				userId,
				...extra,
				totalAmount: sumDecimals(
					priced.map((l) => l.unitPrice.times(l.factor))
				),
				totalAmountJpy: sumDecimals(
					priced.map((l) => l.unitPriceJpy.times(l.factor))
				),
				items: {
					create: priced.map((l) => ({
						productCode: l.product.code,
						title: l.product.title,
						quantity: l.quantity,
						unitPrice: l.unitPrice,
						unitPriceJpy: l.unitPriceJpy,
					})),
				},
			},
			include: ORDER_INCLUDE,
		});
	}

	private async loadCart(
		userId: number,
		itemIds?: string[]
	): Promise<CartItem[]> {
		const cart = await this.prisma.cartItem.findMany({
			where: { userId, ...(itemIds && { productCode: { in: itemIds } }) },
			orderBy: { id: 'asc' },
		});
		if (!cart.length) throw new BadRequestException('EMPTY_CART');
		if (itemIds && cart.length !== itemIds.length)
			throw new BadRequestException('CART_ITEM_NOT_FOUND');
		return cart;
	}

	private async assertOptions(dto: CheckoutDto) {
		if (!dto.pickupPoint && !dto.destination)
			throw new BadRequestException('DESTINATION_REQUIRED');
		const [delivery, payment, pickup] = await Promise.all([
			this.catalogTables.activeCodes(CheckoutOptionKind.DELIVERY_METHOD),
			this.catalogTables.activeCodes(CheckoutOptionKind.PAYMENT_METHOD),
			this.catalogTables.activeCodes(CheckoutOptionKind.PICKUP_POINT),
		]);
		if (!delivery.has(dto.deliveryMethod))
			throw new BadRequestException('INVALID_DELIVERY_METHOD');
		if (!payment.has(dto.paymentMethod))
			throw new BadRequestException('INVALID_PAYMENT_METHOD');
		if (dto.pickupPoint && !pickup.has(dto.pickupPoint))
			throw new BadRequestException('INVALID_PICKUP_POINT');
	}
}
