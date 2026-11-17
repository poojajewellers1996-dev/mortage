"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gem, Lock, Mail, Shield, AlertCircle, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const searchParams = useSearchParams();
  const reason = searchParams?.get("reason");

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await api.login({ email, password, rememberMe });
      if (res.success && res.token && res.user) {
        login(res.token, res.user, rememberMe, res.expiresIn);
        toast.success(`Welcome back, ${res.user.name}`);
        router.push("/dashboard");
      } else {
        setErrorMessage("Invalid credentials or server response.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log in. Please check your credentials.");
      toast.error(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl text-center text-slate-900 font-bold">
          Sign in to your account
        </CardTitle>
        <CardDescription className="text-center text-xs text-slate-500">
          Enter your credentials to access the Pooja Jewellers Girvi Vault
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Security Notification if redirected due to timeout */}
        {reason === "inactivity" && (
          <div className="flex items-start gap-2.5 p-3 text-xs rounded-xl bg-amber-50 text-amber-900 border border-amber-300">
            <Clock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Session Auto-Locked</span>
              <span>You were signed out due to 30 minutes of inactivity to protect vault data.</span>
            </div>
          </div>
        )}

        {reason === "expired" && (
          <div className="flex items-start gap-2.5 p-3 text-xs rounded-xl bg-sky-50 text-sky-900 border border-sky-300">
            <Shield className="h-4 w-4 text-sky-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Session Expired</span>
              <span>Your previous work session has expired. Daily re-authentication is required.</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-800 font-semibold text-xs">
              Work Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="poojajewellers1996@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 h-11 bg-white border-slate-300 text-slate-900 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-800 font-semibold text-xs">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-9 h-11 bg-white border-slate-300 text-slate-900 text-sm"
              />
            </div>
          </div>

          {/* Session Duration & Remember Me Option */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Keep me signed in for today (Workday Shift)
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                  {rememberMe
                    ? "Session will expire after 12 hours. Never remains active overnight."
                    : "Single session: closing your browser logs you out immediately for security."}
                </span>
              </div>
            </label>
          </div>

          <Button
            type="submit"
            variant="gold"
            size="lg"
            disabled={isLoading}
            className="w-full gap-2 shadow-md shadow-amber-600/30 text-white font-bold cursor-pointer h-11"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Authenticate & Access Vault</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0F1E36] to-slate-950 p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 shadow-xl shadow-amber-500/20 text-slate-950 mb-2">
            <Gem className="h-9 w-9 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Pooja Jewellers
          </h1>
          <p className="text-xs sm:text-sm text-amber-400 font-semibold tracking-wider uppercase">
            Govt. Licensed Pawnbrokers & Gold Loan System
          </p>
        </div>

        {/* Login Card inside Suspense for search params */}
        <Suspense
          fallback={
            <Card className="border-slate-800 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-8 text-center text-slate-500">
              Loading security portal...
            </Card>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Security Specs Footer */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300/90 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Bank-Grade Vault Security Active</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Sessions auto-lock after 30 minutes of inactivity • Daily re-authentication required
          </p>
        </div>
      </div>
    </div>
  );
}
