import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { UpdateUserDto } from './admin.dto.js';
import { AdminGuard } from './admin.guard.js';
import { AdminService } from './admin.service.js';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Patch('users/:id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.admin.updateUser(id, request.user!.id, body);
  }

  @Delete('users/:id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.admin.deleteUser(id, request.user!.id);
  }

  @Post('users/:id/collect')
  @HttpCode(200)
  collect(@Param('id') id: string) {
    return this.admin.collectFor(id);
  }
}
