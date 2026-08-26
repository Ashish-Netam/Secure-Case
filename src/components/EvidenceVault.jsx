import { useState } from "react";

import {
  UserCheck,
  FileCheck2,
  LockKeyhole,
  Eye,
  ShieldAlert,
  Upload,
  ClipboardCheck,
  Download,
} from "lucide-react";

import { calculateSHA256 } from "../utils/crypto";
import EvidenceViewer from "./EvidenceViewer";

function EvidenceVault({
  user,
  selectedFile,
  hash,
  onLog,
}) {
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  /*
   * ROLE PERMISSIONS
   *
   * Admin:
   *   View + Upload + Review + Download
   *
   * Investigation Officer:
   *   View + Upload + Review
   *
   * Forensic Officer:
   *   View + Upload + Review
   *
   * Other roles:
   *   No evidence access
   */

  const permissions = {
    Admin: {
      view: true,
      upload: true,
      review: true,
      download: true,
    },

    "Investigation Officer": {
      view: true,
      upload: true,
      review: true,
      download: false,
    },

    "Forensic Officer": {
      view: true,
      upload: true,
      review: true,
      download: false,
    },

    Viewer: {
      view: true,
      upload: true,
      review: true,
      download: true,
    },
  };

  const rolePermission =
    permissions[user?.role] || {
      view: false,
      upload: false,
      review: false,
      download: false,
    };

  const canViewEvidence = rolePermission.view;
  const canDownloadEvidence = rolePermission.download;

  async function openEvidence() {
    setError("");

    /*
     * STEP 1
     * Check role permission.
     */

    if (!canViewEvidence) {
      const message =
        `ACCESS DENIED • ${user?.role || "Unknown role"} ` +
        "does not have permission to view evidence.";

      setError(message);

      onLog?.(
        `Unauthorized evidence access blocked • ${
          user?.role || "Unknown role"
        }`,
        "BLOCKED"
      );

      return;
    }

    /*
     * STEP 2
     * Check evidence exists.
     */

    if (!selectedFile || !hash) {
      setError("Upload evidence first.");

      onLog?.(
        "Evidence view attempt blocked • Evidence missing",
        "BLOCKED"
      );

      return;
    }

    setVerifying(true);

    try {
      /*
       * STEP 3
       * Calculate current SHA-256.
       */

      const currentHash =
        await calculateSHA256(selectedFile);

      /*
       * STEP 4
       * Compare stored hash with current hash.
       */

      if (currentHash !== hash) {
        setError(
          "INTEGRITY FAILURE • SHA-256 mismatch."
        );

        onLog?.(
          `Evidence integrity mismatch blocked: ${selectedFile.name}`,
          "BLOCKED"
        );

        return;
      }

      /*
       * STEP 5
       * Evidence passed verification.
       */

      const url =
        URL.createObjectURL(selectedFile);

      const type =
        selectedFile.type || "";

      let mode = "download";
      let text = "";

      /*
       * PDF
       */

      if (
        type === "application/pdf" ||
        selectedFile.name
          .toLowerCase()
          .endsWith(".pdf")
      ) {
        mode = "pdf";
      }

      /*
       * IMAGE
       */

      else if (type.startsWith("image/")) {
        mode = "image";
      }

      /*
       * TEXT
       */

      else if (
        type === "text/plain" ||
        selectedFile.name
          .toLowerCase()
          .endsWith(".txt")
      ) {
        mode = "text";

        text =
          await selectedFile.text();
      }

      /*
       * Open viewer.
       */

      setViewer({
        url,
        mode,
        text,
        hash: currentHash,
      });

      /*
       * Audit log.
       */

      onLog?.(
        `Authorized evidence viewed • SHA-256 verification passed: ${selectedFile.name}`,
        "AUTHORIZED"
      );

    } catch (err) {
      console.error(err);

      setError(
        "Unable to verify evidence."
      );

      onLog?.(
        `Evidence verification error: ${selectedFile?.name || "Unknown evidence"}`,
        "ERROR"
      );

    } finally {
      setVerifying(false);
    }
  }

  function closeViewer() {
    if (viewer?.url) {
      URL.revokeObjectURL(viewer.url);
    }

    setViewer(null);
  }

  return (
    <div className="glass rounded-2xl p-5">

      {/* SECURITY CARDS */}

      <div className="grid gap-4 md:grid-cols-3">

        <SecurityCard
          icon={UserCheck}
          title="Officer Identity"
          value={
            canViewEvidence
              ? "VERIFIED"
              : "RESTRICTED"
          }
          detail={`${user?.role || "Unknown"} • ${
            user?.clearance || "No clearance"
          }`}
          good={canViewEvidence}
        />

        <SecurityCard
          icon={FileCheck2}
          title="Evidence Integrity"
          value={
            hash
              ? "LOCKED"
              : "WAITING"
          }
          detail={
            hash
              ? `${hash.slice(0, 16)}...`
              : "Upload evidence first"
          }
          good={Boolean(hash)}
        />

        <SecurityCard
          icon={
            canViewEvidence
              ? LockKeyhole
              : ShieldAlert
          }
          title="Access Decision"
          value={
            !canViewEvidence
              ? "DENIED"
              : selectedFile && hash
              ? "READY"
              : "BLOCKED"
          }
          detail={
            !canViewEvidence
              ? "Insufficient permissions"
              : selectedFile && hash
              ? "SHA-256 verification required"
              : "Evidence missing"
          }
          good={
            canViewEvidence &&
            Boolean(selectedFile && hash)
          }
        />

      </div>

      {/* PERMISSION SUMMARY */}

      <div className="mt-5 grid gap-3 sm:grid-cols-4">

        <PermissionBadge
          icon={Eye}
          label="VIEW"
          allowed={rolePermission.view}
        />

        <PermissionBadge
          icon={Upload}
          label="UPLOAD"
          allowed={rolePermission.upload}
        />

        <PermissionBadge
          icon={ClipboardCheck}
          label="REVIEW"
          allowed={rolePermission.review}
        />

        <PermissionBadge
          icon={Download}
          label="DOWNLOAD"
          allowed={rolePermission.download}
        />

      </div>

      {/* ACCESS POLICY */}

      <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4 md:flex-row md:items-center">

        <div>

          <p className="text-xs font-semibold text-white">
            Evidence Access Policy
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            Role authorization and cryptographic
            integrity verification are required.
          </p>

          {!canViewEvidence && (
            <p className="mt-2 text-[10px] font-semibold text-red-400">
              Your current role cannot view evidence.
            </p>
          )}

        </div>

        <button
          onClick={openEvidence}
          disabled={
            !selectedFile ||
            !hash ||
            verifying ||
            !canViewEvidence
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >

          <Eye size={14} />

          {verifying
            ? "Verifying..."
            : !canViewEvidence
            ? "Access Denied"
            : "Verify & View Evidence"}

        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[10px] text-red-400">

          <ShieldAlert
            size={14}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>

        </div>
      )}

      {/* VIEWER */}

      {viewer && (
        <EvidenceViewer
          file={selectedFile}
          url={viewer.url}
          mode={viewer.mode}
          hash={viewer.hash}
          role={user?.role}
          clearance={user?.clearance}
          text={viewer.text}
          canDownload={canDownloadEvidence}
          onClose={closeViewer}
          onLog={onLog}
        />
      )}

    </div>
  );
}


