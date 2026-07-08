import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDashboardAuthSession,
  loginDashboardAdmin,
  logoutDashboardAdmin
} from "../api/dashboard-auth-api.js";

export const dashboardAuthQueryKey = ["dashboard", "auth", "me"] as const;

export function useDashboardAuthSession() {
  return useQuery({
    queryFn: ({ signal }) => fetchDashboardAuthSession(signal),
    queryKey: dashboardAuthQueryKey,
    retry: false
  });
}

export function useDashboardLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginDashboardAdmin,
    onSuccess: (session) => {
      queryClient.setQueryData(dashboardAuthQueryKey, session);
    }
  });
}

export function useDashboardLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutDashboardAdmin,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["dashboard"] });
      queryClient.setQueryData(dashboardAuthQueryKey, null);
    }
  });
}
