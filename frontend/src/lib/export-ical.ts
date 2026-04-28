import { saveAs } from "file-saver";
import type { ScheduleOption } from "./types";

// Base start date for Week 1 (Monday). Hardcoded for now per request, can be made dynamic later.
const DEFAULT_START_DATE = new Date("2026-09-07T00:00:00+07:00");

// Returns hours and minutes for a given period start
function getPeriodStartTime(period: number): { hours: number, minutes: number } {
  // Tiết 1: 6:00, Tiết 2: 7:00, ... Tiết 12: 17:00
  return { hours: 5 + period, minutes: 0 };
}

// Format date to ICS required format: YYYYMMDDTHHmmssZ
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function exportToICS(option: ScheduleOption, baseDate: Date = DEFAULT_START_DATE) {
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BKCourse Helper//VN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  option.items.forEach(item => {
    item.meetings.forEach(m => {
      if (!m.study_weeks || m.study_weeks.length === 0) return;

      const title = `${item.subject_id} - ${item.subject_name || ""}`;
      const location = m.room ? m.room : "Chưa có phòng";
      const description = `Nhóm: ${item.section_code}\\nSố tín chỉ: ${item.credits}\\nTiết: ${m.start_period} - ${m.start_period + m.duration - 1}`;

      const { hours: startH, minutes: startM } = getPeriodStartTime(m.start_period);
      // Duration is 50 mins per period. End time = start time + duration * 50 mins + (duration-1) * 10 mins (break)
      // Total duration in minutes = duration * 60 - 10
      const totalDurationMins = m.duration * 60 - 10;
      
      const { hours: endH, minutes: endM } = {
        hours: startH + Math.floor((startM + totalDurationMins) / 60),
        minutes: (startM + totalDurationMins) % 60
      };

      // Create an event for each specific week
      m.study_weeks.forEach(weekNo => {
        // baseDate is Monday of Week 1.
        // Target date = baseDate + (weekNo - 1) weeks + (day_of_week - 2) days
        const daysOffset = (weekNo - 1) * 7 + (m.day_of_week - 2);
        
        const eventDate = new Date(baseDate.getTime());
        eventDate.setDate(eventDate.getDate() + daysOffset);
        
        const startDate = new Date(eventDate.getTime());
        startDate.setHours(startH, startM, 0, 0);
        
        const endDate = new Date(eventDate.getTime());
        endDate.setHours(endH, endM, 0, 0);

        const uid = `${item.subject_id}-${item.section_code}-${m.day_of_week}-${m.start_period}-W${weekNo}@bkcourse.com`.replace(/\s+/g, "");

        icsContent.push(
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${formatICSDate(new Date())}`,
          `DTSTART:${formatICSDate(startDate)}`,
          `DTEND:${formatICSDate(endDate)}`,
          `SUMMARY:${title}`,
          `LOCATION:${location}`,
          `DESCRIPTION:${description}`,
          "END:VEVENT"
        );
      });
    });
  });

  icsContent.push("END:VCALENDAR");

  const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  saveAs(blob, `BKCourse_Schedule_${option.option_name}.ics`);
}
