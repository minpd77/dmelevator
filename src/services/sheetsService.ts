import { ElevatorRecord } from '../types';
import seedElevatorRecords from './seedElevatorRecords.json';

// Main Elevator Condition DB
export const SPREADSHEET_ID = '1D3n0w9DdjXzOynwwq0KZPsQ9EH7V-g5dAQZc7TqF7ms';
export const SHEET_NAME = 'DB';

// Inspection Schedule Sheet (점검표TO캘린더 검사정리)
export const SCHEDULE_SPREADSHEET_ID = '1vC4f85EJ0Uajnws_eeB49HVbg_XW3kfVKem7vLqp06I';
export const SCHEDULE_SHEET_NAME = '점검표TO캘린더 검사정리';
export const SCHEDULE_SHEET_GID = '1134037580';

const CACHE_KEY = 'daemyung_elevator_db_cache_v3';
const CACHE_TIME_KEY = 'daemyung_elevator_db_cache_time_v3';

// Format helper for Date(...) string from Google gviz
function formatGvizValue(cell: any): string {
  if (!cell) return '';
  if (cell.f !== undefined && cell.f !== null) {
    return String(cell.f).trim();
  }
  if (cell.v !== undefined && cell.v !== null) {
    const val = String(cell.v).trim();
    // Check if it matches Date(yyyy,m,d) or Date(yyyy,m,d,h,min,s)
    const dateMatch = val.match(/^Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+),\s*(\d+))?\)$/);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) + 1; // 0-indexed in JS/gviz
      const day = parseInt(dateMatch[3], 10);
      if (dateMatch[4] !== undefined) {
        // Time object (often with year 1899)
        const hour = String(parseInt(dateMatch[4], 10)).padStart(2, '0');
        const min = String(parseInt(dateMatch[5] || '0', 10)).padStart(2, '0');
        return `${hour}:${min}`;
      }
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
    return val;
  }
  return '';
}

// Helper to extract 7-digit elevator number from link or text (e.g. no_plaq=0146074 or ...0146074)
function extractLast7Digits(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const match = str.match(/(\d{7})(?:[^\d]|$)/);
  if (match) return match[1];
  if (str.length >= 7) {
    const tail = str.slice(-7);
    if (/^\d{7}$/.test(tail)) return tail;
  }
  return '';
}

