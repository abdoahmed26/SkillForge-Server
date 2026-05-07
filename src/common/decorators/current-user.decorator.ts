import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../../users/entities/user.entity';

type RequestWithUser = {
  user?: User;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
