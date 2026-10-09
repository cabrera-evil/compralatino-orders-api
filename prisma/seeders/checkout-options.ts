import { CheckoutOptionKind, PrismaClient } from 'prisma/generated/client';

type Seed = {
	kind: CheckoutOptionKind;
	code: string;
	label: string;
	description?: string;
};

const DEPARTMENTS = [
	['ahuachapan', 'Ahuachapán'],
	['cabanas', 'Cabañas'],
	['chalatenango', 'Chalatenango'],
	['cuscatlan', 'Cuscatlán'],
	['la-libertad', 'La Libertad'],
	['la-paz', 'La Paz'],
	['la-union', 'La Unión'],
	['morazan', 'Morazán'],
	['san-miguel', 'San Miguel'],
	['san-salvador', 'San Salvador'],
	['san-vicente', 'San Vicente'],
	['santa-ana', 'Santa Ana'],
	['sonsonate', 'Sonsonate'],
	['usulutan', 'Usulután'],
] as const;

const OPTIONS: Seed[] = [
	{
		kind: 'DELIVERY_METHOD',
		code: 'home_delivery',
		label: 'Entrega a domicilio',
		description: 'Entrega en la dirección que indiques en El Salvador.',
	},
	{
		kind: 'DELIVERY_METHOD',
		code: 'pickup',
		label: 'Retiro en punto autorizado',
		description: 'Retira tu paquete en un punto de entrega autorizado.',
	},
	{
		kind: 'PAYMENT_METHOD',
		code: 'card',
		label: 'Tarjeta de crédito / débito (Visa o Mastercard)',
		description: 'Sin recargo internacional.',
	},
	{
		kind: 'PAYMENT_METHOD',
		code: 'chivo',
		label: 'Chivo Wallet (USD / Bitcoin Lightning)',
		description: '0% comisión de pasarela.',
	},
	{
		kind: 'PAYMENT_METHOD',
		code: 'bank',
		label: 'Transferencia bancaria local UNI / Transfer365',
		description: 'Banco Agrícola, BAC Credomatic o Davivienda.',
	},
	{
		kind: 'PICKUP_POINT',
		code: 'santa-tecla',
		label: 'Santa Tecla, La Libertad',
	},
	{
		kind: 'PICKUP_POINT',
		code: 'san-salvador',
		label: 'San Salvador, Centro',
	},
	{ kind: 'PICKUP_POINT', code: 'san-miguel', label: 'San Miguel, Oriente' },
	...DEPARTMENTS.map(
		([code, label]): Seed => ({ kind: 'DEPARTMENT', code, label })
	),
];

export const seedCheckoutOptions = async (prisma: PrismaClient) => {
	for (const [sortOrder, { kind, code, ...rest }] of OPTIONS.entries()) {
		await prisma.checkoutOption.upsert({
			where: { kind_code: { kind, code } },
			update: { ...rest, sortOrder },
			create: { kind, code, ...rest, sortOrder },
		});
	}
	console.log(`[seed:checkout-options] upserted ${OPTIONS.length}`);
};
