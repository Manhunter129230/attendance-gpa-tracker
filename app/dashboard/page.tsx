"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

interface Subject {
  id: string;
  subject_name: string;
  credits: number;
}

interface TimetableSlot {
  id: string;
  subject_id: string;
  day_of_week: number;
  slot_number: number;
}

interface AttendanceLog {
  id: string;
  subject_id: string;
  status: "Present" | "Absent";
  slot_number: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Core Data Arrays
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [globalStats, setGlobalStats] = useState<Record<string, { present: number; absent: number; percentage: number }>>({});

  // Interaction States
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newSubjectName, setNewSubjectName] = useState("");
  const [scheduleSubjectId, setScheduleSubjectId] = useState("");
  const [scheduleDay, setScheduleDay] = useState(1); 
  const [scheduleSlot, setScheduleSlot] = useState(1); 

  const daysOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Guard against Next.js Framework Hydration Desynchronization Bugs
  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

  useEffect(() => {
    if (mounted && user) {
      fetchAllData(user.id);
    }
  }, [user, selectedDate, mounted]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/login");
      } else {
        setUser(user);
      }
    } catch (err) {
      console.error("Auth initialization failure:", err);
      router.push("/login");
    }
  };

  const fetchAllData = async (userId: string) => {
    setLoading(true);
    try {
      // 1. Fetch Subjects
      const { data: subData } = await supabase.from("subjects").select("*").eq("user_id", userId);
      const parsedSubjects = subData || [];
      setSubjects(parsedSubjects);
      if (parsedSubjects.length > 0 && !scheduleSubjectId) setScheduleSubjectId(parsedSubjects[0].id);

      // 2. Fetch Weekly Timetable Configuration
      const { data: timeData } = await supabase
        .from("timetable")
        .select("*")
        .eq("user_id", userId)
        .order("slot_number", { ascending: true });
      setTimetable(timeData || []);

      // 3. Fetch attendance logs entered for the focused calendar date
      const targetISODate = selectedDate.toISOString().split("T")[0];
      const { data: dailyLogs } = await supabase
        .from("attendance")
        .select("id, subject_id, status, slot_number")
        .eq("user_id", userId)
        .eq("date", targetISODate);
      setAttendanceLogs((dailyLogs as AttendanceLog[]) || []);

      // 4. Fetch ALL historic logs to maintain running percentage calculations
      const { data: allLogs } = await supabase.from("attendance").select("subject_id, status").eq("user_id", userId);
      
      const statsMap: Record<string, { present: number; absent: number; percentage: number }> = {};
      parsedSubjects.forEach(s => statsMap[s.id] = { present: 0, absent: 0, percentage: 100 });

      allLogs?.forEach(log => {
        if (!statsMap[log.subject_id]) return;
        if (log.status === "Present") statsMap[log.subject_id].present += 1;
        if (log.status === "Absent") statsMap[log.subject_id].absent += 1;
      });

      Object.keys(statsMap).forEach(id => {
        const total = statsMap[id].present + statsMap[id].absent;
        statsMap[id].percentage = total === 0 ? 100 : parseFloat(((statsMap[id].present / total) * 100).toFixed(1));
      });
      setGlobalStats(statsMap);
    } catch (err) {
      console.error("Data tracking compilation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Error logging out: " + error.message);
    else router.push("/login");
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !user) return;
    const { error } = await supabase.from("subjects").insert([{ user_id: user.id, subject_name: newSubjectName.trim(), credits: 3 }]);
    if (!error) { setNewSubjectName(""); fetchAllData(user.id); }
  };

  const handleAssignSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleSubjectId || !user) return;
    
    const { error } = await supabase.from("timetable").insert([
      { 
        user_id: user.id, 
        subject_id: scheduleSubjectId, 
        day_of_week: scheduleDay,
        slot_number: scheduleSlot
      }
    ]);
    
    if (error) alert("This specific time slot is already occupied on that day!");
    else fetchAllData(user.id);
  };

  const toggleAttendance = async (subjectId: string, slotNumber: number, targetStatus: "Present" | "Absent") => {
    if (!user) return;
    const targetISODate = selectedDate.toISOString().split("T")[0];
    const existingLog = attendanceLogs.find(l => l.subject_id === subjectId && l.slot_number === slotNumber);

    if (existingLog) {
      if (existingLog.status === targetStatus) {
        await supabase.from("attendance").delete().eq("id", existingLog.id);
      } else {
        await supabase.from("attendance").update({ status: targetStatus }).eq("id", existingLog.id);
      }
    } else {
      await supabase.from("attendance").insert([
        { 
          user_id: user.id, 
          subject_id: subjectId, 
          status: targetStatus, 
          date: targetISODate,
          slot_number: slotNumber 
        }
      ]);
    }
    fetchAllData(user.id);
  };

  const getCalendarDays = () => {
    const days = [];
    const baseDate = new Date(selectedDate);
    const selectedDayOfWeek = baseDate.getDay(); 
    const daysToWednesday = 3 - selectedDayOfWeek;
    const targetWednesday = new Date(baseDate);
    targetWednesday.setDate(baseDate.getDate() + daysToWednesday);

    for (let i = -2; i <= 2; i++) {
      const d = new Date(targetWednesday);
      d.setDate(targetWednesday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  if (!mounted) return null;

  const activeDayOfWeek = selectedDate.getDay();
  const scheduledSlotsForDay = timetable.filter(t => t.day_of_week === activeDayOfWeek);

  if (loading && subjects.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500 font-medium">Reconstructing schedule tensors...</p></div>;
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Daily Student Attendance Portal</h1>
          <p className="text-slate-500 text-sm">Centralized Schedule Mode (Criteria Index: 75%)</p>
        </div>
        
      {/* Dynamic Action Controls */}
      <div className="flex gap-3">
        {user?.email?.trim().toLowerCase() === "raeedanees@gmail.com" && (
          <button 
            onClick={() => router.push("/admin")} 
            className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm"
          >
            ⚙️ Admin Panel
          </button>
        )}
        <button 
          onClick={handleSignOut}
          className="border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl text-sm font-bold transition"
        >
          Sign Out
        </button>
      </div>
      </header>

      <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-slate-100 pb-4">
          <div className="text-left">
            <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400">Active Tracking Timeline</h2>
            <p className="text-sm font-black text-indigo-600 mt-0.5">
              Viewing Agenda For: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-full sm:w-auto justify-between">
            <label htmlFor="jump-date" className="text-xs font-bold text-slate-500 whitespace-nowrap">Jump to Any Date:</label>
            <input 
              id="jump-date" type="date" value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => { if (e.target.value) setSelectedDate(new Date(e.target.value)); }}
              className="bg-transparent text-xs font-bold text-indigo-600 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-center gap-2 overflow-x-auto py-1">
          {getCalendarDays().map((date, idx) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <button
                key={idx} onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center p-3 rounded-xl min-w-[70px] transition ${
                  isSelected ? "bg-indigo-600 text-white shadow-md" : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                } ${isToday && !isSelected ? "border border-indigo-300" : ""}`}
              >
                <span className="text-[10px] uppercase font-bold opacity-70">{daysOfWeekNames[date.getDay()].substring(0, 3)}</span>
                <span className="text-lg font-black mt-0.5">{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Scheduled Classes Checklist</h2>
        <p className="text-xs text-slate-400 mb-6">Log attendance separately for each distinct time slot throughout the day.</p>

        <div className="space-y-4">
          {scheduledSlotsForDay.map(slot => {
            const course = subjects.find(s => s.id === slot.subject_id);
            if (!course) return null;

            const currentLog = attendanceLogs.find(l => l.subject_id === course.id && l.slot_number === slot.slot_number);
            const stats = globalStats[course.id] || { present: 0, absent: 0, percentage: 100 };
            const isBelow = stats.percentage < 75;

            return (
              <div key={slot.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50/70 rounded-xl border border-slate-100 transition gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 text-indigo-700 font-extrabold px-3 py-2 rounded-xl text-xs whitespace-nowrap">
                    Slot {slot.slot_number}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{course.subject_name}</h4>
                    <div className="flex gap-3 text-xs font-medium text-slate-400 mt-0.5">
                      <span>Overall Score: <strong className={isBelow ? "text-rose-600" : "text-emerald-600"}>{stats.percentage}%</strong></span>
                      <span>({stats.present}P / {stats.absent}A)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => toggleAttendance(course.id, slot.slot_number, "Present")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      currentLog?.status === "Present" ? "bg-emerald-600 text-white" : "bg-white border text-slate-600"
                    }`}
                  >
                    ✓ Present
                  </button>
                  <button
                    onClick={() => toggleAttendance(course.id, slot.slot_number, "Absent")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      currentLog?.status === "Absent" ? "bg-rose-600 text-white" : "bg-white border text-slate-600"
                    }`}
                  >
                    ✗ Absent
                  </button>
                </div>
              </div>
            );
          })}

          {scheduledSlotsForDay.length === 0 && (
            <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">No classes configured for this specific weekday.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-slate-400 mb-4">1. Catalog New Subject</h3>
          <form onSubmit={handleAddSubject} className="space-y-3">
            <input
              type="text" required placeholder="e.g., Quantum Mechanics" value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 text-sm text-slate-800 focus:outline-none"
            />
            <button type="submit" className="w-full bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl">
              Create Subject Reference
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-slate-400 mb-4">2. Map Weekly Schedule & Slots</h3>
          <form onSubmit={handleAssignSchedule} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Subject</label>
              <select
                value={scheduleSubjectId} onChange={(e) => setScheduleSubjectId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 text-sm text-slate-800 focus:outline-none"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Day</label>
                <select
                  value={scheduleDay} onChange={(e) => setScheduleDay(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 text-sm text-slate-800 focus:outline-none"
                >
                  {daysOfWeekNames.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Slot Number</label>
                <select
                  value={scheduleSlot} onChange={(e) => setScheduleSlot(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 text-sm text-slate-800 focus:outline-none text-center"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>Slot {num}</option>)}
                </select>
              </div>
            </div>
            
            <button type="submit" disabled={subjects.length === 0} className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl mt-2 disabled:bg-slate-300">
              Map to Timetable Slot
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}