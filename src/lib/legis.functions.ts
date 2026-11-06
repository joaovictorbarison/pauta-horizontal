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

function decode(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();
}

export type LinhaPauta = { secao: string } | ItemPauta;

/** Parses the official "Pauta de colegiado" HTML document published by ALESP. */
export function parsePautaHtml(html: string) {
  const linhas: LinhaPauta[] = [];
  const ciencia: string[] = [];
  let emCiencia = false;
  let atual: ItemPauta | null = null;
  const re = /<(h4|h5|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1]!.toLowerCase();
    const txt = decode(m[2]!);
    if (tag === "h4") {
      emCiencia = /ci[eê]ncia/i.test(txt);
      if (!emCiencia && txt) linhas.push({ secao: txt });
      atual = null;
      continue;
    }
    if (emCiencia) {
      if (tag === "p" && txt) ciencia.push(txt);
      continue;
    }
    if (tag === "h5") {
      const h = /^(\d+)\s*-\s*(\S+)\s+(.*)$/.exec(txt);
      if (!h) continue;
      atual = { ordem: Number(h[1]), tipo: TIPOS[h[2]!] ?? h[2]!, numero: h[3]!, autor: "", objeto: "", relator: "", voto: "", vista: "" };
      linhas.push(atual);
    } else if (tag === "p" && atual) {
      for (const line of txt.split("\n")) {
        const kv = /^\s*(Autoria|Ementa|Relator|Voto|Vistas?)\s*:\s*(.*)$/i.exec(line);
        if (!kv) continue;
        const k = kv[1]!.toLowerCase();
        const v = kv[2]!.trim();
        if (k === "autoria") atual.autor = v;
        else if (k === "ementa") atual.objeto = v;
        else if (k === "relator") atual.relator = v;
        else if (k === "voto") atual.voto = v;
        else atual.vista = v;
      }
    }
  }
  return { linhas, ciencia };
}

export const getPauta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const r = await getJson(`${BASE}/reuniao/${data.id}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = (r.documentosReuniao ?? []).find((d: any) => d.tipo === "Pauta de colegiado");
    let fonte = "";
    if (doc?.linkArquivo) {
      try {
        const res = await fetch(doc.linkArquivo);
        if (res.ok) {
          const parsed = parsePautaHtml(await res.text());
          if (parsed.linhas.length || parsed.ciencia.length) {
            fonte = doc.linkArquivoPDF ?? doc.linkArquivo;
            return { reuniao: mapReuniao(r), descricao: r.tituloReuniao ?? "", ...parsed, fonte };
          }
        }
      } catch (e) {
        console.error("Falha ao ler documento de pauta", e);
      }
    }
    // Fallback: structured /pauta endpoint (no vistas/ciência guaranteed).
    const p = await getJson(`${BASE}/reuniao/${data.id}/pauta?page=0&size=200`).catch(() => ({ content: [] }));
    const linhas: LinhaPauta[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const it of (p.content ?? []) as any[]) {
      const proc = it.processoDadosView;
      if (!proc) continue;
      const m = /^(\S+)\s+(.*)$/.exec(proc.txDescricao ?? "");
      const votos = (it.documentosVoto ?? []).filter((v: { substituido?: boolean }) => !v.substituido);
      const voto = votos[votos.length - 1];
      linhas.push({
        ordem: it.nuOrdem ?? linhas.length + 1,
        tipo: TIPOS[m?.[1] ?? ""] ?? m?.[1] ?? "",
        numero: m?.[2] ?? proc.txDescricao ?? "",
        autor: proc.txNomeAutores ?? "",
        objeto: proc.txEmenta ?? "",
        relator: voto?.autores ?? "",
        voto: voto?.conclusao ?? "",
        vista: "",
      });
    }
    return { reuniao: mapReuniao(r), descricao: r.tituloReuniao ?? "", linhas, ciencia: [] as string[], fonte };
  });
