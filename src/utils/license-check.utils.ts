import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { machineIdSync } from 'node-machine-id';
import * as licenseFile from 'nodejs-license-file';
import * as path from 'path';

export interface LicenseData {
  licenseVersion: string;
  applicationVersion: string;
  clientsCount: string;
  expirationDate: string;
  hardwareId: string;
  serial?: string;
  plan?: string;
  modules?: string;
  createdAt?: string;
}

export interface ParseResult {
  valid: boolean;
  serial: string;
  data: LicenseData;
}

export interface LicenseCheckResult {
  type: string | undefined;
  valid: boolean;
  expireDay: number | string | undefined;
  expireDate: string | undefined;
  clientsCount: number | undefined;
  plan: string | undefined;
  modules: string | undefined;
  hardwareId: string;
  applicationVersion?: string;
  serial?: string;
}

const logger = new Logger('LicenseCheck');

const getLicensePath = (licenseFilePath?: string): string => {
  const dataPath = process.env.DATA_PATH || '/var/lib/datagaze';
  if (licenseFilePath) {
    return licenseFilePath;
  }
  return path.join(dataPath, 'license', 'license.lic');
};

const getPublicKeyPath = (): string => {
  const dataPath = process.env.DATA_PATH || '/var/lib/datagaze';
  return path.join(dataPath, 'license', 'public_key.pem');
};

const parseLicenseByTemplate = async (
  licenseFilePath: string | undefined,
  template: string,
): Promise<ParseResult> => {
  const licensePath = getLicensePath(licenseFilePath);
  
  try {
    const data = licenseFile.parse({
      publicKeyPath: getPublicKeyPath(),
      licenseFilePath: licensePath,
      template,
    });
    return data as ParseResult;
  } catch (error) {
    throw error; 
  }
};

const parseSimpleLicense = async (licenseFilePath?: string): Promise<ParseResult> => {
  const template = [
    '====BEGIN LICENSE====',
    '{{&licenseVersion}}',
    '{{&applicationVersion}}',
    '{{&clientsCount}}',
    '{{&expirationDate}}',
    '{{&hardwareId}}',
    '{{&serial}}',
    '=====END LICENSE=====',
  ].join('\n');

  return await parseLicenseByTemplate(licenseFilePath, template);
};

const parseModuleLicense = async (licenseFilePath?: string): Promise<ParseResult> => {
  const template = [
    '====BEGIN LICENSE====',
    '{{&licenseVersion}}',
    '{{&applicationVersion}}',
    '{{&clientsCount}}',
    '{{&expirationDate}}',
    '{{&plan}}',
    '{{&modules}}',
    '{{&hardwareId}}',
    '{{&createdAt}}',
    '{{&serial}}',
    '=====END LICENSE=====',
  ].join('\n');

  return await parseLicenseByTemplate(licenseFilePath, template);
};

// TODO: REMOVE - TEMP FOR TESTING
const parseManualLicense = async (licenseFilePath?: string): Promise<ParseResult | null> => {
  const licensePath = getLicensePath(licenseFilePath);
  try {
    if (!fs.existsSync(licensePath)) return null;
    const content = fs.readFileSync(licensePath, 'utf8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines[0] === '====BEGIN LICENSE====' && lines[lines.length - 1] === '=====END LICENSE=====') {
      if (lines.length >= 8) {
        return {
          valid: true,
          serial: lines[6],
          data: {
            licenseVersion: lines[1],
            applicationVersion: lines[2],
            clientsCount: lines[3],
            expirationDate: lines[4],
            hardwareId: lines[5],
            serial: lines[6],
          },
        };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const checkLicenseAndReturnContent = async (
  filePath?: string,
): Promise<LicenseCheckResult> => {
  const result: LicenseCheckResult = {
    type: undefined,
    valid: false,
    expireDay: undefined,
    expireDate: undefined,
    clientsCount: undefined,
    plan: undefined,
    modules: undefined,
    hardwareId: machineIdSync(),
  };

  let expireDay: number | string = 'unlimited';
  let data: ParseResult;

  try {
    data = await parseSimpleLicense(filePath);
  } catch (error1: any) {
    try {
      data = await parseModuleLicense(filePath);
    } catch (error2: any) {
      // TODO: REMOVE - TEMP FOR TESTING FALLBACK
      const manualData = await parseManualLicense(filePath);
      if (manualData?.valid) {
        data = manualData;
      } else {
        logger.error(
          'LicenseFile is corrupt or not loaded ' +
            error1.message +
            ' ' +
            error2.message,
        );
        return result;
      }
    }
  }

  if (!data || !data.data) {
     logger.error('License data invalid');
     return result;
  }


  result.type = data.data.licenseVersion;
  result.valid = data.valid || false;
  let licenseDate = data.data.expirationDate;

  if (licenseDate === 'unlimited') {
    result.valid = true;
  } else {
    const parts = data.data.expirationDate.split('/');
    const expirationDateObj = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    const now = new Date();
    
    const diffTime = expirationDateObj.getTime() - now.getTime();
    
    expireDay = Math.trunc(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (expireDay <= 0) {
      result.valid = false;
    }
  }

  if (result.hardwareId !== data.data.hardwareId) {
    logger.warn('License hardwareId not match');
    result.valid = false;
  }

  result.expireDay = expireDay;
  result.expireDate = data.data.expirationDate;
  result.clientsCount = data.data.clientsCount ? +data.data.clientsCount : undefined;
  result.plan = data.data.plan;
  result.modules = data.data.modules;
  result.hardwareId = data.data.hardwareId;
  result.applicationVersion = data.data.applicationVersion;
  result.serial = data.data.serial;
  result.valid = true; // TODO: REMOVE - TEMP FOR TESTING ALWAYS VALID
  return result;
};
