import { ElevatorRecord } from '../types';
import seedElevatorRecords from './seedElevatorRecords.json';

// Main Elevator Condition DB (Link 3)
export const SPREADSHEET_ID = '1D3n0w9DdjXzOynwwq0KZPsQ9EH7V-g5dAQZc7TqF7ms';
export const SHEET_NAME = 'DB';

// Inspection Schedule Sheet (Link 1: 점검표TO캘린더 검사정리)
export const SCHEDULE_SPREADSHEET_ID = '1vC4f85EJ0Uajnws_eeB49HVbg_XW3kfVKem7vLqp06I';
export const SCHEDULE_SHEET_NAME = '점검표TO캘린더 검사정리';
export const SCHEDULE_SHEET_GID = '1134037580';

// Second Sheet in Schedule Doc (Link 2: gid=1183872898)
export const SHEET2_SPREADSHEET_ID = '1vC4f85EJ0Uajnws_eeB49HVbg_XW3kfVKem7vLqp06I';
export const SHEET2_SHEET_GID = '1183872898';

// Map & Elevator Specifications Sheet (Link 4: gid=381852124)
export const MAP_SPREADSHEET_ID = '1dD2B5Iro2WBPurXrZZAf_pbsbSzoxT96sWztvM8HzA8';
export const MAP_SHEET_GID = '381852124';

const CACHE_KEY = 'daemyung_elevator_db_cache_v5_q_aa_full';
const CACHE_TIME_KEY = 'daemyung_elevator_db_cache_time_v5';

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

