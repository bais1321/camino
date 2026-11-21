import { db, auth } from "./config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, collectionGroup, doc, onSnapshot, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy, limit }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { caminoDe, esc, hito, waLink, msgPaso, msgCorreccion, msgHito } from "./data.js";

let busq = "", C = null, users = {}, pasos = {}, started = null, pUid = null, uU = null, pU = null;
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
  C.app.oninput = (e) => { if (e.target.id === "bus") { busq = e.target.value; document.getElementById("lst").innerHTML = filas(); } };
  if (p === "u") return vPersona();
  if (p === "historial" && gen()) return vHistorial();
  vLista();
}

const filas = () => {
  const q = busq.toLowerCase();
  const l = Object.entries(users).filter(([, u]) => (u.nombre || "").toLowerCase().includes(q)).sort((x, y) => (x[1].nombre || "").localeCompare(y[1].nombre || ""));
  return l.map(([id, u]) => { const t = caminoDe(u.sexo).length, a = u.avance || 0;
    return `<button class="prow" onclick="location.hash='#/admin/u/${id}'"><span class="avatar">${esc((u.nombre || "?")[0])}</span><span class="pinfo"><b>${esc(u.nombre)}</b><span class="mini"><i style="width:${Math.round((a / t) * 100)}%"></i></span></span><span class="cnt">${a}/${t}</span></button>`; }).join("") || '<div class="card">Sin resultados.</div>';
};

function vLista() {
  const us = Object.values(users), hitos = us.map((u) => [u, hito(u.bautismo)]).filter((x) => x[1]);
  const comp = us.filter((u) => (u.avance || 0) >= caminoDe(u.sexo).length).length;
  let h = `<header><h1>Panel</h1><span class="badge">${gen() ? "General" : "Administrador"}</span></header>
  <div class="stats"><div class="stat"><b>${us.length}</b><span>Participantes</span></div><div class="stat"><b>${comp}</b><span>Completaron</span></div><div class="stat"><b>${hitos.length}</b><span>Hitos hoy</span></div></div>`;
  if (hitos.length) h += `<div class="card fiesta"><span class="bounce">🎉</span><b>Hitos de hoy</b>${hitos.map(([u, m]) =>
    `<a class="btn wa" target="_blank" href="${waLink(u.whatsapp, msgHito(u, m))}">Felicitar a ${esc(u.nombre)} (${m} ${m === 1 ? "mes" : "meses"})</a>`).join("")}</div>`;
  h += `<input id="bus" placeholder="🔍 Buscar participante" value="${esc(busq)}" style="margin:6px 0 8px"><div id="lst">${filas()}</div>`;
  if (gen()) h += `<div class="acts"><button class="btn sec" onclick="location.hash='#/admin/historial'">📋 Historial</button><button class="btn sec" data-a="pdf">📄 Reporte PDF</button></div>`;
  h += `<button class="btn red" data-a="out">Cerrar sesión</button>`;
  C.app.innerHTML = h;
}

