import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { TelegrafArgumentsHost } from "nestjs-telegraf";
import { Context } from "telegraf";

@Catch()
export class TelegrafExceptionFilter implements ExceptionFilter {
	async catch(exception: Error, host: ArgumentsHost): Promise<void> {
		const telegrafHost = TelegrafArgumentsHost.create(host);
		const ctx = telegrafHost.getContext<Context>();
		
		const messageId = ctx.message ? ctx.message.message_id : undefined;

		await ctx.reply(`${exception.message}`, {
			parse_mode: 'HTML',
			reply_parameters: messageId ? { message_id: messageId } : undefined
		}).catch((err) => console.log("Reply error:", err));
	}
}