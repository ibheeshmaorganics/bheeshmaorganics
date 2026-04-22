type ShiprocketTokenCache = {
  token: string;
  expiresAt: number;
};

let cachedToken: ShiprocketTokenCache | null = null;

export async function getShiprocketToken(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error('Shiprocket credentials missing');
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.token;
  }

  const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const authData = await authRes.json();

  if (!authRes.ok || !authData?.token) {
    throw new Error(`Shiprocket Auth Failed: ${authData?.message || 'Invalid Email/Password configuration'}`);
  }

  // Keep a safety buffer before expiry to avoid edge-timeout retries.
  cachedToken = {
    token: authData.token,
    expiresAt: now + (9 * 60 * 1000),
  };

  return authData.token;
}
