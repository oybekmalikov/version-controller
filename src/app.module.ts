import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_NAME } from "./bot/bot.constants";
import { BotModule } from "./bot/bot.module";
import { CommonModule } from "./common/common.module";
import { ConfigService } from "./common/services/configService";

@Module({
	imports: [
		ConfigModule.forRoot({ envFilePath: ".env", isGlobal: true }),
		ScheduleModule.forRoot(),
		CommonModule,
		BotModule,
		TelegrafModule.forRootAsync({
			botName: BOT_NAME,
			useFactory: (configService: ConfigService) => ({
				token: configService.botToken,
				launchOptions: {
					dropPendingUpdates: true,
				},
				middlewares: [],
				include: [BotModule],
			}),
			inject: [ConfigService],
		}),
		MongooseModule.forRootAsync({
			useFactory: (configService: ConfigService) => ({
				uri: configService.mongoUri,
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [],
	providers: [],
})
export class AppModule {}