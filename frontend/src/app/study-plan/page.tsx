"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, ChevronDown, GraduationCap, Target, Sparkles, Loader2, Info, BrainCircuit, Database, Code2, Compass } from "lucide-react";
import type { Program, SemesterPlanItem } from "@/lib/types";

/* ── Progress Ring ── */
function ProgressRing({ earned, total, size = 120, stroke = 8 }: { earned: number; total: number; size?: number; stroke?: number }) {
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, offset = c - (pct / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="progress-ring -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        <defs><linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl text-foreground">{earned}</div>
        <div className="text-[10px] text-muted-foreground font-medium">/ {total} tín chỉ</div>
      </div>
    </div>
  );
}

/* ── Specialization tracks (CS only) ── */
const TRACKS = [
  { id: "AI", label: "Trí tuệ nhân tạo", icon: BrainCircuit,
    subjects: ["CO3061","CO3117","CO3133","CO3135","CO3085","CO3057","CO3041","CO3089"],
    color: "text-violet-500", activeBg: "bg-violet-50 dark:bg-violet-950/40", activeBorder: "border-violet-300 dark:border-violet-700" },
  { id: "SE", label: "Công nghệ phần mềm", icon: Code2,
    subjects: ["CO3011","CO3015","CO3017","CO3065","CO3131","CO3049","CO3045","CO3043"],
    color: "text-emerald-500", activeBg: "bg-emerald-50 dark:bg-emerald-950/40", activeBorder: "border-emerald-300 dark:border-emerald-700" },
  { id: "DB", label: "Cơ sở dữ liệu", icon: Database,
    subjects: ["CO3021","CO3029","CO3115","CO3137","CO4031","CO4033","CO3139","CO4035"],
    color: "text-amber-500", activeBg: "bg-amber-50 dark:bg-amber-950/40", activeBorder: "border-amber-300 dark:border-amber-700" },
] as const;
type TrackId = typeof TRACKS[number]["id"];

const TARGET_CREDITS = 18;

