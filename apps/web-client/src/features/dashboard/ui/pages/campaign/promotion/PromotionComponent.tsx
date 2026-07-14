import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { useState } from "react";
import { EmptyState } from "../../../shared/EmptyState.js";
import { EntityWorkspaceShell } from "../../../shared/EntityWorkspace.js";
import { PromotionAddDialog, PromotionEditDialog } from "./components/PromotionDialogs.js";
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
    createPromotionMutation,
    createScopedSegmentMutation,
    decideSuggestionMutation,
    deleteConfirmedSegmentMutation,
    deletePromotionMutation,
    editingPromotionId,
    isAddDialogOpen,
    launchPromotionExperimentMutation,
    openPromotions,
    promotionAnalysisIsPending,
    promotionGenerationIsPending,
    rejectContentCandidateMutation,
    recommendPromotionSegments,
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
    setWorkspaceTab,
    startGenerationMutation,
    visibleTabs,
    workspaceTab,
    updatePromotionMutation
  } = controller;
  const isManagementView = mode === "promotion" && query.promotionView === "manage";
  const filteredPromotions = openPromotions.filter((promotion) =>
    `${promotion.marketing_theme} ${promotion.channel}`
      .toLocaleLowerCase()
      .includes(promotionFilter.trim().toLocaleLowerCase())
  );

  return (
    <EntityWorkspaceShell>
      {!selectedCampaign ? <EmptyState message="먼저 캠페인을 선택해 주세요." /> : null}
      {selectedCampaign && campaignDetail.isLoading ? (
        <EmptyState message="프로모션을 불러오는 중이에요." />
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
              onDeletePromotion={(promotionId) => deletePromotionMutation.mutate(promotionId)}
              openPromotions={filteredPromotions}
            />
          ) : null}
          {openPromotions.length === 0 ? (
            mode === "promotion" ? (
              <PromotionEmptyState onAdd={() => setIsAddDialogOpen(true)} />
            ) : (
              <EmptyState message="먼저 프로모션을 선택해 주세요." />
            )
          ) : null}
          {openPromotions.length > 0 && !isManagementView && !selectedOpenPromotion ? (
            <EmptyState
              message={
                mode === "segment"
                  ? "세그먼트를 관리할 프로모션을 선택해 주세요."
                  : "성과를 확인할 프로모션을 선택해 주세요."
              }
            />
          ) : null}
          {selectedOpenPromotion && !isManagementView ? (
            <PromotionTabWorkspace
              approveContentCandidateIsPending={approveContentCandidateMutation.isPending}
              archiveScopedSegmentIsPending={archiveScopedSegmentMutation.isPending}
              confirmIsPending={confirmSuggestionsMutation.isPending}
              decideIsPending={decideSuggestionMutation.isPending}
              deleteConfirmedSegmentIsPending={deleteConfirmedSegmentMutation.isPending}
              onArchiveScopedSegment={(segmentId) =>
                archiveScopedSegmentMutation.mutate({
                  promotionId: selectedOpenPromotion.promotion_id,
                  segmentId
                })
              }
              onContentCandidateSelectionChange={(promotionId, segmentId, contentId, selected) =>
                approveContentCandidateMutation.mutate({
                  contentId,
                  promotionId,
                  segmentId,
                  selected
                })
              }
              onConfirmSuggestions={() => confirmSuggestionsMutation.mutate()}
              onCreateScopedSegment={(form) => createScopedSegmentMutation.mutate(form)}
              onDecideSuggestion={(suggestionId, status) =>
                decideSuggestionMutation.mutate({ status, suggestionId })
              }
              onDeleteConfirmedSegment={(promotionId, segmentId) =>
                deleteConfirmedSegmentMutation.mutate({ promotionId, segmentId })
              }
              onLaunchExperiment={(promotionId, segmentId, analysisId, generationId) =>
                launchPromotionExperimentMutation.mutate({
                  analysisId,
                  generationId,
                  promotionId,
                  segmentId
                })
              }
              onRejectContentCandidate={(promotionId, segmentId, contentId) =>
                rejectContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
              }
              onSelectSegment={selectSegment}
              onRecommendSegments={recommendPromotionSegments}
              onStartGeneration={(analysisId) =>
                startGenerationMutation.mutate({
                  analysisId,
                  promotionId: selectedOpenPromotion.promotion_id
                })
              }
              onTabChange={setWorkspaceTab}
              promotion={selectedOpenPromotion}
              promotionExperiments={campaignDetail.data.ad_experiments.filter(
                (experiment) => experiment.promotion_id === selectedOpenPromotion.promotion_id
              )}
              promotionAnalysisIsPending={promotionAnalysisIsPending}
              promotionGenerationIsPending={promotionGenerationIsPending}
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
              launchExperimentError={launchPromotionExperimentMutation.error}
              launchExperimentIsError={launchPromotionExperimentMutation.isError}
              launchExperimentResult={launchPromotionExperimentMutation.data ?? null}
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
        </>
      ) : null}
    </EntityWorkspaceShell>
  );
}
