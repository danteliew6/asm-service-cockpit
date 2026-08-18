import { useEffect, useState } from 'react';
import { Card, Badge, Button, Skeleton, GenieChat } from '@databricks/appkit-ui/react';
import { Sparkles, Bot, Wrench, Search } from 'lucide-react';

type Source = { id: string; doc_type: string; title: string; product_line: string; score: number };

const SAMPLE_QS = [
  'Particle excursion after many ALD cycles on Pulsar XP — what should we check?',
  'Wafer temperature non-uniformity on Intrepid epitaxy',
  'What drives emergency callout costs and renewal risk?',
];

export function ForecastReviewPage() {
  const [email, setEmail] = useState<string>('');
  useEffect(() => {
    fetch('/api/whoami').then((r) => r.json()).then((d) => setEmail(d.email)).catch(() => setEmail(''));
  }, []);

  // ---- Service Assistant (Vector Search + LLM) ----
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function ask(question: string) {
    setLoading(true);
    setErr(null);
    setAnswer(null);
    setSources([]);
    try {
      const r = await fetch('/api/service-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setAnswer(d.answer);
      setSources(d.sources ?? []);
    } catch {
      setErr('Assistant request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Forecast Review — AI Assistants
          </h2>
          <p className="text-sm text-muted-foreground">
            Interrogate the service data with Genie, or troubleshoot tools with the knowledge-base assistant.
          </p>
        </div>
        {email && (
          <Badge variant="secondary" className="gap-1">
            <Bot className="h-3 w-3" /> {email}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Genie */}
        <Card className="p-0 overflow-hidden flex flex-col h-[560px]">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-medium">Ask ASM Service Genie</div>
            <Badge variant="outline" className="ml-auto text-[10px]">Genie · NL→SQL</Badge>
          </div>
          <div className="flex-1 min-h-0">
            <GenieChat alias="default" placeholder="e.g. Which accounts have the highest L12M service revenue?" className="h-full" />
          </div>
          <div className="px-4 py-2 border-t text-[11px] text-muted-foreground">
            AI-generated — each answer shows the SQL Genie ran. Verify before acting. Runs on-behalf-of the signed-in user.
          </div>
        </Card>

        {/* Service Assistant (Vector Search + LLM) */}
        <Card className="p-4 flex flex-col h-[560px]">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-medium">Field Service Assistant</div>
            <Badge variant="outline" className="ml-auto text-[10px]">Vector Search · RAG</Badge>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Describe a tool symptom or spare-part question…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && q.trim() && ask(q)}
            />
            <Button size="sm" disabled={loading || !q.trim()} onClick={() => ask(q)}>Ask</Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SAMPLE_QS.map((s) => (
              <button
                key={s}
                onClick={() => { setQ(s); ask(s); }}
                className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted text-left"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {loading && <Skeleton className="h-40 w-full" />}
            {err && <div className="text-sm text-destructive">{err}</div>}
            {answer && (
              <div className="space-y-3">
                <div className="text-sm whitespace-pre-wrap text-foreground">{answer}</div>
                {sources.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Retrieved sources</div>
                    <div className="space-y-1">
                      {sources.map((s, i) => (
                        <div key={s.id} className="text-xs flex items-center gap-2">
                          <span className="text-muted-foreground">[{i + 1}]</span>
                          <span className="font-medium text-foreground">{s.title}</span>
                          <Badge variant="outline" className="text-[9px]">{s.product_line}</Badge>
                          <span className="ml-auto text-muted-foreground tabular-nums">{s.score.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!loading && !answer && !err && (
              <div className="text-sm text-muted-foreground mt-6 text-center">
                Ask a service question — answers are grounded in ASM service bulletins &amp; the spare-parts catalog via Vector Search.
              </div>
            )}
          </div>
          <div className="pt-2 border-t text-[11px] text-muted-foreground mt-2">
            AI-generated from retrieved documents — verify against official service documentation.
          </div>
        </Card>
      </div>
    </div>
  );
}
