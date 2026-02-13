import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LicenseInfo, LicenseInfoSchema } from './schemas/licenseInfoSchema';
import { Users, UsersSchema } from './schemas/usersSchema';
import { ConfigService } from './services/configService';
import { GoogleSheetsService } from './services/google-sheets.service';
import { LicenseSchedulerService } from './services/license-scheduler.service';

@Global()
@Module({
	imports:[
		MongooseModule.forFeature([
			{ name: LicenseInfo.name, schema: LicenseInfoSchema },
			{ name: Users.name, schema: UsersSchema },
		]),
	],
	providers: [ConfigService, LicenseSchedulerService, GoogleSheetsService],
	exports: [ConfigService, MongooseModule, LicenseSchedulerService, GoogleSheetsService],
})
export class CommonModule {}
