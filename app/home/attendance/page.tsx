"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Subject, TimetableSlot, AttendanceLog } from "@/types";

export default function AttendanceVault() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [globalStats, setGlobalStats] = useState<Record<string, { present: number; absent: number; percentage: number }>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarPos, setCalendarPos] = useState({ top: 0, right: 0 });

  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const hasLoadedOnce = useRef(false);

  const daysOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const toLocalISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

  useEffect(() => {
    if (mounted && user) {
      fetchAllData(user.id, hasLoadedOnce.current);
    }
  }, [user, selectedDate, mounted]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const calendarEl = document.getElementById("cyber-calendar-matrix");
      const clickedInsideButton = calendarRef.current && calendarRef.current.contains(event.target as Node);
      const clickedInsideDropdown = calendarEl && calendarEl.contains(event.target as Node);
      if (!clickedInsideButton && !clickedInsideDropdown) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function repositionCalendar() {
      if (calendarButtonRef.current && isCalendarOpen) {
        const rect = calendarButtonRef.current.getBoundingClientRect();
        setCalendarPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
      }
    }
    window.addEventListener("resize", repositionCalendar);
    window.addEventListener("scroll", repositionCalendar, true);
    return () => {
      window.removeEventListener("resize", repositionCalendar);
      window.removeEventListener("scroll", repositionCalendar, true);
    };
  }, [isCalendarOpen]);

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
    if (!isSilentRefresh) {
      setLoading(true);
    }

    try {
      const targetISODate = toLocalISODate(selectedDate);

      const [subRes, timeRes, dailyRes, allRes] = await Promise.all([
        supabase.from("subjects").select("*"),
        supabase.from("timetable").select("*").order("slot_number", { ascending: true }),
        supabase.from("attendance").select("id, subject_id, status, slot_number").eq("user_id", userId).eq("date", targetISODate),
        supabase.from("attendance").select("subject_id, status").eq("user_id", userId),
      ]);

      const parsedSubjects = subRes.data || [];
      setSubjects(parsedSubjects);
      setTimetable(timeRes.data || []);
      setAttendanceLogs((dailyRes.data as AttendanceLog[]) || []);

      const statsMap: Record<string, { present: number; absent: number; percentage: number }> = {};
      parsedSubjects.forEach(s => statsMap[s.id] = { present: 0, absent: 0, percentage: 100 });

      allRes.data?.forEach(log => {
        if (!statsMap[log.subject_id]) return;
        if (log.status === "Present") statsMap[log.subject_id].present += 1;
        if (log.status === "Absent") statsMap[log.subject_id].absent += 1;
      });

      Object.keys(statsMap).forEach(id => {
        const total = statsMap[id].present + statsMap[id].absent;
        statsMap[id].percentage = total === 0 ? 100 : parseFloat(((statsMap[id].present / total) * 100).toFixed(1));
      });
      setGlobalStats(statsMap);

      hasLoadedOnce.current = true;
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

  const toggleAttendance = async (subjectId: string, slotNumber: number, targetStatus: "Present" | "Absent") => {
    if (!user) return;
    const targetISODate = toLocalISODate(selectedDate);
    const existingLog = attendanceLogs.find(l => l.subject_id === subjectId && l.slot_number === slotNumber);

    const prevLogs = attendanceLogs;
    const prevStats = globalStats;

    let nextLogs: AttendanceLog[];
    let deltaStatus: "Present" | "Absent" | null = null;
    let addedStatus: "Present" | "Absent" | null = null;

    if (existingLog) {
      if (existingLog.status === targetStatus) {
        nextLogs = attendanceLogs.filter(l => l.id !== existingLog.id);
        deltaStatus = existingLog.status;
      } else {
        nextLogs = attendanceLogs.map(l => l.id === existingLog.id ? { ...l, status: targetStatus } : l);
        deltaStatus = existingLog.status;
        addedStatus = targetStatus;
      }
    } else {
      nextLogs = [...attendanceLogs, { id: `temp-${Date.now()}`, subject_id: subjectId, status: targetStatus, slot_number: slotNumber }];
      addedStatus = targetStatus;
    }
    setAttendanceLogs(nextLogs);

    setGlobalStats(prev => {
      const current = prev[subjectId] || { present: 0, absent: 0, percentage: 100 };
      let { present, absent } = current;
      if (deltaStatus === "Present") present -= 1;
      if (deltaStatus === "Absent") absent -= 1;
      if (addedStatus === "Present") present += 1;
      if (addedStatus === "Absent") absent += 1;
      const total = present + absent;
      const percentage = total === 0 ? 100 : parseFloat(((present / total) * 100).toFixed(1));
      return { ...prev, [subjectId]: { present, absent, percentage } };
    });

    try {
      if (existingLog) {
        if (existingLog.status === targetStatus) {
          await supabase.from("attendance").delete().eq("id", existingLog.id);
        } else {
          await supabase.from("attendance").update({ status: targetStatus }).eq("id", existingLog.id);
        }
      } else {
        await supabase.from("attendance").insert([{ user_id: user.id, subject_id: subjectId, status: targetStatus, date: targetISODate, slot_number: slotNumber }]);
      }
      fetchAllData(user.id, true);
    } catch (err) {
      console.error(err);
      setAttendanceLogs(prevLogs);
      setGlobalStats(prevStats);
    }
  };

  const openCalendar = () => {
    if (calendarButtonRef.current) {
      const rect = calendarButtonRef.current.getBoundingClientRect();
      setCalendarPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
    }
    setIsCalendarOpen((prev) => !prev);
  };

  if (!mounted) return null;
  const activeDayOfWeek = selectedDate.getDay();
  const scheduledSlotsForDay = timetable.filter(t => t.day_of_week === activeDayOfWeek);

  if (loading && !hasLoadedOnce.current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 font-mono tracking-widest text-sm animate-pulse">SYNCING VAULT LAYERS...</p>
      </div>
    );
  }

  return (
    <main className="py-12 max-w-[1000px] mx-auto space-y-8 min-h-screen">

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

          <div ref={calendarRef} className="relative w-full sm:w-auto">
            <button
              ref={calendarButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCalendar();
              }}
              className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 w-full sm:w-auto justify-between group cursor-pointer transition-all duration-300 hover:border-[#f9d423]/40 hover:bg-black/60 shadow-inner"
            >
              <span className="text-xs font-bold text-white/40">Jump Index:</span>
              <span className="text-xs font-mono font-black text-[#ff4e50] tracking-wider transition-transform duration-300 group-hover:scale-105">
                Select Date 📅
              </span>
            </button>
          </div>
        </div>

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

      {mounted && createPortal(
        <div
          id="cyber-calendar-matrix"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ top: calendarPos.top, right: calendarPos.right, position: "fixed" }}
          className={`dropdown-transition-container w-[320px] p-5 rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-[40px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] z-50 transform origin-top-right ${
            isCalendarOpen ? "is-open" : ""
          }`}
        >
          <div className="dropdown-transition-inner">

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

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black tracking-widest text-white/30 uppercase mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
            </div>

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
                        setSelectedDate(currentIterationDate);
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
        </div>,
        document.body
      )}

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
                        ? "bg-emerald-600 text-white scale-105 border border-emerald-500/40 shadow-emerald-900/30"
                        : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    ✓ Present
                  </button>
                  <button
                    onClick={() => toggleAttendance(course.id, slot.slot_number, "Absent")}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all duration-300 uppercase shadow-md transform active:scale-95 ${
                      currentLog?.status === "Absent"
                        ? "bg-rose-600 text-white scale-105 border border-rose-500/40 shadow-rose-900/30"
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