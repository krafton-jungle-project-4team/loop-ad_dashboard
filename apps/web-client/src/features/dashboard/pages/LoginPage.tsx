import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Input } from "@loopad/ui/shadcn/input";
import { Label } from "@loopad/ui/shadcn/label";
import { useNavigate } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useDashboardLogin } from "../model/use-dashboard-auth.js";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useDashboardLogin();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await login.mutateAsync({ id, password });
      await navigate({ to: "/dashboard" });
    } catch {
      // The mutation state renders the login error.
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-[#f5f5f7] px-5 text-[#1d1d1f]">
      <Card className="w-full max-w-sm rounded-lg bg-white">
        <CardHeader className="gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#0066cc] text-white">
              <Gauge size={20} />
            </div>
            <div className="grid leading-tight">
              <CardTitle className="text-lg tracking-tight">loop-ad</CardTitle>
              <span className="text-xs text-muted-foreground">관리자 로그인</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="dashboard-admin-id">ID</Label>
              <Input
                autoComplete="username"
                id="dashboard-admin-id"
                onChange={(event) => setId(event.target.value)}
                value={id}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dashboard-admin-password">Password</Label>
              <Input
                autoComplete="current-password"
                id="dashboard-admin-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </div>
            {login.isError ? (
              <p className="text-sm text-destructive">로그인 정보가 올바르지 않습니다.</p>
            ) : null}
            <Button
              className="w-full bg-[#0066cc] hover:bg-[#0057ad]"
              disabled={login.isPending}
              type="submit"
            >
              {login.isPending ? "로그인 중" : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
