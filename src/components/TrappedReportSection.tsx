import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  PDFDocument,
  rgb
} from 'pdf-lib';

import fontkit from '@pdf-lib/fontkit';


/* =========================================================
   Google Sheets
========================================================= */

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQkPXudgO_znrjg8-ZyoSmMb5dhrISbANstWt3xNanbbTNCNRhDwAQgxhrECxwN8R2QSV8lTgln6_9P/pub?gid=1374895459&single=true&output=tsv';


/* =========================================================
   PDF 원본
========================================================= */

const PDF_TEMPLATE =
  '/report-template.pdf';


/*
 * 한글 폰트
 */
const FONT_URL =
  'https://cdn.jsdelivr.net/gh/fonts-archive/NotoSansKR/NotoSansKR-Regular.otf';


/* =========================================================
   타입
========================================================= */

interface SheetRow {

  site: string;

  address: string;

  elevator: string;

}


/* =========================================================
   Props
========================================================= */

interface Props {

  onBack: () => void;

}


/* =========================================================
   서울 25개 구
========================================================= */

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


/* =========================================================
   주소
========================================================= */

const GYEONGGI_CITIES = [
  '수원시',
  '성남시',
  '용인시',
  '부천시',
  '안산시',
  '안양시',
  '평택시',
  '시흥시',
  '화성시',
  '광명시',
  '군포시',
  '광주시',
  '김포시',
  '이천시',
  '안성시',
  '하남시',
  '의왕시',
  '오산시',
  '구리시',
  '의정부시',
  '남양주시',
  '파주시',
  '양주시',
  '포천시',
  '동두천시',
  '과천시',
  '여주시',
  '양평군',
  '가평군',
  '연천군'
];


/* =========================================================
   주소
========================================================= */

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

  /*
   * 이미 서울특별시
   */
  if (
    address.startsWith('서울특별시')
  ) {
    return address;
  }

  /*
   * 서울시 / 서울
   */
  if (
    address.startsWith('서울시 ') ||
    address === '서울시' ||
    address.startsWith('서울 ')
  ) {

    address =
      address
        .replace(/^서울시\s*/, '')
        .replace(/^서울\s*/, '')
        .trim();

    return '서울특별시 ' + address;
  }

  /*
   * 서울 25개 구
   */
  for (
    const district
    of SEOUL_DISTRICTS
  ) {

    if (
      address === district ||
      address.startsWith(district + ' ')
    ) {

      return '서울특별시 ' + address;
    }
  }

  /*
   * 이미 경기도
   */
  if (
    address.startsWith('경기도')
  ) {
    return address;
  }

  /*
   * 경기 / 경기도 없이 시·군으로 시작하는 주소
   */
  for (
    const city
    of GYEONGGI_CITIES
  ) {

    if (
      address === city ||
      address.startsWith(city + ' ')
    ) {

      return '경기도 ' + address;
    }
  }

  /*
   * 그 외 지역
   */
  return address;
}


/* =========================================================
   현장명
========================================================= */

