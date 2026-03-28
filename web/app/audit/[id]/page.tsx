import { use } from "react";
import Link from "next/link";
import AuditFeed from "@/components/AuditFeed";

export default function AuditPage(props: PageProps<"/audit/[id]">) {
  const { id } = use(props.params);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <h1 className="text-xl font-bold">Dependency Audit</h1>
              <p className="text-xs text-gray-500 font-mono">{id}</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            ← New audit
          </Link>
        </div>

        <AuditFeed auditId={id} />
      </div>
    </main>
  );
}
