import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoteDto, UpdateNoteDto, GetNotesQueryDto, SearchNotesQueryDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private prisma: PrismaService) {}

  async createNote(userId: string, dto: CreateNoteDto) {
    const note = await this.prisma.note.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content || '',
      },
    });

    await this.createNoteVersion(note.id, 1, note.title, note.content);
    return note;
  }

  async getNotes(userId: string, query: GetNotesQueryDto) {
    const { includeArchived = false, search = '', page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      ...(includeArchived ? {} : { isArchived: false }),
      ...(search ? {
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
        ],
      } : {}),
    };

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.note.count({ where }),
    ]);

    return {
      data: notes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchNotes(userId: string, query: SearchNotesQueryDto) {
    const { q = '', includeArchived = false, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      ...(includeArchived ? {} : { isArchived: false }),
      OR: [
        { title: { contains: q } },
        { content: { contains: q } },
      ],
    };

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.note.count({ where }),
    ]);

    return {
      data: notes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query: q,
      },
    };
  }

  async getNoteById(userId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async updateNote(userId: string, noteId: string, dto: UpdateNoteDto) {
    const existingNote = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!existingNote) {
      throw new NotFoundException('Note not found');
    }

    const updatedNote = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
      },
    });

    if (dto.title !== undefined || dto.content !== undefined) {
      const latestVersion = await this.prisma.noteVersion.findFirst({
        where: { noteId },
        orderBy: { versionNumber: 'desc' },
      });

      const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
      
      await this.createNoteVersion(
        noteId,
        newVersionNumber,
        updatedNote.title,
        updatedNote.content,
      );
    }

    return updatedNote;
  }

  async deleteNote(userId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    await this.prisma.note.delete({
      where: { id: noteId },
    });

    return { message: 'Note deleted successfully' };
  }

  async archiveNote(userId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return await this.prisma.note.update({
      where: { id: noteId },
      data: { isArchived: true },
    });
  }

  async unarchiveNote(userId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return await this.prisma.note.update({
      where: { id: noteId },
      data: { isArchived: false },
    });
  }

  async getNoteVersions(userId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return await this.prisma.noteVersion.findMany({
      where: { noteId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async restoreVersion(userId: string, noteId: string, versionNumber: number) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const version = await this.prisma.noteVersion.findFirst({
      where: { noteId, versionNumber },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    const restoredNote = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        title: version.title,
        content: version.content,
      },
    });

    const latestVersion = await this.prisma.noteVersion.findFirst({
      where: { noteId },
      orderBy: { versionNumber: 'desc' },
    });

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
    
    await this.createNoteVersion(
      noteId,
      newVersionNumber,
      restoredNote.title,
      restoredNote.content,
    );

    return restoredNote;
  }

  private async createNoteVersion(noteId: string, versionNumber: number, title: string, content: string) {
    return this.prisma.noteVersion.create({
      data: {
        noteId,
        versionNumber,
        title,
        content,
      },
    });
  }
}