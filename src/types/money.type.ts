export type Money<C extends string> = { amount: number; currency: C };

export type DualMoney = {
	usd: Money<'USD'>;
	jpy: Money<'JPY'> | null;
	exchangedAt?: string;
};
