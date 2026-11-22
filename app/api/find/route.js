import { guarded, json } from "../../../lib/api.js";
import { findRoles } from "../../../lib/finder.js";

export const maxDuration = 60;

export async function POST() {
  return guarded(async ({ q }) => json(await findRoles(q)));
}
