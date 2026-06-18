"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient"; 

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
      router.push("/dashboard"); 
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

  // Handle Standard Credential Logging In
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Please fill in all fields");
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // If the error states unconfirmed, send an OTP and route to verification
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

  // Handle New Registration Single-Call Only
  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Please provide an email and password first");

    setLoading(true);
    try {
      // One Single Request: signUp natively sends an OTP when custom SMTP is connected
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

  // Verify Code Verification Form
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return alert("Please input the verification code.");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token.trim(),
        type: "signup" // Reverted back to signup verification format to support standard single-flow signUp tracking
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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-slate-900 p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center">Student Attendance Vault</h2>

        {!showOtpScreen ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
                placeholder="student@college.edu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 py-2 font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Sign In"}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-700"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-sm">or</span>
              <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <button 
              type="button" 
              onClick={handleSignUp}
              disabled={loading}
              className="w-full rounded-md bg-slate-800 border border-slate-700 py-2 font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Create an Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-4 bg-indigo-950/40 border border-indigo-900/50 rounded-xl text-center">
              <p className="text-sm font-medium text-indigo-300">
                Go check your email inbox for an OTP validation token code and enter it below to authorize this session.
              </p>
              <p className="text-xs text-slate-400 mt-2 font-mono">Target profile: {email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 tracking-wide">Enter OTP Token</label>
              <input 
                type="text" 
                maxLength={10}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full text-center text-xl font-mono tracking-widest rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
                placeholder="••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-md bg-emerald-600 py-2 font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying Token..." : "Verify Code & Authorize"}
            </button>

            <button 
              type="button"
              onClick={() => setShowOtpScreen(false)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-400 font-medium transition"
            >
              ← Back to Sign In Screen
            </button>
          </form>
        )}
      </div>
    </div>
  );
}