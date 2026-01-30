import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "../../stores/settings";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

export function ApiKeys() {
  const t = useTranslations();
  const didAttemptDefaultKey = useRef(false);
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const api = window.electronAPI?.apiKeys;

  useEffect(() => {
    loadKeys();
  }, []);

  const generateDefaultKey = () => {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join("");
    const timestamp = Date.now().toString(36).toUpperCase();
    return `linjun-${randomHex.substring(0, 8)}-${timestamp.slice(-4)}`;
  };

  const loadKeys = async () => {
    try {
      setLoading(true);
      const result = await api?.getAll();
      if (result?.success) {
        const currentKeys = result.keys || [];

        if (currentKeys.length === 0 && !didAttemptDefaultKey.current) {
          didAttemptDefaultKey.current = true;
          const newKey = generateDefaultKey();
          const addResult = await api?.add(newKey);
          if (addResult?.success) {
            setKeys(addResult.keys);
          }
        } else {
          setKeys(currentKeys);
        }
      }
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomKey = () => {
    // Use crypto for truly unique random values
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join("");
    const timestamp = Date.now().toString(36).toUpperCase();
    // Format: linjun-{8 char random}-{4 char timestamp}
    const newKey = `linjun-${randomHex.substring(0, 8)}-${timestamp.slice(-4)}`;
    setInputKey(newKey);
  };

  const handleCreate = async () => {
    if (!inputKey.trim()) {
      setError(t.apiKeys.keyEmpty);
      return;
    }

    try {
      setError(null);
      const result = await api?.add(inputKey);
      if (result?.success) {
        setKeys(result.keys);
        closeModal();
      } else if (result?.error?.includes("already exists")) {
        // If key already exists, generate a new one and try again
        generateRandomKey();
        setError(t.apiKeys.keyExists + ". " + t.apiKeys.generateRandom);
      } else {
        setError(result?.error || t.apiKeys.keyExists);
      }
    } catch {
      setError(t.apiKeys.createError);
    }
  };

  const handleUpdate = async () => {
    if (!inputKey.trim() || !editKey) {
      setError(t.apiKeys.keyEmpty);
      return;
    }

    try {
      setError(null);
      const result = await api?.update(editKey, inputKey);
      if (result?.success) {
        setKeys(result.keys);
        closeModal();
      } else {
        setError(result?.error || t.apiKeys.keyExists);
      }
    } catch {
      setError(t.apiKeys.updateError);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      const result = await api?.delete(key);
      if (result?.success) {
        setKeys(result.keys);
        setShowDeleteConfirm(null);
      }
    } catch (err) {
      console.error("Failed to delete key:", err);
    }
  };

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditKey(null);
    setInputKey("");
    setError(null);
    setShowModal(true);
    // Generate a unique key by using timestamp + random
    generateRandomKey();
  };

  const openEditModal = (key: string) => {
    setModalMode("edit");
    setEditKey(key);
    setInputKey(key);
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditKey(null);
    setInputKey("");
    setError(null);
  };

  const formatDate = () => {
    return new Date().toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {t.nav.apiKeys}
          </h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {t.apiKeys.subtitle}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="glass-btn glass-btn-teal flex items-center gap-2 group transition-all duration-300 hover:shadow-teal-500/20 shadow-lg"
        >
          <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
          {t.apiKeys.createKey}
        </motion.button>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full mx-auto" />
          <p className="text-[var(--text-muted)] text-sm mt-4">
            {t.apiKeys.loading}
          </p>
        </div>
      ) : keys.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Key className="w-12 h-12 text-[var(--text-dim)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {t.apiKeys.noKeys}
          </h3>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            {t.apiKeys.noKeysDesc}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="glass-btn glass-btn-teal mt-6"
          >
            {t.apiKeys.createKey}
          </motion.button>
        </div>
      ) : (
        <div className="glass-card p-4">
          <h3 className="text-xs font-bold tracking-widest text-[var(--text-dim)] mb-4">
            {t.apiKeys.activeKeys}
          </h3>

          <div className="space-y-3">
            {keys.map((key) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 rounded-xl border border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/5"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="status-dot status-dot-online" />
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-[var(--accent-teal)] truncate">
                      {key}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {t.apiKeys.created}: {formatDate()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCopy(key)}
                    className="glass-btn text-xs py-1.5 px-3 flex items-center gap-1.5 bg-[var(--text-primary)]/5 border-[var(--text-primary)]/15 hover:bg-[var(--text-primary)]/10 hover:border-[var(--text-primary)]/30 text-[var(--text-primary)] font-medium shadow-sm transition-all"
                  >
                    {copiedKey === key ? (
                      <>
                        <Check className="w-3 h-3 text-[var(--success)]" />
                        <span className="text-[var(--success)] font-bold">
                          {t.apiKeys.copied}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                        <span className="text-[var(--text-primary)]/90 group-hover:text-[var(--text-primary)]">
                          {t.apiKeys.copy}
                        </span>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openEditModal(key)}
                    className="glass-btn text-xs py-1.5 px-3 flex items-center gap-1.5 bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]/20 text-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/20 hover:border-[var(--accent-teal)]/40 hover:shadow-[0_0_12px_rgba(100,210,255,0.2)] transition-all font-semibold"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{t.apiKeys.edit}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowDeleteConfirm(key)}
                    className="p-2 text-red-500/70 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {createPortal(
        <AnimatePresence mode="wait">
          {showModal && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl"
                style={{ WebkitBackdropFilter: "blur(24px)" }}
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className="relative w-full max-w-[500px] rounded-2xl overflow-hidden shadow-[0_0_60px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_0_60px_-15px_rgba(0,0,0,0.8)] border border-[var(--glass-border)] isolation-isolate"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute inset-0 bg-[var(--bg-primary)]/90 backdrop-blur-3xl z-[-1]" />

                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 via-[var(--bg-primary)]/95 to-[var(--accent-secondary)]/5 z-[-1]" />

                <div
                  className="absolute -top-[20%] -right-[10%] w-[300px] h-[300px] bg-[var(--accent-primary)]/15 blur-[100px] rounded-full pointer-events-none animate-pulse"
                  style={{ animationDuration: "4s" }}
                />
                <div
                  className="absolute -bottom-[20%] -left-[10%] w-[300px] h-[300px] bg-[var(--accent-secondary)]/15 blur-[100px] rounded-full pointer-events-none animate-pulse"
                  style={{ animationDuration: "5s" }}
                />

                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-80 shadow-[0_0_20px_var(--accent-primary)] z-20" />

                <form
                  className="relative z-10 p-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    modalMode === "create" ? handleCreate() : handleUpdate();
                  }}
                >
                  <div className="bg-[var(--bg-secondary)]/20 rounded-xl border border-[var(--glass-border)] p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white shadow-lg shadow-[var(--accent-primary)]/20">
                          {modalMode === "create" ? (
                            <Sparkles className="w-6 h-6 fill-white/20" />
                          ) : (
                            <Pencil className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                            {modalMode === "create"
                              ? t.apiKeys.createTitle
                              : t.apiKeys.editTitle}
                          </h3>
                          <p className="text-xs text-[var(--text-primary)]/70 font-bold">
                            {modalMode === "create"
                              ? t.apiKeys.createSubtitle
                              : t.apiKeys.editSubtitle}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={closeModal}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-primary)]/80 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <Key className="w-3.5 h-3.5" />
                          {t.apiKeys.keyValueLabel}
                        </label>
                        <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--accent-primary)]/30 to-[var(--accent-secondary)]/30 rounded-xl opacity-0 group-focus-within:opacity-100 transition-all blur-sm" />
                          <div className="relative flex items-center">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={inputKey}
                              onChange={(e) => setInputKey(e.target.value)}
                              placeholder={t.apiKeys.keyPlaceholder}
                              className="w-full bg-[var(--bg-deep)] border border-[var(--glass-border)] rounded-xl pl-4 pr-12 py-3.5 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:outline-none focus:border-[var(--accent-primary)]/50 transition-all shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 p-1.5 text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors rounded-md"
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {modalMode === "create" && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={generateRandomKey}
                          className="w-full py-3 px-4 rounded-xl bg-[var(--bg-primary)]/20 border border-[var(--glass-border)] hover:bg-[var(--bg-primary)]/40 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-all text-sm font-bold flex items-center justify-center gap-2 group"
                        >
                          <RefreshCw className="w-4 h-4 transition-transform duration-500 group-hover:rotate-180 text-[var(--accent-primary)]" />
                          <span>{t.apiKeys.generateNewRandom}</span>
                        </motion.button>
                      )}

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg p-3 overflow-hidden"
                          >
                            <p className="text-sm text-[var(--error)] flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--error)] shrink-0" />
                              {error}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 py-3.5 rounded-xl bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-primary)]/40 text-[var(--text-primary)] transition-all font-bold text-sm active:scale-95 border border-[var(--glass-border)]"
                      >
                        {t.apiKeys.cancel}
                      </button>

                      <button
                        type="submit"
                        className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-bold text-sm shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] hover:brightness-110 transition-all active:scale-[0.98] border border-white/10 relative overflow-hidden group"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {modalMode === "create" ? (
                            <>
                              <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                              {t.apiKeys.create}
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              {t.apiKeys.save}
                            </>
                          )}
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence mode="wait">
          {showDeleteConfirm && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={() => setShowDeleteConfirm(null)}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl"
                style={{ WebkitBackdropFilter: "blur(24px)" }}
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card w-[420px] p-0 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-primary)] shadow-[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 pb-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--error)]/10 flex items-center justify-center text-[var(--error)] mb-5 shadow-[0_0_20px_rgba(255,69,58,0.2)]">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {t.apiKeys.deleteConfirm}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed px-4">
                    {t.apiKeys.deleteDesc}
                  </p>
                </div>

                <div className="flex border-t border-[var(--glass-border)] bg-[var(--bg-secondary)]/30">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 py-4 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                  >
                    {t.apiKeys.cancel}
                  </button>
                  <div className="w-px bg-[var(--glass-border)]" />
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="flex-1 py-4 text-sm font-bold text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
                  >
                    {t.apiKeys.delete}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
