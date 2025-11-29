import * as authSchema from './auth/schema';
import * as publicSchema from './public/schema';

export const schema = { ...authSchema, ...publicSchema };
