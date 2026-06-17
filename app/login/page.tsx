"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Handle User Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  // Handle New User Registration
  const handleSignUp = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
    } else if (data.user && data.session === null) {
      setSuccessMessage("Success! Check your email inbox for a verification link.");
    } else {
      setSuccessMessage("Account created successfully! Logging you in...");
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Get Started</h1>
          <p className="text-slate-500 mt-1">Track your college life globally and for free.</p>
        </header>

        {/* Dynamic Status Alert Badges */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-medium border border-rose-100">
            ❌ {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-100">
            🎉 {successMessage}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm text-slate-800"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl shadow-md transition mt-2 text-sm"
          >
            {loading ? "Processing..." : "Sign In"}
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">New to the platform?</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button 
          onClick={handleSignUp}
          disabled={loading}
          className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-400 text-slate-700 font-semibold py-3 rounded-xl transition text-sm"
        >
          Create an Account
        </button>
      </div>
    </main>
  );
}