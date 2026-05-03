"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, ArrowRight, Loader2, User, Lock, Mail, KeyRound } from "lucide-react";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, loginWith } = useUser();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    if (isLoggedIn) router.push("/");
  }, [isLoggedIn, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error("Vui lòng nhập tài khoản và mật khẩu!");

    setLoading(true);
    try {
      if (mode === "register") {
        const res = await authApi.register(username, password, email || undefined);
        loginWith(res.token, {
          username: res.username,
          email: res.email,
          studentCode: res.student_code || res.username,
          isGuest: false,
        });
        toast.success("Đăng ký thành công!");
      } else {
        const res = await authApi.login(username, password);
        loginWith(res.token, {
          username: res.username,
          email: res.email,
          studentCode: res.student_code || res.username,
          isGuest: false,
        });
        toast.success("Đăng nhập thành công!");
      }
      router.push("/");
    } catch (err: any) {
      const msg = err.message || "Đã xảy ra lỗi";
      // Extract detail from "422 ...: {\"detail\":\"...\"}"
      try {
        const jsonPart = msg.substring(msg.indexOf("{"));
        const parsed = JSON.parse(jsonPart);
        toast.error(parsed.detail || msg);
      } catch {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      const res = await authApi.guest();
      loginWith(res.token, {
        username: res.username,
        studentCode: res.student_code || res.username,
        isGuest: true,
      });
      toast.success("Đang vào chế độ Khách...");
      router.push("/");
    } catch (err: any) {
      toast.error("Lỗi tạo phiên Khách");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error("Vui lòng nhập email!");
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      toast.success(res.message);
      setMode("login");
    } catch {
      toast.error("Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password form
  if (mode === "forgot") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 relative">
        {/* Animated mesh background */}
        <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
          <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] -top-20 -left-20 opacity-30" style={{background: 'hsl(var(--primary))', animation: 'mesh-move-1 15s ease-in-out infinite'}} />
          <div className="absolute w-[350px] h-[350px] rounded-full blur-[100px] -bottom-20 -right-20 opacity-20" style={{background: 'hsl(var(--accent))', animation: 'mesh-move-2 18s ease-in-out infinite'}} />
        </div>
        <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/80 backdrop-blur-sm animate-scale-in">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-gradient-to-br from-primary/20 to-accent/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-primary/10 animate-float-slow">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold">Quên mật khẩu</CardTitle>
            <CardDescription>Nhập email đã gắn với tài khoản để nhận link đặt lại mật khẩu</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="Email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="pl-10" />
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Gửi link đặt lại
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">← Quay lại đăng nhập</button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative">
      {/* Animated mesh background */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] -top-20 -left-20 opacity-30" style={{background: 'hsl(var(--primary))', animation: 'mesh-move-1 15s ease-in-out infinite'}} />
        <div className="absolute w-[350px] h-[350px] rounded-full blur-[100px] -bottom-20 -right-20 opacity-20" style={{background: 'hsl(var(--accent))', animation: 'mesh-move-2 18s ease-in-out infinite'}} />
      </div>
      <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/80 backdrop-blur-sm animate-scale-in">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="mx-auto bg-gradient-to-br from-primary/20 to-accent/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-primary/10 animate-float-slow">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Chào mừng đến BKCourse</CardTitle>
          <CardDescription className="text-sm">
            {mode === "register" ? "Tạo tài khoản mới" : "Đăng nhập để lưu lịch học"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleAuth} className="space-y-3">
            {/* Username */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tên tài khoản"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                autoComplete="username"
              />
            </div>

            {/* Email — only shown during registration */}
            {mode === "register" && (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email (tùy chọn — dùng để khôi phục mật khẩu)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            )}

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </div>

            {/* Forgot password link */}
            {mode === "login" && (
              <div className="text-right">
                <button type="button" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {mode === "register" ? "Đăng ký" : "Đăng nhập"}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">hoặc</span>
            </div>
          </div>

          <Button variant="outline" className="w-full font-semibold border-primary/20 hover:bg-primary/5" onClick={handleGuest} disabled={loading}>
            Tiếp tục với tư cách Khách <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-[11px] text-center text-muted-foreground mt-2">
            Chế độ Khách cho phép dùng thử mà không cần tài khoản
          </p>
        </CardContent>

        <CardFooter className="flex justify-center text-sm text-muted-foreground pt-0">
          {mode === "register" ? (
            <p>Đã có tài khoản?{" "}
              <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">Đăng nhập</button>
            </p>
          ) : (
            <p>Chưa có tài khoản?{" "}
              <button onClick={() => setMode("register")} className="text-primary hover:underline font-medium">Đăng ký</button>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
