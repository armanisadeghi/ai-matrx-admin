'use client';

import { ReactNode, useEffect, useState } from 'react';
import { StreamVideoClient, StreamVideo } from '@stream-io/video-react-sdk';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/redux/store';

import { tokenProvider } from '@/actions/stream.actions';
import Loader from '@/components/meetings/Loader';

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;

const StreamVideoProvider = ({ children }: { children: ReactNode }) => {
  const [videoClient, setVideoClient] = useState<StreamVideoClient>();
  const user = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (!user || !API_KEY) return;

    const client = new StreamVideoClient({
      apiKey: API_KEY,
      user: {
        id: user.id!,
        name: user.userMetadata.fullName || user.id!,
        image: user.userMetadata.avatarUrl,
      },
      tokenProvider,
    });

    setVideoClient(client);
  }, [user]);

  if (!videoClient) return <Loader />;

  return <StreamVideo client={videoClient}>{children}</StreamVideo>;
};

export default StreamVideoProvider;
