import { getIdentity } from "../../../cursor/identity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getIdentity(request);
  if (!identity.verified) {
    return Response.json(
      { verified: false, reason: identity.reason },
      { status: 200, headers: { "cache-control": "private, no-store" } },
    );
  }

  return Response.json(
    {
      verified: true,
      name: identity.name || "Signed-in viewer",
      email: identity.email || "",
      kind: identity.kind,
      simulated: identity.simulated === true,
      appVisibility: identity.appVisibility,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
