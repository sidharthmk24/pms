"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PrintTrigger() {
  useEffect(() => {
    // Automatically open browser print preview after component mounts
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="no-print mb-6 flex items-center justify-between border-b pb-4">
      <Link
        href="/contracts"
        className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
      >
          Back to Contracts Dashboard
      </Link>
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-gray-800"
      >
        Print / Save PDF
      </button>
    </div>
  );
}
