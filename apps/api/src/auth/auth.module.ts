import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MailModule } from '../mail/mail.module.js';
import { UserContextInterceptor } from './user-context.interceptor.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { OAuthService } from './oauth.service.js';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UserContextInterceptor,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
