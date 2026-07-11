import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WhatsAppDemoChat } from "@/app/demo-whatsapp/[slug]/whatsapp-demo-chat";

type WhatsAppDemoPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function WhatsAppDemoPage({ params }: WhatsAppDemoPageProps) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      assistantName: true,
      assistantEnabled: true,
      phone: true,
      settings: {
        select: {
          rgpdNotes: true
        }
      }
    }
  });

  if (!tenant) {
    notFound();
  }

  return (
    <main className="wa-demo-shell">
      <WhatsAppDemoChat
        slug={tenant.slug}
        clinicName={tenant.name}
        assistantName={tenant.assistantName}
        clinicPhone={tenant.phone ?? "+34 629 179 640"}
        assistantEnabled={tenant.assistantEnabled}
        rgpdNotes={tenant.settings?.rgpdNotes}
      />
    </main>
  );
}
