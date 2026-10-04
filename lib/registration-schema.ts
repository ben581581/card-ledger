import {z} from 'zod';
import {safeRegistrationUrl} from './registration';
export const registrationSchema=z.object({type:z.enum(['required','setup','none','verify']),label:z.string().trim().min(1).max(40),details:z.string().max(350),url:z.string().max(2000).refine(safeRegistrationUrl).optional()});
