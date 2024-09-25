'use server';

import { StreamClient } from '@stream-io/node-sdk';
import { getUser } from "@/utils/supabase/auth";

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_SECRET_KEY;

export const tokenProvider = async () => {
  const user = await getUser();

  if (!user) throw new Error('User is not authenticated');
  if (!STREAM_API_KEY) throw new Error('Stream API key is missing');
  if (!STREAM_API_SECRET) throw new Error('Stream API secret is missing');

  const streamClient = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);

  const token = streamClient.generateUserToken({
    user_id: user.id,
    exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
  });

  return token;
};