function cleanSiteName(
  value: string
): string {

  return String(
    value || ''
  )
    .replace(
      /\s*\(\s*LH\s*\)\s*/gi,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();

}


/* =========================================================
   승강기 번호
========================================================= */

function formatElevatorNo(
  value: string
): string {

  const digits =
    String(
      value || ''
    )
      .replace(
        /\D/g,
        ''
      );


  if (
    digits.length === 7
  ) {

    return (
      digits.slice(0, 4) +
      '-' +
      digits.slice(4)
    );

  }


  /*
   * 0000-000 형태
   */

  const match =
    String(
      value || ''
    ).match(
      /^(\d{4})-(\d{3})$/
    );


  if (match) {

    return (
      match[1] +
      '-' +
      match[2]
    );

  }


  return String(
    value || ''
  ).trim();

}


/* =========================================================
   승강기 비교
========================================================= */

function normalizeElevator(
  value: string
): string {

  return String(
    value || ''
  )
    .replace(
      /\D/g,
      ''
    )
    .padStart(
      7,
      '0'
    );

}


/* =========================================================
   문자열 비교
========================================================= */

function normalizeText(
  value: string
): string {

  return String(
    value || ''
  )
    .toLowerCase()
    .replace(
      /\s+/g,
      ''
    )
    .trim();

}


/* =========================================================
   TSV
========================================================= */

function parseTSV(
  text: string
): string[][] {

  return text
    .replace(/\r/g, '')
    .split('\n')
    .filter(
      line =>
        line.trim() !== ''
    )
    .map(
      line =>
        line.split('\t')
    );

}


/* =========================================================
   PDF 함수
========================================================= */

function whiteRect(
  page: any,
  x: number,
  y: number,
  width: number,
  height: number
) {

  page.drawRectangle({

    x,

    y,

    width,

    height,

    color:
      rgb(
        1,
        1,
        1
      )

  });

}


/* =========================================================
   텍스트
========================================================= */

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

      color:
        rgb(
          0,
          0,
          0
        )

    }
  );

}


/* =========================================================
   텍스트 줄바꿈
========================================================= */

function wrapText(
  text: string,
  font: any,
  size: number,
  maxWidth: number
): string[] {

  const result: string[] = [];


  const paragraphs =
    text.split('\n');


  for (
    const paragraph
    of paragraphs
  ) {

    if (!paragraph) {

      result.push('');

      continue;

    }


    let line = '';


    for (
      const char
      of paragraph
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

        result.push(
          line
        );


        line = char;

      } else {

        line = test;

      }

    }


    if (line) {

      result.push(
        line
      );

    }

  }


  return result;

}


/* =========================================================
   신고내용
========================================================= */

