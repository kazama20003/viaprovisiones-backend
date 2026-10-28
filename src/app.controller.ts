import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './compartido/infraestructura/prisma/prisma.service';

@Controller('salud')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { estado: 'disponible', baseDeDatos: 'conectada' };
    } catch {
      throw new ServiceUnavailableException({
        estado: 'degradado',
        baseDeDatos: 'sin_conexion',
      });
    }
  }
}
