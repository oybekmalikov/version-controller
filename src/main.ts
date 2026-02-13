import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ErrorHandler } from './common/error-handling/errorHandler';
import { ConfigService } from "./common/services/configService";

async function start() {
	try {
		const app = await NestFactory.create(AppModule);
		const configService = app.get(ConfigService);
		const PORT = configService.port;
		const HOST = configService.host;
		
		app.useGlobalFilters(new ErrorHandler());
		await app.listen(PORT,HOST, () => {
			console.log(`Server started on http://${HOST}:${PORT}`);
		});
	} catch (error) {
		console.log(error);
	}
}
start();