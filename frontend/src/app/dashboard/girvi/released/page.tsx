"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReleasedRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/girvi?status=closed");
  }, [router]);

  return (
    <div className="flex h-96 items-center justify-center">
      <div className="flex flex-col items-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        <p className="text-sm text-slate-500 font-medium">Opening Released Ledger in unified view...</p>
      </div>
    </div>
  );
}
