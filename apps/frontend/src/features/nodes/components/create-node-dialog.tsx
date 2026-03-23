"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCreateNode } from "../queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { Copy, Check, TriangleAlert } from "lucide-react";

interface CreateNodeDialogProps {
  projectId: string;
  children: React.ReactNode;
}

type Step = "form" | "psk";

export function CreateNodeDialog({
  projectId,
  children,
}: CreateNodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [psk, setPsk] = useState("");
  const [copied, setCopied] = useState(false);

  const { org } = useCurrentOrg();
  const createMutation = useCreateNode(org?.id ?? "");

  const handleCreate = () => {
    createMutation.mutate(
      { name: name.trim() || undefined, projectId },
      {
        onSuccess: (data) => {
          setPsk(data.psk);
          setStep("psk");
        },
      },
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(psk);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep("form");
      setName("");
      setPsk("");
      setCopied(false);
      createMutation.reset();
    }, 200);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Node</DialogTitle>
              <DialogDescription>
                A pre-shared key will be generated for this node to activate
                with.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="flex flex-col gap-1.5">
                <Label>
                  Name{" "}
                  <span style={{ color: "var(--text-secondary)" }}>
                    (optional)
                  </span>
                </Label>
                <Input
                  placeholder="e.g. hospital-node-01"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  autoFocus
                />
              </div>

              {createMutation.isError && (
                <p
                  className="font-mono text-[11px]"
                  style={{ color: "var(--color-danger, #ef4444)" }}
                >
                  Failed to create node. Please try again.
                </p>
              )}
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating…" : "Create Node"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Node created</DialogTitle>
              <DialogDescription>
                Copy the pre-shared key below. It will not be shown again.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-sm border"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border-warning, #ca8a04)",
                }}
              >
                <TriangleAlert
                  size={14}
                  className="shrink-0 mt-0.5"
                  style={{ color: "var(--color-warning, #ca8a04)" }}
                />
                <p
                  className="font-mono text-[11px] leading-relaxed"
                  style={{ color: "var(--text-primary)" }}
                >
                  This key is shown <strong>once</strong>. Store it securely —
                  the node needs it to activate.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Pre-shared key</Label>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 font-mono text-[11px] px-3 py-2 rounded-sm border truncate select-all"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--amber-primary)",
                    }}
                  >
                    {psk}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <p
                className="font-mono text-[10px]"
                style={{ color: "var(--text-secondary)" }}
              >
                Use this key in the node agent config:{" "}
                <code>MENTISHUB_PSK=&lt;key&gt;</code>
              </p>
            </DialogBody>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
