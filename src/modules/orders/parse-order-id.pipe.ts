import { MAX_INT4 } from '@/constants/orders';
import {
	ArgumentMetadata,
	NotFoundException,
	ParseIntPipe,
} from '@nestjs/common';

export class ParseOrderIdPipe extends ParseIntPipe {
	async transform(value: string, metadata: ArgumentMetadata): Promise<number> {
		const id = await super.transform(value, metadata);
		if (id < 1 || id > MAX_INT4) throw new NotFoundException('ORDER_NOT_FOUND');
		return id;
	}
}
