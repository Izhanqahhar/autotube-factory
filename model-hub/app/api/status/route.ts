import { requireIdentity } from "../../../cursor/identity";
import { statusRows } from "../../../lib/providers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;

  const providers = statusRows();
  const connected = providers.filter((row) => row.configured).length;

  return Response.json(
    {
      connected,
      total: providers.length,
      providers,
      viewer: {
        name: identity.name || "Signed-in viewer",
        simulated: identity.simulated === true,
      },
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
