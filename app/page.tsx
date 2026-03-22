"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  AuditLogEntry,
  Channel,
  Language,
  Persona,
  Tone,
  WorkflowInput,
  WorkflowStage,
  WorkflowState
} from "@/lib/ace/types";

/* ─── Constants ────────────────────────────────────────────────────────── */

const defaultInput: WorkflowInput = {
  sourceType: "text",
  rawInput:
    "ACE helps enterprise content teams transform raw product docs, campaign briefs, and research notes into governed multi-channel content with auditability, localization, and measurable operational speed.",
  productName: "Autonomous Content Engine",
  audiencePersona: "enterprise-cmo",
  tone: "corporate",
  channels: ["blog", "linkedin", "twitter"],
  languages: ["en", "hi"],
  humanApproval: true,
  enableABTest: true,
  campaignObjective: "Launch an enterprise-ready AI content operations platform"
};

const stageAccent: Record<WorkflowStage, string> = {
  intake: "cyan",
  generate: "blue",
  review: "amber",
  approval: "violet",
  localize: "green",
  distribute: "pink",
  analyze: "orange",
  improve: "indigo"
};

const stageIcons: Record<WorkflowStage, string> = {
  intake: "📥",
  generate: "✍️",
  review: "🛡️",
  approval: "🧑",
  localize: "🌐",
  distribute: "📡",
  analyze: "📊",
  improve: "🔄"
};

