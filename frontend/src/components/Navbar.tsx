"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useUser } from "@/components/UserProvider";
import {
  GraduationCap, CalendarDays, BookOpen,
  Sun, Moon, Menu, X, LogIn, LogOut, User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/planner", label: "Xếp lịch", icon: CalendarDays },
  { href: "/study-plan", label: "Kế hoạch", icon: BookOpen },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isLoggedIn, user, isGuest, logout } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-strong">
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 transition-all group-hover:from-primary/30 group-hover:to-accent/30 group-hover:shadow-lg group-hover:shadow-primary/10">
            <GraduationCap className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
          </div>
          <span className="hidden text-lg font-bold tracking-tight sm:inline gradient-text">
            BKCourse
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200
                  ${active ? "text-primary" : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {active && <span className="absolute -bottom-[9px] left-3 right-3 h-[2px] rounded-full bg-primary animate-scale-in" />}
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          {/* Auth status */}
          {isLoggedIn ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1 text-xs">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-foreground max-w-[120px] truncate">
                  {isGuest ? "Khách" : (user?.username || "Người dùng")}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                title="Đăng xuất"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-all hover:bg-primary/20"
            >
              <LogIn className="h-3.5 w-3.5" />
              Đăng nhập
            </Link>
          )}

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground"
            aria-label="Toggle theme"
          >
            <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground md:hidden hover:bg-secondary/80"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="overflow-hidden border-t border-border/40 bg-card/95 backdrop-blur-lg md:hidden animate-slide-up" style={{ animationDuration: '0.2s' }}>
          <nav className="grid gap-0.5 px-4 py-3">
            {/* Mobile auth status */}
            {isLoggedIn ? (
              <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 mb-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{isGuest ? "Khách" : (user?.username || "Người dùng")}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-3 w-3" />
                  Đăng xuất
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary mb-1"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </Link>
            )}

            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                    ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
