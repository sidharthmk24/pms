import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { navFor } from "@/lib/nav";
import { formatRoleLabel } from "@/lib/roles";
import SidebarNav from "@/components/sidebar-nav";
import UserMenu from "@/components/user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const items = navFor(user.role);

  let initialAvatar: string | null = null;
  const authorRecord = await prisma.authors.findFirst({
    where: { email: { equals: user.email, mode: "insensitive" } },
    select: { notes: true, phone: true, address: true },
  });

  if (authorRecord?.notes) {
    try {
      const parsed = JSON.parse(authorRecord.notes);
      if (parsed.avatar) initialAvatar = parsed.avatar;
    } catch {
      // not json
    }
  }

  return (
    <div className="relative flex min-h-dvh bg-background selection:bg-primary selection:text-white">
      {/* Apple-style Translucent Sidebar with Brand Plum Accents */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-[#7e2562]/10 bg-white/95 px-4 py-5 backdrop-blur-2xl md:flex">
        <div className="flex flex-col">
          {/* Logo & Brand Header */}
          <Link
            href={user.role === "author" ? "/author" : "/dashboard"}
            className="apple-button mb-6 flex flex-col gap-2 rounded-2xl p-2.5 transition-colors hover:bg-[#7e2562]/5"
          >
            <div className="flex items-center justify-between">
              <Image
                src="/logo.png"
                alt="Kairali Books"
                width={140}
                height={35}
                priority
                className="h-6 w-auto object-contain"
              />
            </div>
            <span className="text-[11px] font-bold text-primary pl-0.5 tracking-wide">
              {user.role === "author" ? "Author Publishing Portal" : "Publisher Management System"}
            </span>
          </Link>

          {/* Nav List */}
          <div className="overflow-y-auto pr-1">
            <SidebarNav items={items} />
          </div>
        </div>

   
      </aside>

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[#7e2562]/10 bg-white/90 px-4 backdrop-blur-xl md:px-8 shadow-[0_1px_8px_-2px_rgba(126,37,98,0.04)]">
          <div className="flex items-center gap-3">
            <Link href={user.role === "author" ? "/author" : "/dashboard"} className="flex items-center md:hidden">
              <Image
                src="/logo.png"
                alt="Kairali Books"
                width={120}
                height={30}
                priority
                className="h-5 w-auto object-contain"
              />
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="text-[#7e2562] font-bold">Kairali Books</span>
              <span>/</span>
              <span>{formatRoleLabel(user.role)} Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* <Link
              href="/publish"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5] px-3 py-1.5 text-xs font-bold text-[#7e2562] hover:bg-[#7e2562]/20 transition-colors"
            >
              <span>View Public Portal</span>
              <span aria-hidden="true">&nearr;</span>
            </Link> */}
            <UserMenu
              name={user.name}
              email={user.email}
              role={user.role}
              initialAvatar={initialAvatar}
              initialPhone={authorRecord?.phone || ""}
              initialPlace={authorRecord?.address || ""}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-8 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

