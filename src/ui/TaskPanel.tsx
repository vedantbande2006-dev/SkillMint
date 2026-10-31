import { useEffect } from "react";
import { ArrowUpRight, Clock3, ShieldCheck, X } from "lucide-react";

type Task = {
  id: string;
  category: string;
  title: string;
  brief: string;
  skills: string[];
  budget: string;
  due: string;
  level: string;
  status: "OPEN" | "ASSIGNED";
};

export default function TaskPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="task-panel-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="task-panel" role="dialog" aria-modal="true" aria-labelledby="task-panel-title">
        <header className="task-panel-header">
          <div><p className="eyebrow">SKILLMINT / WORK ORDER</p><span className="task-id">{task.id}</span></div>
          <button className="task-panel-close" onClick={onClose} aria-label="Close task details"><X size={19}/></button>
        </header>
        <div className="task-panel-body">
          <p className="eyebrow">{task.category}</p>
          <h2 id="task-panel-title">{task.title}</h2>
          <p className="task-panel-description">{task.brief}</p>
          <div className="task-panel-facts">
            <div><span>BOUNTY</span><strong>{task.budget}</strong></div>
            <div><span>DELIVERY</span><strong><Clock3 size={14}/>{task.due}</strong></div>
            <div><span>LEVEL</span><strong>{task.level}</strong></div>
            <div><span>STATUS</span><strong>{task.status}</strong></div>
          </div>
          <div className="task-panel-skills"><p className="eyebrow">SKILL SIGNALS</p><div className="tags">{task.skills.map(skill => <span key={skill}>{skill}</span>)}</div></div>
          <div className="task-panel-note"><ShieldCheck size={18}/><p>This is a preview work order. Applying, escrow funding and MSTC Coral transfers are not enabled yet.</p></div>
          <button className="task-panel-action" onClick={() => onClose()}>Back to workboard <ArrowUpRight size={15}/></button>
        </div>
        <footer className="task-panel-footer"><span>SKILLMINT / FIELD NOTE 001</span><span>NO FUNDS MOVED</span></footer>
      </section>
    </div>
  );
}
