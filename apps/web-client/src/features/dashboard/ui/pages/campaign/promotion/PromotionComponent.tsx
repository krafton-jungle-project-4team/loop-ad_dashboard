import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { useState } from "react";
import { EmptyState } from "../../../shared/EmptyState.js";
import { EntityWorkspaceShell } from "../../../shared/EntityWorkspace.js";
import {
  PromotionAddDialog,
  PromotionEditDialog,
  SegmentEditDialog
} from "./components/PromotionDialogs.js";
import {
  PromotionManagementList,
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
  const [promotionFilter, setPromotionFilter] = useState("");
  const {
    approveContentCandidateMutation,
    archiveScopedSegmentMutation,
    campaignDetail,
    confirmSuggestionsMutation,
    createNextLoopMutation,
    createPromotionMutation,
    createScopedSegmentMutation,
    decideSuggestionMutation,
    deleteConfirmedSegmentMutation,
    deletePromotionMutation,
    editingPromotionId,
    editingSegmentId,
    evaluatePromotionRunMutation,
    isAddDialogOpen,
    launchPromotionExperimentMutation,
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
    setEditingPromotionId,
    setEditingSegmentId,
    setWorkspaceTab,
    startGenerationMutation,
    startPromotionAnalysis,
    visibleTabs,
    workspaceTab,
    updatePromotionMutation,
    updateConfirmedSegmentMutation
  } = controller;
  const isManagementView = mode === "promotion" && query.promotionView === "manage";
  const filteredPromotions = openPromotions.filter((promotion) =>
    `${promotion.marketing_theme} ${promotion.channel}`
      .toLocaleLowerCase()
      .includes(promotionFilter.trim().toLocaleLowerCase())
  );

  return (
    <EntityWorkspaceShell>
      {!selectedCampaign ? <EmptyState message="프로모션을 관리할 캠페인을 선택해주세요." /> : null}
      {selectedCampaign && campaignDetail.isLoading ? (
        <EmptyState message="프로모션 데이터를 불러오는 중입니다." />
      ) : null}
      {campaignDetail.data ? (
        <>
          {isManagementView && openPromotions.length > 0 ? (
            <PromotionManagementList
              filter={promotionFilter}
              onAdd={() => setIsAddDialogOpen(true)}
              onEditPromotion={setEditingPromotionId}
              onFilterChange={setPromotionFilter}
              onSelectPromotion={(promotionId) => selectPromotion(promotionId)}
              onStopPromotion={(promotionId) => deletePromotionMutation.mutate(promotionId)}
              openPromotions={filteredPromotions}
            />
          ) : null}
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
          {selectedOpenPromotion && !isManagementView ? (
            <PromotionTabWorkspace
              approveContentCandidateIsPending={approveContentCandidateMutation.isPending}
              archiveScopedSegmentIsPending={archiveScopedSegmentMutation.isPending}
              confirmIsPending={confirmSuggestionsMutation.isPending}
              createNextLoopIsPending={createNextLoopMutation.isPending}
              decideIsPending={decideSuggestionMutation.isPending}
              deleteConfirmedSegmentIsPending={deleteConfirmedSegmentMutation.isPending}
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
              onConfirmSuggestions={() => confirmSuggestionsMutation.mutate()}
              onCreateNextLoop={(promotionRunId, failedSegmentIds, failedAdExperimentIds) =>
                createNextLoopMutation.mutate({
                  failedAdExperimentIds,
                  failedSegmentIds,
                  promotionRunId
                })
              }
              onCreateScopedSegment={(form) => createScopedSegmentMutation.mutate(form)}
              onDecideSuggestion={(suggestionId, status) =>
                decideSuggestionMutation.mutate({ status, suggestionId })
              }
              onDeleteConfirmedSegment={(promotionId, segmentId) =>
                deleteConfirmedSegmentMutation.mutate({ promotionId, segmentId })
              }
              onEvaluatePromotionRun={(promotionRunId) =>
                evaluatePromotionRunMutation.mutate(promotionRunId)
              }
              onEditConfirmedSegment={setEditingSegmentId}
              onLaunchExperiment={(promotionId, analysisId, generationId) =>
                launchPromotionExperimentMutation.mutate({
                  analysisId,
                  generationId,
                  promotionId
                })
              }
              onRejectContentCandidate={(promotionId, segmentId, contentId) =>
                rejectContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
              }
              onSelectSegment={selectSegment}
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
              segmentView={query.segmentView}
              segments={selectedPromotionSegments}
              selectedSegmentDetail={segmentDetail.data}
              selectedSegmentDetailIsError={segmentDetail.isError}
              selectedSegmentDetailIsLoading={segmentDetail.isLoading}
              selectedSegmentId={selectedPromotionSegmentId}
              launchExperimentIsPending={launchPromotionExperimentMutation.isPending}
              suggestions={segmentSuggestions.data?.suggestions ?? []}
              suggestionsIsLoading={segmentSuggestions.isLoading}
              tab={workspaceTab}
              visibleTabs={visibleTabs}
            />
          ) : null}
          {mode === "promotion" ? (
            <>
              <PromotionAddDialog
                createIsPending={createPromotionMutation.isPending}
                onCreate={(form) => createPromotionMutation.mutate(form)}
                onOpenChange={setIsAddDialogOpen}
                open={isAddDialogOpen}
              />
              <PromotionEditDialog
                isPending={updatePromotionMutation.isPending}
                onOpenChange={(open) => {
                  if (!open) {
                    setEditingPromotionId(null);
                  }
                }}
                onUpdate={(requestBody) => {
                  if (editingPromotionId) {
                    updatePromotionMutation.mutate({
                      promotionId: editingPromotionId,
                      requestBody
                    });
                  }
                }}
                open={Boolean(editingPromotionId)}
                promotion={openPromotions.find(
                  (promotion) => promotion.promotion_id === editingPromotionId
                )}
              />
            </>
          ) : null}
          {mode === "segment" ? (
            <SegmentEditDialog
              isPending={updateConfirmedSegmentMutation.isPending}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingSegmentId(null);
                }
              }}
              onUpdate={(requestBody) => {
                if (editingSegmentId && selectedOpenPromotion) {
                  updateConfirmedSegmentMutation.mutate({
                    promotionId: selectedOpenPromotion.promotion_id,
                    requestBody,
                    segmentId: editingSegmentId
                  });
                }
              }}
              open={Boolean(editingSegmentId)}
              segment={selectedPromotionSegments.find(
                (segment) => segment.segment_id === editingSegmentId
              )}
            />
          ) : null}
        </>
      ) : null}
    </EntityWorkspaceShell>
  );
}
