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
    contentCandidateHtmlEditor,
    confirmSuggestionsMutation,
    createPromotionMutation,
    decideSuggestionMutation,
    deleteConfirmedSegmentMutation,
    deletePromotionMutation,
    dismissPromotionAnalysisError,
    editingPromotionId,
    isAddDialogOpen,
    launchPromotionExperimentMutation,
    openPromotions,
    promotionAnalysisErrorMessage,
    promotionAnalysisIsPending,
    promotionGenerationErrorMessage,
    promotionGenerationId,
    promotionGenerationIsPending,
    rejectContentCandidateMutation,
    recommendPromotionSegments,
    reviseContentCandidateHtmlMutation,
    scopedSegmentDefinitions,
    segmentDetail,
    segmentSuggestions,
    selectPromotion,
    selectSegment,
    selectSegmentView,
    selectedCampaign,
    selectedOpenPromotion,
    selectedSegmentIsOfferSetGenerationTarget,
    selectedPromotionSegmentId,
    selectedPromotionSegments,
    setIsAddDialogOpen,
    setEditingPromotionId,
    setWorkspaceTab,
    startGenerationMutation,
    visibleTabs,
    workspaceTab,
    updateContentCandidateCopyMutation,
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
                  ? "고객군을 관리할 프로모션을 선택해 주세요."
                  : "성과를 확인할 프로모션을 선택해 주세요."
              }
            />
          ) : null}
          {selectedOpenPromotion && !isManagementView ? (
            <PromotionTabWorkspace
              approveContentCandidateIsPending={approveContentCandidateMutation.isPending}
              archiveScopedSegmentIsPending={archiveScopedSegmentMutation.isPending}
              contentCandidateHtmlEditor={contentCandidateHtmlEditor}
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
              onConfirmSuggestions={async (segmentIds) => {
                await confirmSuggestionsMutation.mutateAsync(segmentIds);
              }}
              onDecideSuggestion={(suggestionId, status) =>
                decideSuggestionMutation.mutate({ status, suggestionId })
              }
              onDeleteConfirmedSegment={(promotionId, segmentId) =>
                deleteConfirmedSegmentMutation.mutate({ promotionId, segmentId })
              }
              onDismissPromotionAnalysisError={dismissPromotionAnalysisError}
              onLaunchExperiment={(
                promotionId,
                segmentId,
                analysisId,
                generationId,
                loopCount,
                nextLoopPreparationId
              ) =>
                launchPromotionExperimentMutation.mutate({
                  analysisId,
                  generationId,
                  loopCount,
                  nextLoopPreparationId,
                  promotionId,
                  segmentId
                })
              }
              onRejectContentCandidate={(promotionId, segmentId, contentId) =>
                rejectContentCandidateMutation.mutate({ contentId, promotionId, segmentId })
              }
              onReviseContentCandidateHtml={async (promotionId, segmentId, contentId, feedback) => {
                await reviseContentCandidateHtmlMutation.mutateAsync({
                  contentId,
                  feedback,
                  promotionId,
                  segmentId
                });
              }}
              onSelectSegment={selectSegment}
              onSegmentViewChange={selectSegmentView}
              onRecommendSegments={recommendPromotionSegments}
              onStartGeneration={(analysisId, segmentId, regenerate) =>
                startGenerationMutation.mutate({
                  analysisId,
                  promotionId: selectedOpenPromotion.promotion_id,
                  regenerate,
                  segmentId
                })
              }
              onTabChange={setWorkspaceTab}
              onUpdateContentCandidateCopy={async (
                promotionId,
                segmentId,
                contentId,
                requestBody
              ) => {
                await updateContentCandidateCopyMutation.mutateAsync({
                  contentId,
                  promotionId,
                  requestBody,
                  segmentId
                });
              }}
              promotion={selectedOpenPromotion}
              promotionExperiments={campaignDetail.data.ad_experiments.filter(
                (experiment) => experiment.promotion_id === selectedOpenPromotion.promotion_id
              )}
              promotionAnalysisIsPending={promotionAnalysisIsPending}
              promotionAnalysisErrorMessage={promotionAnalysisErrorMessage}
              promotionGenerationErrorMessage={promotionGenerationErrorMessage}
              promotionGenerationId={promotionGenerationId}
              promotionGenerationIsPending={promotionGenerationIsPending}
              rejectContentCandidateIsPending={rejectContentCandidateMutation.isPending}
              reviseContentCandidateHtmlIsPending={reviseContentCandidateHtmlMutation.isPending}
              scopedSegments={scopedSegmentDefinitions.data?.segments ?? []}
              scopedSegmentsIsLoading={scopedSegmentDefinitions.isLoading}
              segmentView={query.segmentView}
              segments={selectedPromotionSegments}
              selectedSegmentDetail={segmentDetail.data}
              selectedSegmentDetailIsError={segmentDetail.isError}
              selectedSegmentDetailIsLoading={segmentDetail.isLoading}
              selectedSegmentId={selectedPromotionSegmentId}
              selectedSegmentIsOfferSetGenerationTarget={selectedSegmentIsOfferSetGenerationTarget}
              launchExperimentIsPending={launchPromotionExperimentMutation.isPending}
              launchExperimentError={launchPromotionExperimentMutation.error}
              launchExperimentIsError={launchPromotionExperimentMutation.isError}
              launchExperimentResult={launchPromotionExperimentMutation.data ?? null}
              suggestions={segmentSuggestions.data?.suggestions ?? []}
              audienceAllocationPreviewContext={
                segmentSuggestions.data?.audience_allocation_preview_context ?? null
              }
              suggestionsIsLoading={segmentSuggestions.isLoading}
              tab={workspaceTab}
              updateContentCandidateCopyIsPending={updateContentCandidateCopyMutation.isPending}
              visibleTabs={visibleTabs}
            />
          ) : null}
          {mode === "promotion" ? (
            <>
              <PromotionAddDialog
                campaign={selectedCampaign}
                createIsPending={createPromotionMutation.isPending}
                onCreate={(form) => createPromotionMutation.mutate(form)}
                onOpenChange={setIsAddDialogOpen}
                open={isAddDialogOpen}
                query={query}
              />
              <PromotionEditDialog
                campaign={selectedCampaign}
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
                query={query}
              />
            </>
          ) : null}
        </>
      ) : null}
    </EntityWorkspaceShell>
  );
}
