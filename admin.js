import { db, auth } from "./config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, collectionGroup, doc, onSnapshot, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy, limit }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { caminoDe, esc, hito, waLink, msgPaso, msgCorreccion, msgHito } from "./data.js";

let C = null, users = {}, pasos = {}, started = null, pUid = null, uU = null, pU = null;
const fmt = (t) => (t?.toDate ? t.toDate().toLocaleDateString("es") : "");
const fmtH = (t) => (t?.toDate ? t.toDate().toLocaleString("es") : "");
const gen = () => C.S.admin === "general";
const quien = () => C.S.adminNombre || C.S.user.email;
const head = (t, atras = true) => `<header>${atras ? '<button class="back" onclick="history.back()">← Atrás</button>' : ""}<h1>${esc(t)}</h1></header>`;
const uid = () => C.r.split("/")[2];
const cuenta = () => Object.values(pasos).filter((p) => p.verificado).length;

export function renderAdmin(app, S, r, go) {
  C = { app, S, r, go };
  if (started !== S.user.uid) {
    uU && uU(); started = S.user.uid; users = {};
    uU = onSnapshot(collection(db, "users"), (qs) => { users = {}; qs.forEach((d) => (users[d.id] = d.data())); draw(); }, () => {});
  }
  const parts = r.split("/");
  const quiere = parts[1] === "u" ? parts[2] : null;
  if (quiere !== pUid) {
    pU && pU(); pU = null; pUid = quiere; pasos = {};
    if (quiere) pU = onSnapshot(collection(db, "users", quiere, "pasos"), (qs) => { pasos = {}; qs.forEach((d) => (pasos[d.id] = d.data())); draw(); }, () => {});
  }
  draw();
}

function draw() {
  const p = C.r.split("/")[1];
  C.app.onclick = clic;
  if (p === "u") return vPersona();
  if (p === "historial" && gen()) return vHistorial();
  vLista();
}

function vLista() {
  const lista = Object.entries(users).sort((a, b) => (a[1].nombre || "").localeCompare(b[1].nombre || ""));
  const hitos = lista.map(([id, u]) => [id, u, hito(u.bautismo)]).filter((x) => x[2]);
  let h = head("Panel de administración", false);
  if (hitos.length) h += `<div class="card"><b>🎉 Hitos de hoy</b>${hitos.map(([, u, m]) =>
    `<a class="btn wa" target="_blank" href="${waLink(u.whatsapp, msgHito(u, m))}">Felicitar a ${esc(u.nombre)} (${m} ${m === 1 ? "mes" : "meses"})</a>`).join("")}</div>`;
  h += lista.map(([id, u]) => `<button class="step" onclick="location.hash='#/admin/u/${id}'">
    <span class="n">${u.avance || 0}/${caminoDe(u.sexo).length}</span><span>${esc(u.nombre)}</span></button>`).join("") || '<div class="card">Aún no hay participantes.</div>';
  if (gen()) h += `<button class="btn sec" onclick="location.hash='#/admin/historial'">Ver historial</button><button class="btn sec" data-a="pdf">Descargar reporte PDF</button>`;
  h += `<button class="btn red" data-a="out">Cerrar sesión</button>`;
  C.app.innerHTML = h;
}

function vPersona() {
  const u = users[uid()];
  if (!u) return (C.app.innerHTML = head("Participante") + '<div class="card">Cargando…</div>');
  const def = caminoDe(u.sexo), g = gen();
  let h = head(u.nombre) + `<div class="hint">${esc(u.email)} | WhatsApp ${esc(u.whatsapp)}<br>Nacimiento ${esc(u.nacimiento)} | Bautismo ${esc(u.bautismo)} | Hijos: ${esc(u.hijos)}</div>`;
  def.forEach(([nm, campos], i) => {
    const n = i + 1, p = pasos[n] || {}, prev = n === 1 || pasos[n - 1]?.verificado;
    h += `<div class="card" style="text-align:left"><b>${n}. ${esc(nm)}</b><br>`;
    if (p.verificado) {
      h += `✓ ${fmt(p.verificadoEn)} por ${esc(p.verificadoNombre)}<br>`;
      h += p.datos ? campos.map(([k, l]) => `${esc(l)}: ${esc(p.datos[k] || "")}<br>`).join("") : '<span class="hint">La persona aún no llena los datos.</span>';
      h += `<a class="btn wa" target="_blank" href="${waLink(u.whatsapp, msgPaso(u, n))}">Enviar mensaje por WhatsApp</a>`;
      if (g) h += `<button class="btn sec" data-a="editar" data-n="${n}">Editar datos</button><button class="btn red" data-a="quitar" data-n="${n}">Quitar check</button>`;
    } else {
      if (p.quitadoEn) h += `<span class="hint">Check quitado por ${esc(p.quitadoNombre)} el ${fmt(p.quitadoEn)}</span><a class="btn wa" target="_blank" href="${waLink(u.whatsapp, msgCorreccion(u, n))}">Avisar por WhatsApp</a>`;
      h += prev ? `<button class="btn" data-a="marcar" data-n="${n}">Marcar paso cumplido</button>` : '<span class="hint">🔒 Falta verificar el paso anterior</span>';
    }
    h += "</div>";
  });
  if (g) h += `<button class="btn red" data-a="borrar">Eliminar participante</button>`;
  C.app.innerHTML = h;
}

