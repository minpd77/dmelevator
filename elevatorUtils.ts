import { ElevatorRecord } from '../types';

// Helper utilities for Elevator data, area badges, formatting and search ranking

export const cleanAreaName = (area?: string | null): string => {
  if (!area) return '기타';
  const trimmed = String(area).replace(/\s*(?:구역|팀)$/, '').trim();
  return trimmed || '기타';
};

// Area badge color: 강북 (파랑), 강남 (실시간연동 같은 녹색), 경기 (보라색)
export const getAreaBadgeClass = (area?: string | null): string => {
  const clean = cleanAreaName(area);
  if (clean.includes('강남')) {
    return 'bg-emerald-950 text-emerald-300 border-emerald-800/80';
  }
  if (clean.includes('강북')) {
    return 'bg-blue-950 text-blue-300 border-blue-800';
  }
  if (clean.includes('경기')) {
    return 'bg-purple-950 text-purple-300 border-purple-800';
  }
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

// Split condition remarks by "숫자)" pattern (e.g. 1) ... 2) ...)
export function parseConditionLines(remarks: string): string[] {
  if (!remarks || !remarks.trim()) return [];
  const parts = remarks.trim().split(/(?=\b\d+\))/).map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [remarks.trim()];
}

// Strip whitespace and lower-case
export const stripWhitespace = (str?: string | null): string => {
  if (!str) return '';
  return String(str).replace(/\s+/g, '').toLowerCase();
};

/**
 * Calculates search relevance score according to the user's priority order:
 * 1. 현장명 (Site name) - Highest priority
 * 2. 승강기번호 (Elevator number) - 2nd priority (supports 0-padding or non-padded)
 * 3. 구역 (Area) - 3rd priority
 * 4. 승강기모델 / 모델명 (Elevator model, model name) - 4th priority (supports hyphen/space flexibility)
 * 5. 주소 (Address) - 5th priority
 * 6. 기타 (검사구분, 결과, 조건부내용, 제조업체, 관리자) - 6th priority
 * 
 * All checks completely ignore spaces (띄어쓰기 무시).
 */
export function scoreElevatorRecord(rec: ElevatorRecord, rawQuery: string): number {
  const q = stripWhitespace(rawQuery);
  if (!q) return 0;

  let score = 0;

  // 1. 현장명 (Site name) - Rank 1
  const site = stripWhitespace(rec.siteName);
  if (site) {
    if (site === q) score += 10000;
    else if (site.startsWith(q)) score += 6000;
    else if (site.includes(q)) score += 4000;
  }

  // 2. 승강기번호 (Elevator number) - Rank 2
  const elNum = stripWhitespace(rec.elevatorNumber);
  const qDigits = q.replace(/\D/g, '');
  const elDigits = elNum.replace(/\D/g, '');

  if (qDigits.length > 0) {
    const qCleanZero = qDigits.replace(/^0+/, '');
    const elCleanZero = elDigits.replace(/^0+/, '');
    const paddedEl7 = elDigits ? elDigits.padStart(7, '0') : '';

    if (elDigits === qDigits || (qCleanZero.length > 0 && elCleanZero === qCleanZero) || paddedEl7 === qDigits) {
      score += 8000;
    } else if (elDigits.startsWith(qDigits) || (qCleanZero.length > 0 && elCleanZero.startsWith(qCleanZero)) || paddedEl7.startsWith(qDigits)) {
      score += 5000;
    } else if (elDigits.includes(qDigits) || (qCleanZero.length > 0 && elCleanZero.includes(qCleanZero)) || paddedEl7.includes(qDigits)) {
      score += 3000;
    }
  } else if (elNum.includes(q)) {
    score += 3000;
  }

  // 3. 구역 (Area) - Rank 3
  const rawArea = stripWhitespace(rec.area);
  const cleanArea = stripWhitespace(cleanAreaName(rec.area));
  if (cleanArea === q || rawArea === q) {
    score += 2500;
  } else if (cleanArea.includes(q) || rawArea.includes(q)) {
    score += 1800;
  }

  // 4. 승강기모델 / 모델명 (Elevator model, model name) - Rank 4
  const rawModel = stripWhitespace(rec.model);
  const normalizedModel = rawModel.replace(/[\-_]/g, '');
  const qModel = q.replace(/[\-_]/g, '');

  if (normalizedModel.length > 0 && qModel.length > 0) {
    if (normalizedModel === qModel) {
      score += 2000;
    } else if (normalizedModel.startsWith(qModel)) {
      score += 1400;
    } else if (normalizedModel.includes(qModel)) {
      score += 1000;
    }
  }

  // 5. 주소 (Address) - Rank 5
  const addr = stripWhitespace(rec.address);
  if (addr.includes(q)) {
    score += 500;
  }

  // 6. 기타 (검사구분, 검사결과, 지적내용, 담당자기능) - Rank 6
  const inspType = stripWhitespace(rec.inspectionType);
  if (inspType.includes(q)) {
    score += 400;
  }

  const inspResult = stripWhitespace(rec.inspectionResult);
  if (inspResult.includes(q)) {
    score += 300;
  }

  const remarks = stripWhitespace(rec.conditionRemarks);
  if (remarks.includes(q)) {
    score += 200;
  }

  const mfg = stripWhitespace(rec.manufacturer);
  if (mfg.includes(q)) {
    score += 150;
  }

  const tech = stripWhitespace(rec.technicianPrimary);
  if (tech.includes(q)) {
    score += 150;
  }

  return score;
}

/**
 * Filter and sort records by relevance priority
 */
export function filterAndRankElevatorRecords(records: ElevatorRecord[], query: string): ElevatorRecord[] {
  if (!query || !query.trim()) return records;

  const scored: { rec: ElevatorRecord; score: number }[] = [];

  for (const rec of records) {
    const s = scoreElevatorRecord(rec, query);
    if (s > 0) {
      scored.push({ rec, score: s });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-breaker: records with conditional remarks or deadlines first
    const aHasRemarks = (a.rec.conditionRemarks || '').length > 0 ? 1 : 0;
    const bHasRemarks = (b.rec.conditionRemarks || '').length > 0 ? 1 : 0;
    if (bHasRemarks !== aHasRemarks) return bHasRemarks - aHasRemarks;
    return (a.rec.siteName || '').localeCompare(b.rec.siteName || '');
  });

  return scored.map((item) => item.rec);
}

