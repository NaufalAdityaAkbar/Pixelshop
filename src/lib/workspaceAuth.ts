/**
 * workspaceAuth.ts
 * Pure Google OAuth 2.0 implementation — NO Firebase required.
 * Uses Google Identity Services (GIS) tokenClient for workspace scopes.
 */

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

let cachedAccessToken: string | null = null;
let tokenClient: any = null;

type AuthCallback = (accessToken: string) => void;
type FailCallback = () => void;

let pendingResolve: AuthCallback | null = null;
let pendingReject: FailCallback | null = null;

// Load Google Identity Services script dynamically (client-side only)
function loadGIS(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = () => resolve(); // fail silently
    document.head.appendChild(script);
  });
}

function getClientId(): string {
  // Next.js public env var
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
}

async function ensureTokenClient() {
  await loadGIS();
  if (!tokenClient && (window as any).google?.accounts?.oauth2 && getClientId()) {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error || !resp.access_token) {
          if (pendingReject) pendingReject();
          pendingResolve = null;
          pendingReject = null;
          return;
        }
        cachedAccessToken = resp.access_token;
        // Token expires in ~3600s — schedule auto-clear
        setTimeout(() => { cachedAccessToken = null; }, (resp.expires_in || 3600) * 1000);
        if (pendingResolve) pendingResolve(resp.access_token);
        pendingResolve = null;
        pendingReject = null;
      }
    });
  }
}

/**
 * initAuth — subscribes to token state.
 * Returns an unsubscribe noop (GIS has no persistent session).
 */
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
): (() => void) => {
  // If we already have a cached token, report success immediately
  if (cachedAccessToken && onAuthSuccess) {
    onAuthSuccess({ email: 'workspace@google.com' }, cachedAccessToken);
  } else if (onAuthFailure) {
    onAuthFailure();
  }
  return () => {}; // unsubscribe noop
};

/**
 * googleSignIn — triggers GIS token request popup.
 */
export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  if (typeof window === 'undefined') return null;

  await ensureTokenClient();

  if (!tokenClient) {
    console.warn('Google Identity Services not available (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID). Using Mock Login for demo purposes.');
    // MOCK LOGIN FALLBACK
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockToken = "mock_token_" + Date.now();
        cachedAccessToken = mockToken;
        resolve({ user: { email: 'demo.workspace@pixelshop.com' }, accessToken: mockToken });
      }, 1000);
    });
  }

  return new Promise((resolve, reject) => {
    pendingResolve = (token: string) => {
      resolve({ user: { email: 'workspace@google.com' }, accessToken: token });
    };
    pendingReject = () => {
      reject(new Error('Google login dibatalkan atau gagal.'));
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

/**
 * getAccessToken — returns the current in-memory OAuth access token.
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * logoutGoogle — revokes and clears the stored token.
 */
export const logoutGoogle = async () => {
  if (cachedAccessToken && (window as any).google?.accounts?.oauth2) {
    (window as any).google.accounts.oauth2.revoke(cachedAccessToken, () => {});
  }
  cachedAccessToken = null;
};
