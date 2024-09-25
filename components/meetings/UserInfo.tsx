// components/UserInfo.tsx
'use client';

import Image from 'next/image';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/redux/store';

const UserInfo = () => {
    const user = useSelector((state: RootState) => state.user);

    if (!user) return null;

    return (
        <div className="flex items-center">
            <Image
                src={user.userMetadata.avatarUrl || "/icons/default-avatar.svg"}
                width={32}
                height={32}
                alt="User avatar"
                className="rounded-full"
            />
            <span className="ml-2 text-white">
        {user.userMetadata.fullName || user.email}
      </span>
        </div>
    );
};

export default UserInfo;
