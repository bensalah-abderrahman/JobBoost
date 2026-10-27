import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE, readCookie } from './cookie.util.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto, ResendDto, VerifyDto } from './dto/register.dto.js';
import { OAuthService } from './oauth.service.js';
import { Public } from './public.decorator.js';

const OAUTH_STATE_COOKIE = 'jb_oauth_state';
// Page d'aiguillage : profil si incomplet, sinon offres.
const AFTER_LOGIN_PATH = '/start';

function appUrl() {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function clientIp(request: Request): string {
  const forwarded = request.headers['x-forwarded-for'];

  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    ?.trim();

  return first || request.socket.remoteAddress || 'unknown';
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    // À activer (COOKIE_SECURE=true) dès que le site est servi en HTTPS.
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauth: OAuthService,
  ) {}

  // ----------------------------------------------------------
  // CONNEXION VIA UN FOURNISSEUR
  // ----------------------------------------------------------

  @Public()
  @Get('providers')
  providers() {
    return { providers: this.oauth.enabled() };
  }

  @Public()
  @Get('oauth/:provider')
  start(
    @Param('provider') provider: string,
    @Res() response: Response,
  ) {
    const state = randomBytes(24).toString('base64url');
    const url = this.oauth.authorizeUrl(provider, state);

    if (!url) {
      return response.redirect(`${appUrl()}/login?error=provider`);
    }

    response.cookie(OAUTH_STATE_COOKIE, state, {
      ...cookieOptions(),
      maxAge: 10 * 60 * 1000,
    });

    return response.redirect(url);
  }

  @Public()
  @Get('oauth/:provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const expected = readCookie(request.headers.cookie, OAUTH_STATE_COOKIE);

    response.clearCookie(OAUTH_STATE_COOKIE, cookieOptions());

    const sameState =
      Boolean(expected) &&
      typeof state === 'string' &&
      expected!.length === state.length &&
      timingSafeEqual(Buffer.from(expected!), Buffer.from(state));

    if (!code || !sameState || !this.oauth.has(provider)) {
      return response.redirect(`${appUrl()}/login?error=oauth`);
    }

    try {
      const profile = await this.oauth.profileFromCode(provider, code);
      const { token, expiresAt } =
        await this.authService.signInWithProvider(profile);

      response.cookie(SESSION_COOKIE, token, {
        ...cookieOptions(),
        expires: expiresAt,
      });

      return response.redirect(`${appUrl()}${AFTER_LOGIN_PATH}`);
    } catch {
      return response.redirect(`${appUrl()}/login?error=oauth`);
    }
  }


  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, expiresAt, user } = await this.authService.login(
      body.email,
      body.password,
      clientIp(request),
    );

    response.cookie(SESSION_COOKIE, token, {
      ...cookieOptions(),
      expires: expiresAt,
    });

    return { user };
  }

  @Public()
  @Post('register')
  @HttpCode(200)
  async register(@Body() body: RegisterDto, @Req() request: Request) {
    await this.authService.register(body, clientIp(request));

    return {
      message:
        'Si cette adresse peut être utilisée, un email de confirmation vient de vous être envoyé.',
    };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(200)
  async resend(@Body() body: ResendDto, @Req() request: Request) {
    await this.authService.resendVerification(body.email, clientIp(request));

    return {
      message:
        'Si un compte en attente existe pour cette adresse, un nouvel email a été envoyé.',
    };
  }

  @Public()
  @Post('verify')
  @HttpCode(200)
  async verify(@Body() body: VerifyDto) {
    await this.authService.verifyEmail(body.token);

    return { ok: true };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = readCookie(request.headers.cookie, SESSION_COOKIE);

    if (token) {
      await this.authService.logout(token);
    }

    response.clearCookie(SESSION_COOKIE, cookieOptions());

    return { ok: true };
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user ?? null };
  }
}
