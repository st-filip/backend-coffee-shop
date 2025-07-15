import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createOrderDto: CreateOrderDto) {
    const items = await Promise.all(
      createOrderDto.orderItems.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) throw new NotFoundException('Product not found');
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
        };
      }),
    );

    const total = items.reduce(
      (acc, item) => acc + item.unitPrice * item.quantity,
      0,
    );

    const order = await this.prisma.order.create({
      data: {
        userId,
        total,
        orderItems: {
          create: items,
        },
      },
      include: {
        orderItems: true,
      },
    });

    return order;
  }

  findAll() {
    return this.prisma.order.findMany({
      include: {
        orderItems: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status: updateOrderDto.status,
      },
    });
  }

  remove(id: number) {
    return this.prisma.order.delete({
      where: { id },
    });
  }

  async findByUserId(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { orderItems: true },
    });
  }

  async findOneForUser(userId: number, id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!order || order.userId !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    return order;
  }
}
