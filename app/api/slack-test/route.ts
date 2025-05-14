import { NextResponse } from 'next/server';

export async function GET() {
  const token = '362271694758.8796274997699.42e7fa8270d780dbe66a8051046c146c86c147569d530b84a2c661bde01d9b18';

  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    console.log('Auth test result:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error testing Slack token:', error);
    return NextResponse.json({ error: 'Token test failed' }, { status: 500 });
  }
}