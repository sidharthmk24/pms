import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { navFor } from "@/lib/nav";
import SidebarNav from "@/components/sidebar-nav";
import UserMenu from "@/components/user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const items = navFor(user.role);

  return (
    <div className="relative flex min-h-dvh selection:bg-foreground selection:text-background">
      {/* Apple-style Translucent Sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-black/[0.06] bg-surface/85 px-4 py-5 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-surface/80 md:flex">
        <div className="flex flex-col">
          {/* Logo & Brand Header */}
          <Link
            href="/dashboard"
            className="apple-button mb-6 flex flex-col gap-2 rounded-2xl p-2.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
          >
            <div className="flex items-center justify-between">
              <Image
                src="/logo.png"
                alt="Kairali Books"
                width={140}
                height={35}
                priority
                className="h-6 w-auto object-contain dark:invert"
              />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground pl-0.5">
              Publisher Management System
            </span>
          </Link>

          {/* Nav List */}
          <div className="overflow-y-auto pr-1">
            <SidebarNav items={items} />
          </div>
        </div>

        {/* Sidebar Footer / System Badge */}
        <div className="border-t border-black/[0.05] pt-3 text-[11px] text-muted-foreground dark:border-white/[0.06]">
          <div className="flex items-center justify-between px-2">
            <span>v1.0 · Connected</span>
            <span className="h-2 w-2 rounded-full bg-foreground/80 ring-2 ring-foreground/20" />
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-black/[0.06] bg-surface/80 px-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-surface/75 md:px-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center md:hidden">
              <Image
                src="/logo.png"
                alt="Kairali Books"
                width={120}
                height={30}
                priority
                className="h-5 w-auto object-contain dark:invert"
              />
            </Link>
          </div>

          <UserMenu name={user.name} email={user.email} />
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-8 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