const agentColors: Record<string, string> = {
  orchestrator: "#5b9eff",
  "content-generator": "#00f5d4",
  "compliance-brand": "#ffcc55",
  localization: "#50f0a0",
  distribution: "#ff6eb4",
  "analytics-feedback": "#ff9560"
};

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function HomePage() {
  const [input, setInput] = useState<WorkflowInput>(defaultInput);
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [visibleLogs, setVisibleLogs] = useState<AuditLogEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const previousLogCount = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);

  /* Log streaming */
  useEffect(() => {
    if (!workflow) {
      setVisibleLogs([]);
      previousLogCount.current = 0;
      return;
    }
    const nextLogs = workflow.logs.slice(previousLogCount.current);
    if (!nextLogs.length) return;
    nextLogs.forEach((log, index) => {
      window.setTimeout(() => {
        setVisibleLogs((current) => [...current, log]);
      }, index * 140);
    });
    previousLogCount.current = workflow.logs.length;
  }, [workflow]);

  /* Auto-scroll logs */
  useEffect(() => {
    if (visibleLogs.length > 0) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [visibleLogs]);

  /* Intersection observer for sidebar active section */
  useEffect(() => {
    const sections = ["dashboard", "pipeline", "logs", "analytics"];
    const observers: IntersectionObserver[] = [];

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.3 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  /* API helpers */
  async function triggerWorkflow(body: Record<string, unknown>) {
    const response = await fetch("/api/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = (await response.json()) as WorkflowState;
    setWorkflow(data);
  }

  function runWorkflow() {
    setVisibleLogs([]);
    previousLogCount.current = 0;
    setWorkflow(null);
    startTransition(() => {
      void triggerWorkflow({ action: "start", input });
    });
    // Scroll to pipeline section
    setTimeout(() => {
      pipelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }

  function continueWorkflow(action: "approve" | "reject") {
    if (!workflow) return;
    startTransition(() => {
      void triggerWorkflow({ workflowId: workflow.id, action });
    });
  }

  async function processPdfFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const response = await fetch("/api/extract", { method: "POST", body: formData });
      const data = (await response.json()) as { text: string };
      setInput((current) => ({ ...current, sourceType: "pdf", rawInput: data.text }));
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") void processPdfFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* Derived state */
  const latestLog = visibleLogs.at(-1);
  const analytics = workflow?.artifacts.analytics;
  const consistency = workflow?.artifacts.reviewed?.consistencyScore ?? 0;
  const isRunning = isPending || workflow?.status === "running";
  const isComplete = workflow?.status === "completed";
  const ctrPercent = analytics ? Math.min((analytics.estimatedCtr / 10) * 100, 100) : 0;
  const automationPercent = analytics?.automationPercentage ?? 0;
  const consistencyPercent = consistency;

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  }

  return (
    <div className="app-shell">
      {/* Mobile top-bar (shows on screens < 760px) */}
      <header className="mobile-topbar">
        <div className="mobile-topbar-logo">ACE</div>
        <span className="mobile-topbar-title">ACE Platform</span>
      </header>

      {/* ─── Sidebar ─────────────────────────────────── */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark" style={{
            background: "linear-gradient(135deg, var(--cyan), var(--blue), var(--indigo))",
            boxShadow: "0 0 0 2px rgba(0,245,212,0.18), 0 0 18px rgba(91,158,255,0.25)",
            fontSize: "0.78rem",
            letterSpacing: "0.04em",
            fontWeight: 900
          }}>ACE</div>
          <div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>ACE Platform</span>
            <small>Content Ops Engine</small>
          </div>
        </div>

        <span className="sidebar-section">Navigation</span>

        {[
          { id: "dashboard", icon: "⬡", label: "Dashboard" },
          { id: "pipeline", icon: "◈", label: "Pipeline" },
          { id: "logs", icon: "▤", label: "Audit Logs" },
          { id: "analytics", icon: "◎", label: "Analytics" }
        ].map(({ id, icon, label }) => (
          <button
            key={id}
            className={`nav-link ${activeSection === id ? "active" : ""}`}
            onClick={() => scrollTo(id)}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}

        <div className="sidebar-footer">
          <div className="version-badge">⬡ v2.0 • hackathon</div>
          <span>ET GenAI 2026</span>
        </div>
      </nav>

      {/* ─── Main Content ────────────────────────────── */}
      <main className="page-shell">

        {/* ── Hero ── */}
        <section id="dashboard">
          <div className="hero-card hero-grid">
            <div className="hero-copy-block">
              <p className="eyebrow">Autonomous Enterprise Content Ops</p>
              <h1>ACE</h1>
              <p className="hero-copy">
                A production-grade multi-agent system that converts raw knowledge into compliant, localized,
                channel-ready campaigns — with full audit trails, human approval gates, and closed-loop optimization.
              </p>
              <div className="hero-tags">
                <span>🧠 Knowledge-to-Content</span>
                <span>✅ Human Approval</span>
                <span>🧪 A/B Simulation</span>
                <span>📋 JSON Agent Contracts</span>
                <span>🌐 Hindi Localization</span>
              </div>
            </div>

            <div className="hero-side">
              <div className="hero-stat-grid">
                <StatCard label="Agents" value="5 + Orch." detail="Specialized responsibilities" />
                <StatCard
                  label="Automation"
                  value={`${analytics?.automationPercentage?.toFixed(0) ?? "—"}%`}
                  detail="Autonomous coverage"
                />
                <StatCard
                  label="Consistency"
                  value={`${consistency > 0 ? consistency : "—"}/100`}
                  detail="Brand & voice alignment"
                />
                <StatCard
                  label="Time Saved"
                  value={analytics ? `${analytics.timeSavedHours}h` : "—"}
                  detail="Vs manual content ops"
                />
              </div>

              <div className="signal-card">
                <span>Live Status</span>
                <strong
                  style={{
                    color: workflow?.status === "completed"
                      ? "var(--green)"
                      : workflow?.status === "failed"
                        ? "var(--error)"
                        : workflow?.status === "awaiting_approval"
                          ? "var(--amber)"
                          : workflow?.status === "running"
                            ? "var(--cyan)"
                            : "var(--muted)"
                  }}
                >
                  {workflow?.status ?? "idle"}
                </strong>
                <p>{latestLog?.decision ?? "Workflow telemetry will appear here after a run."}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dashboard: Control + Pipeline ── */}
        <section className="dashboard-grid">
          {/* ─ Input Panel ─ */}
          <div className="panel input-panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Control Plane</p>
                <h2>Workflow Setup</h2>
              </div>
              <button
                className={`run-button ${isPending ? "is-running" : ""}`}
                onClick={runWorkflow}
                disabled={isPending || uploading}
              >
                {isPending ? "⟳ Running…" : "▶ Run Workflow"}
              </button>
            </div>

            <div className="control-stack">
              <label>
                Product Name
                <input
                  value={input.productName}
                  onChange={(e) => setInput({ ...input, productName: e.target.value })}
                  placeholder="e.g. Autonomous Content Engine"
                />
              </label>

              <label>
                Campaign Objective
                <input
                  value={input.campaignObjective ?? ""}
                  onChange={(e) => setInput({ ...input, campaignObjective: e.target.value })}
                  placeholder="e.g. Launch enterprise AI content platform"
                />
              </label>

              <label>
                Source Brief / Raw Input
                <textarea
                  value={input.rawInput}
                  onChange={(e) => setInput({ ...input, rawInput: e.target.value, sourceType: "text" })}
                  placeholder="Paste your brief, product description, or research notes here…"
                />
              </label>
            </div>

            <div className="control-row">
              <Select
                label="Audience Persona"
                value={input.audiencePersona}
                onChange={(value) => setInput({ ...input, audiencePersona: value as Persona })}
                options={[
                  ["enterprise-cmo", "🎯 Enterprise CMO"],
                  ["technical-buyer", "🔧 Technical Buyer"],
                  ["startup-founder", "🚀 Startup Founder"]
                ]}
              />
              <Select
                label="Tone"
                value={input.tone}
                onChange={(value) => setInput({ ...input, tone: value as Tone })}
                options={[
                  ["corporate", "🏢 Corporate"],
                  ["formal", "📝 Formal"],
                  ["casual", "💬 Casual"]
                ]}
              />
            </div>

            <div className="toggle-grid">
              <Toggle
                label="🧑 Human Approval Gate"
                checked={input.humanApproval}
                onChange={(checked) => setInput({ ...input, humanApproval: checked })}
              />
              <Toggle
                label="🧪 A/B Test Simulation"
                checked={input.enableABTest}
                onChange={(checked) => setInput({ ...input, enableABTest: checked })}
              />
            </div>

            <div className="control-row">
              <Checklist
                label="Output Channels"
                options={["blog", "linkedin", "twitter"] as Channel[]}
                selected={input.channels}
                onToggle={(value) =>
                  setInput((current) => ({
                    ...current,
                    channels: current.channels.includes(value)
                      ? current.channels.filter((c) => c !== value)
                      : [...current.channels, value]
                  }))
                }
              />
              <Checklist
                label="Languages"
                options={["en", "hi"] as Language[]}
                selected={input.languages}
                onToggle={(value) =>
                  setInput((current) => ({
                    ...current,
                    languages: current.languages.includes(value)
                      ? current.languages.filter((l) => l !== value)
                      : [...current.languages, value]
                  }))
                }
              />
            </div>

            {/* PDF Drop Zone */}
            <label
              className={`upload-card ${isDragOver ? "drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <span className="upload-icon">{uploading ? "⟳" : "📄"}</span>
              <span className="upload-label">
                {uploading ? "Extracting PDF text…" : input.sourceType === "pdf" ? "✅ PDF loaded — ready to run" : "Upload Knowledge PDF"}
              </span>
              <span className="upload-hint">
                {isDragOver ? "Drop it here!" : "Drag & drop or click to browse · PDF only · text extracted in browser"}
              </span>
              <input
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void processPdfFile(file);
                }}
              />
            </label>

            {/* Human Approval Banner */}
            {workflow?.status === "awaiting_approval" && (
              <div className="approval-banner">
                <div className="approval-label">⏸ Awaiting Human Decision</div>
                <p>{workflow.awaitingApproval?.summary}</p>
                <div className="approval-actions">
                  <button onClick={() => continueWorkflow("approve")}>✓ Approve & Continue</button>
                  <button className="ghost-button" onClick={() => continueWorkflow("reject")}>
                    ✗ Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─ Pipeline / Flow Panel ─ */}
          <div className="panel flow-panel" ref={pipelineRef} id="pipeline">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Execution Fabric</p>
                <h2>Agent Pipeline</h2>
              </div>
              <span className={`status-pill status-${workflow?.status ?? "idle"}`}>
                {workflow?.status ?? "idle"}
              </span>
            </div>

            <div className="pipeline-wrapper">
              <div className="pipeline-grid">
                {(workflow?.steps ?? []).map((step) => (
                  <article
                    key={step.id}
                    className={`pipeline-node status-card-${step.status} accent-${stageAccent[step.id]}`}
                  >
                    <div className="node-topline">
                      <span title={step.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: "0.9rem" }}>{stageIcons[step.id] ?? "▸"}</span>
                        {step.id}
                      </span>
                      <strong style={{
                        display: "flex", alignItems: "center", gap: 4,
                        color: step.status === "completed" ? "var(--green)" : step.status === "failed" ? "var(--error)" : undefined
                      }}>
                        {step.status === "completed" && <span style={{ fontSize: "0.7rem" }}>✓</span>}
                        {step.status}
                      </strong>
                    </div>
                    <h3>{step.label}</h3>
                    <p>{step.note}</p>
                    <small>{step.owner}</small>
                    {step.status === "running" && (
                      <div className="node-progress">
                        <div className="node-progress-fill" />
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {/* Connector segments */}
              {(workflow?.steps ?? []).length > 0 && (
                <div className="pipeline-connector">
                  {(workflow?.steps ?? []).map((step) => (
                    <div
                      key={step.id}
                      className={`connector-segment ${step.status === "running" || step.status === "completed" ? "active" : ""}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Metrics row */}
            <div className="metrics-grid">
              <Metric title="Manual Baseline" value={analytics ? `${analytics.manualHoursBaseline}h` : "—"} />
              <Metric title="Workflow Runtime" value={analytics ? `${analytics.estimatedWorkflowMinutes}m` : "—"} />
              <Metric title="Predicted CTR" value={analytics ? `${analytics.estimatedCtr.toFixed(2)}%` : "—"} />
              <Metric title="Predicted Likes" value={analytics ? `${analytics.estimatedLikes}` : "—"} />
              <Metric title="Conversions" value={analytics ? `${analytics.estimatedConversions}` : "—"} />
              <Metric title="Publications" value={`${workflow?.artifacts.published?.length ?? 0}`} />
            </div>

            {/* JSON Console */}
            <div className="json-console">
              <div className="json-header">
                <h3>Latest Agent Message</h3>
                <span
                  style={{ color: agentColors[latestLog?.agent ?? "orchestrator"] ?? "var(--cyan)" }}
                >
                  {latestLog?.agent ?? "n/a"}
                </span>
              </div>
              <pre>{JSON.stringify(latestLog?.message ?? { status: "idle", hint: "Run the workflow to see agent messages." }, null, 2)}</pre>
            </div>
          </div>
        </section>

        {/* ── Result Cards ── */}
        <section className="insight-grid section-gap">
          <Card title="🧠 Knowledge Intake" accentColor="var(--cyan)">
            <h3>{workflow?.artifacts.knowledgeBrief?.summary ?? "Awaiting source normalization."}</h3>
            <ul>
              {(
                workflow?.artifacts.knowledgeBrief?.keyPoints ?? [
                  "Key points extracted from source material will appear here.",
                  "Detected topics, narrative angles, and content hooks will be listed."
                ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>

          <Card title="✍️ Generated Campaign" accentColor="var(--blue)">
            <h3>{workflow?.artifacts.generated?.headline ?? "No campaign generated yet."}</h3>
            <p>
              {workflow?.artifacts.reviewed?.revisedContent.body ??
                workflow?.artifacts.generated?.body ??
                "Run the workflow to generate content. Your headline, body copy, and CTAs will appear here."}
            </p>
            <div className="chip-row">
              {(workflow?.artifacts.generated?.socialHooks ?? []).map((hook) => (
                <span key={hook}>{hook}</span>
              ))}
            </div>
          </Card>

          <Card title="🛡️ Compliance Review" accentColor="var(--amber)">
            <p style={{ marginBottom: 10 }}>
              Consistency score:{" "}
              <strong style={{ color: "var(--green)", fontWeight: 800 }}>
                {consistency > 0 ? `${consistency}/100` : "—"}
              </strong>
            </p>
            <ul>
              {(
                workflow?.artifacts.reviewed?.suggestions ?? [
                  "Compliance guidance will appear here after the review agent runs.",
                  "Brand voice, overclaim detection, and vocabulary alignment insights."
                ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>

          <Card title="🌐 Localization" accentColor="var(--green)">
            <div className="variant-list">
              {(workflow?.artifacts.localized ?? []).map((variant) => (
                <article key={variant.language}>
                  <h3>{variant.language === "en" ? "🇬🇧 English" : "🇮🇳 Hindi"}</h3>
                  <p>{variant.body}</p>
                  <small>{variant.audienceNotes}</small>
                </article>
              ))}
              {!workflow?.artifacts.localized?.length && (
                <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  Localized variants for English and Hindi will appear here after approval.
                </p>
              )}
            </div>
          </Card>

          <Card title="📡 Distribution Preview" accentColor="var(--pink)">
            <div className="distribution-list">
              {(workflow?.artifacts.published ?? []).map((result) => (
                <article key={result.simulatedPostId}>
                  <div className="row-between">
                    <strong>
                      {result.platform === "blog"
                        ? "📝 Blog"
                        : result.platform === "linkedin"
                          ? "💼 LinkedIn"
                          : "🐦 Twitter"}
                    </strong>
                    <span>{result.scheduledWindow}</span>
                  </div>
                  <p>{result.payloadPreview}</p>
                  <small>{result.audienceTargeting}</small>
                </article>
              ))}
              {!workflow?.artifacts.published?.length && (
                <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  Formatted posts and simulated publishing results will appear here.
                </p>
              )}
            </div>
          </Card>

          <Card title="🔄 Optimization Loop" accentColor="var(--indigo)">
            <p style={{ marginBottom: 10, color: "var(--muted)", fontSize: "0.82rem" }}>
              {analytics?.insightSummary ?? "Performance insights will appear after publishing analysis."}
            </p>
            <ul>
              {(
                workflow?.artifacts.improvementPlan?.nextPromptAdjustments ?? [
                  "Prompt adjustment recommendations will appear here.",
                  "Next-run experiments and model routing guidance will be shown."
                ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </section>

        {/* ── Handoffs + Logs ── */}
        <section className="dashboard-grid lower-grid" id="logs">
          <div className="panel" style={{ borderTop: "2px solid rgba(91,158,255,0.3)" }}>
            <div className="panel-header">
              <div>
                <p className="section-kicker">Inter-Agent Contracts</p>
                <h2>Structured Handoffs</h2>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--cyan)", fontWeight: 700 }}>
                {workflow?.handoffs.length ?? 0} contracts
              </span>
            </div>
            <div className="handoff-list">
              {(workflow?.handoffs ?? []).map((handoff) => (
                <article key={handoff.id} className="handoff-card">
                  <div className="row-between">
                    <strong>
                      <span style={{ color: agentColors[handoff.from] }}>{handoff.from}</span>
                      {" → "}
                      <span style={{ color: agentColors[handoff.to] }}>{handoff.to}</span>
                    </strong>
                    <span
                      style={{
                        fontSize: "0.66rem",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "rgba(91,158,255,0.1)",
                        color: "var(--blue)",
                        border: "1px solid rgba(91,158,255,0.18)",
                        fontWeight: 600
                      }}
                    >
                      {handoff.contract}
                    </span>
                  </div>
                  <p>{handoff.payloadSummary}</p>
                  <small>{handoff.stage}</small>
                </article>
              ))}
              {!workflow?.handoffs.length && (
                <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  Agent-to-agent JSON contracts will appear here during execution.
                </p>
              )}
            </div>
          </div>

          <div className="panel" style={{ borderTop: "2px solid rgba(0,245,212,0.25)" }}>
            <div className="panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <p className="section-kicker">Audit Trail</p>
                  <h2>Agent Decisions</h2>
                </div>
                {isRunning && (
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "var(--cyan)",
                    boxShadow: "0 0 8px var(--cyan)",
                    display: "inline-block",
                    animation: "pillPulse 1.2s ease-in-out infinite",
                    flexShrink: 0
                  }} />
                )}
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>
                {visibleLogs.length} events
              </span>
            </div>
            <div className="logs-list">
              {visibleLogs.map((log) => (
                <div className={`log-entry log-${log.status}`} key={log.id}>
                  <div className="log-entry-left">
                    <div className="log-agent-row">
                      <span
                        className="log-dot"
                        style={{ background: agentColors[log.agent] ?? "var(--blue)" }}
                      />
                      <strong>{log.agent}</strong>
                      <span className="log-stage">{log.stage}</span>
                    </div>
                    <p>{log.decision}</p>
                  </div>
                  <time>{new Date(log.timestamp).toLocaleTimeString()}</time>
                </div>
              ))}
              {!visibleLogs.length && (
                <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  Timestamped agent decisions and audit events will stream here.
                </p>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </section>

        {/* ── Analytics Section ── */}
        <section className="panel footer-panel section-gap" id="analytics">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Performance Intelligence</p>
              <h2>Analytics &amp; A/B Testing</h2>
            </div>
            {isComplete && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: "rgba(80,240,160,0.1)",
                  color: "var(--green)",
                  border: "1px solid rgba(80,240,160,0.2)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase"
                }}
              >
                ✓ Run Complete
              </span>
            )}
          </div>

          {/* KPI Cards */}
          <div className="analytics-grid">
            <div className="analytics-card" style={{ borderTop: "2px solid rgba(0,245,212,0.28)" }}>
              <span className="ac-label">🎯 Predicted CTR</span>
              <span className="ac-value">{analytics ? `${analytics.estimatedCtr.toFixed(2)}%` : "—"}</span>
              <span className="ac-sub">Cross-channel click-through rate</span>
            </div>
            <div className="analytics-card" style={{ borderTop: "2px solid rgba(91,158,255,0.28)" }}>
              <span className="ac-label">❤️ Est. Likes</span>
              <span className="ac-value" style={{ background: "linear-gradient(135deg, var(--text), var(--blue))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {analytics?.estimatedLikes ?? "—"}
              </span>
              <span className="ac-sub">Combined engagement forecast</span>
            </div>
            <div className="analytics-card" style={{ borderTop: "2px solid rgba(80,240,160,0.28)" }}>
              <span className="ac-label">⚡ Conversions</span>
              <span className="ac-value" style={{ background: "linear-gradient(135deg, var(--text), var(--green))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {analytics?.estimatedConversions ?? "—"}
              </span>
              <span className="ac-sub">Predicted campaign conversions</span>
            </div>
            <div className="analytics-card" style={{ borderTop: "2px solid rgba(255,200,85,0.28)" }}>
              <span className="ac-label">⏱️ Time Saved</span>
              <span className="ac-value" style={{ background: "linear-gradient(135deg, var(--text), var(--amber))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {analytics ? `${analytics.timeSavedHours}h` : "—"}
              </span>
              <span className="ac-sub">Vs. manual content ops baseline</span>
            </div>
          </div>

          {/* Progress bars */}
          <div className="metric-bar-row" style={{ marginBottom: 24 }}>
            <ProgressBar label="CTR Performance" value={ctrPercent} max={100} color="blue" unit={`${analytics?.estimatedCtr?.toFixed(2) ?? 0}%`} />
            <ProgressBar label="Automation Coverage" value={automationPercent} max={100} color="green" unit={`${automationPercent.toFixed(0)}%`} />
            <ProgressBar label="Brand Consistency Score" value={consistencyPercent} max={100} color="violet" unit={`${consistencyPercent}/100`} />
          </div>

          {/* A/B Test cards */}
          {(analytics?.abTest ?? []).length > 0 && (
            <>
              <div style={{ marginBottom: 12 }}>
                <p className="section-kicker">A/B Test Results</p>
              </div>
              <div className="ab-list" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
                {(analytics?.abTest ?? []).map((variant) => (
                  <article key={variant.variant} className={variant.winner ? "winner-card" : ""}>
                    <div className="row-between">
                      <strong style={{ fontSize: "0.95rem" }}>Variant {variant.variant}</strong>
                      {variant.winner ? (
                        <span className="winner-badge">🏆 Winner</span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.06)",
                            color: "var(--muted)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            fontWeight: 600,
                            textTransform: "uppercase"
                          }}
                        >
                          Candidate
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.84rem", color: "var(--muted)", margin: "8px 0" }}>{variant.hook}</p>
                    <small style={{ color: "var(--muted)", fontSize: "0.72rem" }}>
                      CTR {variant.estimatedCtr.toFixed(2)}% &nbsp;·&nbsp; Conversions {variant.estimatedConversions}
                    </small>
                  </article>
                ))}
              </div>
            </>
          )}

          {!analytics && (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>
              Run the workflow to see predicted engagement metrics and A/B test simulation results.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

/* ─── Helper Components ──────────────────────────────────────────────────── */

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="stat-card">
      <span style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)" }}>{label}</span>
      <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800 }}>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="metric-card">
      <span style={{ fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Card({ title, children, accentColor }: { title: string; children: React.ReactNode; accentColor?: string }) {
  return (
    <article className="panel card" style={accentColor ? { borderTop: `2px solid color-mix(in srgb, ${accentColor} 40%, transparent)` } : undefined}>
      <div className="panel-header" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: "0.92rem", fontFamily: "var(--font-display)" }}>{title}</h2>
        {accentColor && <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, boxShadow: `0 0 8px ${accentColor}`, flexShrink: 0 }} />}
      </div>
      {children}
    </article>
  );
}

function ProgressBar({
  label,
  value,
  max,
  color,
  unit
}: {
  label: string;
  value: number;
  max: number;
  color: "blue" | "green" | "violet" | "amber";
  unit: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const fillClass =
    color === "green" ? "fill-green" : color === "violet" ? "fill-violet" : color === "amber" ? "fill-amber" : "";

  return (
    <div className="metric-bar">
      <div className="metric-bar-header">
        <span>{label}</span>
        <strong>{unit}</strong>
      </div>
      <div className="metric-bar-track">
        <div
          className={`metric-bar-fill ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([val, lbl]) => (
          <option value={val} key={val}>
            {lbl}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Checklist<T extends string>({
  label,
  options,
  selected,
  onToggle
}: {
  label: string;
  options: readonly T[];
  selected: readonly T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="checklist">
      <legend>{label}</legend>
      {options.map((option) => (
        <label key={option}>
          <input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}
