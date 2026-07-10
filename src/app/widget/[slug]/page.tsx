import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WidgetChat } from "@/app/widget/[slug]/widget-chat";

type WidgetPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function WidgetPage({ params }: WidgetPageProps) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true, slug: true, assistantName: true, assistantEnabled: true }
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="widget-shell">
      <WidgetChat
        slug={tenant.slug}
        clinicName={tenant.name}
        assistantName={tenant.assistantName}
        assistantEnabled={tenant.assistantEnabled}
      />
    </div>
  );
}
