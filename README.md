MVP기준 API

1. 수집 현황 GET
2. 퍼널/세그먼트 분석 GET
3. 추천 생성 결과 GET / POST
4. 콘텐츠 생성 결과  GET / POST
5. 실험 성과 GET / POST


GET 5개
GET /api/dashboard/collection-status
GET /api/dashboard/funnel-segments
GET /api/dashboard/recommendation-results
GET /api/dashboard/content-results
GET /api/dashboard/experiment-performance
POST 3개
POST /api/dashboard/recommendations/generate
POST /api/dashboard/contents/generate
POST /api/dashboard/experiments/:experimentId/evaluate