/*
 * SECURITY CARD
 */

function SecurityCard({
  icon: Icon,
  title,
  value,
  detail,
  good,
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">

      <div className="flex items-start justify-between">

        <div className="rounded-lg bg-slate-800/60 p-2">

          <Icon
            size={16}
            className={
              good
                ? "text-emerald-400"
                : "text-red-400"
            }
          />

        </div>

        <span
          className={`rounded-full border px-2 py-1 text-[8px] font-bold ${
            good
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
              : "border-red-500/20 bg-red-500/5 text-red-400"
          }`}
        >
          {value}
        </span>

      </div>

      <p className="mt-4 text-xs font-semibold text-white">
        {title}
      </p>

      <p className="mt-1 text-[10px] text-slate-500">
        {detail}
      </p>

    </div>
  );
}


/*
 * PERMISSION BADGE
 */

function PermissionBadge({
  icon: Icon,
  label,
  allowed,
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-3 ${
        allowed
          ? "border-emerald-500/15 bg-emerald-500/5"
          : "border-red-500/15 bg-red-500/5"
      }`}
    >

      <Icon
        size={13}
        className={
          allowed
            ? "text-emerald-400"
            : "text-red-400"
        }
      />

      <div>

        <p className="text-[9px] font-bold text-white">
          {label}
        </p>

        <p
          className={`text-[8px] ${
            allowed
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {allowed
            ? "AUTHORIZED"
            : "RESTRICTED"}
        </p>

      </div>

    </div>
  );
}

export default EvidenceVault;