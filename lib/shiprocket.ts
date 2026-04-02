interface ShiprocketAuth {
  token: string | null;
  expiresAt: number | null;
}

let authData: ShiprocketAuth = { token: null, expiresAt: null };

async function authenticateShiprocket() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    console.warn('Shiprocket credentials not provided.');
    return null;
  }

  // Check if token is still valid (Token is usually valid for 10 days)
  if (authData.token && authData.expiresAt && Date.now() < authData.expiresAt) {
    return authData.token;
  }

  try {
    const response = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    if (data.token) {
      authData = {
        token: data.token,
        expiresAt: Date.now() + 8 * 24 * 60 * 60 * 1000, // roughly 8 days to be safe
      };
      return data.token;
    }
  } catch (err) {
    console.error('Error authenticating with Shiprocket', err);
  }
  return null;
}

export async function createOrderInShiprocket(orderParams: Record<string, unknown>) {
  const token = await authenticateShiprocket();
  if (!token) return { status: 'mocked', message: 'No ShipRocket token, mock response.' };

  try {
    const response = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderParams),
    });

    return await response.json();
  } catch (error) {
    console.error('Error creating order in shiprocket:', error);
    throw error;
  }
}

export async function trackShiprocketOrder(awbCode: string) {
  const token = await authenticateShiprocket();
  if (!token) return { status: 'mocked', message: 'No ShipRocket token, mock response.' };

  try {
    const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awbCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return await response.json();
  } catch (error) {
    console.error('Error tracking order in shiprocket:', error);
    throw error;
  }
}
