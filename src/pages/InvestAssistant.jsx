import { useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { Sparkles, Send, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
const SUGGESTIONS = [
  "What is a stock?",
  "Explain diversification in simple terms",
  "What is an ETF and how does it work?",
  "How do dividends work?",
];
export default function InvestAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your Invest Assistant — here to help you learn about investing. Ask me about stocks, ETFs, dividends, diversification, or your simulated portfolio. I'm educational only, not a licensed financial adviser.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ask = async (prompt) => {
    if (!prompt.trim() || loading) return;
    const next = [...messages, { role: "user", content: prompt }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke('investAssistant', { question: prompt });
      setMessages([...next, { role: "assistant", content: res?.data?.answer || "Sorry, I couldn't generate a response." }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Invest Assistant" subtitle="Your AI investing tutor — educational only, not financial advice." icon={Sparkles} />
      <Card className="flex flex-col shadow-card border-border/70" style={{ height: "60vh", minHeight: 420 }}>
        <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-hide">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
              <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", m.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {m.role === "assistant" ? <Sparkles className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
              </div>
              <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", m.role === "assistant" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground")}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div className="flex gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles className="h-4 w-4 animate-pulse" /></div><div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">Thinking…</div></div>}
        </div>
        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground">{s}</button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2 border-t border-border p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about investing…" className="h-11 flex-1 rounded-full border border-input bg-card px-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
          <button type="submit" disabled={loading} className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </form>
      </Card>
      <Disclaimer />
    </div>
  );
}
