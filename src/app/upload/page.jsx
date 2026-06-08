"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadCloud, RefreshCcw, Trash2, Download,
  CheckCircle, AlertCircle, FileX, File, FileText,
} from "lucide-react";

const API_BASE = "/api/ceph";

const ALLOWED_EXT = new Set(['.pcap', '.pcapng', '.zip', '.tar', '.gz', '.tgz', '.bz2', '.tbz2', '.xz', '.txz', '.zst', '.7z', '.rar', '.log']);

/* ── helpers ────────────────────────────────────── */
function formatSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function fileExt(name = "") {
  return (name.split(".").pop() || "").toLowerCase();
}

function getFileType(name = "") {
  const ext = "." + fileExt(name);
  if ([".pcap", ".pcapng"].includes(ext))
    return { label: "PCAP", cls: "type-pcap" };
  if ([".zip", ".tar", ".gz", ".tgz", ".bz2", ".tbz2", ".xz", ".txz", ".zst", ".7z", ".rar"].includes(ext))
    return { label: "Archive", cls: "type-arc" };
  if (ext === ".log")
    return { label: "Log", cls: "type-log" };
  return { label: ext.replace(".", "").toUpperCase() || "File", cls: "type-other" };
}

function FileIcon({ name }) {
  const ext = fileExt(name);
  const isPcap = ["pcap", "pcapng", "cap"].includes(ext);
  const isPdf  = ext === "pdf";

  if (isPcap) return (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:30, height:30, borderRadius:7, flexShrink:0,
      background:"rgba(37,99,235,.10)", color:"#2563eb",
    }}>
      <File size={14} />
    </span>
  );
  if (isPdf) return (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:30, height:30, borderRadius:7, flexShrink:0,
      background:"rgba(220,38,38,.09)", color:"#dc2626",
    }}>
      <FileText size={14} />
    </span>
  );
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:30, height:30, borderRadius:7, flexShrink:0,
      background:"rgba(75,107,154,.10)", color:"#4b6b9a",
    }}>
      <File size={14} />
    </span>
  );
}

