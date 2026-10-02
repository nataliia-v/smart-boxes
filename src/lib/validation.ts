import { z } from 'zod';
export const uuid = z.uuid();
export const boxInput = z.object({ id: uuid, name: z.string().trim().min(1).max(100), description: z.string().trim().max(1000).default('') }).strict();
export const boxUpdate = z.object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(1000), guestPermission: z.enum(['VIEW', 'EDIT', 'PRIVATE']), version: z.number().int().positive() }).strict();
export const itemInput = z.object({ id: uuid, name: z.string().trim().min(1).max(200), description: z.string().trim().max(3000).default(''), photoId: uuid.nullable().default(null), version: z.number().int().positive().optional() }).strict();
export const versionInput = z.object({ version: z.number().int().positive() }).strict();
export const moveBoxInput = z.object({ id: uuid, beforeId: uuid.nullable() }).strict();
export type Permission = 'VIEW' | 'EDIT' | 'PRIVATE';
