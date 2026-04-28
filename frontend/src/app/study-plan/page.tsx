"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, ChevronDown, GraduationCap, Target, Sparkles, Loader2, Info, BrainCircuit, Database, Code2, Compass } from "lucide-react";
import type { Program, SemesterPlanItem } from "@/lib/types";

/* ── Progress Ring ── */
function ProgressRing({ earned, total, size = 130, stroke = 10 }: { earned: number; total: number; size?: number; stroke?: number }) {
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, offset = c - (pct / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="progress-ring -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#sp-grad)" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        <defs><linearGradient id="sp-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" /><stop offset="100%" stopColor="hsl(var(--accent))" /></linearGradient></defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-extrabold">{earned}<span className="text-base text-muted-foreground">/{total}</span></div>
        <div className="text-[10px] text-muted-foreground font-medium">tín chỉ</div>
      </div>
    </div>
  );
}

const SEM_COLORS = ["from-blue-500 to-cyan-500","from-violet-500 to-purple-500","from-emerald-500 to-teal-500","from-amber-500 to-orange-500","from-rose-500 to-pink-500","from-sky-500 to-indigo-500","from-lime-500 to-green-500","from-fuchsia-500 to-pink-500"];

/* ── Specialization tracks ── */
const TRACKS = [
  { id: "AI", label: "Trí tuệ nhân tạo", icon: BrainCircuit, color: "from-violet-500 to-purple-500",
    subjects: ["CO3061","CO3117","CO3133","CO3135","CO3085","CO3057","CO3041","CO3089"] },
  { id: "SE", label: "Công nghệ phần mềm", icon: Code2, color: "from-blue-500 to-cyan-500",
    subjects: ["CO3011","CO3015","CO3017","CO3065","CO3131","CO3049","CO3045","CO3043"] },
  { id: "DB", label: "Cơ sở dữ liệu", icon: Database, color: "from-emerald-500 to-teal-500",
    subjects: ["CO3021","CO3029","CO3115","CO3137","CO4031","CO4033","CO3139","CO4035"] },
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
    api.getPrograms().then(p => { setPrograms(p); if (p.length > 0) setSelectedProgramId(p[0].program_id); })
      .catch(() => toast.error("Không thể tải danh sách chương trình"));
  }, []);

  // Load plan
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

  // Save completed to localStorage
  useEffect(() => {
    if (selectedProgramId && plan.length > 0)
      localStorage.setItem(`sp_completed_${selectedProgramId}`, JSON.stringify(Array.from(completed)));
  }, [completed, selectedProgramId, plan.length]);

  // Save track
  useEffect(() => { localStorage.setItem("sp_track", track); }, [track]);

  // Group by semester
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

  function toggleCourse(sid: string) { setCompleted(p => { const n = new Set(p); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; }); }
  function toggleSemester(items: SemesterPlanItem[], allDone: boolean) {
    setCompleted(p => { const n = new Set(p); items.forEach(it => allDone ? n.delete(it.subject_id) : n.add(it.subject_id)); return n; });
  }
  function toggleCollapse(s: number) { setCollapsed(p => { const n = new Set(p); if (n.has(s)) n.delete(s); else n.add(s); return n; }); }

  /* ── SMART RECOMMENDATION ENGINE ── */
  const recommended = useMemo(() => {
    const trackInfo = TRACKS.find(t => t.id === track)!;
    const trackSubjects = new Set<string>(trackInfo.subjects);
    const result: { course: SemesterPlanItem; reason: string }[] = [];
    let credits = 0;

    // 1) Collect incomplete REQUIRED courses from earliest incomplete semesters
    for (const g of grouped) {
      if (credits >= TARGET_CREDITS) break;
      const incomplete = g.items.filter(it => it.is_required && !completed.has(it.subject_id));
      for (const c of incomplete) {
        if (credits >= TARGET_CREDITS) break;
        result.push({ course: c, reason: `Bắt buộc HK ${g.semester}` });
        credits += c.credits || 0;
      }
    }

    // 2) If still under target, add track-relevant electives
    if (credits < TARGET_CREDITS) {
      const allElectives = plan.filter(it => !it.is_required && !completed.has(it.subject_id) && trackSubjects.has(it.subject_id));
      for (const c of allElectives) {
        if (credits >= TARGET_CREDITS) break;
        if (result.some(r => r.course.subject_id === c.subject_id)) continue;
        result.push({ course: c, reason: `Chuyên ngành ${trackInfo.label}` });
        credits += c.credits || 0;
      }
    }

    // 3) Still under? Add any remaining electives
    if (credits < TARGET_CREDITS) {
      const remaining = plan.filter(it => !it.is_required && !completed.has(it.subject_id) && !trackSubjects.has(it.subject_id));
      for (const c of remaining) {
        if (credits >= TARGET_CREDITS) break;
        if (result.some(r => r.course.subject_id === c.subject_id)) continue;
        result.push({ course: c, reason: "Tự chọn" });
        credits += c.credits || 0;
      }
    }

    return { items: result, totalCredits: credits };
  }, [grouped, completed, plan, track]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="grid gap-6 animate-fade-in pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 p-2 shadow-sm"><GraduationCap className="h-5 w-5 text-white" /></div>
          <h1 className="text-2xl font-bold tracking-tight">Chương trình học</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Khoa học Máy tính — Khóa 2024 • Tổng: {totalCredits} tín chỉ</p>
      </div>

      {/* Progress */}
      <Card className="card-elevated animate-scale-in">
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 pt-6">
          <ProgressRing earned={earnedCredits} total={totalCredits} />
          <div className="flex-1 grid gap-3 w-full">
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: CheckCircle2, label: "Tích lũy", value: earnedCredits, unit: "tín", color: "text-success" },
                { icon: Target, label: "Còn lại", value: totalCredits - earnedCredits, unit: "tín", color: "text-warning" },
                { icon: BookOpen, label: "Đã đậu", value: completedCount, unit: "môn", color: "text-primary" },
                { icon: GraduationCap, label: "HK xong", value: completedSemesters, unit: `/${grouped.length}`, color: "text-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-border/50 bg-secondary/30 p-2.5 text-center shadow-sm">
                  <s.icon className={`mx-auto h-4 w-4 ${s.color} mb-1`} />
                  <div className="text-xl font-bold">{s.value}<span className="text-xs text-muted-foreground">{s.unit}</span></div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary flex shadow-inner">
              <div className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 rounded-l-full" style={{ width: `${percent}%` }} />
            </div>
            <div className="text-xs text-muted-foreground text-right">{percent}% hoàn thành chương trình</div>
          </div>
        </CardContent>
      </Card>

      {/* Main: Semesters + Recommendations */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Semester list */}
        <div className="lg:col-span-2 grid gap-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {grouped.map(({ semester, items: semItems }) => {
            const isCollapsed = collapsed.has(semester);
            const passedInSem = semItems.filter(it => completed.has(it.subject_id)).length;
            const semCredits = semItems.reduce((a, it) => a + (it.credits || 0), 0);
            const allDone = passedInSem === semItems.length;
            const colorIdx = (semester - 1) % SEM_COLORS.length;
            const required = semItems.filter(it => it.is_required);
            const elective = semItems.filter(it => !it.is_required);

            return (
              <Card key={semester} className={`card-elevated overflow-hidden ${allDone ? 'border-success/40 bg-success/5' : ''}`}>
                <div className="flex w-full items-center justify-between gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => toggleCollapse(semester)}>
                    <div className={`h-8 w-1 rounded-full bg-gradient-to-b ${SEM_COLORS[colorIdx]}`} />
                    <span className="font-bold">Học kỳ {semester}</span>
                    <Badge variant={allDone ? "default" : "secondary"} className={`text-xs ${allDone ? 'bg-success text-white' : ''}`}>{passedInSem}/{semItems.length}</Badge>
                    <span className="text-xs text-muted-foreground">{semCredits} tín</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className={`h-7 text-[10px] px-2 ${allDone ? 'text-success hover:text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:text-success hover:bg-success/10'}`}
                      onClick={(e) => { e.stopPropagation(); toggleSemester(semItems, allDone); toast.success(allDone ? `Bỏ tích HK ${semester}` : `Hoàn thành HK ${semester}`); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />{allDone ? "Bỏ tích" : "Tích hết"}
                    </Button>
                    <button onClick={() => toggleCollapse(semester)} className={`p-1 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}><ChevronDown className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="px-5 pb-3 animate-fade-in" style={{ animationDuration: '0.2s' }}>
                    {required.length > 0 && <CourseGroup label="Bắt buộc" items={required} completed={completed} onToggle={toggleCourse} />}
                    {elective.length > 0 && <CourseGroup label={elective[0].course_type || "Tự chọn"} items={elective} completed={completed} onToggle={toggleCourse} isElective />}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Right sidebar */}
        <div className="grid gap-4 animate-slide-up lg:sticky lg:top-20" style={{ animationDelay: "0.3s" }}>
          {/* Track selector */}
          <Card className="card-elevated">
            <CardContent className="pt-5 grid gap-3">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Chọn chuyên ngành</h3>
              </div>
              <div className="grid gap-2">
                {TRACKS.map(t => (
                  <button key={t.id} onClick={() => setTrack(t.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${track === t.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 hover:border-primary/30 hover:bg-secondary/30'}`}>
                    <div className={`rounded-lg bg-gradient-to-br ${t.color} p-1.5`}><t.icon className="h-4 w-4 text-white" /></div>
                    <div>
                      <div className={`text-sm font-semibold ${track === t.id ? 'text-primary' : ''}`}>{t.label}</div>
                      <div className="text-[10px] text-muted-foreground">{t.subjects.length} môn chuyên ngành</div>
                    </div>
                    {track === t.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Smart recommendations */}
          <Card className="card-elevated border-primary/20">
            <CardContent className="pt-5 grid gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" />Gợi ý HK tới</h3>
                <Badge variant="secondary" className="text-xs">{recommended.totalCredits} tín chỉ</Badge>
              </div>

              {recommended.items.length > 0 ? (
                <div className="grid gap-1.5">
                  {recommended.items.map(({ course: c, reason }) => (
                    <div key={c.subject_id} className="flex items-center gap-2 rounded-lg border border-border/50 p-2 bg-secondary/20">
                      <div className={`w-1 self-stretch rounded-full ${reason.includes("Chuyên ngành") ? 'bg-gradient-to-b from-violet-500 to-purple-500' : reason.includes("Bắt buộc") ? 'bg-gradient-to-b from-primary to-accent' : 'bg-muted-foreground/30'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-primary">{c.subject_id}</span>
                          <span className="text-xs truncate">{c.subject_name || ""}</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 mt-0.5">{reason}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{c.credits} tín</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm font-semibold text-success">Hoàn thành! 🎉</p>
                </div>
              )}

              <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                <p className="text-[10px] text-muted-foreground">
                  Gợi ý tối đa <strong>{TARGET_CREDITS} tín chỉ</strong>: ưu tiên môn bắt buộc chưa xong, sau đó thêm tự chọn theo chuyên ngành <strong>{TRACKS.find(t => t.id === track)?.label}</strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card className="card-elevated">
            <CardContent className="pt-5 grid gap-2">
              <h3 className="text-sm font-semibold">Thống kê nhanh</h3>
              {grouped.map(({ semester, items: semItems }) => {
                const done = semItems.filter(it => completed.has(it.subject_id)).length;
                const pct = semItems.length > 0 ? Math.round((done / semItems.length) * 100) : 0;
                return (
                  <div key={semester} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8">HK {semester}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-success' : 'bg-primary/60'}`} style={{ width: `${pct}%` }} />
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
  label: string; items: SemesterPlanItem[]; completed: Set<string>; onToggle: (sid: string) => void; isElective?: boolean;
}) {
  return (
    <div className={isElective ? "mt-2" : "mb-2"}>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
      <div className="divide-y divide-border/30">
        {items.map(it => {
          const done = completed.has(it.subject_id);
          return (
            <div key={it.subject_id} className={`flex items-center gap-3 py-2 transition-all ${done ? 'opacity-60' : ''}`}>
              <button onClick={() => onToggle(it.subject_id)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${done ? 'border-success bg-success text-white' : 'border-border hover:border-primary'}`}>
                {done && <CheckCircle2 className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-${isElective ? 'xs' : 'sm'} font-semibold ${done ? 'line-through text-muted-foreground' : isElective ? 'text-foreground/70' : 'text-primary'}`}>{it.subject_id}</span>
                  <span className={`text-sm truncate ${done ? 'line-through text-muted-foreground' : ''}`}>{it.subject_name || ""}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{it.credits ?? 0} tín</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
