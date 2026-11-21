// Campos reutilizables de cada paso
const F = { l: ["fecha", "Fecha", "date"] };
const FECHA = [["fecha", "Fecha", "date"]];
const ENTREV = [["fecha", "Fecha de la entrevista", "date"], ["entrevistador", "Nombre de quien te entrevistó", "text"]];
const MINIS = [["ministrantes", "Nombres de las personas asignadas", "text"]];

export const CAMINO_MUJER = [
  ["Bautismo", [["fecha", "Fecha de bautismo", "date"]]],
  ["Confirmación", [["fecha", "Fecha de confirmación", "date"]]],
  ["Entrevista con el obispo", ENTREV],
  ["Cuenta en FamilySearch", [["fecha", "Fecha en que creaste la cuenta", "date"]]],
  ["Empezar el árbol genealógico con tus antepasados", [["fecha", "Fecha en que lo empezaste", "date"]]],
  ["Hermanas ministrantes asignadas", MINIS],
  ["Charlas personalizadas para entrar al templo por primera vez", FECHA],
  ["Generar tarjetas de ordenanzas para el templo", FECHA],
  ["Entrevista para la recomendación del templo", ENTREV],
  ["Tener la recomendación del templo", FECHA]
];

export const CAMINO_HOMBRE = [
  ["Bautismo", [["fecha", "Fecha de bautismo", "date"]]],
  ["Confirmación", [["fecha", "Fecha de confirmación", "date"]]],
  ["Entrevista con el obispo", ENTREV],
  ["Sacerdocio Aarónico", [["fecha", "Fecha en que lo recibiste", "date"]]],
  ["Cuenta en FamilySearch", [["fecha", "Fecha en que creaste la cuenta", "date"]]],
  ["Empezar el árbol genealógico con tus antepasados", [["fecha", "Fecha en que lo empezaste", "date"]]],
  ["Hermanos ministrantes asignados", MINIS],
  ["Charlas personalizadas para entrar al templo por primera vez", FECHA],
  ["Generar tarjetas de ordenanzas para el templo", FECHA],
  ["Entrevista para la recomendación del templo", ENTREV],
  ["Tener la recomendación del templo", FECHA],
  ["Charlas para el Sacerdocio de Melquisedec", FECHA],
  ["Tener el Sacerdocio de Melquisedec", [["fecha", "Fecha en que lo recibiste", "date"]]]
];

export const caminoDe = (sexo) => (sexo === "hombre" ? CAMINO_HOMBRE : CAMINO_MUJER);

// ====== TEXTOS FINALES (se cambian solo aquí) ======
export const MENSAJES_FINALES = {
  mision: "¡Felicidades! Has completado tu camino. Te invitamos a prepararte para servir una misión.",
  hijos: "¡Felicidades! Has completado tu camino hacia el templo. ¡Sigue adelante con fe junto a tu familia!",
  fuera: "¡Felicidades! Has completado tu camino hacia el templo. ¡Sigue adelante con fe!"
};
const LIMITE = { hombre: 25, mujer: 29 }; // se asume incluidos

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function edadEn(nac, ref) {
  const n = new Date(nac + "T00:00"), r = new Date(ref);
  let e = r.getFullYear() - n.getFullYear();
  if (r.getMonth() < n.getMonth() || (r.getMonth() === n.getMonth() && r.getDate() < n.getDate())) e--;
  return e;
}

export function mensajeFinal(u) {
  if (u.hijos === "si") return MENSAJES_FINALES.hijos;
  const b = new Date(u.bautismo + "T00:00");
  b.setFullYear(b.getFullYear() + 1); // edad un año después del bautismo
  return edadEn(u.nacimiento, b) <= LIMITE[u.sexo] ? MENSAJES_FINALES.mision : MENSAJES_FINALES.fuera;
}

// Devuelve el número de mes (1-12) si hoy se cumple un hito, si no 0
export function hito(bautismo) {
  if (!bautismo) return 0;
  const d = new Date(bautismo + "T00:00"), t = new Date();
  const m = (t.getFullYear() - d.getFullYear()) * 12 + t.getMonth() - d.getMonth();
  return m >= 1 && m <= 12 && t.getDate() === d.getDate() ? m : 0;
}

const trato = (u) => (u.sexo === "hombre" ? "Querido hermano" : "Querida hermana");

export function waLink(num, texto) {
  return "https://wa.me/" + String(num || "").replace(/\D/g, "") + "?text=" + encodeURIComponent(texto);
}

export function msgPaso(u, n) {
  const nom = u.nombre ? " " + u.nombre : "";
  return `${trato(u)}${nom}, te felicitamos por haber concluido el paso ${n} de tu camino hacia el templo: ${caminoDe(u.sexo)[n - 1][0]}. Te invitamos a entrar a la plataforma, verificar que tu progreso esté registrado y llenar los campos de este paso para poder continuar. ¡Sigue adelante!`;
}

export function msgCorreccion(u, n) {
  const nom = u.nombre ? " " + u.nombre : "";
  return `${trato(u)}${nom}, por motivos técnicos o de logística se modificó el paso ${n} (${caminoDe(u.sexo)[n - 1][0]}) de tu progreso en la plataforma. Te invitamos a entrar y revisar tu avance. ¡Gracias por tu comprensión!`;
}

export function msgHito(u, m) {
  const nom = u.nombre ? " " + u.nombre : "";
  return `${trato(u)}${nom}, ¡hoy cumples ${m} ${m === 1 ? "mes" : "meses"} desde tu bautismo! Te felicitamos y te animamos a seguir adelante en tu camino hacia el templo.`;
}

const INFO = [
  [/charlas para el sacerdocio/i, "Charlas Melquisedec", "📖"], [/melquisedec/i, "Sacerdocio Melquisedec", "✨"],
  [/bautismo/i, "Bautismo", "💧"], [/confirmaci/i, "Confirmación", "🕊️"], [/entrevista con el obispo/i, "Entrevista Obispo", "🤝"],
  [/aar/i, "Sacerdocio Aarónico", "📜"], [/familysearch/i, "Cuenta FamilySearch", "💻"], [/árbol/i, "Árbol Genealógico", "🌳"],
  [/ministrante/i, "Ministrantes", "👫"], [/charlas personalizadas/i, "Charlas Templo", "⛪"], [/tarjetas/i, "Tarjetas Ordenanzas", "🗂️"],
  [/entrevista para la recomend/i, "Entrevista Recomendación", "📋"], [/tener la recomend/i, "Recomendación Templo", "🎫"]
];
export const infoPaso = (nombre) => { const x = INFO.find((i) => i[0].test(nombre)); return x ? [x[1], x[2]] : [nombre, "⭐"]; };
