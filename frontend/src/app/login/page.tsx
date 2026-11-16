"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gem, Lock, Mail, Shield, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await api.login({ email, password });
      if (res.success && res.token && res.user) {
        login(res.token, res.user);
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

  const fillCredentials = (role: "admin" | "staff") => {
    if (role === "admin") {
      setEmail("admin@ganeshjewellers.com");
      setPassword("Admin@123456");
    } else {
      setEmail("staff@ganeshjewellers.com");
      setPassword("Staff@123456");
    }
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0F1E36] to-slate-950 p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 shadow-xl shadow-amber-500/20 text-slate-950 mb-2">
            <Gem className="h-9 w-9 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Shree Ganesh Jewellers
          </h1>
          <p className="text-xs sm:text-sm text-amber-400 font-medium tracking-wider uppercase">
            Govt. Licensed Pawnbrokers & Gold Loan System
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center text-slate-900">Sign in to your account</CardTitle>
            <CardDescription className="text-center text-xs text-slate-500">
              Enter your credentials to access the Girvi management portal
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@ganeshjewellers.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 h-11"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="gold"
                size="lg"
                disabled={isLoading}
                className="w-full gap-2 shadow-md shadow-amber-600/30 text-white font-semibold"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Authenticate & Access</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-2">
                Quick Sign-In Credentials
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials("admin")}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-900">
                    <Shield className="h-3 w-3 text-amber-600" />
                    <span>Admin</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Full Permissions</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials("staff")}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-900">
                    <Shield className="h-3 w-3 text-slate-600" />
                    <span>Staff</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Counter Operator</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400">
          Secured with Argon2id Password Hashing & 256-bit JWT Session Encryption
        </p>
      </div>
    </div>
  );
}
