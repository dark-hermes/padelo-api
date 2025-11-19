import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLandingDto } from './dto/create-landing.dto';
import { UpdateLandingDto } from './dto/update-landing.dto';

@Injectable()
export class LandingService {
  constructor(private prisma: PrismaService) {}

  async create(createLandingDto: CreateLandingDto) {
    // Support nested create for reviews/images/videos if provided
  const { reviews, images, videos, ...rest } = createLandingDto as any;

    const data: any = { ...rest };

    if (reviews && Array.isArray(reviews) && reviews.length > 0) {
      data.reviews = { create: reviews };
    }

    if (images && Array.isArray(images) && images.length > 0) {
      // Map incoming API 'images' to prisma relation 'imagesProduct'
      data.imagesProduct = { create: images };
    }

    if (videos && Array.isArray(videos) && videos.length > 0) {
      data.videos = { create: videos };
    }

    return (this.prisma as any).landing.create({
      data,
      include: {
        reviews: true,
        imagesProduct: true,
        videos: true,
      },
    });
  }

  async findAll() {
    return (this.prisma as any).landing.findMany({
      include: {
        reviews: true,
        imagesProduct: true,
        videos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const landing = await (this.prisma as any).landing.findUnique({
      where: { id },
      include: {
        reviews: true,
        imagesProduct: true,
        videos: true,
      },
    });

    if (!landing) {
      throw new NotFoundException(`Landing with ID "${id}" not found.`);
    }

    return landing;
  }

  async update(id: number, updateLandingDto: UpdateLandingDto) {
    const existing = await this.prisma.landing.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Landing with ID "${id}" not found.`);
    }

    // For simplicity, only update root landing fields. Managing nested
    // reviews/images/videos individually can be added if required.
    const { reviews, images, videos, ...rest } = updateLandingDto as any;

    if (reviews || images || videos) {
      // Don't allow nested replacement in this simple implementation.
      throw new BadRequestException(
        'Updating nested reviews/images/videos via this endpoint is not supported. Use dedicated endpoints.',
      );
    }

    return (this.prisma as any).landing.update({
      where: { id },
      data: rest,
      include: {
        reviews: true,
        imagesProduct: true,
        videos: true,
      },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.landing.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Landing with ID "${id}" not found.`);
    }

    await this.prisma.landing.delete({ where: { id } });
  }
}
