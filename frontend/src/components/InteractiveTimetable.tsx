"use client";

import React, { useMemo, useState } from "react";
import { ScheduleOption, ScheduleItem } from "@/lib/types";
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent } from "@dnd-kit/core";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7"];
const PERIODS = Array.from({ length: 12 }, (_, i) => i + 1);
const BLOCK_COLORS = 8;
const CAMPUS_LABELS: Record<string, string> = { "1": "CS1 (Lý Thường Kiệt)", "2": "CS2 (Dĩ An)" };

const PERIOD_TIMES: Record<number, string> = {
  1: "06:00", 2: "07:00", 3: "08:00", 4: "09:00", 5: "10:00", 6: "11:00",
  7: "12:00", 8: "13:00", 9: "14:00", 10: "15:00", 11: "16:00", 12: "17:00"
};

export function InteractiveTimetable({ 
  option, 
  alternativeSections,
  onDropSwap
}: { 
  option: ScheduleOption;
  alternativeSections?: Record<string, ScheduleItem[]>;
  onDropSwap?: (subjectId: string, newSectionCode: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const colorMap = useMemo(() => {
    const m: Record<string, number> = {};
    let i = 0;
    option.items.forEach((it) => {
      if (!(it.subject_id in m)) { m[it.subject_id] = i % BLOCK_COLORS; i++; }
    });
    return m;
  }, [option]);

  const blocks = useMemo(() => {
    const b: { subjectId: string; sectionCode: string; subjectName?: string | null; dayIdx: number; startP: number; dur: number; room?: string | null; campus?: string | null; instructorLt?: string | null; instructorBtn?: string | null }[] = [];
    option.items.forEach((it) =>
      it.meetings.forEach((m) => {
        b.push({ subjectId: it.subject_id, sectionCode: it.section_code, subjectName: it.subject_name, dayIdx: m.day_of_week - 2, startP: m.start_period, dur: m.duration, room: m.room, campus: m.campus_code, instructorLt: it.instructor_lt, instructorBtn: it.instructor_btn });
      })
    );
    return b;
  }, [option]);

  const conflictDays = new Set(option.campus_conflicts?.filter(c => c.is_critical).map(c => c.day - 2) || []);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    if (e.over && e.active) {
      const subjectId = e.active.id as string;
      const newSectionCode = e.over.id as string;
      // Find if it's actually a different section
      const currentSection = option.items.find(i => i.subject_id === subjectId)?.section_code;
      if (currentSection && currentSection !== newSectionCode && onDropSwap) {
        onDropSwap(subjectId, newSectionCode);
      }
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="timetable-grid text-xs relative">
      <div className="timetable-header !text-xs !p-1.5">T</div>
      {DAY_LABELS.map((d, di) => (
        <div key={d} className={`timetable-header !text-xs !p-1.5 ${option.days_used.includes(di + 2) ? "!font-bold" : "opacity-40"} ${conflictDays.has(di) ? "!text-red-500" : ""}`}>
          {d}{conflictDays.has(di) && <span className="ml-0.5">⚠</span>}
        </div>
      ))}
      {PERIODS.map((p) => (
        <React.Fragment key={p}>
          <div className="timetable-period-label flex-col gap-0.5 !py-1.5">
            <span className="font-bold text-[11px] leading-none">{p}</span>
            <span className="text-[9px] leading-none opacity-70">{PERIOD_TIMES[p]}</span>
          </div>
          {DAY_LABELS.map((_, dayIdx) => {
            const here = blocks.filter((b) => b.dayIdx === dayIdx && b.startP === p);
            return (
              <div key={dayIdx} className="timetable-cell !min-h-[48px]">
                {here.map((b, bi) => (
                  <DraggableBlock
                    key={bi}
                    id={b.subjectId}
                    className={`timetable-block color-${colorMap[b.subjectId] ?? 0} !text-[10px] !p-1 cursor-pointer transition-all ${hovered === `${b.subjectId}_${b.dayIdx}_${b.startP}` ? 'ring-2 ring-primary z-20 scale-105' : ''} ${b.campus === '2' ? '!border-l-2 !border-l-orange-400' : ''}`}
                    style={{ height: `calc(${b.dur * 100}% + ${b.dur - 1}px)` }}
                    onMouseEnter={() => setHovered(`${b.subjectId}_${b.dayIdx}_${b.startP}`)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="font-bold truncate">{b.subjectId}</div>
                    {b.dur >= 2 && <div className="truncate opacity-70">{b.room || ''}</div>}
                    {/* Tooltip */}
                    {hovered === `${b.subjectId}_${b.dayIdx}_${b.startP}` && (
                      <div className="absolute left-full ml-1 top-0 z-50 w-48 rounded-lg bg-popover border border-border shadow-xl p-2.5 text-[11px] text-popover-foreground animate-fade-in" style={{animationDuration:'0.15s'}}>
                        <div className="font-bold text-primary text-xs mb-1">{b.subjectId}</div>
                        {b.subjectName && <div className="text-muted-foreground mb-1">{b.subjectName}</div>}
                        <div className="grid gap-0.5">
                          <span>📋 Nhóm: <strong>{b.sectionCode}</strong></span>
                          {b.room && <span>🏫 Phòng: <strong>{b.room}</strong></span>}
                          {b.campus && <span>📍 {CAMPUS_LABELS[b.campus] || `CS${b.campus}`}</span>}
                          {b.instructorLt && <span>👨‍🏫 GV LT: {b.instructorLt}</span>}
                          {b.instructorBtn && <span>👩‍🔬 GV BT: {b.instructorBtn}</span>}
                          <span>⏰ Tiết {b.startP}–{b.startP + b.dur - 1}</span>
                        </div>
                      </div>
                    )}
                  </DraggableBlock>
                ))}
                
                {/* Render Drop Targets if a subject is being dragged */}
                {activeDragId && alternativeSections && alternativeSections[activeDragId] && (
                  alternativeSections[activeDragId].map(alt => {
                    // Check if this alt section has a meeting here
                    const altMeets = alt.meetings.filter(m => (m.day_of_week - 2) === dayIdx && m.start_period === p);
                    return altMeets.map((am, ami) => (
                      <DroppableBlock 
                        key={`${alt.section_code}_${ami}`}
                        id={alt.section_code}
                        dur={am.duration}
                      >
                        <div className="flex items-center justify-center h-full opacity-50">
                          {alt.section_code}
                        </div>
                      </DroppableBlock>
                    ));
                  })
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
      </div>
    </DndContext>
  );
}

function DraggableBlock({ id, className, style, onMouseEnter, onMouseLeave, children }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  
  const mergedStyle = {
    ...style,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 50 : style.zIndex,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`${className} ${isDragging ? 'shadow-2xl ring-2 ring-primary scale-105' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

function DroppableBlock({ id, dur, children }: any) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`absolute inset-[2px] border-2 border-dashed rounded-md flex items-center justify-center text-[10px] font-bold z-10 transition-colors
        ${isOver ? 'bg-primary/20 border-primary text-primary' : 'bg-muted/50 border-muted-foreground/30 text-muted-foreground'}`}
      style={{ height: `calc(${dur * 100}% + ${dur - 1}px)` }}
    >
      {children}
    </div>
  );
}
