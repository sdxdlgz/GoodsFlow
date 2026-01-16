import { AdminAuth } from '@/components/admin/AdminAuth';
import { ImportUploader } from '@/components/admin/ImportUploader';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminImportPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <AdminAuth slug={slug}>
      <main className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <ImportUploader groupSlug={slug} />
        </div>
      </main>
    </AdminAuth>
  );
}
