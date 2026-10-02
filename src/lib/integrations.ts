/** Integration entry points. Secrets and provider calls only live in server modules. */
export const integrationEndpoints = {
  status: "/api/integrations",
  runs: "/api/runs",
  graphify: "/api/graphify",
} as const;
