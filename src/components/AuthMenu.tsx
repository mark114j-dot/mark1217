import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function AuthMenu() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  if (loading) return null;
  if (!user) {
    return (
      <Link
        to="/login"
        className="border-brutal shadow-brutal-sm rounded-xl bg-card px-3 py-2 text-sm font-semibold flex items-center gap-1.5 hover:translate-y-0.5 hover:shadow-none transition"
      >
        <LogIn className="w-4 h-4" /> 登入
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/friends"
        className="border-brutal shadow-brutal-sm rounded-xl bg-secondary px-3 py-2 text-sm font-semibold flex items-center gap-1.5 hover:translate-y-0.5 hover:shadow-none transition"
      >
        <Users className="w-4 h-4" /> 好友
      </Link>
      <div className="border-brutal shadow-brutal-sm rounded-xl bg-card px-3 py-1.5 flex items-center gap-2">
        <span className="text-lg">{profile?.avatar ?? "🐱"}</span>
        <span className="text-sm font-semibold max-w-[100px] truncate">{profile?.username ?? "玩家"}</span>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          title="登出"
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}