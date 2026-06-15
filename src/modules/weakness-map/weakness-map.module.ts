import { Module } from '@nestjs/common';
import { WeaknessMapService } from './weakness-map.service';
import { WeaknessMapController } from './weakness-map.controller';

@Module({
  controllers: [WeaknessMapController],
  providers: [WeaknessMapService],
  exports: [WeaknessMapService],
})
export class WeaknessMapModule {}