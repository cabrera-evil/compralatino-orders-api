import { PrismaClient } from 'prisma/generated/client';

type Seed = { code: string; label: string; description: string };

const ORDER_STATUSES: Seed[] = [
	{
		code: 'pending',
		label: 'Pendiente',
		description: 'Solicitud recibida, en espera de confirmación.',
	},
	{
		code: 'confirmed',
		label: 'Confirmado',
		description: 'Pedido confirmado.',
	},
	{
		code: 'failed',
		label: 'Fallido',
		description: 'El pedido no pudo completarse.',
	},
	{
		code: 'cancelled',
		label: 'Cancelado',
		description: 'Pedido cancelado.',
	},
];

const TRACKING_STATES: Seed[] = [
	{ code: 'won', label: 'Puja ganada', description: 'Yahoo Auctions JP' },
	{
		code: 'tokyo',
		label: 'Bodega Tokio',
		description: 'Inspección y embalaje',
	},
	{
		code: 'customs',
		label: 'Trámite aduana SV',
		description: 'En curso en Aeropuerto SAL',
	},
	{
		code: 'delivery',
		label: 'Entrega final',
		description: 'Domicilio San Salvador',
	},
];

export const seedOrderCatalogs = async (prisma: PrismaClient) => {
	for (const [sortOrder, { code, ...rest }] of ORDER_STATUSES.entries()) {
		await prisma.orderStatusRef.upsert({
			where: { code },
			update: { ...rest, sortOrder },
			create: { code, ...rest, sortOrder },
		});
	}
	for (const [sortOrder, { code, ...rest }] of TRACKING_STATES.entries()) {
		await prisma.trackingState.upsert({
			where: { code },
			update: { ...rest, sortOrder },
			create: { code, ...rest, sortOrder },
		});
	}
	console.log('[seed:order-catalogs] upserted statuses and tracking states');
};
