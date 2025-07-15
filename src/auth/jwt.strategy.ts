import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: any, done: Function) {
    if (payload.token_type !== 'access') {
      throw new UnauthorizedException('Invalid token type for resource access');
    }

    const jti = payload.jti;
    const isBlacklisted = await this.authService.isBlacklisted(jti);

    if (isBlacklisted) {
      throw new UnauthorizedException('Token is blacklisted');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
