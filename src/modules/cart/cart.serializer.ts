import { toDualMoney } from '@/utils/money.util';
import { CartItem } from 'prisma/generated/client';

export const serializeCartItem = (item: CartItem) => ({
	id: item.productCode,
	productId: item.productCode,
	title: item.title,
	sellerName: item.sellerName,
	quantity: item.quantity,
	bid: toDualMoney(item.unitPrice, item.unitPriceJpy, item.exchangedAt),
	status: item.productStatus,
	endsAt: item.endsAt.toISOString(),
});
