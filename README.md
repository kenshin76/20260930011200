# 시멘트 제조 협회 통계시스템 웹 개편 — 제안 자료 (위시켓 158558)

발주처 전달용 정적 웹 자료 두 개를 한 저장소에 담고, **주소로 분기**해 공개합니다.

| 주소 | 자료 |
| --- | --- |
| `/` | 두 자료를 안내하는 첫 화면 |
| `/proposal/` | **웹 제안서** — 제출 제안서를 10개 섹션과 부록으로 요약 |
| `/prototype/` | **시멘트 통계 포털 화면** — 회원사 12 · 협회 15, 27화면을 눌러 볼 수 있는 시연본 |

배포 주소는 `https://kenshin76.github.io/20260930011200/` 입니다.

- 웹 제안서 — `https://kenshin76.github.io/20260930011200/proposal/`
- 프로토타입 — `https://kenshin76.github.io/20260930011200/prototype/`
  (회원사 로그인 `.../prototype/#/m/login` · 협회 로그인 `.../prototype/#/a/login`)

## 배포

`main` 브랜치에 push 하면 GitHub Actions 가 저장소 전체를 GitHub Pages 로 올립니다.
빌드 단계가 없습니다 — 두 자료 모두 정적 HTML·CSS·JS 입니다.

```
.github/workflows/pages.yml   configure-pages 의 enablement: true 로 첫 실행에 Pages 가 켜집니다
.nojekyll                     Jekyll 처리를 끕니다 (밑줄로 시작하는 경로 보호)
404.html                      잘못된 주소에서 두 자료로 안내합니다
```

첫 push 이후 **Settings → Pages → Source 가 "GitHub Actions"** 인지 한 번 확인해 주십시오.

웹 폰트(Pretendard)만 `cdn.jsdelivr.net` 에서 불러옵니다. 차단된 망에서도 시스템 글꼴로 정상 표시됩니다.
프로토타입의 엑셀 읽기 라이브러리(SheetJS 0.20.3, Apache 2.0)는 `prototype/assets/vendor/` 에 포함되어 있어 외부에서 불러오지 않습니다.

## 저장소에 올라가지 않는 것

`.gitignore` 로 아래를 제외합니다. **제안 금액 산정 근거·단가·인력 참여율이 상수로 들어 있는 내부 문서**이기 때문입니다.

- 저장소 루트의 모든 `.md` (이 README 만 예외) — `제안서.md`
- 검증 스크립트 `verify.py` · `verify_*.py` · `t_*.js` (`prototype/t_check.js` 포함)
- `.docx` · `.pptx` · `.xlsx` · `.pdf` · `design/`
- macOS·편집기 생성 파일 (`.DS_Store` 등)

파일명을 하나씩 나열하지 않고 **「루트의 .md 전부 제외 + README 만 허용」**으로 둔 이유는,
macOS 가 한글 파일명을 자모 분해형(NFD)으로 저장해 결합형(NFC)으로 적은 패턴이 빗나갈 수 있기 때문입니다.
`proposal/README.md` · `prototype/README.md` 는 하위 폴더에 있으므로 함께 올라갑니다.

## 두 자료의 관계

**모든 수치의 단일 출처는 `제안서.md` 입니다.** 웹 제안서는 그 내용을 재배열·요약한 것이고,
프로토타입은 제안서 §7-13 「화면 구성」의 27화면을 구현한 것입니다.
값이 서로 다르면 **제출 제안서가 맞습니다.**

| 항목 | 값 |
| --- | --- |
| 제안 금액 | 75,000,000원 (부가세 별도) |
| 수행 기간 | 145일 · 2026-11-16 ~ 2027-04-09 (발주 150일 대비 5일 여유) |
| 총 투입량 | 300.0 MD · 10.00 MM · 8명 |
| 화면 구성 | 27개 (회원사 12 · 협회 15) |

## 공개 범위 주의

GitHub Pages 는 저장소가 Private 이어도 무료 플랜에서 **페이지가 공개**됩니다.
모든 페이지에 `noindex` 를 넣어 검색 노출은 막았지만 **주소를 아는 사람은 누구나 열 수 있습니다.**
웹 제안서에는 **제안 금액·MD 단가·인력 참여율**이 들어 있으므로 **발주처 담당자에게만** 전달해 주십시오.
