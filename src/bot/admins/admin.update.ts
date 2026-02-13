import { UseFilters, UseGuards } from '@nestjs/common';
import { Action, Command, Hears, Update } from 'nestjs-telegraf';
import { ManagerGuard } from 'src/common/guards/manager.guard';
import { Context } from 'telegraf';
import { AdminGuard } from '../../common/guards/admins.guard';
import { TelegrafExceptionFilter } from '../../common/guards/telegraf-exception.filter';
import { MAIN_ADMIN_BUTTONS } from '../bot.constants';
import { BotService } from '../bot.service';
import { AdminService } from './admin.service';

@UseGuards(ManagerGuard)
@UseFilters(TelegrafExceptionFilter)
@Update()
export class AdminUpdate {
  constructor(
    private readonly botService: BotService,
    private readonly adminService: AdminService,
  ) {}

  @Command('addlicense')
  async onAddLicense(ctx: Context) {
    await this.adminService.addLicense(ctx);
  }
  @UseGuards(AdminGuard)
  @Hears(MAIN_ADMIN_BUTTONS[1][0])
  async addUser(ctx: Context) {
    await this.adminService.addUser(ctx);
  }
  @Hears(MAIN_ADMIN_BUTTONS[0][0])
  async getLicenses(ctx: Context) {
    await this.adminService.getLicenses(ctx);
  }
  @Action(/^admingivesrole_(Admin|Manager|User)_\d+$/)
  async onAdminGivingRole(ctx: Context) {
    await this.adminService.onGivingRole(ctx);
  }
  @Action(/^license_[a-fA-F0-9]{24}$/)
  async onOneLicense(ctx: Context) {
    await this.adminService.onOneLicense(ctx);
  }
  @Action(/^file_[a-fA-F0-9]{24}$/)
  async onLicenseFile(ctx: Context) {
    await this.adminService.onLicenseFile(ctx);
  }
  @Action(/^(left|right)_\d+$/)
  async onPaginate(ctx: Context) {
    await this.adminService.onPaginate(ctx);
  }
  @Action(/^noop$/)
  async onNoop(ctx: Context) {
    await ctx.answerCbQuery();
  }
}
