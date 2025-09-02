// ------------------------------------------------
// src/shared/guards/jwt.guard.ts (AuthGuard)
// ------------------------------------------------
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}