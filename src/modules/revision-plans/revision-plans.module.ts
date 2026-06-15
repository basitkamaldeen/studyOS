import { Module } from '@nestjs/common';
import { RevisionPlansService } from './revision-plans.service';
import { RevisionPlansController } from './revision-plans.controller';

@Module({
  controllers: [RevisionPlansController],
  providers: [RevisionPlansService],
  exports: [RevisionPlansService],
})
export class RevisionPlansModule {}