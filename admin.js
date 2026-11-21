import { db, auth } from "./config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, collectionGroup, doc, onSnapshot, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy, limit }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { caminoDe, esc, hito, waLink, msgPaso, msgCorreccion, msgHito } from "./data.js";

let hU = null, acts = [], busq = "", C = null, users = {}, pasos = {}, started = null, pUid = null, uU = null, pU = null;
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
    uU && uU(); hU && hU(); hU = null; acts = []; started = S.user.uid; users = {};
    if (S.admin === "general") hU = onSnapshot(query(collection(db, "historial"), orderBy("en", "desc"), limit(6)), (qs) => { acts = qs.docs.map((d) => d.data()); draw(); }, () => {});
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

const txt = (x) => x.accion === "marcó" ? `${x.persona}: Paso ${x.paso} verificado por ${x.porNombre}`
  : x.accion === "quitó" ? `${x.persona}: Paso ${x.paso} quitado por ${x.porNombre}`
  : x.accion === "editó" ? `${x.persona}: Paso ${x.paso} editado por ${x.porNombre}` : `${x.porNombre} eliminó a ${x.persona}`;
const lineaTiempo = (arr) => `<div class="act">${arr.map((x) => `<div class="ai"><span class="ad"></span><div>${esc(txt(x))}<br><span class="hint">${fmtH(x.en)}</span></div></div>`).join("")}</div>`;

const filas = () => {
  const q = busq.toLowerCase();
  const l = Object.entries(users).filter(([, u]) => (u.nombre || "").toLowerCase().includes(q)).sort((x, y) => (x[1].nombre || "").localeCompare(y[1].nombre || ""));
  return l.map(([id, u]) => { const t = caminoDe(u.sexo).length, a = u.avance || 0;
    return `<button class="prow" onclick="location.hash='#/admin/u/${id}'"><span class="avatar">${esc((u.nombre || "?")[0])}</span><span class="pinfo"><b>${esc(u.nombre)}</b><span class="hint">${u.sexo === "hombre" ? "Hombre" : "Mujer"} | ${a} de ${t} pasos</span><span class="mini"><i style="width:${Math.round((a / t) * 100)}%"></i></span></span><span class="cnt">${Math.round((a / t) * 100)}%</span></button>`; }).join("") || '<div class="card">Sin resultados.</div>';
};

