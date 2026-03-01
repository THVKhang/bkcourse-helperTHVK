import {
  Program,
  ProgramPlanResponse,
  HistoryResponse,
  StudentSummary,
  PasteImportResponse,
  TimetableItem,
  TimetableSummary,
  RecommendationResponse
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

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
};