/* ── main component ─────────────────────────────── */
export default function UploadPage() {
  const [buckets, setBuckets]             = useState([]);
  const [activeBucket, setActiveBucket]   = useState(null);
  const [files, setFiles]                 = useState([]);
  const [uploading, setUploading]         = useState(false);
  const [progress, setProgress]           = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [toast, setToast]                 = useState(null);
  const [isDragOver, setIsDragOver]       = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  const [isCreatingBucket, setIsCreating] = useState(false);
  const [deleteModal, setDeleteModal]     = useState(null);
  const [isDeleting, setIsDeleting]       = useState(false);
  const fileInputRef  = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const loadBuckets = useCallback(async ({ selectFirst = false } = {}) => {
    try {
      const res  = await fetch(`${API_BASE}/buckets`);
      const json = await res.json();
      if (!res.ok) { showToast(json.error || "Unable to fetch datasets", "error"); return; }
      const data = json.data || [];
      setBuckets(data);
      if (selectFirst && data.length) setActiveBucket(prev => prev || data[0].name);
    } catch (e) { showToast(e.message || "Network error", "error"); }
  }, [showToast]);

  async function createBucket() {
    const name = newBucketName.trim();
    if (!name) { showToast("Enter a dataset name", "error"); return; }
    setIsCreating(true);
    try {
      const res  = await fetch(`${API_BASE}/buckets`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: name }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`Dataset "${name}" created`);
        setNewBucketName("");
        await loadBuckets();
        setActiveBucket(name);
      } else {
        showToast(json.error || json.message || "Failed to create dataset", "error");
      }
    } catch (e) { showToast(e.message || "Network error", "error"); }
    finally     { setIsCreating(false); }
  }

  function confirmDeleteBucket(name, event) {
    event.stopPropagation();
    setDeleteModal({ type: "bucket", key: name, name: `dataset "${name}" and all its files` });
  }

  async function executeBucketDelete(name) {
    setIsDeleting(true);
    try {
      const res  = await fetch(`${API_BASE}/buckets/${encodeURIComponent(name)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || json.message || "Failed to delete dataset", "error"); return; }
      showToast(`Dataset "${name}" deleted`);
      if (activeBucket === name) { setActiveBucket(null); setFiles([]); }
      await loadBuckets();
    } catch (e) { showToast(e.message || "Network error", "error"); }
    finally { setIsDeleting(false); setDeleteModal(null); }
  }

  const loadFiles = useCallback(async (bucket) => {
    try {
      const res  = await fetch(`${API_BASE}/buckets/${encodeURIComponent(bucket)}/objects`);
      const json = await res.json();
      if (!res.ok) { showToast(json.error || "Unable to fetch files", "error"); setFiles([]); return; }
      setFiles(json.data || []);
    } catch (e) { showToast(e.message || "Network error", "error"); setFiles([]); }
  }, [showToast]);

  useEffect(() => {
    const t = setTimeout(() => loadBuckets({ selectFirst: true }), 0);
    return () => clearTimeout(t);
  }, [loadBuckets]);

  useEffect(() => {
    if (!activeBucket) return;
    const t = setTimeout(() => loadFiles(activeBucket), 0);
    return () => clearTimeout(t);
  }, [activeBucket, loadFiles]);

  async function uploadFiles(fileList) {
    if (!activeBucket || !fileList.length) return;

    const arr      = Array.from(fileList);
    const rejected = arr.filter(f => !ALLOWED_EXT.has("." + fileExt(f.name)));
    const allowed  = arr.filter(f =>  ALLOWED_EXT.has("." + fileExt(f.name)));

    if (rejected.length) {
      showToast(
        `Rejected ${rejected.length} file(s): ${rejected.map(f => f.name).join(", ")} — unsupported type`,
        "error"
      );
    }
    if (!allowed.length) return;

    setUploading(true); setProgress(0);

    for (let i = 0; i < allowed.length; i++) {
      const file = allowed[i];
      setProgressLabel(`Uploading ${file.name} (${i + 1} / ${allowed.length})`);
      const form = new FormData();
      form.append("file", file);
      try {
        const res  = await fetch(
          `${API_BASE}/buckets/${encodeURIComponent(activeBucket)}/objects/${encodeURIComponent(file.name)}`,
          { method: "PUT", body: form }
        );
        const json = await res.json();
        if (!res.ok) showToast(json.error || `Upload failed: ${file.name}`, "error");
      } catch (e) { showToast(e.message || `Upload failed: ${file.name}`, "error"); }
      setProgress(Math.round(((i + 1) / allowed.length) * 100));
    }
    setUploading(false);
    setProgressLabel(`${allowed.length} file(s) uploaded`);
    showToast(`Uploaded ${allowed.length} file(s) to "${activeBucket}"`);
    loadFiles(activeBucket);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function confirmDeleteFile(key) {
    if (!activeBucket) return;
    setDeleteModal({ type: "file", key, name: key });
  }

  async function executeFileDelete(key) {
    setIsDeleting(true);
    try {
      const res  = await fetch(
        `${API_BASE}/buckets/${encodeURIComponent(activeBucket)}/objects/${encodeURIComponent(key)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) { showToast(json.error || "Delete failed", "error"); return; }
      showToast(`Deleted "${key}"`);
      loadFiles(activeBucket);
    } catch (e) { showToast(e.message || "Network error", "error"); }
    finally { setIsDeleting(false); setDeleteModal(null); }
  }

  function handleConfirmDelete() {
    if (!deleteModal) return;
    if (deleteModal.type === "file") executeFileDelete(deleteModal.key);
    else executeBucketDelete(deleteModal.key);
  }

  async function downloadFile(key) {
    if (!activeBucket) return;
    try {
      const res = await fetch(
        `${API_BASE}/buckets/${encodeURIComponent(activeBucket)}/objects/${encodeURIComponent(key)}`
      );
      if (!res.ok) { showToast("Download failed", "error"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = key.split("/").pop(); a.click();
      URL.revokeObjectURL(url);
    } catch (e) { showToast(e.message || "Network error", "error"); }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  /* ── render ───────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

        /* ══ Light theme ══ */
        .up-root {
          --acc:         #2563eb;
          --acc-h:       #1d4ed8;
          --acc-deep:    #1e3a5f;
          --bg:          #f0f4f8;
          --card:        #ffffff;
          --card2:       #e8eef7;
          --bdr:         rgba(30,58,95,.10);
          --bdr-b:       rgba(37,99,235,.22);
          --acc10:       rgba(37,99,235,.10);
          --acc05:       rgba(37,99,235,.05);
          --green:       #059669;
          --red:         #dc2626;
          --red-h:       #b91c1c;
          --red08:       rgba(220,38,38,.08);
          --red15:       rgba(220,38,38,.15);
          --red25:       rgba(220,38,38,.22);
          --fg:          #0f1f3d;
          --fgm:         #4b6b9a;
          --fgd:         #a8bcd4;
          --row-h:       rgba(37,99,235,.04);
          --shadow-sm:   0 1px 3px rgba(30,58,95,.07), 0 4px 16px rgba(30,58,95,.06);
          --shadow-md:   0 4px 24px rgba(30,58,95,.09);

          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 17px;
          -webkit-font-smoothing: antialiased;
          background: var(--bg);
          color: var(--fg);
          min-height: 100vh;
          padding: 28px;
        }

        /* ══ Dark theme ══ */
        [data-theme='dark'] .up-root {
          --acc:         #3b82f6;
          --acc-h:       #2563eb;
          --acc-deep:    #0f172a;
          --bg:          #0a0f1e;
          --card:        #0f172a;
          --card2:       #1e293b;
          --bdr:         rgba(59,130,246,.13);
          --bdr-b:       rgba(59,130,246,.28);
          --acc10:       rgba(59,130,246,.13);
          --acc05:       rgba(59,130,246,.06);
          --green:       #00e5a0;
          --red:         #f87171;
          --red-h:       #ef4444;
          --red08:       rgba(248,113,113,.08);
          --red15:       rgba(248,113,113,.15);
          --red25:       rgba(248,113,113,.25);
          --fg:          #e2e8f0;
          --fgm:         #94a3b8;
          --fgd:         #1e3a5f;
          --row-h:       rgba(59,130,246,.06);
          --shadow-sm:   0 1px 4px rgba(0,0,0,.3), 0 4px 16px rgba(0,0,0,.25);
          --shadow-md:   0 6px 28px rgba(0,0,0,.4);
        }

        /* ── Page header ── */
        .up-header {
          background: var(--acc-deep);
          border-radius: 16px;
          padding: 24px 30px;
          margin-bottom: 20px;
          display: flex; align-items: center; gap: 14px;
          position: relative; overflow: hidden;
          box-shadow: var(--shadow-md);
        }
        .up-header::after {
          content:''; position:absolute; top:-60px; right:-60px;
          width:220px; height:220px;
          background: radial-gradient(circle, rgba(37,99,235,.22) 0%, transparent 65%);
          pointer-events: none;
        }
        .up-hicon {
          width:46px; height:46px; border-radius:12px; flex-shrink:0;
          background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.16);
          display:flex; align-items:center; justify-content:center;
          position: relative; z-index:1;
        }
        .up-htitle {
          font-size:1.3rem; font-weight:600; color:#fff;
          letter-spacing:-0.02em; position:relative; z-index:1;
        }

        /* ── Layout grid ── */
        .up-grid {
          display: grid;
          grid-template-columns: 256px 1fr;
          gap: 18px;
          align-items: start;
        }
        @media(max-width:860px){ .up-grid { grid-template-columns:1fr; } }

        /* ── Sidebar ── */
        .up-sidebar {
          background:var(--card);
          border:1px solid var(--bdr);
          border-radius:16px;
          padding:20px;
          box-shadow:var(--shadow-sm);
        }
        .up-eye   { font-size:.75rem; text-transform:uppercase; letter-spacing:.12em; color:var(--fgm); font-weight:600; margin-bottom:3px; }
        .up-stitle{ font-size:1.05rem; font-weight:600; color:var(--fg); letter-spacing:-0.02em; margin-bottom:12px; }

        .up-blist { display:flex; flex-direction:column; gap:3px; margin-bottom:12px; }
        .up-bbtn  {
          width:100%; text-align:left; padding:8px 10px;
          border-radius:9px; border:1px solid transparent;
          background:transparent; color:var(--fgm);
          cursor:pointer; font-family:inherit; font-size:.95rem; font-weight:400;
          display:flex; align-items:center; justify-content:space-between;
          transition:all .15s; letter-spacing:-0.01em;
        }
        .up-bbtn:hover { background:var(--card2); color:var(--fg); }
        .up-bbtn.on    { background:var(--acc10); border-color:var(--bdr-b); color:var(--acc); font-weight:500; }
        .up-bdot       { width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.35; flex-shrink:0; margin-right:8px; }
        .up-bbtn.on .up-bdot { opacity:1; }
        .up-bmain      { display:flex; align-items:center; min-width:0; flex:1; }
        .up-bname      { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .up-bactions   { display:flex; align-items:center; gap:5px; flex-shrink:0; }
        .up-bmeta      { font-size:.8rem; color:var(--fgm); opacity:.65; }
        .up-bdel       {
          display:inline-flex; align-items:center; justify-content:center;
          width:22px; height:22px; border:1px solid transparent;
          border-radius:5px; background:transparent; color:var(--fgm);
          opacity:.35; transition:all .15s; cursor:pointer;
        }
        .up-bbtn:hover .up-bdel { opacity:.7; }
        .up-bdel:hover { color:var(--red); border-color:var(--red25); background:var(--red08); opacity:1; }
        .up-bempty { font-size:.9rem; color:var(--fgm); text-align:center; padding:14px 0; border:1px dashed var(--bdr); border-radius:8px; }

        .up-nb-row { display:flex; gap:7px; padding-top:12px; border-top:1px solid var(--bdr); }
        .up-nb-inp {
          flex:1; background:var(--bg); border:1px solid var(--bdr);
          color:var(--fg); padding:7px 10px; border-radius:8px;
          font-size:.9rem; font-family:inherit; transition:border-color .2s;
        }
        .up-nb-inp:focus        { outline:none; border-color:var(--acc); }
        .up-nb-inp::placeholder { color:var(--fgd); }
        .up-btn-cr {
          background:var(--acc); color:#fff; border:none;
          border-radius:8px; padding:7px 14px;
          font-size:1rem; font-weight:600; cursor:pointer;
          font-family:inherit; transition:all .15s;
        }
        .up-btn-cr:hover    { background:var(--acc-h); }
        .up-btn-cr:disabled { opacity:.4; cursor:not-allowed; }

        /* ── Main panel ── */
        .up-main {
          background:var(--card);
          border:1px solid var(--bdr);
          border-radius:16px;
          padding:24px;
          display:flex; flex-direction:column; gap:18px;
          box-shadow:var(--shadow-sm);
        }
        .up-main-head {
          display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;
        }
        .up-bucket-name { font-size:1.15rem; font-weight:600; color:var(--fg); letter-spacing:-0.02em; }
        .up-status {
          display:inline-flex; align-items:center; gap:7px;
          background:var(--bg); border:1px solid var(--bdr);
          border-radius:20px; padding:5px 12px;
          font-size:.9rem; color:var(--fgm);
        }
        .up-sdot     { width:7px; height:7px; border-radius:50%; background:var(--fgd); transition:background .3s; }
        .up-sdot.on  { background:var(--green); box-shadow:0 0 5px var(--green); }
        .up-sval     { color:var(--fg); font-weight:500; font-size:.92rem; letter-spacing:-0.01em; }

        /* ── Drop zone ── */
        .up-dz {
          border:1.5px dashed var(--bdr-b); border-radius:12px;
          padding:38px 24px; text-align:center; cursor:pointer;
          transition:all .2s; background:var(--bg); position:relative; overflow:hidden;
        }
        .up-dz::before {
          content:''; position:absolute; inset:0;
          background:radial-gradient(ellipse at 50% 0%, var(--acc05) 0%, transparent 65%);
          pointer-events:none;
        }
        .up-dz.over { border-color:var(--acc); background:var(--acc05); }
        .up-dz-icon  { color:var(--acc); opacity:.65; margin-bottom:10px; }
        .up-dz-title { font-size:1.05rem; font-weight:600; color:var(--fg); margin-bottom:4px; letter-spacing:-0.02em; }
        .up-dz-sub   { font-size:.9rem; color:var(--fgm); }
        .up-dz-link  { color:var(--acc); cursor:pointer; }
        .up-dz-link:hover { text-decoration:underline; }
        .up-dz-hint  { font-size:.82rem; color:var(--fgd); margin-top:6px; }

        /* ── Progress ── */
        .up-prog { background:var(--bg); border:1px solid var(--bdr); border-radius:10px; padding:12px 15px; }
        .up-prog-row  { display:flex; justify-content:space-between; margin-bottom:7px; font-size:.9rem; }
        .up-prog-lbl  { color:var(--fgm); }
        .up-prog-pct  { color:var(--acc); font-weight:600; }
        .up-prog-track{ height:3px; background:var(--bdr); border-radius:2px; overflow:hidden; }
        .up-prog-fill { height:100%; background:linear-gradient(90deg,var(--acc-deep),var(--acc)); transition:width .2s ease; }

        /* ══════════════════════════════════════════
           FILE TABLE
        ══════════════════════════════════════════ */
        .up-files { border:1px solid var(--bdr); border-radius:12px; overflow:hidden; background:var(--card); }

        .up-fhead {
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 18px; border-bottom:1px solid var(--bdr);
          background: var(--card);
        }
        .up-ftitle { font-size:1rem; font-weight:600; color:var(--fg); letter-spacing:-0.01em; }
        .up-fcount {
          font-size:.78rem; color:var(--acc); background:var(--acc10);
          padding:2px 8px; border-radius:10px; margin-left:7px; font-weight:500;
        }
        .up-btn-ic {
          display:inline-flex; align-items:center; justify-content:center;
          width:30px; height:30px; background:var(--card2); border:1px solid var(--bdr);
          border-radius:7px; cursor:pointer; color:var(--fgm); transition:all .15s;
        }
        .up-btn-ic:hover { border-color:var(--acc); color:var(--acc); }

        .up-tbl-wrap { overflow-x:auto; }
        .up-tbl {
          width:100%; border-collapse:collapse;
          font-size:.95rem; table-layout:fixed;
        }
        .up-tbl colgroup col:nth-child(1) { width:32%; }
        .up-tbl colgroup col:nth-child(2) { width:11%; }
        .up-tbl colgroup col:nth-child(3) { width:10%; }
        .up-tbl colgroup col:nth-child(4) { width:22%; }
        .up-tbl colgroup col:nth-child(5) { width:25%; }

        .up-tbl thead tr {
          background: var(--bg);
          border-bottom: 1px solid var(--bdr);
        }
        .up-tbl thead th {
          padding: 10px 18px;
          text-align: left;
          font-size: .88rem;
          font-weight: 500;
          color: var(--fgm);
          letter-spacing: 0;
          white-space: nowrap;
        }
        .up-tbl thead th:last-child { text-align:right; }

        .up-tbl tbody tr {
          border-bottom: 1px solid var(--bdr);
          transition: background .12s;
        }
        .up-tbl tbody tr:last-child { border-bottom:none; }
        .up-tbl tbody tr:hover { background: var(--row-h); }

        .up-tbl tbody td {
          padding: 12px 18px;
          vertical-align: middle;
        }
        .up-tbl tbody td:last-child { text-align:right; }

        /* name cell */
        .up-name-cell {
          display:flex; align-items:center; gap:10px;
          overflow:hidden;
        }
        .up-fname {
          font-size:.95rem; font-weight:500; color:var(--fg);
          letter-spacing:-0.01em;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .up-fext-badge {
          flex-shrink:0;
          font-size:.62rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em;
          padding:2px 6px; border-radius:5px;
        }
        .up-fext-badge.pcap  { background:rgba(37,99,235,.10); color:var(--acc); }
        .up-fext-badge.pdf   { background:rgba(220,38,38,.09); color:var(--red); }
        .up-fext-badge.other { background:rgba(75,107,154,.10); color:var(--fgm); }

        /* type column */
        .up-ftype { font-size:.78rem; font-weight:400; color:var(--fgm); }
        .type-pcap, .type-arc, .type-log, .type-other { background:none; border:none; padding:0; }

        /* size / date cells */
        .up-fsize { font-size:.92rem; color:var(--fgm); font-variant-numeric: tabular-nums; }
        .up-fdate { font-size:.9rem; color:var(--fgm); }

        /* action buttons */
        .up-acts { display:flex; gap:6px; align-items:center; justify-content:flex-end; }

        .up-btn-dl {
          display:inline-flex; align-items:center; gap:5px;
          padding:5px 12px; border-radius:7px;
          font-size:.88rem; font-weight:500; cursor:pointer;
          font-family:inherit; letter-spacing:-0.01em; transition:all .15s;
          border:1px solid rgba(37,99,235,.22);
          background:rgba(37,99,235,.07); color:var(--acc);
        }
        .up-btn-dl:hover {
          background:var(--acc); color:#fff; border-color:var(--acc);
          transform:translateY(-1px); box-shadow:0 3px 8px var(--acc10);
        }
        .up-btn-del {
          display:inline-flex; align-items:center; gap:5px;
          padding:5px 12px; border-radius:7px;
          font-size:.88rem; font-weight:500; cursor:pointer;
          font-family:inherit; letter-spacing:-0.01em; transition:all .15s;
          border:1px solid var(--red25); background:var(--red08); color:var(--red);
        }
        .up-btn-del:hover {
          background:var(--red); color:#fff; border-color:var(--red);
          transform:translateY(-1px); box-shadow:0 3px 8px var(--red15);
        }

        /* ── Empty state ── */
        .up-empty {
          display:flex; flex-direction:column; align-items:center; padding:48px 24px; gap:10px;
        }
        .up-empty-icon {
          width:50px; height:50px; border-radius:13px; margin-bottom:4px;
          background:var(--acc10); border:1px solid var(--bdr-b);
          display:flex; align-items:center; justify-content:center;
          color:var(--acc); opacity:.75;
        }
        .up-empty-title { font-size:1rem; font-weight:600; color:var(--fg); letter-spacing:-0.01em; }
        .up-empty-sub   { font-size:.9rem; color:var(--fgm); text-align:center; max-width:260px; line-height:1.55; }

        /* ── Delete Modal ── */
        .up-overlay {
          position:fixed; inset:0; z-index:500;
          background:rgba(15,31,63,.48); backdrop-filter:blur(4px);
          display:flex; align-items:center; justify-content:center;
          animation:up-fade .18s ease;
        }
        [data-theme='dark'] .up-overlay { background:rgba(0,0,0,.65); }
        .up-modal {
          background:var(--card); border:1px solid var(--red25);
          border-radius:16px; padding:28px; width:100%; max-width:390px;
          box-shadow:0 20px 48px rgba(0,0,0,.16),0 0 0 1px var(--red15);
          animation:up-pop .22s cubic-bezier(.34,1.56,.64,1);
        }
        .up-modal-icon  { width:46px; height:46px; border-radius:11px; margin-bottom:16px; background:var(--red08); border:1px solid var(--red25); display:flex; align-items:center; justify-content:center; color:var(--red); }
        .up-modal-title { font-size:1.15rem; font-weight:600; color:var(--fg); margin-bottom:7px; letter-spacing:-0.02em; }
        .up-modal-body  { font-size:.92rem; color:var(--fgm); line-height:1.6; margin-bottom:22px; }
        .up-modal-file  { display:inline-block; background:var(--red08); border:1px solid var(--red15); border-radius:5px; padding:3px 7px; font-size:.75rem; color:var(--red); word-break:break-all; margin-top:5px; font-weight:600; }
        .up-modal-acts  { display:flex; gap:8px; justify-content:flex-end; }
        .up-modal-cancel{
          padding:8px 17px; border-radius:8px; font-size:.92rem; font-weight:500;
          cursor:pointer; font-family:inherit; transition:all .15s;
          background:var(--card2); border:1px solid var(--bdr); color:var(--fgm); letter-spacing:-0.01em;
        }
        .up-modal-cancel:hover { color:var(--fg); border-color:var(--acc); }
        .up-modal-confirm{
          padding:8px 18px; border-radius:8px; font-size:.92rem; font-weight:600;
          cursor:pointer; font-family:inherit; transition:all .15s;
          background:var(--red); border:none; color:#fff;
          box-shadow:0 3px 9px var(--red15); letter-spacing:-0.01em;
        }
        .up-modal-confirm:hover    { background:var(--red-h); transform:translateY(-1px); }
        .up-modal-confirm:disabled { opacity:.5; cursor:not-allowed; transform:none; }

        /* ── Toast ── */
        .up-toast {
          position:fixed; bottom:24px; right:24px; z-index:1000;
          background:var(--acc-deep); border:1px solid rgba(37,99,235,.35);
          border-radius:10px; padding:11px 15px; font-size:.92rem;
          display:flex; align-items:center; gap:9px;
          max-width:320px; box-shadow:var(--shadow-md);
          animation:up-slide .25s ease; color:#dbeafe;
          font-weight:400; letter-spacing:-0.01em;
        }
        [data-theme='dark'] .up-toast { background:var(--card); color:var(--fg); }
        .up-toast.error { border-color:rgba(220,38,38,.35); }

        @keyframes up-slide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes up-fade  { from{opacity:0} to{opacity:1} }
        @keyframes up-pop   { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }
      `}</style>

      <div className="up-root">

        {/* header */}
        <div className="up-header">
          <div className="up-hicon"><UploadCloud size={21} color="#fff" /></div>
          <div className="up-htitle">Upload PCAPs &amp; Related Files</div>
        </div>

        <div className="up-grid">

          {/* sidebar */}
          <div className="up-sidebar">
            <div className="up-eye">PCAP Dataset Management</div>
            <div className="up-stitle">Select or create a dataset</div>
            <div className="up-blist">
              {buckets.length === 0 ? (
                <div className="up-bempty">No datasets yet</div>
              ) : buckets.map((b) => (
                <div
                  key={b.name} role="button" tabIndex={0}
                  className={`up-bbtn${activeBucket === b.name ? " on" : ""}`}
                  onClick={() => setActiveBucket(b.name)}
                  onKeyDown={(e) => { if (e.key==="Enter"||e.key===" ") setActiveBucket(b.name); }}
                >
                  <span className="up-bmain">
                    <span className="up-bdot" />
                    <span className="up-bname">{b.name}</span>
                  </span>
                  <span className="up-bactions">
                    <span className="up-bmeta">
                      {b.created ? new Date(b.created).toLocaleDateString() : "—"}
                    </span>
                    <span role="button" tabIndex={0} className="up-bdel"
                      title={`Delete ${b.name}`}
                      onClick={(e) => confirmDeleteBucket(b.name, e)}
                      onKeyDown={(e) => { if (e.key==="Enter"||e.key===" ") confirmDeleteBucket(b.name, e); }}
                    >
                      <Trash2 size={11} />
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="up-nb-row">
              <input className="up-nb-inp" type="text" placeholder="new-dataset-name"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                onKeyDown={(e) => e.key==="Enter" && createBucket()}
              />
              <button className="up-btn-cr" onClick={createBucket} disabled={isCreatingBucket}>
                {isCreatingBucket ? "…" : "+"}
              </button>
            </div>
          </div>

          {/* main */}
          <div className="up-main">

            <div className="up-main-head">
              <div className="up-bucket-name">{activeBucket || "No dataset selected"}</div>
              <div className="up-status">
                <span className={`up-sdot${(files.length > 0 || uploading) ? " on" : ""}`} />
                <span className="up-sval">
                  {uploading ? "Uploading…"
                    : files.length ? `${files.length} file${files.length !== 1 ? "s" : ""}`
                    : "No files uploaded"}
                </span>
              </div>
            </div>

            {/* drop zone */}
            <div
              role="button"
              tabIndex={0}
              className={`up-dz${isDragOver ? " over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
            >
              <div className="up-dz-icon"><UploadCloud size={34} /></div>
              <div className="up-dz-title">Drop files here to upload</div>
              <div className="up-dz-sub">
                or <span className="up-dz-link">browse files</span>
              </div>
              <div className="up-dz-hint">
                Accepted: .pcap, .pcapng, .tar, .zip, .rar, .log
              </div>
              <input ref={fileInputRef} type="file" multiple style={{ display:"none" }}
                accept=".pcap,.pcapng,.zip,.tar,.gz,.tgz,.bz2,.tbz2,.xz,.txz,.zst,.7z,.rar,.log"
                onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); }}
              />
            </div>

            {/* progress */}
            {uploading && (
              <div className="up-prog">
                <div className="up-prog-row">
                  <span className="up-prog-lbl">{progressLabel}</span>
                  <span className="up-prog-pct">{progress}%</span>
                </div>
                <div className="up-prog-track">
                  <div className="up-prog-fill" style={{ width:`${progress}%` }} />
                </div>
              </div>
            )}

            {/* files table */}
            <div className="up-files">
              <div className="up-fhead">
                <div style={{ display:"flex", alignItems:"center" }}>
                  <span className="up-ftitle">Uploaded Files</span>
                  {files.length > 0 && <span className="up-fcount">{files.length}</span>}
                </div>
                <button className="up-btn-ic"
                  onClick={() => activeBucket && loadFiles(activeBucket)}
                  title="Refresh files"
                >
                  <RefreshCcw size={13} />
                </button>
              </div>

              <div className="up-tbl-wrap">
                {files.length === 0 ? (
                  <div className="up-empty">
                    <div className="up-empty-icon"><FileX size={22} /></div>
                    <div className="up-empty-title">No files uploaded yet</div>
                    <div className="up-empty-sub">
                      {activeBucket
                        ? `Drop files above to upload them to "${activeBucket}"`
                        : "Select a dataset first, then drop files to upload"}
                    </div>
                  </div>
                ) : (
                  <table className="up-tbl">
                    <colgroup><col /><col /><col /><col /><col /></colgroup>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Modified</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((f) => {
                        const fileType = getFileType(f.key);
                        return (
                          <tr key={f.key}>
                            {/* name */}
                            <td>
                              <div className="up-name-cell">
                                <FileIcon name={f.key} />
                                <span className="up-fname" title={f.key}>
                                  {f.key}
                                </span>
                              </div>
                            </td>
                            {/* type */}
                            <td>
                              <span className={`up-ftype ${fileType.cls}`}>
                                {fileType.label}
                              </span>
                            </td>
                            {/* size */}
                            <td><span className="up-fsize">{formatSize(f.size)}</span></td>
                            {/* modified */}
                            <td>
                              <span className="up-fdate">
                                {f.last_modified
                                  ? new Date(f.last_modified).toLocaleString()
                                  : "—"}
                              </span>
                            </td>
                            {/* actions */}
                            <td>
                              <div className="up-acts">
                                <button className="up-btn-dl" onClick={() => downloadFile(f.key)}>
                                  <Download size={12} /> Download
                                </button>
                                <button className="up-btn-del" onClick={() => confirmDeleteFile(f.key)}>
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* delete modal */}
        {deleteModal && (
          <div role="presentation" className="up-overlay" onClick={() => !isDeleting && setDeleteModal(null)}>
            <div role="dialog" aria-modal="true" className="up-modal" onClick={(e) => e.stopPropagation()}>
              <div className="up-modal-icon"><Trash2 size={20} /></div>
              <div className="up-modal-title">Confirm Deletion</div>
              <div className="up-modal-body">
                This action cannot be undone. You are about to permanently delete:
                <br />
                <span className="up-modal-file">{deleteModal.name}</span>
              </div>
              <div className="up-modal-acts">
                <button className="up-modal-cancel" onClick={() => setDeleteModal(null)} disabled={isDeleting}>
                  Cancel
                </button>
                <button className="up-modal-confirm" onClick={handleConfirmDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* toast */}
        {toast && (
          <div className={`up-toast ${toast.type}`}>
            {toast.type === "success"
              ? <CheckCircle size={14} color="var(--green)" />
              : <AlertCircle size={14} color="var(--red)" />}
            {toast.message}
          </div>
        )}

      </div>
    </>
  );
}