// Fetch helper via JSONP
function fetchGvizJsonp(url: string, timeoutMs: number = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `__gviz_cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const fullUrl = `${url}&tqx=responseHandler:${callbackName}`;

    let timeoutId: any;
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      try {
        delete (window as any)[callbackName];
      } catch {
        (window as any)[callbackName] = undefined;
      }
      const script = document.getElementById(callbackName);
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('네트워크 응답 시간 초과'));
    }, timeoutMs);

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = fullUrl;
    script.onerror = () => {
      cleanup();
      reject(new Error('네트워크 스크립트 로드 실패'));
    };

    document.body.appendChild(script);
  });
}

export const SheetsService = {
  getStoredData(): ElevatorRecord[] {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    // Return embedded seed records
    return (seedElevatorRecords as unknown as ElevatorRecord[]) || [];
  },

  getLastFetchTime(): string | null {
    try {
      return localStorage.getItem(CACHE_TIME_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Fetches the inspection schedule sheet (점검표TO캘린더 검사정리)
   * Extracts date & time pairs:
   *  - Set 1: Col A (날짜), Col B (시간), Col F (링크/번호)
   *  - Set 2: Col I (날짜), Col J (시간), Col N (링크/번호)
   *  - Set 3: Col Q (날짜), Col R (시간), Col V (링크/번호)
   * Returns a map of 7-digit elevator numbers to formatted inspection datetime string.
   */
  async fetchScheduleDateMap(): Promise<Record<string, string>> {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SCHEDULE_SPREADSHEET_ID}/gviz/tq?gid=${SCHEDULE_SHEET_GID}`;
      const data = await fetchGvizJsonp(url, 8000);
      const rows = data?.table?.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        return {};
      }

      const scheduleMap: Record<string, string> = {};
      let lastDateA = '';
      let lastDateI = '';
      let lastDateQ = '';

      rows.forEach((row: any) => {
        const c = row?.c || [];

        // Set 1: Col A(0), Col B(1), Col F(5)
        const dateA = formatGvizValue(c[0]);
        if (dateA) lastDateA = dateA;
        const timeB = formatGvizValue(c[1]);
        const numF = extractLast7Digits(c[5]?.v || c[5]?.f);
        if (numF && (lastDateA || timeB)) {
          scheduleMap[numF] = timeB ? `${lastDateA} ${timeB}`.trim() : lastDateA;
        }

        // Set 2: Col I(8), Col J(9), Col N(13)
        const dateI = formatGvizValue(c[8]);
        if (dateI) lastDateI = dateI;
        const timeJ = formatGvizValue(c[9]);
        const numN = extractLast7Digits(c[13]?.v || c[13]?.f);
        if (numN && (lastDateI || timeJ)) {
          scheduleMap[numN] = timeJ ? `${lastDateI} ${timeJ}`.trim() : lastDateI;
        }

        // Set 3: Col Q(16), Col R(17), Col V(21)
        const dateQ = formatGvizValue(c[16]);
        if (dateQ) lastDateQ = dateQ;
        const timeR = formatGvizValue(c[17]);
        const numV = extractLast7Digits(c[21]?.v || c[21]?.f);
        if (numV && (lastDateQ || timeR)) {
          scheduleMap[numV] = timeR ? `${lastDateQ} ${timeR}`.trim() : lastDateQ;
        }
      });

      return scheduleMap;
    } catch (e) {
      console.warn('점검표TO캘린더 검사정리 시트 로드 실패, 기존 DB 검사일자로 계속 진행:', e);
      return {};
    }
  },

  async fetchElevatorRecords(): Promise<ElevatorRecord[]> {
    try {
      // Fetch schedule map and main DB in parallel
      const [scheduleMap, dbData] = await Promise.all([
        SheetsService.fetchScheduleDateMap(),
        fetchGvizJsonp(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}`, 12000),
      ]);

      const rows = dbData?.table?.rows;
      if (!Array.isArray(rows) || rows.length < 2) {
        return [];
      }

      const records: ElevatorRecord[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const c = row?.c || [];

        const siteName = formatGvizValue(c[0]);
        if (!siteName) continue;

        const elevatorNumber = formatGvizValue(c[1]);
        const manufacturer = formatGvizValue(c[2]);
        const model = formatGvizValue(c[3]);
        const type = formatGvizValue(c[4]);
        const capacity = formatGvizValue(c[5]);
        const area = formatGvizValue(c[8]);
        const address = formatGvizValue(c[22]);
        const insurance = formatGvizValue(c[24]);
        const safetyManager = formatGvizValue(c[28]);
        const inspectionType = formatGvizValue(c[32]);
        const originalInspectionDate = formatGvizValue(c[33]);
        const inspectionResult = formatGvizValue(c[34]);
        const conditionCode = formatGvizValue(c[35]);
        const conditionDeadline = formatGvizValue(c[36]);
        const conditionRemarks = formatGvizValue(c[37]);
        const maintenanceDate = formatGvizValue(c[39]);
        const maintenanceStartTime = formatGvizValue(c[40]);
        const maintenanceEndTime = formatGvizValue(c[41]);
        const technicianPrimary = formatGvizValue(c[43]);
        const technicianSecondary = formatGvizValue(c[44]);
        const deadlineDate = formatGvizValue(c[45]);

        // 7-digit elevator key comparison with schedule sheet (F, N, V)
        const elKey7 = elevatorNumber.length >= 7 
          ? elevatorNumber.slice(-7) 
          : elevatorNumber.padStart(7, '0');

        const scheduledDateTime = scheduleMap[elKey7];
        // If matched with '점검표TO캘린더 검사정리', put that datetime into inspectionDate
        const finalInspectionDate = scheduledDateTime || originalInspectionDate;

        records.push({
          id: `el-${i}-${elevatorNumber || siteName}`,
          siteName,
          elevatorNumber,
          manufacturer,
          model,
          type,
          capacity,
          area,
          address,
          insurance,
          safetyManager,
          inspectionType,
          inspectionDate: finalInspectionDate,
          inspectionResult,
          conditionCode,
          conditionDeadline,
          conditionRemarks,
          maintenanceDate,
          maintenanceStartTime,
          maintenanceEndTime,
          technicianPrimary,
          technicianSecondary,
          deadlineDate,
          inspectionScheduledDateTime: scheduledDateTime,
        });
      }

      // Cache locally
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(records));
        localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
      } catch {
        // cache full or disabled
      }

      return records;
    } catch (err) {
      // Fallback to cache if available
      const cached = SheetsService.getStoredData();
      if (cached && cached.length > 0) {
        return cached;
      }
      throw err;
    }
  },
};
