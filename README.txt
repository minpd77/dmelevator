# 갇힘보고서 수정본

## 변경사항

- PDF 입력 글씨 크기: 기존 10pt → 12pt
- 승강기 번호: 셀 왼쪽 시작점에 맞춰 정렬
- 작성자 입력 기능 제거
- 신고내용 시간/내용 분리 유지
- 24시간제 시간 선택 유지
- 전화번호 자동 형식화 유지
- 현장명/소재지/승강기번호 자동완성 유지
- 원인/조치 분리 유지
- 한글 PDF 폰트는 `public/fonts/NotoSansKR-Regular.otf`를 사용

## 폴더에 넣을 파일

프로젝트에 아래 구조로 넣으세요.

dmelevator/
  public/
    report-template.pdf
    fonts/
      NotoSansKR-Regular.otf
  src/
    components/
      TrappedReportSection.tsx

## 중요

한글 PDF는 PDF에 한글 폰트를 임베드해야 합니다.
현재 코드는 로컬 폰트 파일을 읽도록 되어 있습니다.

`public/fonts/NotoSansKR-Regular.otf`

파일이 반드시 있어야 합니다.

Noto Sans KR 공식 배포본:
https://github.com/notofonts/noto-cjk/tree/main/Sans/SubsetOTF/KR

## npm

이미 설치되어 있다면 다시 설치할 필요 없습니다.

필요한 패키지:
- pdf-lib
- @pdf-lib/fontkit

없다면:

npm install pdf-lib @pdf-lib/fontkit

그 다음:

npm run build
