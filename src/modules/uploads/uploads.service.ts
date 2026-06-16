import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

// Dynamically import pdf-parse to avoid type issues
const pdfParse = require('pdf-parse');

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const accountId = this.configService.get('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('R2_SECRET_ACCESS_KEY');
    
    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });
    } else {
      this.logger.warn('R2 credentials not configured. File uploads will be disabled.');
    }
    
    this.bucketName = this.configService.get('R2_BUCKET_NAME') || 'studyos';
  }

  async uploadFile(userId: string, file: Express.Multer.File, fileType: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'audio/mpeg', 'audio/wav'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not supported. Please upload PDF, JPEG, PNG, MP3, or WAV files.');
    }

    const fileKey = `${userId}/${Date.now()}-${file.originalname}`;
    let fileUrl = '';
    
    try {
      if (this.s3Client) {
        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        fileUrl = `${this.configService.get('R2_PUBLIC_URL')}/${fileKey}`;
      } else {
        fileUrl = `local://${fileKey}`;
        this.logger.warn('Using local file storage because R2 is not configured');
      }
      
      let extractedText: string | null = null;
      if (file.mimetype === 'application/pdf') {
        extractedText = await this.extractPdfText(file.buffer);
      }

      const document = await this.prisma.document.create({
        data: {
          userId,
          fileName: file.originalname,
          fileUrl,
          fileType,
          mimeType: file.mimetype,
          fileSize: file.size,
          extractedText: extractedText || undefined,
        },
      });

      return document;
    } catch (error) {
      this.logger.error(`Upload error: ${error.message}`);
      throw new BadRequestException('Failed to upload file');
    }
  }

  async uploadPdf(userId: string, file: Express.Multer.File) {
    return this.uploadFile(userId, file, 'pdf');
  }

  async uploadImage(userId: string, file: Express.Multer.File) {
    return this.uploadFile(userId, file, 'image');
  }

  async uploadAudio(userId: string, file: Express.Multer.File) {
    return this.uploadFile(userId, file, 'audio');
  }

  async getUserDocuments(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
      }),
      this.prisma.document.count({ where: { userId } }),
    ]);

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDocumentById(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async deleteDocument(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (this.s3Client && document.fileUrl.startsWith('http')) {
      const fileKey = document.fileUrl.split('/').slice(-2).join('/');
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
        }));
      } catch (error) {
        this.logger.error(`S3 delete error: ${error.message}`);
      }
    }

    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { message: 'Document deleted successfully' };
  }

  async extractPdfTextFromDocument(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId, fileType: 'pdf' },
    });

    if (!document) {
      throw new NotFoundException('PDF document not found');
    }

    if (document.extractedText) {
      return {
        message: 'Text already extracted',
        extractedText: document.extractedText,
      };
    }

    return {
      message: 'PDF text extraction requires file buffer. Implement with actual file fetching.',
      extractedText: null,
    };
  }

  private async extractPdfText(buffer: Buffer): Promise<string | null> {
    try {
      const data = await pdfParse(buffer);
      return data.text.substring(0, 5000);
    } catch (error) {
      this.logger.error(`PDF extraction error: ${error.message}`);
      return null;
    }
  }
}