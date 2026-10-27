import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password!: string;
}

export class ResendDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class VerifyDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;
}
