"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PrintTrigger({ contractId }: { contractId: string }) {
  useEffect(() => {
    // Automatically trigger print dialog after document is fully loaded
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="no-print mb-6 flex items-center justify-between border-b border-gray-300 pb-4">
      <Link
        href={`/publish/contract/${contractId}`}
        className="text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
      >
        <span>← Back to Contract Portal</span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-sans hidden sm:inline">
          Official A4 PDF View
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-gray-800 cursor-pointer"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
