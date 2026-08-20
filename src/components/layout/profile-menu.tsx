"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, UserCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/queries/use-auth";

export function ProfileMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();

  if (!user) return null;

  const displayName = user.name ?? user.email;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSettled: () => router.replace("/login") });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2.5 rounded-full outline-none">
        <UserAvatar name={displayName} imageUrl={user?.avatarUrl} />
        <span className="hidden flex-col items-start leading-tight md:flex">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-muted-foreground text-xs">{user.role}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-foreground font-medium">{displayName}</span>
          <span className="text-muted-foreground text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
          <UserCircle /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
