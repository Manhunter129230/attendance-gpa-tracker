"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Subject } from "@/types";

interface SubjectStats { present: number; absent: number; percentage: number; }

export default function HomeDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<Record<string, SubjectStats>>({});

  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

  useEffect(() => {
    if (mounted && user) {
      fetchOverview(user.id);
    }
  }, [user, mounted]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) router.push("/login");
      else setUser(user);
    } catch (err) {
      router.push("/login");
    }
  };

  const fetchOverview = async (userId: string) => {
    setLoading(true);
    try {
      const [subRes, logsRes] = await Promise.all([
        supabase.from("subjects").select("*"),
        supabase.from("attendance").select("subject_id, status").eq("user_id", userId),
      ]);

      const parsedSubjects = subRes.data || [];
      setSubjects(parsedSubjects);

      const statsMap: Record<string, SubjectStats> = {};
      parsedSubjects.forEach((s) => statsMap[s.id] = { present: 0, absent: 0, percentage: 100 });

      logsRes.data?.forEach((log) => {
        if (!statsMap[log.subject_id]) return;
        if (log.status === "Present") statsMap[log.subject_id].present += 1;
        if (log.status === "Absent") statsMap[log.subject_id].absent += 1;
      });

      Object.keys(statsMap).forEach((id) => {
        const total = statsMap[id].present + statsMap[id].absent;
        statsMap[id].percentage = total === 0 ? 100 : parseFloat(((statsMap[id].present / total) * 100).toFixed(1));
      });

      setStats(statsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 font-mono tracking-widest text-sm animate-pulse">LOADING OVERVIEW...</p>
      </div>
    );
  }

  const overallTotal = Object.values(stats).reduce((sum, s) => sum + s.present + s.absent, 0);
  const overallPresent = Object.values(stats).reduce((sum, s) => sum + s.present, 0);
  const overallPercentage = overallTotal === 0 ? 100 : parseFloat(((overallPresent / overallTotal) * 100).toFixed(1));
  const subjectsBelowThreshold = Object.values(stats).filter((s) => s.percentage < 75).length;

  return (
    <main className="py-12 max-w-[1000px] mx-auto space-y-8 min-h-screen">

      <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/10 pb-6 text-center md:text-left animate-reveal-up">
        <div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#f9d423] to-[#ff4e50] bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] tracking-tight">
            Overview
          </h1>
          <p className="text-white/50 text-xs font-medium tracking-widest mt-1 uppercase">
            Per-Subject Attendance Snapshot
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/home/attendance")}
            className="cyber-btn-primary text-black font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-lg animate-glow-loop"
          >
            Open Attendance Vault →
          </button>
          <button onClick={handleSignOut} className="cyber-btn-secondary bg-white/5 border border-white/10 text-rose-400 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md">
            Sign Out
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-reveal-up [animation-delay:0.1s]">
        <div className="glass-panel p-5 rounded-2xl text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Overall</p>
          <p className={`text-2xl font-black ${overallPercentage < 75 ? "text-rose-400" : "text-emerald-400"}`}>{overallPercentage}%</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Subjects</p>
          <p className="text-2xl font-black text-white">{subjects.length}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl text-center col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Below 75%</p>
          <p className={`text-2xl font-black ${subjectsBelowThreshold > 0 ? "text-rose-400" : "text-emerald-400"}`}>{subjectsBelowThreshold}</p>
        </div>
      </section>

      <section className="space-y-4 animate-reveal-up [animation-delay:0.2s]">
        <h2 className="text-xl font-black text-white tracking-wide px-1">Subjects</h2>

        {subjects.length === 0 ? (
          <div className="text-center py-12 bg-black/20 rounded-2xl border border-dashed border-white/10">
            <p className="text-white/30 text-xs font-mono tracking-widest uppercase">No subjects added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map((s, idx) => {
              const stat = stats[s.id] || { present: 0, absent: 0, percentage: 100 };
              const isBelow = stat.percentage < 75;

              return (
                <div
                  key={s.id}
                  className="glass-panel p-5 rounded-2xl flex items-center justify-between gap-4 animate-reveal-up"
                  style={{ animationDelay: `${0.25 + idx * 0.05}s` }}
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-base truncate">{s.subject_name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{stat.present}P / {stat.absent}A</p>
                  </div>
                  <div className={`text-2xl font-black shrink-0 ${isBelow ? "text-rose-400" : "text-emerald-400"}`}>
                    {stat.percentage}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}