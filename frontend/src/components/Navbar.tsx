"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useUser } from "@/components/UserProvider";
import {
  Sun, Moon, Menu, X, LogIn, LogOut, User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/planner", label: "Xếp lịch" },
  { href: "/study-plan", label: "Kế hoạch" },
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
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5 sm:px-8 lg:px-10">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="font-display text-xl tracking-tight text-foreground">
            BKCourse
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-sm font-medium transition-colors duration-200
                  ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
                {active && <span className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-foreground" />}
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Auth */}
          {isLoggedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isGuest ? "Khách" : (user?.username || "User")}
              </span>
              <button
                onClick={handleLogout}
                className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
                title="Đăng xuất"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex h-8 items-center gap-1.5 rounded-full bg-foreground text-background px-4 text-xs font-semibold transition-opacity hover:opacity-80"
            >
              Đăng nhập
            </Link>
          )}

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-200 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-200 dark:rotate-0 dark:scale-100" />
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground md:hidden hover:bg-secondary"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden animate-fade-in" style={{ animationDuration: '0.15s' }}>
          <nav className="grid gap-1 px-5 py-3">
            {isLoggedIn ? (
              <div className="flex items-center justify-between py-2 mb-1">
                <span className="text-sm text-muted-foreground">
                  {isGuest ? "Khách" : (user?.username || "User")}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-full bg-foreground text-background py-2 text-sm font-semibold mb-2"
              >
                Đăng nhập
              </Link>
            )}

            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                    ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
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
