"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, BookOpen, Sparkles, ArrowRight,
  GraduationCap, Zap, Shield, ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    href: "/planner",
    icon: CalendarDays,
    title: "Xếp lịch thông minh",
    desc: "Import dữ liệu từ MyBK, tự động xếp lịch với 4 kiểu (cân bằng, sáng/chiều, gom ngày), và xuất ra Excel / Google Calendar.",
    gradient: "from-blue-500 to-cyan-500",
    bgGlow: "bg-blue-500/10",
  },
  {
    href: "/study-plan",
    icon: BookOpen,
    title: "Kế hoạch học tập",
    desc: "Theo dõi 128 tín chỉ với progress ring, tự động detect sinh viên năm mấy và gợi ý lịch học cho học kỳ tới.",
    gradient: "from-emerald-500 to-teal-500",
    bgGlow: "bg-emerald-500/10",
  },
];

const HIGHLIGHTS = [
  { icon: Zap, label: "Phát hiện trùng lịch", color: "text-blue-500" },
  { icon: Shield, label: "Check tiên quyết", color: "text-emerald-500" },
  { icon: GraduationCap, label: "Tiến độ 128 tín", color: "text-violet-500" },
];

export default function Home() {
  const router = useRouter();
  const { isLoggedIn, termCode } = useUser();

  function handleStart() {
    router.push("/planner");
  }

  return (
    <div className="grid gap-10">
      {isLoggedIn && termCode && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between shadow-sm animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Chưa hoàn thành xếp lịch?</h3>
              <p className="text-xs text-muted-foreground">Tiếp tục công việc đang dang dở cho Học kỳ {termCode}.</p>
            </div>
          </div>
          <Button size="sm" onClick={handleStart} className="gap-2">
            Tiếp tục ngay <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ===== HERO ===== */}
      <section className="mesh-hero relative rounded-2xl border border-border/30 p-8 sm:p-12 lg:p-16 animate-fade-in">
        {/* Mesh blobs */}
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
        <div className="mesh-blob mesh-blob-3" />

        {/* Floating particles */}
        {[
          { size: 6, top: "12%", left: "8%", delay: "0s", dur: "4s" },
          { size: 4, top: "25%", right: "12%", delay: "1s", dur: "5s" },
          { size: 8, bottom: "20%", left: "15%", delay: "2s", dur: "6s" },
          { size: 5, top: "60%", right: "25%", delay: "0.5s", dur: "4.5s" },
          { size: 3, top: "40%", left: "60%", delay: "1.5s", dur: "5.5s" },
          { size: 7, bottom: "30%", right: "8%", delay: "3s", dur: "7s" },
        ].map((p, i) => (
          <div
            key={i}
            className="particle animate-float"
            style={{
              width: p.size, height: p.size,
              top: p.top, left: p.left, right: p.right, bottom: p.bottom,
              animationDelay: p.delay, animationDuration: p.dur,
            }}
          />
        ))}

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
            <GraduationCap className="h-4 w-4" />
            Dành cho sinh viên HCMUT
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
            <span className="gradient-text">BKCourse</span>{" "}
            <span className="text-foreground">Helper</span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Chọn môn thông minh, xây thời khóa biểu không trùng, theo dõi tiến độ tích lũy tín chỉ.
          </p>

          {/* CTA Button */}
          <div className="mx-auto mt-8 flex max-w-sm justify-center">
            <Button onClick={handleStart} className="btn-neon gap-2 rounded-xl px-8 py-3 text-base font-semibold dark:animate-pulse-glow">
              Bắt đầu xếp lịch
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Secondary CTA */}
          <div className="mt-4 flex justify-center">
            <Link
              href="/study-plan"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              hoặc xem kế hoạch học tập trước
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== HIGHLIGHTS ===== */}
      <section className="flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        {HIGHLIGHTS.map((h) => (
          <div
            key={h.label}
            className="flex items-center gap-2 rounded-full border border-border/40 bg-card px-4 py-2 text-sm shadow-sm transition-all hover:shadow-md hover:border-primary/20"
          >
            <h.icon className={`h-4 w-4 ${h.color}`} />
            <span className="text-muted-foreground">{h.label}</span>
          </div>
        ))}
      </section>

      {/* ===== FEATURE CARDS ===== */}
      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <Link
            key={f.href}
            href={f.href}
            className="card-interactive group relative overflow-hidden rounded-xl p-6 animate-slide-up stagger-item"
          >
            {/* Gradient accent left border */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${f.gradient} opacity-40 transition-opacity group-hover:opacity-100`} />

            {/* Hover gradient overlay */}
            <div className={`absolute inset-0 ${f.bgGlow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

            <div className="relative z-10">
              {/* Icon in gradient circle */}
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} bg-opacity-10 shadow-sm`}>
                <f.icon className="h-5 w-5 text-white" />
              </div>

              <h2 className="text-lg font-bold text-foreground">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>

              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary opacity-50 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                Mở
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}