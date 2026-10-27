import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { UpdateUserDto } from './admin.dto.js';

/** Règles de modification d'un compte, isolées pour être testées. */
export function buildUserUpdate(
  target: { id: string; role: string },
  actorId: string,
  dto: UpdateUserDto,
) {
  if (target.role === 'ADMIN' || target.id === actorId) {
    throw new ForbiddenException(
      'Le compte administrateur ne peut pas être modifié ici.',
    );
  }

  const data: Record<string, unknown> = {};

  if (dto.canCollect !== undefined) data.canCollect = dto.canCollect;
  if (dto.canSendEmail !== undefined) data.canSendEmail = dto.canSendEmail;
  if (dto.credits !== undefined) data.credits = dto.credits;
  if (dto.disabled !== undefined) {
    data.disabledAt = dto.disabled ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    throw new BadRequestException('Aucune modification demandée.');
  }

  return data;
}
