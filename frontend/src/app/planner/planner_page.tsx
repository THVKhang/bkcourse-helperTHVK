"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { TimetableItem, TimetableSummary } from "@/lib/types";

function meetingText(m: any) {
  const dow = m?.day_of_week ?? "?";
  const start = m?.start_period ?? "?";
  const dur = m?.duration ?? 0;
  const end =
    typeof start === "number" && typeof dur === "number" ? start + dur - 1 : "?";
  const room = m?.room ? ` • ${m.room}` : "";
  return `D${dow} P${start}-${end}${room}`;
}

export default function PlannerPage() {
  const [studentCode, setStudentCode] = useState("2212345");
  const [termCode, setTermCode] = useState("242");
  const [sectionId, setSectionId] = useState("");
  const [data, setData] = useState<{ items: TimetableItem[]; summary: TimetableSummary } | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await api.getTimetable(studentCode, termCode);
      setData(r);
    } catch (e: any) {
      toast.error(e?.message || "Load timetable failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    if (!sectionId) return;
    try {
      await api.addTimetableItem(studentCode, termCode, Number(sectionId));
      setSectionId("");
      toast.success("Added");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Add failed");
    }
  }

  async function remove(itemId: number) {
    try {
      await api.removeTimetableItem(studentCode, termCode, itemId);
      toast.success("Removed");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Remove failed");
    }
  }

  const items = data?.items || [];
  const summary = data?.summary;

  const conflictItems = useMemo(() => items.filter((x) => x.has_conflict), [items]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Thêm section vào TKB, xem conflict/credits/workload.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Sidebar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Control Panel</CardTitle>
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
              <label className="text-sm font-medium">Add by section_id</label>
              <div className="flex gap-2">
                <Input
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  placeholder="vd: 123"
                />
                <Button onClick={add} disabled={!sectionId}>
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Lấy section_id từ Import (GET /imports/{`{id}`}) hoặc UI Import.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={refresh} disabled={loading}>
                Refresh
              </Button>
            </div>

            {summary ? (
              <div className="grid gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Credits: {summary.registered_credits}</Badge>
                  <Badge variant="secondary">Workload: {summary.workload_score}</Badge>
                  <Badge variant={summary.conflicts_count > 0 ? "destructive" : "secondary"}>
                    Conflicts: {summary.conflicts_count}
                  </Badge>
                </div>

                {conflictItems.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Có {conflictItems.length} item bị conflict (⚠️).
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Không có conflict.</p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Main */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Selected Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="grid gap-3">
                  {items.length ? (
                    items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-start justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold">
                            {it.subject_id} • {it.section_code}{" "}
                            {it.has_conflict ? <span className="text-red-600">⚠️</span> : null}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {it.meetings?.length ? it.meetings.map(meetingText).join(" | ") : "—"}
                          </div>
                        </div>

                        <Button variant="secondary" onClick={() => remove(it.id)}>
                          Remove
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Chưa có item nào.</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="conflicts" className="mt-4">
                <div className="grid gap-3">
                  {conflictItems.length ? (
                    conflictItems.map((it) => (
                      <div key={it.id} className="rounded-lg border p-3">
                        <div className="font-semibold text-red-600">
                          {it.subject_id} • {it.section_code} ⚠️
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {it.meetings?.length ? it.meetings.map(meetingText).join(" | ") : "—"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Không có conflict.</div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}