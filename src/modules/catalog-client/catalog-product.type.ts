export type CatalogValidateRequest = { codes: string[] };

export type CatalogProductReply = {
	code: string;
	found: boolean;
	available: boolean;
	title?: string;
	sellerName?: string;
	status?: string;
	endsAt?: string;
	price?: { usd: string; jpy: string; exchangedAt?: string | null };
};

export type CatalogValidateReply = { items: CatalogProductReply[] };

export type ValidatedProduct = {
	code: string;
	title: string;
	sellerName: string;
	status: string;
	endsAt: Date;
	unitPrice: string;
	unitPriceJpy: string;
	exchangedAt: Date | null;
};
