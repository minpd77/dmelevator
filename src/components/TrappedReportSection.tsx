import React, { useEffect, useMemo, useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQkPXudgO_znrjg8-ZyoSmMb5dhrISbANstWt3xNanbbTNCNRhDwAQgxhrECxwN8R2QSV8lTgln6_9P/pub?gid=1374895459&single=true&output=tsv';

// GitHub Pages에서는 저장소 경로가 붙으므로 반드시 BASE_URL을 사용합니다.
const PDF_TEMPLATE = `${import.meta.env.BASE_URL}report-template.pdf`;

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/fonts-archive/NotoSansKR/NotoSansKR-Regular.otf';

interface SheetRow {
  site: string;
  address: string;
  elevator: string;
}

interface Props {
  onBack: () => void;
}

interface ReportEntry {
  id: number;
  hour: string;
  minute: string;
  content: string;
}

const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구',
  '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구',
  '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구',
  '은평구', '종로구', '중구', '중랑구'
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR - 5 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

function pad2(value: number | string) {
  return String(value).padStart(2, '0');
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function normalizeAddress(value: string): string {
  let address = String(value || '').replace(/\s+/g, ' ').trim();
  if (!address) return '';

  if (address.startsWith('서울특별시')) return address;

  if (
    address.startsWith('서울시 ') ||
    address === '서울시' ||
    address.startsWith('서울 ')
  ) {
    address = address
      .replace(/^서울시\s*/, '')
      .replace(/^서울\s*/, '')
      .trim();
    return `서울특별시 ${address}`;
  }

  for (const district of SEOUL_DISTRICTS) {
    if (address === district || address.startsWith(`${district} `)) {
      return `서울특별시 ${address}`;
    }
  }

  return address;
}

function cleanSiteName(value: string): string {
  return String(value || '')
    .replace(/\s*\(\s*LH\s*\)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatElevatorNo(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  const match = String(value || '').match(/^(\d{4})-(\d{3})$/);
  if (match) return `${match[1]}-${match[2]}`;
  return String(value || '').trim();
}

function normalizeElevator(value: string): string {
  return String(value || '').replace(/\D/g, '').padStart(7, '0');
}

function normalizeText(value: string): string {
  return String(value || '').toLowerCase().replace(/\s+/g, '').trim();
}

function parseTSV(text: string): string[][] {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => line.split('\t'));
}

function whiteRect(page: any, x: number, y: number, width: number, height: number) {
  page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1) });
}

