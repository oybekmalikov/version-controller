import { UseFilters, UseGuards } from '@nestjs/common';
import { Command, On, Update } from 'nestjs-telegraf';
import { ManagerGuard } from 'src/common/guards/manager.guard';
import { Context } from 'telegraf';
import { AdminGuard } from '../common/guards/admins.guard';
import { TelegrafExceptionFilter } from '../common/guards/telegraf-exception.filter';
import { AdminService } from './admins/admin.service';
import { BotService } from './bot.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly botService: BotService,
    private readonly adminService: AdminService,
  ) {}
  @UseFilters(TelegrafExceptionFilter)
  @UseGuards(AdminGuard)
  @Command('admin')
  async onAdminCommand(ctx: Context) {
    await this.adminService.onStart(ctx);
  }
  @UseFilters(TelegrafExceptionFilter)
  @UseGuards(ManagerGuard)
  @Command('manager')
  async onManagerCommand(ctx: Context) {
    await this.botService.onManagerCommand(ctx);
  }
  @On('text')
  async onText(ctx: Context) {
    return this.botService.onText(ctx);
  }
}
