"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Upload, Loader2, X, CheckCircle2, AlertCircle, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MappedMed = {
  requestedName: string;
  dosage?: string;
  duration?: string;
  matched: boolean;
  productId: string;
  name: string;
  genericName: string | null;
  batchId: string;
  batchNo: string;
  mrp: number;
  inStock: boolean;
};

export function PrescriptionModal({
  open,
  onClose,
  onMapped,
}: {
  open: boolean;
  onClose: () => void;
  onMapped: (items: MappedMed[]) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MappedMed[] | null>(null);
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreview(null);
    setItems(null);
    setNotes("");
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setPreview(url);
      setItems(null);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!preview) {
      toast.error("Upload a prescription image first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pharmacy/prescription-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items || []);
      setNotes(data.notes || "");
      const matched = (data.items || []).filter((i: MappedMed) => i.matched).length;
      toast.success(`${matched} medicine(s) mapped to inventory`);
    } catch {
      toast.error("Could not read the prescription. Try a clearer photo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            reset();
            onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-coral/10 to-sage/10 p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                  <ScanLine className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-display font-semibold">Prescription OCR</h3>
                  <p className="text-[0.65rem] text-muted-foreground">
                    Upload a photo — AI extracts medicines & maps to inventory
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 gap-4 overflow-auto p-4 sm:grid-cols-2">
              {/* upload / preview */}
              <div>
                {!preview ? (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/20"
                  >
                    <Upload className="h-8 w-8" />
                    <span className="text-sm font-medium">Upload prescription</span>
                    <span className="text-xs">JPG / PNG · phone photo OK</span>
                  </button>
                ) : (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Prescription preview"
                      className="aspect-[4/5] w-full rounded-xl object-cover"
                    />
                    <button
                      onClick={() => {
                        setPreview(null);
                        setItems(null);
                      }}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                  }}
                />
                {preview && !items && (
                  <button
                    onClick={analyze}
                    disabled={loading}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    {loading ? "Reading prescription…" : "Extract with AI"}
                  </button>
                )}
              </div>

              {/* results */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Extracted medicines
                </h4>
                {!items ? (
                  <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                    Upload & extract to see results here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-2 rounded-lg border p-2.5",
                          m.matched
                            ? "border-sage/40 bg-sage/5"
                            : "border-destructive/30 bg-destructive/5",
                        )}
                      >
                        {m.matched ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                        ) : (
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {m.name}
                            {!m.matched && (
                              <span className="ml-1 text-[0.6rem] text-destructive">
                                (not in stock)
                              </span>
                            )}
                          </p>
                          <p className="text-[0.65rem] text-muted-foreground">
                            {m.genericName || m.requestedName}
                            {m.dosage ? ` · ${m.dosage}` : ""}
                            {m.duration ? ` · ${m.duration}` : ""}
                          </p>
                          {m.matched && (
                            <p className="text-[0.6rem] text-sage">
                              ✓ {m.batchNo} · ₹{m.mrp.toFixed(0)}
                              {m.inStock ? " · in stock" : " · low stock"}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {notes && (
                      <div className="rounded-lg bg-muted/40 p-2 text-[0.65rem] text-muted-foreground">
                        <strong>Notes:</strong> {notes}
                      </div>
                    )}
                    {items.some((i) => i.matched) && (
                      <button
                        onClick={() => {
                          onMapped(items);
                          reset();
                          onClose();
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground"
                      >
                        Add mapped to cart
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
