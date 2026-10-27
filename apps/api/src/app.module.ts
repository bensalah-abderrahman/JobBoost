import {
  Module,
} from '@nestjs/common';

import {
  ConfigModule,
} from '@nestjs/config';

import {
  PrismaModule,
} from './prisma/prisma.module.js';

import {
  ProfileModule,
} from './profile/profile.module.js';

import {
  JobsModule,
} from './jobs/jobs/jobs.module.js';

import {
  LlmModule,
} from './llm/llm.module.js';

import {
  ResumeModule,
} from './resume/resume.module.js';

import {
  CoverLetterModule,
} from './cover-letter/cover-letter.module.js';

import {
  ApplicationsModule,
} from './applications/applications.module.js';

import {
  DashboardModule,
} from './dashboard/dashboard.module.js';

import {
  AuthModule,
} from './auth/auth.module.js';

import {
  OnboardingModule,
} from './onboarding/onboarding.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuthModule,

    OnboardingModule,

    ProfileModule,

    JobsModule,

    LlmModule,

    ResumeModule,

    CoverLetterModule,

    ApplicationsModule,

    DashboardModule,
  ],
})
export class AppModule {}