function vPersona() {
  const u = users[uid()];
  if (!u) return (C.app.innerHTML = head("Participante") + '<div class="card">Cargando…</div>');
  const def = caminoDe(u.sexo), g = gen(), a = cuenta();
  let h = head("Participante") + `<div class="card"><span class="avatar big">${esc((u.nombre || "?")[0])}</span><h2 style="margin:10px 0 4px">${esc(u.nombre)}</h2>
  <div class="hint">${esc(u.email)}<br>WhatsApp ${esc(u.whatsapp)}</div>
  <div class="chips"><span class="chip">${esc(u.sexo)}</span><span class="chip">Bautismo ${esc(u.bautismo)}</span><span class="chip">Hijos: ${esc(u.hijos)}</span></div>
  <div class="bar" style="margin-top:14px"><i style="width:${Math.round((a / def.length) * 100)}%"></i></div><div class="hint" style="margin-top:6px">${a} de ${def.length} pasos verificados</div></div>`;
  def.forEach(([nm, campos], i) => {
    const n = i + 1, p = pasos[n] || {}, prev = n === 1 || pasos[n - 1]?.verificado;
    h += `<div class="tl ${p.verificado ? "ok" : prev ? "open" : ""}"><span class="tl-dot">${p.verificado ? "✓" : n}</span><div class="tl-body"><b>${esc(nm)}</b><br>`;
    if (p.verificado) {
      h += `<span class="hint">Verificado ${fmt(p.verificadoEn)} por ${esc(p.verificadoNombre)}</span><br>`;
      h += p.datos ? campos.map(([k, l]) => `${esc(l)}: <b>${esc(p.datos[k] || "")}</b><br>`).join("") : '<span class="hint">La persona aún no llena los datos.</span>';
      h += `<a class="btn wa" target="_blank" href="${waLink(u.whatsapp, msgPaso(u, n))}">Enviar mensaje por WhatsApp</a>`;
      if (g) h += `<button class="btn sec" data-a="editar" data-n="${n}">Editar datos</button><button class="btn red" data-a="quitar" data-n="${n}">Quitar check</button>`;
    } else {
      if (p.quitadoEn) h += `<span class="hint">Check quitado por ${esc(p.quitadoNombre)} el ${fmt(p.quitadoEn)}</span><a class="btn wa" target="_blank" href="${waLink(u.whatsapp, msgCorreccion(u, n))}">Avisar por WhatsApp</a>`;
      h += prev ? `<button class="btn" data-a="marcar" data-n="${n}">Marcar paso cumplido</button>` : '<span class="hint">🔒 Falta verificar el paso anterior</span>';
    }
    h += "</div></div>";
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
  const D = new window.jspdf.jsPDF(), G = [31, 111, 92], GOLD = [242, 182, 50], INK = [21, 48, 42], MUT = [106, 127, 120];
  const fill = (c) => D.setFillColor(...c), ink = (c) => D.setTextColor(...c);
  const font = (st, sz) => { D.setFont("helvetica", st); D.setFontSize(sz); };
  const us = Object.entries(users), tot = (u) => caminoDe(u.sexo).length;
  const ver = (id) => Object.values(ps[id] || {}).filter((p) => p.verificado).length;

  // Portada / encabezado
  fill(G); D.rect(0, 0, 210, 34, "F"); fill(GOLD); D.rect(0, 34, 210, 1.8, "F");
  ink([255, 255, 255]); font("bold", 22); D.text("Reporte de progreso", 14, 17);
  font("normal", 10); D.text("Camino de progreso  |  Generado el " + new Date().toLocaleDateString("es"), 14, 26);
  const comp = us.filter(([id, u]) => ver(id) >= tot(u)).length, suma = us.reduce((s, [id]) => s + ver(id), 0);
  [[us.length, "Participantes"], [suma, "Pasos verificados"], [comp, "Completaron su camino"]].forEach(([n, t], i) => {
    const x = 14 + i * 62; fill([244, 247, 245]); D.roundedRect(x, 44, 58, 24, 3, 3, "F");
    ink(G); font("bold", 20); D.text(String(n), x + 6, 57); ink(MUT); font("normal", 8.5); D.text(t, x + 6, 63.5);
  });

  let y = 82;
  const titulo = (t) => { if (y > 262) { D.addPage(); y = 20; } fill(GOLD); D.rect(14, y - 5, 2.5, 7, "F"); ink(INK); font("bold", 13); D.text(t, 19, y); y += 9; };

  // Por persona
  titulo("Por persona");
  for (const [id, u] of us) {
    const pasosU = caminoDe(u.sexo), h = 20 + pasosU.length * 5.6, a = ver(id);
    if (y + h > 282) { D.addPage(); y = 20; }
    fill([244, 247, 245]); D.roundedRect(14, y, 182, h, 3, 3, "F");
    ink(INK); font("bold", 11.5); D.text(String(u.nombre || ""), 19, y + 8);
    ink(MUT); font("normal", 8.5); D.text(`${u.sexo}  |  Bautismo: ${u.bautismo}`, 19, y + 13.5);
    fill([221, 232, 227]); D.roundedRect(130, y + 6, 60, 3.2, 1.6, 1.6, "F");
    if (a) { fill(G); D.roundedRect(130, y + 6, Math.max(3.2, (60 * a) / pasosU.length), 3.2, 1.6, 1.6, "F"); }
    ink(G); font("bold", 8.5); D.text(`${a} de ${pasosU.length} pasos`, 190, y + 13.5, { align: "right" });
    pasosU.forEach(([nm], i) => {
      const p = ps[id]?.[i + 1], yy = y + 21 + i * 5.6;
      fill(p?.verificado ? G : [190, 200, 196]); D.circle(21, yy - 1, 1.5, "F");
      ink(p?.verificado ? INK : MUT); font("normal", 8.5); D.text(`${i + 1}. ${D.splitTextToSize(nm, 105)[0]}`, 25, yy);
      D.text(p?.verificado ? `${fmt(p.verificadoEn)}  |  ${p.verificadoNombre || ""}` : "Pendiente", 190, yy, { align: "right" });
    });
    y += h + 5;
  }

  // Por administrador
  y += 3; titulo("Por administrador");
  const ad = {};
  hs.forEach((x) => { const a = (ad[x.porNombre || "?"] ??= { "marcó": 0, "quitó": 0, "editó": 0, ult: null });
    if (a[x.accion] !== undefined) a[x.accion]++;
    if (x.en?.toMillis && (!a.ult || x.en.toMillis() > a.ult.toMillis())) a.ult = x.en; });
  fill(G); D.roundedRect(14, y, 182, 8, 2, 2, "F"); ink([255, 255, 255]); font("bold", 8.5);
  D.text("Administrador", 19, y + 5.5); D.text("Verificó", 100, y + 5.5); D.text("Quitó", 124, y + 5.5); D.text("Editó", 144, y + 5.5); D.text("Última actividad", 190, y + 5.5, { align: "right" });
  y += 8;
  Object.entries(ad).forEach(([n, a], i) => {
    if (y > 275) { D.addPage(); y = 20; }
    if (i % 2 === 0) { fill([244, 247, 245]); D.rect(14, y, 182, 8, "F"); }
    ink(INK); font("bold", 9); D.text(n, 19, y + 5.5); font("normal", 9);
    D.text(String(a["marcó"]), 100, y + 5.5); D.text(String(a["quitó"]), 124, y + 5.5); D.text(String(a["editó"]), 144, y + 5.5); D.text(fmt(a.ult) || "-", 190, y + 5.5, { align: "right" });
    y += 8;
  });

  // Pie de página
  const N = D.getNumberOfPages();
  for (let i = 1; i <= N; i++) { D.setPage(i); ink(MUT); font("normal", 8); D.text(`Camino de progreso  |  Página ${i} de ${N}`, 105, 291, { align: "center" }); }
  D.save(`reporte-camino-${new Date().toISOString().slice(0, 10)}.pdf`);
}
