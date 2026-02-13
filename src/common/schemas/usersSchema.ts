
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRoles } from 'src/bot/bot.constants';

export type UsersDocument = HydratedDocument<Users>;

@Schema()
export class Users {
  @Prop({unique:true})
  tgUserId: string;

  @Prop({type:String, enum:Object.values(UserRoles)})
  role: UserRoles;

  @Prop()
  gmail: string;

  @Prop()
  action: string;
}

export const UsersSchema = SchemaFactory.createForClass(Users);
