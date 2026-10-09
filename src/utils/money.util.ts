import { DualMoney } from '@/types/money.type';
import { Prisma } from 'prisma/generated/client';

type Amount = Prisma.Decimal | null | undefined;

// Numbers appear only at serialization time; all arithmetic stays in Decimal.
export const toDualMoney = (
	usd: Prisma.Decimal,
	jpy: Amount,
	exchangedAt?: Date | null
): DualMoney => ({
	usd: { amount: usd.toNumber(), currency: 'USD' },
	jpy: jpy ? { amount: jpy.toNumber(), currency: 'JPY' } : null,
	...(exchangedAt && { exchangedAt: exchangedAt.toISOString() }),
});

export const sumDecimals = (values: Prisma.Decimal[]): Prisma.Decimal =>
	values.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0));
