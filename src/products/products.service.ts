import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class ProductsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(private prisma: PrismaService) {}

  create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({ data: createProductDto });
  }

  findAll() {
    return this.prisma.product.findMany();
  }

  findOne(id: number) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  remove(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }

  async uploadImage(productId: number, file: Express.Multer.File) {
    const filePath = `products/${productId}_${Date.now()}.jpg`;

    const { error } = await this.supabase.storage
      .from('coffee-shop-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw error;

    const { data } = this.supabase.storage
      .from('coffee-shop-images')
      .getPublicUrl(filePath);

    await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl: data.publicUrl },
    });

    return { imageUrl: data.publicUrl };
  }
}
