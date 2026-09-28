import React, { useEffect, useMemo, useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQkPXudgO_znrjg8-ZyoSmMb5dhrISbANstWt3xNanbbTNCNRhDwAQgxhrECxwN8R2QSV8lTgln6_9P/pub?gid=1374895459&single=true&output=tsv';

const PDF_TEMPLATE =
  `${import.meta.env.BASE_URL}report-template.pdf`;

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
  '강남구',
  '강동구',
  '강북구',
  '강서구',
  '관악구',
  '광진구',
  '구로구',
  '금천구',
  '노원구',
  '도봉구',
  '동대문구',
  '동작구',
  '마포구',
  '서대문구',
  '서초구',
  '성동구',
  '성북구',
  '송파구',
  '양천구',
  '영등포구',
  '용산구',
  '은평구',
  '종로구',
  '중구',
  '중랑구'
];


const CURRENT_YEAR = new Date().getFullYear();

const YEAR_OPTIONS = Array.from(
  { length: 16 },
  (_, i) => CURRENT_YEAR - 5 + i
);

const MONTH_OPTIONS = Array.from(
  { length: 12 },
  (_, i) => i + 1
);

const HOUR_OPTIONS = Array.from(
  { length: 24 },
  (_, i) => i
);

const MINUTE_OPTIONS = Array.from(
  { length: 60 },
  (_, i) => i
);


function pad2(value: number | string) {
  return String(value).padStart(2, '0');
}


function daysInMonth(
  year: number,
  month: number
) {
  return new Date(
    year,
    month,
    0
  ).getDate();
}


/* =========================================================
 * 주소
 * ========================================================= */

function normalizeAddress(
  value: string
): string {

  let address =
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  if (!address) {
    return '';
  }

  if (
    address.startsWith(
      '서울특별시'
    )
  ) {
    return address;
  }

  if (
    address === '서울시' ||
    address.startsWith('서울시 ') ||
    address.startsWith('서울 ')
  ) {

    address =
      address
        .replace(/^서울시\s*/, '')
        .replace(/^서울\s*/, '')
        .trim();

    return `서울특별시 ${address}`;
  }

  for (
    const district of SEOUL_DISTRICTS
  ) {

    if (
      address === district ||
      address.startsWith(
        `${district} `
      )
    ) {

      return `서울특별시 ${address}`;
    }
  }

  return address;
}


/* =========================================================
 * 현장명
 * ========================================================= */

