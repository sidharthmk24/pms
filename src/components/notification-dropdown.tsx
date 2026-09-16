"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Check, 
  FileText, 
  FileCheck, 
  FileSignature, 
  Palette, 
  Printer, 
  Package, 
  Users, 
  Info,
  Loader2,
  ChevronRight,
  Inbox,
  CheckCircle2,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

interface NotificationDestination {
  url: string;
  label: string;
}

export default function NotificationDropdown({ userRole }: { userRole?: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animateBell, setAnimateBell] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"unread" | "read">("unread");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);
  const unreadCount = unreadNotifications.length;
  const readCount = readNotifications.length;

  const currentNotifications = activeTab === "unread" ? unreadNotifications : readNotifications;

  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setNotifications(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);

    const handleMutation = () => {
      fetchNotifications(false);
    };

    window.addEventListener("app:data-mutated", handleMutation);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("app:data-mutated", handleMutation);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Trigger bell animation when new unread notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadCount) {
      setAnimateBell(true);
      const timer = setTimeout(() => setAnimateBell(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await fetch("/api/notifications", { method: "PATCH" });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getNotificationDestination = (n: NotificationItem): NotificationDestination => {
    if (n.link && n.link.trim()) {
      const link = n.link.trim();
      if (link.startsWith("/submissions")) return { url: link, label: "Submission" };
      if (link.startsWith("/production")) return { url: link, label: "Production" };
      if (link.startsWith("/contracts") || link.startsWith("/publish/contract")) return { url: link, label: "Contract" };
      if (link.startsWith("/author")) return { url: link, label: "Author Portal" };
      if (link.startsWith("/team")) return { url: link, label: "Team" };
      return { url: link, label: "View Details" };
    }

    const type = (n.type || "").toUpperCase();
    const title = (n.title || "").toLowerCase();

    if (userRole === "author") {
      return { url: "/author", label: "Author Portal" };
    }

    if (type === "SUBMISSION" || title.includes("manuscript") || title.includes("submission")) {
      return { url: "/submissions", label: "Submissions" };
    }
    if (type === "CONTRACT" || title.includes("contract") || title.includes("agreement")) {
      return { url: "/contracts", label: "Contracts" };
    }
    if (type === "PRODUCTION" || type === "TASK" || type === "PROOF" || title.includes("proof") || title.includes("typeset")) {
      return { url: "/production", label: "Production" };
    }
    if (type === "PRINT" || type === "STOCK" || title.includes("print") || title.includes("stock")) {
      return { url: "/production", label: "Production & Stock" };
    }
    if (type === "TEAM" || title.includes("team") || title.includes("user")) {
      return { url: "/team", label: "Team" };
    }

    return { url: "/dashboard", label: "Dashboard" };
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    const dest = getNotificationDestination(n);

    if (!n.is_read) {
      markAsRead(n.id);
    }

    setIsOpen(false);
    router.push(dest.url);
  };

  const timeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr.replace(" ", "T") + "Z");
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (isNaN(seconds) || seconds < 60) return "just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return "recently";
    }
  };

  const getNotificationStyles = (type: string) => {
    switch (type.toUpperCase()) {
      case "SUBMISSION":
        return {
          icon: <FileText className="w-4 h-4 text-purple-700" />,
          bg: "bg-purple-500/10 border-purple-500/20",
        };
      case "TASK":
        return {
          icon: <ClipboardList className="w-4 h-4 text-blue-700" />,
          bg: "bg-blue-500/10 border-blue-500/20",
        };
      case "CONTRACT":
        return {
          icon: <FileSignature className="w-4 h-4 text-emerald-700" />,
          bg: "bg-emerald-500/10 border-emerald-500/20",
        };
      case "PRODUCTION":
        return {
          icon: <Palette className="w-4 h-4 text-pink-700" />,
          bg: "bg-pink-500/10 border-pink-500/20",
        };
      case "PROOF":
        return {
          icon: <FileCheck className="w-4 h-4 text-teal-700" />,
          bg: "bg-teal-500/10 border-teal-500/20",
        };
      case "PRINT":
        return {
          icon: <Printer className="w-4 h-4 text-amber-700" />,
          bg: "bg-amber-500/10 border-amber-500/20",
        };
      case "STOCK":
        return {
          icon: <Package className="w-4 h-4 text-cyan-700" />,
          bg: "bg-cyan-500/10 border-cyan-500/20",
        };
      case "TEAM":
        return {
          icon: <Users className="w-4 h-4 text-violet-700" />,
          bg: "bg-violet-500/10 border-violet-500/20",
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-[#7e2562]" />,
          bg: "bg-[#faedf5] border-[#7e2562]/20",
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="relative p-2.5 text-muted-foreground hover:text-[#7e2562] hover:bg-[#faedf5] rounded-xl transition-all duration-200 focus:outline-none cursor-pointer"
        aria-label="Open notifications"
      >
        <motion.div
          animate={
            animateBell
              ? {
                  rotate: [0, -15, 15, -15, 15, -10, 10, -5, 5, 0],
                  scale: [1, 1.15, 1.15, 1.15, 1.15, 1, 1, 1, 1, 1],
                }
              : {}
          }
          transition={{ duration: 0.8 }}
        >
          <Bell className="w-5 h-5 text-foreground" />
        </motion.div>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-[0_12px_36px_-6px_rgba(126,37,98,0.18)] border border-[#7e2562]/15 overflow-hidden z-50 flex flex-col max-h-[34rem]"
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-[#7e2562]/10 bg-[#faedf5]/70">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold text-[#7e2562] bg-[#7e2562]/10 border border-[#7e2562]/20 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-[#7e2562] hover:underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Tabs: Unread vs Read */}
              <div className="grid grid-cols-2 p-1 bg-white border border-[#7e2562]/10 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("unread")}
                  className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                    activeTab === "unread"
                      ? "bg-[#7e2562] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                        activeTab === "unread"
                          ? "bg-white text-[#7e2562]"
                          : "bg-[#7e2562] text-white"
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("read")}
                  className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                    activeTab === "read"
                      ? "bg-[#7e2562] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Read</span>
                  {readCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] rounded-full font-medium ${
                        activeTab === "read"
                          ? "bg-white/20 text-white"
                          : "bg-[#faedf5] text-[#7e2562]"
                      }`}
                    >
                      {readCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[#7e2562]/8 max-h-96">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                  <Loader2 className="w-7 h-7 animate-spin text-[#7e2562]" />
                  <span className="text-xs text-muted-foreground">Loading notifications...</span>
                </div>
              ) : currentNotifications.length === 0 ? (
                <div className="py-16 px-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 bg-[#faedf5] border border-[#7e2562]/20 rounded-full">
                    {activeTab === "unread" ? (
                      <CheckCircle2 className="w-6 h-6 text-[#7e2562]" />
                    ) : (
                      <Inbox className="w-6 h-6 text-[#7e2562]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {activeTab === "unread" ? "All caught up!" : "No read notifications"}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[16rem]">
                      {activeTab === "unread"
                        ? "You don't have any unread notifications right now."
                        : "Notifications you've already read will appear here."}
                    </p>
                  </div>
                  {activeTab === "unread" && readCount > 0 && (
                    <button
                      onClick={() => setActiveTab("read")}
                      className="text-xs font-bold text-[#7e2562] hover:underline mt-1 cursor-pointer"
                    >
                      View {readCount} past notification{readCount > 1 ? "s" : ""} &rarr;
                    </button>
                  )}
                </div>
              ) : (
                currentNotifications.map((n) => {
                  const style = getNotificationStyles(n.type);
                  const dest = getNotificationDestination(n);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`px-5 py-4 flex items-start space-x-3 transition-all duration-150 cursor-pointer group select-none ${
                        n.is_read
                          ? "hover:bg-[#faf6f9] bg-white"
                          : "bg-[#faedf5]/35 hover:bg-[#faedf5]/70"
                      }`}
                      title={`Go to ${dest.label}`}
                    >
                      {/* Category Icon */}
                      <div
                        className={`p-2 rounded-xl border shrink-0 ${style.bg} group-hover:scale-105 transition-transform duration-200`}
                      >
                        {style.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between space-x-2">
                          <p className="text-sm leading-tight truncate text-foreground font-bold">
                            {n.title}
                          </p>
                          <span className="text-[10px] font-medium text-muted-foreground shrink-0 mt-0.5">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words line-clamp-2">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="inline-flex items-center text-[10px] font-bold text-[#7e2562] bg-[#faedf5] border border-[#7e2562]/20 px-2 py-0.5 rounded-md group-hover:bg-[#7e2562]/15 transition-colors">
                            {dest.label}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-[#7e2562] flex items-center gap-0.5 transition-colors">
                            <span>Open</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-[#7e2562] transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </div>

                      {/* Quick mark as read for unread items */}
                      {!n.is_read && (
                        <button
                          onClick={(e) => markAsRead(n.id, e)}
                          title="Mark as read without opening"
                          className="p-1.5 text-muted-foreground hover:text-[#7e2562] hover:bg-[#faedf5] rounded-lg transition-all shrink-0 mt-0.5 border border-transparent hover:border-[#7e2562]/20 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
