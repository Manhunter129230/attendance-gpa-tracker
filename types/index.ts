export interface Subject {
  id: string;
  subject_name: string;
  credits: number;
}

export interface TimetableSlot {
  id: string;
  subject_id: string;
  day_of_week: number;
  slot_number: number;
}

export interface AttendanceLog {
  id: string;
  subject_id: string;
  status: "Present" | "Absent";
  slot_number: number;
}