function vLista() {
  const us = Object.values(users), hitos = us.map((u) => [u, hito(u.bautismo)]).filter((x) => x[1]);
  const comp = us.filter((u) => (u.avance || 0) >= caminoDe(u.sexo).length).length;
  const tot = us.reduce((s, u) => s + caminoDe(u.sexo).length, 0), suma = us.reduce((s, u) => s + (u.avance || 0), 0), pct = tot ? Math.round((suma / tot) * 100) : 0;
  let h = `<header><h1>Dashboard</h1><span class="badge">${gen() ? "General" : "Administrador"}</span></header>
  <div class="kpis">
    <div class="kpi"><span>Participantes activos</span><b>${us.length}</b><span class="mini"><i style="width:${us.length ? Math.round((comp / us.length) * 100) : 0}%"></i></span></div>
    <div class="kpi gold"><span>Hitos hoy</span><b>${hitos.length}</b><span>Completaron: ${comp}</span></div>
    <div class="kpi wide"><div><span>Productividad general</span><b>${pct}%</b></div><div class="ring" style="--p:${pct}"><em>${pct}%</em></div></div>
  </div>`;
  if (hitos.length) h += `<div class="card fiesta"><span class="bounce">🎉</span><b>Hitos de hoy</b>${hitos.map(([u, m]) =>
    `<a class="btn wa" target="_blank" href="${waLink(u.whatsapp, msgHito(u, m))}">Felicitar a ${esc(u.nombre)} (${m} ${m === 1 ? "mes" : "meses"})</a>`).join("")}</div>`;
  h += `<h3 class="sec">Progreso de participantes</h3><input id="bus" placeholder="🔍 Buscar participante" value="${esc(busq)}" style="margin:0 0 8px"><div id="lst">${filas()}</div>`;
  if (gen() && acts.length) h += `<h3 class="sec">Actividad reciente</h3><div class="card" style="text-align:left">${lineaTiempo(acts.slice(0, 5))}</div>`;
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
  const arr = qs.docs.map((d) => d.data());
  C.app.innerHTML = head("Historial") + `<h3 class="sec">Actividad reciente</h3><p class="hint" style="margin-top:-8px">Verificaciones y cambios hechos por los administradores</p>
  <div class="card" style="text-align:left">${arr.length ? lineaTiempo(arr) : "Aún no hay actividad."}</div>`;
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
  const hs = (await getDocs(collection(db, "historial"))).docs.map((d) => d.data()).sort((a, b) => (b.en?.toMillis?.() || 0) - (a.en?.toMillis?.() || 0));
  const D = new window.jspdf.jsPDF({ unit: "mm", format: "letter" }), W = 215.9, H = 279.4, M = 14, CW = W - 2 * M;
  const G = [19, 75, 58], GOLD = [212, 180, 106], TAN = [230, 218, 178], INK = [21, 40, 34], MUT = [106, 122, 116], BG = [238, 241, 244], WH = [255, 255, 255];
  const fill = (c) => D.setFillColor(...c), ink = (c) => D.setTextColor(...c);
  const font = (st, sz) => { D.setFont("helvetica", st); D.setFontSize(sz); };
  const rr = (x, y, w, h, r, c) => { fill(c); D.roundedRect(x, y, w, h, r, r, "F"); };
  const pagina = () => {
    fill(BG); D.rect(0, 0, W, H, "F"); fill(G); D.rect(0, 0, W, 16, "F");
    D.setDrawColor(...GOLD); D.setLineWidth(0.8); D.circle(M + 4, 8, 4, "S");
    ink(GOLD); font("bold", 9); D.text("C", M + 4, 9.3, { align: "center" });
    ink(WH); font("bold", 12.5); D.text("Camino de Progreso", M + 12, 9.6);
  };
  let y = 30;
  const nueva = () => { D.addPage(); pagina(); y = 28; };
  const titulo = (t) => { if (y > H - 40) nueva(); ink(INK); font("normal", 13); D.text(t, M, y); fill(GOLD); D.rect(M, y + 2, 18, 0.9, "F"); y += 10; };
  const us = Object.entries(users), tot = (u) => caminoDe(u.sexo).length;
  const ver = (id) => Object.values(ps[id] || {}).filter((p) => p.verificado).length;
  const comp = us.filter(([id, u]) => ver(id) >= tot(u)).length, suma = us.reduce((s, [id]) => s + ver(id), 0);
  const total = us.reduce((s, [, u]) => s + tot(u), 0), pct = total ? Math.round((suma / total) * 100) : 0;

  pagina();
  ink(INK); font("bold", 18); D.text("Dashboard de Administración", M, y);
  ink(MUT); font("normal", 9); D.text("Generado el " + new Date().toLocaleDateString("es"), W - M, y, { align: "right" });
  y += 8;
  const cw = (CW - 10) / 3, ch = 34;
  rr(M, y, cw, ch, 3, G); ink(WH); font("normal", 8.5); D.text("Participantes activos", M + 5, y + 8); font("bold", 24); D.text(String(us.length), M + 5, y + 20);
  rr(M + 5, y + 26, cw - 10, 2.6, 1.3, [70, 115, 98]); if (us.length && comp) rr(M + 5, y + 26, Math.max(2.6, ((cw - 10) * comp) / us.length), 2.6, 1.3, [125, 190, 140]);
  const x2 = M + cw + 5; rr(x2, y, cw, ch, 3, GOLD); ink(WH); font("normal", 8.5); D.text("Pasos verificados", x2 + 5, y + 8); font("bold", 24); D.text(String(suma), x2 + 5, y + 20); font("normal", 8); D.text("Completaron su camino: " + comp, x2 + 5, y + 29);
  const x3 = M + 2 * (cw + 5); rr(x3, y, cw, ch, 3, G); ink(WH); font("normal", 8.5); D.text("Productividad general", x3 + 5, y + 8); font("bold", 24); D.text(pct + "%", x3 + 5, y + 22);
  const cx = x3 + cw - 15, cy = y + 19;
  D.setLineCap("round"); D.setLineWidth(1.8); D.setDrawColor(70, 115, 98); D.circle(cx, cy, 8, "S"); D.setDrawColor(125, 190, 140);
  for (let a = 0; a < pct * 3.6; a += 3) { const r1 = ((a - 90) * Math.PI) / 180, r2 = ((Math.min(a + 3.6, pct * 3.6) - 90) * Math.PI) / 180; D.line(cx + 8 * Math.cos(r1), cy + 8 * Math.sin(r1), cx + 8 * Math.cos(r2), cy + 8 * Math.sin(r2)); }
  y += ch + 14;

  titulo("Progreso de participantes");
  [...us].sort((a, b) => (a[1].nombre || "").localeCompare(b[1].nombre || "")).forEach(([id, u]) => {
    if (y + 14 > H - 14) nueva();
    const t = tot(u), a = ver(id), pc = Math.round((a / t) * 100);
    rr(M, y, CW, 12.5, 2.5, WH);
    fill(G); D.circle(M + 8, y + 6.25, 4, "F"); ink(WH); font("bold", 9); D.text(String((u.nombre || "?")[0]).toUpperCase(), M + 8, y + 7.6, { align: "center" });
    ink(INK); font("bold", 9.5); D.text(String(u.nombre || ""), M + 15, y + 5.4);
    ink(MUT); font("normal", 7.5); D.text(`${u.sexo === "hombre" ? "Hombre" : "Mujer"}  |  ${a} de ${t} pasos`, M + 15, y + 9.6);
    rr(M + 85, y + 4.4, 70, 3.6, 1.8, TAN); if (a) rr(M + 85, y + 4.4, Math.max(3.6, (70 * a) / t), 3.6, 1.8, G);
    ink(INK); font("bold", 10); D.text(pc + "%", M + CW - 5, y + 7.8, { align: "right" });
    y += 14;
  });

  y += 4; titulo("Actividad reciente");
  hs.slice(0, 12).forEach((x, i, arr) => {
    if (y + 10 > H - 14) nueva();
    if (i < arr.length - 1) { D.setDrawColor(...TAN); D.setLineWidth(0.5); D.line(M + 2, y + 2, M + 2, y + 11); }
    fill(G); D.circle(M + 2, y + 1.5, 1.6, "F");
    ink(INK); font("normal", 8.5); D.text(D.splitTextToSize(txt(x), CW - 12)[0], M + 9, y + 2.4);
    ink(MUT); font("normal", 7); D.text(fmtH(x.en), M + 9, y + 6.4); y += 10;
  });

  y += 4; titulo("Por administrador");
  const ad = {};
  hs.forEach((x) => { const a = (ad[x.porNombre || "?"] ??= { "marcó": 0, "quitó": 0, "editó": 0, ult: null });
    if (a[x.accion] !== undefined) a[x.accion]++;
    if (x.en?.toMillis && (!a.ult || x.en.toMillis() > a.ult.toMillis())) a.ult = x.en; });
  if (y + 18 > H - 14) nueva();
  rr(M, y, CW, 8, 2, G); ink(WH); font("bold", 8.5);
  D.text("Administrador", M + 5, y + 5.5); D.text("Verificó", M + 85, y + 5.5); D.text("Quitó", M + 110, y + 5.5); D.text("Editó", M + 130, y + 5.5); D.text("Última actividad", M + CW - 5, y + 5.5, { align: "right" });
  y += 9;
  Object.entries(ad).forEach(([n, a]) => {
    if (y + 9 > H - 14) nueva();
    rr(M, y, CW, 8, 2, WH); ink(INK); font("bold", 9); D.text(n, M + 5, y + 5.5); font("normal", 9);
    D.text(String(a["marcó"]), M + 85, y + 5.5); D.text(String(a["quitó"]), M + 110, y + 5.5); D.text(String(a["editó"]), M + 130, y + 5.5); D.text(fmt(a.ult) || "-", M + CW - 5, y + 5.5, { align: "right" });
    y += 9.5;
  });

  nueva(); titulo("Detalle por persona");
  for (const [id, u] of us) {
    const lista = caminoDe(u.sexo), h = 17 + lista.length * 5.4, a = ver(id);
    if (y + h > H - 14) nueva();
    rr(M, y, CW, h, 3, WH);
    ink(INK); font("bold", 10.5); D.text(String(u.nombre || ""), M + 5, y + 7);
    ink(MUT); font("normal", 8); D.text(`${u.sexo}  |  Bautismo: ${u.bautismo}`, M + 5, y + 12);
    rr(M + CW - 70, y + 4.5, 50, 3, 1.5, TAN); if (a) rr(M + CW - 70, y + 4.5, Math.max(3, (50 * a) / lista.length), 3, 1.5, G);
    ink(G); font("bold", 8); D.text(`${a}/${lista.length}`, M + CW - 5, y + 7.2, { align: "right" });
    lista.forEach(([nm], i) => {
      const p = ps[id]?.[i + 1], yy = y + 19 + i * 5.4;
      fill(p?.verificado ? G : [190, 200, 196]); D.circle(M + 7, yy - 1, 1.4, "F");
      ink(p?.verificado ? INK : MUT); font("normal", 8); D.text(`${i + 1}. ${nm}`, M + 11, yy);
      D.text(p?.verificado ? `${fmt(p.verificadoEn)}  |  ${p.verificadoNombre || ""}` : "Pendiente", M + CW - 5, yy, { align: "right" });
    });
    y += h + 4;
  }

  const N = D.getNumberOfPages();
  for (let i = 1; i <= N; i++) { D.setPage(i); ink(MUT); font("normal", 8); D.text(`Camino de Progreso  |  Página ${i} de ${N}`, W / 2, H - 7, { align: "center" }); }
  D.save(`reporte-camino-${new Date().toISOString().slice(0, 10)}.pdf`);
}
