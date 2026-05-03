"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useUser } from "@/components/UserProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, GraduationCap, Clock, Info,
  Sun, Moon, Minimize2, LayoutGrid, ClipboardPaste, Eye, Upload, FileText,
  XCircle, Plus, Search, BookOpen, Download, ArrowRight, MapPin, Star, Share2, Loader2, Sparkles, Trash2, MousePointerClick, Calendar, Link2, CalendarCheck, Zap
} from "lucide-react";
import type { PasteImportResponse, ScheduleOption, SchedulePreference, ParsedMeeting } from "@/lib/types";
import { exportToExcel } from "@/lib/export-excel";
import { exportToICS } from "@/lib/export-ical";
import { InteractiveTimetable } from "@/components/InteractiveTimetable";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7"];
const PERIODS = Array.from({ length: 12 }, (_, i) => i + 1);
const BLOCK_COLORS = 8;

const DAY_CLASSES: Record<number, string> = {
  2: "day-t2 day-pill", 3: "day-t3 day-pill", 4: "day-t4 day-pill",
  5: "day-t5 day-pill", 6: "day-t6 day-pill", 7: "day-t7 day-pill",
};

const PREF_OPTIONS: { id: SchedulePreference; label: string; desc: string; icon: React.ElementType; color: string; activeBg: string; activeBorder: string }[] = [
  { id: "BALANCED", label: "Cân bằng", desc: "Giàn đều các môn trong tuần", icon: LayoutGrid, color: "text-indigo-500", activeBg: "bg-indigo-50 dark:bg-indigo-950/40", activeBorder: "border-indigo-300 dark:border-indigo-700" },
  { id: "MORNING_ONLY", label: "Chỉ buổi sáng", desc: "Tiết 2–6 (trước 12h)", icon: Sun, color: "text-amber-500", activeBg: "bg-amber-50 dark:bg-amber-950/40", activeBorder: "border-amber-300 dark:border-amber-700" },
  { id: "AFTERNOON_ONLY", label: "Chỉ buổi chiều", desc: "Tiết 7–12 (sau 12h)", icon: Moon, color: "text-violet-500", activeBg: "bg-violet-50 dark:bg-violet-950/40", activeBorder: "border-violet-300 dark:border-violet-700" },
  { id: "COMPACT_DAYS", label: "Gom ít ngày", desc: "Học ít ngày nhất có thể", icon: Minimize2, color: "text-emerald-500", activeBg: "bg-emerald-50 dark:bg-emerald-950/40", activeBorder: "border-emerald-300 dark:border-emerald-700" },
  { id: "CUSTOM_DAYS", label: "Chọn ngày cụ thể", desc: "Chỉ học vào các ngày bạn chọn", icon: CalendarCheck, color: "text-rose-500", activeBg: "bg-rose-50 dark:bg-rose-950/40", activeBorder: "border-rose-300 dark:border-rose-700" },
];

const DAY_TOGGLE_OPTIONS = [
  { value: 2, label: "T2" }, { value: 3, label: "T3" }, { value: 4, label: "T4" },
  { value: 5, label: "T5" }, { value: 6, label: "T6" }, { value: 7, label: "T7" },
];

const CAMPUS_LABELS: Record<string, string> = { "1": "CS1 (LTK)", "2": "CS2 (Dĩ An)" };
const SCORE_LABELS: Record<string, string> = { gap: "Lủng giờ", preference: "Sở thích", commute: "Đi lại", fatigue: "Cường độ", campus: "Cơ sở" };

function MeetingPill({ m }: { m: ParsedMeeting }) {
  const end = (m.start_period || 0) + (m.duration || 0) - 1;
  const cls = DAY_CLASSES[m.day_of_week || 0] || "bg-secondary text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {DAY_LABELS[(m.day_of_week || 2) - 2] || "?"} P{m.start_period}–{end}
      {m.room && <span className="opacity-70">• {m.room}</span>}
      {m.study_weeks && m.study_weeks.length > 0 && <span className="opacity-70 ml-1">({m.study_weeks.length} tuần)</span>}
    </span>
  );
}

