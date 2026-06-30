# shadcn-tanstack variant

## Implementation notes

- Replaced the Mantine runtime shell with local shadcn-like primitives built from Tailwind utilities, Radix Select/Tooltip, lucide icons, TanStack Router, TanStack Query, TanStack Table, Nuqs, and Recharts.
- Added TanStack Router paths for the five dashboard tabs:
  - `/dashboard/main`
  - `/dashboard/purchase-conversion`
  - `/dashboard/ai-analysis`
  - `/dashboard/ai-recommendation`
  - `/dashboard/ai-generation`
- Added Nuqs-managed URL state for `projectId`, `dateRange`, `selectedCustomerId`, `sort`, `filter`, `excludeInternalTraffic`, `excludeBotTraffic`, `userScope`, and `conversionEvent`.
- Redesigned analytics controls around a GA/PostHog-style model: project/date/refresh live in the sticky scope header, comparison chips and `기준별 보기` sit below the header, and the visible `데이터 기준` section owns traffic exclusion toggles, user scope, and conversion event criteria.
- Generalized visible controls around reusable analytics concepts: project scope, date range, 전체/신규/재방문/전환/미전환/상위 참여/이탈 가능 사용자 comparisons, generic `기준별 보기` options, URL-backed traffic criteria, active/new/returning/at-risk user scopes, conversion event selection, and engagement/conversion/drop-off sorting.
- TanStack Query calls `fetchDashboardPageResource`, which requests the Dashboard API over HTTP and sends the selected criteria as query params.
- Added a ViewModel layer in `features/dashboard/vm/dashboard-view-model.ts`. Screen components consume ViewModels and callbacks, not raw API response types.
- Server state is TanStack Query cache, URL state is Nuqs, and transient UI state remains local to components.
- Main, conversion journey, segment insights, opportunity insights, and insight library views all route through the shared dashboard shell.
- Loading, empty, error, and success states are represented. Loading skeletons are panel-owned and use the same broad grid/height structure as the success panels.

## Profiler placement and verification

Dev-only React Profiler wrappers are implemented in `apps/web-client/src/app/DevProfiler.tsx`.

Profiler ids:

- `AppShell`: wraps the dashboard shell and routed content area.
- `DashboardRoute`: wraps the route-level dashboard page.
- `DashboardNavigation`: wraps the tab navigation.
- `MainOverviewPanel`: wraps the main dashboard panel.
- `PurchaseConversionPanel`: wraps the purchase conversion panel.
- `InsightPanel`: wraps segment and opportunity insight panels.
- `LoadingSkeleton`: wraps the routed loading skeleton.

Verification:

- In dev mode, each profiler logs render metadata to `console.info("[profiler]", ...)`.
- The profiler also writes `performance.mark` and `performance.measure` entries named with the `loopad:<id>:<phase>:<commitTime>` pattern.
- No in-app profiler/debug panel is rendered.
- Loading to success was checked during screenshot capture against the Dashboard API.

## Screenshots

- Desktop success: `screenshots/desktop-main.png`
- Mobile success: `screenshots/mobile-purchase-conversion.png`
- Loading skeleton: `screenshots/loading-ai-analysis.png`

## Verification commands

- `npm run build -w @loopad/shared`
- `npm run typecheck -w @loopad/web-client`
- `npm run build -w @loopad/web-client`

Build result:

- Web build passed.
- Vite emitted a chunk-size warning: `dist/assets/index-*.js` is about 1 MB minified. This is expected risk for this variant because it combines TanStack Router/Query/Table, Recharts, Radix primitives, Tailwind runtime CSS generation, and the pre-existing Mantine dependencies still present in `@loopad/web-client`.

## Scorecard

- 운영형 SaaS 화면 완성도: 17/20
- 정보 밀도와 스캔 가능성: 13/15
- 유지보수 가능한 FE 아키텍처: 17/20
- UI/library ergonomics: 13/15
- skeleton/loading 상태 품질과 CLS 안정성: 13/15
- responsive/mobile 품질: 4/5
- React Profiler 기준 loading -> success 렌더링 안정성: 4/5
- dependency 비용과 장기 유지 리스크: 3/5
- total: 84/100
- adoption guidance: partial adoption