function drawReportContent(
  page: any,
  time: string,
  content: string,
  font: any
) {

  /*
   * 시간 위치
   */
  const timeX = 128;


  /*
   * 내용 시작 위치
   *
   * ★ 이 값을 조정하면
   * PDF의 내용 열 위치를 조정할 수 있습니다.
   */
  const contentX = 190;


  /*
   * 첫 번째 줄
   */
  const startY = 430;


  const fontSize = 10;


  const lineHeight = 18;


  const contentWidth = 345;


  /*
   * 시간
   */

  if (time) {

    drawText(
      page,
      time,
      timeX,
      startY,
      fontSize,
      font
    );

  }


  /*
   * 내용
   */

  if (!content) {

    return;

  }


  const lines =
    wrapText(
      content,
      font,
      fontSize,
      contentWidth
    );


  let y =
    startY;


  for (
    const line
    of lines
  ) {

    if (
      y < 70
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


    y -=
      lineHeight;

  }

}


/* =========================================================
   날짜
========================================================= */

function formatDateTime(
  value: string
): string {

  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  const year =
    date.getFullYear();

  const month =
    date.getMonth() + 1;

  const day =
    date.getDate();

  const hour =
    String(
      date.getHours()
    ).padStart(
      2,
      '0'
    );

  const minute =
    String(
      date.getMinutes()
    ).padStart(
      2,
      '0'
    );

  return (
    `${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분`
  );
}


/* =========================================================
   발생일시 일정 간격 출력
========================================================= */

function drawDateTime(
  page: any,
  value: string,
  x: number,
  y: number,
  size: number,
  font: any
) {

  if (!value) {
    return;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    drawText(
      page,
      value,
      x,
      y,
      size,
      font
    );

    return;
  }

  const parts = [
    `${date.getFullYear()}년`,
    `${date.getMonth() + 1}월`,
    `${date.getDate()}일`,
    `${String(date.getHours()).padStart(2, '0')}시`,
    `${String(date.getMinutes()).padStart(2, '0')}분`
  ];

  let currentX = x;

  /*
   * 글자 1개 정도 간격
   */
  const gap = 8;

  for (
    const part
    of parts
  ) {

    drawText(
      page,
      part,
      currentX,
      y,
      size,
      font
    );

    currentX +=
      font.widthOfTextAtSize(
        part,
        size
      ) + gap;
  }
}


/* =========================================================
   파일명
========================================================= */

function safeFileName(
  value: string
): string {

  return String(
    value || ''
  )
    .replace(
      /[\\/:*?"<>|]/g,
      '_'
    )
    .trim();

}


/* =========================================================
   컴포넌트
========================================================= */

export function TrappedReportSection({
  onBack
}: Props) {

  /*
   * Sheet
   */

  const [
    rows,
    setRows
  ] =
    useState<SheetRow[]>([]);


  const [
    loadingSheet,
    setLoadingSheet
  ] =
    useState(true);


  const [
    sheetError,
    setSheetError
  ] =
    useState('');


  /*
   * 입력
   */

  const [
    reporterName,
    setReporterName
  ] =
    useState('');


  const [
    reporterPhone,
    setReporterPhone
  ] =
    useState('');


  const [
    siteName,
    setSiteName
  ] =
    useState('');


  const [
    address,
    setAddress
  ] =
    useState('');


  const [
    elevatorNo,
    setElevatorNo
  ] =
    useState('');


  const [
    occurredAt,
    setOccurredAt
  ] =
    useState('');


  const [
    reportTime,
    setReportTime
  ] =
    useState('');


  const [
    reportContent,
    setReportContent
  ] =
    useState('');


  const [
    causeAction,
    setCauseAction
  ] =
    useState('');


  const [
    writer,
    setWriter
  ] =
    useState('');


  /*
   * PDF 처리
   */

  const [
    generating,
    setGenerating
  ] =
    useState(false);


  const [
    previewUrl,
    setPreviewUrl
  ] =
    useState('');


  /* =======================================================
     Sheet 불러오기
  ======================================================= */

  useEffect(() => {

    let cancelled = false;


    async function loadSheet() {

      setLoadingSheet(true);

      setSheetError('');


      try {

        const response =
          await fetch(
            SHEET_URL +
            '&t=' +
            Date.now(),
            {
              cache:
                'no-store'
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
            .map(
              row => ({

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

              })
            )
            .filter(
              row =>
                row.site ||
                row.address ||
                row.elevator
            );


        if (!cancelled) {

          setRows(
            converted
          );

        }


      } catch (error: any) {

        console.error(
          error
        );


        if (!cancelled) {

          setSheetError(
            error?.message ||
            '스프레드시트를 불러오지 못했습니다.'
          );

        }


      } finally {

        if (!cancelled) {

          setLoadingSheet(
            false
          );

        }

      }

    }


    loadSheet();


    return () => {

      cancelled = true;

    };

  }, []);


  /* =======================================================
     자동완성 목록
  ======================================================= */

  const siteOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            rows
              .map(
                row =>
                  row.site
              )
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
              .map(
                row =>
                  row.address
              )
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
              .map(
                row =>
                  row.elevator
              )
              .filter(Boolean)
          )
        ),
      [rows]
    );


  /* =======================================================
     자동 조회
  ======================================================= */

  function findRow(
    type:
      | 'site'
      | 'address'
      | 'elevator',
    value: string
  ): SheetRow | null {

    if (!value.trim()) {

      return null;

    }


    if (
      type ===
      'elevator'
    ) {

      const target =
        normalizeElevator(
          value
        );


      return (
        rows.find(
          row =>
            normalizeElevator(
              row.elevator
            ) === target
        ) ||
        null
      );

    }


    if (
      type ===
      'site'
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
        ) ||
        null
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
      ) ||
      null
    );

  }


  /* =======================================================
     자동 채우기
  ======================================================= */

  function applyRow(
    row: SheetRow
  ) {

    /*
     * 세 값 모두 자동 입력
     */

    setSiteName(
      row.site
    );


    setAddress(
      row.address
    );


    setElevatorNo(
      row.elevator
    );

  }


  /* =======================================================
     PDF 생성
  ======================================================= */

  async function createPDF(): Promise<Uint8Array> {

    /*
     * 원본 PDF
     */

    const response =
      await fetch(
        PDF_TEMPLATE +
        '?v=' +
        Date.now()
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


    /*
     * 한글 폰트
     */

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
     * 기존 PDF의 입력 영역을 흰색으로 덮음
     * =====================================================
     *
     * PDF 좌표 기준입니다.
     */


    /*
     * 신고자 성명
     */

    whiteRect(
      page,
      125,
      600,
      165,
      25
    );


    /*
     * 신고자 연락처
     */

    whiteRect(
      page,
      280,
      600,
      280,
      25
    );


    /*
     * 현장명
     */

    whiteRect(
      page,
      125,
      555,
      190,
      28
    );


    /*
     * 주소
     */

    whiteRect(
      page,
      280,
      555,
      290,
      28
    );


    /*
     * 승강기 번호
     */

    whiteRect(
      page,
      125,
      510,
      180,
      28
    );


    /*
     * 발생일시
     */

    whiteRect(
      page,
      330,
      505,
      235,
      35
    );


    /*
     * 신고내용
     */

    whiteRect(
      page,
      120,
      285,
      440,
      170
    );


    /*
     * 원인 및 조치내용
     */

    whiteRect(
      page,
      120,
      90,
      440,
      190
    );


    /*
     * 작성자
     */

    whiteRect(
      page,
      320,
      700,
      100,
      45
    );


    /*
     * 보고 / 미보고 제거
     */

    whiteRect(
      page,
      45,
      720,
      130,
      75
    );


    /*
     * =====================================================
     * 값 입력
     * =====================================================
     */

    drawText(
      page,
      reporterName,
      128,
      604,
      11,
      font
    );


    drawText(
      page,
      reporterPhone,
      282,
      604,
      11,
      font
    );


    drawText(
      page,
      siteName,
      128,
      560,
      11,
      font
    );


    /*
     * 주소
     * 길어지면 자동 줄바꿈
     */
    const addressLines =
      wrapText(
        address,
        font,
        9,
        275
      );

    let addressY = 568;

    for (
      const line
      of addressLines.slice(0, 2)
    ) {

      drawText(
        page,
        line,
        282,
        addressY,
        9,
        font
      );

      addressY -= 12;
    }


    drawText(
      page,
      formatElevatorNo(
        elevatorNo
      ),
      128,
      515,
      11,
      font
    );


    drawDateTime(
      page,
      occurredAt,
      300,
      515,
      9,
      font
    );


    /*
     * =====================================================
     * 신고내용
     *
     * 시간       내용
     *            내용
     *            내용
     *
     * 형태로 출력
     * =====================================================
     */

    drawReportContent(
      page,
      reportTime,
      reportContent,
      font
    );


    /*
     * =====================================================
     * 원인 및 조치내용
     * =====================================================
     */

    const causeLines =
      wrapText(
        causeAction,
        font,
        10,
        400
      );


    let causeY =
      255;


    for (
      const line
      of causeLines
    ) {

      if (
        causeY < 75
      ) {

        break;

      }


      drawText(
        page,
        line,
        128,
        causeY,
        10,
        font
      );


      causeY -=
        18;

    }


    /*
     * 작성자
     */

    drawText(
      page,
      writer,
      325,
      710,
      11,
      font
    );


    return await pdfDoc.save();

  }


  /* =======================================================
     다운로드
  ======================================================= */

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
        (
          safeFileName(
            siteName
          ) ||
          '승객갇힘'
        ) +
        '_' +
        (
          safeFileName(
            elevatorNo
          ) ||
          '보고서'
        ) +
        '_승객갇힘보고서.pdf';


      const a =
        document.createElement(
          'a'
        );


      a.href =
        url;


      a.download =
        fileName;


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


    } catch (error: any) {

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


  /* =======================================================
     미리보기
  ======================================================= */

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


    } catch (error: any) {

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


  /* =======================================================
     입력 변경
  ======================================================= */

  function handleSiteChange(
    value: string
  ) {

    setSiteName(
      value
    );


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


  function handleAddressChange(
    value: string
  ) {

    setAddress(
      value
    );


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


    const found =
      findRow(
        'elevator',
        formatted
      );


    if (found) {

      applyRow(
        found
      );

    }

  }


  /* =======================================================
     초기화
  ======================================================= */

  function resetForm() {

    setReporterName('');
    setReporterPhone('');
    setSiteName('');
    setAddress('');
    setElevatorNo('');
    setOccurredAt('');
    setReportTime('');
    setReportContent('');
    setCauseAction('');
    setWriter('');


    if (previewUrl) {

      URL.revokeObjectURL(
        previewUrl
      );

    }


    setPreviewUrl('');

  }


  /* =======================================================
     Render
  ======================================================= */

  return (

    <div
      className="
        w-full
        space-y-6
      "
    >

      {/* =================================================
          제목
      ================================================= */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:items-center
          sm:justify-between
          gap-4
        "
      >

        <div>

          <h1
            className="
              text-2xl
              sm:text-3xl
              font-bold
              text-white
            "
          >
            승객갇힘 보고서 작성
          </h1>

          <p
            className="
              text-sm
              text-slate-400
              mt-2
            "
          >
            승강기 번호 또는 현장 정보를 입력하면
            스프레드시트에서 현장 정보를 자동으로 불러옵니다.
          </p>

        </div>


        <button
          type="button"
          onClick={
            onBack
          }
          className="
            px-4
            py-2
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
          Sheet 상태
      ================================================= */}

      <div
        className="
          rounded-xl
          border
          border-slate-800
          bg-slate-900
          p-4
        "
      >

        {loadingSheet ? (

          <div
            className="
              text-sm
              text-slate-400
            "
          >
            스프레드시트 정보를 불러오는 중...
          </div>

        ) : sheetError ? (

          <div
            className="
              text-sm
              text-red-400
            "
          >
            스프레드시트 오류 :
            {' '}
            {sheetError}
          </div>

        ) : (

          <div
            className="
              text-sm
              text-emerald-400
            "
          >
            ✓ 현장정보 DB 연결 완료
            {' '}
            ({rows.length.toLocaleString()}건)
          </div>

        )}

      </div>


      {/* =================================================
          신고자
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-5
          sm:p-6
        "
      >

        <h2
          className="
            text-lg
            font-bold
            mb-5
          "
        >
          ① 신고자
        </h2>


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-4
          "
        >

          <Field
            label="성명"
            value={
              reporterName
            }
            onChange={
              setReporterName
            }
            placeholder="신고자 성명"
          />


          <Field
            label="연락처"
            value={
              reporterPhone
            }
            onChange={
              setReporterPhone
            }
            placeholder="010-0000-0000"
          />

        </div>

      </section>


      {/* =================================================
          현장 정보
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-5
          sm:p-6
        "
      >

        <h2
          className="
            text-lg
            font-bold
            mb-5
          "
        >
          ② 신고 현황
        </h2>


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-4
          "
        >

          <div>

            <label
              className="
                block
                text-sm
                font-semibold
                mb-2
              "
            >
              현장명
            </label>

            <input
              list="site-options"
              value={
                siteName
              }
              onChange={
                e =>
                  handleSiteChange(
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
              placeholder="현장명을 입력하거나 선택"
            />

          </div>


          <div>

            <label
              className="
                block
                text-sm
                font-semibold
                mb-2
              "
            >
              소재지
            </label>

            <input
              list="address-options"
              value={
                address
              }
              onChange={
                e =>
                  handleAddressChange(
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
              placeholder="주소"
            />

          </div>


          <div>

            <label
              className="
                block
                text-sm
                font-semibold
                mb-2
              "
            >
              승강기 번호
            </label>

            <input
              list="elevator-options"
              value={
                elevatorNo
              }
              onChange={
                e =>
                  handleElevatorChange(
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
              placeholder="0000-000"
            />

          </div>


          <Field
            label="발생 일시"
            type="datetime-local"
            value={
              occurredAt
            }
            onChange={
              setOccurredAt
            }
          />

        </div>


        <datalist
          id="site-options"
        >

          {siteOptions.map(
            site => (

              <option
                key={site}
                value={site}
              />

            )
          )}

        </datalist>


        <datalist
          id="address-options"
        >

          {addressOptions.map(
            addressValue => (

              <option
                key={addressValue}
                value={addressValue}
              />

            )
          )}

        </datalist>


        <datalist
          id="elevator-options"
        >

          {elevatorOptions.map(
            elevator => (

              <option
                key={elevator}
                value={elevator}
              />

            )
          )}

        </datalist>

      </section>


      {/* =================================================
          신고내용
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-5
          sm:p-6
        "
      >

        <h2
          className="
            text-lg
            font-bold
            mb-5
          "
        >
          ③ 신고내용
        </h2>


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-[150px_1fr]
            gap-4
          "
        >

          <Field
            label="시간"
            type="time"
            value={
              reportTime
            }
            onChange={
              setReportTime
            }
          />


          <div>

            <label
              className="
                block
                text-sm
                font-semibold
                mb-2
              "
            >
              내용
            </label>

            <textarea
              value={
                reportContent
              }
              onChange={
                e =>
                  setReportContent(
                    e.target.value
                  )
              }
              rows={7}
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
                '신고내용을 입력하세요.'
              }
            />

          </div>

        </div>

      </section>


      {/* =================================================
          원인 및 조치
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-5
          sm:p-6
        "
      >

        <h2
          className="
            text-lg
            font-bold
            mb-5
          "
        >
          ④ 원인 및 조치내용
        </h2>


        <textarea
          value={
            causeAction
          }
          onChange={
            e =>
              setCauseAction(
                e.target.value
              )
          }
          rows={8}
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
          placeholder="원인 및 조치내용을 입력하세요."
        />

      </section>


      {/* =================================================
          작성자
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-5
          sm:p-6
        "
      >

        <h2
          className="
            text-lg
            font-bold
            mb-5
          "
        >
          ⑤ 작성자
        </h2>


        <Field
          label="작성자"
          value={
            writer
          }
          onChange={
            setWriter
          }
          placeholder="작성자 이름"
        />

      </section>


      {/* =================================================
          버튼
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-5
          sm:p-6
        "
      >

        <div
          className="
            flex
            flex-wrap
            gap-3
          "
        >

          <button
            type="button"
            disabled={
              generating
            }
            onClick={
              handlePreview
            }
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
            disabled={
              generating
            }
            onClick={
              handleDownload
            }
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
            onClick={
              resetForm
            }
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
          Preview
      ================================================= */}

      {previewUrl && (

        <section
          className="
            rounded-2xl
            border
            border-slate-800
            bg-slate-900
            p-3
          "
        >

          <iframe
            src={
              previewUrl
            }
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
   공통 Field
========================================================= */

interface FieldProps {

  label: string;

  value: string;

  onChange:
    (value: string) => void;

  placeholder?: string;

  type?: string;

}


function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: FieldProps) {

  return (

    <div>

      <label
        className="
          block
          text-sm
          font-semibold
          mb-2
        "
      >
        {label}
      </label>


      <input
        type={
          type
        }
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        placeholder={
          placeholder
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