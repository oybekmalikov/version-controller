import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import { JWT } from 'google-auth-library'
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { LicenseInfo } from '../schemas/licenseInfoSchema'
import { ConfigService } from './configService'

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private doc: GoogleSpreadsheet;

  constructor(private readonly configService: ConfigService) {}

  async appendLicense(license: LicenseInfo) {
    try {
      if (!this.configService.googleSheetId) {
        this.logger.warn('GOOGLE_SHEET_ID is not set. Skipping sheet update.');
        return;
      }

      const credsPath = this.configService.googleCredentialsPath;
      if (!fs.existsSync(credsPath)) {
         this.logger.warn(`Google credentials file not found at ${credsPath}. Skipping sheet update.`);
         return;
      }
      
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

      const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.doc = new GoogleSpreadsheet(this.configService.googleSheetId, serviceAccountAuth);
      await this.doc.loadInfo();
      const sheet = this.doc.sheetsByIndex[0];
      const headers = [
        'Type',
        'Application',
        'Version',
        'Clients Count',
        'Expiration Date',
        'Plan',
        'Modules',
        'Hardware ID',
        'Serial',
        'Server IP',
        'Tech Support Limit',
        'Added At'
      ];

      try {
        await sheet.loadHeaderRow();
      } catch (e) {
        await sheet.setHeaderRow(headers);
      }
      await sheet.addRow({
        'Type': license.type,
        'Application': 'Bot',
        'Version': license.applicationVersion,
        'Clients Count': license.clientsCount,
        'Expiration Date': license.expirationDate ? new Date(license.expirationDate).toLocaleDateString() : 'N/A',
        'Plan': license.plan || 'no plan',
        'Modules': license.modules || 'no modules',
        'Hardware ID': license.hardwareId,
        'Serial': license.serial || 'N/A',
        'Server IP': license.serverIp,
        'Tech Support Limit': license.techSupportLimit ? new Date(license.techSupportLimit).toLocaleDateString() : 'N/A',
        'Added At': new Date().toLocaleString(),
      });

      this.logger.log('License added to Google Sheet successfully.');
    } catch (error) {
      this.logger.error('Failed to append license to Google Sheet:', error);
    }
  }
}
