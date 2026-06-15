import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WeaknessMapService } from './weakness-map.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('weakness-map')
@UseGuards(AuthGuard('jwt'))
export class WeaknessMapController {
  constructor(private readonly weaknessMapService: WeaknessMapService) {}

  @Get()
  async getWeaknessMap(@CurrentUser('id') userId: string) {
    return this.weaknessMapService.getWeaknessMap(userId);
  }

  @Get('topics')
  async getTopics(@CurrentUser('id') userId: string) {
    return this.weaknessMapService.getTopics(userId);
  }

  @Get('recommendations')
  async getRecommendations(@CurrentUser('id') userId: string) {
    return this.weaknessMapService.getRecommendations(userId);
  }
}