// Normalize date and time strings to canonical "YYYY-MM-DD HH:mm"
export function normalizeDateTime(dateStr?: string | null, timeStr?: string | null): string {
  let date = (dateStr || '').trim();
  let time = (timeStr || '').trim();

  if (!time && date.includes(' ')) {
    const parts = date.split(/\s+/);
    date = parts[0];
    time = parts.slice(1).join(' ');
  }

  // Format 2-digit year YY-MM-DD -> 20YY-MM-DD
  if (/^\d{2}-\d{1,2}-\d{1,2}$/.test(date)) {
    const [yy, mm, dd] = date.split('-');
    date = `20${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
    const [yyyy, mm, dd] = date.split('-');
    date = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // Format time H:MM -> 0H:MM
  if (time) {
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hh = timeMatch[1].padStart(2, '0');
      const mm = timeMatch[2];
      time = `${hh}:${mm}`;
    }
  }

  if (date && time) return `${date} ${time}`;
  return date || time;
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
          scheduleMap[numF] = normalizeDateTime(lastDateA, timeB);
        }

        // Set 2: Col I(8), Col J(9), Col N(13)
        const dateI = formatGvizValue(c[8]);
        if (dateI) lastDateI = dateI;
        const timeJ = formatGvizValue(c[9]);
        const numN = extractLast7Digits(c[13]?.v || c[13]?.f);
        if (numN && (lastDateI || timeJ)) {
          scheduleMap[numN] = normalizeDateTime(lastDateI, timeJ);
        }

        // Set 3: Col Q(16), Col R(17), Col V(21)
        const dateQ = formatGvizValue(c[16]);
        if (dateQ) lastDateQ = dateQ;
        const timeR = formatGvizValue(c[17]);
        const numV = extractLast7Digits(c[21]?.v || c[21]?.f);
        if (numV && (lastDateQ || timeR)) {
          scheduleMap[numV] = normalizeDateTime(lastDateQ, timeR);
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
      // Concurrently fetch all 4 sources
      const [scheduleMapResult, dbDataResult, sheet2Result, mapDataResult] = await Promise.allSettled([
        SheetsService.fetchScheduleDateMap(),
        fetchGvizJsonp(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}`, 12000),
        fetchGvizJsonp(`https://docs.google.com/spreadsheets/d/${SHEET2_SPREADSHEET_ID}/gviz/tq?gid=${SHEET2_SHEET_GID}`, 12000),
        fetchGvizJsonp(`https://docs.google.com/spreadsheets/d/${MAP_SPREADSHEET_ID}/gviz/tq?gid=${MAP_SHEET_GID}`, 12000),
      ]);

      const scheduleMap = scheduleMapResult.status === 'fulfilled' ? scheduleMapResult.value : {};
      const dbData = dbDataResult.status === 'fulfilled' ? dbDataResult.value : null;
      const sheet2Data = sheet2Result.status === 'fulfilled' ? sheet2Result.value : null;
      const mapData = mapDataResult.status === 'fulfilled' ? mapDataResult.value : null;

      const recordMap = new Map<string, ElevatorRecord>();

      // 1. Process Main DB (Link 3: C-H열 제외하고 모든 정보 표시)
      const dbRows = dbData?.table?.rows;
      if (Array.isArray(dbRows) && dbRows.length > 1) {
        for (let i = 1; i < dbRows.length; i++) {
          const row = dbRows[i];
          const c = row?.c || [];

          const siteName = formatGvizValue(c[0]); // Col A (현장명)
          if (!siteName) continue;

          const elevatorNumber = formatGvizValue(c[1]); // Col B (승강기번호)
          // Col C(2) ~ Col H(7) 제외
          const area = formatGvizValue(c[8]); // Col I (구역)
          const infoCenterSiteName = formatGvizValue(c[9]); // Col J (정보센터 현장명)
          const manufacturer = formatGvizValue(c[10]); // Col K (제조업체)
          const model = formatGvizValue(c[11]); // Col L (승강기모델)
          const capacity = formatGvizValue(c[12]); // Col M (적재하중)
          const speedOrFloors = formatGvizValue(c[13]); // Col N (운행구간/속도)
          const installDate = formatGvizValue(c[14]); // Col O (설치일자)
          const validInspectionDate = formatGvizValue(c[15]); // Col P (정기검사 유효기간)
          const carDepth = formatGvizValue(c[16]); // Col Q (카치수 안길이)
          const carWidth = formatGvizValue(c[17]); // Col R (카치수 폭)
          const doorHeight = formatGvizValue(c[18]); // Col S (카출입구치수 높이)
          const doorWidth = formatGvizValue(c[19]); // Col T (카출입구치수 폭)
          const doorTypeOrPassengerCount = formatGvizValue(c[20]); // Col U (개폐방식 / 정원)
          const type = formatGvizValue(c[21]); // Col V (승강기종류)
          const address = formatGvizValue(c[22]); // Col W (주소)
          const buildingUsage = formatGvizValue(c[23]); // Col X (건물용도)
          const insurance = formatGvizValue(c[24]); // Col Y (보험사)
          const insuranceStartDate = formatGvizValue(c[25]); // Col Z (보험가입일)
          const insuranceEndDate = formatGvizValue(c[26]); // Col AA (보험만료일)
          const safetyManagerAppointDate = formatGvizValue(c[27]); // Col AB (안전관리자 선임일)
          const safetyManager = formatGvizValue(c[28]); // Col AC (안전관리자명)
          const safetyManagerBirth = formatGvizValue(c[29]); // Col AD (생년월일)
          const trainingDate = formatGvizValue(c[30]); // Col AE (직무교육일)
          const trainingValidDate = formatGvizValue(c[31]); // Col AF (직무교육 유효기간)
          const inspectionType = formatGvizValue(c[32]); // Col AG (검사구분)
          const originalInspectionDate = formatGvizValue(c[33]); // Col AH (검사일)
          const inspectionResult = formatGvizValue(c[34]); // Col AI (검사결과)
          const conditionCode = formatGvizValue(c[35]); // Col AJ (조건부코드)
          const conditionDeadline = formatGvizValue(c[36]); // Col AK (조건부기한)
          const conditionRemarks = formatGvizValue(c[37]); // Col AL (조건부사항)
          const maintenanceMonth = formatGvizValue(c[38]); // Col AM (점검월)
          const maintenanceDate = formatGvizValue(c[39]); // Col AN (자체점검 일자)
          const maintenanceStartTime = formatGvizValue(c[40]); // Col AO (점검시작시간)
          const maintenanceEndTime = formatGvizValue(c[41]); // Col AP (점검종료시간)
          const nextMaintenanceDate = formatGvizValue(c[42]); // Col AQ (다음 점검일)
          const technicianPrimary = formatGvizValue(c[43]); // Col AR (점검정)
          const technicianSecondary = formatGvizValue(c[44]); // Col AS (점검보조)
          const deadlineDate = formatGvizValue(c[45]); // Col AT (마감일)

          const elKey7 = elevatorNumber ? elevatorNumber.replace(/\D/g, '').padStart(7, '0') : '';
          const key = elKey7 || `db-${siteName}-${i}`;

          recordMap.set(key, {
            id: `el-db-${key}`,
            siteName,
            elevatorNumber: elKey7 || elevatorNumber,
            area,
            infoCenterSiteName,
            manufacturer,
            model,
            capacity,
            speedOrFloors,
            installDate,
            validInspectionDate,
            carDepth,
            carWidth,
            doorHeight,
            doorWidth,
            doorTypeOrPassengerCount,
            type,
            address,
            buildingUsage,
            insurance,
            insuranceStartDate,
            insuranceEndDate,
            safetyManagerAppointDate,
            safetyManager,
            safetyManagerBirth,
            trainingDate,
            trainingValidDate,
            inspectionType,
            inspectionDate: originalInspectionDate,
            inspectionResult,
            conditionCode,
            conditionDeadline,
            conditionRemarks,
            maintenanceMonth,
            maintenanceDate,
            maintenanceStartTime,
            maintenanceEndTime,
            nextMaintenanceDate,
            technicianPrimary,
            technicianSecondary,
            deadlineDate,
          });
        }
      }

      // 2. Process & enrich with Sheet 2 (Link 2: gid=1183872898)
      const s2Rows = sheet2Data?.table?.rows;
      if (Array.isArray(s2Rows) && s2Rows.length > 0) {
        for (let i = 0; i < s2Rows.length; i++) {
          const row = s2Rows[i];
          const c = row?.c || [];
          const siteName = formatGvizValue(c[0]);
          const rawNum = formatGvizValue(c[1]);
          const numDigits = rawNum ? rawNum.replace(/\D/g, '') : '';
          const elKey7 = numDigits ? numDigits.padStart(7, '0') : '';
          const key = elKey7 || (siteName ? `s2-${siteName}` : '');
          if (!key) continue;

          const model = formatGvizValue(c[13]) || formatGvizValue(c[3]);
          const remarks = formatGvizValue(c[39]);
          const addr = formatGvizValue(c[9]) || formatGvizValue(c[24]);
          const existing = recordMap.get(key);

          if (existing) {
            if (!existing.model && model) existing.model = model;
            if (!existing.conditionRemarks && remarks) existing.conditionRemarks = remarks;
            if (!existing.address && addr) existing.address = addr;
          } else if (siteName) {
            recordMap.set(key, {
              id: `el-s2-${key}`,
              siteName,
              elevatorNumber: elKey7 || rawNum,
              manufacturer: formatGvizValue(c[2]) || formatGvizValue(c[12]),
              model,
              type: formatGvizValue(c[4]) || formatGvizValue(c[23]),
              capacity: formatGvizValue(c[5]) || formatGvizValue(c[14]),
              area: formatGvizValue(c[8]),
              address: addr,
              insurance: formatGvizValue(c[26]),
              safetyManager: formatGvizValue(c[30]),
              inspectionType: formatGvizValue(c[34]),
              inspectionDate: formatGvizValue(c[35]),
              inspectionResult: formatGvizValue(c[36]),
              conditionCode: formatGvizValue(c[37]),
              conditionDeadline: formatGvizValue(c[38]),
              conditionRemarks: remarks,
              maintenanceDate: formatGvizValue(c[41]),
              maintenanceStartTime: formatGvizValue(c[42]),
              maintenanceEndTime: formatGvizValue(c[43]),
              technicianPrimary: formatGvizValue(c[45]),
              technicianSecondary: formatGvizValue(c[46]),
              deadlineDate: formatGvizValue(c[38]),
            });
          }
        }
      }

      // 3. Process & enrich with Map Sheet (Link 4: gid=381852124)
      const mapRows = mapData?.table?.rows;
      if (Array.isArray(mapRows) && mapRows.length > 0) {
        for (let i = 0; i < mapRows.length; i++) {
          const row = mapRows[i];
          const c = row?.c || [];
          const siteName = formatGvizValue(c[32]);
          const rawNum = formatGvizValue(c[23]);
          const numDigits = rawNum ? rawNum.replace(/\D/g, '') : '';
          const elKey7 = numDigits ? numDigits.padStart(7, '0') : '';
          const key = elKey7 || (siteName ? `map-${siteName}-${i}` : '');
          if (!key) continue;

          const model = formatGvizValue(c[27]);
          const rawArea = formatGvizValue(c[19]);
          const cleanArea = rawArea.replace(/팀|구역$/, '').trim();
          const addr = formatGvizValue(c[7]);
          const emergencyEquipment = formatGvizValue(c[16]); // Col Q: 비상통화장비
          const emergencyPhone = formatGvizValue(c[26]); // Col AA: 비상통화번호
          const existing = recordMap.get(key);

          if (existing) {
            if (!existing.model && model) existing.model = model;
            if (!existing.address && addr) existing.address = addr;
            if (!existing.area && cleanArea) existing.area = cleanArea;
            if (emergencyEquipment) existing.emergencyEquipment = emergencyEquipment;
            if (emergencyPhone) existing.emergencyPhone = emergencyPhone;
          } else if (siteName) {
            const resultVal = formatGvizValue(c[25]);
            const conditionVal = formatGvizValue(c[34]);
            const finalResult = resultVal || (conditionVal ? '조건부' : '합격');

            recordMap.set(key, {
              id: `el-map-${key}`,
              siteName,
              elevatorNumber: elKey7 || rawNum,
              manufacturer: '',
              model,
              type: '',
              capacity: '',
              area: cleanArea || '기타',
              address: addr,
              insurance: '',
              safetyManager: '',
              inspectionType: '',
              inspectionDate: formatGvizValue(c[8]),
              inspectionResult: finalResult,
              conditionCode: '',
              conditionDeadline: formatGvizValue(c[30]),
              conditionRemarks: formatGvizValue(c[21]) || formatGvizValue(c[31]),
              maintenanceDate: '',
              maintenanceStartTime: '',
              maintenanceEndTime: '',
              technicianPrimary: formatGvizValue(c[20]),
              technicianSecondary: '',
              deadlineDate: formatGvizValue(c[30]),
              emergencyEquipment,
              emergencyPhone,
            });
          }
        }
      }

      // 4. Overwrite/merge schedule inspection date & times from Link 1 (Schedule Sheet)
      for (const [key, rec] of recordMap.entries()) {
        const num7 = rec.elevatorNumber ? rec.elevatorNumber.replace(/\D/g, '').padStart(7, '0') : '';
        const scheduledDateTime = scheduleMap[num7] || scheduleMap[key];
        if (scheduledDateTime) {
          rec.inspectionScheduledDateTime = scheduledDateTime;
          rec.inspectionDate = scheduledDateTime;
        }
      }

      const records = Array.from(recordMap.values());

      // If records were successfully fetched, cache them
      if (records.length > 0) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(records));
          localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
        } catch {
          // cache full or disabled
        }
        return records;
      }

      return SheetsService.getStoredData();
    } catch (err) {
      console.error('Failed to fetch from sheets, falling back to cache:', err);
      const cached = SheetsService.getStoredData();
      if (cached && cached.length > 0) {
        return cached;
      }
      throw err;
    }
  },
};
