import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      return NextResponse.json({ error: 'Shiprocket credentials missing' }, { status: 500 });
    }

    const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const authData = await authRes.json();
    if (!authRes.ok || !authData.token) {
      throw new Error('Auth Failed');
    }

    const balanceRes = await fetch('https://apiv2.shiprocket.in/v1/external/account/details/wallet-balance', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authData.token}` }
    });
    
    const balanceData = await balanceRes.json();
    console.log("Shiprocket Wallet Response:", balanceData);

    let actualBalance = 0;
    if (balanceData.data?.balance_amount !== undefined) actualBalance = parseFloat(balanceData.data.balance_amount);
    else if (balanceData.data?.balance !== undefined) actualBalance = parseFloat(balanceData.data.balance);
    else if (balanceData.balance !== undefined) actualBalance = parseFloat(balanceData.balance);
    else if (balanceData.balance_amount !== undefined) actualBalance = parseFloat(balanceData.balance_amount);

    return NextResponse.json({ balance: actualBalance, debug: balanceData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
