import { request } from './client';

export interface BankConnectUrl {
  /** Relative: resolves against whichever origin the app is on (the web host proxies /auth/connect-bank). */
  url: string;
}

/**
 * Asks for a short-lived, single-use link that starts the bank connection. The navigation to /auth/connect-bank
 * can't carry an Authorization header, and the login JWT used to be put in its query string instead (browser
 * history, server logs, Referer). The ticket in this url is only good for starting that flow, for about a minute.
 */
export async function requestBankConnectUrl(signal?: AbortSignal): Promise<BankConnectUrl> {
  const res = await request<BankConnectUrl>('/api/bank/connect-url', { method: 'POST', signal });
  if (!isConnectUrl(res?.url)) {
    throw new Error('Unexpected response from the server.');
  }
  return res;
}

/** Only ever navigate somewhere the API is meant to send us: the connect-bank route, on our own origin. */
export function isConnectUrl(url: unknown): url is string {
  return typeof url === 'string' && url.startsWith('/auth/connect-bank?ticket=') && !url.includes('//');
}
