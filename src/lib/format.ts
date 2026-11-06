const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export function formatDataHora(iso: string) {
  const [d, t] = iso.split("T");
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}${t ? ` às ${t.slice(0, 5)}` : ""}`;
}

export function dataExtenso(iso: string) {
  const [y, m, d] = (iso.split("T")[0] ?? "").split("-");
  return `${Number(d)} de ${MESES[Number(m) - 1]} de ${y}`;
}

export function hora(iso: string) {
  return (iso.split("T")[1] ?? "").slice(0, 5);
}
