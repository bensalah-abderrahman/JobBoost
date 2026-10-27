import {
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  canCollect?: boolean;

  @IsOptional()
  @IsBoolean()
  canSendEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  credits?: number;
}
