"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push("/");
  }

  return (
    <div
      className="w-full max-w-sm rounded-md border overflow-hidden relative"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, var(--amber-primary), transparent)",
          opacity: 0.4,
        }}
      />

      <div className="p-8">
        <div className="flex flex-col items-center gap-4 mb-8">
          <Image src="/mentishub-icon.svg" alt="MentisHub Icon" width={120} height={120} />

          <div className="text-center">
            <p
              className="font-mono text-[10px] tracking-[0.2em] uppercase mb-1"
              style={{ color: "var(--gold-circuit)" }}
            >
              MentisHub
            </p>
            <h1
              className="font-display font-bold text-[22px] tracking-[-0.01em]"
              style={{ color: "var(--text-primary)" }}
            >
              Sign in
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="email"
              className="font-mono text-[10px] tracking-[0.15em] uppercase"
              style={{ color: "var(--gold-circuit)" }}
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@institution.edu"
              {...register("email")}
              style={errors.email ? { borderColor: "var(--destructive)" } : undefined}
            />
            {errors.email && (
              <p className="font-mono text-[10px]" style={{ color: "var(--destructive)" }}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="password"
              className="font-mono text-[10px] tracking-[0.15em] uppercase"
              style={{ color: "var(--gold-circuit)" }}
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              style={errors.password ? { borderColor: "var(--destructive)" } : undefined}
            />
            {errors.password && (
              <p className="font-mono text-[10px]" style={{ color: "var(--destructive)" }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <p
              className="font-mono text-[11px] tracking-[0.05em] px-3 py-2 rounded-sm"
              style={{
                background: "color-mix(in srgb, var(--destructive) 10%, transparent)",
                color: "var(--destructive)",
                border: "1px solid color-mix(in srgb, var(--destructive) 30%, transparent)",
              }}
            >
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            variant="default"
            disabled={isSubmitting}
            className="w-full mt-1"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Sign in →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
