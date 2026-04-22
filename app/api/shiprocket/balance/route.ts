import { NextResponse } from 'next/server';
import { getShiprocketToken } from '@/lib/server/shiprocket-auth';

export async function GET() {
  try {
    const token = await getShiprocketToken();

    const balanceRes = await fetch('https://apiv2.shiprocket.in/v1/external/account/details/wallet-balance', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
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
