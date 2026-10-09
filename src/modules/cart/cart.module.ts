import { CatalogClientModule } from '@/modules/catalog-client/catalog-client.module';
import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
	imports: [CatalogClientModule],
	controllers: [CartController],
	providers: [CartService],
})
export class CartModule {}
