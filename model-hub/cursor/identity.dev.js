// Cursor app identity: the simulated viewer for local development.
// Mirrors identity.dev.ts for bundlers that resolve the .js import in identity.ts.

export const DEV_VIEWER = {
  sub: "user:dev",
  email: "dev@example.com",
  name: "Dev Viewer",
  teamId: 1,
  teamRole: "admin",
};
