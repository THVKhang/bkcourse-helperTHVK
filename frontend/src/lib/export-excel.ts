import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { ScheduleOption } from "./types";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7"];

export function exportToExcel(option: ScheduleOption) {
  // --- Sheet 1: Bảng thời khóa biểu tuần ---
  const timetableData: any[] = [
    ["Tiết", "Thời gian", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
  ];
  
  const PERIOD_TIMES = [
    "", // index 0 unused
    "06:00 - 06:50", "07:00 - 07:50", "08:00 - 08:50", "09:00 - 09:50", 
    "10:00 - 10:50", "11:00 - 11:50", "12:00 - 12:50", "13:00 - 13:50", 
    "14:00 - 14:50", "15:00 - 15:50", "16:00 - 16:50", "17:00 - 17:50"
  ];

  // Khởi tạo bảng rỗng 12 tiết x 6 ngày
  const grid: string[][] = Array.from({ length: 13 }, () => Array(8).fill(""));

  for (let p = 1; p <= 12; p++) {
    grid[p][0] = `Tiết ${p}`;
    grid[p][1] = PERIOD_TIMES[p];
  }

  // Điền môn học vào bảng
  option.items.forEach(item => {
    item.meetings.forEach(m => {
      const dayCol = m.day_of_week; // 2=Thứ 2 (index 2 in grid), 3=Thứ 3 (index 3)
      for (let p = m.start_period; p < m.start_period + m.duration; p++) {
        if (p <= 12) {
          const roomStr = m.room ? ` (${m.room})` : "";
          const content = `${item.subject_id} - ${item.section_code}${roomStr}`;
          
          if (grid[p][dayCol]) {
            grid[p][dayCol] += `\n${content}`; // Xử lý trùng nếu có
          } else {
            grid[p][dayCol] = content;
          }
        }
      }
    });
  });

  // Push grid data (skip index 0)
  for (let p = 1; p <= 12; p++) {
    timetableData.push(grid[p]);
  }

  // --- Sheet 2: Danh sách môn học chi tiết ---
  const listData: any[] = [
    ["Mã MH", "Tên MH", "Nhóm", "Số TC", "Thứ", "Tiết Bắt Đầu", "Số Tiết", "Phòng", "Tuần Học"]
  ];

  option.items.forEach(item => {
    if (item.meetings.length === 0) {
      listData.push([
        item.subject_id, item.subject_name || "", item.section_code, item.credits,
        "Chưa có lịch", "", "", "", ""
      ]);
    } else {
      item.meetings.forEach(m => {
        listData.push([
          item.subject_id, item.subject_name || "", item.section_code, item.credits,
          DAY_LABELS[m.day_of_week - 2], m.start_period, m.duration, m.room || "",
          m.study_weeks?.join(", ") || "Chưa xác định"
        ]);
      });
    }
  });

  // Tạo workbook
  const wb = XLSX.utils.book_new();
  
  const ws1 = XLSX.utils.aoa_to_sheet(timetableData);
  // Auto-width for columns
  ws1["!cols"] = [
    { wch: 8 }, { wch: 15 }, 
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Lịch Học Tuần");

  const ws2 = XLSX.utils.aoa_to_sheet(listData);
  ws2["!cols"] = [
    { wch: 10 }, { wch: 35 }, { wch: 10 }, { wch: 8 },
    { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Danh Sách Chi Tiết");

  // Xuất file
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), `BKCourse_Schedule_${option.option_name}.xlsx`);
}
