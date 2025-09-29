// src/shared/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        if ('message' in exceptionResponse) {
          message = exceptionResponse['message'];
        } else {
          message = exceptionResponse;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(`HTTP Exception: ${status} - ${message}`);

    // ASP.NET Core এর মতো response format
    if (status === HttpStatus.BAD_REQUEST) {
      response.status(status).json({
        errors: Array.isArray(message) ? message : [message]
      });
    } else if (status === HttpStatus.UNAUTHORIZED) {
      response.status(status).json(message);
    } else {
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: message
      });
    }
  }
}