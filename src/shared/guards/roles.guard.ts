// src/shared/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Logger } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      this.logger.log('canActivate: No roles required, access granted.');
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user || !user.roles) {
      this.logger.warn('canActivate: User or roles not found in request.');
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    this.logger.log(
      `canActivate: User roles: ${user.roles.join(', ')}, Required roles: ${requiredRoles.join(', ')}, Access: ${hasRole}`,
    );
    return hasRole;
  }
}