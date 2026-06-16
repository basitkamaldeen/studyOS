import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExtractTextDto } from './dto/upload.dto';

// Import multer types
import { Multer } from 'multer';

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // Generic upload endpoint
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const fileType = file.mimetype.split('/')[0];
    return this.uploadsService.uploadFile(userId, file, fileType);
  }

  // PDF upload endpoint
  @Post('pdf')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadPdf(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('File must be a PDF');
    }
    return this.uploadsService.uploadPdf(userId, file);
  }

  // Image upload endpoint
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadImage(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }
    return this.uploadsService.uploadImage(userId, file);
  }

  // Audio upload endpoint
  @Post('audio')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadAudio(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('File must be audio');
    }
    return this.uploadsService.uploadAudio(userId, file);
  }

  // Extract text from PDF
  @Post('extract/pdf')
  @HttpCode(HttpStatus.OK)
  async extractPdfText(
    @CurrentUser('id') userId: string,
    @Body() dto: ExtractTextDto,
  ) {
    return this.uploadsService.extractPdfTextFromDocument(userId, dto.documentId);
  }

  @Get()
  async getUserDocuments(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.uploadsService.getUserDocuments(userId, page, limit);
  }

  @Get(':id')
  async getDocumentById(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
  ) {
    return this.uploadsService.getDocumentById(userId, documentId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteDocument(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
  ) {
    return this.uploadsService.deleteDocument(userId, documentId);
  }
}