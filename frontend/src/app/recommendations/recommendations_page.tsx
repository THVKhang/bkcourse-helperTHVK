"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Program, RecommendationResponse, StudentSummary } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function RecommendationsPage() {
  const [studentCode, setStudentCode] = useState("2212345");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState<number | null>(null);

  const [semesterNo, setSemesterNo] = useState(1);
  const [termCode, setTermCode] = useState("242");
  const [termProfile, setTermProfile] = useState<"NORMAL" | "SUMMER">("NORMAL");
  const [targetCredits, setTargetCredits] = useState(18);

  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getPrograms().then((p) => {
      setPrograms(p);
      if (p[0]) setProgramId(p[0].program_id);
    });
  }, []);

  async function run() {
    if (!programId) return;
    setLoading(true);
    try {
      const r = await api.getRecommendations({
        student_code: studentCode,
        program_id: programId,
        semester_no: semesterNo,
        term_profile: termProfile,
        target_credits: targetCredits,
      });
      setResult(r);

      const s = await api.getSummary(studentCode, programId, termCode);
      setSummary(s);

      toast.success("Generated recommendations");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  const total = useMemo(() => {
    if (!result) return null;
    return {
      credits: result.total_credits,
      workload: result.total_workload,
      count: result.courses.length,
    };
  }, [result]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gợi ý môn theo học kỳ, tự loại PASSED, bù tín nếu thiếu, hỗ trợ term hè.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
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
              <Select value={programId ? String(programId) : ""} onValueChange={(v) => setProgramId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.program_id} value={String(p.program_id)}>
                      {p.name} (Year {p.cohort_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Semester</label>
              <Input type="number" value={semesterNo} onChange={(e) => setSemesterNo(Number(e.target.value))} />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Term profile</label>
              <Select value={termProfile} onValueChange={(v) => setTermProfile(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">NORMAL</SelectItem>
                  <SelectItem value="SUMMER">SUMMER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Target credits</label>
              <Input type="number" value={targetCredits} onChange={(e) => setTargetCredits(Number(e.target.value))} />
            </div>

            <Button onClick={run} disabled={!programId || loading}>
              {loading ? "Đang tính..." : "Get recommendations"}
            </Button>
          </CardContent>
        </Card>

        {/* Right output */}
        <div className="grid gap-6 lg:col-span-3">
          {summary ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Progress snapshot</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="secondary">Earned: {summary.earned_credits}/{summary.total_credits}</Badge>
                <Badge variant="secondary">Registered: {summary.registered_credits}</Badge>
                <Badge variant="secondary">Remaining: {summary.remaining_credits}</Badge>
              </CardContent>
            </Card>
          ) : null}

          {result ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Result</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {total ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Courses: {total.count}</Badge>
                    <Badge variant="secondary">Credits: {total.credits}</Badge>
                    <Badge variant="secondary">Workload: {total.workload}</Badge>
                  </div>
                ) : null}

                {result.warnings?.length ? (
                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm">
                    <div className="font-semibold">Warnings</div>
                    <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                      {result.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Subject</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[90px]">Credits</TableHead>
                        <TableHead className="w-[110px]">Workload</TableHead>
                        <TableHead className="w-[140px]">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.courses.length ? (
                        result.courses.map((c) => (
                          <TableRow key={c.subject_id}>
                            <TableCell className="font-medium">{c.subject_id}</TableCell>
                            <TableCell className="text-muted-foreground">{c.subject_name || ""}</TableCell>
                            <TableCell>{c.credits}</TableCell>
                            <TableCell>{c.workload_score}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {c.course_type ? <Badge variant="outline">{c.course_type}</Badge> : null}
                                {c.reasons?.slice(0, 2).map((r, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {r.text}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                            Không có gợi ý.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* (Optional) bottom action bar giống Stitch */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">
                    Đã gợi ý <span className="font-semibold text-foreground">{result.total_credits}</span> tín chỉ.
                  </div>
                  <Button variant="secondary" onClick={() => toast("Chức năng 'Send to Planner' sẽ làm tiếp")}>
                    Send to Planner
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Chọn input bên trái và bấm <b>Get recommendations</b> để xem kết quả.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}