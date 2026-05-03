export type Program = { program_id: number; name: string; cohort_year: number; total_credits?: number | null; faculty?: string | null; };

export type SemesterPlanItem = {
  semester_no: number;
  subject_id: string;
  subject_name?: string | null;
  credits?: number | null;
  workload_score?: number | null;
  course_type?: string | null;
  priority?: number | null;
  is_required?: boolean | null;
  prerequisite_ids?: string[];
};

export type ProgramPlanResponse = { program: Program; items: SemesterPlanItem[] };

export type HistoryItem = { subject_id: string; term_code?: string | null; status: "PASSED" | "FAILED" | "IN_PROGRESS" | "DROPPED"; grade?: number | null };

export type HistoryResponse = { student_code: string; items: HistoryItem[] };

export type StudentSummary = {
  student_code: string;
  earned_credits: number;
  registered_credits: number;
  remaining_credits: number;
  total_credits: number;
  year: number;
  suggested_semester_no: number;
};

export type ImportIssue = { level: string; message: string };
export type ParsedSubject = { subject_id: string; subject_name: string; credits: number; prerequisite_ids?: string[] };
export type ParsedMeeting = { day_of_week?: number | null; start_period?: number | null; duration?: number | null; room?: string | null; campus_code?: string | null; is_lab?: boolean | null; study_weeks?: number[] };
export type ParsedSection = { subject_id: string; section_code: string; instructor_lt?: string | null; instructor_btn?: string | null; meetings: ParsedMeeting[] };
export type PasteImportResponse = { import_id: number; subjects?: ParsedSubject[]; sections: ParsedSection[]; issues: ImportIssue[] };

export type TimetableMeeting = { day_of_week?: number | null; start_period?: number | null; duration?: number | null; room?: string | null; study_weeks?: number[] };
export type TimetableItem = { id: number; section_id: number; subject_id: string; section_code: string; subject_name?: string | null; credits?: number | null; meetings: TimetableMeeting[]; has_conflict: boolean };
export type TimetableSummary = { registered_credits: number; workload_score: number; conflicts_count: number };

export type RecommendationReason = { code: string; text: string };
export type RecommendedCourse = { subject_id: string; subject_name?: string | null; credits: number; workload_score: number; course_type?: string | null; reasons: RecommendationReason[] };
export type RecommendationResponse = {
  student_code: string;
  program_id: number;
  semester_no: number;
  term_profile: "NORMAL" | "SUMMER";
  target_credits: number;
  total_credits: number;
  total_workload: number;
  courses: RecommendedCourse[];
  warnings: string[];
};

// Schedule Generator
export type SchedulePreference = "COMPACT_DAYS" | "MORNING_ONLY" | "AFTERNOON_ONLY" | "BALANCED" | "SAME_CAMPUS" | "CUSTOM_DAYS";
export type ScheduleMeetingItem = { day_of_week: number; start_period: number; duration: number; room?: string | null; campus_code?: string | null; study_weeks?: number[] };
export type ScheduleItem = { section_id: number; subject_id: string; section_code: string; subject_name?: string | null; credits: number; instructor_lt?: string | null; instructor_btn?: string | null; meetings: ScheduleMeetingItem[] };
export type CampusConflict = { day: number; day_name: string; from_campus: string; to_campus: string; gap_periods: number; is_critical: boolean };
export type ScheduleOption = {
  option_name: string;
  label: string;
  section_ids: number[];
  items: ScheduleItem[];
  registered_credits: number;
  workload_score: number;
  conflicts_count: number;
  days_used: number[];
  score: number;
  score_breakdown: Record<string, number>;
  campus_conflicts?: CampusConflict[];
  warnings?: string[];
  pref_match_pct?: number;
};
export type ScheduleGenerateResponse = { 
  options: ScheduleOption[];
  alternative_sections: Record<string, ScheduleItem[]>;
};
