import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  Min,
  IsPositive,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}
