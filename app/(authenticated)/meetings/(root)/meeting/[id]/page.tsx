'use client';

import { useState } from 'react';
import { StreamCall, StreamTheme } from '@stream-io/video-react-sdk';
import { useParams } from 'next/navigation';
import { Loader } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/redux/store';

import { useGetCallById } from '@/hooks/useGetCallById';
import Alert from '@/components/meetings/Alert';
import MeetingSetup from '@/components/meetings/MeetingSetup';
import MeetingRoom from '@/components/meetings/MeetingRoom';

const MeetingPage = () => {
  const { id } = useParams();
  const user = useSelector((state: RootState) => state.user);
  const { call, isCallLoading } = useGetCallById(id);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  if (isCallLoading) return <Loader />;

  if (!call) return (
      <p className="text-center text-3xl font-bold text-white">
        Call Not Found
      </p>
  );

  // get more info about custom call type:  https://getstream.io/video/docs/react/guides/configuring-call-types/
  const notAllowed = call.type === 'invited' && (!user || !call.state.members.find((m) => m.user.id === user.id));

  if (notAllowed) return <Alert title="You are not allowed to join this meeting" />;

  return (
      <main className="h-screen w-full">
        <StreamCall call={call}>
          <StreamTheme>
            {!isSetupComplete ? (
                <MeetingSetup setIsSetupComplete={setIsSetupComplete} />
            ) : (
                <MeetingRoom />
            )}
          </StreamTheme>
        </StreamCall>
      </main>
  );
};

export default MeetingPage;