function cleanSiteName(
  value: string
) {

  return String(value || '')
    .replace(
      /\s*\(\s*LH\s*\)\s*/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}


/* =========================================================
 * 승강기 번호
 * ========================================================= */

function formatElevatorNo(
  value: string
) {

  const raw =
    String(value || '').trim();

  const digits =
    raw.replace(/\D/g, '');

  if (
    digits.length === 7
  ) {

    return (
      `${digits.slice(0, 4)}-${digits.slice(4)}`
    );
  }

  const match =
    raw.match(
      /^(\d{4})-(\d{3})$/
    );

  if (match) {
    return `${match[1]}-${match[2]}`;
  }

  return raw;
}


function normalizeElevator(
  value: string
) {

  const digits =
    String(value || '')
      .replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  return digits.padStart(
    7,
    '0'
  );
}


/* =========================================================
 * 검색용 문자열
 * ========================================================= */

function normalizeText(
  value: string
) {

  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}


/* =========================================================
 * TSV
 * ========================================================= */

function parseTSV(
  text: string
): string[][] {

  return text
    .replace(/\r/g, '')
    .split('\n')
    .filter(
      line => line.trim() !== ''
    )
    .map(
      line => line.split('\t')
    );
}


/* =========================================================
 * 전화번호
 * ========================================================= */

function formatPhone(
  value: string
) {

  const digits =
    String(value || '')
      .replace(/\D/g, '')
      .slice(0, 11);

  if (
    digits.length <= 3
  ) {
    return digits;
  }

  if (
    digits.length <= 7
  ) {

    return (
      `${digits.slice(0, 3)}-${digits.slice(3)}`
    );
  }

  return (
    `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  );
}


/* =========================================================
 * 날짜
 * ========================================================= */

function formatOccurredDateTime(
  year: string,
  month: string,
  day: string,
  hour: string,
  minute: string
) {

  if (
    !year ||
    !month ||
    !day ||
    !hour ||
    !minute
  ) {

    return '';
  }

  return (
    `${year}년 ${Number(month)}월 ${Number(day)}일 ` +
    `${pad2(hour)}:${pad2(minute)} 경`
  );
}


/* =========================================================
 * PDF 텍스트
 * ========================================================= */

function drawText(
  page: any,
  text: string,
  x: number,
  y: number,
  size: number,
  font: any
) {

  if (!text) {
    return;
  }

  page.drawText(
    text,
    {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0)
    }
  );
}


/* =========================================================
 * PDF 줄바꿈
 * ========================================================= */

function wrapText(
  text: string,
  font: any,
  size: number,
  maxWidth: number
): string[] {

  const result: string[] = [];

  const paragraphs =
    String(text || '')
      .split('\n');

  for (
    const paragraph of paragraphs
  ) {

    if (!paragraph) {
      result.push('');
      continue;
    }

    let line = '';

    for (
      const char of paragraph
    ) {

      const test =
        line + char;

      const width =
        font.widthOfTextAtSize(
          test,
          size
        );

      if (
        width > maxWidth &&
        line
      ) {

        result.push(line);

        line = char;

      } else {

        line = test;
      }
    }

    if (line) {
      result.push(line);
    }
  }

  return result;
}


/* =========================================================
 * PDF 신고내용
 *
 * 시간은 왼쪽
 * 내용은 오른쪽
 * ========================================================= */

function drawReportEntries(
  page: any,
  entries: ReportEntry[],
  font: any
) {

  /*
   * A4 594 x 842
   *
   * 본문 영역:
   * x 약 122 ~ 537
   * y 약 298 ~ 503
   */

  const timeX = 132;
  const contentX = 185;

  const startY = 472;

  const fontSize = 9.5;
  const lineHeight = 13;

  const contentWidth = 345;

  const bottomY = 310;

  let y = startY;

  for (
    const entry of entries
  ) {

    if (
      y < bottomY
    ) {
      break;
    }

    const time =
      entry.hour &&
      entry.minute
        ? `${pad2(entry.hour)}:${pad2(entry.minute)}`
        : '';

    drawText(
      page,
      time,
      timeX,
      y,
      fontSize,
      font
    );

    const lines =
      wrapText(
        entry.content,
        font,
        fontSize,
        contentWidth
      );

    if (
      lines.length === 0
    ) {

      y -= lineHeight;

      continue;
    }

    for (
      const line of lines
    ) {

      if (
        y < bottomY
      ) {
        break;
      }

      drawText(
        page,
        line,
        contentX,
        y,
        fontSize,
        font
      );

      y -= lineHeight;
    }

    y -= 4;
  }
}


/* =========================================================
 * PDF 원인 / 조치
 * ========================================================= */

function drawCauseAndAction(
  page: any,
  cause: string,
  action: string,
  font: any
) {

  const labelX = 132;
  const valueX = 165;

  const size = 9.5;
  const lineHeight = 13;

  const width = 350;

  /*
   * 원인 영역
   */

  let y = 268;

  drawText(
    page,
    '원인',
    labelX,
    y,
    size,
    font
  );

  const causeLines =
    wrapText(
      cause,
      font,
      size,
      width
    );

  let causeY =
    y - 16;

  for (
    const line of causeLines
  ) {

    if (
      causeY < 215
    ) {
      break;
    }

    drawText(
      page,
      line,
      valueX,
      causeY,
      size,
      font
    );

    causeY -= lineHeight;
  }


  /*
   * 조치 영역
   */

  let actionY =
    Math.min(
      causeY - 12,
      195
    );

  drawText(
    page,
    '조치',
    labelX,
    actionY,
    size,
    font
  );

  const actionLines =
    wrapText(
      action,
      font,
      size,
      width
    );

  let textY =
    actionY - 16;

  for (
    const line of actionLines
  ) {

    if (
      textY < 105
    ) {
      break;
    }

    drawText(
      page,
      line,
      valueX,
      textY,
      size,
      font
    );

    textY -= lineHeight;
  }
}


/* =========================================================
 * 메인
 * ========================================================= */

export function TrappedReportSection({
  onBack
}: Props) {

  const [rows, setRows] =
    useState<SheetRow[]>([]);

  const [loadingSheet, setLoadingSheet] =
    useState(true);

  const [sheetError, setSheetError] =
    useState('');


  /* 신고자 */

  const [reporterName, setReporterName] =
    useState('');

  const [reporterPhone, setReporterPhone] =
    useState('');


  /* 신고 현황 */

  const [siteName, setSiteName] =
    useState('');

  const [address, setAddress] =
    useState('');

  const [elevatorNo, setElevatorNo] =
    useState('');


  /* 자동완성 활성 필드 */

  const [activeAutoField, setActiveAutoField] =
    useState<
      'site' |
      'address' |
      'elevator' |
      null
    >(null);


  /* 발생 일시 */

  const [occurredYear, setOccurredYear] =
    useState('');

  const [occurredMonth, setOccurredMonth] =
    useState('');

  const [occurredDay, setOccurredDay] =
    useState('');

  const [occurredHour, setOccurredHour] =
    useState('');

  const [occurredMinute, setOccurredMinute] =
    useState('');


  /* 신고내용 */

  const [reportEntries, setReportEntries] =
    useState<ReportEntry[]>([
      {
        id: 1,
        hour: '',
        minute: '',
        content: ''
      }
    ]);

  const [nextEntryId, setNextEntryId] =
    useState(2);


  /* 원인 / 조치 */

  const [cause, setCause] =
    useState('');

  const [action, setAction] =
    useState('');


  /* 작성자 */

  const [writer, setWriter] =
    useState('');


  /* PDF */

  const [generating, setGenerating] =
    useState(false);

  const [previewUrl, setPreviewUrl] =
    useState('');


  /* =====================================================
   * 스프레드시트 읽기
   * ===================================================== */

  useEffect(() => {

    let cancelled = false;

    async function loadSheet() {

      setLoadingSheet(true);
      setSheetError('');

      try {

        const response =
          await fetch(
            `${SHEET_URL}&t=${Date.now()}`,
            {
              cache: 'no-store'
            }
          );

        if (!response.ok) {
          throw new Error(
            '스프레드시트 응답 오류'
          );
        }

        const text =
          await response.text();

        const parsed =
          parseTSV(text);

        const converted =
          parsed
            .map(row => ({
              site:
                cleanSiteName(
                  row[0] || ''
                ),

              address:
                normalizeAddress(
                  row[2] || ''
                ),

              elevator:
                formatElevatorNo(
                  row[3] || ''
                )
            }))
            .filter(
              row =>
                row.site ||
                row.address ||
                row.elevator
            );

        if (!cancelled) {
          setRows(converted);
        }

      } catch (error: any) {

        console.error(error);

        if (!cancelled) {

          setSheetError(
            error?.message ||
            '스프레드시트를 불러오지 못했습니다.'
          );
        }

      } finally {

        if (!cancelled) {
          setLoadingSheet(false);
        }
      }
    }

    loadSheet();

    return () => {
      cancelled = true;
    };

  }, []);


  /* =====================================================
   * 날짜에 맞는 일수
   * ===================================================== */

  useEffect(() => {

    if (
      !occurredYear ||
      !occurredMonth
    ) {
      return;
    }

    const maxDay =
      daysInMonth(
        Number(occurredYear),
        Number(occurredMonth)
      );

    if (
      occurredDay &&
      Number(occurredDay) > maxDay
    ) {

      setOccurredDay(
        String(maxDay)
      );
    }

  }, [
    occurredYear,
    occurredMonth,
    occurredDay
  ]);


  /* =====================================================
   * PDF URL 정리
   * ===================================================== */

  useEffect(() => {

    return () => {

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };

  }, [previewUrl]);


  /* =====================================================
   * 자동완성 목록
   * ===================================================== */

  const siteOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            rows
              .map(row => row.site)
              .filter(Boolean)
          )
        ),
      [rows]
    );


  const addressOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            rows
              .map(row => row.address)
              .filter(Boolean)
          )
        ),
      [rows]
    );


  const elevatorOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            rows
              .map(row => row.elevator)
              .filter(Boolean)
          )
        ),
      [rows]
    );


  /* 날짜 */

  const dayOptions =
    useMemo(() => {

      if (
        !occurredYear ||
        !occurredMonth
      ) {

        return Array.from(
          { length: 31 },
          (_, i) => i + 1
        );
      }

      return Array.from(
        {
          length:
            daysInMonth(
              Number(occurredYear),
              Number(occurredMonth)
            )
        },
        (_, i) => i + 1
      );

    }, [
      occurredYear,
      occurredMonth
    ]);


  /* =====================================================
   * 행 찾기
   * ===================================================== */

  function findRow(
    type:
      | 'site'
      | 'address'
      | 'elevator',
    value: string
  ): SheetRow | null {

    if (
      !value.trim()
    ) {
      return null;
    }


    if (
      type === 'elevator'
    ) {

      const target =
        normalizeElevator(
          value
        );

      if (!target) {
        return null;
      }

      return (
        rows.find(
          row =>
            normalizeElevator(
              row.elevator
            ) === target
        ) || null
      );
    }


    if (
      type === 'site'
    ) {

      const target =
        normalizeText(
          value
        );

      return (
        rows.find(
          row =>
            normalizeText(
              row.site
            ) === target
        ) || null
      );
    }


    const target =
      normalizeText(
        normalizeAddress(
          value
        )
      );

    return (
      rows.find(
        row =>
          normalizeText(
            row.address
          ) === target
      ) || null
    );
  }


  /* =====================================================
   * 자동완성 선택
   * ===================================================== */

  function applyRow(
    row: SheetRow
  ) {

    setSiteName(
      row.site
    );

    setAddress(
      row.address
    );

    setElevatorNo(
      row.elevator
    );

    setActiveAutoField(
      null
    );
  }


  function handleSiteChange(
    value: string
  ) {

    setSiteName(
      value
    );

    const exact =
      findRow(
        'site',
        value
      );

    if (exact) {
      applyRow(exact);
    }
  }


  function handleAddressChange(
    value: string
  ) {

    const normalized =
      value.trim()
        ? normalizeAddress(value)
        : '';

    setAddress(
      normalized
    );

    const exact =
      findRow(
        'address',
        normalized
      );

    if (exact) {
      applyRow(exact);
    }
  }


  function handleElevatorChange(
    value: string
  ) {

    const formatted =
      formatElevatorNo(
        value
      );

    setElevatorNo(
      formatted
    );

    const exact =
      findRow(
        'elevator',
        formatted
      );

    if (exact) {
      applyRow(exact);
    }
  }


  /* =====================================================
   * 신고내용
   * ===================================================== */

  function updateEntry(
    id: number,
    field:
      | 'hour'
      | 'minute'
      | 'content',
    value: string
  ) {

    setReportEntries(
      current =>
        current.map(
          entry =>
            entry.id === id
              ? {
                  ...entry,
                  [field]: value
                }
              : entry
        )
    );
  }


  function addEntry() {

    const id =
      nextEntryId;

    setReportEntries(
      current => [
        ...current,
        {
          id,
          hour: '',
          minute: '',
          content: ''
        }
      ]
    );

    setNextEntryId(
      current =>
        current + 1
    );
  }


  function removeEntry(
    id: number
  ) {

    setReportEntries(
      current => {

        if (
          current.length === 1
        ) {
          return current;
        }

        return current.filter(
          entry =>
            entry.id !== id
        );
      }
    );
  }


  /* =====================================================
   * 자동완성 필터
   * ===================================================== */

  function getFilteredOptions(
    type:
      | 'site'
      | 'address'
      | 'elevator',
    value: string
  ) {

    let source: string[] = [];

    if (
      type === 'site'
    ) {
      source = siteOptions;
    }

    if (
      type === 'address'
    ) {
      source = addressOptions;
    }

    if (
      type === 'elevator'
    ) {
      source = elevatorOptions;
    }

    const query =
      type === 'elevator'
        ? value
            .replace(/\D/g, '')
        : normalizeText(
            value
          );

    if (!query) {
      return source.slice(
        0,
        8
      );
    }

    return source
      .filter(option => {

        const normalized =
          type === 'elevator'
            ? option.replace(
                /\D/g,
                ''
              )
            : normalizeText(
                option
              );

        return normalized.includes(
          query
        );
      })
      .slice(
        0,
        8
      );
  }


  /* =====================================================
   * PDF 생성
   * ===================================================== */

  async function createPDF(): Promise<Uint8Array> {

    const response =
      await fetch(
        `${PDF_TEMPLATE}?v=${Date.now()}`
      );

    if (!response.ok) {

      throw new Error(
        'public/report-template.pdf 파일을 찾을 수 없습니다.'
      );
    }

    const templateBytes =
      await response.arrayBuffer();

    const pdfDoc =
      await PDFDocument.load(
        templateBytes
      );

    pdfDoc.registerFontkit(
      fontkit
    );


    const fontResponse =
      await fetch(
        FONT_URL
      );

    if (!fontResponse.ok) {

      throw new Error(
        '한글 폰트를 불러오지 못했습니다.'
      );
    }

    const fontBytes =
      await fontResponse.arrayBuffer();

    const font =
      await pdfDoc.embedFont(
        fontBytes,
        {
          subset: true
        }
      );


    const page =
      pdfDoc.getPages()[0];


    /*
     * =====================================================
     * ① 신고자
     * =====================================================
     *
     * PDF 원본 A4:
     * 594 x 842
     *
     * 신고자 영역:
     * 이름     x 약 122~325
     * 연락처   x 약 325~537
     */

    drawText(
      page,
      reporterName,
      220,
      614,
      10.5,
      font
    );

    drawText(
      page,
      formatPhone(
        reporterPhone
      ),
      340,
      614,
      10.5,
      font
    );


    /*
     * =====================================================
     * ② 신고 현황
     * =====================================================
     */

    /* 현장명 */

    drawText(
      page,
      siteName,
      220,
      566,
      10.5,
      font
    );


    /* 소재지 */

    drawText(
      page,
      address,
      340,
      566,
      9.5,
      font
    );


    /* 승강기 번호 */

    drawText(
      page,
      formatElevatorNo(
        elevatorNo
      ),
      220,
      519,
      10.5,
      font
    );


    /* 발생일시 */

    drawText(
      page,
      formatOccurredDateTime(
        occurredYear,
        occurredMonth,
        occurredDay,
        occurredHour,
        occurredMinute
      ),
      340,
      519,
      9.5,
      font
    );


    /*
     * =====================================================
     * ③ 신고내용
     * =====================================================
     *
     * 원본의 "신고내용..." 안내문 아래부터 작성
     *
     * 시간     내용
     * 21:05    신고 접수
     *          현장으로 이동
     */

    drawReportEntries(
      page,
      reportEntries,
      font
    );


    /*
     * =====================================================
     * ④ 원인 / ⑤ 조치
     * =====================================================
     */

    drawCauseAndAction(
      page,
      cause,
      action,
      font
    );


    /*
     * =====================================================
     * 작성자
     * =====================================================
     */

    drawText(
      page,
      writer,
      320,
      660,
      10.5,
      font
    );


    return await pdfDoc.save();
  }


  /* =====================================================
   * PDF 다운로드
   * ===================================================== */

  async function handleDownload() {

    setGenerating(
      true
    );

    try {

      const bytes =
        await createPDF();

      const blob =
        new Blob(
          [bytes],
          {
            type:
              'application/pdf'
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const fileName =
        `${safeFileName(siteName) || '승객갇힘'}_` +
        `${safeFileName(elevatorNo) || '보고서'}_` +
        `승객갇힘보고서.pdf`;

      const a =
        document.createElement(
          'a'
        );

      a.href = url;
      a.download = fileName;

      document.body.appendChild(
        a
      );

      a.click();

      a.remove();

      setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        2000
      );

    } catch (
      error: any
    ) {

      console.error(
        error
      );

      alert(
        error?.message ||
        'PDF 생성 중 오류가 발생했습니다.'
      );

    } finally {

      setGenerating(
        false
      );
    }
  }


  /* =====================================================
   * 미리보기
   * ===================================================== */

  async function handlePreview() {

    setGenerating(
      true
    );

    try {

      const bytes =
        await createPDF();

      const blob =
        new Blob(
          [bytes],
          {
            type:
              'application/pdf'
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      setPreviewUrl(
        oldUrl => {

          if (oldUrl) {
            URL.revokeObjectURL(
              oldUrl
            );
          }

          return url;
        }
      );

    } catch (
      error: any
    ) {

      console.error(
        error
      );

      alert(
        error?.message ||
        'PDF 미리보기 중 오류가 발생했습니다.'
      );

    } finally {

      setGenerating(
        false
      );
    }
  }


  /* =====================================================
   * 초기화
   * ===================================================== */

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

    setReportEntries([
      {
        id: 1,
        hour: '',
        minute: '',
        content: ''
      }
    ]);

    setNextEntryId(2);

    setCause('');
    setAction('');

    setWriter('');

    setActiveAutoField(
      null
    );

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setPreviewUrl('');
  }


  return (
    <div className="w-full space-y-6">

      {/* =================================================
          상단
      ================================================= */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            승객갇힘 보고서 작성
          </h1>

          <p className="text-sm text-slate-400 mt-2">
            현장명, 소재지 또는 승강기 번호를 입력하면 바로 아래에 검색 결과가 표시됩니다.
          </p>

        </div>

        <button
          type="button"
          onClick={onBack}
          className="
            px-4 py-2
            rounded-lg
            bg-slate-800
            hover:bg-slate-700
            text-sm
            font-semibold
            transition
          "
        >
          ← 홈으로
        </button>

      </div>


      {/* =================================================
          DB 상태
      ================================================= */}

      <div className="
        rounded-xl
        border
        border-slate-800
        bg-slate-900
        p-4
      ">

        {loadingSheet ? (

          <div className="text-sm text-slate-400">
            스프레드시트 정보를 불러오는 중...
          </div>

        ) : sheetError ? (

          <div className="text-sm text-red-400">
            스프레드시트 오류 : {sheetError}
          </div>

        ) : (

          <div className="text-sm text-emerald-400">
            ✓ 현장정보 DB 연결 완료 ({rows.length.toLocaleString()}건)
          </div>

        )}

      </div>


      {/* =================================================
          ① 신고자 + ② 신고 현황
          PC : 좌우
          모바일 : 위아래
      ================================================= */}

      <div className="
        grid
        grid-cols-1
        lg:grid-cols-2
        gap-6
        items-start
      ">

        {/* =================================================
            ① 신고자
        ================================================= */}

        <section className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-5
          sm:p-6
        ">

          <h2 className="text-lg font-bold mb-5">
            ① 신고자
          </h2>

          <div className="space-y-4">

            <Field
              label="성명"
              value={reporterName}
              onChange={
                setReporterName
              }
              placeholder="신고자 성명"
            />

            <Field
              label="연락처"
              value={reporterPhone}
              onChange={
                value =>
                  setReporterPhone(
                    formatPhone(
                      value
                    )
                  )
              }
              placeholder="010-0000-0000"
              inputMode="numeric"
              maxLength={13}
            />

          </div>

          <p className="
            text-xs
            text-slate-500
            mt-3
          ">
            01000000000 또는 010-0000-0000 입력 → 010-0000-0000 형식으로 자동 정리
          </p>

        </section>


        {/* =================================================
            ② 신고 현황
        ================================================= */}

        <section className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-5
          sm:p-6
        ">

          <h2 className="text-lg font-bold mb-5">
            ② 신고 현황
          </h2>


          <div className="space-y-4">

            {/* 현장명 */}

            <AutocompleteField
              label="현장명"
              value={siteName}
              placeholder="현장명을 입력하세요"
              options={
                getFilteredOptions(
                  'site',
                  siteName
                )
              }
              showOptions={
                activeAutoField ===
                'site'
              }
              onFocus={() =>
                setActiveAutoField(
                  'site'
                )
              }
              onChange={
                handleSiteChange
              }
              onSelect={
                value => {

                  const found =
                    findRow(
                      'site',
                      value
                    );

                  if (found) {
                    applyRow(
                      found
                    );
                  }
                }
              }
            />


            {/* 소재지 */}

            <AutocompleteField
              label="소재지"
              value={address}
              placeholder="주소를 입력하세요"
              options={
                getFilteredOptions(
                  'address',
                  address
                )
              }
              showOptions={
                activeAutoField ===
                'address'
              }
              onFocus={() =>
                setActiveAutoField(
                  'address'
                )
              }
              onChange={
                handleAddressChange
              }
              onSelect={
                value => {

                  const found =
                    findRow(
                      'address',
                      value
                    );

                  if (found) {
                    applyRow(
                      found
                    );
                  }
                }
              }
            />


            {/* 승강기 번호 */}

            <AutocompleteField
              label="승강기 번호"
              value={elevatorNo}
              placeholder="0000-000"
              options={
                getFilteredOptions(
                  'elevator',
                  elevatorNo
                )
              }
              showOptions={
                activeAutoField ===
                'elevator'
              }
              onFocus={() =>
                setActiveAutoField(
                  'elevator'
                )
              }
              onChange={
                handleElevatorChange
              }
              onSelect={
                value => {

                  const found =
                    findRow(
                      'elevator',
                      value
                    );

                  if (found) {
                    applyRow(
                      found
                    );
                  }
                }
              }
            />


            {/* 발생일시 */}

            <div>

              <label className="
                block
                text-sm
                font-semibold
                mb-2
              ">
                발생 일시
              </label>


              {/* 연월일 */}

              <div className="
                grid
                grid-cols-3
                gap-2
              ">

                <SelectField
                  value={
                    occurredYear
                  }
                  onChange={
                    setOccurredYear
                  }
                  placeholder="연도"
                  options={
                    YEAR_OPTIONS.map(
                      value => ({
                        value:
                          String(
                            value
                          ),
                        label:
                          `${value}년`
                      })
                    )
                  }
                />

                <SelectField
                  value={
                    occurredMonth
                  }
                  onChange={
                    setOccurredMonth
                  }
                  placeholder="월"
                  options={
                    MONTH_OPTIONS.map(
                      value => ({
                        value:
                          String(
                            value
                          ),
                        label:
                          `${value}월`
                      })
                    )
                  }
                />

                <SelectField
                  value={
                    occurredDay
                  }
                  onChange={
                    setOccurredDay
                  }
                  placeholder="일"
                  options={
                    dayOptions.map(
                      value => ({
                        value:
                          String(
                            value
                          ),
                        label:
                          `${value}일`
                      })
                    )
                  }
                />

              </div>


              {/* 시간 */}

              <div className="
                grid
                grid-cols-2
                gap-2
                mt-2
              ">

                <SelectField
                  value={
                    occurredHour
                  }
                  onChange={
                    setOccurredHour
                  }
                  placeholder="시"
                  options={
                    HOUR_OPTIONS.map(
                      value => ({
                        value:
                          String(
                            value
                          ),
                        label:
                          `${pad2(value)}시`
                      })
                    )
                  }
                />

                <SelectField
                  value={
                    occurredMinute
                  }
                  onChange={
                    setOccurredMinute
                  }
                  placeholder="분"
                  options={
                    MINUTE_OPTIONS.map(
                      value => ({
                        value:
                          String(
                            value
                          ),
                        label:
                          `${pad2(value)}분`
                      })
                    )
                  }
                />

              </div>

              <p className="
                text-xs
                text-slate-500
                mt-2
              ">
                시간은 00~23시 24시간제로 선택합니다.
              </p>

            </div>

          </div>

        </section>

      </div>


      {/* =================================================
          ③ 신고내용
      ================================================= */}

      <section className="
        rounded-2xl
        border
        border-slate-800
        bg-slate-900
        p-5
        sm:p-6
      ">

        <div className="
          flex
          flex-col
          sm:flex-row
          sm:items-center
          sm:justify-between
          gap-3
          mb-5
        ">

          <div>

            <h2 className="text-lg font-bold">
              ③ 신고내용
            </h2>

            <p className="
              text-xs
              text-slate-500
              mt-1
            ">
              시간별로 내용을 추가할 수 있습니다.
            </p>

          </div>

          <button
            type="button"
            onClick={addEntry}
            className="
              rounded-lg
              bg-emerald-700
              hover:bg-emerald-600
              px-4
              py-2
              text-sm
              font-semibold
            "
          >
            ＋ 시간 추가
          </button>

        </div>


        <div className="space-y-4">

          {reportEntries.map(
            (
              entry,
              index
            ) => (

              <div
                key={entry.id}
                className="
                  rounded-xl
                  border
                  border-slate-800
                  bg-slate-950/60
                  p-4
                "
              >

                <div className="
                  flex
                  items-center
                  justify-between
                  mb-3
                ">

                  <span className="
                    text-sm
                    font-semibold
                  ">
                    내용 {index + 1}
                  </span>

                  {reportEntries.length > 1 && (

                    <button
                      type="button"
                      onClick={() =>
                        removeEntry(
                          entry.id
                        )
                      }
                      className="
                        text-xs
                        text-red-400
                        hover:text-red-300
                      "
                    >
                      삭제
                    </button>

                  )}

                </div>


                <div className="
                  grid
                  grid-cols-2
                  sm:grid-cols-[110px_110px_1fr]
                  gap-2
                ">

                  <SelectField
                    value={
                      entry.hour
                    }
                    onChange={
                      value =>
                        updateEntry(
                          entry.id,
                          'hour',
                          value
                        )
                    }
                    placeholder="시"
                    options={
                      HOUR_OPTIONS.map(
                        value => ({
                          value:
                            String(
                              value
                            ),
                          label:
                            `${pad2(value)}시`
                        })
                      )
                    }
                  />


                  <SelectField
                    value={
                      entry.minute
                    }
                    onChange={
                      value =>
                        updateEntry(
                          entry.id,
                          'minute',
                          value
                        )
                    }
                    placeholder="분"
                    options={
                      MINUTE_OPTIONS.map(
                        value => ({
                          value:
                            String(
                              value
                            ),
                          label:
                            `${pad2(value)}분`
                        })
                      )
                    }
                  />


                  <textarea
                    value={
                      entry.content
                    }
                    onChange={
                      e =>
                        updateEntry(
                          entry.id,
                          'content',
                          e.target.value
                        )
                    }
                    rows={3}
                    className="
                      sm:col-span-1
                      col-span-2
                      w-full
                      rounded-lg
                      border
                      border-slate-700
                      bg-slate-950
                      px-3
                      py-3
                      text-sm
                      outline-none
                      focus:border-blue-500
                      resize-y
                    "
                    placeholder="해당 시간의 내용을 입력하세요."
                  />

                </div>

              </div>

            )
          )}

        </div>

      </section>


      {/* =================================================
          ④ 원인
      ================================================= */}

      <section className="
        rounded-2xl
        border
        border-slate-800
        bg-slate-900
        p-5
        sm:p-6
      ">

        <h2 className="text-lg font-bold mb-5">
          ④ 원인
        </h2>

        <FieldTextarea
          label="원인"
          value={cause}
          onChange={setCause}
          rows={6}
          placeholder="원인을 입력하세요."
        />

      </section>


      {/* =================================================
          ⑤ 조치
      ================================================= */}

      <section className="
        rounded-2xl
        border
        border-slate-800
        bg-slate-900
        p-5
        sm:p-6
      ">

        <h2 className="text-lg font-bold mb-5">
          ⑤ 조치
        </h2>

        <FieldTextarea
          label="조치"
          value={action}
          onChange={setAction}
          rows={6}
          placeholder="조치내용을 입력하세요."
        />

      </section>


      {/* =================================================
          작성자
      ================================================= */}

      <section className="
        rounded-2xl
        border
        border-slate-800
        bg-slate-900
        p-5
        sm:p-6
      ">

        <h2 className="text-lg font-bold mb-5">
          작성자
        </h2>

        <Field
          label="작성자"
          value={writer}
          onChange={setWriter}
          placeholder="작성자 이름"
        />

      </section>


      {/* =================================================
          버튼
      ================================================= */}

      <section className="
        rounded-2xl
        border
        border-slate-800
        bg-slate-900
        p-5
        sm:p-6
      ">

        <div className="
          flex
          flex-wrap
          gap-3
        ">

          <button
            type="button"
            disabled={generating}
            onClick={handlePreview}
            className="
              rounded-lg
              bg-slate-700
              hover:bg-slate-600
              disabled:opacity-50
              px-5
              py-3
              font-semibold
              text-sm
            "
          >
            {generating
              ? '처리 중...'
              : 'PDF 미리보기'}
          </button>


          <button
            type="button"
            disabled={generating}
            onClick={handleDownload}
            className="
              rounded-lg
              bg-blue-600
              hover:bg-blue-500
              disabled:opacity-50
              px-5
              py-3
              font-semibold
              text-sm
            "
          >
            {generating
              ? 'PDF 생성 중...'
              : 'PDF 보고서 다운로드'}
          </button>


          <button
            type="button"
            onClick={resetForm}
            className="
              rounded-lg
              bg-slate-800
              hover:bg-slate-700
              px-5
              py-3
              font-semibold
              text-sm
            "
          >
            입력 초기화
          </button>

        </div>

      </section>


      {/* =================================================
          PDF 미리보기
      ================================================= */}

      {previewUrl && (

        <section className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-3
        ">

          <iframe
            src={previewUrl}
            title="PDF 미리보기"
            className="
              w-full
              h-[800px]
              rounded-xl
              bg-white
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

interface FieldProps {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}


function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  maxLength
}: FieldProps) {

  return (

    <div>

      <label className="
        block
        text-sm
        font-semibold
        mb-2
      ">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        placeholder={
          placeholder
        }
        inputMode={
          inputMode
        }
        maxLength={
          maxLength
        }
        className="
          w-full
          rounded-lg
          border
          border-slate-700
          bg-slate-950
          px-3
          py-3
          text-sm
          outline-none
          focus:border-blue-500
        "
      />

    </div>
  );
}


/* =========================================================
 * 자동완성 입력
 *
 * datalist를 사용하지 않음
 * → PC / 모바일 동일한 화면
 * ========================================================= */

interface AutocompleteFieldProps {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  showOptions: boolean;
  onFocus: () => void;
  onChange: (
    value: string
  ) => void;
  onSelect: (
    value: string
  ) => void;
}


function AutocompleteField({
  label,
  value,
  placeholder,
  options,
  showOptions,
  onFocus,
  onChange,
  onSelect
}: AutocompleteFieldProps) {

  return (

    <div className="relative">

      <label className="
        block
        text-sm
        font-semibold
        mb-2
      ">
        {label}
      </label>


      <input
        value={value}
        onFocus={onFocus}
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        placeholder={
          placeholder
        }
        autoComplete="off"
        className="
          w-full
          rounded-lg
          border
          border-slate-700
          bg-slate-950
          px-3
          py-3
          text-sm
          outline-none
          focus:border-blue-500
        "
      />


      {showOptions &&
        options.length > 0 && (

          <div className="
            absolute
            left-0
            right-0
            top-full
            mt-1
            z-50
            overflow-hidden
            rounded-lg
            border
            border-slate-700
            bg-slate-900
            shadow-2xl
          ">

            {options.map(
              (
                option,
                index
              ) => (

                <button
                  key={`${option}-${index}`}
                  type="button"
                  onPointerDown={
                    e =>
                      e.preventDefault()
                  }
                  onClick={() =>
                    onSelect(
                      option
                    )
                  }
                  className="
                    block
                    w-full
                    border-b
                    border-slate-800
                    px-3
                    py-3
                    text-left
                    text-sm
                    text-slate-200
                    hover:bg-slate-800
                    active:bg-slate-700
                  "
                >
                  {option}
                </button>

              )
            )}

          </div>

        )}

    </div>
  );
}


/* =========================================================
 * Select
 * ========================================================= */

interface SelectOption {
  value: string;
  label: string;
}


function SelectField({
  value,
  onChange,
  placeholder,
  options
}: {
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  options: SelectOption[];
}) {

  return (

    <select
      value={value}
      onChange={
        e =>
          onChange(
            e.target.value
          )
      }
      className="
        w-full
        rounded-lg
        border
        border-slate-700
        bg-slate-950
        px-3
        py-3
        text-sm
        outline-none
        focus:border-blue-500
      "
    >

      <option value="">
        {placeholder}
      </option>

      {options.map(
        option => (

          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>

        )
      )}

    </select>
  );
}


/* =========================================================
 * Textarea
 * ========================================================= */

function FieldTextarea({
  label,
  value,
  onChange,
  rows,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  rows: number;
  placeholder: string;
}) {

  return (

    <div>

      <label className="
        block
        text-sm
        font-semibold
        mb-2
      ">
        {label}
      </label>

      <textarea
        value={value}
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        rows={rows}
        className="
          w-full
          rounded-lg
          border
          border-slate-700
          bg-slate-950
          px-3
          py-3
          text-sm
          outline-none
          focus:border-blue-500
          resize-y
        "
        placeholder={
          placeholder
        }
      />

    </div>
  );
}


/* =========================================================
 * 파일명
 * ========================================================= */

function safeFileName(
  value: string
) {

  return String(
    value || ''
  )
    .replace(
      /[\\/:*?"<>|]/g,
      '_'
    )
    .trim();
}
