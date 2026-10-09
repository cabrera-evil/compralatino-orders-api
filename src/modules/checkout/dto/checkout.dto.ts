import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	ArrayMinSize,
	ArrayUnique,
	IsArray,
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
	ValidateNested,
} from 'class-validator';

const PHONE_PATTERN = /^\+?[\d\s-]{8,15}$/;
const NAME_MIN_LENGTH = 3;

export class CheckoutContactDto {
	@ApiProperty()
	@IsString()
	@MinLength(NAME_MIN_LENGTH)
	@MaxLength(255)
	fullName: string;

	@ApiProperty({ example: '+503 7000-0000' })
	@Matches(PHONE_PATTERN)
	phone: string;

	@ApiProperty()
	@IsEmail()
	@MaxLength(255)
	email: string;
}

export class CheckoutDto {
	@ApiPropertyOptional({
		type: [String],
		description: 'Cart item ids (product codes); omitted = whole cart',
	})
	@IsOptional()
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(50)
	@ArrayUnique()
	@IsString({ each: true })
	@IsNotEmpty({ each: true })
	itemIds?: string[];

	@ApiProperty({ description: 'Code from GET /checkout-options' })
	@IsString()
	@IsNotEmpty()
	deliveryMethod: string;

	@ApiProperty({ description: 'Code from GET /checkout-options' })
	@IsString()
	@IsNotEmpty()
	paymentMethod: string;

	@ApiPropertyOptional({ description: 'Pickup point code' })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	pickupPoint?: string;

	@ApiPropertyOptional({ description: 'Free-text delivery destination' })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(1000)
	destination?: string;

	@ApiProperty({ type: CheckoutContactDto })
	@ValidateNested()
	@Type(() => CheckoutContactDto)
	contact: CheckoutContactDto;
}