export default function StudyPlanPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [plan, setPlan] = useState<SemesterPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [track, setTrack] = useState<TrackId>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("sp_track") as TrackId) || "AI";
    return "AI";
  });

  // Load programs
  useEffect(() => {
    api.getPrograms().then(p => { 
      p.sort((a, b) => a.name.localeCompare(b.name));
      setPrograms(p); 
      const savedProgId = localStorage.getItem("sp_selected_program");
      if (savedProgId && p.some(prog => prog.program_id === Number(savedProgId))) {
        setSelectedProgramId(Number(savedProgId));
      } else if (p.length > 0) {
        setSelectedProgramId(p[0].program_id); 
      }
    }).catch(() => toast.error("Không thể tải danh sách chương trình"));
  }, []);

  useEffect(() => {
    if (selectedProgramId) localStorage.setItem("sp_selected_program", selectedProgramId.toString());
  }, [selectedProgramId]);

  const groupedPrograms = useMemo(() => {
    const groups: Record<string, Program[]> = {};
    programs.forEach(p => {
      if (p.faculty) {
        if (!groups[p.faculty]) groups[p.faculty] = [];
        groups[p.faculty].push(p);
      }
    });
    return { groups };
  }, [programs]);

  useEffect(() => {
    if (!selectedProgramId) return;
    setLoading(true);
    api.getProgramPlan(selectedProgramId).then(res => {
      setPlan(res.items);
      const saved = localStorage.getItem(`sp_completed_${selectedProgramId}`);
      if (saved) { try { setCompleted(new Set(JSON.parse(saved))); } catch { setCompleted(new Set()); } }
      else setCompleted(new Set());
    }).catch(() => toast.error("Không thể tải chương trình học")).finally(() => setLoading(false));
  }, [selectedProgramId]);

  useEffect(() => {
    if (selectedProgramId && plan.length > 0)
      localStorage.setItem(`sp_completed_${selectedProgramId}`, JSON.stringify(Array.from(completed)));
  }, [completed, selectedProgramId, plan.length]);

  useEffect(() => { localStorage.setItem("sp_track", track); }, [track]);

  const grouped = useMemo(() => {
    const g: Record<number, SemesterPlanItem[]> = {};
    plan.forEach(it => { if (!g[it.semester_no]) g[it.semester_no] = []; g[it.semester_no].push(it); });
    return Object.entries(g).map(([s, items]) => ({ semester: Number(s), items })).sort((a, b) => a.semester - b.semester);
  }, [plan]);

  const earnedCredits = useMemo(() => {
    let t = 0; plan.forEach(it => { if (completed.has(it.subject_id)) t += (it.credits || 0); }); return t;
  }, [plan, completed]);

  const totalCredits = programs.find(p => p.program_id === selectedProgramId)?.total_credits || 128;
  const completedCount = completed.size;
  const percent = totalCredits > 0 ? Math.round((earnedCredits / totalCredits) * 100) : 0;

  const completedSemesters = useMemo(() => {
    let count = 0;
    for (const g of grouped) {
      const req = g.items.filter(it => it.is_required);
      if (req.length > 0 && req.every(it => completed.has(it.subject_id))) count++; else break;
    }
    return count;
  }, [grouped, completed]);

  function toggleCourse(sid: string, groupIdsToClear?: string[]) { 
    setCompleted(p => { 
      const n = new Set(p); 
      if (n.has(sid)) {
        n.delete(sid); 
      } else {
        if (groupIdsToClear) groupIdsToClear.forEach(id => n.delete(id));
        n.add(sid);
      }
      return n; 
    }); 
  }
  function toggleSemester(items: SemesterPlanItem[], allDone: boolean) {
    setCompleted(p => { const n = new Set(p); items.forEach(it => allDone ? n.delete(it.subject_id) : n.add(it.subject_id)); return n; });
  }
  function toggleCollapse(s: number) { setCollapsed(p => { const n = new Set(p); if (n.has(s)) n.delete(s); else n.add(s); return n; }); }

  const selectedProgram = programs.find(p => p.program_id === selectedProgramId);
  const isCS = selectedProgram?.name.toLowerCase().includes("khoa học máy tính") ?? false;

  /* ── SMART RECOMMENDATION ENGINE ── */
  const recommended = useMemo(() => {
    const trackInfo = TRACKS.find(t => t.id === track)!;
    const trackSubjects = new Set<string>(trackInfo.subjects);
    const result: { course: SemesterPlanItem; reason: string }[] = [];
    let credits = 0;

    for (const g of grouped) {
      if (credits >= TARGET_CREDITS) break;
      const incomplete = g.items.filter(it => it.is_required && !completed.has(it.subject_id));
      for (const c of incomplete) {
        if (credits >= TARGET_CREDITS) break;
        result.push({ course: c, reason: `Bắt buộc HK ${g.semester}` });
        credits += c.credits || 0;
      }
    }

    if (credits < TARGET_CREDITS && isCS) {
      const allElectives = plan.filter(it => !it.is_required && !completed.has(it.subject_id) && trackSubjects.has(it.subject_id));
      for (const c of allElectives) {
        if (credits >= TARGET_CREDITS) break;
        if (result.some(r => r.course.subject_id === c.subject_id)) continue;
        result.push({ course: c, reason: `Chuyên ngành ${trackInfo.label}` });
        credits += c.credits || 0;
      }
    }

    if (credits < TARGET_CREDITS) {
      const remaining = plan.filter(it => !it.is_required && !completed.has(it.subject_id) && (!isCS || !trackSubjects.has(it.subject_id)));
      for (const c of remaining) {
        if (credits >= TARGET_CREDITS) break;
        if (result.some(r => r.course.subject_id === c.subject_id)) continue;
        result.push({ course: c, reason: "Tự chọn" });
        credits += c.credits || 0;
      }
    }

    return { items: result, totalCredits: credits };
  }, [grouped, completed, plan, track]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid gap-8 animate-fade-in pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground tracking-tight">Chương trình học</h1>
          <p className="mt-1 text-sm text-muted-foreground">Khóa 2024 · {totalCredits} tín chỉ</p>
        </div>
        
        <div className="w-full md:w-[380px]">
          <Select value={selectedProgramId?.toString() || ""} onValueChange={(v) => setSelectedProgramId(Number(v))}>
            <SelectTrigger className="w-full bg-card border-border h-11 text-left">
              <SelectValue placeholder="Chọn chương trình đào tạo..." />
            </SelectTrigger>
            <SelectContent className="max-h-[500px]">
              {Object.entries(groupedPrograms.groups)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([faculty, progs]) => (
                <SelectGroup key={faculty}>
                  <SelectLabel className="bg-secondary/50 sticky top-0 z-10 font-semibold text-foreground py-2 text-xs uppercase tracking-wider">{faculty}</SelectLabel>
                  {progs.map(p => (
                    <SelectItem key={p.program_id} value={p.program_id.toString()} className="pl-6 py-2.5 cursor-pointer">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Progress */}
      <Card className="card-elevated">
        <CardContent className="flex flex-col sm:flex-row items-center gap-8 pt-6 pb-6">
          <ProgressRing earned={earnedCredits} total={totalCredits} />
          <div className="flex-1 grid gap-4 w-full">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Tích lũy", value: earnedCredits, unit: "tín", color: "text-indigo-600 dark:text-indigo-400" },
                { label: "Còn lại", value: totalCredits - earnedCredits, unit: "tín", color: "text-amber-600 dark:text-amber-400" },
                { label: "Đã đậu", value: completedCount, unit: "môn", color: "text-emerald-600 dark:text-emerald-400" },
                { label: "HK xong", value: `${completedSemesters}/${grouped.length}`, unit: "", color: "text-violet-600 dark:text-violet-400" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}<span className="text-xs text-muted-foreground ml-0.5 font-medium">{s.unit}</span></div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-1000 rounded-full" style={{ width: `${percent}%` }} />
            </div>
            <div className="text-xs text-muted-foreground text-right">{percent}% hoàn thành</div>
          </div>
        </CardContent>
      </Card>

      {/* Main: Semesters + Recommendations */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Semester list */}
        <div className="lg:col-span-2 grid gap-3 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          {grouped.map(({ semester, items: semItems }) => {
            const isCollapsed = collapsed.has(semester);
            const passedInSem = semItems.filter(it => completed.has(it.subject_id)).length;
            const semCredits = semItems.reduce((a, it) => a + (it.credits || 0), 0);
            const allDone = passedInSem === semItems.length;
            const required = semItems.filter(it => it.is_required);
            const elective = semItems.filter(it => !it.is_required);

            const electiveByGroup: Record<string, SemesterPlanItem[]> = {};
            elective.forEach(it => {
                const type = it.course_type || "Tự chọn";
                if (!electiveByGroup[type]) electiveByGroup[type] = [];
                electiveByGroup[type].push(it);
            });

            return (
              <Card key={semester} className={`card-elevated overflow-hidden ${allDone ? 'border-emerald-300 dark:border-emerald-800' : ''}`}>
                <div className="flex w-full items-center justify-between gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => toggleCollapse(semester)}>
                    <span className={`h-2 w-2 rounded-full ${allDone ? 'bg-emerald-500' : 'bg-border'}`} />
                    <span className="font-display text-base">Học kỳ {semester}</span>
                    <span className="text-xs text-muted-foreground">{passedInSem}/{semItems.length} · {semCredits} tín</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className={`h-7 text-[10px] px-2 ${allDone ? 'text-foreground' : 'text-muted-foreground'}`}
                      onClick={(e) => { e.stopPropagation(); toggleSemester(semItems, allDone); toast.success(allDone ? `Bỏ tích HK ${semester}` : `Hoàn thành HK ${semester}`); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />{allDone ? "Bỏ tích" : "Tích hết"}
                    </Button>
                    <button onClick={() => toggleCollapse(semester)} className={`p-1 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}><ChevronDown className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="px-5 pb-4 animate-fade-in" style={{ animationDuration: '0.15s' }}>
                    {required.length > 0 && <CourseGroup label="Bắt buộc" items={required} completed={completed} onToggle={toggleCourse} />}
                    {Object.entries(electiveByGroup).map(([groupLabel, items]) => (
                      <CourseGroup key={groupLabel} label={groupLabel} items={items} completed={completed} onToggle={toggleCourse} isElective />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Right sidebar */}
        <div className="grid gap-4 animate-slide-up lg:sticky lg:top-20" style={{ animationDelay: "0.2s" }}>
          {/* Track selector (CS only) */}
          {isCS && (
            <Card className="card-elevated">
              <CardContent className="pt-5 grid gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chuyên ngành</h3>
                <div className="grid gap-2">
                  {TRACKS.map(t => (
                    <button key={t.id} onClick={() => setTrack(t.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${track === t.id ? `${t.activeBorder} ${t.activeBg}` : 'border-border hover:border-border hover:bg-secondary/50'}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${track === t.id ? `${t.activeBg} ${t.color}` : 'bg-secondary text-muted-foreground'}`}>
                        <t.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`text-sm font-semibold ${track === t.id ? t.color : 'text-muted-foreground'}`}>{t.label}</div>
                        <div className="text-[10px] text-muted-foreground">{t.subjects.length} môn</div>
                      </div>
                      {track === t.id && <CheckCircle2 className={`h-3.5 w-3.5 ${t.color} ml-auto`} />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Smart recommendations */}
          <Card className="card-elevated overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-500" />
            <CardContent className="pt-5 grid gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />Gợi ý HK tới</h3>
                <span className="text-xs font-bold text-indigo-500">{recommended.totalCredits} tín</span>
              </div>

              {recommended.items.length > 0 ? (
                <div className="grid gap-1.5">
                  {recommended.items.map(({ course: c, reason }, idx) => (
                    <div key={c.subject_id} className={`flex items-center gap-2 rounded-xl border p-2.5 transition-all hover:shadow-sm ${
                      reason.includes('Bắt buộc') ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20' :
                      reason.includes('Chuyên ngành') ? 'border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20' :
                      'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20'
                    }`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs font-bold ${
                            reason.includes('Bắt buộc') ? 'text-indigo-600 dark:text-indigo-400' :
                            reason.includes('Chuyên ngành') ? 'text-violet-600 dark:text-violet-400' :
                            'text-amber-600 dark:text-amber-400'
                          }`}>{c.subject_id}</span>
                          <span className="text-xs text-muted-foreground truncate">{c.subject_name || ""}</span>
                        </div>
                        <span className={`text-[10px] font-medium ${
                          reason.includes('Bắt buộc') ? 'text-indigo-500/70' :
                          reason.includes('Chuyên ngành') ? 'text-violet-500/70' :
                          'text-amber-500/70'
                        }`}>{reason}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground shrink-0">{c.credits} tín</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <GraduationCap className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Hoàn thành! 🎉</p>
                </div>
              )}

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gradient-to-br from-indigo-50/60 to-violet-50/30 dark:from-indigo-950/20 dark:to-violet-950/10 border border-indigo-100 dark:border-indigo-900/30">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-indigo-400" />
                <p className="text-[10px] text-muted-foreground">
                  Gợi ý tối đa <strong>{TARGET_CREDITS} tín chỉ</strong>: ưu tiên môn bắt buộc{isCS ? `, sau đó chuyên ngành ${TRACKS.find(t => t.id === track)?.label}` : ''}.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card className="card-elevated">
            <CardContent className="pt-5 grid gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiến độ</h3>
              {grouped.map(({ semester, items: semItems }) => {
                const done = semItems.filter(it => completed.has(it.subject_id)).length;
                const pct = semItems.length > 0 ? Math.round((done / semItems.length) * 100) : 0;
                return (
                  <div key={semester} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8">HK {semester}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500/40'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-10 text-right">{done}/{semItems.length}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Course Group Component ── */
function CourseGroup({ label, items, completed, onToggle, isElective }: {
  label: string; items: SemesterPlanItem[]; completed: Set<string>; onToggle: (sid: string, groupIdsToClear?: string[]) => void; isElective?: boolean;
}) {
  const lbl = label.toLowerCase();
  const isSingleChoice = isElective && (lbl.includes("thể dục") || lbl.includes("chọn 1") || lbl.includes("chọn một") || lbl.includes("ngoại ngữ"));

  return (
    <div className={isElective ? "mt-3" : "mb-2"}>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
        <span>{label}</span>
        {isSingleChoice && <span className="text-[9px] lowercase bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">Chọn 1</span>}
      </div>
      <div className="divide-y divide-border/50">
        {items.map(it => {
          const done = completed.has(it.subject_id);
          const unmetPrereqs = (it.prerequisite_ids || []).filter((pid: string) => !completed.has(pid));
          const isLocked = unmetPrereqs.length > 0;

          return (
            <div key={it.subject_id} className={`flex items-center gap-3 py-2 transition-opacity ${done ? 'opacity-50' : ''} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <button 
                onClick={() => {
                  if (isLocked) {
                    toast.warning(`Bạn cần hoàn thành: ${unmetPrereqs.join(", ")}`);
                    return;
                  }
                  onToggle(it.subject_id, isSingleChoice ? items.map(i => i.subject_id) : undefined);
                }}
                className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center transition-all ${isSingleChoice ? 'rounded-full' : 'rounded'} border ${done ? 'border-emerald-500 bg-emerald-500 text-white' : isLocked ? 'border-border/50 bg-secondary/50 cursor-not-allowed' : 'border-muted-foreground/30 hover:border-emerald-400'}`}
                style={{ width: 18, height: 18 }}>
                {done ? (isSingleChoice ? <div className="h-1.5 w-1.5 bg-white rounded-full" /> : <CheckCircle2 className="h-2.5 w-2.5" />) : isLocked ? <div className="h-1.5 w-1.5 bg-muted-foreground rounded-sm" /> : null}
              </button>
              <div className="min-w-0 flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{it.subject_id}</span>
                  <span className={`text-sm truncate ${done ? 'line-through text-muted-foreground' : 'text-foreground/80'}`}>{it.subject_name || ""}</span>
                </div>
                {isLocked && (
                  <Badge variant="outline" className="text-[9px] px-1.5 h-4 ml-2 border-red-200 text-red-500 dark:border-red-900 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20">
                    Khóa ({unmetPrereqs.join(",")})
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{it.credits ?? 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
