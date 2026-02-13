import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model, Types } from 'mongoose';
import { InjectBot } from 'nestjs-telegraf';
import * as path from 'path';
import { Context, Markup, Telegraf } from 'telegraf';
import { LicenseInfo } from '../../common/schemas/licenseInfoSchema';
import { Users } from '../../common/schemas/usersSchema';
import { GoogleSheetsService } from '../../common/services/google-sheets.service';
import { checkLicenseAndReturnContent } from '../../utils/license-check.utils';
import {
  ADMIN_ACTIONS,
  BOT_NAME,
  MAIN_ADMIN_BUTTONS,
  UserRoles,
} from '../bot.constants';

@Injectable()
export class AdminService {
  private readonly pageSize = 5;

  constructor(
    @InjectBot(BOT_NAME) private readonly bot: Telegraf<Context>,
    @InjectModel(Users.name) private readonly usersSchema: Model<Users>,
    @InjectModel(LicenseInfo.name)
    private readonly licenseInfoSchema: Model<LicenseInfo>,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}
  async throwToStart(ctx: Context) {
    try {
      await ctx.replyWithHTML('Please press the /start button.', {
        ...Markup.keyboard([['/start']]).resize(),
      });
    } catch (error) {
      console.log(`Error on throw to start: `, error);
    }
  }
  async onStart(ctx: Context) {
    try {
      const userId = String(ctx.from?.id);
      const user = await this.usersSchema.findOne({ tgUserId: userId });
      if (!user) {
        return this.throwToStart(ctx);
      }
      await ctx.replyWithHTML(`Hello ${ctx.from?.first_name}`, {
        ...Markup.keyboard(MAIN_ADMIN_BUTTONS).resize(),
      });
    } catch (error) {
      console.log(`Error on start: `, error);
    }
  }

  async addLicense(ctx: Context) {
    try {
      const message = ctx.message as any;
      if (
        !message ||
        !message.reply_to_message ||
        !message.reply_to_message.document
      ) {
        return ctx.reply('Please reply to a license file.');
      }
      const document = message.reply_to_message.document;
      const fileName = document.file_name;
      if (!fileName || !fileName.endsWith('.lic')) {
        return ctx.reply('The replied message must contain a .lic file.');
      }

      const args = message.text.split(' ').slice(1);
      if (args.length < 2) {
        return ctx.reply(
          'Usage: /addlicense <date> <ip>\nExample: /addlicense 30.01.2000 192.168.10.1',
        );
      }

      const dateStr = args[0];
      const serverIp = args[1];

      const dateParts = dateStr.split('.');
      if (dateParts.length !== 3) {
        return ctx.reply('Invalid date format. Use DD.MM.YYYY');
      }
      const techSupportLimit = new Date(
        `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`,
      );
      if (isNaN(techSupportLimit.getTime())) {
        return ctx.reply('Invalid date.');
      }

      const fileId = document.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);

      const tmpDir = path.join('/tmp');
      const tmpFilePath = path.join(tmpDir, `license_${Date.now()}.lic`);

      const response = await fetch(fileLink.href);
      if (!response.ok)
        throw new Error(`Failed to fetch file: ${response.statusText}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(tmpFilePath, buffer);

      const licenseResult = await checkLicenseAndReturnContent(tmpFilePath);

      await fs.promises.unlink(tmpFilePath);

      if (!licenseResult.valid) {
        return ctx.reply('License file is invalid or corrupt.');
      }
      const isExists = await this.licenseInfoSchema.find({
        hardwareId: licenseResult.hardwareId,
      });
      if (isExists.length) {
        return ctx.reply('The hardwareId in this file already exists.');
      }
      const licenseInfo = new this.licenseInfoSchema({
        type: licenseResult.type || 'N/A',
        applicationVersion: licenseResult.applicationVersion || 'Unknown',
        clientsCount: licenseResult.clientsCount || 0,
        expirationDate: licenseResult.expireDate
          ? new Date(licenseResult.expireDate)
          : new Date(),
        plan: licenseResult.plan,
        modules: licenseResult.modules,
        hardwareId: licenseResult.hardwareId,
        serial: licenseResult.serial || 'N/A',
        techSupportLimit: techSupportLimit,
        serverIp: serverIp,
        googleSheetsLink: '',
        fileId,
      });

      await licenseInfo.save();

      await this.googleSheetsService.appendLicense(licenseInfo);

      return ctx.reply(
        `License added successfully!\nUser: ${licenseInfo.type}\nIP: ${serverIp}\nSupport until: ${dateStr}`,
      );
    } catch (error) {
      console.error('Error adding license:', error);
      return ctx.reply('An error occurred while adding the license.');
    }
  }

  async addUser(ctx: Context) {
    const userId = String(ctx.from?.id);
    const user = await this.usersSchema.findOne({ tgUserId: userId });
    if (!user) {
      return this.throwToStart(ctx);
    }
    user.action = ADMIN_ACTIONS.ADDING_USER;
    await user.save();
    await ctx.replyWithHTML('Enter the telegram id of the new user.', {
      ...Markup.removeKeyboard(),
    });
  }
  async onText(ctx: Context) {
    try {
      const userId = String(ctx.from?.id);
      const user = await this.usersSchema.findOne({ tgUserId: userId });
      if (!user) {
        return this.throwToStart(ctx);
      }

      if (!ctx.message || !('text' in ctx.message)) {
        return;
      }

      const inputText = ctx.message.text;

      if (user.action === ADMIN_ACTIONS.ADDING_USER) {
        await this.usersSchema.create({ tgUserId: inputText });
        user.action = '';
        await user.save();
        await ctx.reply(`Give the user a role.`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: UserRoles.ADMIN,
                  callback_data: `admingivesrole_${UserRoles.ADMIN}_${inputText}`,
                },
              ],
              [
                {
                  text: UserRoles.MANAGER,
                  callback_data: `admingivesrole_${UserRoles.MANAGER}_${inputText}`,
                },
              ],
              [
                {
                  text: UserRoles.USER,
                  callback_data: `admingivesrole_${UserRoles.USER}_${inputText}`,
                },
              ],
            ],
          },
        });
      }
    } catch (error) {
      console.log(`Error on text: `, error);
      if (error.code === 11000) {
        await ctx.reply('This user already exists.');
      } else {
        await ctx.reply('An error occurred while processing your request.');
      }
    }
  }

  async onGivingRole(ctx: Context) {
    const contextAction = ctx.callbackQuery!['data'];
    const role = contextAction.split('_')[1];
    const userId = contextAction.split('_')[2];
    ctx.editMessageText(`Give the user a role: ${role}`);
    await this.usersSchema.updateOne({ tgUserId: userId }, { $set: { role } });
    await this.bot.telegram.sendMessage(
      Number(userId),
      `This bot's admin added you with role ${role}.`,
    );
    await ctx.replyWithHTML(
      `New user added successfully.\nTelegram ID: <a href="tg://user?id=${userId}">${userId}</a>\nRole: ${role}`,
      {
        ...Markup.keyboard(MAIN_ADMIN_BUTTONS).resize(),
      },
    );
  }

