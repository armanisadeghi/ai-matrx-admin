'use client'

import TaskComponent from "./TaskComponent";
export default function SocketTestsPage() {


  return (
    <div className="h-[calc(100vh-60px)] w-full flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-850">
      <TaskComponent />
    </div>
  );
}