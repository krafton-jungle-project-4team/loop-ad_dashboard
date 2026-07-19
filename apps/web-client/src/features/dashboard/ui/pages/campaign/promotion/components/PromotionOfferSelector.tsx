import type { DashboardPromotionOffer } from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@loopad/ui/shadcn/card";
import { Checkbox } from "@loopad/ui/shadcn/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@loopad/ui/shadcn/empty";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { ScrollArea } from "@loopad/ui/shadcn/scroll-area";
import { Skeleton } from "@loopad/ui/shadcn/skeleton";
import { cn } from "@loopad/ui/shadcn/utils";
import { useQuery } from "@tanstack/react-query";
import { Building2, RefreshCw } from "lucide-react";
import { fetchDashboardPromotionOffers } from "../../../../../api/promotion-api.js";
import { dashboardPromotionOffersQueryKey } from "../../../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";
import type { PromotionCreateFormState } from "../promotionUtils.js";

const promotionOfferSelectionLimit = 8;
const promotionOfferCatalogStaleTimeMs = 60_000;

export function PromotionOfferSelector({
  error,
  form,
  idPrefix,
  loading,
  offers,
  onChange,
  onRetry
}: {
  error: boolean;
  form: PromotionCreateFormState;
  idPrefix: string;
  loading: boolean;
  offers: DashboardPromotionOffer[];
  onChange: (form: PromotionCreateFormState) => void;
  onRetry: () => void;
}) {
  const offersById = new Map(offers.map((offer) => [offer.offer_id, offer]));
  const unavailableOfferLinks = form.offerLinks.filter(
    (link) => offersById.get(link.offerId)?.destination_url !== link.destinationUrl
  );

  function toggleOffer(offer: DashboardPromotionOffer) {
    const selected = form.offerLinks.some((link) => link.offerId === offer.offer_id);
    if (!selected && form.offerLinks.length >= promotionOfferSelectionLimit) {
      return;
    }
    onChange({
      ...form,
      offerLinks: selected
        ? form.offerLinks.filter((link) => link.offerId !== offer.offer_id)
        : [...form.offerLinks, { offerId: offer.offer_id, destinationUrl: offer.destination_url }]
    });
  }

  return (
    <Field>
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <FieldLabel>광고에 사용할 숙소</FieldLabel>
          <p className="text-xs text-muted-foreground">
            숙소 목록에서 최대 {promotionOfferSelectionLimit}개까지 선택해 주세요.
          </p>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {form.offerLinks.length}/{promotionOfferSelectionLimit} 선택
        </p>
      </div>
      {loading ? <PromotionOfferListSkeleton /> : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>숙소 목록을 불러오지 못했어요</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            잠시 후 다시 시도해 주세요.
            <Button onClick={onRetry} size="sm" type="button" variant="outline">
              <RefreshCw data-icon="inline-start" />
              다시 불러오기
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {!loading && !error && offers.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>선택할 수 있는 숙소가 없어요</EmptyTitle>
            <EmptyDescription>광고에 사용할 숙소가 등록되면 여기에 표시돼요.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {!loading && !error && offers.length > 0 ? (
        <ScrollArea className="h-80 rounded-xl border">
          <div className="grid gap-3 p-3 md:grid-cols-2">
            {offers.map((offer) => {
              const selected = form.offerLinks.some((link) => link.offerId === offer.offer_id);
              const selectionLimitReached =
                form.offerLinks.length >= promotionOfferSelectionLimit && !selected;
              const checkboxId = `${idPrefix}-offer-${offer.offer_id}`;
              return (
                <Card
                  className={cn("transition-colors", selected && "border-primary bg-primary/5")}
                  key={offer.offer_id}
                  size="sm"
                >
                  <CardHeader>
                    <CardTitle>{offer.hotel_name}</CardTitle>
                    <CardDescription>{offer.destination_id}</CardDescription>
                    <CardAction>
                      <Checkbox
                        aria-label={`${offer.hotel_name} 선택`}
                        checked={selected}
                        disabled={selectionLimitReached}
                        id={checkboxId}
                        onCheckedChange={() => toggleOffer(offer)}
                      />
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <label
                      className={cn(
                        "flex items-center gap-3",
                        selectionLimitReached ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      )}
                      htmlFor={checkboxId}
                    >
                      <img
                        alt=""
                        className="size-16 shrink-0 rounded-lg object-cover"
                        loading="lazy"
                        src={offer.image_url}
                      />
                      <div className="grid min-w-0 gap-1">
                        <p className="text-sm font-medium">
                          {formatOfferPrice(offer.sale_price_per_night, offer.currency)} / 1박
                        </p>
                        {offer.discount_rate_percent !== null ? (
                          <p className="text-xs text-muted-foreground">
                            {offer.discount_rate_percent}% 할인
                          </p>
                        ) : null}
                      </div>
                    </label>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      ) : null}
      {unavailableOfferLinks.length > 0 && !loading && !error ? (
        <Alert variant="destructive">
          <AlertTitle>현재 목록에서 찾을 수 없는 숙소가 있어요</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            사용할 수 없는 기존 선택을 제거한 뒤 숙소를 다시 골라 주세요.
            <Button
              onClick={() =>
                onChange({
                  ...form,
                  offerLinks: form.offerLinks.filter(
                    (link) => offersById.get(link.offerId)?.destination_url === link.destinationUrl
                  )
                })
              }
              size="sm"
              type="button"
              variant="outline"
            >
              사용할 수 없는 선택 제거
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {!loading && !error && form.offerLinks.length === 0 ? (
        <p className="text-xs font-medium text-destructive">
          이메일 광고를 만들려면 숙소를 1개 이상 선택해 주세요.
        </p>
      ) : null}
    </Field>
  );
}

function PromotionOfferListSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} size="sm">
          <CardHeader>
            <CardTitle>
              <span className="sr-only">숙소 목록을 불러오는 중</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Skeleton className="size-16 shrink-0" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function usePromotionOfferCatalog(query: DashboardQuery, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: ({ signal }) => fetchDashboardPromotionOffers(query, signal),
    queryKey: dashboardPromotionOffersQueryKey(query.projectId),
    staleTime: promotionOfferCatalogStaleTimeMs
  });
}

function formatOfferPrice(value: number, currency: string) {
  return new Intl.NumberFormat("ko-KR", {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}
