"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ScheduleOption } from "@/lib/types";
import { InteractiveTimetable } from "@/components/InteractiveTimetable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Star, BookOpen, AlertTriangle, Info, Loader2 } from "lucide-react";

const SCORE_LABELS: Record<string, string> = {
  compact_days: "Ít ngày",
  no_gap: "Không lủng",
  same_campus: "Cùng cơ sở",
  preference: "Sở thích",
  no_conflict: "Không trùng"
};
const CAMPUS_LABELS: Record<string, string> = { "1": "CS1", "2": "CS2" };

export default function SharedPlanPage({ params }: { params: { id: string } }) {
  const [option, setOption] = useState<ScheduleOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getShare(params.id)
      .then(res => {
        setOption(res.plan_data);
        setLoading(false);
      })
      .catch(err => {
        setError("Không tìm thấy lịch chia sẻ hoặc link đã hết hạn.");
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !option) {
    return <div className="flex h-screen items-center justify-center text-destructive font-bold text-xl">{error}</div>;
  }

  return (
    <div className="container max-w-7xl py-12 mx-auto min-h-screen">
      <div className="mb-8 text-center animate-slide-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          Lịch Học Được Chia Sẻ
        </h1>
        <p className="text-muted-foreground">
          Bạn đang xem lịch học của một người bạn. <a href="/" className="text-primary underline font-bold">Tạo lịch của riêng bạn?</a>
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 animate-fade-in items-start">
        <Card className="card-elevated overflow-hidden border-primary/20 shadow-xl lg:col-span-7 xl:col-span-8">
          <CardContent className="p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="font-bold text-primary flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">
                  S
                </span>
                Kế Hoạch Chung
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1 shadow-sm"><CalendarDays className="h-3 w-3" />{option.days_used.length} ngày</Badge>
                <Badge className={`gap-1 shadow-sm ${option.score >= 80 ? 'bg-success' : option.score >= 50 ? 'bg-amber-500' : 'bg-destructive'} text-white`}>
                  <Star className="h-3 w-3" />{Math.round(option.score)}%
                </Badge>
              </div>
            </div>
            
            <InteractiveTimetable option={option} />
            
            {/* Score Breakdown */}
            {option.score_breakdown && (
              <div className="mt-2 grid grid-cols-5 gap-1 px-1">
                {Object.entries(option.score_breakdown).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <div className={`h-1.5 rounded-full ${Number(v) >= 80 ? 'bg-success' : Number(v) >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{width: `${v}%`}} />
                    <div className="text-[8px] text-muted-foreground mt-0.5">{SCORE_LABELS[k] || k}</div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Campus Conflict Warnings */}
            {option.campus_conflicts && option.campus_conflicts.length > 0 && (
              <div className="mt-2 space-y-1 px-1">
                {option.campus_conflicts.map((c, i) => (
                  <div key={i} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${c.is_critical ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'}`}>
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {c.day_name}: {CAMPUS_LABELS[c.from_campus] || c.from_campus} → {CAMPUS_LABELS[c.to_campus] || c.to_campus}
                    {c.is_critical && <span className="font-bold ml-auto">⚠ Gap: {c.gap_periods} tiết</span>}
                  </div>
                ))}
              </div>
            )}
            
            {/* General Preference Warnings */}
            {option.warnings && option.warnings.length > 0 && (
              <div className="mt-2 space-y-1 px-1">
                {option.warnings.map((w, i) => (
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
              <BookOpen className="h-4 w-4 text-primary" /> {option.items.length} môn ({option.registered_credits} TC)
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40 p-0 max-h-[500px] overflow-y-auto scrollbar-thin">
            {option.items.map((it) => (
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
                    <Badge key={mi} variant="outline" className="text-[10px] bg-background/50 whitespace-nowrap">
                      T{m.day_of_week} ({m.start_period}-{m.start_period + m.duration - 1}) {m.campus_code ? `CS${m.campus_code}` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
