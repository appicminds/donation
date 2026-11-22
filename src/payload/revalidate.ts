import { revalidateTag } from "next/cache";

export const CMS_TAG = "cms";

/**
 * Expire cached public content after a CMS change. `expire: 0` means a hidden
 * or rejected message disappears on the next request, not after a stale window.
 */
export function revalidateCms() {
  try {
    revalidateTag(CMS_TAG, { expire: 0 });
  } catch {
    // Outside a Next.js request (e.g. seed or migration scripts). Nothing is cached there.
  }
}
