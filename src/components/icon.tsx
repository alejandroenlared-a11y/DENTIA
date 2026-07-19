import {
  Activity,
  Archive,
  BarChart3,
  BadgeEuro,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  FlaskConical,
  FolderOpen,
  Home,
  Image,
  Inbox,
  LayoutDashboard,
  ListFilter,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Radio,
  Search,
  Settings,
  SmilePlus,
  Sparkles,
  Stethoscope,
  UserCog,
  Users,
  Wand2
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
  sparkles: Sparkles,
  clinic: Stethoscope,
  crm: LayoutDashboard,
  documents: FolderOpen,
  inventory: Package,
  lab: FlaskConical,
  team: UserCog,
  analytics: BarChart3,
  automations: Wand2,
  aiReview: CheckCircle2,
  checkCircle: CheckCircle2,
  imaging: Image,
  search: Search,
  filter: ListFilter,
  card: CreditCard,
  activity: Activity,
  archive: Archive,
  building: Building2,
  radio: Radio,
  file: FileText
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function Icon({ name }: { name: IconName }) {
  const SvgIcon = icons[name];
  return <SvgIcon aria-hidden="true" className="icon" />;
}
