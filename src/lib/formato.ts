const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const SEMANA_CURTA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const comCentavos = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatarBRL(centavos: number): string {
  const reais = centavos / 100;
  return "R$ " + (centavos % 100 === 0 ? inteiro : comCentavos).format(reais);
}

function partes(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return { ano, mes, dia, semana: new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() };
}

export function rotuloDia(data: string): string {
  const { mes, dia } = partes(data);
  return String(dia).padStart(2, "0") + " " + MESES_CURTOS[mes - 1];
}

/** "Dom, 15 nov": o rótulo do filtro de dia. */
export function rotuloComSemana(data: string): string {
  const { mes, dia, semana } = partes(data);
  return `${SEMANA_CURTA[semana]}, ${dia} ${MESES_CURTOS[mes - 1]}`;
}

export function diaPorExtenso(data: string): string {
  const { mes, dia, semana } = partes(data);
  return `${DIAS_DA_SEMANA[semana]}, ${dia} de ${MESES[mes - 1]}`;
}

export function mesPorExtenso(data: string): string {
  const { ano, mes } = partes(data);
  const nome = MESES[mes - 1];
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`;
}

export function seloDia(data: string): { dia: string; mes: string } {
  const { mes, dia } = partes(data);
  return { dia: String(dia), mes: MESES_CURTOS[mes - 1] };
}

export function diasEntre(de: string, ate: string): number {
  const a = partes(de);
  const b = partes(ate);
  return Math.round((Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia)) / 86_400_000);
}

export function hojeLocal(agora = new Date()): string {
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export function dataLocal(iso: string): string {
  return hojeLocal(new Date(iso));
}

export function iniciais(nome: string): string {
  return nome.trim().slice(0, 2).toUpperCase() || "?";
}

export function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}
