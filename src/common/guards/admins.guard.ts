import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelegrafException, TelegrafExecutionContext } from 'nestjs-telegraf';
import { UserRoles } from 'src/bot/bot.constants';
import { Context } from 'telegraf';
import { Users } from '../schemas/usersSchema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectModel(Users.name)
    private readonly usersSchema: Model<Users>,
  ) {}
  async canActivate(context: ExecutionContext) {
    const ctx = TelegrafExecutionContext.create(context);
    const { from } = ctx.getContext<Context>();

    if (!from) {
      throw new TelegrafException('User information not found.');
    }

    const user = await this.usersSchema.findOne({
      tgUserId: from.id.toString(),
    });
    if (!user) return false;
    if (user.role === UserRoles.ADMIN) {
      return true;
    }

    throw new TelegrafException('You do not have permission for this action');
  }
}
