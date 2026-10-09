import { singleResponse } from '@/utils/response.util';
import { Injectable } from '@nestjs/common';
import { CheckoutOptionKind, PrismaClient } from 'prisma/generated/client';

@Injectable()
export class CatalogTablesService {
	constructor(private readonly prisma: PrismaClient) {}

	async getCheckoutOptions() {
		const rows = await this.prisma.checkoutOption.findMany({
			where: { active: true },
			orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
		});
		const ofKind = (kind: CheckoutOptionKind) =>
			rows.filter((row) => row.kind === kind);
		const withDescription = ({ code, label, description }) => ({
			code,
			label,
			description: description ?? '',
		});
		return singleResponse({
			deliveryMethods: ofKind('DELIVERY_METHOD').map(withDescription),
			paymentMethods: ofKind('PAYMENT_METHOD').map(withDescription),
			pickupPoints: ofKind('PICKUP_POINT').map(({ code, label }) => ({
				code,
				label,
			})),
			departments: ofKind('DEPARTMENT').map(({ label }) => label),
		});
	}

	/** Active option codes of a kind, used to validate checkout input. */
	async activeCodes(kind: CheckoutOptionKind): Promise<Set<string>> {
		const rows = await this.prisma.checkoutOption.findMany({
			where: { kind, active: true },
			select: { code: true },
		});
		return new Set(rows.map(({ code }) => code));
	}

	async statusLabels(): Promise<Map<string, string>> {
		const rows = await this.prisma.orderStatusRef.findMany();
		return new Map(rows.map(({ code, label }) => [code, label]));
	}

	trackingStates() {
		return this.prisma.trackingState.findMany({
			orderBy: { sortOrder: 'asc' },
		});
	}
}
