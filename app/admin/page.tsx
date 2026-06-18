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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Admin Data Pools
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);

  // Form Inputs
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedDay, setSelectedDay] = useState(1); // Default Monday
  const [selectedSlot, setSelectedSlot] = useState(1); // Default Slot 1

  const ADMIN_EMAIL = "raeedanees@gmail.com"; 
  const daysOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    verifyAdminAuth();
  }, []);

  const verifyAdminAuth = async () => {
    try {
      setLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.error("Admin verification failed: No active session found.", error);
        router.push("/dashboard");
        return;
      }

      console.log("Supabase Auth detected user email:", user.email);
      console.log("Target Admin Email expected:", ADMIN_EMAIL);

      // Clean check: Trim spaces and ignore uppercase/lowercase variations
      if (user.email?.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()) {
        console.log("Access granted. Initializing Admin Control panel logs...");
        setIsAdmin(true);
        await fetchMasterData();
      } else {
        console.warn("Access Denied: Logged in account is not an administrator.");
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Critical error inside route guard:", err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    // 1. Fetch all cataloged subjects
    const { data: subData } = await supabase.from("subjects").select("id, subject_name");
    const formattedSubjects = subData || [];
    setSubjects(formattedSubjects);
    
    if (formattedSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(formattedSubjects[0].id);
    }

    // 2. Fetch current active master timetable
    const { data: timeData } = await supabase
      .from("timetable")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("slot_number", { ascending: true });
    setTimetable(timeData || []);
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
      fetchMasterData();
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
      console.error(error);
    } else {
      fetchMasterData();
    }
  };

  const handleRemoveSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to remove this class slot from the master timetable?")) return;
    const { error } = await supabase.from("timetable").delete().eq("id", slotId);
    if (!error) fetchMasterData();
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 font-semibold text-sm tracking-wide">Securing Admin Workstation Channel...</p>
      </div>
    );
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Admin Header */}
      <header className="flex justify-between items-center bg-slate-950 border border-slate-800 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Central Master Schedule Control Room</h1>
          <p className="text-indigo-400 text-xs font-mono mt-0.5">Admin Security Profile: {ADMIN_EMAIL}</p>
        </div>
        <button onClick={() => router.push("/dashboard")} className="bg-slate-800 text-slate-200 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition">
          ← Student Portal View
        </button>
      </header>

      {/* Control Forms */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Module 1: Catalog New Global Subject */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm text-white">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">1. Catalog New Global Subject</h3>
          <form onSubmit={handleCreateSubject} className="space-y-3">
            <input
              type="text" required placeholder="e.g., Data Structures & Algos" value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
            <button type="submit" className="w-full bg-white hover:bg-slate-200 text-slate-950 text-sm font-bold py-2.5 rounded-xl transition shadow-md">
              Add Subject to Core Database
            </button>
          </form>
        </div>

        {/* Module 2: Map Subject to Master Timetable */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm text-white">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">2. Map Master Timetable Slot</h3>
          <form onSubmit={handleMapSlot} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Subject</label>
              <select
                value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                {subjects.length === 0 && <option>No subjects available yet...</option>}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Day</label>
                <select
                  value={selectedDay} onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  {daysOfWeekNames.map((name, index) => <option key={index} value={index}>{name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Slot Assignment</label>
                <select
                  value={selectedSlot} onChange={(e) => setSelectedSlot(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:outline-none focus:border-indigo-500 transition text-center"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>Slot {num}</option>)}
                </select>
              </div>
            </div>
            
            <button type="submit" disabled={subjects.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-semibold py-2.5 rounded-xl transition shadow-md">
              Publish to Master Schedule Checklist
            </button>
          </form>
        </div>
      </section>

      {/* Current Master Schedule Live Overview */}
      <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm text-white">
        <h2 className="text-lg font-bold text-white mb-1">Active Global Timetable Registry</h2>
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
              {timetable.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500 text-xs border-none">
                    No active schedule configurations have been written to the database yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}