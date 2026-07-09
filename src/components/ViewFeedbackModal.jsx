"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  MessageSquare,
  Mail,
  Building2,
  Clock,
  AlertCircle,
  Trash,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

export function ViewFeedbackModal({ isOpen, onClose }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [deleting, setDeleting] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchFeedback();
    }
  }, [isOpen]);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const baseUrl =
        typeof window === "undefined"
          ? process.env.BACKEND_URL
          : "/api/proxy";

      const res = await fetch(`${baseUrl}/feedback`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Try to read JSON body for more helpful server messages
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        // ignore parse errors
      }

      if (!res.ok) {
        // Prefer server-provided message when available
        const serverMsg = json && (json.error || json.message);
        if (res.status >= 500) {
          throw new Error(serverMsg || "Server error. Please try again later.");
        } else if (res.status >= 400) {
          throw new Error(serverMsg || `Request failed (${res.status}).`);
        } else {
          throw new Error(serverMsg || `Unexpected response (${res.status}).`);
        }
      }

      const data = json || {};

      if (data.success && Array.isArray(data.data)) {
        setFeedbackList(data.data);
      } else if (Array.isArray(data)) {
        // in case the API returns a raw array
        setFeedbackList(data);
      } else {
        setFeedbackList([]);
        setError("No feedback available.");
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err && err.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        // Show a friendly message without raw HTTP status text
        setError(err?.message || "Failed to fetch feedback. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (idx) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleDelete = (feedback, idx) => {
    setToDelete({ feedback, idx });
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!toDelete) return;
    const { feedback, idx } = toDelete;
    setConfirmOpen(false);
    setDeleting(idx);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const baseUrl = typeof window === "undefined" ? process.env.BACKEND_URL : "/api/proxy";

      const nameId = encodeURIComponent(feedback.name || feedback.email || feedback.submitted_at);
      const res = await fetch(`${baseUrl}/feedback/${nameId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      let json = null;
      try { json = await res.json(); } catch (_) {}

      if (!res.ok && !(json && json.success)) {
        const serverMsg = json && (json.error || json.message);
        throw new Error(serverMsg || `Delete failed (${res.status}).`);
      }

      // remove item from UI
      setFeedbackList((prev) => prev.filter((_, i) => i !== idx));
      setExpanded((s) => { const n = new Set(s); n.delete(idx); return n; });
      setToDelete(null);
    } catch (err) {
      if (err && err.name === "AbortError") {
        setError("Delete request timed out. Please try again.");
      } else {
        setError(err?.message || "Failed to delete feedback. Try again later.");
      }
    } finally {
      setDeleting(null);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-card dark:bg-slate-900 overflow-auto">
      <div className="max-w-6xl mx-auto w-full min-h-screen flex flex-col bg-card border border-theme rounded-2xl shadow-2xl m-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme bg-slate-500/5 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <MessageSquare size={20} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Feedback</h2>
              <p className="text-[11px] font-bold  uppercase  mt-0.5">
                View all submitted feedback
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-500/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                <p className="text-sm font-bold text-slate-500">Loading feedback...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-rose-500/10 rounded-xl mb-3">
                  <AlertCircle size={24} className="text-rose-500" />
                </div>
                <p className="text-sm font-bold text-rose-500">{error}</p>
                <button
                  onClick={fetchFeedback}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <MessageSquare size={32} className="mx-auto text-slate-400 mb-3" />
                <p className="text-sm font-bold text-slate-500">No feedback available yet.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((feedback, index) => (
                <div
                  key={index}
                  className="bg-slate-500/5 border border-theme rounded-xl p-4 hover:border-blue-500/30 transition-colors"
                >
                  {/* User Info */}
                  <div className="grid md:grid-cols-2 grid-cols-1 gap-4 mb-3 items-start">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg flex-shrink-0 mt-0.5">
                        <MessageSquare size={14} className="text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Name
                        </p>
                        <p className="text-sm font-bold text-foreground truncate">
                          {feedback.name || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg flex-shrink-0 mt-0.5">
                        <Mail size={14} className="text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Email
                        </p>
                        <p className="text-sm font-bold text-foreground truncate">
                          {feedback.email || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="p-1.5 bg-amber-500/10 rounded-lg flex-shrink-0 mt-0.5">
                        <Building2 size={14} className="text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Organisation
                        </p>
                        <p className="text-sm font-bold text-foreground truncate">
                          {feedback.organisation || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="p-1.5 bg-slate-500/10 rounded-lg flex-shrink-0 mt-0.5">
                        <Clock size={14} className="text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Submitted
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {formatDate(feedback.submitted_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(index)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 px-3 py-1 rounded-md transition-colors"
                      >
                        {expanded.has(index) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded.has(index) ? "Hide message" : "Show message"}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(feedback, index)}
                        disabled={deleting === index}
                        className="flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-white hover:bg-rose-600/10 px-3 py-1 rounded-md transition-colors"
                      >
                        <Trash size={14} />
                        {deleting === index ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {/* Message (collapsible) */}
                  {expanded.has(index) && (
                    <div className="mt-4 pt-3 border-t border-theme">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Message
                      </p>
                      <p className="text-sm text-foreground break-words whitespace-pre-wrap">
                        {feedback.message || "No message provided"}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-theme p-4 flex justify-end gap-3 bg-slate-500/5 flex-shrink-0">
          <button
            onClick={fetchFeedback}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh
          </button>
        </div>
        <ConfirmModal
          isOpen={confirmOpen}
          title="Delete Feedback"
          description={toDelete ? `Delete feedback from ${toDelete.feedback.email || toDelete.feedback.name}? This action cannot be undone.` : undefined}
          confirmLabel="Delete"
          destructive
          onClose={() => setConfirmOpen(false)}
          onConfirm={performDelete}
        />
      </div>
    </div>
  );
}
