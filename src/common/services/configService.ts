import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get port(): number {
    return this.configService.get<number>('PORT') || 3030;
  }

  get host(): string {
    return this.configService.get<string>('HOST') || '127.0.0.1';
  }

  get mongoPort(): number {
    return this.configService.get<number>('MONGO_PORT') || 27017;
  }

  get mongoHost(): string {
    return this.configService.get<string>('MONGO_HOST') || '127.0.0.1';
  }

  get dbName(): string {
    return (
      this.configService.get<string>('DB_NAME') || 'license_version_control'
    );
  }

  get botToken(): string {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) {
      throw new Error('BOT_TOKEN is not defined in environment variables');
    }
    return token;
  }

  get groupId(): string {
    return this.configService.get<string>('TELEGRAM_GROUP_ID') || '0';
  }

  get mongoUri(): string {
    return `mongodb://${this.mongoHost}:${this.mongoPort}/${this.dbName}?authSource=admin`;
  }

  get googleSheetId(): string {
    return this.configService.get<string>('GOOGLE_SHEET_ID') || '';
  }

  get googleCredentialsPath(): string {
    return this.configService.get<string>('GOOGLE_CREDENTIALS_PATH') || '';
  }
}
