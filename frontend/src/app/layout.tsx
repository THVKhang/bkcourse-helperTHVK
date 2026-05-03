import "../styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UserProvider } from "@/components/UserProvider";
import { Navbar } from "@/components/Navbar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BKCourse Helper — Chọn môn thông minh cho sinh viên Bách Khoa",
  description:
    "Công cụ hỗ trợ sinh viên HCMUT chọn môn học, xây thời khóa biểu không trùng, theo dõi tiến độ 128 tín chỉ và nhận đề xuất môn học thông minh.",
  keywords: "HCMUT, Bách Khoa, chọn môn, thời khóa biểu, đăng ký môn học",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider>
          <UserProvider>
            <div className="relative flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <div className="mx-auto w-full max-w-[1200px] px-5 py-8 sm:px-8 lg:px-10">
                  {children}
                </div>
              </main>
              <footer className="py-8">
                <div className="section-divider mx-auto max-w-[200px] mb-6" />
                <div className="text-center text-xs text-muted-foreground tracking-wide">
                  BKCourse Helper — Built for HCMUT students
                </div>
              </footer>
            </div>
            <Toaster richColors position="bottom-right" />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
