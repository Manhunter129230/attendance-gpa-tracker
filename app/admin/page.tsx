"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

interface Subject {
  id: string;
  subject_name: string;
}

interface TimetableSlot {
  id: string;
  subject_id: string;
  day_of_week: number;
  slot_number: number;
}

export default function AdminPanel() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedDay, setSelectedDay] = useState(1); 
  const [selectedSlot, setSelectedSlot] = useState(1); 

  const ADMIN_EMAIL = "raeedanees@gmail.com"; 
  const daysOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    setMounted(true);
    verifyAdminAuth();
  }, []);

  const verifyAdminAuth = async () => {
    try {
      setLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push("/dashboard");
        return;
      }

      if (user.email?.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()) {
        setIsAdmin(true);
        await fetchMasterData();
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Critical admin verification barrier failure:", err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const { data: subData } = await supabase.from("subjects").select("id, subject_name");
      const formattedSubjects = subData || [];
      setSubjects(formattedSubjects);
      
      if (formattedSubjects.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(formattedSubjects[0].id);
      }

      const { data: timeData } = await supabase
        .from("timetable")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("slot_number", { ascending: true });
      setTimetable(timeData || []);
    } catch (err) {
      console.error("Database sync execution fault:", err);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Error logging out: " + error.message);
    else router.push("/login");
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("subjects").insert([
      { subject_name: newSubjectName.trim(), user_id: user.id, credits: 3 }
    ]);

    if (error) alert(error.message);
    else {
      setNewSubjectName("");
      await fetchMasterData();
    }
  };

  const handleMapSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("timetable").insert([
      { 
        subject_id: selectedSubjectId, 
        day_of_week: selectedDay, 
        slot_number: selectedSlot,
        user_id: user.id
      }
    ]);

    if (error) {
      alert("Conflict: This slot is already occupied on that specific day!");
    } else {
      await fetchMasterData();
    }
  };

  const handleRemoveSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to remove this class slot from the master timetable?")) return;
    const { error } = await supabase.from("timetable").delete().eq("id", slotId);
    if (!error) await fetchMasterData();
  };

  if (!mounted) return null;

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 font-semibold text-sm tracking-wide">Securing Admin Workstation Channel...</p>
      </div>
    );
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-center bg-slate-950 border border-slate-800 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Central Master Schedule Control Room</h1>
          <p className="text-indigo-400 text-xs font-mono mt-0.5">Admin Security Profile: {ADMIN_EMAIL}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="bg-slate-800 text-slate-200 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition">
            ← Student Portal View
          </button>
          <button 
            onClick={handleSignOut} 
            className="bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-900/50 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">1. Catalog New Global Subject</h3>
          <form onSubmit={handleCreateSubject} className="space-y-3">
            <input
              type="text" required placeholder="e.g., Data Structures & Algos" value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm focus:outline-none focus:border-indigo-500 transition"
            />
            <button type="submit" className="w-full bg-white text-slate-950 text-sm font-bold py-2.5 rounded-xl">
              Add Subject to Core Database
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">2. Map Master Timetable Slot</h3>
          <form onSubmit={handleMapSlot} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Subject</label>
              <select
                value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm focus:outline-none focus:border-indigo-500 transition"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Day</label>
                <select
                  value={selectedDay} onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm focus:outline-none"
                >
                  {daysOfWeekNames.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Slot Assignment</label>
                <select
                  value={selectedSlot} onChange={(e) => setSelectedSlot(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm focus:outline-none text-center"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>Slot {num}</option>)}
                </select>
              </div>
            </div>
            
            <button type="submit" disabled={subjects.length === 0} className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl disabled:bg-slate-800 disabled:text-slate-600">
              Publish to Master Schedule
            </button>
          </form>
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white">
        <h2 className="text-lg font-bold mb-1">Active Global Timetable Registry</h2>
        <p className="text-xs text-slate-400 mb-6">This displays every class currently deployed across your user ecosystem.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Time Slot</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-medium">
              {timetable.map(slot => {
                const matchedCourse = subjects.find(s => s.id === slot.subject_id);
                return (
                  <tr key={slot.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 text-white font-bold">{daysOfWeekNames[slot.day_of_week]}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-indigo-950/50 border border-indigo-500/30 text-indigo-400 text-xs font-black px-2.5 py-1 rounded-md">Slot {slot.slot_number}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{matchedCourse ? matchedCourse.subject_name : "Unknown Reference"}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => handleRemoveSlot(slot.id)} className="text-rose-400 hover:text-rose-300 text-xs font-bold transition">
                        Delete Slot
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}