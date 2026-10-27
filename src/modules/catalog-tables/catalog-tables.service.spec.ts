import { PrismaClient } from 'prisma/generated/client';
import { CatalogTablesService } from './catalog-tables.service';

describe('CatalogTablesService', () => {
	const prisma = {
		checkoutOption: { findMany: jest.fn() },
		orderStatusRef: { findMany: jest.fn() },
		trackingState: { findMany: jest.fn() },
	};
	const service = new CatalogTablesService(prisma as unknown as PrismaClient);

	beforeEach(() => jest.clearAllMocks());

	it('groups active checkout options by kind', async () => {
		prisma.checkoutOption.findMany.mockResolvedValue([
			{
				kind: 'DELIVERY_METHOD',
				code: 'courier',
				label: 'Courier',
				description: null,
			},
			{
				kind: 'PAYMENT_METHOD',
				code: 'card',
				label: 'Card',
				description: 'Visa',
			},
			{ kind: 'PICKUP_POINT', code: 'sv-1', label: 'Center', description: 'x' },
			{
				kind: 'DEPARTMENT',
				code: 'sv',
				label: 'San Salvador',
				description: null,
			},
		]);
		const { data } = await service.getCheckoutOptions();
		expect(prisma.checkoutOption.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { active: true } })
		);
		expect(data).toEqual({
			deliveryMethods: [{ code: 'courier', label: 'Courier', description: '' }],
			paymentMethods: [{ code: 'card', label: 'Card', description: 'Visa' }],
			pickupPoints: [{ code: 'sv-1', label: 'Center' }],
			departments: ['San Salvador'],
		});
	});

	it('returns empty groups when nothing is active', async () => {
		prisma.checkoutOption.findMany.mockResolvedValue([]);
		const { data } = await service.getCheckoutOptions();
		expect(data).toEqual({
			deliveryMethods: [],
			paymentMethods: [],
			pickupPoints: [],
			departments: [],
		});
	});

	it('activeCodes returns a Set of active codes of one kind', async () => {
		prisma.checkoutOption.findMany.mockResolvedValue([
			{ code: 'a' },
			{ code: 'b' },
		]);
		const codes = await service.activeCodes('PAYMENT_METHOD');
		expect(codes).toEqual(new Set(['a', 'b']));
		expect(prisma.checkoutOption.findMany).toHaveBeenCalledWith({
			where: { kind: 'PAYMENT_METHOD', active: true },
			select: { code: true },
		});
	});

	it('statusLabels maps code to label', async () => {
		prisma.orderStatusRef.findMany.mockResolvedValue([
			{ code: 'pending', label: 'Pendiente' },
		]);
		expect((await service.statusLabels()).get('pending')).toBe('Pendiente');
	});

	it('trackingStates orders by sortOrder', async () => {
		prisma.trackingState.findMany.mockResolvedValue([]);
		await service.trackingStates();
		expect(prisma.trackingState.findMany).toHaveBeenCalledWith({
			orderBy: { sortOrder: 'asc' },
		});
	});
});
