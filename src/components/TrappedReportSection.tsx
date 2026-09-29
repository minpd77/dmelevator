import React, { useEffect, useMemo, useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQkPXudgO_znrjg8-ZyoSmMb5dhrISbANstWt3xNanbbTNCNRhDwAQgxhrECxwN8R2QSV8lTgln6_9P/pub?gid=1374895459&single=true&output=tsv';

const PDF_TEMPLATE = `${import.meta.env.BASE_URL}report-template.pdf`;

/*
 * 한글 폰트
 *
 * 가장 안정적인 방법:
 * public/fonts/NotoSansKR-Regular.otf 를 넣고 아래 FONT_URL을
 * `${import.meta.env.BASE_URL}fonts/NotoSansKR-Regular.otf`
 * 로 사용하세요.
 *
 * 우선 공식 Noto CJK 배포본의 한글 Regular 폰트를 사용합니다.
 */
const FONT_URL =
  `${import.meta.env.BASE_URL}fonts/NotoSansKR-Regular.otf`;

interface Props {
  onBack: () => void;
}

interface SheetRow {
  site: string;
  address: string;
  elevator: string;
}

interface ReportEntry {
  id: number;
  hour: string;
  minute: string;
  content: string;
}

/* =========================================================
 * PDF 좌표
 * =========================================================
 *
 * PDF 기준 좌표입니다.
 * 글씨 크기는 요청대로 기존 10pt → 12pt로 변경했습니다.
 *
 * 승강기번호는 셀의 왼쪽 시작점에 맞췄습니다.
 * ========================================================= */

const PDF_POS = {
  reporterName: {
    x: 123,
    y: 600,
    size: 12,
  },

  reporterPhone: {
    x: 335,
    y: 600,
    size: 12,
  },

  siteName: {
    x: 123,
    y: 580,
    size: 12,
  },

  address: {
    x: 335,
    y: 580,
    size: 12,
  },

  // ★ 승강기 번호 왼쪽 정렬
  elevatorNo: {
    x: 123,
    y: 532,
    size: 12,
  },

  occurredYear: {
    x: 335,
    y: 532,
    size: 12,
  },

  occurredMonth: {
    x: 370,
    y: 532,
    size: 12,
  },

  occurredDay: {
    x: 405,
    y: 532,
    size: 12,
  },

  occurredHour: {
    x: 455,
    y: 532,
    size: 12,
  },

  occurredMinute: {
    x: 490,
    y: 532,
    size: 12,
  },

  reportTime: {
    x: 123,
    y: 485,
    size: 12,
  },

  reportContent: {
    x: 160,
    y: 485,
    size: 12,
  },

  causeLabel: {
    x: 123,
    y: 305,
    size: 12,
  },

  cause: {
    x: 123,
    y: 287,
    size: 12,
  },

  actionLabel: {
    x: 123,
    y: 235,
    size: 12,
  },

  action: {
    x: 123,
    y: 217,
    size: 12,
  },
} as const;

/* =========================================================
 * 공통 함수
 * ========================================================= */

function pad2(value: string | number) {
  return String(value).padStart(2, '0');
}

function cleanSiteName(value: string) {
  return String(value || '')
    .replace(/\s*\(\s*LH\s*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAddress(value: string) {
  let address = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!address) return '';

  if (address.startsWith('서울특별시')) {
    return address;
  }

  if (address.startsWith('서울시 ') || address.startsWith('서울 ')) {
    return `서울특별시 ${address
      .replace(/^서울시\s*/, '')
      .replace(/^서울\s*/, '')
      .trim()}`;
  }

  const districts = [
    '강남구', '강동구', '강북구', '강서구', '관악구',
    '광진구', '구로구', '금천구', '노원구', '도봉구',
    '동대문구', '동작구', '마포구', '서대문구', '서초구',
    '성동구', '성북구', '송파구', '양천구', '영등포구',
    '용산구', '은평구', '종로구', '중구', '중랑구',
  ];

  if (
    districts.some(
      district =>
        address === district || address.startsWith(`${district} `)
    )
  ) {
    return `서울특별시 ${address}`;
  }

  return address;
}

function formatElevatorNo(value: string) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 7) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return value;
}

function normalizeElevator(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? digits.padStart(7, '0') : '';
}

function normalizeText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

function formatPhone(value: string) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function parseTSV(text: string): string[][] {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.split('\t'));
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function wrapText(
  text: string,
  font: any,
  size: number,
  maxWidth: number
) {
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

function drawText(
  page: any,
  text: string,
  x: number,
  y: number,
  size: number,
  font: any
) {
  if (!text) return;

  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

/* =========================================================
 * 신고내용
 * ========================================================= */

function drawReportEntries(
  page: any,
  entries: ReportEntry[],
  font: any
) {
  let y = PDF_POS.reportTime.y;

  const timeX = PDF_POS.reportTime.x;
  const contentX = PDF_POS.reportContent.x;
  const size = 12;

  // 12pt에 맞춰 줄 간격도 증가
  const lineHeight = 16;
  const maxWidth = 350;

  for (const entry of entries) {
    if (y < 300) break;

    const time =
      entry.hour && entry.minute
        ? `${pad2(entry.hour)}:${pad2(entry.minute)}`
        : '';

    drawText(page, time, timeX, y, size, font);

    const lines = wrapText(
      entry.content,
      font,
      size,
      maxWidth
    );

    for (const line of lines) {
      if (y < 300) break;

      drawText(
        page,
        line,
        contentX,
        y,
        size,
        font
      );

      y -= lineHeight;
    }

    y -= 5;
  }
}

/* =========================================================
 * 원인 / 조치
 * ========================================================= */

function drawCauseAndAction(
  page: any,
  cause: string,
  action: string,
  font: any
) {
  const size = 12;

  drawText(
    page,
    '원인',
    PDF_POS.causeLabel.x,
    PDF_POS.causeLabel.y,
    12,
    font
  );

  let causeY = PDF_POS.cause.y;

  const causeLines = wrapText(
    cause,
    font,
    size,
    350
  );

  for (const line of causeLines) {
    if (causeY < 245) break;

    drawText(
      page,
      line,
      PDF_POS.cause.x,
      causeY,
      size,
      font
    );

    causeY -= 16;
  }

  drawText(
    page,
    '조치',
    PDF_POS.actionLabel.x,
    PDF_POS.actionLabel.y,
    12,
    font
  );

  let actionY = PDF_POS.action.y;

  const actionLines = wrapText(
    action,
    font,
    size,
    350
  );

  for (const line of actionLines) {
    if (actionY < 110) break;

    drawText(
      page,
      line,
      PDF_POS.action.x,
      actionY,
      size,
      font
    );

    actionY -= 16;
  }
}

/* =========================================================
 * 메인
 * ========================================================= */

export function TrappedReportSection({ onBack }: Props) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(true);
  const [sheetError, setSheetError] = useState('');

  // ① 신고자
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

  // ② 신고 현황
  const [siteName, setSiteName] = useState('');
  const [address, setAddress] = useState('');
  const [elevatorNo, setElevatorNo] = useState('');

  const [activeField, setActiveField] = useState<
    'site' | 'address' | 'elevator' | null
  >(null);

  // 발생일시
  const now = new Date();

  const [occurredYear, setOccurredYear] = useState(
    String(now.getFullYear())
  );
  const [occurredMonth, setOccurredMonth] = useState(
    String(now.getMonth() + 1)
  );
  const [occurredDay, setOccurredDay] = useState(
    String(now.getDate())
  );
  const [occurredHour, setOccurredHour] = useState('');
  const [occurredMinute, setOccurredMinute] = useState('');

  // ③ 신고내용
  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([
    {
      id: 1,
      hour: '',
      minute: '',
      content: '',
    },
  ]);

  const [nextId, setNextId] = useState(2);

  // ④ 원인
  const [cause, setCause] = useState('');

  // ⑤ 조치
  const [action, setAction] = useState('');

  // PDF
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  /* =====================================================
   * DB
   * ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `${SHEET_URL}&t=${Date.now()}`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          throw new Error(
            '스프레드시트를 불러오지 못했습니다.'
          );
        }

        const text = await response.text();
        const parsed = parseTSV(text);

        const data = parsed
          .map(row => ({
            site: cleanSiteName(row[0] || ''),
            address: normalizeAddress(row[2] || ''),
            elevator: formatElevatorNo(row[3] || ''),
          }))
          .filter(
            row =>
              row.site ||
              row.address ||
              row.elevator
          );

        if (!cancelled) setRows(data);
      } catch (error: any) {
        if (!cancelled) {
          setSheetError(
            error?.message || 'DB 연결 오류'
          );
        }
      } finally {
        if (!cancelled) setLoadingSheet(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const siteOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows.map(row => row.site).filter(Boolean)
        )
      ),
    [rows]
  );

  const addressOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows.map(row => row.address).filter(Boolean)
        )
      ),
    [rows]
  );

  const elevatorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows.map(row => row.elevator).filter(Boolean)
        )
      ),
    [rows]
  );

  function findRow(
    type: 'site' | 'address' | 'elevator',
    value: string
  ) {
    if (!value.trim()) return null;

    if (type === 'elevator') {
      const target = normalizeElevator(value);

      return (
        rows.find(
          row =>
            normalizeElevator(row.elevator) === target
        ) || null
      );
    }

    if (type === 'site') {
      const target = normalizeText(value);

      return (
        rows.find(
          row =>
            normalizeText(row.site) === target
        ) || null
      );
    }

    const target = normalizeText(
      normalizeAddress(value)
    );

    return (
      rows.find(
        row =>
          normalizeText(row.address) === target
      ) || null
    );
  }

  function applyRow(row: SheetRow) {
    setSiteName(row.site);
    setAddress(row.address);
    setElevatorNo(row.elevator);
    setActiveField(null);
  }

  function filterOptions(
    type: 'site' | 'address' | 'elevator',
    value: string
  ) {
    let source: string[] = [];

    if (type === 'site') source = siteOptions;
    if (type === 'address') source = addressOptions;
    if (type === 'elevator') source = elevatorOptions;

    const query =
      type === 'elevator'
        ? value.replace(/\D/g, '')
        : normalizeText(value);

    if (!query) return source.slice(0, 8);

    return source
      .filter(option => {
        const normalized =
          type === 'elevator'
            ? option.replace(/\D/g, '')
            : normalizeText(option);

        return normalized.includes(query);
      })
      .slice(0, 8);
  }

  /* =====================================================
   * 신고내용
   * ===================================================== */

  function updateEntry(
    id: number,
    field: 'hour' | 'minute' | 'content',
    value: string
  ) {
    setReportEntries(current =>
      current.map(entry =>
        entry.id === id
          ? { ...entry, [field]: value }
          : entry
      )
    );
  }

  function addEntry() {
    setReportEntries(current => [
      ...current,
      {
        id: nextId,
        hour: '',
        minute: '',
        content: '',
      },
    ]);

    setNextId(value => value + 1);
  }

  function removeEntry(id: number) {
    setReportEntries(current => {
      if (current.length <= 1) return current;

      return current.filter(
        entry => entry.id !== id
      );
    });
  }

  /* =====================================================
   * PDF 생성
   * ===================================================== */

  async function createPDF() {
    const response = await fetch(
      `${PDF_TEMPLATE}?v=${Date.now()}`
    );

    if (!response.ok) {
      throw new Error(
        'public/report-template.pdf 파일을 찾을 수 없습니다.'
      );
    }

    const bytes = await response.arrayBuffer();

    const pdfDoc = await PDFDocument.load(bytes);

    pdfDoc.registerFontkit(fontkit);

    const fontResponse = await fetch(
      `${FONT_URL}?v=1`
    );

    if (!fontResponse.ok) {
      throw new Error(
        '한글 폰트를 불러오지 못했습니다. public/fonts/NotoSansKR-Regular.otf 파일이 있는지 확인하세요.'
      );
    }

    const fontBytes =
      await fontResponse.arrayBuffer();

    /*
     * ★ 한글 PDF 핵심
     *
     * custom font를 embedFont에 넣고
     * 모든 drawText에 이 font를 사용합니다.
     *
     * subset은 false로 둡니다.
     * 한글 글리프 누락 문제를 피하기 위해
     * 폰트 전체를 임베드합니다.
     */
    const font = await pdfDoc.embedFont(
      fontBytes,
      {
        subset: false,
      }
    );

    const page = pdfDoc.getPages()[0];

    // ① 신고자
    drawText(
      page,
      reporterName,
      PDF_POS.reporterName.x,
      PDF_POS.reporterName.y,
      PDF_POS.reporterName.size,
      font
    );

    drawText(
      page,
      formatPhone(reporterPhone),
      PDF_POS.reporterPhone.x,
      PDF_POS.reporterPhone.y,
      PDF_POS.reporterPhone.size,
      font
    );

    // ② 신고 현황
    drawText(
      page,
      siteName,
      PDF_POS.siteName.x,
      PDF_POS.siteName.y,
      PDF_POS.siteName.size,
      font
    );

    drawText(
      page,
      address,
      PDF_POS.address.x,
      PDF_POS.address.y,
      PDF_POS.address.size,
      font
    );

    // ★ 승강기번호 왼쪽 정렬
    drawText(
      page,
      formatElevatorNo(elevatorNo),
      PDF_POS.elevatorNo.x,
      PDF_POS.elevatorNo.y,
      PDF_POS.elevatorNo.size,
      font
    );

    // 발생일시
    drawText(
      page,
      occurredYear ? `${occurredYear}년` : '',
      PDF_POS.occurredYear.x,
      PDF_POS.occurredYear.y,
      PDF_POS.occurredYear.size,
      font
    );

    drawText(
      page,
      occurredMonth ? `${occurredMonth}월` : '',
      PDF_POS.occurredMonth.x,
      PDF_POS.occurredMonth.y,
      PDF_POS.occurredMonth.size,
      font
    );

    drawText(
      page,
      occurredDay ? `${occurredDay}일` : '',
      PDF_POS.occurredDay.x,
      PDF_POS.occurredDay.y,
      PDF_POS.occurredDay.size,
      font
    );

    drawText(
      page,
      occurredHour
        ? `${pad2(occurredHour)}시`
        : '',
      PDF_POS.occurredHour.x,
      PDF_POS.occurredHour.y,
      PDF_POS.occurredHour.size,
      font
    );

    drawText(
      page,
      occurredMinute
        ? `${pad2(occurredMinute)}분`
        : '',
      PDF_POS.occurredMinute.x,
      PDF_POS.occurredMinute.y,
      PDF_POS.occurredMinute.size,
      font
    );

    // ③ 신고내용
    drawReportEntries(
      page,
      reportEntries,
      font
    );

    // ④ 원인 / ⑤ 조치
    drawCauseAndAction(
      page,
      cause,
      action,
      font
    );

    return await pdfDoc.save();
  }

  async function handlePreview() {
    setGenerating(true);

    try {
      const bytes = await createPDF();

      const blob = new Blob(
        [bytes],
        { type: 'application/pdf' }
      );

      const url =
        URL.createObjectURL(blob);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(url);
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
        'PDF 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    setGenerating(true);

    try {
      const bytes = await createPDF();

      const blob = new Blob(
        [bytes],
        { type: 'application/pdf' }
      );

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement('a');

      a.href = url;

      a.download =
        `${siteName || '승객갇힘'}_승객갇힘보고서.pdf`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      setTimeout(
        () => URL.revokeObjectURL(url),
        1000
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
        'PDF 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setGenerating(false);
    }
  }

  /* =====================================================
   * 화면
   * ===================================================== */

  return (
    <div className="w-full space-y-6">

      <div className="
        flex flex-col sm:flex-row
        sm:items-center sm:justify-between
        gap-4
      ">
        <div>
          <h1 className="
            text-2xl sm:text-3xl
            font-bold text-white
          ">
            승객갇힘 보고서 작성
          </h1>

          <p className="
            text-sm text-slate-400 mt-2
          ">
            현장명, 소재지 또는 승강기 번호를 입력하면
            바로 아래에 검색 결과가 표시됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="
            px-4 py-2 rounded-lg
            bg-slate-800 hover:bg-slate-700
            text-sm font-semibold
          "
        >
          ← 홈으로
        </button>
      </div>

      <div className="
        rounded-xl border border-slate-800
        bg-slate-900 p-4
      ">
        {loadingSheet ? (
          <div className="text-sm text-slate-400">
            현장정보를 불러오는 중...
          </div>
        ) : sheetError ? (
          <div className="text-sm text-red-400">
            {sheetError}
          </div>
        ) : (
          <div className="text-sm text-emerald-400">
            ✓ 현장정보 DB 연결 완료
            {' '}
            ({rows.length.toLocaleString()}건)
          </div>
        )}
      </div>

      {/* ① 신고자 / ② 신고 현황 */}
      <div className="
        grid grid-cols-1 lg:grid-cols-2
        gap-6
      ">

        {/* ① 신고자 */}
        <section className="
          rounded-2xl border border-slate-800
          bg-slate-900 p-5 sm:p-6
        ">
          <h2 className="
            text-lg font-bold mb-5
          ">
            ① 신고자
          </h2>

          <div className="space-y-4">
            <Field
              label="성명"
              value={reporterName}
              onChange={setReporterName}
              placeholder="신고자 성명"
            />

            <Field
              label="연락처"
              value={reporterPhone}
              onChange={value =>
                setReporterPhone(
                  formatPhone(value)
                )
              }
              placeholder="010-0000-0000"
              inputMode="numeric"
              maxLength={13}
            />
          </div>
        </section>

        {/* ② 신고 현황 */}
        <section className="
          rounded-2xl border border-slate-800
          bg-slate-900 p-5 sm:p-6
        ">
          <h2 className="
            text-lg font-bold mb-5
          ">
            ② 신고 현황
          </h2>

          <div className="space-y-4">

            <Autocomplete
              label="현장명"
              value={siteName}
              placeholder="현장명을 입력하세요"
              options={filterOptions('site', siteName)}
              active={activeField === 'site'}
              onFocus={() => setActiveField('site')}
              onChange={value => {
                setSiteName(value);

                const found =
                  findRow('site', value);

                if (found) applyRow(found);
              }}
              onSelect={value => {
                const found =
                  findRow('site', value);

                if (found) applyRow(found);
              }}
            />

            <Autocomplete
              label="소재지"
              value={address}
              placeholder="주소를 입력하세요"
              options={filterOptions('address', address)}
              active={activeField === 'address'}
              onFocus={() => setActiveField('address')}
              onChange={value => {
                const normalized =
                  normalizeAddress(value);

                setAddress(normalized);

                const found =
                  findRow('address', normalized);

                if (found) applyRow(found);
              }}
              onSelect={value => {
                const found =
                  findRow('address', value);

                if (found) applyRow(found);
              }}
            />

            <Autocomplete
              label="승강기 번호"
              value={elevatorNo}
              placeholder="0000-000"
              options={filterOptions('elevator', elevatorNo)}
              active={activeField === 'elevator'}
              onFocus={() => setActiveField('elevator')}
              onChange={value => {
                const formatted =
                  formatElevatorNo(value);

                setElevatorNo(formatted);

                const found =
                  findRow('elevator', formatted);

                if (found) applyRow(found);
              }}
              onSelect={value => {
                const found =
                  findRow('elevator', value);

                if (found) applyRow(found);
              }}
            />

            {/* 발생일시 */}
            <div>
              <label className="
                block text-sm font-semibold mb-2
              ">
                발생 일시
              </label>

              {/* 연월일 한 줄 */}
              <div className="
                grid grid-cols-3 gap-2
              ">
                <Select
                  value={occurredYear}
                  onChange={setOccurredYear}
                  placeholder="연도"
                  options={Array.from(
                    { length: 16 },
                    (_, i) =>
                      new Date().getFullYear() - 5 + i
                  ).map(value => ({
                    value: String(value),
                    label: `${value}년`,
                  }))}
                />

                <Select
                  value={occurredMonth}
                  onChange={setOccurredMonth}
                  placeholder="월"
                  options={Array.from(
                    { length: 12 },
                    (_, i) => i + 1
                  ).map(value => ({
                    value: String(value),
                    label: `${value}월`,
                  }))}
                />

                <Select
                  value={occurredDay}
                  onChange={setOccurredDay}
                  placeholder="일"
                  options={Array.from(
                    {
                      length:
                        occurredYear && occurredMonth
                          ? daysInMonth(
                              Number(occurredYear),
                              Number(occurredMonth)
                            )
                          : 31,
                    },
                    (_, i) => i + 1
                  ).map(value => ({
                    value: String(value),
                    label: `${value}일`,
                  }))}
                />
              </div>

              {/* 시간 한 줄 */}
              <div className="
                grid grid-cols-2 gap-2 mt-2
              ">
                <Select
                  value={occurredHour}
                  onChange={setOccurredHour}
                  placeholder="시"
                  options={Array.from(
                    { length: 24 },
                    (_, i) => i
                  ).map(value => ({
                    value: String(value),
                    label: `${pad2(value)}시`,
                  }))}
                />

                <Select
                  value={occurredMinute}
                  onChange={setOccurredMinute}
                  placeholder="분"
                  options={Array.from(
                    { length: 60 },
                    (_, i) => i
                  ).map(value => ({
                    value: String(value),
                    label: `${pad2(value)}분`,
                  }))}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ③ 신고내용 */}
      <section className="
        rounded-2xl border border-slate-800
        bg-slate-900 p-5 sm:p-6
      ">
        <div className="
          flex items-center justify-between mb-5
        ">
          <div>
            <h2 className="text-lg font-bold">
              ③ 신고내용
            </h2>

            <p className="
              text-xs text-slate-500 mt-1
            ">
              시간별로 내용을 추가할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={addEntry}
            className="
              rounded-lg bg-emerald-700
              hover:bg-emerald-600
              px-4 py-2 text-sm font-semibold
            "
          >
            ＋ 시간 추가
          </button>
        </div>

        <div className="space-y-4">
          {reportEntries.map((entry, index) => (
            <div
              key={entry.id}
              className="
                rounded-xl border border-slate-800
                bg-slate-950 p-4
              "
            >
              <div className="
                flex items-center justify-between mb-3
              ">
                <span className="
                  text-sm font-semibold
                ">
                  내용 {index + 1}
                </span>

                {reportEntries.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeEntry(entry.id)
                    }
                    className="
                      text-xs text-red-400
                    "
                  >
                    삭제
                  </button>
                )}
              </div>

              <div className="
                grid grid-cols-2
                sm:grid-cols-[110px_110px_1fr]
                gap-2
              ">
                <Select
                  value={entry.hour}
                  onChange={value =>
                    updateEntry(
                      entry.id,
                      'hour',
                      value
                    )
                  }
                  placeholder="시"
                  options={Array.from(
                    { length: 24 },
                    (_, i) => i
                  ).map(value => ({
                    value: String(value),
                    label: `${pad2(value)}시`,
                  }))}
                />

                <Select
                  value={entry.minute}
                  onChange={value =>
                    updateEntry(
                      entry.id,
                      'minute',
                      value
                    )
                  }
                  placeholder="분"
                  options={Array.from(
                    { length: 60 },
                    (_, i) => i
                  ).map(value => ({
                    value: String(value),
                    label: `${pad2(value)}분`,
                  }))}
                />

                <textarea
                  value={entry.content}
                  onChange={e =>
                    updateEntry(
                      entry.id,
                      'content',
                      e.target.value
                    )
                  }
                  rows={3}
                  placeholder="내용을 입력하세요."
                  className="
                    col-span-2 sm:col-span-1
                    w-full rounded-lg
                    border border-slate-700
                    bg-slate-950 px-3 py-3
                    text-sm outline-none
                    focus:border-blue-500
                    resize-y
                  "
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ④ 원인 */}
      <section className="
        rounded-2xl border border-slate-800
        bg-slate-900 p-5 sm:p-6
      ">
        <h2 className="
          text-lg font-bold mb-4
        ">
          ④ 원인
        </h2>

        <textarea
          value={cause}
          onChange={e =>
            setCause(e.target.value)
          }
          rows={6}
          placeholder="원인을 입력하세요."
          className="
            w-full rounded-lg
            border border-slate-700
            bg-slate-950 px-3 py-3
            text-sm outline-none
            focus:border-blue-500
            resize-y
          "
        />
      </section>

      {/* ⑤ 조치 */}
      <section className="
        rounded-2xl border border-slate-800
        bg-slate-900 p-5 sm:p-6
      ">
        <h2 className="
          text-lg font-bold mb-4
        ">
          ⑤ 조치
        </h2>

        <textarea
          value={action}
          onChange={e =>
            setAction(e.target.value)
          }
          rows={6}
          placeholder="조치내용을 입력하세요."
          className="
            w-full rounded-lg
            border border-slate-700
            bg-slate-950 px-3 py-3
            text-sm outline-none
            focus:border-blue-500
            resize-y
          "
        />
      </section>

      {/* 버튼 */}
      <section className="
        rounded-2xl border border-slate-800
        bg-slate-900 p-5
      ">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={generating}
            onClick={handlePreview}
            className="
              rounded-lg bg-slate-700
              hover:bg-slate-600
              px-5 py-3 font-semibold
            "
          >
            {generating
              ? '생성 중...'
              : 'PDF 미리보기'}
          </button>

          <button
            type="button"
            disabled={generating}
            onClick={handleDownload}
            className="
              rounded-lg bg-blue-600
              hover:bg-blue-500
              px-5 py-3 font-semibold
            "
          >
            PDF 보고서 다운로드
          </button>
        </div>
      </section>

      {previewUrl && (
        <section className="
          rounded-2xl border border-slate-800
          bg-slate-900 p-3
        ">
          <iframe
            src={previewUrl}
            title="PDF 미리보기"
            className="
              w-full h-[850px]
              rounded-xl bg-white
            "
          />
        </section>
      )}
    </div>
  );
}

/* =========================================================
 * 일반 입력
 * ========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}) {
  return (
    <div>
      <label className="
        block text-sm font-semibold mb-2
      ">
        {label}
      </label>

      <input
        value={value}
        onChange={e =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="
          w-full rounded-lg
          border border-slate-700
          bg-slate-950 px-3 py-3
          text-sm outline-none
          focus:border-blue-500
        "
      />
    </div>
  );
}

/* =========================================================
 * 자동완성
 * ========================================================= */

function Autocomplete({
  label,
  value,
  placeholder,
  options,
  active,
  onFocus,
  onChange,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  active: boolean;
  onFocus: () => void;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="relative">
      <label className="
        block text-sm font-semibold mb-2
      ">
        {label}
      </label>

      <input
        value={value}
        onFocus={onFocus}
        onChange={e =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        autoComplete="off"
        className="
          w-full rounded-lg
          border border-slate-700
          bg-slate-950 px-3 py-3
          text-sm outline-none
          focus:border-blue-500
        "
      />

      {active && options.length > 0 && (
        <div className="
          absolute z-50
          left-0 right-0 top-full mt-1
          max-h-64 overflow-y-auto
          rounded-lg
          border border-slate-700
          bg-slate-900
          shadow-2xl
        ">
          {options.map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              onMouseDown={e =>
                e.preventDefault()
              }
              onClick={() =>
                onSelect(option)
              }
              className="
                block w-full
                px-3 py-3
                text-left text-sm
                border-b border-slate-800
                hover:bg-slate-800
              "
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * Select
 * ========================================================= */

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <select
      value={value}
      onChange={e =>
        onChange(e.target.value)
      }
      className="
        w-full rounded-lg
        border border-slate-700
        bg-slate-950 px-3 py-3
        text-sm outline-none
        focus:border-blue-500
      "
    >
      <option value="">
        {placeholder}
      </option>

      {options.map(option => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
