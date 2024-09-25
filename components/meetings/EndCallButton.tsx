'use client';

import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/redux/store';

const EndCallButton = () => {
  const call = useCall();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);

  if (!call) {
    throw new Error(
        'useStreamCall must be used within a StreamCall component.'
    );
  }

  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();

  const isMeetingOwner =
      localParticipant &&
      call.state.createdBy &&
      localParticipant.userId === call.state.createdBy.id;

  if (!isMeetingOwner) return null;

  const endCall = async () => {
    await call.endCall();
    router.push('/');
  };

  return (
      <Button onClick={endCall} className="bg-red-500">
        End call for everyone
      </Button>
  );
};

export default EndCallButton;
