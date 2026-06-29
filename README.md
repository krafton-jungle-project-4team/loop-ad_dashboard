# MVP기준 API

1. 수집 현황 GET
2. 퍼널/세그먼트 분석 GET
3. 추천 생성 결과 GET / POST
4. 콘텐츠 생성 결과  GET / POST
5. 실험 성과 GET / POST


## GET 5개 <br>
GET /api/dashboard/collection-status<br>
GET /api/dashboard/funnel-segments<br>
GET /api/dashboard/recommendation-results<br>
GET /api/dashboard/content-results<br>
GET /api/dashboard/experiment-performance<br>
## POST 3개<br>
POST /api/dashboard/recommendations/generate<br>
POST /api/dashboard/contents/generate<br>
POST /api/dashboard/experiments/:experimentId/evaluate<br>


### 탭 클릭(GET)
-> 프론트가 Dashboard Backend에 GET
-> Backend가 Postgres/ClickHouse 조회
-> 화면 표시

### 버튼 클릭(POST)
-> 프론트가 Dashboard Backend에 POST
-> Backend가 AI/콘텐츠 서버에 POST 전달
-> AI/콘텐츠 서버가 작업 후 Postgres 갱신
-> Backend가 completed 응답
-> 프론트가 같은 탭 GET 자동 재호출
-> 최신 결과 화면 표시
