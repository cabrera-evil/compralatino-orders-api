import { adapter } from '@/modules/prisma/prisma.service';
import { PrismaClient } from 'prisma/generated/client';
import { seedCheckoutOptions } from './checkout-options';
import { seedOrderCatalogs } from './order-catalogs';

const prisma = new PrismaClient({
	adapter,
	log: [
		{ emit: 'event', level: 'query' },
		{ emit: 'stdout', level: 'error' },
		{ emit: 'stdout', level: 'info' },
		{ emit: 'stdout', level: 'warn' },
	],
});

const main = async () => {
	console.log('[seed] starting...');
	try {
		await seedCheckoutOptions(prisma);
		await seedOrderCatalogs(prisma);
		console.log('[seed] done');
	} catch (error) {
		console.error('[seed] failed', error);
		process.exitCode = 1;
	} finally {
		await prisma.$disconnect();
	}
};

void main();
