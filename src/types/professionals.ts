export interface DaySchedule {
  active: boolean;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface Professional {
  id: string;
  profile_id: string | null;
  tenant_id: string;
  license_type: string | null;
  license_number: string | null;
  license_state: string | null;
  specialties: string[] | null;
  default_appointment_duration: number | null;
  working_hours: WorkingHours | null;
  rooms: string[] | null;
  commission_type: string | null;
  commission_percent: number | null;
  commission_fixed: number | null;
  accepts_insurance: boolean;
  insurances_accepted: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalWithProfile extends Professional {
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday:    { active: true,  start: "08:00", end: "18:00" },
  tuesday:   { active: true,  start: "08:00", end: "18:00" },
  wednesday: { active: true,  start: "08:00", end: "18:00" },
  thursday:  { active: true,  start: "08:00", end: "18:00" },
  friday:    { active: true,  start: "08:00", end: "18:00" },
  saturday:  { active: false, start: "08:00", end: "12:00" },
  sunday:    { active: false, start: "08:00", end: "12:00" },
};

export const DAY_LABELS: Record<keyof WorkingHours, string> = {
  monday:    "Segunda-feira",
  tuesday:   "Terça-feira",
  wednesday: "Quarta-feira",
  thursday:  "Quinta-feira",
  friday:    "Sexta-feira",
  saturday:  "Sábado",
  sunday:    "Domingo",
};

export const DAYS_OF_WEEK = Object.keys(DAY_LABELS) as (keyof WorkingHours)[];

// Color palette for visual differentiation in the agenda
export const PROFESSIONAL_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];
