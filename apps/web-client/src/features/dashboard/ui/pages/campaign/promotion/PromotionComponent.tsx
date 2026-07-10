import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { EmptyState } from "../../../shared/EmptyState.js";
import { EntityWorkspaceShell } from "../../../shared/EntityWorkspace.js";
import { PromotionAddDialog } from "./components/PromotionDialogs.js";
import {
  PromotionChromeTabs,
  PromotionEmptyState,
  PromotionTabWorkspace
} from "./components/PromotionWorkspaceContent.js";
import type { PromotionWorkspaceMode } from "./promotionUtils.js";
import { usePromotionWorkspaceController } from "./usePromotionWorkspaceController.js";

export function PromotionWorkspace({
  data,
  mode = "promotion",
  query
}: {
  data: DashboardMain;
  mode?: PromotionWorkspaceMode;
  query: DashboardQuery;
}) {
  const controller = usePromotionWorkspaceController({ data, mode, query });
  const {
    approveContentCandidateMutation,
    archiveScopedSegmentMutation,
    buildPromotionRunAssignmentsMutation,
    campaignDetail,
    confirmSuggestionsMutation,
    createNextLoopMutation,
    createPromotionMutation,
    createPromotionRunMutation,
    createScopedSegmentMutation,
    decideSuggestionMutation,
    deleteConfirmedSegmentMutation,
    deletePromotionMutation,
    dispatchPromotionRunMutation,
    evaluatePromotionRunMutation,
    isAddDialogOpen,
    openPromotions,
    promotionAnalysisIsPending,
    rejectContentCandidateMutation,
    scopedSegmentDefinitions,
    segmentDetail,
    segmentSuggestions,
    selectPromotion,
    selectSegment,
    selectedCampaign,
    selectedOpenPromotion,
    selectedPromotionSegmentId,
    selectedPromotionSegments,
    setIsAddDialogOpen,
    setWorkspaceTab,
    startAdExperimentMutation,
    startGenerationMutation,
    startPromotionAnalysis,
    visibleTabs,
    workspaceTab
  } = controller;

  return (
    <EntityWorkspaceShell
      chrome={
        mode === "promotion" ? (
          <PromotionChromeTabs
            onAdd={() => setIsAddDialogOpen(true)}
            onClosePromotion={(promotionId) => deletePromotionMutation.mutate(promotionId)}
            onSelectPromotion={(promotionId) => selectPromotion(promotionId)}
            openPromotions={openPromotions}
            selectedPromotionId={selectedOpenPromotion?.promotion_id ?? ""}
          />
        ) : null
      }
    >
      {!selectedCampaign ? <EmptyState message="프로모션을 관리할 캠페인을 선택해주세요." /> : null}
      {selectedCampaign && campaignDetail.isLoading ? (
        <EmptyState message="프로모션 데이터를 불러오는 중입니다." />
      ) : null}
      {campaignDetail.data ? (
        <>
          {openPromotions.length === 0 ? (
            mode === "promotion" ? (
              <PromotionEmptyState onAdd={() => setIsAddDialogOpen(true)} />
            ) : (
              <EmptyState
                message={
                  mode === "promotionMetrics"
                    ? "통계를 확인할 프로모션을 먼저 선택해주세요."
                    : "세그먼트를 관리할 프로모션을 먼저 선택해주세요."
                }
              />
            )
          ) : null}
          {selectedOpenPromotion ? (
            <PromotionTabWorkspace
              approveContentCandidateIsPending={approveContentCandidateMutation.isPending}
              archiveScopedSegmentIsPending={archiveScopedSegmentMutation.isPending}
              buildAssignmentsIsPending={buildPromotionRunAssignmentsMutation.isPending}
              confirmIsPending={confirmSuggestionsMutation.isPending}
              createNextLoopIsPending={createNextLoopMutation.isPending}
              createPromotionRunIsPending={createPromotionRunMutation.isPending}
              decideIsPending={decideSuggestionMutation.isPending}
              deleteConfirmedSegmentIsPending={deleteConfirmedSegmentMutation.isPending}
              dispatchPromotionRunIsPending={dispatchPromotionRunMutation.isPending}
              evaluatePromotionRunIsPending={evaluatePromotionRunMutation.isPending}
              evaluatePromotionRunResult={evaluatePromotionRunMutation.data ?? null}
              onArchiveScopedSegment={(segmentId) =>
                archiveScopedSegmentMutation.mutate({
                  promotionId: selectedOpenPromotion.promotion_id,
                  segmentId
                })
              }
              onApproveContentCandidate={(promotionId, segmentId, contentId) =>
                approveContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
              }
              onBuildAssignments={(promotionRunId) =>
                buildPromotionRunAssignmentsMutation.mutate(promotionRunId)
              }
              onConfirmSuggestions={() => confirmSuggestionsMutation.mutate()}
              onCreateNextLoop={(promotionRunId, failedSegmentIds, failedAdExperimentIds) =>
                createNextLoopMutation.mutate({
                  failedAdExperimentIds,
                  failedSegmentIds,
                  promotionRunId
                })
              }
              onCreatePromotionRun={(promotionId, analysisId, generationId) =>
                createPromotionRunMutation.mutate({ analysisId, generationId, promotionId })
              }
              onCreateScopedSegment={(form) => createScopedSegmentMutation.mutate(form)}
              onDecideSuggestion={(suggestionId, status) =>
                decideSuggestionMutation.mutate({ status, suggestionId })
              }
              onDeleteConfirmedSegment={(promotionId, segmentId) =>
                deleteConfirmedSegmentMutation.mutate({ promotionId, segmentId })
              }
              onDispatchPromotionRun={(promotionRunId) =>
                dispatchPromotionRunMutation.mutate(promotionRunId)
              }
              onEvaluatePromotionRun={(promotionRunId) =>
                evaluatePromotionRunMutation.mutate(promotionRunId)
              }
              onRejectContentCandidate={(promotionId, segmentId, contentId) =>
                rejectContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
              }
              onSelectSegment={selectSegment}
              onStartAdExperiment={(promotionId, adExperimentId) =>
                startAdExperimentMutation.mutate({ adExperimentId, promotionId })
              }
              onStartAnalysis={startPromotionAnalysis}
              onStartGeneration={(analysisId) =>
                startGenerationMutation.mutate({
                  analysisId,
                  promotionId: selectedOpenPromotion.promotion_id
                })
              }
              onTabChange={setWorkspaceTab}
              promotion={selectedOpenPromotion}
              promotionAnalysisIsPending={promotionAnalysisIsPending}
              promotionGenerationIsPending={startGenerationMutation.isPending}
              rejectContentCandidateIsPending={rejectContentCandidateMutation.isPending}
              scopedSegmentCreateIsPending={createScopedSegmentMutation.isPending}
              scopedSegments={scopedSegmentDefinitions.data?.segments ?? []}
              scopedSegmentsIsLoading={scopedSegmentDefinitions.isLoading}
              segments={selectedPromotionSegments}
              selectedSegmentDetail={segmentDetail.data}
              selectedSegmentDetailIsError={segmentDetail.isError}
              selectedSegmentDetailIsLoading={segmentDetail.isLoading}
              selectedSegmentId={selectedPromotionSegmentId}
              startAdExperimentIsPending={startAdExperimentMutation.isPending}
              suggestions={segmentSuggestions.data?.suggestions ?? []}
              suggestionsIsLoading={segmentSuggestions.isLoading}
              tab={workspaceTab}
              visibleTabs={visibleTabs}
            />
          ) : null}
          {mode === "promotion" ? (
            <PromotionAddDialog
              createIsPending={createPromotionMutation.isPending}
              onCreate={(form) => createPromotionMutation.mutate(form)}
              onOpenChange={setIsAddDialogOpen}
              open={isAddDialogOpen}
            />
          ) : null}
        </>
      ) : null}
    </EntityWorkspaceShell>
  );
}
