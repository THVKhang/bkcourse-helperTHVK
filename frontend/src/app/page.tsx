import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">BKCourse Helper</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Import dữ liệu portal, dựng thời khóa biểu không trùng, theo dõi tiến độ 128 tín và đề xuất môn học theo kỳ.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Course Data Import & Parsing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Dán raw text từ portal → parse sections/meetings → xem issues.
            </p>
            <Button asChild>
              <Link href="/import">Đi tới Import</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planner (Timetable)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Thêm lớp vào TKB, xem conflicts, credits, workload.
            </p>
            <Button asChild>
              <Link href="/planner">Đi tới Planner</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Curriculum (128 tín)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Theo dõi tiến độ, tick PASSED, filter theo học kỳ/loại môn.
            </p>
            <Button asChild>
              <Link href="/curriculum">Đi tới Curriculum</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Gợi ý môn theo semester, bù đủ tín, hỗ trợ term hè.
            </p>
            <Button asChild>
              <Link href="/recommendations">Đi tới Recommendations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}