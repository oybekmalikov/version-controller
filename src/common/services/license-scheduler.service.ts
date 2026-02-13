import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { BOT_NAME } from '../../bot/bot.constants';
import { LicenseInfo } from '../schemas/licenseInfoSchema';
import { Users } from '../schemas/usersSchema';
import { ConfigService } from './configService';

@Injectable()
export class LicenseSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(LicenseSchedulerService.name);

  constructor(
    @InjectBot(BOT_NAME) private readonly bot: Telegraf<Context>,
    @InjectModel(LicenseInfo.name) private readonly licenseModel: Model<LicenseInfo>,
    @InjectModel(Users.name) private readonly usersModel: Model<Users>,
		private configService:ConfigService
  ) {}

  onModuleInit() {
    this.logger.log('License Scheduler Service initialized');
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleCron() {
    this.logger.log('Running daily license expiration check...');
    await this.checkExpiringLicenses();
  }

  async checkExpiringLicenses() {
    const licenses = await this.licenseModel.find();
    const today = new Date();
    today.setHours(0, 0, 0, 0);


    for (const license of licenses) {
      if (!license.expirationDate) continue;

      const expirationDate = new Date(license.expirationDate);
      expirationDate.setHours(0, 0, 0, 0);

      const timeDiff = expirationDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      if ([15, 5, 3, 1].includes(daysRemaining)) {
        await this.notifyAdmins(license, daysRemaining);
      }
    }
  }

  private async notifyAdmins( license: LicenseInfo, daysRemaining: number) {
    const message = `
⚠️ <b>The license is expiring!</b>

Remaining days:<b>${daysRemaining} days</b>
User: ${license.type}
IP: ${license.serverIp}
End date: ${new Date(license.expirationDate).toLocaleDateString()}
`;

      try {
        await this.bot.telegram.sendMessage(this.configService.groupId, message, { parse_mode: 'HTML' });
      } catch (error) {
        this.logger.error(`Failed to send notification to admin group: ${error.message}`);
      }
  }
}
