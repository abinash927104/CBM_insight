"use client";

import { useCBMStore } from '@/store';
import UploadDropzone from '@/components/UploadDropzone';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function Home() {
  const data = useCBMStore((state) => state.data);

  if (data.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
          <h1 className="text-4xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Vedanta CBM Analytics
          </h1>
          <UploadDropzone />
        </div>
      </main>
    );
  }

  return <DashboardLayout />;
}
