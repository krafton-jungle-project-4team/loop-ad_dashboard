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
