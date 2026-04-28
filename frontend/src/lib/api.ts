import {
  Program,
  ProgramPlanResponse,
  HistoryResponse,
  StudentSummary,
  PasteImportResponse,
  TimetableItem,
  TimetableSummary,
  RecommendationResponse,
  ScheduleGenerateResponse,
  SchedulePreference,
  ScheduleOption,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "/_/backend" : "http://localhost:8000");

const TOKEN_KEY = "bkcourse_token";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((init?.headers as any) || {}) };

  // Attach JWT token from localStorage
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Auth API (custom JWT)
interface AuthResponse {
  token: string;
  username: string;
  email?: string | null;
  student_code?: string | null;
}

export const authApi = {
  register: (username: string, password: string, email?: string) =>
    http<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ username, password, email: email || null }) }),

  login: (username: string, password: string) =>
    http<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  guest: () =>
    http<AuthResponse>("/auth/guest", { method: "POST" }),

  forgotPassword: (email: string) =>
    http<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: (token: string, newPassword: string) =>
    http<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password: newPassword }) }),

  me: () =>
    http<{ username: string; email?: string; student_code?: string }>("/auth/me"),
};

export const api = {
  getPrograms: () => http<Program[]>("/programs"),
  getProgramPlan: (programId: number) => http<ProgramPlanResponse>(`/programs/${programId}/plan`),

  getHistory: (studentCode: string) => http<HistoryResponse>(`/students/${encodeURIComponent(studentCode)}/history`),
  postHistory: (studentCode: string, items: any[]) =>
    http<HistoryResponse>("/students/history", { method: "POST", body: JSON.stringify({ student_code: studentCode, items }) }),

  getSummary: (studentCode: string, programId: number, termCode: string) =>
    http<StudentSummary>(`/students/${encodeURIComponent(studentCode)}/summary?program_id=${programId}&term_code=${encodeURIComponent(termCode)}`),

  pasteImport: (studentCode: string, termCode: string, rawText: string) =>
    http<PasteImportResponse>("/imports/paste", { method: "POST", body: JSON.stringify({ student_code: studentCode, term_code: termCode, raw_text: rawText }) }),

  getTimetable: (studentCode: string, termCode: string) =>
    http<{items: TimetableItem[]; summary: TimetableSummary}>(`/timetable?student_code=${encodeURIComponent(studentCode)}&term_code=${encodeURIComponent(termCode)}`),

  addTimetableItem: (studentCode: string, termCode: string, sectionId: number) =>
    http<{item_id: number}>(`/timetable/items`, { method: "POST", body: JSON.stringify({ student_code: studentCode, term_code: termCode, section_id: sectionId }) }),

  removeTimetableItem: (studentCode: string, termCode: string, itemId: number) =>
    http<{ok: boolean}>(`/timetable/items`, { method: "DELETE", body: JSON.stringify({ student_code: studentCode, term_code: termCode, item_id: itemId }) }),

  getRecommendations: (payload: {student_code: string; program_id: number; semester_no: number; term_profile: "NORMAL"|"SUMMER"; target_credits: number}) =>
    http<RecommendationResponse>("/recommendations", { method: "POST", body: JSON.stringify(payload) }),

  generateSchedule: (payload: {student_code: string; term_code: string; subject_ids: string[]; preferences: SchedulePreference[]; campus_pref?: "ALL" | "CS1" | "CS2"}) =>
    http<ScheduleGenerateResponse>("/schedule/generate", { method: "POST", body: JSON.stringify(payload) }),

  createShare: (payload: {student_id?: string; term_code?: string; plan_data: ScheduleOption}) =>
    http<{share_id: string}>("/share", { method: "POST", body: JSON.stringify(payload) }),

  getShare: (shareId: string) =>
    http<{share_id: string, plan_data: ScheduleOption}>(`/share/${shareId}`),

  http,
};
