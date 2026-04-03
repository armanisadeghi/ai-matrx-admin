'use client';

import CoolifyLogViewer from '@/components/admin/server-logs/CoolifyLogViewer';

export default function ServerLogsPage() {
    return (
        <div className="w-full h-full overflow-auto">
            <CoolifyLogViewer />
        </div>
    );
}