async function vHistorial() {
  C.app.innerHTML = head("Historial") + '<div class="card">Cargando…</div>';
  const qs = await getDocs(query(collection(db, "historial"), orderBy("en", "desc"), limit(100)));
  C.app.innerHTML = head("Historial") + [...qs.docs].map((d) => { const x = d.data();
    return `<div class="card" style="text-align:left">${esc(x.porNombre)} ${esc(x.accion)} ${x.paso ? "el paso " + x.paso : ""} de ${esc(x.persona)}<br><span class="hint">${fmtH(x.en)}</span></div>`; }).join("");
}

const log = (b, accion, paso) => b.set(doc(collection(db, "historial")), { uid: uid(), persona: users[uid()].nombre, paso: paso || 0, accion, por: C.S.user.uid, porNombre: quien(), en: serverTimestamp() });

const acciones = {
  async marcar(n) {
    const b = writeBatch(db);
    b.set(doc(db, "users", uid(), "pasos", String(n)), { verificado: true, verificadoPor: C.S.user.uid, verificadoNombre: quien(), verificadoEn: serverTimestamp(), quitadoEn: null }, { merge: true });
    b.update(doc(db, "users", uid()), { avance: cuenta() + 1 });
    log(b, "marcó", n); await b.commit();
  },
  async quitar(n) {
    if (!confirm(`¿Quitar el check del paso ${n}? Los demás pasos no cambian.`)) return;
    const b = writeBatch(db);
    b.set(doc(db, "users", uid(), "pasos", String(n)), { verificado: false, quitadoPor: C.S.user.uid, quitadoNombre: quien(), quitadoEn: serverTimestamp() }, { merge: true });
    b.update(doc(db, "users", uid()), { avance: Math.max(0, cuenta() - 1) });
    log(b, "quitó", n); await b.commit();
  },
  async editar(n) {
    const u = users[uid()], campos = caminoDe(u.sexo)[n - 1][1], datos = { ...(pasos[n]?.datos || {}) };
    for (const [k, l] of campos) { const v = prompt(l + (k.includes("fecha") ? " (AAAA-MM-DD)" : ""), datos[k] || ""); if (v === null) return; datos[k] = v.trim(); }
    if (n === 2 && datos.fecha < u.bautismo) return alert("La confirmación no puede ser anterior al bautismo.");
    const b = writeBatch(db);
    b.set(doc(db, "users", uid(), "pasos", String(n)), { datos, llenado: true }, { merge: true });
    if (n === 1) b.update(doc(db, "users", uid()), { bautismo: datos.fecha });
    log(b, "editó", n); await b.commit();
  },
  async borrar() {
    if (!confirm("¿Eliminar a este participante y todos sus datos? No se puede deshacer.")) return;
    const id = uid(), nombre = users[id].nombre;
    for (const k of Object.keys(pasos)) await deleteDoc(doc(db, "users", id, "pasos", k));
    await deleteDoc(doc(db, "users", id));
    await setDoc(doc(collection(db, "historial")), { uid: id, persona: nombre, paso: 0, accion: "eliminó a", por: C.S.user.uid, porNombre: quien(), en: serverTimestamp() });
    C.go("#/admin");
  },
  out: () => signOut(auth),
  pdf
};

async function clic(e) {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  b.disabled = true;
  try { await acciones[b.dataset.a](+b.dataset.n); } catch (err) { alert("Error: " + (err.code || err.message)); }
  b.disabled = false;
}

async function pdf() {
  if (!window.jspdf) await new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  const ps = {};
  (await getDocs(collectionGroup(db, "pasos"))).forEach((d) => { const id = d.ref.parent.parent.id; (ps[id] ??= {})[d.id] = d.data(); });
  const hs = (await getDocs(collection(db, "historial"))).docs.map((d) => d.data());
  const D = new window.jspdf.jsPDF(); let y = 15;
  const L = (t, s = 10) => { D.setFontSize(s); D.splitTextToSize(String(t), 185).forEach((l) => { if (y > 282) { D.addPage(); y = 15; } D.text(l, 12, y); y += s > 10 ? 7 : 5.5; }); };
  L("Reporte - Camino de progreso (" + new Date().toLocaleDateString("es") + ")", 15);
  L("POR PERSONA", 12);
  for (const [id, u] of Object.entries(users)) {
    L(`${u.nombre} | ${u.sexo} | bautismo ${u.bautismo}`, 11);
    caminoDe(u.sexo).forEach(([nm], i) => { const p = ps[id]?.[i + 1];
      L(p?.verificado ? `  ${i + 1}. ${nm}: ${fmt(p.verificadoEn)} - verificado por ${p.verificadoNombre}` : `  ${i + 1}. ${nm}: pendiente`); });
    y += 2;
  }
  L("POR ADMINISTRADOR", 12);
  const ad = {};
  hs.filter((x) => x.accion === "marcó").forEach((x) => { const a = (ad[x.porNombre] ??= { n: 0, ult: null }); a.n++; if (!a.ult || x.en.toMillis() > a.ult.toMillis()) a.ult = x.en; });
  Object.entries(ad).forEach(([n, a]) => L(`${n}: ${a.n} pasos verificados, ultima actividad ${fmt(a.ult)}`));
  D.save("reporte-camino-de-progreso.pdf");
}
