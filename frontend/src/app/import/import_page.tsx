"use client";

import React, { useMemo, useState } from "react";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import { toast } from "sonner";
import { ParsedMeeting, ParsedSection, PasteImportResponse } from "@/lib/types";

function meetingText(m: ParsedMeeting) {
  const end = (m.start_period || 0) + (m.duration || 0) - 1;
  return `D${m.day_of_week} P${m.start_period}-${end}${m.room ? ` • ${m.room}` : ""}`;
}

export default function ImportPage() {
  const [studentCode, setStudentCode] = useState("2212345");
  const [termCode, setTermCode] = useState("242");
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PasteImportResponse | null>(null);

  const stats = useMemo(() => {
    if (!result) return null;
    const totalMeetings = result.sections.reduce((acc, s) => acc + (s.meetings?.length || 0), 0);
    const warn = result.issues?.filter((i) => i.level !== "ERROR").length || 0;
    const err = result.issues?.filter((i) => i.level === "ERROR").length || 0;
    return { totalMeetings, warn, err };
  }, [result]);

  async function onParse() {
    setLoading(true);
    try {
      const r = (await api.pasteImport(studentCode, termCode, raw)) as PasteImportResponse;
      setResult(r);
      toast.success("Import OK");
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Course Data Import & Parsing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dán dữ liệu từ portal → parse → xem trước lớp học phần, lịch học và cảnh báo.
        </p>
      </div>

      {/* Top: input + preview */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Nhập liệu</CardTitle>
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
              <label className="text-sm font-medium">Portal raw text</label>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={12}
                placeholder="Paste nội dung portal vào đây..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={onParse} disabled={loading || raw.trim().length === 0}>
                {loading ? "Đang phân tích..." : "Phân tích & Lưu"}
              </Button>
              {result?.import_id ? (
                <Badge variant="secondary">import_id: {result.import_id}</Badge>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              Gợi ý: nếu parser chưa khớp format portal thật, bạn gửi mình 1 mẫu raw để mình chỉnh rules.
            </p>
          </CardContent>
        </Card>

        {/* Right: parsed table */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kết quả parse</CardTitle>

            {stats ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{result?.sections?.length || 0} sections</Badge>
                <Badge variant="secondary">{stats.totalMeetings} meetings</Badge>
                {stats.err > 0 ? <Badge variant="destructive">{stats.err} errors</Badge> : null}
                {stats.warn > 0 ? <Badge variant="outline">{stats.warn} warnings</Badge> : null}
              </div>
            ) : (
              <Badge variant="outline">Chưa có dữ liệu</Badge>
            )}
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Subject</TableHead>
                    <TableHead className="w-[120px]">Section</TableHead>
                    <TableHead>Meetings</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {result?.sections?.length ? (
                    result.sections.map((s, idx) => (
                      <TableRow key={`${s.subject_id}-${s.section_code}-${idx}`}>
                        <TableCell className="font-medium">{s.subject_id}</TableCell>
                        <TableCell>{s.section_code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.meetings?.length
                            ? s.meetings.map(meetingText).join(" | ")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                        Chưa có sections. Hãy paste raw text và bấm “Phân tích & Lưu”.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Issues */}
            <div className="rounded-md border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">Issues</div>
                <Badge variant="secondary">{result?.issues?.length || 0}</Badge>
              </div>

              {result?.issues?.length ? (
                <ul className="space-y-2">
                  {result.issues.slice(0, 12).map((i, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Badge
                        variant={i.level === "ERROR" ? "destructive" : "outline"}
                        className="mt-0.5"
                      >
                        {i.level}
                      </Badge>
                      <span className="text-muted-foreground">{i.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">Không có issues.</div>
              )}

              {result?.issues?.length && result.issues.length > 12 ? (
                <div className="mt-3 text-xs text-muted-foreground">
                  Đang hiển thị 12 issues đầu tiên…
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}