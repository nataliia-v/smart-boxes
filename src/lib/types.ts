import type { Permission } from './validation';
export type BoxView = { id: string; name: string; description: string; guestPermission: Permission; version: number; itemCount: number; publicToken?: string };
export type ItemView = { id: string; number: number; name: string; description: string; photoId: string | null; version: number; deletedAt: string | null; boxId: string; boxName?: string };
export type ActivityView = { id: string; action: string; actorType: string; itemName: string | null; createdAt: string };
export type Detail = { box: BoxView; items: ItemView[]; total: number; page: number; canEdit: boolean; isOwner: boolean };
