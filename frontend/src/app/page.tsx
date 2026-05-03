"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { ArrowRight, Calendar, BookOpen, Sparkles, Zap, Shield, GraduationCap } from "lucide-react";

/* ── Scroll-triggered reveal hook (Paraform-style) ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(32px)";
    el.style.filter = "blur(3px)";
    el.style.transition = "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1), filter 0.8s cubic-bezier(0.16,1,0.3,1)";
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
        el.style.filter = "blur(0)";
        observer.unobserve(el);
      }
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const FEATURES = [
  {
    href: "/planner",
    icon: Calendar,
    title: "Xếp lịch thông minh",
    desc: "Import dữ liệu từ MyBK, tự động xếp lịch với nhiều chiến lược và xuất ra Excel hoặc Google Calendar.",
    tag: "Phổ biến",
    accent: "from-indigo-500 to-violet-500",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    href: "/study-plan",
    icon: BookOpen,
    title: "Kế hoạch học tập",
    desc: "Theo dõi tiến độ tín chỉ, tự động gợi ý môn học cho học kỳ tới theo chuyên ngành của bạn.",
    tag: "Mới",
    accent: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
];

const STATS = [
  { value: "59", label: "Chương trình" },
  { value: "3500+", label: "Môn học" },
  { value: "∞", label: "Tổ hợp lịch" },
];

export default function Home() {
  const router = useRouter();
  const { isLoggedIn, termCode } = useUser();
  const statsRef = useReveal();
  const featuresRef = useReveal();
  const highlightsRef = useReveal();

  return (
    <div className="grid gap-16 py-8">
      {/* Quick-resume banner */}
      {isLoggedIn && termCode && (
        <div className="flex items-center justify-between rounded-full border border-border bg-secondary/50 px-5 py-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Tiếp tục xếp lịch HK {termCode}
            </span>
          </div>
          <button
            onClick={() => router.push("/planner")}
            className="text-sm font-semibold text-foreground hover:underline underline-offset-4 flex items-center gap-1"
          >
            Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ===== HERO ===== */}
      <section className="relative text-center py-16 animate-reveal">
        <div className="absolute inset-0 bg-dots opacity-30 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
            <GraduationCap className="h-3.5 w-3.5" />
            Dành cho sinh viên HCMUT
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.1] text-foreground tracking-tight">
            Chọn môn{" "}
            <span className="italic bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">thông minh</span>
          </h1>

          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Xây thời khóa biểu không trùng, theo dõi tiến độ tích lũy, nhận đề xuất môn học cá nhân hóa.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push("/planner")}
              className="btn-pill px-8 py-3 text-base"
            >
              Bắt đầu xếp lịch
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/study-plan"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground underline-offset-4 hover:underline"
            >
              Xem kế hoạch học tập →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section ref={statsRef} className="grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="font-display text-3xl sm:text-4xl text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1 tracking-wide uppercase">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ===== FEATURES ===== */}
      <section ref={featuresRef} className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="card-interactive group relative p-8"
          >
            {/* Gradient accent top */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            <div className="flex items-start justify-between mb-5">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${f.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                <f.icon className={`h-5 w-5 ${f.iconColor}`} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                {f.tag}
              </span>
            </div>

            <h2 className="font-display text-xl text-foreground mb-2">{f.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>

            <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-all group-hover:translate-x-2 duration-300">
              Khám phá
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </section>

      {/* ===== HIGHLIGHTS ===== */}
      <section ref={highlightsRef} className="text-center">
        <div className="section-divider mx-auto max-w-[100px] mb-8" />
        <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
          {[
            { icon: Zap, label: "Phát hiện trùng lịch", color: "text-amber-500" },
            { icon: Shield, label: "Check tiên quyết", color: "text-emerald-500" },
            { icon: GraduationCap, label: "Tiến độ tín chỉ", color: "text-indigo-500" },
          ].map((h) => (
            <div key={h.label} className="text-center group cursor-default">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2 transition-transform duration-300 group-hover:scale-110">
                <h.icon className={`h-4.5 w-4.5 ${h.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{h.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}