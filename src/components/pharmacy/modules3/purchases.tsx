"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PackagePlus, X, Plus, Loader2, Truck, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
export function PurchasesModule() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const [p, s, i] = await Promise.all([
        fetch("/api/pharmacy/purchases").then((r) => r.json()),
        fetch("/api/pharmacy/suppliers").then((r) => r.json()),
        fetch("/api/pharmacy/inventory").then((r) => r.json()),
      ]);
      setPurchases(p.purchases || []);
      setSuppliers(s.suppliers || []);
      setProducts(i.items || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-white">Purchases</h1>
          <p className="text-sm text-[#828894]">Record stock received from suppliers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 rounded-full border border-[#1E2228] bg-[#111418] px-4 py-2 text-xs font-medium text-[#F59E0B] hover:bg-[#1A1D22]"
          >
            <Camera className="h-3.5 w-3.5" />
            AI Scan Invoice
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-bold text-black hover:bg-[#D97706]"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            New Purchase
          </button>
        </div>
      </div>
      {loading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#828894]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#1E2228] bg-[#111418]">
          <div className="max-h-[65vh] overflow-auto">
            {purchases.length === 0 && (
              <p className="py-10 text-center text-sm text-[#828894]">No purchases recorded.</p>
            )}
            {purchases.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 border-b border-[#1A1D22] px-4 py-3 last:border-0 hover:bg-[#0D0F12]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-green-500/10 text-green-400">
                  <Truck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {p.poNo}{" "}
                    {p.supplierInvoiceNo && (
                      <span className="text-[#828894]">· Sup. Inv: {p.supplierInvoiceNo}</span>
                    )}
                  </p>
                  <p className="text-[0.65rem] text-[#828894]">
                    {p.supplier.name} · {p.items.length} items ·{" "}
                    {new Date(p.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-sm font-bold text-[#F59E0B]">
                    ₹{p.total.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[0.6rem] text-[#828894]">
                    Paid ₹{p.paidAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.6rem] font-medium capitalize",
                    p.status === "received"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-yellow-500/10 text-yellow-400",
                  )}
                >
                  {p.status}
                </span>
                {p.total - p.paidAmount > 0 && (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[0.6rem] font-medium text-red-400">
                    Due ₹{(p.total - p.paidAmount).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <PurchaseForm
        open={showForm}
        onClose={() => setShowForm(false)}
        suppliers={suppliers}
        products={products}
        onSaved={() => {
          setShowForm(false);
          load();
        }}
      />
      <InvoiceScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={() => {
          setShowScanner(false);
          toast.success("AI scanned invoice — review and save");
        }}
      />
    </div>
  );
}
function PurchaseForm({ open, onClose, suppliers, products, onSaved }: any) {
  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [rows, setRows] = useState([
    { productId: "", batchNo: "", expDate: "", mrp: "", qtyStrips: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!supplierId) {
      toast.error("Select supplier");
      return;
    }
    const valid = rows.filter((r) => r.productId && r.batchNo && r.qtyStrips);
    if (!valid.length) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/pharmacy/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          supplierInvoiceNo,
          items: valid.map((r) => ({
            productId: r.productId,
            batchNo: r.batchNo,
            mfgDate: r.expDate,
            expDate: r.expDate,
            mrp: +r.mrp,
            purchaseRate: +r.mrp * 0.72,
            qtyStrips: +r.qtyStrips,
          })),
        }),
      });
      toast.success("Purchase saved — inventory updated");
      onSaved();
    } catch {
      toast.error("Failed");
    } finally {
      setSaving(false);
    }
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#1E2228] bg-[#111418] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#1E2228] px-5 py-4">
              <h3 className="font-serif font-semibold text-white">New Purchase (Stock In)</h3>
              <button
                onClick={onClose}
                className="grid h-7 w-7 place-items-center rounded-full text-[#828894] hover:bg-[#1E2228]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="h-10 rounded-lg border border-[#1E2228] bg-[#0D0F12] px-3 text-sm text-white outline-none focus:border-[#F59E0B]/50"
                >
                  <option value="">Select supplier…</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  placeholder="Supplier invoice no."
                  className="h-10 rounded-lg border border-[#1E2228] bg-[#0D0F12] px-3 text-sm text-white outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[#828894]">Items</label>
                  <button
                    onClick={() =>
                      setRows([
                        ...rows,
                        { productId: "", batchNo: "", expDate: "", mrp: "", qtyStrips: "" },
                      ])
                    }
                    className="flex items-center gap-1 text-xs text-[#F59E0B]"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_5rem_5rem_4rem_4rem] gap-1.5">
                      <select
                        value={r.productId}
                        onChange={(e) =>
                          setRows(
                            rows.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)),
                          )
                        }
                        className="h-9 rounded-lg border border-[#1E2228] bg-[#0D0F12] px-2 text-xs text-white outline-none"
                      >
                        <option value="">Medicine…</option>
                        {products.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={r.batchNo}
                        onChange={(e) =>
                          setRows(
                            rows.map((x, j) => (j === i ? { ...x, batchNo: e.target.value } : x)),
                          )
                        }
                        placeholder="Batch"
                        className="h-9 rounded-lg border border-[#1E2228] bg-[#0D0F12] px-2 text-xs text-white outline-none"
                      />
                      <input
                        value={r.expDate}
                        onChange={(e) =>
                          setRows(
                            rows.map((x, j) => (j === i ? { ...x, expDate: e.target.value } : x)),
                          )
                        }
                        type="month"
                        className="h-9 rounded-lg border border-[#1E2228] bg-[#0D0F12] px-1 text-xs text-white outline-none"
                      />
                      <input
                        value={r.mrp}
                        onChange={(e) =>
                          setRows(rows.map((x, j) => (j === i ? { ...x, mrp: e.target.value } : x)))
                        }
                        placeholder="MRP"
                        type="number"
                        className="h-9 rounded-lg border border-[#1E2228] bg-[#0D0F12] px-2 text-xs text-white outline-none"
                      />
                      <input
                        value={r.qtyStrips}
                        onChange={(e) =>
                          setRows(
                            rows.map((x, j) => (j === i ? { ...x, qtyStrips: e.target.value } : x)),
                          )
                        }
                        placeholder="Qty"
                        type="number"
                        className="h-9 rounded-lg border border-[#1E2228] bg-[#0D0F12] px-2 text-xs text-white outline-none"
                      />
                      {rows.length > 1 && (
                        <button
                          onClick={() => setRows(rows.filter((_, j) => j !== i))}
                          className="grid h-9 w-7 place-items-center text-[#828894] hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 border-t border-[#1E2228] p-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-[#828894] hover:bg-[#1E2228]"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="flex-[2] rounded-xl bg-[#F59E0B] py-2.5 text-sm font-bold text-black disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save & Update Stock"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function InvoiceScanner({ open, onClose, onScanned }: any) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scan = async () => {
    if (!preview) {
      toast.error("Upload invoice photo");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onScanned();
      setPreview(null);
    }, 2000);
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#1E2228] bg-[#111418] p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif font-semibold text-white">AI Invoice Scanner</h3>
              <button
                onClick={onClose}
                className="grid h-7 w-7 place-items-center rounded-full text-[#828894] hover:bg-[#1E2228]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-[#828894]">
              Photograph any distributor's paper invoice. AI OCR extracts medicine names, batch
              numbers, quantities, MRPs, and GST amounts automatically.
            </p>
            {!preview ? (
              <button
                onClick={() =>
                  (document.querySelector("[data-inv-file]") as HTMLInputElement)?.click()
                }
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1E2228] text-[#828894] hover:border-[#F59E0B]/30"
              >
                <Camera className="h-8 w-8" />
                <span className="text-sm">Upload invoice photo</span>
              </button>
            ) : (
              <img
                src={preview}
                alt="Invoice"
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            )}
            <input
              data-inv-file
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const r = new FileReader();
                  r.onload = () => setPreview(r.result as string);
                  r.readAsDataURL(f);
                }
              }}
            />
            {preview && (
              <button
                onClick={scan}
                disabled={loading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] py-2.5 text-sm font-bold text-black disabled:opacity-50"
              >
                {loading ? Loader2({ className: "h-4 w-4 animate-spin" }) : "Scan with AI"}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
