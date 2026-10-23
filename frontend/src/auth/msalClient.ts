/**
 * Thin wrapper around MSAL (Microsoft Entra ID). The rest of the app only talks to
 * this module's functions, never to MSAL directly.
 *
 * Backend contract (backend/app/core/auth.py): v2.0 access token whose audience is the
 * API client id and whose `scp` claim contains `access_as_user`.
 */
import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser'
import { config, isAuthConfigured } from '@/config'

export interface SignedInAccount {
  name: string | null
  username: string | null
}

let pca: PublicClientApplication | null = null

function getPca(): PublicClientApplication {
  if (!isAuthConfigured) {
    throw new Error('Microsoft sign-in is not configured (see VITE_ENTRA_* in .env.example).')
  }
  if (!pca) {
    pca = new PublicClientApplication({
      auth: {
        clientId: config.entra.spaClientId,
        authority: `https://login.microsoftonline.com/${config.entra.tenantId}`,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage' },
    })
  }
  return pca
}

function toSigned(a: AccountInfo | null | undefined): SignedInAccount | null {
  return a ? { name: a.name ?? null, username: a.username ?? null } : null
}

/** Initialise MSAL, finish any pending redirect, and return the signed-in account if any. */
export async function initAuth(): Promise<SignedInAccount | null> {
  const app = getPca()
  await app.initialize()
  const result = await app.handleRedirectPromise()
  const account = result?.account ?? app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null
  if (account) app.setActiveAccount(account)
  return toSigned(account)
}

export async function signIn(): Promise<void> {
  await getPca().loginRedirect({ scopes: [config.entra.apiScope] })
}

export async function signOut(): Promise<void> {
  const app = getPca()
  await app.logoutRedirect({ account: app.getActiveAccount() ?? undefined })
}

/** Returns a fresh access token for the backend API, or null when nobody is signed in. */
export async function getAccessToken(): Promise<string | null> {
  const app = getPca()
  const account = app.getActiveAccount() ?? app.getAllAccounts()[0]
  if (!account) return null
  try {
    const res = await app.acquireTokenSilent({ scopes: [config.entra.apiScope], account })
    return res.accessToken
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // Session expired or consent needed: send the user back through Microsoft sign-in.
      await app.acquireTokenRedirect({ scopes: [config.entra.apiScope], account })
      return null
    }
    throw err
  }
}
