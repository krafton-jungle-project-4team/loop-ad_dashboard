# LoopAd Dashboard

LoopAd SaaS MVP 대시보드입니다. 로컬 개발 데이터 소스는
`loop-ad_local-data-source_contract` repo에서 관리하고, 이 repo는 해당 contract의
endpoint를 env로 받아 Dashboard API와 Web client를 실행합니다.

## Structure

- `apps/web-client`: Mantine 기반 React 대시보드
- `apps/api-server`: Dashboard API 서버
- `packages/shared`: API contract와 공통 타입
- `compose.yml`: API, Web live server

## Work Units

이 repo는 monorepo이므로 작업 기준은 repo가 아니라 path와 배포 대상입니다.

- Dashboard API 작업: `apps/api-server/**` -> ECS `dev-dashboard-api`
- Dashboard Web 작업: `apps/web-client/**` -> S3/CloudFront `dashboard-web`
- Shared contract 작업: `packages/shared/**` -> API와 Web 모두 영향

## Run

로컬 데이터 소스는 `loop-ad_local-data-source_contract` repo에서 먼저 준비합니다.

```bash
./scripts/init.sh local
./scripts/dummy.sh local
```

팀 공통 로컬 endpoint는 Postgres `localhost:15432`, ClickHouse HTTP
`http://localhost:18123`, Redis `localhost:16379`입니다.

```bash
npm install
npm run dev
```

`npm run dev`는 shell, Docker Compose, 또는 배포 환경에서 주입된 env를 읽습니다.
로컬 개인 값은 `.env.local`이나 개인 shell 환경에서 관리하되, 앱 코드는 env 파일을
직접 로드하지 않습니다.

Web: `http://localhost:5173`
API: `http://localhost:8080/api`
