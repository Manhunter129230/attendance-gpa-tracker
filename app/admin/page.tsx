"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

interface Subject { id: string; subject_name: string; }
interface TimetableSlot { id: string; subject_id: string; day_of_week: number; slot_number: number; }

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

  // Single-focus active dropdown tracker string parameter ('subject' | 'day' | 'slot' | null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const ADMIN_EMAIL = "raeedanees@gmail.com"; 
  const daysOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => { setMounted(true); verifyAdminAuth(); }, []);

  const verifyAdminAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email?.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()) {
      setIsAdmin(true);
      await fetchMasterData();
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  const fetchMasterData = async () => {
    const { data: subData } = await supabase.from("subjects").select("id, subject_name");
    const formattedSubjects = subData || [];
    setSubjects(formattedSubjects);
    if (formattedSubjects.length > 0 && !selectedSubjectId) setSelectedSubjectId(formattedSubjects[0].id);

    const { data: timeData } = await supabase.from("timetable").select("*").order("day_of_week", { ascending: true }).order("slot_number", { ascending: true });
    setTimetable(timeData || []);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("subjects").insert([{ subject_name: newSubjectName.trim(), user_id: user?.id, credits: 3 }]);
    setNewSubjectName("");
    await fetchMasterData();
  };

  const handleRemoveSubject = async (subjectId: string, name: string) => {
    if (!confirm(`Permanently remove "${name}" and unbind all scheduled slots?`)) return;
    await supabase.from("timetable").delete().eq("subject_id", subjectId);
    await supabase.from("attendance").delete().eq("subject_id", subjectId);
    await supabase.from("subjects").delete().eq("id", subjectId);
    await fetchMasterData();
  };

  const handleMapSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("timetable").insert([{ subject_id: selectedSubjectId, day_of_week: selectedDay, slot_number: selectedSlot, user_id: user?.id }]);
    if (error) alert("Slot occupied!"); else await fetchMasterData();
  };

  const handleRemoveSlot = async (slotId: string) => {
    await supabase.from("timetable").delete().eq("id", slotId);
    await fetchMasterData();
  };

  const toggleDropdown = (dropdownName: string) => {
    if (activeDropdown === dropdownName) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdownName);
    }
  };

  if (!mounted || loading || !isAdmin) return null;

  const activeSubjectName = subjects.find(s => s.id === selectedSubjectId)?.subject_name || "Select Subject Pointer";

  return (
    <main className="py-12 max-w-[1000px] mx-auto space-y-8 min-h-screen selection:bg-rose-500/30">
      
      {/* Control Station Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/10 pb-6 text-center md:text-left animate-reveal-up">
        <div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#f9d423] to-[#ff4e50] bg-clip-text text-transparent drop-shadow-lg tracking-tight">
            Master Control Center
          </h1>
          <p className="text-indigo-400 font-mono text-xs mt-1 tracking-widest uppercase animate-slide-right">
            OPERATIONAL PIPELINE ENVIRONMENT · ID: {ADMIN_EMAIL}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="cyber-btn-secondary bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md">
            ← Core Workspace View
          </button>
        </div>
      </header>

      {/* Inputs Configuration Matrix */}
      <section className="grid md:grid-cols-2 gap-6 animate-reveal-up [animation-delay:0.12s]">
        
        {/* Form Panel 1: Subject Entry */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-2xl transition-all duration-300">
          <h3 className="font-bold text-xs uppercase tracking-widest text-white/40">01. Catalog Global Parameter</h3>
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <input
              type="text" required placeholder="e.g., Quantum Algorithm Systems" value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/40 text-sm focus:outline-none focus:border-[#f9d423] transition-all placeholder:text-white/20 text-white font-medium"
            />
            <button type="submit" className="w-full cyber-btn-primary text-black text-sm font-black py-3 rounded-xl shadow-md uppercase tracking-wider">
              Write Registry Line
            </button>
          </form>
        </div>

        {/* Form Panel 2: Interactive Custom Dropdown Timetable Mapper */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-2xl transition-all duration-300">
          <h3 className="font-bold text-xs uppercase tracking-widest text-white/40">02. Initialize Layout Mappings</h3>
          <form onSubmit={handleMapSlot} className="space-y-4">
          
          {/* Custom Dropdown 1: Subject Selector */}
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold tracking-wider text-white/30 mb-1.5">Target Subject</label>
            <button
              type="button"
              onClick={() => toggleDropdown('subject')}
              className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-black/40 text-sm font-medium text-white flex justify-between items-center transition-all hover:border-white/20 active:scale-99"
            >
              <span className="truncate max-w-[90%]">{activeSubjectName}</span>
              <span className={`text-[10px] opacity-40 transition-transform duration-300 ${activeDropdown === 'subject' ? 'rotate-180' : ''}`}>▼</span>
            </button>

            <div 
              className={`dropdown-transition-container absolute w-full mt-2 max-h-[200px] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-[30px] shadow-2xl z-50 p-1.5 space-y-0.5 ${
                activeDropdown === 'subject' ? 'is-open block' : 'hidden'
              }`}
            >
              {subjects.map(s => (
                <button
                  key={s.id} type="button"
                  onClick={() => { setSelectedSubjectId(s.id); setActiveDropdown(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedSubjectId === s.id ? 'bg-gradient-to-r from-[#f9d423] to-[#ff4e50] text-black' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {s.subject_name}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-grid containing Day and Slot Custom Drawers */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Custom Dropdown 2: Weekday Selector */}
            <div className="relative">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-white/30 mb-1.5">Weekly Weekday</label>
              <button
                type="button"
                onClick={() => toggleDropdown('day')}
                className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-black/40 text-sm font-medium text-white flex justify-between items-center transition-all hover:border-white/20 active:scale-99"
              >
                <span>{daysOfWeekNames[selectedDay]}</span>
                <span className={`text-[10px] opacity-40 transition-transform duration-300 ${activeDropdown === 'day' ? 'rotate-180' : ''}`}>▼</span>
              </button>

              <div 
                className={`dropdown-transition-container absolute w-full mt-2 rounded-xl border border-white/10 bg-slate-950/90 backdrop-blur-[30px] shadow-2xl z-50 p-1.5 space-y-0.5 ${
                  activeDropdown === 'day' ? 'is-open block' : 'hidden'
                }`}
              >
                {daysOfWeekNames.map((name, idx) => (
                  <button
                    key={idx} type="button"
                    onClick={() => { setSelectedDay(idx); setActiveDropdown(null); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedDay === idx ? 'bg-gradient-to-r from-[#f9d423] to-[#ff4e50] text-black' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dropdown 3: Slot Selector */}
            <div className="relative">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-white/30 mb-1.5">Slot Number</label>
              <button
                type="button"
                onClick={() => toggleDropdown('slot')}
                className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-black/40 text-sm font-medium text-white flex justify-between items-center transition-all hover:border-white/20 active:scale-99 justify-center gap-2"
              >
                <span>Slot 0{selectedSlot}</span>
                <span className={`text-[10px] opacity-40 transition-transform duration-300 ${activeDropdown === 'slot' ? 'rotate-180' : ''}`}>▼</span>
              </button>

              <div 
                className={`dropdown-transition-container absolute w-full mt-2 max-h-[180px] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/90 backdrop-blur-[30px] shadow-2xl z-50 p-1.5 space-y-0.5 ${
                  activeDropdown === 'slot' ? 'is-open block' : 'hidden'
                }`}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => { setSelectedSlot(n); setActiveDropdown(null); }}
                    className={`w-full text-center px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedSlot === n ? 'bg-gradient-to-r from-[#f9d423] to-[#ff4e50] text-black' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    Slot 0{n}
                  </button>
                ))}
              </div>
            </div>

          </div>
          
          <button type="submit" disabled={subjects.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-950/40 transform active:scale-98 uppercase tracking-wider disabled:opacity-20">
            Bind Schedule Link Vector
          </button>
        </form>
        </div>
      </section>

      {/* Dynamic Grid Subject Manager */}
      <section className="glass-panel p-6 rounded-3xl shadow-2xl space-y-4 animate-reveal-up [animation-delay:0.2s]">
        <h2 className="text-xl font-black text-white tracking-wide">Stored Catalog Indices</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjects.map((s, idx) => (
            <div 
              key={s.id} 
              className="group flex justify-between items-center p-4 bg-black/20 border border-white/5 rounded-2xl hover:border-white/15 transition-all duration-300 animate-reveal-up"
              style={{ animationDelay: `${0.25 + idx * 0.05}s` }}
            >
              <span className="text-sm font-semibold truncate text-white/80 group-hover:text-[#f9d423] transition-colors duration-300">{s.subject_name}</span>
              <button onClick={() => handleRemoveSubject(s.id, s.subject_name)} className="text-[10px] text-rose-400 bg-rose-950/20 px-3 py-1.5 rounded-xl font-bold border border-rose-900/30 hover:bg-rose-600 hover:text-white transition-all duration-300 uppercase tracking-wider">
                Purge
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Master Interactive Relational Matrix Table */}
      <section className="glass-panel p-6 rounded-3xl shadow-2xl space-y-4 animate-reveal-up [animation-delay:0.35s]">
        <h2 className="text-xl font-black text-white tracking-wide">Live Active System Schedule Matrix</h2>
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-sm text-white/70 border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                <th className="py-4 px-5">Timeline Phase</th>
                <th className="py-4 px-5">Index Slot</th>
                <th className="py-4 px-5">Linked Core Subject</th>
                <th className="py-4 px-5 text-right">Operation Execution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/10">
              {timetable.map((slot, idx) => {
                const matchedCourse = subjects.find(s => s.id === slot.subject_id);
                return (
                  <tr 
                    key={slot.id} 
                    className="hover:bg-white/5 transition-all duration-300 group animate-reveal-up"
                    style={{ animationDelay: `${0.4 + idx * 0.03}s` }}
                  >
                    <td className="py-4 px-5 text-white font-bold transition-colors duration-300 group-hover:text-[#f9d423]">{daysOfWeekNames[slot.day_of_week]}</td>
                    <td className="py-4 px-5">
                      <span className="bg-white/5 border border-white/10 text-[#f9d423] text-xs font-mono font-black px-2.5 py-1 rounded-md tracking-wider">SLOT 0{slot.slot_number}</span>
                    </td>
                    <td className="py-4 px-5 text-white/80">{matchedCourse ? matchedCourse.subject_name : <span className="text-rose-400 font-mono text-xs uppercase tracking-wider animate-pulse">Unresolved Link Pointer</span>}</td>
                    <td className="py-4 px-5 text-right">
                      <button onClick={() => handleRemoveSlot(slot.id)} className="text-rose-400 hover:text-white bg-rose-950/0 hover:bg-rose-600 px-3 py-1.5 rounded-xl text-xs font-bold uppercase border border-transparent hover:border-rose-500/30 transition-all duration-300 tracking-wider">
                        Unbind
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