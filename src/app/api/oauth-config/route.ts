import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = (process.env.GOOGLE_CLIENT_ID ?? '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET ?? '').trim();
  const configured =
    clientId.length > 0 &&
    clientSecret.length > 0 &&
    !clientId.includes('your-google') &&
    !clientSecret.includes('your-google');

  return NextResponse.json({ configured });
}
