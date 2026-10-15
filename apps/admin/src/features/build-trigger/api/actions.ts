'use server';

import { requireAdmin } from '@/shared/lib/admin-auth';
import { dispatchClientBuild } from './trigger-build';

export async function triggerClientBuild(): Promise<void> {
  await requireAdmin();
  await dispatchClientBuild();
}
