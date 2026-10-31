import { useMemo, useState } from "react";
import TaskPanel from "./TaskPanel";
import { ArrowUpRight, Search, Wallet, Plus, ShieldCheck, Clock3, CircleDot, Menu } from "lucide-react";
import { bridgeWallet } from "../infrastructure/bridgeWallet";

type Task = { id: string; category: string; title: string; brief: string; skills: string[]; budget: string; due: string; level: string; status: "OPEN" | "ASSIGNED" };
const initialTasks: Task[] = [
  { id: "SM-0248", category: "DESIGN SYSTEMS", title: "Audit a mobile onboarding flow", brief: "Map friction points and return a concise, prioritized UX review.", skills: ["UX research", "Figma", "Writing"], budget: "42 MSTC", due: "3 days", level: "Intermediate", status: "OPEN" },
  { id: "SM-0247", category: "SMART CONTRACTS", title: "Review an ERC-20 vesting edge case", brief: "Build a focused test matrix for cliff, cancellation and rounding behavior.", skills: ["Solidity", "Foundry", "Testing"], budget: "85 MSTC", due: "5 days", level: "Advanced", status: "OPEN" },
  { id: "SM-0246", category: "CONTENT", title: "Turn protocol docs into a quickstart", brief: "Create a developer-first guide with tested commands and clear caveats.", skills: ["Technical writing", "Web3"], budget: "30 MSTC", due: "2 days", level: "Beginner-friendly", status: "OPEN" },
  { id: "SM-0245", category: "DATA", title: "Clean and annotate a small dataset", brief: "Normalize fields, document assumptions and flag missing values.", skills: ["Python", "Data quality"], budget: "36 MSTC", due: "4 days", level: "Intermediate", status: "OPEN" }
];

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL WORK");
  const [wallet, setWallet] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("25");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const filtered = useMemo(() => tasks.filter(t =>
    (category === "ALL WORK" || t.category === category) &&
    `${t.title} ${t.brief} ${t.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase())
  ), [tasks, query, category]);
  const categories = ["ALL WORK", ...Array.from(new Set(tasks.map(t => t.category)))];

  async function connectWallet() {
    try {
      const session = await bridgeWallet.connect();
      setWallet(session.address);
      setNotice("Wallet connected. Network and signature verification are still required before transactions.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  function publishDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || Number(budget) <= 0) return;
    const task: Task = {
      id: `SM-${String(249 + tasks.length).padStart(4, "0")}`,
      category: "NEW TASK",
      title: title.trim(),
      brief: "New local draft. Connect the API and verified escrow contract before accepting real work.",
      skills: ["To be specified"],
      budget: `${budget} MSTC`,
      due: "Set deadline",
      level: "Open",
      status: "OPEN"
    };
    setTasks(current => [task, ...current]);
    setTitle(""); setPublishing(false);
    setNotice("Task added to this browser session only. It is not yet persisted or published on-chain.");
  }

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="SkillMint home"><span className="brand-mark">S<span>·</span>M</span><span>SKILLMINT<small>WORK, WITH PROOF.</small></span></a>
      <nav><a className="active" href="#workboard">Workboard</a><a href="#ledger">Proof ledger</a><a href="#how">Protocol notes</a></nav>
      <div className="top-actions"><span className="network"><i /> CORAL TESTNET · UNVERIFIED</span><button className="wallet-btn" onClick={connectWallet}><Wallet size={15}/>{wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect Bridge Wallet"}</button><button className="menu-btn" aria-label="Menu"><Menu size={18}/></button></div>
    </header>

    <section className="intro">
      <div className="intro-copy"><p className="eyebrow"><span>ISSUE 001</span><span>OPEN CALL FOR TALENT</span></p><h1>Good work<br/>should <em>leave a mark.</em></h1><p className="lede">Small tasks. Real skills. A record that travels with you. Find work worth doing, then make the proof part of your story.</p><a className="text-link" href="#workboard">Explore the workboard <ArrowUpRight size={16}/></a></div>
      <div className="intro-side"><div className="stamp"><span>SKILLMINT</span><strong>WORK<br/>VERIFIED</strong><span className="stamp-ring">ON-CHAIN PROVENANCE · 001</span></div><p className="side-note">A marketplace for the work between the big milestones.</p><div className="issue-line"><span>FIELD NOTES / 01</span><span>29 OCT 2026</span></div></div>
    </section>

    <section className="ticker" aria-label="Product principles"><span>01 / DO THE WORK</span><span>02 / SHOW THE RECEIPT</span><span>03 / KEEP THE PROOF</span><span className="ticker-end">SKILLS → SIGNAL</span></section>

    <section id="workboard" className="work-section">
      <div className="section-head"><div><p className="eyebrow">SAMPLE TASKS / LOCAL PREVIEW</p><h2>The Workboard<span>↘</span></h2><p className="section-desc">A living index of small, specific opportunities.</p></div><button className="publish-btn" onClick={() => setPublishing(v => !v)}><Plus size={16}/>{publishing ? "Close form" : "Post a task"}</button></div>
      {publishing && <form className="publish-form" onSubmit={publishDraft}><label>Task title<input value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} placeholder="What needs doing?"/></label><label>Budget in MSTC<input type="number" min="1" step="1" value={budget} onChange={e => setBudget(e.target.value)} required/></label><button className="publish-btn" type="submit">Add local draft <ArrowUpRight size={15}/></button><p>Demo-only: this does not create a server record or lock funds.</p></form>}
      <div className="tools"><div className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search skills, tasks, keywords…" aria-label="Search tasks"/></div><div className="filters">{categories.map(c => <button key={c} className={category === c ? "filter selected" : "filter"} onClick={() => setCategory(c)}>{c}</button>)}</div><span className="result-count">{filtered.length.toString().padStart(2, "0")} RESULTS</span></div>
      <div className="task-list">{filtered.map((t, i) => <article className="task-row" key={t.id}><div className="task-index"><span>{String(i + 1).padStart(2, "0")}</span><span className="task-id">{t.id}</span></div><div className="task-main"><p className="eyebrow">{t.category}</p><h3>{t.title}</h3><p className="task-brief">{t.brief}</p><div className="tags">{t.skills.map(s => <span key={s}>{s}</span>)}</div></div><div className="task-meta"><span className="budget">{t.budget}</span><span><Clock3 size={13}/>{t.due}</span><span><CircleDot size={13}/>{t.level}</span></div><button className="open-task" aria-label={`View ${t.title}`} onClick={() => setSelectedTask(t)}><ArrowUpRight size={19}/></button></article>)}</div>
      {filtered.length === 0 && <div className="empty">No matching tasks. Try another search or category.</div>}
    </section>

    <section id="ledger" className="ledger"><div><p className="eyebrow">THE PROOF LEDGER / B</p><h2>Receipts, not<br/><em>reputation theatre.</em></h2><p className="section-desc">A completion record should tell you what happened, who authorized it, and where to verify the evidence.</p></div><div className="ledger-paper"><div className="ledger-top"><span>LEDGER ENTRY / TEMPLATE</span><span className="pending">NOT CONNECTED</span></div><div className="ledger-symbol"><ShieldCheck size={27}/><span>PROOF<br/>PENDING</span></div><div className="ledger-lines"><div><span>WORK RECORD</span><b>Waiting for verified events</b></div><div><span>TRANSACTION</span><b>—</b></div><div><span>CONTRACT</span><b>—</b></div><div><span>CONFIRMATIONS</span><b>Not available</b></div></div><p className="ledger-foot">No blockchain evidence is displayed until a configured indexer verifies it.</p></div></section>

    <section id="how" className="protocol-note"><span className="note-number">NOTE 03</span><div><h3>Built for evidence.<br/>Not just appearances.</h3><p>This starter keeps the network and token configuration unset until canonical Coral details and Bridge Wallet capabilities are verified. Sample opportunities are clearly illustrative; no live balance, transaction, or payment is implied.</p></div><div className="note-stamp">BUILD<br/>IN PUBLIC</div></section>
    <footer><a className="brand footer-brand" href="#"><span className="brand-mark">S<span>·</span>M</span><span>SKILLMINT<small>WORK, WITH PROOF.</small></span></a><span>EARLY BUILD / NOT FOR REAL PAYMENTS</span><span>DESIGNED FOR VERIFIABLE WORK ↗</span></footer>
    {selectedTask && <TaskPanel task={selectedTask} onClose={() => setSelectedTask(null)} />}
    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}
  </main>;
}