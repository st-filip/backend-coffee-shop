import { IsEmail, IsString } from 'class-validator';

export class RegisterAuthDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  fullName: string;
}