function drawText(page: any, text: string, x: number, y: number, size: number, font: any) {
  if (!text) return;
  page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const result: string[] = [];

  for (const paragraph of String(text || '').split('\n')) {
    if (!paragraph) {
      result.push('');
      continue;
    }

    let line = '';
    for (const char of paragraph) {
      const test = line + char;
      const width = font.widthOfTextAtSize(test, size);
      if (width > maxWidth && line) {
        result.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
  }

  return result;
}

function formatPhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function formatOccurredDateTime(
  year: string,
  month: string,
  day: string,
  hour: string,
  minute: string
) {
  if (!year || !month || !day || !hour || !minute) return '';
  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${pad2(hour)}:${pad2(minute)} 경`;
}

function drawReportEntries(page: any, entries: ReportEntry[], font: any) {
  const timeX = 128;
  const contentX = 190;
  const startY = 430;
  const fontSize = 10;
  const lineHeight = 16;
  const rowGap = 4;
  const contentWidth = 345;
  const bottomY = 295;

  let y = startY;

  for (const entry of entries) {
    if (y < bottomY) break;

    const time = entry.hour && entry.minute
      ? `${pad2(entry.hour)}:${pad2(entry.minute)}`
      : '';

    drawText(page, time, timeX, y, fontSize, font);

    const lines = wrapText(entry.content, font, fontSize, contentWidth);
    if (lines.length === 0) {
      y -= lineHeight + rowGap;
      continue;
    }

    for (const line of lines) {
      if (y < bottomY) break;
      drawText(page, line, contentX, y, fontSize, font);
      y -= lineHeight;
    }

    y -= rowGap;
  }
}

function drawCauseAndAction(
  page: any,
  cause: string,
  action: string,
  font: any
) {
  const labelX = 128;
  const valueX = 165;
  const size = 10;
  const lineHeight = 16;
  const width = 385;

  let y = 255;

  drawText(page, '원인', labelX, y, size, font);
  const causeLines = wrapText(cause, font, size, width);
  for (const line of causeLines) {
    if (y < 185) break;
    drawText(page, line, valueX, y, size, font);
    y -= lineHeight;
  }

  y -= 8;
  drawText(page, '조치', labelX, y, size, font);
  const actionLines = wrapText(action, font, size, width);
  for (const line of actionLines) {
    if (y < 105) break;
    drawText(page, line, valueX, y, size, font);
    y -= lineHeight;
  }
}

export function TrappedReportSection({ onBack }: Props) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(true);
  const [sheetError, setSheetError] = useState('');

  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [siteName, setSiteName] = useState('');
  const [address, setAddress] = useState('');
  const [elevatorNo, setElevatorNo] = useState('');

  const [occurredYear, setOccurredYear] = useState('');
  const [occurredMonth, setOccurredMonth] = useState('');
  const [occurredDay, setOccurredDay] = useState('');
  const [occurredHour, setOccurredHour] = useState('');
  const [occurredMinute, setOccurredMinute] = useState('');

  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([
    { id: 1, hour: '', minute: '', content: '' }
  ]);
  const [nextEntryId, setNextEntryId] = useState(2);

  const [cause, setCause] = useState('');
  const [action, setAction] = useState('');
  const [writer, setWriter] = useState('');

  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSheet() {
      setLoadingSheet(true);
      setSheetError('');

      try {
        const response = await fetch(`${SHEET_URL}&t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('스프레드시트 응답 오류');

        const text = await response.text();
        const parsed = parseTSV(text);
        const converted = parsed
          .map(row => ({
            site: cleanSiteName(row[0] || ''),
            address: normalizeAddress(row[2] || ''),
            elevator: formatElevatorNo(row[3] || '')
          }))
          .filter(row => row.site || row.address || row.elevator);

        if (!cancelled) setRows(converted);
      } catch (error: any) {
        console.error(error);
        if (!cancelled) {
          setSheetError(error?.message || '스프레드시트를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoadingSheet(false);
      }
    }

    loadSheet();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!occurredYear || !occurredMonth) return;
    const maxDay = daysInMonth(Number(occurredYear), Number(occurredMonth));
    if (occurredDay && Number(occurredDay) > maxDay) {
      setOccurredDay(String(maxDay));
    }
  }, [occurredYear, occurredMonth, occurredDay]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const siteOptions = useMemo(
    () => Array.from(new Set(rows.map(row => row.site).filter(Boolean))),
    [rows]
  );
  const addressOptions = useMemo(
    () => Array.from(new Set(rows.map(row => row.address).filter(Boolean))),
    [rows]
  );
  const elevatorOptions = useMemo(
    () => Array.from(new Set(rows.map(row => row.elevator).filter(Boolean))),
    [rows]
  );

  const dayOptions = useMemo(() => {
    if (!occurredYear || !occurredMonth) {
      return Array.from({ length: 31 }, (_, i) => i + 1);
    }
    return Array.from(
      { length: daysInMonth(Number(occurredYear), Number(occurredMonth)) },
      (_, i) => i + 1
    );
  }, [occurredYear, occurredMonth]);

  function findRow(type: 'site' | 'address' | 'elevator', value: string): SheetRow | null {
    if (!value.trim()) return null;

    if (type === 'elevator') {
      const target = normalizeElevator(value);
      return rows.find(row => normalizeElevator(row.elevator) === target) || null;
    }

    if (type === 'site') {
      const target = normalizeText(value);
      return rows.find(row => normalizeText(row.site) === target) || null;
    }

    const target = normalizeText(normalizeAddress(value));
    return rows.find(row => normalizeText(row.address) === target) || null;
  }

  function applyRow(row: SheetRow) {
    setSiteName(row.site);
    setAddress(row.address);
    setElevatorNo(row.elevator);
  }

  function handleSiteChange(value: string) {
    setSiteName(value);
    const found = findRow('site', value);
    if (found) applyRow(found);
  }

  function handleAddressChange(value: string) {
    setAddress(value);
    const found = findRow('address', value);
    if (found) applyRow(found);
  }

  function handleElevatorChange(value: string) {
    const formatted = formatElevatorNo(value);
    setElevatorNo(formatted);
    const found = findRow('elevator', formatted);
    if (found) applyRow(found);
  }

  function updateEntry(id: number, field: 'hour' | 'minute' | 'content', value: string) {
    setReportEntries(current =>
      current.map(entry => entry.id === id ? { ...entry, [field]: value } : entry)
    );
  }

  function addEntry() {
    const id = nextEntryId;
    setReportEntries(current => [...current, { id, hour: '', minute: '', content: '' }]);
    setNextEntryId(current => current + 1);
  }

  function removeEntry(id: number) {
    setReportEntries(current => {
      if (current.length === 1) return current;
      return current.filter(entry => entry.id !== id);
    });
  }

  async function createPDF(): Promise<Uint8Array> {
    const response = await fetch(`${PDF_TEMPLATE}?v=${Date.now()}`);
    if (!response.ok) {
      throw new Error('public/report-template.pdf 파일을 찾을 수 없습니다.');
    }

    const templateBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);

    const fontResponse = await fetch(FONT_URL);
    if (!fontResponse.ok) throw new Error('한글 폰트를 불러오지 못했습니다.');
    const fontBytes = await fontResponse.arrayBuffer();
    const font = await pdfDoc.embedFont(fontBytes, { subset: true });

    const page = pdfDoc.getPages()[0];

    // 원본 PDF의 기존 파란 입력값만 지웁니다. 제목/표/안내 문구는 그대로 유지합니다.
    whiteRect(page, 120, 600, 165, 25); // 신고자 성명
    whiteRect(page, 280, 600, 280, 25); // 연락처
    whiteRect(page, 120, 555, 190, 28); // 현장명
    whiteRect(page, 280, 555, 290, 28); // 주소
    whiteRect(page, 120, 510, 180, 28); // 승강기 번호
    whiteRect(page, 330, 505, 235, 35); // 발생일시
    whiteRect(page, 120, 285, 440, 170); // 신고내용 본문
    whiteRect(page, 120, 90, 440, 190); // 원인/조치 본문
    whiteRect(page, 320, 700, 100, 45); // 작성자 입력칸

    drawText(page, reporterName, 128, 604, 11, font);
    drawText(page, formatPhone(reporterPhone), 282, 604, 11, font);
    drawText(page, siteName, 128, 560, 11, font);
    drawText(page, address, 282, 560, 10, font);
    drawText(page, formatElevatorNo(elevatorNo), 128, 515, 11, font);
    drawText(
      page,
      formatOccurredDateTime(
        occurredYear,
        occurredMonth,
        occurredDay,
        occurredHour,
        occurredMinute
      ),
      300,
      515,
      10,
      font
    );

    drawReportEntries(page, reportEntries, font);
    drawCauseAndAction(page, cause, action, font);
    drawText(page, writer, 325, 710, 11, font);

    return await pdfDoc.save();
  }

  async function handleDownload() {
    setGenerating(true);
    try {
      const bytes = await createPDF();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const fileName =
        `${safeFileName(siteName) || '승객갇힘'}_${safeFileName(elevatorNo) || '보고서'}_승객갇힘보고서.pdf`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePreview() {
    setGenerating(true);
    try {
      const bytes = await createPDF();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(oldUrl => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return url;
      });
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'PDF 미리보기 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  }

  function resetForm() {
    setReporterName('');
    setReporterPhone('');
    setSiteName('');
    setAddress('');
    setElevatorNo('');
    setOccurredYear('');
    setOccurredMonth('');
    setOccurredDay('');
    setOccurredHour('');
    setOccurredMinute('');
    setReportEntries([{ id: 1, hour: '', minute: '', content: '' }]);
    setNextEntryId(2);
    setCause('');
    setAction('');
    setWriter('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">승객갇힘 보고서 작성</h1>
          <p className="text-sm text-slate-400 mt-2">
            승강기 번호 또는 현장 정보를 입력하면 스프레드시트에서 현장 정보를 자동으로 불러옵니다.
          </p>
        </div>
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition">
          ← 홈으로
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        {loadingSheet ? (
          <div className="text-sm text-slate-400">스프레드시트 정보를 불러오는 중...</div>
        ) : sheetError ? (
          <div className="text-sm text-red-400">스프레드시트 오류 : {sheetError}</div>
        ) : (
          <div className="text-sm text-emerald-400">✓ 현장정보 DB 연결 완료 ({rows.length.toLocaleString()}건)</div>
        )}
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-bold mb-5">① 신고자</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="성명" value={reporterName} onChange={setReporterName} placeholder="신고자 성명" />
          <Field
            label="연락처"
            value={reporterPhone}
            onChange={value => setReporterPhone(formatPhone(value))}
            placeholder="010-0000-0000"
            inputMode="numeric"
            maxLength={13}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">01000000000 또는 010-0000-0000 입력 → 010-0000-0000 형식으로 자동 정리</p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-bold mb-5">② 신고 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AutocompleteField label="현장명" listId="site-options" options={siteOptions} value={siteName} onChange={handleSiteChange} placeholder="현장명을 입력하거나 선택" />
          <AutocompleteField label="소재지" listId="address-options" options={addressOptions} value={address} onChange={handleAddressChange} placeholder="주소" />
          <AutocompleteField label="승강기 번호" listId="elevator-options" options={elevatorOptions} value={elevatorNo} onChange={handleElevatorChange} placeholder="0000-000" />

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2">발생 일시</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <SelectField value={occurredYear} onChange={setOccurredYear} placeholder="연도" options={YEAR_OPTIONS.map(v => ({ value: String(v), label: `${v}년` }))} />
              <SelectField value={occurredMonth} onChange={setOccurredMonth} placeholder="월" options={MONTH_OPTIONS.map(v => ({ value: String(v), label: `${v}월` }))} />
              <SelectField value={occurredDay} onChange={setOccurredDay} placeholder="일" options={dayOptions.map(v => ({ value: String(v), label: `${v}일` }))} />
              <SelectField value={occurredHour} onChange={setOccurredHour} placeholder="시" options={HOUR_OPTIONS.map(v => ({ value: String(v), label: `${pad2(v)}시` }))} />
              <SelectField value={occurredMinute} onChange={setOccurredMinute} placeholder="분" options={MINUTE_OPTIONS.map(v => ({ value: String(v), label: `${pad2(v)}분` }))} />
            </div>
            <p className="text-xs text-slate-500 mt-2">시간은 00~23시 24시간제로 선택합니다.</p>
          </div>
        </div>

      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold">③ 신고내용</h2>
            <p className="text-xs text-slate-500 mt-1">시간을 여러 개 추가하여 시간별 상황을 입력할 수 있습니다. 시간은 24시간제입니다.</p>
          </div>
          <button type="button" onClick={addEntry} className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold">＋ 시간 추가</button>
        </div>

        <div className="space-y-4">
          {reportEntries.map((entry, index) => (
            <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">내용 {index + 1}</span>
                {reportEntries.length > 1 && (
                  <button type="button" onClick={() => removeEntry(entry.id)} className="text-xs text-red-400 hover:text-red-300">삭제</button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-[110px_110px_1fr] gap-2">
                <SelectField value={entry.hour} onChange={value => updateEntry(entry.id, 'hour', value)} placeholder="시" options={HOUR_OPTIONS.map(v => ({ value: String(v), label: `${pad2(v)}시` }))} />
                <SelectField value={entry.minute} onChange={value => updateEntry(entry.id, 'minute', value)} placeholder="분" options={MINUTE_OPTIONS.map(v => ({ value: String(v), label: `${pad2(v)}분` }))} />
                <textarea
                  value={entry.content}
                  onChange={e => updateEntry(entry.id, 'content', e.target.value)}
                  rows={3}
                  className="sm:col-span-1 col-span-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500 resize-y"
                  placeholder="해당 시간의 신고내용을 입력하세요."
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-bold mb-5">④ 원인 및 조치내용</h2>
        <div className="grid grid-cols-1 gap-4">
          <FieldTextarea label="원인" value={cause} onChange={setCause} rows={4} placeholder="원인을 입력하세요." />
          <FieldTextarea label="조치" value={action} onChange={setAction} rows={4} placeholder="조치내용을 입력하세요." />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-bold mb-5">⑤ 작성자</h2>
        <Field label="작성자" value={writer} onChange={setWriter} placeholder="작성자 이름" />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={generating} onClick={handlePreview} className="rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-5 py-3 font-semibold text-sm">
            {generating ? '처리 중...' : 'PDF 미리보기'}
          </button>
          <button type="button" disabled={generating} onClick={handleDownload} className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-3 font-semibold text-sm">
            {generating ? 'PDF 생성 중...' : 'PDF 보고서 다운로드'}
          </button>
          <button type="button" onClick={resetForm} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-5 py-3 font-semibold text-sm">입력 초기화</button>
        </div>
      </section>

      {previewUrl && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <iframe src={previewUrl} title="PDF 미리보기" className="w-full h-[800px] rounded-xl bg-white" />
        </section>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}

function Field({ label, value, onChange, placeholder, type = 'text', inputMode, maxLength }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

function SelectField({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: SelectOption[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500">
      <option value="">{placeholder}</option>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function AutocompleteField({ label, listId, options, value, onChange, placeholder }: { label: string; listId: string; options: string[]; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <input
        list={listId}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500"
        placeholder={placeholder}
      />
      <datalist id={listId}>{options.map(option => <option key={option} value={option} />)}</datalist>
    </div>
  );
}

function FieldTextarea({ label, value, onChange, rows, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows: number; placeholder: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-blue-500 resize-y"
        placeholder={placeholder}
      />
    </div>
  );
}

function safeFileName(value: string): string {
  return String(value || '').replace(/[\\/:*?"<>|]/g, '_').trim();
}
