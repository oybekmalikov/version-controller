import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectBot } from 'nestjs-telegraf';
import { Users } from 'src/common/schemas/usersSchema';
import { Context, Markup, Telegraf } from 'telegraf';
import { AdminService } from './admins/admin.service';
import { BOT_NAME, MAIN_ADMIN_BUTTONS } from './bot.constants';

@Injectable()
export class BotService implements OnModuleInit {
  constructor(
    @InjectBot(BOT_NAME) private readonly bot: Telegraf<Context>,
    private readonly adminService: AdminService,
    @InjectModel(Users.name) private readonly usersSchema: Model<Users>,
  ) {}

  async onModuleInit() {
    try {
      await this.bot.telegram.setMyCommands([
        { command: 'admin', description: 'Admins' },
        { command: 'manager', description: 'Managers' },
        {
          command: 'addlicense',
          description: '[tech support limit] [server ip]',
        },
      ]);
      this.bot.on('inline_query', async (ctx) => {
        const query = ctx.inlineQuery.query;
        if (query.startsWith('addlicense')) {
          await ctx.answerInlineQuery(
            [
              {
                type: 'article',
                id: 'add_license_hint',
                title: 'Format for adding license:',
                description:
                  'Format: [limit date] [ip]. Masalan: 30.01.2000 127.0.0.1\nThere should be a reply to the license file.',
                input_message_content: {
                  message_text: `/addlicense ${query.replace('addlicense', '').trim()}`,
                },
              },
            ],
            {
              cache_time: 0,
            },
          );
        }
      });
    } catch (err) {
      console.log('Error setting commands:', err);
    }
  }

  async throwToStart(ctx: Context) {
    try {
      await ctx.replyWithHTML('Please press the /start button.', {
        ...Markup.keyboard([['/start']]).resize(),
      });
    } catch (error) {
      console.log(`Error on throw to start: `, error);
    }
  }

  async onManagerCommand(ctx: Context) {
    try {
      const userId = String(ctx.from?.id);
      const user = await this.usersSchema.findOne({ tgUserId: userId });
      if (!user) {
        return this.throwToStart(ctx);
      }
      await ctx.replyWithHTML(`Hello ${ctx.from?.first_name}`, {
        ...Markup.keyboard(MAIN_ADMIN_BUTTONS.slice(0, 1)).resize(),
      });
    } catch (error) {
      console.log(`Error on start: `, error);
    }
  }

  async onText(ctx: Context) {
    try {
      await this.adminService.onText(ctx);
      // await this.userService.onText(ctx);
    } catch (error) {
      console.log(`error on onText: `, error);
    }
  }
}
// date ip tech support
