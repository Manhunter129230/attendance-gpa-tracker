"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

interface Subject { id: string; subject_name: string; credits: number; }
interface TimetableSlot { id: string; subject_id: string; day_of_week: number; slot_number: number; }
interface AttendanceLog { id: string; subject_id: string; status: "Present" | "Absent"; slot_number: number; }

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [globalStats, setGlobalStats] = useState<Record<string, { present: number; absent: number; percentage: number }>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Custom Calendar Dropdown View State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Ref container to track click-outside anomalies
  const calendarRef = useRef<HTMLDivElement>(null);

  const daysOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => { 
    setMounted(true); 
    checkUser(); 
  }, []);

  useEffect(() => { 
    if (mounted && user) {
      // If the data array is already populated, treat it as a silent background update
      const isSilent = subjects.length > 0;
      fetchAllData(user.id, isSilent); 
    }
  }, [user, selectedDate, mounted]);

  // Click-Outside Listener Engine
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) router.push("/login"); 
      else setUser(user);
    } catch (err) {
      router.push("/login");
    }
  };

  const fetchAllData = async (userId: string, isSilentRefresh = false) => {
    // Only trigger the full screen blocking loader on the initial load
    if (!isSilentRefresh) {
      setLoading(true);
    }
    
    try {
      const { data: subData } = await supabase.from("subjects").select("*");
      const parsedSubjects = subData || [];
      setSubjects(parsedSubjects);

      const { data: timeData } = await supabase.from("timetable").select("*").order("slot_number", { ascending: true });
      setTimetable(timeData || []);

      const targetISODate = selectedDate.toISOString().split("T")[0];
      const { data: dailyLogs } = await supabase.from("attendance").select("id, subject_id, status, slot_number").eq("user_id", userId).eq("date", targetISODate);
      setAttendanceLogs((dailyLogs as AttendanceLog[]) || []);

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
      console.error(err); 
    } finally { 
      // Always clear the loading state when finished
      setLoading(false); 
    }
  };

  const handleSignOut = async () => { 
    await supabase.auth.signOut(); 
    router.push("/login"); 
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
      await supabase.from("attendance").insert([{ user_id: user.id, subject_id: subjectId, status: targetStatus, date: targetISODate, slot_number: slotNumber }]);
    }
    await fetchAllData(user.id, true);
  };

  if (!mounted) return null;
  const activeDayOfWeek = selectedDate.getDay();
  const scheduledSlotsForDay = timetable.filter(t => t.day_of_week === activeDayOfWeek);

  if (loading && subjects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 font-mono tracking-widest text-sm animate-pulse">SYNCING VAULT LAYERS...</p>
      </div>
    );
  }

  return (
    <main className="py-12 max-w-[1000px] mx-auto space-y-8 min-h-screen">
      
      {/* Header Block */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/10 pb-6 text-center md:text-left animate-reveal-up">
        <div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#f9d423] to-[#ff4e50] bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] tracking-tight">
            Attendance Vault
          </h1>
          <p className="text-white/50 text-xs font-medium tracking-widest mt-1 uppercase">
            CS &amp; Data Science Management Matrix · Index Level
          </p>
        </div>
        
        <div className="flex gap-3">
          {user?.email?.trim().toLowerCase() === "raeedanees@gmail.com" && (
            <button 
              onClick={() => router.push("/admin")} 
              className="cyber-btn-primary text-black font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-lg animate-glow-loop"
            >
              ⚙️ Admin Control Panel
            </button>
          )}
          <button onClick={handleSignOut} className="cyber-btn-secondary bg-white/5 border border-white/10 text-rose-400 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md">
            Sign Out
          </button>
        </div>
      </header>

      {/* Calendar Strip Panel */}
      <section className="glass-panel p-6 rounded-3xl space-y-4 shadow-2xl animate-reveal-up [animation-delay:0.15s] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 pb-4">
          <div className="text-left w-full sm:w-auto h-[40px] flex flex-col justify-center">
            <h2 className="text-[10px] uppercase font-bold tracking-widest text-white/40">Active Scope Timeline</h2>
            <p 
              key={selectedDate.toISOString()} 
              className="text-sm font-black text-[#f9d423] mt-0.5 tracking-wide animate-slide-right"
            >
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          {/* Re-engineered Custom Animated Calendar Pop-over Component with Event Isolation */}
          <div ref={calendarRef} className="relative w-full sm:w-auto">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCalendarOpen((prev) => !prev);
              }}
              className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 w-full sm:w-auto justify-between group cursor-pointer transition-all duration-300 hover:border-[#f9d423]/40 hover:bg-black/60 shadow-inner"
            >
              <span className="text-xs font-bold text-white/40">Jump Index:</span>
              <span className="text-xs font-mono font-black text-[#ff4e50] tracking-wider transition-transform duration-300 group-hover:scale-105">
                Select Date 📅
              </span>
            </button>

            {/* FLOATING GLASS MATRIX CALENDAR */}
            <div 
              id="cyber-calendar-matrix" 
              onClick={(e) => e.stopPropagation()} 
              className={`dropdown-transition-container absolute right-0 mt-3 w-[320px] p-5 rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-[40px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] z-50 transform origin-top-right ${
                isCalendarOpen ? "is-open" : ""
              }`}
            >
              {/* New Inner wrapper enforces smooth sliding mechanics */}
              <div className="dropdown-transition-inner">
                
                {/* Calendar Month Header */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3">
                  <span className="text-sm font-black tracking-wide text-white">
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prevMonth = new Date(selectedDate);
                        prevMonth.setMonth(prevMonth.getMonth() - 1);
                        setSelectedDate(prevMonth);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    >
                      ◀
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextMonth = new Date(selectedDate);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        setSelectedDate(nextMonth);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    >
                      ▶
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCalendarOpen(false);
                      }}
                      className="p-1.5 ml-1 text-white/30 hover:text-rose-400 font-bold transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Weekday Labels Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black tracking-widest text-white/30 uppercase mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                </div>

                {/* Dynamic Days Engine Grid — Type and Scope Safe */}
                <div className="grid grid-cols-7 gap-1.5 text-center font-mono">
                  {(() => {
                    const year = selectedDate.getFullYear();
                    const month = selectedDate.getMonth();
                    const firstDayIndex = new Date(year, month, 1).getDay();
                    const totalDays = new Date(year, month + 1, 0).getDate();
                    const gridCells = [];

                    for (let i = 0; i < firstDayIndex; i++) {
                      gridCells.push(<div key={`empty-${i}`} className="p-2 text-transparent select-none" />);
                    }

                    for (let day = 1; day <= totalDays; day++) {
                      const currentIterationDate = new Date(year, month, day);
                      const isSelected = currentIterationDate.toDateString() === selectedDate.toDateString();
                      const isToday = currentIterationDate.toDateString() === new Date().toDateString();

                      gridCells.push(
                        <button
                          key={`day-${day}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); 
                            setSelectedDate(currentIterationDate); // 👈 Trigger state update safely
                            setIsCalendarOpen(false); 
                          }}
                          className={`p-2 rounded-xl text-xs font-bold transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer ${
                            isSelected
                              ? "bg-gradient-to-r from-[#f9d423] to-[#ff4e50] text-black font-black shadow-md shadow-amber-500/20"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          } ${isToday && !isSelected ? "border border-[#f9d423]/50 text-[#f9d423]" : ""}`}
                        >
                          {day}
                        </button>
                      );
                    }
                    return gridCells;
                  })()}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Active Slider Horizontal Ribbon Row */}
        <div className="flex justify-center gap-3 overflow-x-auto pt-4 pb-2 px-1 scroll-smooth">
          {[-2, -1, 0, 1, 2].map((offset) => {
            const date = new Date(selectedDate);
            date.setDate(selectedDate.getDate() + offset);
            const isSelected = offset === 0;
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <button
                key={date.toISOString()} 
                onClick={() => setSelectedDate(date)}
                className={`relative flex flex-col items-center pb-3 pt-2.5 rounded-2xl min-w-[78px] text-center
                  cursor-pointer select-none transition-all duration-500 cubic-bezier(0.25, 1, 0.5, 1) transform 
                  hover:bg-white/10 active:scale-95 will-change-transform group/btn ${
                  isSelected 
                    ? "bg-gradient-to-r from-[#f9d423] to-[#ff4e50] text-black font-extrabold shadow-[0_10px_25px_rgba(249,212,35,0.15)] scale-105 border border-[#f9d423]/20" 
                    : "bg-white/5 border border-white/5 text-white/70 hover:-translate-y-0.5"
                } ${isToday && !isSelected ? "border border-[#f9d423]/50 shadow-[inset_0_0_10px_rgba(249,212,35,0.1)]" : ""}`}
              >
                <span className={`text-[9px] uppercase font-black tracking-widest transition-colors duration-300 ${isSelected ? "text-black/70" : "text-white/30 group-hover/btn:text-white/60"}`}>
                  {daysOfWeekNames[date.getDay()].substring(0, 3)}
                </span>
                <span className="text-2xl font-black tracking-tight mt-0.5">{date.getDate()}</span>
                
                <span 
                  className={`absolute bottom-1.5 left-1/4 right-1/4 h-[2.5px] rounded-full transition-all duration-500 cubic-bezier(0.25, 1, 0.5, 1) ${
                    isSelected 
                      ? "bg-black scale-x-100 opacity-80" 
                      : "bg-gradient-to-r from-[#f9d423] to-[#ff4e50] scale-x-0 opacity-0 group-hover/btn:scale-x-50 group-hover/btn:opacity-40"
                  }`} 
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Dynamic Staggered Checklist Cards */}
      <section className="glass-panel p-6 rounded-3xl shadow-2xl space-y-6 animate-reveal-up [animation-delay:0.3s]">
        <div>
          <h2 className="text-xl font-black text-white tracking-wide">Relational Agenda Pipeline</h2>
          <p className="text-xs text-white/40 mt-0.5">Toggle tracking indices below. Values synchronize instantly.</p>
        </div>

        <div className="space-y-4">
          {scheduledSlotsForDay.map((slot, index) => {
            const course = subjects.find(s => s.id === slot.subject_id);
            if (!course) return null;

            const currentLog = attendanceLogs.find(l => l.subject_id === course.id && l.slot_number === slot.slot_number);
            const stats = globalStats[course.id] || { present: 0, absent: 0, percentage: 100 };
            const isBelow = stats.percentage < 75;

            return (
              <div 
                key={slot.id} 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl gap-4 transition-all duration-300 hover:border-white/15 animate-reveal-up"
                style={{ animationDelay: `${0.35 + index * 0.08}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/5 border border-white/10 font-mono font-black px-3 py-2 rounded-xl text-xs tracking-wider text-[#f9d423] transition-transform duration-300 hover:scale-110">
                    SLOT 0{slot.slot_number}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base tracking-wide transition-colors duration-300 hover:text-[#f9d423]">{course.subject_name}</h4>
                    <div className="flex gap-3 text-xs font-medium text-white/40 mt-0.5">
                      <span>Total Matrix: <strong className={isBelow ? "text-rose-400 font-extrabold animate-pulse" : "text-emerald-400 font-extrabold"}>{stats.percentage}%</strong></span>
                      <span className="opacity-50">({stats.present}P / {stats.absent}A)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => toggleAttendance(course.id, slot.slot_number, "Present")}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all duration-300 uppercase shadow-md transform active:scale-95 ${
                      currentLog?.status === "Present" 
                        ? "bg-emerald-600 text-white scale-105 border border-emerald-500/40 shadow-emerald-900/30 font-black" 
                        : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    ✓ Present
                  </button>
                  <button
                    onClick={() => toggleAttendance(course.id, slot.slot_number, "Absent")}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all duration-300 uppercase shadow-md transform active:scale-95 ${
                      currentLog?.status === "Absent" 
                        ? "bg-rose-600 text-white scale-105 border border-rose-500/40 shadow-rose-900/30 font-black" 
                        : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    ✗ Absent
                  </button>
                </div>
              </div>
            );
          })}

          {scheduledSlotsForDay.length === 0 && (
            <div className="text-center py-12 bg-black/20 rounded-2xl border border-dashed border-white/10 animate-reveal-up">
              <p className="text-white/30 text-xs font-mono tracking-widest uppercase">No classes linked to this scheduling day vector.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}