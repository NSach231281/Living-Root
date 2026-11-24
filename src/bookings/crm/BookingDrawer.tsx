// Booking detail panel: money, payments (verify in one tap), WhatsApp/email actions, stage, notes.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCrmCtx } from "./CrmLayout";
import { api, waLink, compressImage } from "../client/api";
import { Pill, STAGE_PILL, PAY_PILL, QuoteTable, Schedule, ErrorBox } from "../client/ui";
import { describeWhen, STAGE_LABEL, PAY_LABEL, TYPE_LABEL } from "../shared/pricing";
import { fmtDate, inr, inr2, todayIST } from "../shared/dates";
import type { Stage } from "../shared/types";
import { X, MessageCircle, Phone, Mail, Copy, ExternalLink, Pencil, RotateCcw, Trash2, Plus, CheckCircle2, Upload, Eye } from "lucide-react";

export default function BookingDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { rows, rc } = useCrmCtx();
  const b = rows.find(r => r.id === id);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [showQuote, setShowQuote] = useState(false);
  const [proof, setProof] = useState("");
  const [np, setNp] = useState<{ open: boolean; amount: string; utr: string; method: string; paidOn: string }>({ open: false, amount: "", utr: "", method: "upi", paidOn: todayIST() });

  if (!b) return <Panel onClose={onClose}><p className="p-6 text-brand-muted">Booking not found (it may still be loading).</p></Panel>;
  const m = b.m;
  const link = `${location.origin}/b/${b.id}`;
  const first = b.name.split(" ")[0];
  const run = async (label: string, fn: () => Promise<any>, ok?: string) => {
    setBusy(label); setErr(""); setMsg("");
    try { await fn(); if (ok) setMsg(ok); } catch (e: any) { setErr(e.message); }
    setBusy("");
  };

  const next = m.nextDue;
  const wa = {
    quote: `Hi ${first}, thank you for your enquiry with Living Roots 🌿\n\nYour quote ${b.quoteNo} for *${b.title}* (${describeWhen(b.input, rc)}) is ready: ${inr2(b.quote.grandTotal)} incl. GST.\n\nPay the advance of ${inr2(b.quote.advance)} by scanning the QR on this page to block your date:\n${link}`,
    remind: next ? `Hi ${first}, a gentle reminder from Living Roots 🌿\n\n${next.label} of *${inr2(next.due)}* for ${b.title}${next.dueDate ? ` is due ${next.dueDate <= todayIST() ? "today" : `on ${fmtDate(next.dueDate)}`}` : ""}.\n\nPay here (QR + UPI): ${link}\n\nThank you!` : "",
    confirmed: `Hi ${first}, your booking *${b.title}* at Living Roots is confirmed ✅\n${describeWhen(b.input, rc)}\n\nPaid: ${inr2(m.claimedPaid)}${m.outstanding > 0.5 ? ` · Balance: ${inr2(m.outstanding)}${next?.dueDate ? ` due ${fmtDate(next.dueDate)}` : ""}` : " · Fully paid 🙏"}\nDetails: ${link}`,
    thanks: `Hi ${first}, thank you for hosting ${b.title} at Living Roots! 🌿 We'd love your feedback and hope to see you again soon.`,
  };

  const setStage = (stage: Stage) => {
    const reason = ["cancelled", "lost"].includes(stage) ? prompt("Reason (optional)") || "" : "";
    run("stage", () => api.update({ id: b.id, stage, reason }), `Moved to ${STAGE_LABEL[stage]}`);
  };

  return (
    <Panel onClose={onClose}>
      <div className="p-4 border-b border-brand-border bg-white sticky top-0 z-10">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <div className="text-[11px] font-mono text-brand-muted">{b.ref} · {b.quoteNo}</div>
            <h2 className="font-serif text-xl font-bold leading-tight">{b.name}</h2>
            <div className="text-sm text-brand-clay">{b.title} · {describeWhen(b.input, rc)}</div>
            <div className="flex gap-1 mt-1"><Pill cls={STAGE_PILL[b.stage]}>{STAGE_LABEL[b.stage]}</Pill><Pill cls={PAY_PILL[m.status]}>{PAY_LABEL[m.status]}</Pill></div>
          </div>
          <button onClick={onClose} className="p-1"><X size={20}/></button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
          <A href={waLink(b.phone, wa.quote)} icon={MessageCircle} green>Send quote</A>
          {next && <A href={waLink(b.phone, wa.remind)} icon={MessageCircle} green>Payment reminder</A>}
          {["confirmed", "completed"].includes(b.stage) && <A href={waLink(b.phone, wa.confirmed)} icon={MessageCircle} green>Confirmation</A>}
          {b.stage === "completed" && <A href={waLink(b.phone, wa.thanks)} icon={MessageCircle} green>Thank you</A>}
          <A href={`tel:${b.phone}`} icon={Phone}>Call</A>
          {b.email && next && <Btn icon={Mail} onClick={() => run("remind", () => api.remind(b.id), `Reminder emailed to ${b.email}`)} busy={busy === "remind"}>Email reminder</Btn>}
          <Btn icon={Copy} onClick={() => { navigator.clipboard.writeText(link); setMsg("Client link copied"); }}>Copy link</Btn>
          <A href={link} icon={ExternalLink} blank>Client page</A>
          <Link to={b.input.type === "event" ? `/crm/quick-edit/${b.id}` : `/crm/edit/${b.id}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-border bg-white"><Pencil size={12}/> Edit quote</Link>
        </div>
        {msg && <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 size={12}/> {msg}</div>}
        <ErrorBox>{err}</ErrorBox>
      </div>

      <div className="p-4 space-y-4">
        {/* Money */}
        <Card title="Money" right={<button className="text-xs text-brand-spice font-bold" onClick={() => setShowQuote(!showQuote)}>{showQuote ? "Hide" : "Show"} quote</button>}>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <Stat l="Total" v={inr(b.quote.grandTotal)}/><Stat l="Paid" v={inr(m.claimedPaid)} good/><Stat l="Outstanding" v={inr(Math.max(0, m.outstanding))} bad={m.outstanding > 0.5}/>
          </div>
          {b.quote.discount > 0 && <p className="text-xs text-emerald-700 mb-2">Discount {inr(b.quote.discount)} (pre-GST) vs standard{b.input.discountNote ? ` — ${b.input.discountNote}` : ""}</p>}
          {showQuote && <div className="mb-3"><QuoteTable q={b.quote} compact/></div>}
          <Schedule q={b.quote} money={m}/>
        </Card>

        {/* Payments */}
        <Card title="Payments" right={<button className="text-xs text-brand-spice font-bold flex items-center gap-1" onClick={() => setNp({ ...np, open: !np.open, amount: String(next?.due || "") })}><Plus size={12}/> Record payment</button>}>
          {np.open && <div className="bg-brand-bone rounded-xl p-3 mb-3 grid grid-cols-2 gap-2 text-sm">
            <input className="input !py-2" type="number" placeholder="Amount ₹" value={np.amount} onChange={e => setNp({ ...np, amount: e.target.value })}/>
            <input className="input !py-2" type="date" value={np.paidOn} onChange={e => setNp({ ...np, paidOn: e.target.value })}/>
            <input className="input !py-2 font-mono" placeholder="UTR / ref" value={np.utr} onChange={e => setNp({ ...np, utr: e.target.value })}/>
            <select className="input !py-2" value={np.method} onChange={e => setNp({ ...np, method: e.target.value })}>{["upi", "bank_transfer", "cash", "card", "other"].map(x => <option key={x}>{x}</option>)}</select>
            <button className="btn-primary col-span-2 !py-2" disabled={!!busy} onClick={() => run("add", async () => { await api.addPayment({ id: b.id, amount: Number(np.amount), utr: np.utr, method: np.method, paidOn: np.paidOn }); setNp({ ...np, open: false, utr: "" }); }, "Payment recorded — client sent a receipt")}>Save payment</button>
          </div>}
          {Object.values(b.payments || {}).sort((a, c) => a.createdAt - c.createdAt).map(p => (
            <div key={p.id} className={`py-2 border-b border-brand-sand last:border-0 ${p.verified ? "" : "bg-amber-50 -mx-2 px-2 rounded"}`}>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-sm">
                  <div className="font-bold">{inr2(p.amount)} <span className="font-normal text-xs text-brand-muted">{fmtDate(p.paidOn, false)} · {p.method} · by {p.source}</span></div>
                  <div className="font-mono text-xs">{p.utr}</div>
                  <div className="text-[11px]">{p.proof ? <span className="text-emerald-700 font-bold">📸 Screenshot uploaded{p.verifiedBy ? ` · ${p.verifiedBy.split("@")[0]}` : ""}</span>
                    : p.verified ? <span className="text-emerald-700">✓ Checked{p.verifiedBy ? ` · ${p.verifiedBy.split("@")[0]}` : ""} (no screenshot)</span>
                    : <span className="text-amber-800 font-bold">Screenshot pending</span>}</div>
                </div>
                <button title="Delete payment" className="p-1.5 text-brand-muted hover:text-red-600" onClick={() => confirm(`Delete payment ${inr2(p.amount)} (${p.utr})?`) && run("d" + p.id, () => api.deletePayment(b.id, p.id))}><Trash2 size={14}/></button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
                {!p.proof && <a target="_blank" rel="noreferrer" href={waLink(b.phone, `Hi ${first}, thank you for your payment of ₹${Math.round(p.amount).toLocaleString("en-IN")} for your Living Roots booking ${b.ref} 🌿 Could you please share the payment screenshot here for our records?`)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366] text-white"><MessageCircle size={12}/> Ask for screenshot</a>}
                <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer ${p.proof ? "border border-brand-border bg-white" : "bg-emerald-700 text-white font-bold"}`}>
                  <Upload size={12}/> {busy === "u" + p.id ? "Uploading…" : p.proof ? "Replace screenshot" : "Upload screenshot"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) run("u" + p.id, async () => api.uploadProof(b.id, p.id, await compressImage(f)), "Screenshot saved — payment marked checked"); }}/>
                </label>
                {p.proof && <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-border bg-white" onClick={() => run("g" + p.id, async () => setProof((await api.getProof(b.id, p.id)).image))}><Eye size={12}/> View</button>}
                {!p.verified && <button className="px-2 py-1.5 text-brand-muted underline" onClick={() => confirm("Mark as checked without a screenshot (e.g. you saw it in the Yes Bank app)?") && run("v" + p.id, () => api.verify(b.id, p.id, true), "Marked checked")}>Checked in bank app</button>}
                {p.verified && !p.proof && <button title="Undo" className="px-2 py-1.5 text-brand-muted" onClick={() => run("v" + p.id, () => api.verify(b.id, p.id, false))}><RotateCcw size={12}/></button>}
              </div>
            </div>))}
          {!Object.keys(b.payments || {}).length && <p className="text-xs text-brand-muted">No payments yet.</p>}
          <p className="text-[11px] text-brand-muted mt-2">The client's booking is confirmed as soon as they enter their UPI reference. Collect the payment screenshot on WhatsApp, check it against the Yes Bank app, and upload it here. Clients never see this step.</p>
        </Card>

        {/* Workflow */}
        <Card title="Status & follow-up">
          <div className="flex flex-wrap gap-1 mb-3">{(["enquiry", "quoted", "confirmed", "completed", "cancelled", "lost"] as Stage[]).map(s =>
            <button key={s} disabled={s === b.stage || !!busy} onClick={() => setStage(s)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${s === b.stage ? "bg-brand-earth text-white border-brand-earth" : "border-brand-border bg-white"}`}>{STAGE_LABEL[s]}</button>)}</div>
          {b.cancelReason && <p className="text-xs text-red-700 mb-2">Reason: {b.cancelReason}</p>}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs"><span className="label !mb-1">Assigned to</span>
              <input className="input !py-2 text-sm" defaultValue={b.assignedTo || ""} onBlur={e => e.target.value !== (b.assignedTo || "") && run("as", () => api.update({ id: b.id, patch: { assignedTo: e.target.value } }), "Saved")}/></label>
            <label className="text-xs"><span className="label !mb-1">Follow up on</span>
              <input type="date" className="input !py-2 text-sm" defaultValue={b.followUpOn || ""} onChange={e => run("fu", () => api.update({ id: b.id, patch: { followUpOn: e.target.value } }), "Saved")}/></label>
          </div>
        </Card>

        <Card title="Notes">
          <div className="flex gap-2 mb-2">
            <input className="input !py-2 text-sm" placeholder="Called, will confirm Friday…" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === "Enter" && note && run("note", async () => { await api.update({ id: b.id, note }); setNote(""); })}/>
            <button className="btn-primary !px-4 !py-2" disabled={!note || !!busy} onClick={() => run("note", async () => { await api.update({ id: b.id, note }); setNote(""); })}>Add</button>
          </div>
          {Object.values(b.notes || {}).sort((a, c) => c.at - a.at).map((n, i) => <div key={i} className="text-sm py-1.5 border-b border-brand-sand last:border-0"><div>{n.text}</div><div className="text-[10px] text-brand-muted">{n.by.split("@")[0]} · {new Date(n.at).toLocaleString("en-IN")}</div></div>)}
        </Card>

        <Card title="Client">
          <dl className="text-sm grid grid-cols-[110px_1fr] gap-y-1">
            <Dt k="Mobile" v={b.phone}/><Dt k="Email" v={b.email}/><Dt k="Organisation" v={b.organisation}/><Dt k="GSTIN" v={b.gstin}/>
            <Dt k="Client type" v={b.clientType}/><Dt k="Booking type" v={TYPE_LABEL[b.input.type]}/><Dt k="Purpose" v={b.purpose}/><Dt k="Guests" v={b.input.guests?.toString()}/>
            <Dt k="Source" v={`${b.source}${b.sourceDetail ? ` · ${b.sourceDetail}` : ""}`}/><Dt k="Heard from" v={b.heardFrom}/><Dt k="First-time" v={b.isFirstTime ? "Yes" : "No"}/>
            <Dt k="Created" v={`${new Date(b.createdAt).toLocaleString("en-IN")}${b.createdBy ? ` by ${b.createdBy.split("@")[0]}` : ""}`}/>
            <Dt k="Requests" v={b.requests}/>
          </dl>
          {b.partnerBank && <div className="mt-3 bg-brand-bone rounded-xl p-3 text-xs"><p className="label !mb-1">Partner bank (payouts)</p>
            {Object.entries(b.partnerBank).map(([k, v]) => <div key={k}><span className="text-brand-muted">{k}:</span> <span className="font-mono">{v}</span></div>)}</div>}
        </Card>

        {b.emailLog && <Card title="Emails sent">
          {Object.values(b.emailLog).sort((a, c) => c.at - a.at).map((e, i) => <div key={i} className="text-xs flex justify-between py-1"><span>{e.kind.replace(/_/g, " ")} → {e.to}</span><span className={e.ok ? "text-emerald-700" : "text-red-700"}>{e.ok ? "sent" : "failed"} · {new Date(e.at).toLocaleDateString("en-IN")}</span></div>)}
        </Card>}
      </div>
      {proof && <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setProof("")}>
        <img src={proof} alt="Payment screenshot" className="max-h-full max-w-full rounded-xl"/>
        <button className="absolute top-4 right-4 text-white" aria-label="Close"><X size={24}/></button></div>}
    </Panel>
  );
}

function Panel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
    <div className="absolute inset-0 bg-black/30"/>
    <div className="relative w-full max-w-lg h-full bg-[#F7F4ED] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>{children}</div>
  </div>;
}
const Card = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) =>
  <div className="bg-white rounded-xl border border-brand-border p-3"><div className="flex justify-between items-center mb-2"><h3 className="font-bold text-sm">{title}</h3>{right}</div>{children}</div>;
const Stat = ({ l, v, good, bad }: { l: string; v: string; good?: boolean; bad?: boolean }) =>
  <div className="bg-brand-bone rounded-lg py-2"><div className="text-[10px] uppercase tracking-wider text-brand-muted">{l}</div><div className={`font-bold ${good ? "text-emerald-700" : bad ? "text-red-700" : ""}`}>{v}</div></div>;
const Dt = ({ k, v }: { k: string; v?: string }) => v ? <><dt className="text-brand-muted text-xs pt-0.5">{k}</dt><dd className="break-words">{v}</dd></> : null;
const A = ({ href, icon: I, children, green, blank }: any) =>
  <a href={href} target={green || blank ? "_blank" : undefined} rel="noreferrer" className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg ${green ? "bg-[#25D366] text-white" : "border border-brand-border bg-white"}`}><I size={12}/> {children}</a>;
const Btn = ({ onClick, icon: I, children, busy }: any) =>
  <button onClick={onClick} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-border bg-white disabled:opacity-50"><I size={12}/> {busy ? "…" : children}</button>;
