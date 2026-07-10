import {
  BadgeEuro,
  Bot,
  CalendarDays,
  ClipboardCheck,
  Home,
  Inbox,
  MessageCircle,
  Phone,
  Plus,
  Settings,
  SmilePlus,
  Sparkles,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const icons = {
  home: Home,
  calendar: CalendarDays,
  inbox: Inbox,
  bot: Bot,
  users: Users,
  tooth: SmilePlus,
  task: ClipboardCheck,
  euro: BadgeEuro,
  settings: Settings,
  plus: Plus,
  phone: Phone,
  whatsapp: MessageCircle,
  sparkles: Sparkles
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function Icon({ name }: { name: IconName }) {
  const SvgIcon = icons[name];
  return <SvgIcon aria-hidden="true" className="icon" />;
}
