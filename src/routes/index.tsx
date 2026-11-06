import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, FileText, Landmark } from "lucide-react";
import { listReunioesConvocadas } from "@/lib/legis.functions";
import { formatDataHora } from "@/lib/format";

const reunioesQuery = queryOptions({
  queryKey: ["reunioes"],
  queryFn: () => listReunioesConvocadas(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pautas de Comissões — ALESP" },
      { name: "description", content: "Reuniões convocadas das comissões da ALESP e geração de pautas para impressão." },
      { property: "og:title", content: "Pautas de Comissões — ALESP" },
      { property: "og:description", content: "Gere pautas de reuniões de comissões legislativas da ALESP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(reunioesQuery),
  component: Index,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-destructive">Erro ao carregar reuniões: {error.message}</div>
  ),
});

function Index() {
  const { data } = useSuspenseQuery(reunioesQuery);
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5">
          <Landmark className="h-7 w-7" />
          <div>
            <h1 className="text-xl font-semibold">Pautas de Comissões</h1>
            <p className="text-sm opacity-80">Assembleia Legislativa do Estado de São Paulo</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Reuniões convocadas ({data.length})</h2>
        {data.length === 0 && (
          <p className="rounded-md border bg-card p-6 text-muted-foreground">Nenhuma reunião convocada no período.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((r) => (
            <article key={r.idReuniao} className="flex flex-col rounded-lg border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.sigla}</p>
              <h3 className="mt-1 text-base font-semibold text-card-foreground">{r.comissao}</h3>
              <p className="text-sm text-muted-foreground">{r.tituloReuniao}</p>
              <div className="mt-3 space-y-1 text-sm text-foreground">
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDataHora(r.dtReuniao)}</p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{r.local || "—"}</p>
              </div>
              <Link
                to="/pauta/$id"
                params={{ id: String(r.idReuniao) }}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <FileText className="h-4 w-4" /> Gerar Pauta
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
