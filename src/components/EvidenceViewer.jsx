import {
  X,
  Download,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from "lucide-react";

function EvidenceViewer({
  file,
  url,
  mode,
  hash,
  role,
  clearance,
  text,
  canDownload = true,
  onClose,
  onLog,
}) {
  if (!file) return null;

  function downloadFile() {
    if (!canDownload) {
      onLog?.(
        `Unauthorized evidence download blocked: ${file.name}`,
        "BLOCKED"
      );

      return;
    }

    const link =
      document.createElement("a");

    link.href = url;
    link.download = file.name;

    document.body.appendChild(link);

    link.click();

    link.remove();

    onLog?.(
      `Evidence downloaded: ${file.name}`,
      "AUTHORIZED"
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0f1522]">

        {/* HEADER */}

        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">

          <div className="min-w-0">

            <p className="truncate text-xs font-bold text-white">
              {file.name}
            </p>

            <p className="text-[9px] text-emerald-400">
              SHA-256 VERIFIED • {role} • {clearance}
            </p>

          </div>

          <div className="flex gap-2">

            {canDownload ? (
              <button
                onClick={downloadFile}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[10px] text-white transition hover:bg-slate-800"
              >
                <Download size={13} />
                Download
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-[10px] text-slate-600">
                <Download size={13} />
                Download Restricted
              </div>
            )}

            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800"
            >
              <X size={16} />
            </button>

          </div>

        </div>

        {/* CONTENT */}

        <div className="flex-1 overflow-auto bg-slate-950/70 p-4">

          {/* ACCESS STATUS */}

          <div className="mb-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3">

            <div className="flex flex-wrap items-center gap-2 text-[10px] text-emerald-400">

              <CheckCircle2 size={13} />

              ACCESS GRANTED

              <span className="text-slate-600">
                •
              </span>

              Identity verified

              <span className="text-slate-600">
                •
              </span>

              SHA-256 verified

              <span className="text-slate-600">
                •
              </span>

              Role authorized

            </div>

            <p className="mt-2 break-all font-mono text-[9px] text-slate-500">
              {hash}
            </p>

          </div>

          {/* ROLE SECURITY NOTICE */}

          <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">

            <ShieldCheck
              size={16}
              className="text-emerald-400"
            />

            <div>

              <p className="text-[9px] font-bold text-white">
                ACCESS CONTROL
              </p>

              <p className="text-[9px] text-slate-500">
                {role} • {clearance}
                {" • "}
                {canDownload
                  ? "Download authorized"
                  : "View-only access"}
              </p>

            </div>

          </div>

          {/* PDF */}

          {mode === "pdf" && (
            <iframe
              title="Evidence PDF"
              src={url}
              className="h-[68vh] w-full rounded-xl bg-white"
            />
          )}

          {/* IMAGE */}

          {mode === "image" && (
            <div className="flex min-h-[65vh] items-center justify-center rounded-xl bg-slate-900">

              <img
                src={url}
                alt="Evidence"
                className="max-h-[65vh] max-w-full object-contain"
              />

            </div>
          )}

          {/* TEXT */}

          {mode === "text" && (
            <pre className="min-h-[65vh] whitespace-pre-wrap rounded-xl bg-slate-900 p-5 font-mono text-xs leading-7 text-slate-300">
              {text}
            </pre>
          )}

          {/* OTHER FILE TYPES */}

          {mode === "download" && (
            <div className="flex min-h-[65vh] flex-col items-center justify-center">

              <FileText
                size={35}
                className="mb-4 text-slate-600"
              />

              <p className="text-sm font-semibold text-white">
                Evidence verified successfully
              </p>

              <p className="mt-2 text-[10px] text-slate-500">
                This file type cannot be previewed
                in the browser.
              </p>

              {canDownload ? (
                <button
                  onClick={downloadFile}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-400"
                >
                  <Download size={14} />
                  Download Verified Copy
                </button>
              ) : (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-[10px] font-semibold text-red-400">
                  Download restricted for your role
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default EvidenceViewer;