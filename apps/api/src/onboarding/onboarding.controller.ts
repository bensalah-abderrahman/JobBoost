import { Controller, Get } from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  progress() {
    return this.onboarding.getProgress();
  }
}
