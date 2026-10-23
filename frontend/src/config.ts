/** Centralised, typed access to build-time configuration. No secrets live here. */
const env = import.meta.env

function clean(v: string | undefined): string {
  return (v ?? '').trim()
}

export const config = {
  apiBaseUrl: (clean(env.VITE_API_BASE_URL) || 'http://localhost:8000').replace(/\/+$/, ''),
  entra: {
    spaClientId: clean(env.VITE_ENTRA_SPA_CLIENT_ID),
    tenantId: clean(env.VITE_ENTRA_TENANT_ID) || 'common',
    apiClientId: clean(env.VITE_ENTRA_API_CLIENT_ID),
    apiScope:
      clean(env.VITE_ENTRA_API_SCOPE) ||
      (clean(env.VITE_ENTRA_API_CLIENT_ID)
        ? `api://${clean(env.VITE_ENTRA_API_CLIENT_ID)}/access_as_user`
        : ''),
  },
}

/** True when the Entra settings required to sign in are present. */
export const isAuthConfigured = Boolean(
  config.entra.spaClientId && config.entra.apiScope,
)
