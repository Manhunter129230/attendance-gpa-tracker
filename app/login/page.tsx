"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);

  const ADMIN_EMAIL = "raeedanees@gmail.com";

  const routeUserBasedOnRole = (userEmail: string | undefined) => {
    if (userEmail?.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()) {
      router.push("/admin");
    } else {
      router.push("/home");
    }
  };

  useEffect(() => {
    setMounted(true);
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        routeUserBasedOnRole(session.user.email);
      }
    };
    checkUser();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Please fill in all fields");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          alert("Your email profile isn't verified yet! Requesting a 6-digit access code.");

          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false }
          });

          if (otpError) alert(`Rate Limit Guard: ${otpError.message}`);
          else setShowOtpScreen(true);
        } else {
          alert(`Login Error: ${error.message}`);
        }
      } else if (data?.user) {
        routeUserBasedOnRole(data.user.email);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Please provide an email and password first");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        alert(`Account Creation Rejected: ${error.message}`);
      } else {
        alert("Account initialized! Check your inbox for your verification code.");
        setShowOtpScreen(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return alert("Please input the verification code.");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token.trim(),
        type: "signup"
      });

      if (error) {
        alert(`Verification Failure: ${error.message}`);
      } else if (data?.user) {
        alert("Email confirmed smoothly! Welcome aboard.");
        routeUserBasedOnRole(data.user.email);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md space-y-6 rounded-[25px] p-8 md:p-10 transition-all duration-500 hover:border-[#f9d423]/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_40px_rgba(249,212,35,0.1)]">

        <div>
          <h2 className="text-2xl md:text-3xl font-black text-center bg-gradient-to-r from-[#f9d423] to-[#ff4e50] bg-clip-text text-transparent drop-shadow-sm tracking-tight">
            Attendance Vault
          </h2>
          <p className="text-center text-xs text-white/40 mt-1 font-medium tracking-wide">
            Secure Academic Authentication Matrix
          </p>
        </div>

        {!showOtpScreen ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#f9d423]/50 focus:bg-black/60 transition duration-300 text-sm"
                placeholder="student@college.edu"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#f9d423]/50 focus:bg-black/60 transition duration-300 text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#f9d423] to-[#ff4e50] text-black font-bold py-3 text-sm hover:opacity-90 active:scale-[0.98] transition transform shadow-lg shadow-rose-500/10 disabled:opacity-50"
            >
              {loading ? "Authorizing Security..." : "Sign In"}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-white/20 text-xs font-bold uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full rounded-xl bg-white/5 border border-white/10 py-3 text-sm font-bold text-white hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition transform disabled:opacity-50"
            >
              Create Matrix Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center">
              <p className="text-xs font-medium text-amber-300/90 leading-relaxed">
                Security key dispatched. Check your custom inbox for your verification token.
              </p>
              <p className="text-[10px] text-white/40 mt-1.5 font-mono break-all">Routing Profile: {email}</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5 text-center">Enter Verification Code</label>
              <input
                type="text"
                maxLength={10}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full text-center text-2xl font-mono tracking-[0.4em] rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-[#f9d423]/50 focus:bg-black/60 transition duration-300"
                placeholder="••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 text-white font-bold py-3 text-sm hover:bg-emerald-500 active:scale-[0.98] transition transform shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              {loading ? "Validating Session..." : "Verify Code & Authorize"}
            </button>

            <button
              type="button"
              onClick={() => setShowOtpScreen(false)}
              className="w-full text-center text-xs text-white/40 hover:text-white/60 font-medium transition pt-2 block"
            >
              ← Return to Credential Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}