  private buildLicensesKeyboard(
    licenses: Array<any>,
    offset: number,
    total: number,
  ) {
    const response: Array<any> = [];
    for (const lic of licenses) {
      response.push([
        {
          text: lic.type,
          callback_data: `license_${lic._id}`,
        },
      ]);
    }

    if (total > this.pageSize) {
      const page = Math.floor(offset / this.pageSize) + 1;
      const pages = Math.max(1, Math.ceil(total / this.pageSize));
      const leftOffset = Math.max(0, offset - this.pageSize);
      const rightOffset =
        offset + this.pageSize < total ? offset + this.pageSize : offset;
      const leftCallback =
        leftOffset === offset ? 'noop' : `left_${leftOffset}`;
      const rightCallback =
        rightOffset === offset ? 'noop' : `right_${rightOffset}`;

      response.push([
        {
          text: '<<',
          callback_data: leftCallback,
        },
        {
          text: `Page ${page}/${pages}`,
          callback_data: `noop`,
        },
        {
          text: '>>',
          callback_data: rightCallback,
        },
      ]);
    }

    return response;
  }

  async getLicenses(ctx: Context, offset = 0) {
    const userId = String(ctx.from?.id);
    const user = await this.usersSchema.findOne({ tgUserId: userId });
    if (!user) {
      return this.throwToStart(ctx);
    }
    const total = await this.licenseInfoSchema.countDocuments();
    const licenses = await this.licenseInfoSchema
      .find()
      .skip(offset)
      .limit(this.pageSize);
    if (!licenses.length) {
      await ctx.replyWithHTML('No licenses found.');
      return;
    }
    const response = this.buildLicensesKeyboard(licenses, offset, total);
    await ctx.replyWithHTML('Licenses', {
      reply_markup: {
        inline_keyboard: response,
      },
    });
  }

  async onOneLicense(ctx: Context) {
    const contextAction = ctx.callbackQuery!['data'];
    const contextMessage = ctx.callbackQuery!['message'];
    const licenseId = contextAction.split('_')[1];
    ctx.deleteMessage(contextMessage?.message_id);
    const license = await this.licenseInfoSchema.findOne({
      _id: new Types.ObjectId(licenseId),
    });
    if (!license) {
      await ctx.replyWithHTML('License is not available.');
      return;
    }
    await ctx.replyWithHTML(
      `
<b>License</b>: ${license.type}
<b>Application version</b>: ${license.applicationVersion}
<b>Clients count</b>: ${license.clientsCount}
<b>Expiration date</b>: ${license.expirationDate.toLocaleDateString()}
<b>Plan</b>: ${license.plan || 'no plan'}
<b>Modules</b>: ${license.modules || 'no modules'}
<b>Hardware Id</b>: ${license.hardwareId}
<b>Serial</b>: ${license.serial}
<b>TechSupport limit</b>: ${license.techSupportLimit.toLocaleDateString()}
<b>Server IP</b>: ${license.serverIp}
`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'License file',
                callback_data: `file_${license._id}`,
              },
            ],
          ],
        },
      },
    );
  }
  async onLicenseFile(ctx: Context) {
    const contextAction = ctx.callbackQuery!['data'];
    const licenseId = contextAction.split('_')[1];
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    const license = await this.licenseInfoSchema.findOne({
      _id: new Types.ObjectId(licenseId),
    });
    if (!license || !license.fileId) {
      await ctx.replyWithHTML('License or license file is not available.');
      return;
    }
    await ctx.replyWithDocument(license.fileId);
  }

  async onPaginate(ctx: Context) {
    const contextAction = ctx.callbackQuery!['data'];
    const offset = Number(contextAction.split('_')[1]);
    await ctx.answerCbQuery();

    const total = await this.licenseInfoSchema.countDocuments();
    if (!total) {
      await ctx.replyWithHTML('No licenses found.');
      return;
    }
    const licenses = await this.licenseInfoSchema
      .find()
      .skip(offset)
      .limit(this.pageSize);
    const response = this.buildLicensesKeyboard(licenses, offset, total);
    await ctx.editMessageReplyMarkup({ inline_keyboard: response });
  }
}
