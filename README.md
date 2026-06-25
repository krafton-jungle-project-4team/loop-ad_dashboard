# LoopAd Dashboard

LoopAd SaaS MVP 대시보드입니다. 로컬 개발에서는 Docker Postgres가 AuroraPostgres
역할을, Docker ClickHouse가 분석 이벤트 저장소 역할을 합니다. 운영에서는 env만
실제 AuroraPostgres/ClickHouse 주소로 바꿔 붙입니다.

## Structure

- `apps/web-client`: Mantine 기반 React 대시보드
- `apps/api-server`: Dashboard API 서버
- `packages/shared`: API contract와 공통 타입
- `compose.yml`: Postgres, ClickHouse, API, Web live server

## Run

```bash
npm install
docker compose up --build
```

Web: `http://localhost:5173`
API: `http://localhost:3100/api`
