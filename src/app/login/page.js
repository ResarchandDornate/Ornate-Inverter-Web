"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { postData } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { showSuccess, showError, extractApiMessage } from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showError("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await postData("/auth/signin/", { email, password });
      // Per API docs: response is { access, refresh, user } at the top level.
      const token = res?.access || res?.data?.access;
      if (!token) throw new Error("No access token received");

      setToken(token);
      showSuccess("Welcome back!");
      router.replace("/dashboard");
    } catch (err) {
      showError(extractApiMessage(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-orange-100 via-rose-100 to-amber-100">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="Ornate Solar"
            className="mb-4 h-14 w-auto object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-800">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Sign in to continue</p>
        </div>

        <label className="block text-sm font-semibold mb-2 text-slate-700">Email</label>
        <div className="flex items-center border border-slate-300 rounded-xl px-4 mb-4 bg-slate-50 focus-within:border-orange-400">
          <Mail size={20} className="text-slate-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            autoComplete="email"
            className="flex-1 ml-3 py-3 bg-transparent outline-none text-slate-800"
          />
        </div>

        <label className="block text-sm font-semibold mb-2 text-slate-700">Password</label>
        <div className="flex items-center border border-slate-300 rounded-xl px-4 mb-2 bg-slate-50 focus-within:border-orange-400">
          <Lock size={20} className="text-slate-400" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            className="flex-1 ml-3 py-3 bg-transparent outline-none text-slate-800"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-slate-500"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="flex justify-end mb-6">
          <button type="button" className="text-orange-500 font-semibold text-sm">
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-lg flex items-center justify-center disabled:opacity-60 hover:opacity-95 transition"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Sign In Securely"}
        </button>

        <div className="flex justify-center mt-6 text-sm">
          <span className="text-slate-500">Don&apos;t have an account?&nbsp;</span>
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="text-orange-500 font-bold"
          >
            Create Account
          </button>
        </div>
      </form>
    </div>
  );
}
