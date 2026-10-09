import { CATALOG_VALIDATE_PRODUCTS_PATTERN } from '@/constants/catalog-rpc';
import { RABBITMQ_SERVICE } from '@/constants/rabbitmq';
import {
	Inject,
	Injectable,
	Logger,
	Optional,
	ServiceUnavailableException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
	CatalogProductReply,
	CatalogValidateReply,
	CatalogValidateRequest,
	ValidatedProduct,
} from './catalog-product.type';

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const DEFAULT_TIMEOUT_MS = 5000;

/** Request/reply to catalog-api over RabbitMQ; the only way orders-api reads product data. */
@Injectable()
export class CatalogClientService {
	private readonly logger = new Logger(CatalogClientService.name);

	constructor(
		@Optional()
		@Inject(RABBITMQ_SERVICE)
		private readonly client?: ClientProxy
	) {}

	/** Returns validated products in the order of `codes`; throws 503 if catalog is unreachable, 422 if any is unknown or unavailable. */
	async validateProducts(codes: string[]): Promise<ValidatedProduct[]> {
		const unique = [...new Set(codes)];
		const reply = await this.request(unique);
		const byCode = new Map(reply.items.map((item) => [item.code, item]));
		const invalid = unique.filter((code) => !this.isUsable(byCode.get(code)));
		if (invalid.length)
			throw new UnprocessableEntityException({
				message: 'PRODUCT_UNAVAILABLE',
				productCodes: invalid,
			});
		return unique.map((code) => this.toValidated(byCode.get(code)));
	}

	private async request(codes: string[]): Promise<CatalogValidateReply> {
		if (!this.client) throw this.unavailable('RabbitMQ is disabled');
		const ms = Number(process.env.CATALOG_RPC_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
		try {
			const reply = await firstValueFrom(
				this.client
					.send<
						CatalogValidateReply,
						CatalogValidateRequest
					>(CATALOG_VALIDATE_PRODUCTS_PATTERN, { codes })
					.pipe(timeout(ms))
			);
			if (!Array.isArray(reply?.items))
				throw new Error('Malformed catalog reply');
			return reply;
		} catch (error) {
			throw this.unavailable(
				error instanceof Error ? error.message : String(error)
			);
		}
	}

	private unavailable(reason: string) {
		this.logger.warn(`catalog request failed: ${reason}`);
		return new ServiceUnavailableException('CATALOG_UNAVAILABLE');
	}

	private isUsable(item?: CatalogProductReply): boolean {
		return Boolean(
			item?.found &&
			item.available &&
			item.title &&
			item.endsAt &&
			!Number.isNaN(Date.parse(item.endsAt)) &&
			item.price &&
			DECIMAL_PATTERN.test(item.price.usd) &&
			DECIMAL_PATTERN.test(item.price.jpy)
		);
	}

	private toValidated(item: CatalogProductReply): ValidatedProduct {
		return {
			code: item.code,
			title: item.title,
			sellerName: item.sellerName ?? '',
			status: item.status ?? '',
			endsAt: new Date(item.endsAt),
			unitPrice: item.price.usd,
			unitPriceJpy: item.price.jpy,
			exchangedAt: item.price.exchangedAt
				? new Date(item.price.exchangedAt)
				: null,
		};
	}
}
