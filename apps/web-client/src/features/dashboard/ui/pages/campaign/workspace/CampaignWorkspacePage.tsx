import type {
  DashboardCampaignPromotion,
  DashboardCampaignSummary,
  DashboardMain,
  DashboardUpdatePromotionRequest
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@loopad/ui/shadcn/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  createDashboardCampaign,
  createDashboardPromotion,
  deleteDashboardCampaign,
  deleteDashboardPromotion,
  fetchDashboardCampaignDetail,
  updateDashboardCampaign,
  updateDashboardPromotion
} from "../../../../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../../../../model/dashboard-format.js";
import {
  formatChannelLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../../../../model/dashboard-labels.js";
import { useDashboardQueryState } from "../../../../model/dashboard-query.js";
import { dashboardCampaignDetailQueryKey } from "../../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { DashboardDateRangeSelect } from "../../../shared/DashboardDateRangeSelect.js";
import { EmptyState } from "../../../shared/EmptyState.js";
import { CampaignPerformanceSections } from "../CampaignPerformanceSections.js";
import { CampaignFormDialog } from "../components/CampaignFormDialog.js";
import { PromotionWorkspace } from "../promotion/PromotionComponent.js";
import {
  PromotionAddDialog,
  PromotionEditDialog
} from "../promotion/components/PromotionDialogs.js";
import {
  mutationErrorMessage,
  promotionCreateFormToRequest,
  statusBadgeVariant,
  uniquePromotionsById,
  type PromotionCreateFormState
} from "../promotion/promotionUtils.js";
import { EntityCardGrid } from "./EntityCardGrid.js";
import { HierarchyBreadcrumbs } from "./HierarchyBreadcrumbs.js";
import type {
  CampaignWorkspaceEntityCard,
  CampaignWorkspaceHierarchyItem
} from "./campaign-workspace-types.js";

type CampaignFormDialogState = { mode: "create" } | { campaignId: string; mode: "edit" } | null;

type CampaignCard = CampaignWorkspaceEntityCard & {
  campaign: DashboardCampaignSummary;
  kind: "campaign";
};

type PromotionCard = CampaignWorkspaceEntityCard & {
  kind: "promotion";
  promotion: DashboardCampaignPromotion;
};

export function CampaignWorkspacePage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const [campaignFormDialog, setCampaignFormDialog] = useState<CampaignFormDialogState>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [isPromotionAddDialogOpen, setIsPromotionAddDialogOpen] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [deletingPromotionId, setDeletingPromotionId] = useState<string | null>(null);
  const selectedCampaign = data.campaigns.find(
    (campaign) => campaign.campaign_id === query.selectedCampaignId
  );
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const campaignDetail = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const promotions = uniquePromotionsById(campaignDetail.data?.promotions ?? []);
  const selectedPromotion = promotions.find(
    (promotion) => promotion.promotion_id === query.selectedPromotionId
  );
  const selectedSegment = campaignDetail.data?.segments.find(
    (segment) =>
      segment.promotion_id === selectedPromotion?.promotion_id &&
      segment.segment_id === query.selectedSegmentId
  );
  const editingCampaign =
    campaignFormDialog?.mode === "edit"
      ? data.campaigns.find((campaign) => campaign.campaign_id === campaignFormDialog.campaignId)
      : undefined;
  const deletingCampaign = data.campaigns.find(
    (campaign) => campaign.campaign_id === deletingCampaignId
  );
  const editingPromotion = promotions.find(
    (promotion) => promotion.promotion_id === editingPromotionId
  );
  const deletingPromotion = promotions.find(
    (promotion) => promotion.promotion_id === deletingPromotionId
  );

  const createCampaignMutation = useMutation({
    mutationFn: (requestBody: Parameters<typeof createDashboardCampaign>[1]) =>
      createDashboardCampaign(query, requestBody),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        campaignView: "manage",
        createCampaign: false,
        promotionView: "manage",
        segmentView: "manage",
        selectedAdExperimentId: "",
        selectedCampaignId: campaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
      setCampaignFormDialog(null);
    }
  });
  const updateCampaignMutation = useMutation({
    mutationFn: ({
      campaignId,
      requestBody
    }: {
      campaignId: string;
      requestBody: Parameters<typeof updateDashboardCampaign>[2];
    }) => updateDashboardCampaign(query, campaignId, requestBody),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, campaign.campaign_id)
      });
      setCampaignFormDialog(null);
    }
  });
  const deleteCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => deleteDashboardCampaign(query, campaignId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (query.selectedCampaignId === result.campaign_id) {
        await setDashboardQueryState({
          campaignView: "manage",
          promotionView: "manage",
          segmentView: "manage",
          selectedAdExperimentId: "",
          selectedCampaignId: "",
          selectedPromotionId: "",
          selectedSegmentId: ""
        });
      }
      setCampaignFormDialog(null);
      setDeletingCampaignId(null);
    }
  });
  const createPromotionMutation = useMutation({
    mutationFn: (form: PromotionCreateFormState) =>
      createDashboardPromotion(query, selectedCampaignId, promotionCreateFormToRequest(form)),
    onSuccess: async (promotion) => {
      await invalidateCampaignWorkspace(queryClient, query, selectedCampaignId);
      await setDashboardQueryState({
        campaignView: "manage",
        createPromotion: false,
        promotionView: "manage",
        segmentView: "manage",
        selectedAdExperimentId: "",
        selectedCampaignId,
        selectedPromotionId: promotion.promotion_id,
        selectedSegmentId: ""
      });
      setIsPromotionAddDialogOpen(false);
    }
  });
  const updatePromotionMutation = useMutation({
    mutationFn: ({
      promotionId,
      requestBody
    }: {
      promotionId: string;
      requestBody: DashboardUpdatePromotionRequest;
    }) => updateDashboardPromotion(query, promotionId, requestBody),
    onSuccess: async () => {
      await invalidateCampaignWorkspace(queryClient, query, selectedCampaignId);
      setEditingPromotionId(null);
    }
  });
  const deletePromotionMutation = useMutation({
    mutationFn: (promotionId: string) => deleteDashboardPromotion(query, promotionId),
    onSuccess: async (result) => {
      await invalidateCampaignWorkspace(queryClient, query, selectedCampaignId);
      if (query.selectedPromotionId === result.promotion_id) {
        await setDashboardQueryState({
          promotionView: "manage",
          segmentView: "manage",
          selectedAdExperimentId: "",
          selectedPromotionId: "",
          selectedSegmentId: ""
        });
      }
      setDeletingPromotionId(null);
    }
  });

  useEffect(() => {
    if (!query.selectedCampaignId || selectedCampaign) {
      return;
    }

    void setDashboardQueryState(
      {
        selectedAdExperimentId: "",
        selectedCampaignId: "",
        selectedPromotionId: "",
        selectedSegmentId: ""
      },
      { history: "replace" }
    );
  }, [query.selectedCampaignId, selectedCampaign, setDashboardQueryState]);

  useEffect(() => {
    if (!campaignDetail.data || !query.selectedPromotionId || selectedPromotion) {
      return;
    }

    void setDashboardQueryState(
      { selectedAdExperimentId: "", selectedPromotionId: "", selectedSegmentId: "" },
      { history: "replace" }
    );
  }, [campaignDetail.data, query.selectedPromotionId, selectedPromotion, setDashboardQueryState]);

  const campaignCards = data.campaigns.map(toCampaignCard);
  const promotionCards = promotions.map(toPromotionCard);
  const hierarchyItems = buildHierarchyItems(selectedCampaign, selectedPromotion, selectedSegment);
  const promotionMutationError =
    createPromotionMutation.error ?? updatePromotionMutation.error ?? deletePromotionMutation.error;
  const openCampaignView = (campaignId: string, campaignView: DashboardQuery["campaignView"]) => {
    void setDashboardQueryState({
      campaignView,
      promotionView: "manage",
      segmentView: "manage",
      selectedAdExperimentId: "",
      selectedCampaignId: campaignId,
      selectedPromotionId: "",
      selectedSegmentId: ""
    });
  };
  const openPromotionView = (promotionId: string, view: "manage" | "performance") => {
    void setDashboardQueryState({
      campaignView: "manage",
      promotionView: view,
      segmentView: "manage",
      selectedAdExperimentId: "",
      selectedCampaignId,
      selectedPromotionId: promotionId,
      selectedSegmentId: ""
    });
  };

  return (
    <div className="grid gap-6">
      <HierarchyBreadcrumbs
        items={hierarchyItems}
        onItemSelect={(item) => {
          if (item.kind === "campaign") {
            void setDashboardQueryState({
              promotionView: "manage",
              segmentView: "manage",
              selectedAdExperimentId: "",
              selectedPromotionId: "",
              selectedSegmentId: ""
            });
            return;
          }
          if (item.kind === "promotion") {
            void setDashboardQueryState({
              segmentView: "manage",
              selectedAdExperimentId: "",
              selectedSegmentId: ""
            });
          }
        }}
        onRootSelect={
          selectedCampaign
            ? () => {
                void setDashboardQueryState({
                  campaignView: "manage",
                  promotionView: "manage",
                  segmentView: "manage",
                  selectedAdExperimentId: "",
                  selectedCampaignId: "",
                  selectedPromotionId: "",
                  selectedSegmentId: ""
                });
              }
            : undefined
        }
      />

      {promotionMutationError ? (
        <Alert variant="destructive">
          <AlertTitle>프로모션 작업을 마치지 못했어요</AlertTitle>
          <AlertDescription>{mutationErrorMessage(promotionMutationError)}</AlertDescription>
        </Alert>
      ) : null}

      {deleteCampaignMutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>캠페인을 삭제하지 못했어요</AlertTitle>
          <AlertDescription>{mutationErrorMessage(deleteCampaignMutation.error)}</AlertDescription>
        </Alert>
      ) : null}

      {!selectedCampaign ? (
        <section className="grid gap-5">
          <div className="grid gap-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              캠페인을 선택해 주세요
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              캠페인을 선택하면 프로모션을 관리하고 성과를 볼 수 있어요.
            </p>
          </div>
          <EntityCardGrid
            actions={(card) => [
              {
                id: "edit",
                label: "캠페인 수정",
                onSelect: () => {
                  updateCampaignMutation.reset();
                  deleteCampaignMutation.reset();
                  setCampaignFormDialog({ campaignId: card.id, mode: "edit" });
                }
              },
              {
                id: "delete",
                label: "캠페인 삭제",
                onSelect: () => {
                  deleteCampaignMutation.reset();
                  setDeletingCampaignId(card.id);
                },
                tone: "destructive"
              }
            ]}
            entryActions={(card) => [
              {
                id: "workspace",
                label: "프로모션 관리",
                onSelect: () => openCampaignView(card.id, "manage")
              },
              {
                id: "performance",
                label: "성과",
                onSelect: () => openCampaignView(card.id, "performance")
              }
            ]}
            addAction={{
              description: "캠페인을 만들고 프로모션을 설정해요.",
              label: "캠페인 만들기",
              onSelect: () => {
                createCampaignMutation.reset();
                setCampaignFormDialog({ mode: "create" });
              }
            }}
            ariaLabel="캠페인 목록"
            items={campaignCards}
          />
        </section>
      ) : null}

      {selectedCampaign && !selectedPromotion && query.campaignView === "performance" ? (
        <div className="flex justify-end">
          <DashboardDateRangeSelect value={query.dateRange} />
        </div>
      ) : null}

      {selectedCampaign && !selectedPromotion && query.campaignView === "performance" ? (
        <CampaignPerformanceSections data={data} query={query} />
      ) : null}

      {selectedCampaign && query.campaignView === "manage" && campaignDetail.isError ? (
        <Alert variant="destructive">
          <AlertTitle>캠페인을 불러오지 못했어요</AlertTitle>
          <AlertDescription>
            {campaignDetail.error?.message ?? "다시 시도해 주세요."}
          </AlertDescription>
        </Alert>
      ) : null}
      {selectedCampaign && query.campaignView === "manage" && campaignDetail.isLoading ? (
        <EmptyState message="캠페인을 불러오는 중이에요." />
      ) : null}

      {selectedCampaign &&
      !selectedPromotion &&
      query.campaignView === "manage" &&
      campaignDetail.data ? (
        <section className="grid gap-5">
          <div className="grid gap-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">프로모션</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              프로모션을 선택하면 세그먼트 생성부터 광고 소재 승인과 실험 실행까지 이어집니다.
            </p>
          </div>
          <EntityCardGrid
            actions={(card) => [
              {
                id: "edit",
                label: "프로모션 수정",
                onSelect: () => {
                  updatePromotionMutation.reset();
                  setEditingPromotionId(card.id);
                }
              },
              {
                id: "delete",
                label: "프로모션 삭제",
                onSelect: () => {
                  deletePromotionMutation.reset();
                  setDeletingPromotionId(card.id);
                },
                tone: "destructive"
              }
            ]}
            addAction={{
              description: "이 캠페인에 프로모션을 추가해요.",
              label: "프로모션 만들기",
              onSelect: () => {
                createPromotionMutation.reset();
                setIsPromotionAddDialogOpen(true);
              }
            }}
            ariaLabel={`${selectedCampaign.campaign_name} 프로모션 목록`}
            entryActions={(card) => [
              {
                id: "manage",
                label: "프로모션 관리",
                onSelect: () => openPromotionView(card.id, "manage")
              },
              {
                id: "performance",
                label: "프로모션 성과",
                onSelect: () => openPromotionView(card.id, "performance")
              }
            ]}
            items={promotionCards}
          />
        </section>
      ) : null}

      {selectedCampaign && selectedPromotion && campaignDetail.data ? (
        <PromotionWorkspace
          data={data}
          mode={query.promotionView === "performance" ? "promotion" : "segment"}
          query={query}
        />
      ) : null}

      <CampaignFormDialog
        campaign={editingCampaign}
        createError={createCampaignMutation.error}
        createIsError={createCampaignMutation.isError}
        createIsPending={createCampaignMutation.isPending}
        mode={campaignFormDialog?.mode ?? "create"}
        onCreate={(requestBody) => createCampaignMutation.mutate(requestBody)}
        onOpenChange={(open) => {
          if (!open) {
            setCampaignFormDialog(null);
            if (query.createCampaign) {
              void setDashboardQueryState({ createCampaign: false }, { history: "replace" });
            }
          }
        }}
        onUpdate={(campaignId, requestBody) =>
          updateCampaignMutation.mutate({ campaignId, requestBody })
        }
        open={Boolean(campaignFormDialog) || query.createCampaign}
        updateError={updateCampaignMutation.error}
        updateIsError={updateCampaignMutation.isError}
        updateIsPending={updateCampaignMutation.isPending}
      />
      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !deleteCampaignMutation.isPending) {
            setDeletingCampaignId(null);
          }
        }}
        open={Boolean(deletingCampaign)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>캠페인을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCampaign?.campaign_name} 캠페인과 연결된 항목이 모두 사라져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCampaignMutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteCampaignMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deletingCampaign) {
                  deleteCampaignMutation.mutate(deletingCampaign.campaign_id);
                }
              }}
              variant="destructive"
            >
              {deleteCampaignMutation.isPending ? "캠페인 삭제 중…" : "캠페인 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PromotionAddDialog
        createIsPending={createPromotionMutation.isPending}
        onCreate={(form) => createPromotionMutation.mutate(form)}
        onOpenChange={(open) => {
          setIsPromotionAddDialogOpen(open);
          if (!open && query.createPromotion) {
            void setDashboardQueryState({ createPromotion: false }, { history: "replace" });
          }
        }}
        open={isPromotionAddDialogOpen || (query.createPromotion && Boolean(selectedCampaign))}
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
        promotion={editingPromotion}
      />
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPromotionId(null);
          }
        }}
        open={Boolean(deletingPromotionId)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로모션을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPromotion?.marketing_theme ?? "선택한 프로모션"}이 목록에서 사라져요. 연결된
              세그먼트, 광고 소재, 실행과 실험도 모두 사라지고 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deletingPromotionId || deletePromotionMutation.isPending}
              onClick={() => {
                if (deletingPromotionId) {
                  deletePromotionMutation.mutate(deletingPromotionId);
                }
              }}
              variant="destructive"
            >
              {deletePromotionMutation.isPending ? "프로모션 삭제 중…" : "프로모션 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function toCampaignCard(campaign: DashboardCampaignSummary): CampaignCard {
  return {
    campaign,
    description: campaign.objective ?? "아직 목표가 없어요",
    id: campaign.campaign_id,
    kind: "campaign",
    metrics: [
      { id: "promotions", label: "프로모션", value: formatInteger(campaign.promotion_count) },
      { id: "segments", label: "세그먼트", value: formatInteger(campaign.segment_count) },
      {
        id: "experiments",
        label: "광고 실험",
        value: formatInteger(campaign.ad_experiment_count)
      },
      {
        id: "achievement",
        label: "목표 달성률",
        value:
          campaign.latest_goal_achievement_rate === null
            ? "-"
            : formatPercent(campaign.latest_goal_achievement_rate)
      }
    ],
    status: {
      label: formatStatusLabel(campaign.status),
      variant: statusBadgeVariant(campaign.status)
    },
    title: campaign.campaign_name
  };
}

