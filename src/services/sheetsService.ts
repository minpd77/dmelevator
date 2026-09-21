import { ElevatorRecord } from '../types';
import seedElevatorRecords from './seedElevatorRecords.json';

export const SPREADSHEET_ID = '1D3n0w9DdjXzOynwwq0KZPsQ9EH7V-g5dAQZc7TqF7ms';
export const SHEET_NAME = 'DB';
const CACHE_KEY = 'daemyung_elevator_db_cache_v2';
const CACHE_TIME_KEY = 'daemyung_elevator_db_cache_time_v2';

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
    // Return embedded seed records so there is zero delay and zero network error on mobile
    return (seedElevatorRecords as unknown as ElevatorRecord[]) || [];
  },

  getLastFetchTime(): string | null {
    try {
      return localStorage.getItem(CACHE_TIME_KEY);
    } catch {
      return null;
    }
  },

  async fetchElevatorRecords(): Promise<ElevatorRecord[]> {
    return new Promise((resolve, reject) => {
      // Use JSONP to ensure 100% browser compatibility without CORS restriction
      const callbackName = `__gviz_cb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&sheet=${encodeURIComponent(SHEET_NAME)}`;

      let timeoutId: any;

      // Cleanup
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
        try {
          const rows = data?.table?.rows;
          if (!Array.isArray(rows) || rows.length < 2) {
            resolve([]);
            return;
          }

          // Row 0 is column headers, data starts from index 1
          const records: ElevatorRecord[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const c = row?.c || [];

            const siteName = formatGvizValue(c[0]);
            // Skip rows without site name
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
            const inspectionDate = formatGvizValue(c[33]);
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
              inspectionDate,
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
            });
          }

          // Cache locally
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(records));
            localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
          } catch {
            // cache full or disabled
          }

          resolve(records);
        } catch (err) {
          reject(err);
        }
      };

      // Set timeout fallback
      timeoutId = setTimeout(() => {
        cleanup();
        // Check if we have cached data to fall back to
        const cached = SheetsService.getStoredData();
        if (cached && cached.length > 0) {
          resolve(cached);
        } else {
          reject(new Error('구글 스프레드시트 데이터 응답 시간 초과'));
        }
      }, 12000);

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = url;
      script.onerror = () => {
        cleanup();
        const cached = SheetsService.getStoredData();
        if (cached && cached.length > 0) {
          resolve(cached);
        } else {
          reject(new Error('구글 스프레드시트 로드 중 네트워크 오류가 발생했습니다.'));
        }
      };

      document.body.appendChild(script);
    });
  },
};
