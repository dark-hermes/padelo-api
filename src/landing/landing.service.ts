import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLandingDto } from './dto/create-landing.dto';
import { UpdateLandingDto } from './dto/update-landing.dto';

const landingInclude = {
  reviews: true,
  imagesProduct: true,
  videos: true,
} satisfies Prisma.LandingInclude;

export type LandingWithRelations = Prisma.LandingGetPayload<{
  include: typeof landingInclude;
}>;

@Injectable()
export class LandingService {
  constructor(private prisma: PrismaService) {}

  create(createLandingDto: CreateLandingDto): Promise<LandingWithRelations> {
    // Support nested create for reviews/images/videos if provided
    const { reviews, images, videos, ...rest } = createLandingDto;

    const data: Prisma.LandingCreateInput = { ...rest };

    if (reviews && Array.isArray(reviews) && reviews.length > 0) {
      data.reviews = { create: reviews };
    }

    if (images && Array.isArray(images) && images.length > 0) {
      // Map incoming API 'images' to prisma relation 'imagesProduct'
      data.imagesProduct = {
        create: images.map((image) => ({
          ...image,
          price: new Prisma.Decimal(image.price),
        })),
      };
    }

    if (videos && Array.isArray(videos) && videos.length > 0) {
      data.videos = { create: videos };
    }

    return this.prisma.landing.create({
      data,
      include: landingInclude,
    });
  }

  findAll(): Promise<LandingWithRelations[]> {
    return this.prisma.landing.findMany({
      include: landingInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number): Promise<LandingWithRelations> {
    const landing = await this.prisma.landing.findUnique({
      where: { id },
      include: landingInclude,
    });

    if (!landing) {
      throw new NotFoundException(`Landing with ID "${id}" not found.`);
    }

    return landing;
  }

  async update(
    id: number,
    updateLandingDto: UpdateLandingDto,
  ): Promise<LandingWithRelations> {
    const existing = await this.prisma.landing.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Landing with ID "${id}" not found.`);
    }

    // For simplicity, only update root landing fields. Managing nested
    // reviews/images/videos individually can be added if required.
    const { reviews, images, videos, ...rest } = updateLandingDto;

    if (reviews || images || videos) {
      // Don't allow nested replacement in this simple implementation.
      throw new BadRequestException(
        'Updating nested reviews/images/videos via this endpoint is not supported. Use dedicated endpoints.',
      );
    }

    const data: Prisma.LandingUpdateInput = { ...rest };

    return this.prisma.landing.update({
      where: { id },
      data,
      include: landingInclude,
    });
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.landing.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Landing with ID "${id}" not found.`);
    }

    await this.prisma.landing.delete({ where: { id } });
  }
}
