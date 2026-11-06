import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://legis-api-portal-prd.al.sp.gov.br/colegiado";

async function getJson(url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`API ALESP respondeu ${res.status}`);
  return res.json();
}

export type Reuniao = {
  idReuniao: number;
  nuReuniao: number | null;
  tituloReuniao: string;
  dtReuniao: string;
  local: string;
  comissao: string;
  sigla: string;
  presidente: string | null;
  linkPauta: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReuniao(r: any): Reuniao {
  const pauta = (r.documentosReuniao ?? []).find((d: { tipo?: string }) => d.tipo === "Pauta de colegiado");
  return {
    idReuniao: r.idReuniao,
    nuReuniao: r.nuReuniao ?? null,
    tituloReuniao: r.tituloReuniao ?? "",
    dtReuniao: r.dtReuniao ?? "",
    local: r.local?.txNome ?? "",
    comissao: r.colegiadosRelacionados?.[0]?.nome ?? r.solicitante ?? "",
    sigla: r.colegiadosRelacionados?.[0]?.sigla ?? "",
    presidente: r.presidente ?? null,
    linkPauta: pauta?.linkArquivoPDF ?? pauta?.linkArquivo ?? null,
  };
}

export const listReunioesConvocadas = createServerFn({ method: "GET" }).handler(async () => {
  const all: Reuniao[] = [];
  for (let page = 0; page < 10; page++) {
    const d = await getJson(
      `${BASE}/reunioes?page=${page}&size=50&dataInicio=2026-01-01&dataFim=2027-01-31`,
    );
    const content = d.content ?? [];
    for (const r of content) if (r.status?.txNome === "Convocada") all.push(mapReuniao(r));
    if (d.last !== false || content.length === 0) break;
  }
  return all.sort((a, b) => a.dtReuniao.localeCompare(b.dtReuniao));
});

export type ItemPauta = {
  ordem: number;
  tipo: string;
  numero: string;
  autor: string;
  objeto: string;
  relator: string;
  voto: string;
  vista: string;
};

const TIPOS: Record<string, string> = {
  PL: "Projeto de lei",
  PLC: "Projeto de lei Complementar",
  PEC: "Proposta de emenda à Constituição",
  PDL: "Projeto de decreto legislativo",
  PR: "Projeto de resolução",
  MOC: "Moção",
  REQ: "Requerimento",
};

export const getPauta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const [r, p] = await Promise.all([
      getJson(`${BASE}/reuniao/${data.id}`),
      getJson(`${BASE}/reuniao/${data.id}/pauta?page=0&size=200`).catch(() => ({ content: [] })),
    ]);
    const itens: ItemPauta[] = [];
    const ciencia: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const it of (p.content ?? []) as any[]) {
      const proc = it.processoDadosView;
      if (!proc) {
        const txt = [it.txDescricao, it.descricao, it.txTexto].filter(Boolean).join(" ");
        if (txt) ciencia.push(txt);
        continue;
      }
      const m = /^(\S+)\s+(.*)$/.exec(proc.txDescricao ?? "");
      const sig = m?.[1] ?? "";
      const votos = (it.documentosVoto ?? []).filter((v: { substituido?: boolean }) => !v.substituido);
      const voto = votos[votos.length - 1];
      itens.push({
        ordem: it.nuOrdem ?? itens.length + 1,
        tipo: TIPOS[sig] ?? sig,
        numero: m?.[2] ?? proc.txDescricao ?? "",
        autor: proc.txNomeAutores ? `Deputado(a) ${proc.txNomeAutores}` : "",
        objeto: proc.txEmenta ?? "",
        relator: voto?.autores ? `Deputado(a) ${voto.autores}` : "",
        voto: voto?.conclusao ?? "",
        vista: Array.isArray(it.vistas) ? it.vistas.map((v: { autor?: string }) => v.autor ?? "").join(", ") : "",
      });
    }
    return { reuniao: mapReuniao(r), descricao: r.tituloReuniao ?? "", itens, ciencia };
  });
