import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private redisClient: Redis;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT!),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    });
  }

  async register(dto: RegisterAuthDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
      },
    });
    return { message: 'User created', userId: user.id };
  }

  async login(dto: LoginAuthDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const jti = randomUUID();

    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: jti,
      token_type: 'access',
    };

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: jti,
      token_type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenJti: jti },
    });

    return { accessToken, refreshToken };
  }

  async refresh(oldRefreshToken: string) {
    let decoded;
    try {
      decoded = this.jwtService.verify(oldRefreshToken, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      throw new ForbiddenException('Refresh token expired or invalid');
    }

    const userId = decoded.sub;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshTokenJti) {
      throw new ForbiddenException('Access Denied');
    }

    if (decoded.jti !== user.refreshTokenJti) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const newJti = randomUUID();

    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: newJti,
      token_type: 'access',
    };

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: newJti,
      token_type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: '15m',
    });
    const newRefreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenJti: newJti },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(accessToken: string) {
    const decoded = this.jwtService.verify(accessToken, {
      secret: process.env.JWT_SECRET,
    });

    const userId = decoded.sub;
    const jti = decoded.jti;
    const exp = decoded.exp;
    const ttl = exp - Math.floor(Date.now() / 1000);

    await this.redisClient.set(`blacklist_${jti}`, 'true', 'EX', ttl);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenJti: null },
    });
  }

  async validateAccessToken(accessToken: string) {
    const decoded = this.jwtService.verify(accessToken, {
      secret: process.env.JWT_SECRET,
    });

    const jti = decoded.jti;
    const isBlacklisted = await this.redisClient.get(`blacklist_${jti}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token is blacklisted');
    }

    return decoded;
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redisClient.get(`blacklist_${jti}`);
    return !!result;
  }
}
