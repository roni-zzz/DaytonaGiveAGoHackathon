"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE = JSON.stringify(
  {
    name: "my-app",
    version: "1.0.0",
    dependencies: {
      lodash: "^4.17.21",
      express: "^4.18.2",
      axios: "^1.6.0",
      "event-stream": "3.3.6",
      chalk: "^5.3.0",
    },
    devDependencies: {
      typescript: "^5.3.0",
    },
  },
  null,
  2
);

export default function PackageInput() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(value);
    } catch {
      setError("Invalid JSON — please paste a valid package.json");
      return;
    }

    const deps = Object.assign(
      {},
      parsed.dependencies,
      parsed.devDependencies
    );
    if (!Object.keys(deps).length) {
      setError('No "dependencies" or "devDependencies" found');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_json: parsed }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { detail?: string }).detail ?? `Server error ${res.status}`);
      }
      const data = (await res.json()) as { audit_id: string };
      router.push(`/audit/${data.audit_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start audit");
      setLoading(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setValue(ev.target?.result as string);
    reader.readAsText(file);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="pkg-json"
            className="text-sm font-medium text-gray-300"
          >
            Paste your package.json
          </label>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setValue(EXAMPLE)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Load example
            </button>
            <span className="text-gray-600">|</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Upload file
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onFile}
        />

        <textarea
          id="pkg-json"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`{\n  "dependencies": {\n    "lodash": "^4.17.21"\n  }\n}`}
          className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin inline-block">⟳</span>
            Starting audit…
          </>
        ) : (
          <>
            <span>🚀</span>
            Audit Dependencies
          </>
        )}
      </button>
    </form>
  );
}
