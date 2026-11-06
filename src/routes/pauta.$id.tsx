import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { getPauta } from "@/lib/legis.functions";
import { dataExtenso, hora } from "@/lib/format";

const pautaQuery = (id: number) =>
  queryOptions({ queryKey: ["pauta", id], queryFn: () => getPauta({ data: { id } }) });

export const Route = createFileRoute("/pauta/$id")({
  head: () => ({
    meta: [
      { title: "Pauta da Reunião — ALESP" },
      { name: "description", content: "Pauta editável da reunião de comissão para impressão em paisagem." },
      { property: "og:title", content: "Pauta da Reunião — ALESP" },
      { property: "og:description", content: "Visualize, edite e imprima a pauta da reunião." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(pautaQuery(Number(params.id))),
  component: PautaPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-destructive">Erro ao carregar a pauta: {(error as Error).message}</div>
  ),
});

const COLS = ["Item", "Proposição", "Autor", "Objeto", "Relator", "Voto", "Vista"];

function PautaPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(pautaQuery(Number(id)));
  const docRef = useRef<HTMLDivElement>(null);
  const key = `pauta-edits-${id}`;
  const r = data.reuniao;

  // Restore saved edits (keyed by data-k) and autosave on input.
  useEffect(() => {
    const root = docRef.current;
    if (!root) return;
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, string>;
      root.querySelectorAll<HTMLElement>("[data-k]").forEach((el) => {
        const v = saved[el.dataset["k"]!];
        if (v !== undefined) el.innerHTML = v;
      });
    } catch { /* ignore */ }
    const onInput = (e: Event) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-k]");
      if (!el) return;
      const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
      saved[el.dataset["k"]!] = el.innerHTML;
      localStorage.setItem(key, JSON.stringify(saved));
    };
    root.addEventListener("input", onInput);
    return () => root.removeEventListener("input", onInput);
  }, [key]);

  const tipoReuniao = /extraordin/i.test(data.descricao) ? "Extraordinária" : "Ordinária";
  const ciencia = data.ciencia.length ? data.ciencia.join("\n\n") : "";

  return (
    <div className="min-h-screen bg-muted/40 print:bg-background">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-card px-4 py-3 print:hidden">
        <Link to="/" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
          <ArrowLeft className="h-4 w-4" /> Voltar às reuniões
        </Link>
        <button
          onClick={() => { if (confirm("Descartar todas as edições desta pauta?")) { localStorage.removeItem(key); location.reload(); } }}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
        >
          <RotateCcw className="h-4 w-4" /> Restaurar original
        </button>
        <span className="text-xs text-muted-foreground">Clique em qualquer célula para editar — salvo automaticamente.</span>
        <button
          onClick={() => window.print()}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Printer className="h-4 w-4" /> Imprimir / Gerar PDF
        </button>
      </div>

      <div ref={docRef} className="pauta-doc mx-auto my-6 bg-background p-8 shadow print:m-0 print:p-0 print:shadow-none">
        <header className="mb-4 text-center font-bold">
          <h1 data-k="h1" contentEditable suppressContentEditableWarning className="text-[16px] uppercase">
            {r.comissao.toUpperCase()}
          </h1>
          <p data-k="h2" contentEditable suppressContentEditableWarning className="mt-1 text-[13px]">
            {r.nuReuniao ?? ""}ª Reunião {tipoReuniao} {dataExtenso(r.dtReuniao)} às {hora(r.dtReuniao)} horas no {r.local}.
          </p>
          <p data-k="h3" contentEditable suppressContentEditableWarning className="mt-1 text-[13px]">
            Presidente: {r.presidente ? `Deputado(a) ${titleCase(r.presidente)}` : ""}
          </p>
        </header>

        <table className="pauta-table">
          <colgroup>
            <col style={{ width: "4%" }} /><col style={{ width: "12%" }} /><col style={{ width: "13%" }} />
            <col style={{ width: "33%" }} /><col style={{ width: "13%" }} /><col style={{ width: "17%" }} /><col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr>{COLS.map((c) => <th key={c}>{c === "Objeto" ? "OBJETO" : c}</th>)}</tr>
          </thead>
          <tbody>
            {data.itens.map((it, i) => (
              <tr key={i}>
                <Cell k={`${i}-item`} className="text-center">{it.ordem}</Cell>
                <Cell k={`${i}-prop`}>{it.tipo}<br />{it.numero}</Cell>
                <Cell k={`${i}-autor`}>{it.autor}</Cell>
                <Cell k={`${i}-obj`}>{it.objeto}</Cell>
                <Cell k={`${i}-rel`}>{it.relator}</Cell>
                <Cell k={`${i}-voto`}>{it.voto}</Cell>
                <Cell k={`${i}-vista`}>{it.vista}</Cell>
              </tr>
            ))}
            {data.itens.length === 0 && (
              <tr><Cell k="empty" colSpan={7} className="text-center">Nenhuma proposição na pauta.</Cell></tr>
            )}
          </tbody>
        </table>

        <section className="pauta-ciencia mt-4">
          <h2 className="mb-1 font-bold uppercase">Itens de ciência / Informações adicionais</h2>
          <div data-k="ciencia" contentEditable suppressContentEditableWarning className="min-h-[3em] whitespace-pre-wrap border border-foreground p-2">
            {ciencia}
          </div>
        </section>
      </div>
    </div>
  );
}

function Cell({ k, children, className, colSpan }: { k: string; children: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td data-k={k} contentEditable suppressContentEditableWarning className={className} colSpan={colSpan}>
      {children}
    </td>
  );
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
