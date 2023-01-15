import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signin(dto: AuthDto) {
    //find user

    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('Credentials do not match');
    }

    const verify = await argon.verify((await user).password, dto.password);

    if (!verify) {
      throw new ForbiddenException('Credentials do not match');
    }
    const token = await this.generateToken(user.id, user.email);
    return { access_token: token };
  }

  async signup(dto: AuthDto) {
    try {
      //generate password hash
      const hash = await argon.hash(dto.password);

      //save user to db
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
        },
      });
      const token = await this.generateToken(user.id, user.email);
      return { access_token: token };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw error;
    }
  }

  generateToken(userId: number, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
    };

    return this.jwt.signAsync(payload, {
      expiresIn: '60m',
      secret: this.config.get('JWT_SECRET'),
    });
  }
}