function toPromotionCard(promotion: DashboardCampaignPromotion): PromotionCard {
  return {
    description: promotion.message_brief ?? formatChannelLabel(promotion.channel),
    id: promotion.promotion_id,
    kind: "promotion",
    metrics: [
      { id: "channel", label: "노출 방식", value: formatChannelLabel(promotion.channel) },
      {
        id: "goal",
        label: "목표 지표",
        value: formatMetricLabel(promotion.goal_metric)
      },
      {
        id: "segments",
        label: "세그먼트",
        value: formatInteger(promotion.target_segment_count)
      },
      {
        id: "experiments",
        label: "광고 실험",
        value: formatInteger(promotion.ad_experiment_count)
      }
    ],
    promotion,
    status: {
      label: formatStatusLabel(promotion.status),
      variant: statusBadgeVariant(promotion.status)
    },
    title: promotion.marketing_theme
  };
}

function buildHierarchyItems(
  campaign: DashboardCampaignSummary | undefined,
  promotion: DashboardCampaignPromotion | undefined,
  segment: { segment_id: string; segment_name: string } | undefined
): CampaignWorkspaceHierarchyItem[] {
  if (!campaign) {
    return [];
  }

  const items: CampaignWorkspaceHierarchyItem[] = [
    { id: campaign.campaign_id, kind: "campaign", label: campaign.campaign_name }
  ];
  if (promotion) {
    items.push({
      id: promotion.promotion_id,
      kind: "promotion",
      label: promotion.marketing_theme
    });
  }
  if (segment) {
    items.push({ id: segment.segment_id, kind: "segment", label: segment.segment_name });
  }
  return items;
}

async function invalidateCampaignWorkspace(
  queryClient: ReturnType<typeof useQueryClient>,
  query: DashboardQuery,
  campaignId: string
) {
  await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  await queryClient.invalidateQueries({
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, campaignId)
  });
}
