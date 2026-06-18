"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient"; 

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Replace your actual admin email address in this constant variable:
  const ADMIN_EMAIL = "raeedanees@gmail.com";

  // Helper utility to safely route the user depending on who they are
  const routeUserBasedOnRole = (userEmail: string | undefined) => {
    if (userEmail === ADMIN_EMAIL) {
      router.push("/admin"); // Admin goes straight to the command center layout
    } else {
      router.push("/dashboard"); // Regular student goes straight to the checklist view
    }
  };

  useEffect(() => {
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert(`Login Error: ${error.message}`);
    } else if (data?.user) {
      // Dynamic Redirect Hook intercepts here upon successful authentication query
      routeUserBasedOnRole(data.user.email);
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Please provide an email and password first");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert(`Account Creation Rejected: ${error.message}`);
    } else {
      alert("Success! Account registered in cloud vault.");
      if (data?.user) {
        routeUserBasedOnRole(data.user.email);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 rounded-xl bg-slate-900 p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center">Student Attendance Vault</h2>
        
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
            onChange={(e) => setPassword(e.target.value)} // Cleaned: Removed duplicate rogue setEmail line
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

        {/* Note the explicit type="button" to strip native form post bubbles */}
        <button 
          type="button" 
          onClick={handleSignUp}
          disabled={loading}
          className="w-full rounded-md bg-slate-800 border border-slate-700 py-2 font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          Create an Account
        </button>
      </form>
    </div>
  );
}