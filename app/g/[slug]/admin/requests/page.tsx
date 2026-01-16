import { AdminAuth } from '@/components/admin/AdminAuth';
import { RequestList } from '@/components/admin/RequestList';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminRequestsPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <AdminAuth slug={slug}>
      <main className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <RequestList groupSlug={slug} />
        </div>
      </main>
    </AdminAuth>
  );
}
