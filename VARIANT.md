# shadcn-tanstack variant

## Implementation notes

- Replaced the Mantine runtime shell with local shadcn-like primitives built from Tailwind utilities, Radix Select/Tooltip, lucide icons, TanStack Router, TanStack Query, TanStack Table, Nuqs, and Recharts.
- Added TanStack Router paths for the five dashboard tabs:
  - `/dashboard/main`
  - `/dashboard/purchase-conversion`
  - `/dashboard/ai-analysis`
  - `/dashboard/ai-recommendation`
  - `/dashboard/ai-generation`
- Added Nuqs-managed URL state for `projectId`, `dateRange`, `selectedCustomerId`, `sort`, and `filter`.
- Redesigned analytics controls around a GA/PostHog-style model: campaign/date/refresh live in the sticky scope header, comparison chips and breakdown/filter chips sit below the header, and customer search/sort controls moved into the customer table panels.
- Added a data source boundary in `features/dashboard/api/dashboard-api.ts`. TanStack Query calls `fetchDashboardPageResource`, which chooses fixture or HTTP behind the same function.
- Added fixture resources in `features/dashboard/data/dashboard-fixtures.ts` so the variant runs without backend availability.
- Added a ViewModel layer in `features/dashboard/vm/dashboard-view-model.ts`. Screen components consume ViewModels and callbacks, not raw API response types.
- Server state is TanStack Query cache, URL state is Nuqs, and transient UI state remains local to components.
- Main, purchase conversion, AI analysis, AI recommendation, and AI generation all route through the shared dashboard shell.
- Loading, empty, error, and success states are represented. Loading skeletons are panel-owned and use the same broad grid/height structure as the success panels.

## Profiler placement and verification

Dev-only React Profiler wrappers are implemented in `apps/web-client/src/app/DevProfiler.tsx`.

Profiler ids:

- `AppShell`: wraps the dashboard shell and routed content area.
- `DashboardRoute`: wraps the route-level dashboard page.
- `DashboardNavigation`: wraps the tab navigation.
- `MainOverviewPanel`: wraps the main dashboard panel.
- `PurchaseConversionPanel`: wraps the purchase conversion panel.
- `InsightPanel`: wraps AI analysis and AI recommendation panels.
- `LoadingSkeleton`: wraps the routed loading skeleton.

Verification:

- In dev mode, each profiler logs render metadata to `console.info("[profiler]", ...)`.
- The profiler also writes `performance.mark` and `performance.measure` entries named with the `loopad:<id>:<phase>:<commitTime>` pattern.
- No in-app profiler/debug panel is rendered.
- Loading to success was checked during screenshot capture with fixture latency set to `VITE_LOOPAD_FIXTURE_LATENCY_MS=5000`.

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
- recommendation: 부분 채택 추천
