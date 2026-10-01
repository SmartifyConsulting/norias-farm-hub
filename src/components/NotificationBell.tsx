import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotices } from "@/lib/notices";

export function NotificationBell({ className = "" }: { className?: string }) {
  const { notices, unread: u, markAll } = useNotices();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const unread = ready ? u : [];
  return (
    <Popover onOpenChange={(o) => { if (!o) markAll(); }}>
      <PopoverTrigger aria-label={`Notifications (${unread.length} new)`} className={`relative flex h-9 w-9 items-center justify-center rounded-full ${className}`}>
        <Bell className="h-4 w-4" />
        {unread.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread.length}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2"><p className="text-sm font-semibold">Notifications</p><Link to="/settings" className="text-xs text-primary underline">Preferences</Link></div>
        <ul className="max-h-80 overflow-y-auto">
          {notices.length === 0 && <li className="p-3 text-xs text-muted-foreground">You're all caught up.</li>}
          {notices.map((n) => (
            <li key={n.id}>
              <Link to={n.to} className="block px-3 py-2 text-xs hover:bg-secondary">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{n.type}</span>{n.text}
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