const STEP_COLORS = [
  { bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', line: 'bg-indigo-400' },
  { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-600 dark:text-violet-400', line: 'bg-violet-400' },
  { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', line: 'bg-amber-400' },
];

function Stepper({ step }: { step: number }) {
  const displayStep = step >= 2 ? 2 : step;
  const steps = [
    { label: "Nhập liệu", icon: ClipboardPaste },
    { label: "Cấu hình", icon: BookOpen },
    { label: "Kết quả", icon: Sparkles },
  ];
  return (
    <div className="flex items-center justify-between w-full max-w-lg mx-auto mb-8">
      {steps.map((s, i) => {
        const c = STEP_COLORS[i];
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                i < displayStep ? `${c.bg} ${c.border} text-white shadow-lg shadow-${c.bg}/25` :
                i === displayStep ? `${c.border} ${c.text} bg-transparent` :
                'border-border text-muted-foreground/30'
              }`}>
                <s.icon className="h-4 w-4" />
              </div>
              <span className={`text-xs font-semibold transition-colors ${
                i <= displayStep ? c.text : 'text-muted-foreground/30'
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-3 rounded-full transition-all duration-500 ${
                i < displayStep ? c.line : 'bg-border'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function UnifiedPlannerPage() {
  const { studentCode, setStudentCode, termCode, setTermCode } = useUser();
  const [step, setStep] = useState(0);

  // Step 1: Import
  const [rawText, setRawText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState<PasteImportResponse | null>(null);

  // Step 2: Config
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [selectedPrefs, setSelectedPrefs] = useState<Set<SchedulePreference>>(new Set(["BALANCED", "MORNING_ONLY", "COMPACT_DAYS"]));
  const [campusPref, setCampusPref] = useState<"ALL" | "CS1" | "CS2">("ALL");
  const [programType, setProgramType] = useState<"STANDARD" | "HIGH_QUALITY" | "TALENT" | "PFIEV">("STANDARD");
  const [customDays, setCustomDays] = useState<Set<number>>(new Set());
  const [allowHeavyDays, setAllowHeavyDays] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [sharing, setSharing] = useState(false);

  // Step 3 & 4: Results
  const [options, setOptions] = useState<ScheduleOption[]>([]);
  const [alternativeSections, setAlternativeSections] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState(0);

  const activeOption = options[activeTab];

  const handleShare = async () => {
    if (!activeOption) return;
    setSharing(true);
    try {
      const res = await api.createShare({
        student_id: studentCode || undefined,
        term_code: termCode || undefined,
        plan_data: activeOption
      });
      const url = `${window.location.origin}/share/${res.share_id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link chia sẻ vào clipboard!");
    } catch (e: any) {
      toast.error(e.message || "Không thể chia sẻ lúc này");
    } finally {
      setSharing(false);
    }
  };

  // Try to load import data on mount
  useEffect(() => {
    const saved = localStorage.getItem("bkcourse_last_import");
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed && parsed.sections && parsed.sections.length > 0) {
          setImportData(parsed);
          setStep(1); // Skip to step 2 (0-indexed 1) if data exists
        }
      } catch { /* ignore */ }
    }
  }, []);

  // Fetch completed subjects from study-plan
  const [completedSubjects, setCompletedSubjects] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window !== "undefined") {
      const allCompleted = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sp_completed_")) {
          try {
            const arr = JSON.parse(localStorage.getItem(key) || "[]");
            arr.forEach((id: string) => allCompleted.add(id));
          } catch { /* ignore */ }
        }
      }
      setCompletedSubjects(allCompleted);
    }
  }, []);

  const availableSubjects = useMemo(() => {
    if (!importData) return [];
    const map = new Map<string, number>();
    importData.sections.forEach((s) => {
      map.set(s.subject_id, (map.get(s.subject_id) || 0) + 1);
    });
    
    // Merge with importData.subjects to get prerequisites
    const subjMap = new Map();
    if (importData.subjects) {
      importData.subjects.forEach(s => subjMap.set(s.subject_id, s));
    }
    
    return Array.from(map.entries()).map(([id, count]) => {
      const info = subjMap.get(id);
      return { id, count, name: info?.subject_name, prereqs: info?.prerequisite_ids || [] };
    }).sort((a, b) => a.id.localeCompare(b.id));
  }, [importData]);

  async function handleImport() {
    if (!rawText.trim()) { toast.error("Vui lòng dán dữ liệu"); return; }
    if (!studentCode) { toast.error("Vui lòng đăng nhập hoặc vào chế độ Khách trước"); return; }
    
    setImporting(true);
    try {
      const res = await api.pasteImport(studentCode, termCode, rawText);
      
      // MERGE: combine new sections with existing ones (avoid duplicates by section_code)
      const existingSections = importData?.sections || [];
      const existingKeys = new Set(existingSections.map(s => `${s.subject_id}_${s.section_code}`));
      const newSections = res.sections.filter(s => !existingKeys.has(`${s.subject_id}_${s.section_code}`));
      const merged = [...existingSections, ...newSections];
      
      const mergedData = { ...res, sections: merged };
      setImportData(mergedData);
      localStorage.setItem("bkcourse_last_import", JSON.stringify(mergedData));
      
      // Auto-select ALL subjects (old + new)
      const allSubj = new Set<string>(selectedSubjects);
      res.sections.forEach(s => allSubj.add(s.subject_id));
      setSelectedSubjects(allSubj);
      
      const newSubjects = new Set(res.sections.map(s => s.subject_id));
      toast.success(`+${newSubjects.size} môn mới (tổng: ${new Set(merged.map(s => s.subject_id)).size} môn)`);
      setRawText("");
      setStep(1); // Move to config
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi phân tích dữ liệu");
    } finally {
      setImporting(false);
    }
  }

  function clearAllData() {
    setImportData(null);
    setSelectedSubjects(new Set());
    setRawText("");
    localStorage.removeItem("bkcourse_last_import");
    setStep(0);
    toast.success("Đã xoá tất cả dữ liệu");
  }

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePref(pref: SchedulePreference) {
    setSelectedPrefs((prev) => {
      const next = new Set(prev);
      if (next.has(pref)) next.delete(pref); else next.add(pref);
      return next;
    });
  }

  async function handleGenerate() {
    if (selectedSubjects.size === 0) { toast.error("Vui lòng chọn ít nhất 1 môn"); return; }
    if (selectedPrefs.size === 0) { toast.error("Vui lòng chọn ít nhất 1 kiểu lịch"); return; }
    
    setGenerating(true);
    let msgIndex = 0;
    const msgs = ["Đang phân tích 500+ tổ hợp...", "Đang loại bỏ lịch lủng...", "Đang tối ưu hóa...", "Sắp xong rồi..."];
    setLoadingMsg(msgs[0]);
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % msgs.length;
      setLoadingMsg(msgs[msgIndex]);
    }, 600);

    try {
      const res = await api.generateSchedule({
        student_code: studentCode,
        term_code: termCode,
        subject_ids: Array.from(selectedSubjects),
        preferences: Array.from(selectedPrefs),
        campus_pref: campusPref,
        program_type: programType,
        custom_days: selectedPrefs.has("CUSTOM_DAYS") ? Array.from(customDays) : [],
        allow_heavy_days: allowHeavyDays,
      });
      clearInterval(msgInterval);

      setOptions(res.options);
      setAlternativeSections(res.alternative_sections || {});
      setActiveTab(0);
      if (res.options.length === 0) {
        toast.warning("Không tìm được lịch hợp lệ. Vui lòng giảm số môn hoặc đổi tùy chọn.");
      } else {
        if (res.options.some(o => (o.pref_match_pct || 0) === 100)) {
          const confetti = (await import("canvas-confetti")).default;
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#0052cc", "#fbbc04", "#34a853"] });
        }
        toast.success(`Tạo được ${res.options.length} phương án!`);
        setStep(2); // Move to results
      }
    } catch (e: any) {
      clearInterval(msgInterval);
      toast.error(e?.message || "Lỗi tạo lịch");
    } finally {
      clearInterval(msgInterval);
      setGenerating(false);
    }
  }



  return (
    <div className="grid gap-6 animate-fade-in pb-20">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-display text-3xl tracking-tight text-foreground mb-3">Xếp lịch thông minh</h1>
        <Stepper step={step} />
      </div>

      <div className="max-w-5xl mx-auto w-full">
        {step === 0 && (
          <div className="animate-slide-up grid md:grid-cols-2 gap-6">
            <Card className="card-elevated h-fit">
              <CardHeader className="pb-3"><CardTitle className="text-lg">1. Dán dữ liệu</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Học kỳ</label>
                  <Input value={termCode} onChange={e=>setTermCode(e.target.value)} placeholder="252" />
                </div>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste (Ctrl+V) toàn bộ text từ trang Đăng ký môn học (portal) vào đây..."
                  rows={8}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-mono outline-none transition-all placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <Button onClick={handleImport} disabled={importing || !rawText.trim()} className="w-full gap-2 py-2.5 font-semibold rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all border-0">
                  {importing ? <><Loader2 className="h-4 w-4 animate-spin" />Phân tích...</> : <><ClipboardPaste className="h-4 w-4" />{importData ? "Thêm môn" : "Phân tích"}</>}
                </Button>
                {importData && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs gap-1"><BookOpen className="h-3 w-3" />{new Set(importData.sections.map(s => s.subject_id)).size} môn đã thêm</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs h-6 text-primary">Xem danh sách →</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="bg-gradient-to-br from-indigo-50/80 via-violet-50/50 to-amber-50/30 dark:from-indigo-950/30 dark:via-violet-950/20 dark:to-amber-950/10 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/30 text-sm text-muted-foreground space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Eye className="h-4 w-4 text-indigo-500" /> Hướng dẫn</h3>
              <ul className="list-decimal pl-5 space-y-2.5">
                <li>Truy cập <a href="https://mybk.hcmut.edu.vn" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">mybk.hcmut.edu.vn</a></li>
                <li>Vào mục <strong className="text-foreground">Đăng ký môn học</strong></li>
                <li>Bấm <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-border text-xs font-mono">Ctrl + A</kbd> (hoặc <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-border text-xs font-mono">Cmd + A</kbd> trên Mac) để chọn toàn bộ trang</li>
                <li>Bấm <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-border text-xs font-mono">Ctrl + C</kbd> để copy</li>
                <li>Quay lại đây và bấm <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-border text-xs font-mono">Ctrl + V</kbd> vào ô bên trái</li>
              </ul>
              {importData && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="mb-2 text-foreground font-medium flex items-center justify-between">
                    Dữ liệu cũ vẫn còn
                    <Button variant="outline" size="sm" onClick={() => setStep(1)} className="h-7 text-xs px-3 bg-card hover:bg-primary/10 hover:text-primary transition-colors">Dùng lại</Button>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-6 lg:grid-cols-2 animate-slide-up">
            <Card className="card-elevated h-fit">
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4 text-primary" /> Chọn môn học <Badge variant="secondary" className="text-xs ml-1">{availableSubjects.length} môn</Badge></CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setStep(0)} className="text-xs h-7 gap-1"><Plus className="h-3 w-3" />Thêm môn</Button>
                  <Button variant="ghost" size="sm" onClick={clearAllData} className="text-xs text-destructive/60 hover:text-destructive h-7"><XCircle className="h-3 w-3" /></Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 grid gap-3">
                {availableSubjects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Chưa có môn nào. Quay lại paste dữ liệu.</p>
                  </div>
                )}
                <div className="grid gap-1.5 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
                  {availableSubjects.map((subj) => {
                    const selected = selectedSubjects.has(subj.id);
                    const unmetPrereqs = (subj.prereqs || []).filter((pid: string) => !completedSubjects.has(pid));
                    const isLocked = unmetPrereqs.length > 0;

                    return (
                      <button
                        key={subj.id}
                        onClick={() => {
                          if (isLocked) {
                            toast.warning(`Chưa đạt môn tiên quyết: ${unmetPrereqs.join(", ")}`);
                            return;
                          }
                          toggleSubject(subj.id);
                        }}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                          isLocked 
                            ? "border-border/50 bg-secondary/30 text-muted-foreground cursor-not-allowed opacity-60" 
                            : selected
                              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-semibold"
                              : "border-border/50 hover:border-border hover:bg-secondary/30 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                            isLocked ? "border-muted-foreground/30 bg-secondary" : selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
                          }`}>
                            {selected && !isLocked && <CheckCircle2 className="h-3 w-3" />}
                            {isLocked && <div className="h-1.5 w-1.5 bg-muted-foreground rounded-sm" />}
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="font-mono">{subj.id}</span>
                            {isLocked && <span className="text-[10px] text-red-500/80">Khóa ({unmetPrereqs.join(", ")})</span>}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">{subj.count} nhóm</Badge>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <Button variant="outline" size="sm" onClick={() => { const all = new Set<string>(); availableSubjects.forEach(s => all.add(s.id)); setSelectedSubjects(all); }} className="flex-1 text-xs h-7">Chọn tất cả</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedSubjects(new Set())} className="flex-1 text-xs h-7">Bỏ chọn</Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 h-fit">
              <Card className="card-elevated">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-accent" /> Chọn kiểu lịch</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-2">
                  {PREF_OPTIONS.map((pref) => {
                    const active = selectedPrefs.has(pref.id);
                    return (
                      <button
                        key={pref.id}
                        onClick={() => togglePref(pref.id)}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                          active
                            ? `${pref.activeBorder} ${pref.activeBg}`
                            : "border-border/50 hover:border-border"
                        }`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                          active ? `${pref.activeBg} ${pref.color}` : "bg-secondary text-muted-foreground"
                        }`}>
                          <pref.icon className={`h-4 w-4 ${active ? 'icon-bounce' : ''}`} />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-sm font-semibold ${active ? pref.color : "text-foreground"}`}>{pref.label}</div>
                          <div className="text-xs text-muted-foreground">{pref.desc}</div>
                        </div>
                        <div className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          active ? `${pref.activeBorder} ${pref.color}` : "border-border"
                        }`}>
                          {active && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Program Type Config */}
              <Card className="card-elevated">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4 text-primary" /> Hệ đào tạo</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-2">
                  <select 
                    value={programType} 
                    onChange={e => setProgramType(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="STANDARD">Đại trà (A, L)</option>
                    <option value="HIGH_QUALITY">Chất lượng cao, Tiên tiến (CC)</option>
                    <option value="TALENT">Tài năng (TN)</option>
                    <option value="PFIEV">Việt - Pháp (P)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Thuật toán sẽ chỉ xếp thời khóa biểu với các nhóm lớp dành riêng cho hệ đào tạo này.
                  </p>
                </CardContent>
              </Card>

              {/* Custom Days Picker — only visible when CUSTOM_DAYS is selected */}
              {selectedPrefs.has("CUSTOM_DAYS") && (
                <Card className="card-elevated border-primary/30 animate-slide-up">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-base"><CalendarCheck className="h-4 w-4 text-primary" /> Chọn ngày muốn đi học</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 grid grid-cols-6 gap-2">
                    {DAY_TOGGLE_OPTIONS.map((d) => {
                      const active = customDays.has(d.value);
                      return (
                        <Button
                          key={d.value}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCustomDays(prev => {
                              const next = new Set(prev);
                              if (next.has(d.value)) next.delete(d.value); else next.add(d.value);
                              return next;
                            });
                          }}
                          className="text-xs font-bold"
                        >
                          {d.label}
                        </Button>
                      );
                    })}
                  </CardContent>
                  {customDays.size === 0 && (
                    <div className="px-4 pb-3 text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Vui lòng chọn ít nhất 1 ngày
                    </div>
                  )}
                </Card>
              )}

              <Card className="card-elevated">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-primary" /> Cơ sở học</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-3 gap-2">
                  <Button variant={campusPref === "ALL" ? "default" : "outline"} size="sm" onClick={() => setCampusPref("ALL")} className="text-xs">Tất cả</Button>
                  <Button variant={campusPref === "CS1" ? "default" : "outline"} size="sm" onClick={() => setCampusPref("CS1")} className="text-xs">Chỉ CS1</Button>
                  <Button variant={campusPref === "CS2" ? "default" : "outline"} size="sm" onClick={() => setCampusPref("CS2")} className="text-xs">Chỉ CS2</Button>
                </CardContent>
              </Card>

              {/* Heavy Days Toggle */}
              <Card className="card-elevated">
                <CardContent className="py-3 px-4">
                  <button
                    onClick={() => setAllowHeavyDays(!allowHeavyDays)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${allowHeavyDays ? 'text-muted-foreground' : 'text-amber-500'}`} />
                      <div className="text-left">
                        <div className="text-sm font-medium">Chấp nhận học nhiều môn/ngày?</div>
                        <div className="text-xs text-muted-foreground">{allowHeavyDays ? 'Có — Dồn nhiều môn vào 1 ngày cũng được' : 'Không — Phân bổ đều, tối đa ~4 môn/ngày'}</div>
                      </div>
                    </div>
                    <div className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors duration-300 ${allowHeavyDays ? 'bg-primary' : 'bg-border'}`}>
                      <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ${allowHeavyDays ? 'translate-x-5 shadow-[0_0_8px_hsla(var(--primary),0.3)]' : 'translate-x-0'}`} style={{transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'}} />
                    </div>
                  </button>
                </CardContent>
              </Card>

              <Button onClick={handleGenerate} disabled={generating || selectedSubjects.size === 0 || (selectedPrefs.has("CUSTOM_DAYS") && customDays.size === 0)} className="w-full gap-2 py-6 text-lg font-bold rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-500 text-white hover:shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all border-0">
                {generating ? <><Loader2 className="h-5 w-5 animate-spin" />{loadingMsg}</> : <><Sparkles className="h-5 w-5" />Tạo Phương Án Mới</>}
              </Button>
            </div>
          </div>
        )}

        {(step === 2 || step === 3) && (
          <div className="grid gap-6 animate-slide-up">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-muted-foreground h-9">← Chọn lại</Button>
                <div className="flex gap-2 overflow-x-auto pb-1 max-w-[50vw]">
                  {options.map((opt, idx) => {
                    const matchPct = opt.pref_match_pct ?? 100;
                    const scoreColor = matchPct >= 80 ? 'text-success' : matchPct >= 50 ? 'text-amber-500' : 'text-destructive';
                    return (
                    <button
                      key={idx}
                      onClick={() => { setActiveTab(idx); setStep(2); }}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all ${
                        activeTab === idx
                          ? "border-primary/40 bg-primary/5 text-primary shadow-sm"
                          : "border-border/50 text-muted-foreground hover:border-primary/20"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        activeTab === idx ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt.label}
                      <span className={`text-xs font-bold ${scoreColor}`}>{Math.round(matchPct)}%</span>
                      {idx === 0 && options.length > 1 && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                      {idx > 0 && idx < 3 && options.length > 3 && <Star className="h-3 w-3 text-muted-foreground opacity-50" />}
                    </button>
                  );})}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleShare} disabled={sharing} variant="outline" className="gap-2 h-9">
                  {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Chia sẻ
                </Button>
                <Button onClick={() => setStep(3)} className={`gap-2 h-9 transition-all duration-300 rounded-full ${step === 3 ? 'bg-foreground text-background' : 'bg-foreground text-background hover:opacity-85'}`}>
                  Chốt lịch này <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {activeOption && step === 2 && (
              <div className="grid lg:grid-cols-12 gap-6 animate-fade-in items-start">
                <Card className="card-elevated overflow-hidden lg:col-span-7 xl:col-span-8">
                  <CardContent className="p-3">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <div className="font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">
                          {String.fromCharCode(65 + activeTab)}
                        </span>
                        Plan {String.fromCharCode(65 + activeTab)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1 shadow-sm"><CalendarDays className="h-3 w-3" />{activeOption.days_used.length} ngày</Badge>
                        <Badge className={`gap-1 shadow-sm ${
                            (activeOption.score_breakdown?.preference || 0) >= 80 ? 'bg-success' : 
                            (activeOption.score_breakdown?.preference || 0) >= 50 ? 'bg-amber-500' : 'bg-destructive'
                          } text-white`}>
                            <Star className="h-3 w-3" />{Math.round(activeOption.score_breakdown?.preference || 0)}%
                          </Badge>
                      </div>
                    </div>
                    <div key={activeTab} className="animate-fade-in" style={{ animationDuration: '0.3s' }}>
                    <InteractiveTimetable 
                      option={activeOption} 
                      alternativeSections={alternativeSections}
                      onDropSwap={(subjectId, newSectionCode) => {
                        const newAltItem = alternativeSections[subjectId]?.find(a => a.section_code === newSectionCode);
                        if (!newAltItem) return;
                        
                        setOptions(prev => {
                          const newOpts = [...prev];
                          const opt = { ...newOpts[activeTab] };
                          opt.items = opt.items.map(it => 
                            it.subject_id === subjectId ? newAltItem : it
                          );
                          // Recalculate days_used
                          const days = new Set<number>();
                          opt.items.forEach(it => it.meetings.forEach(m => days.add(m.day_of_week)));
                          opt.days_used = Array.from(days).sort();
                          
                          // Mark as custom and remove score since it's manually edited
                          opt.score = -1; // -1 to indicate custom plan
                          opt.label = "Tùy chỉnh";
                          
                          newOpts[activeTab] = opt;
                          return newOpts;
                        });
                        toast.success(`Đã đổi ${subjectId} sang nhóm ${newSectionCode}`);
                      }} 
                    />
                    </div>
                    {/* Score Breakdown */}
                    {activeOption.score_breakdown && (
                      <div className="mt-2 grid grid-cols-5 gap-1 px-1">
                        {Object.entries(activeOption.score_breakdown).map(([k, v], i) => (
                          <div key={k} className="text-center">
                            <div className={`h-1.5 rounded-full score-bar-animated ${Number(v) >= 80 ? 'bg-success' : Number(v) >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{width: `${v}%`, animationDelay: `${i * 0.15}s`}} />
                            <div className="text-[8px] text-muted-foreground mt-0.5">{SCORE_LABELS[k] || k}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Campus Conflict Warnings */}
                    {activeOption.campus_conflicts && activeOption.campus_conflicts.length > 0 && (
                      <div className="mt-2 space-y-1 px-1">
                        {activeOption.campus_conflicts.map((c, i) => (
                          <div key={i} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${c.is_critical ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'}`}>
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {c.day_name}: {CAMPUS_LABELS[c.from_campus] || c.from_campus} → {CAMPUS_LABELS[c.to_campus] || c.to_campus}
                            {c.is_critical && <span className="font-bold ml-auto">⚠ Gap: {c.gap_periods} tiết</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* General Preference Warnings */}
                    {activeOption.warnings && activeOption.warnings.length > 0 && (
                      <div className="mt-2 space-y-1 px-1">
                        {activeOption.warnings.map((w, i) => (
                          <div key={i} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Info className="h-3 w-3 shrink-0" />
                            {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="card-elevated h-fit lg:col-span-5 xl:col-span-4 sticky top-6">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" /> {activeOption.items.length} môn ({activeOption.registered_credits} TC)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-border/40 p-0 max-h-[500px] overflow-y-auto scrollbar-thin">
                    {activeOption.items.map((it) => (
                      <div key={it.section_id} className="flex flex-col gap-2 px-4 py-3 hover:bg-primary/[0.03] transition-colors">
                        <div className="flex items-start justify-between min-w-0">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm font-bold text-primary">{it.subject_id}</span>
                            {it.subject_name && <span className="text-xs text-muted-foreground truncate">{it.subject_name}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs shadow-sm">{it.section_code}</Badge>
                            <Badge variant="outline" className="text-xs text-muted-foreground">{it.credits} tín</Badge>
                          </div>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {it.meetings.map((m, mi) => (
                            <span key={mi} className={`day-t${m.day_of_week} day-pill inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium`}>
                              {DAY_LABELS[m.day_of_week - 2]} P{m.start_period}–{m.start_period + m.duration - 1}
                              {m.room && <span className="opacity-70">• {m.room}</span>}
                              {m.study_weeks && m.study_weeks.length > 0 && <span className="opacity-50">W{m.study_weeks.length}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeOption && step === 3 && (
              <Card className="card-elevated max-w-2xl mx-auto animate-scale-in">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-8 w-8 text-success animate-pulse" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">Bạn đã chọn Phương án {String.fromCharCode(65 + activeTab)}</CardTitle>
                  <p className="text-muted-foreground">{activeOption.items.length} môn, {activeOption.registered_credits} tín chỉ, học trong {activeOption.days_used.length} ngày/tuần</p>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6">
                  <Button onClick={() => exportToExcel(activeOption)} className="w-full gap-3 h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white shadow-lg border-0 transition-transform active:scale-95">
                    <FileText className="h-5 w-5" /> Tải bảng Lịch học (Excel)
                  </Button>
                  <Button onClick={() => exportToICS(activeOption)} variant="outline" className="w-full gap-3 h-14 text-base font-semibold border-primary/30 hover:bg-primary/5 hover:text-primary text-foreground shadow-sm transition-transform active:scale-95">
                    <CalendarDays className="h-5 w-5 text-sky-500" /> Tải file Google Calendar (.ics)
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    <span className="text-primary font-medium">Lưu ý Google Calendar:</span> File .ics sẽ tạo từng event cho từng tuần học cụ thể (W1, W2...). Bạn nên import vào một bộ lịch (calendar) riêng để dễ quản lý.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}