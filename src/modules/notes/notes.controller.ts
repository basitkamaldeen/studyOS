import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotesService } from './notes.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateNoteDto,
  UpdateNoteDto,
  GetNotesQueryDto,
  SearchNotesQueryDto,
} from './dto/note.dto';

@Controller('notes')
@UseGuards(AuthGuard('jwt'))
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNote(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.createNote(userId, dto);
  }

  @Get()
  async getNotes(
    @CurrentUser('id') userId: string,
    @Query() query: GetNotesQueryDto,
  ) {
    return this.notesService.getNotes(userId, query);
  }

  @Get('search')
  async searchNotes(
    @CurrentUser('id') userId: string,
    @Query() query: SearchNotesQueryDto,
  ) {
    return this.notesService.searchNotes(userId, query);
  }

  @Get(':id')
  async getNoteById(
    @CurrentUser('id') userId: string,
    @Param('id') noteId: string,
  ) {
    return this.notesService.getNoteById(userId, noteId);
  }

  @Put(':id')
  async updateNote(
    @CurrentUser('id') userId: string,
    @Param('id') noteId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.updateNote(userId, noteId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNote(
    @CurrentUser('id') userId: string,
    @Param('id') noteId: string,
  ) {
    return this.notesService.deleteNote(userId, noteId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveNote(
    @CurrentUser('id') userId: string,
    @Param('id') noteId: string,
  ) {
    return this.notesService.archiveNote(userId, noteId);
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  async unarchiveNote(
    @CurrentUser('id') userId: string,
    @Param('id') noteId: string,
  ) {
    return this.notesService.unarchiveNote(userId, noteId);
  }

  @Get(':id/versions')
  async getNoteVersions(
    @CurrentUser('id') userId: string,
    @Param('id') noteId: string,
  ) {
    return this.notesService.getNoteVersions(userId, noteId);
  }

  @Post(':id/restore/:versionNumber')
  @HttpCode(HttpStatus.OK)
  async restoreVersion(
    @CurrentUser('id') userId: string,
    @Param('id') noteId: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.notesService.restoreVersion(userId, noteId, parseInt(versionNumber, 10));
  }
}