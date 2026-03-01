"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

import type { HistoryItem, Program, SemesterPlanItem, StudentSummary } from "@/lib/types";

export default function CurriculumPage() {
  const [studentCode, setStudentCode] = useState("2212345");
  const [termCode, setTermCode] = useState("242");

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState<number | null>(null);

  const [plan, setPlan] = useState<SemesterPlanItem[]>([]);
  const [history, setHistory] = useState<Record<string, HistoryItem["status"]>>({});
  const [summary, setSummary] = useState<StudentSummary | null>(null);

  const [filterSemester, setFilterSemester] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getPrograms().then((p) => {
      setPrograms(p);
      if (p[0]) setProgramId(p[0].program_id);
    });
  }, []);

  async function loadAll(pid: number, sc: string, tc: string) {
    try {
      const [planRes, histRes, sumRes] = await Promise.all([
        api.getProgramPlan(pid),
        api.getHistory(sc),
        api.getSummary(sc, pid, tc),
      ]);

      setPlan(planRes.items);

      const mp: Record<string, any> = {};
      histRes.items.forEach((it) => (mp[it.subject_id] = it.status));
      setHistory(mp);

      setSummary(sumRes);
    } catch (e: any) {
      toast.error(e?.message || "Load failed");
    }
  }

  useEffect(() => {
    if (!programId) return;
    loadAll(programId, studentCode, termCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const passedCount = useMemo(
    () => Object.values(history).filter((s) => s === "PASSED").length,
    [history]
  );

  const shown = useMemo(() => {
    return plan.filter((it) => {
      if (filterSemester !== "ALL" && String(it.semester_no) !== filterSemester) return false;
      if (search) {
        const s = search.toLowerCase();
        return it.subject_id.toLowerCase().includes(s) || (it.subject_name || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [plan, filterSemester, search]);

  async function saveHistory() {
    try {
      const items = Object.entries(history).map(([subject_id, status]) => ({ subject_id, status }));
      await api.postHistory(studentCode, items as any);
      toast.success("Saved history");

      if (programId) {
        const sumRes = await api.getSummary(studentCode, programId, termCode);
        setSummary(sumRes);
      }
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  }

  function togglePassed(subjectId: string) {
    setHistory((h) => {
      const cur = h[subjectId];
      const next = cur === "PASSED" ? "IN_PROGRESS" : "PASSED";
      return { ...h, [subjectId]: next as any };
    });
  }

  const percent = summary ? Math.round((summary.earned_credits / summary.total_credits) * 100) : 0;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Curriculum</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi tiến độ và tick PASSED theo kế hoạch chương trình.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Student code</label>
              <Input value={studentCode} onChange={(e) => setStudentCode(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Term code</label>
              <Input value={termCode} onChange={(e) => setTermCode(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Program</label>
              <Select
                value={programId ? String(programId) : ""}
                onValueChange={(v) => setProgramId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.program_id} value={String(p.program_id)}>
                      {p.name} ({p.cohort_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Passed: {passedCount}</Badge>

            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All semesters</SelectItem>
                {Array.from(new Set(plan.map((p) => p.semester_no)))
                  .sort((a, b) => a - b)
                  .map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      HK {s}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Input
              className="min-w-[260px] flex-1"
              placeholder="Search subject_id / name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Button onClick={saveHistory} className="ml-auto">
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {summary ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                Earned: {summary.earned_credits}/{summary.total_credits} ({percent}%)
              </Badge>
              <Badge variant="secondary">Registered: {summary.registered_credits}</Badge>
              <Badge variant="secondary">Remaining: {summary.remaining_credits}</Badge>
            </div>
            <Progress value={percent} />
          </CardContent>
        </Card>
      ) : null}

      {/* List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Courses</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {shown.map((it) => {
            const status = history[it.subject_id] || "IN_PROGRESS";
            return (
              <div
                key={`${it.semester_no}-${it.subject_id}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold">
                    HK{it.semester_no} • {it.subject_id} • {it.subject_name || ""}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {it.credits ?? "?"} tín • workload {it.workload_score ?? "?"}
                    {it.course_type ? ` • ${it.course_type}` : ""}
                  </div>
                </div>

                {/* FIX: shadcn không có variant="primary" */}
                <Button
                  variant={status === "PASSED" ? "default" : "secondary"}
                  onClick={() => togglePassed(it.subject_id)}
                >
                  {status === "PASSED" ? "PASSED" : "Mark PASSED"}
                </Button>
              </div>
            );
          })}

          {!shown.length && <div className="text-sm text-muted-foreground">Không có dữ liệu.</div>}
        </CardContent>
      </Card>
    </div>
  );
}