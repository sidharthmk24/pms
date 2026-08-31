"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PrintReceiptForm({
  projectId,
  printJob,
}: {
  projectId: string;
  printJob: any;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1000);
  const [paper, setPaper] = useState("80gsm Maplitho");
  const [binding, setBinding] = useState("Paperback");
  const [vendor, setVendor] = useState("Kairali Press");
  const [costRupees, setCostRupees] = useState(0);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const payload = {
      qty: Number(qty),
      paper,
      binding,
      vendor,
      costRupees: Number(costRupees),
    };

    try {
      const res = await fetch(`/api/production/${projectId}/print-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to log print receipt");
      } else {
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-success/20 bg-success/5 p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-success">Active Stage: Printing Run & Warehouse Receipt</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Enter printed deliverables details. This will create the Print Job, update stock levels, and log complimentary copies (5 per 200 printed).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="printQty" className="mb-1 block text-sm font-medium">
            Quantity Printed
          </label>
          <input
            id="printQty"
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="printCost" className="mb-1 block text-sm font-medium">
            Total Print Cost (Rupees)
          </label>
          <input
            id="printCost"
            type="number"
            min="0"
            value={costRupees}
            onChange={(e) => setCostRupees(Number(e.target.value))}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="paperSpecs" className="mb-1 block text-sm font-medium">
            Paper Specifications
          </label>
          <input
            id="paperSpecs"
            type="text"
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="bindingType" className="mb-1 block text-sm font-medium">
            Binding Type
          </label>
          <input
            id="bindingType"
            type="text"
            value={binding}
            onChange={(e) => setBinding(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="printVendor" className="mb-1 block text-sm font-medium">
            Printing Vendor
          </label>
          <input
            id="printVendor"
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-success py-2.5 text-sm font-semibold text-white transition hover:bg-success-hover disabled:opacity-60"
      >
        {pending ? "Logging print receipt..." : "Record Print Delivery & Complete Project"}
      </button>
    </form>
  );
}
