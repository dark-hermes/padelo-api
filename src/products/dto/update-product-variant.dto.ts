import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductVariantDto } from './create-product-variant.dto';

export class UpdateProductVariantDto extends PartialType(
  OmitType(CreateProductVariantDto, ['productId'] as const),
) {}
