/*
====BEGIN LICENSE====
User trial License
2.5.4
10
01/02/2026
a0678d61c49c5a3c146c656b6a96c01dadfc2754a954302820db30cfa5c5e7d9
jgkvMn/H1OIt7c66ReHzMiHX+eQDpKnEyuBKpurkLlL4aabTl3Ok8cMe4mcJAJ23HFOwKGOeB/uh3Lf3lNxk5PfMWogwniLVYS1edn5Ay1Syjb9eW/RmzLB18AvK75qLaU4Yw6yZSXOLPVbshD1xVP+dqNHSrnZUA6libsDsd0U19hIOe7U5csnKydqcnKMZyaTR92wsxsP9xCOcNmvpJFaTLSRLuo98pIfnWRLrySYMaeWYE2LpopH++MoYDMNEzY5KaXSU6FwvKSGt6uBepx+MCIQoSwZYXdySocYZmG1QNM3wPSL2uZhYrIU7xJDxZPMrZFwe+7e2OVHPdu96aw==
=====END LICENSE=====
*/
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type LicenseInfoDocument = HydratedDocument<LicenseInfo>;

@Schema()
export class LicenseInfo {
  @Prop()
  type: string;
  @Prop()
  applicationVersion: string;
  @Prop()
  clientsCount: number;
  @Prop()
  expirationDate: Date;
  @Prop()
  plan: string;
  @Prop()
  modules: string;
  @Prop({ unique: true })
  hardwareId: string;
  @Prop()
  serial: string;
  @Prop()
  techSupportLimit: Date;
  @Prop()
  serverIp: string;
  @Prop()
  fileId: string;
  @Prop()
  googleSheetsLink: string;
}

export const LicenseInfoSchema = SchemaFactory.createForClass(LicenseInfo);
