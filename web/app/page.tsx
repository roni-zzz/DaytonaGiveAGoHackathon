import PackageInput from "@/components/PackageInput";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl">🔍</span>
            <h1 className="text-4xl font-bold tracking-tight">Dependency Auditor</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Point it at a{" "}
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
              package.json
            </code>
            . Get a threat report on every suspicious dependency — what it actually
            did at runtime, not just what it claims to do.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Isolated Daytona sandboxes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              Claude Opus 4.6 analysis
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Real-time results
            </span>
          </div>
        </div>

        <PackageInput />

        <p className="text-center text-xs text-gray-600">
          Each dependency runs in an isolated Daytona sandbox. Your machine never
          executes untrusted code.
        </p>
      </div>
    </main>
  );
}
