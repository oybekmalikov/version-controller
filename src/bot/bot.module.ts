import { Module } from '@nestjs/common';
import { AdminService } from './admins/admin.service';
import { AdminUpdate } from './admins/admin.update';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';

@Module({
  imports: [],
  controllers: [],
  providers: [BotService, AdminService, AdminUpdate, BotUpdate],
})
export class BotModule {}
