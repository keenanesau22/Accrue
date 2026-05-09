
/**
 * Plaid Service - Sandbox Integration
 */

const PLAID_CONFIG = {
  clientId: import.meta.env.VITE_PLAID_CLIENT_ID,
  secret: import.meta.env.VITE_PLAID_SECRET,
  baseUrl: 'https://sandbox.plaid.com'
};

const validatePlaidConfig = () => {
  const clientId = import.meta.env.VITE_PLAID_CLIENT_ID;
  const secret = import.meta.env.VITE_PLAID_SECRET;

  console.log('[Accrue Debug] Plaid Client ID:', clientId ? 'Defined' : 'Undefined');

  if (!clientId || !secret) {
    // Silent in production/preview unless explicitly debugging
    return false;
  }
  return true;
};

const getAuthHeader = () => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    'Content-Type': 'application/json',
    'x-supabase-auth': key || ''
  };
};

export const createLinkToken = async (userId: string): Promise<string> => {
  try {
    console.log('[PLAID] Sending request to create link token...');
    const response = await fetch('/proxy/plaid/create-link-token', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[PLAID] Fetch Error: ${response.status} ${response.statusText} - Content: ${text}`);
      throw new Error(`Plaid API request failed: ${response.status} - ${text}`);
    }

    const data = await response.json();
    return data.link_token;
  } catch (error) {
    console.error('[PLAID] Link Token Creation Error:', error);
    throw error;
  }
};

export const exchangePublicToken = async (publicToken: string) => {
  try {
    const response = await fetch('/proxy/plaid/exchange-public-token', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ publicToken }),
    });

    if (!response.ok) {
      console.error('Fetch Error: ' + response.status + ' ' + response.statusText);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Plaid API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Plaid Exchange Error:', error);
    throw error;
  }
};

export const getAccounts = async (accessToken: string) => {
  try {
    const response = await fetch('/proxy/plaid/get-accounts', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ accessToken }),
    });

    if (!response.ok) {
      console.error('Fetch Error: ' + response.status + ' ' + response.statusText);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Plaid API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.accounts;
  } catch (error) {
    console.error('Plaid Get Accounts Error:', error);
    throw error;
  }
};

export const getTransactions = async (accessToken: string, startDate: string, endDate: string) => {
  try {
    const response = await fetch('/proxy/plaid/get-transactions', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ accessToken, startDate, endDate }),
    });

    if (!response.ok) {
      console.error('Fetch Error: ' + response.status + ' ' + response.statusText);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Plaid API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.transactions;
  } catch (error) {
    console.error('Plaid Get Transactions Error:', error);
    throw error;
  }
};

/**
 * Synchronizes transactions using Plaid's sync endpoint.
 * Note: This still requires a server-side implementation for full security,
 * but for this demo, we'll focus on getting Link to work.
 */
export const syncPlaidTransactions = async (accessToken: string, cursor: string | null = null) => {
  // For now, we'll return mock data or implement another proxy if needed.
  return { added: [], modified: [], removed: [], nextCursor: null, hasMore: false };
};
