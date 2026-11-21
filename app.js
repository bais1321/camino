import { auth, db } from "./config.js";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { caminoDe, esc, edadEn, mensajeFinal, hito } from "./data.js";

const $app = document.getElementById("app");
const S = { user: null, perfil: null, admin: null, pasos: {}, listo: false };
let unsub = null;

const go = (r) => (location.hash = r);
const $ = (id) => document.getElementById(id);
const head = (titulo, atras = true) =>
  `<header>${atras ? '<button class="back" onclick="history.back()">← Atrás</button>' : ""}<h1>${esc(titulo)}</h1></header>`;
const traducir = (e) => ({
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/email-already-in-use": "Ese correo ya está registrado.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/invalid-email": "Correo no válido."
}[e.code] || "Ocurrió un error: " + e.code);

// ---------- Sesión y datos en tiempo real ----------
onAuthStateChanged(auth, async (u) => {
  if (unsub) unsub();
  S.user = u; S.perfil = null; S.admin = null; S.pasos = {};
  if (u) {
    const [p, a] = await Promise.all([getDoc(doc(db, "users", u.uid)), getDoc(doc(db, "admins", u.uid))]);
    S.perfil = p.exists() ? p.data() : null;
    S.admin = a.exists() ? a.data().rol || "limitado" : null;
    S.adminNombre = a.exists() ? a.data().nombre : null;
    unsub = onSnapshot(collection(db, "users", u.uid, "pasos"), (qs) => {
      S.pasos = {};
      qs.forEach((d) => (S.pasos[d.id] = d.data()));
      render();
    });
  }
  S.listo = true;
  render();
});
window.addEventListener("hashchange", render);

// ---------- Router ----------
async function render() {
  if (!S.listo) return;
  const r = location.hash.replace("#/", "") || "";
  if (!S.user) return r === "registro" ? vRegistro() : r === "recuperar" ? vRecuperar() : vLogin();
  if (!S.perfil && !S.admin) return vSinPerfil();
  if (r.startsWith("admin") && S.admin) {
    const m = await import("./admin.js"); // parte 2
    return m.renderAdmin($app, S, r, go);
  }
  if (r === "perfil") return vPerfil();
  if (r.startsWith("paso/")) return vPaso(+r.split("/")[1]);
  if (S.admin && r === "") return go("#/admin");
  return vCamino();
}

// ---------- Login / registro / recuperar ----------
function vLogin() {
  $app.innerHTML = `${head("Camino de progreso", false)}
  <label>Correo</label><input id="em" type="email" autocomplete="email">
  <label>Contraseña</label><input id="pw" type="password" autocomplete="current-password">
  <div class="err" id="err"></div>
  <button class="btn" id="ok">Entrar</button>
  <button class="btn sec" onclick="location.hash='#/registro'">Crear cuenta</button>
  <button class="link" onclick="location.hash='#/recuperar'">Olvidé mi contraseña</button>`;
  $("ok").onclick = async () => {
    try { await signInWithEmailAndPassword(auth, $("em").value.trim(), $("pw").value); go("#/"); }
    catch (e) { $("err").textContent = traducir(e); }
  };
}

function vRecuperar() {
  $app.innerHTML = `${head("Recuperar contraseña")}
  <label>Tu correo</label><input id="em" type="email">
  <div class="err" id="err"></div>
  <button class="btn" id="ok">Enviar enlace</button>`;
  $("ok").onclick = async () => {
    try { await sendPasswordResetEmail(auth, $("em").value.trim()); $("err").style.color = "#2e7d32"; $("err").textContent = "Listo: revisa tu correo (y la carpeta de spam)."; }
    catch (e) { $("err").textContent = traducir(e); }
  };
}

function vRegistro() {
  $app.innerHTML = `${head("Crear cuenta")}
  <label>Nombre</label><input id="nom">
  <label>Correo</label><input id="em" type="email">
  <label>Contraseña (mínimo 6)</label><input id="pw" type="password">
  <label>WhatsApp (con código de país, ej. 50212345678)</label><input id="wa" type="tel">
  <label>Sexo</label><select id="sx"><option value="">Elige…</option><option value="hombre">Hombre</option><option value="mujer">Mujer</option></select>
  <label>Fecha de nacimiento</label><input id="nac" type="date">
  <label>Fecha de bautismo</label><input id="bau" type="date">
  <label>¿Tienes hijos?</label><select id="hi"><option value="">Elige…</option><option value="si">Sí</option><option value="no">No</option></select>
  <label><input type="checkbox" id="con">Acepto que se guarden mis datos personales y recibir mensajes de WhatsApp.</label>
  <label><input type="checkbox" id="tut">Si soy menor de 18 años, un padre o tutor lo autoriza.</label>
  <div class="err" id="err"></div>
  <button class="btn" id="ok">Registrarme</button>`;
  $("ok").onclick = async () => {
    const v = (i) => $(i).value.trim();
    const d = { nombre: v("nom"), email: v("em"), whatsapp: v("wa"), sexo: v("sx"), nacimiento: v("nac"), bautismo: v("bau"), hijos: v("hi") };
    const falta = Object.values(d).some((x) => !x) || !v("pw");
    if (falta) return ($("err").textContent = "Completa todos los campos.");
    if (!$("con").checked) return ($("err").textContent = "Debes aceptar el uso de tus datos.");
    if (edadEn(d.nacimiento, new Date()) < 18 && !$("tut").checked) return ($("err").textContent = "Un menor necesita permiso de un padre o tutor.");
    if (d.bautismo < d.nacimiento) return ($("err").textContent = "La fecha de bautismo no puede ser anterior al nacimiento.");
    try {
      const c = await createUserWithEmailAndPassword(auth, d.email, v("pw"));
      await setDoc(doc(db, "users", c.user.uid), { ...d, consentimiento: true, creado: serverTimestamp() });
      S.perfil = d; go("#/"); render();
    } catch (e) { $("err").textContent = traducir(e); }
  };
}

function vSinPerfil() {
  $app.innerHTML = `${head("Camino de progreso", false)}<div class="card">Tu cuenta no tiene perfil de participante.</div>
  <button class="btn sec" id="out">Cerrar sesión</button>`;
  $("out").onclick = () => signOut(auth);
}

// ---------- Camino ----------
function vCamino() {
  const p = S.perfil, pasos = caminoDe(p.sexo);
  const ver = (n) => S.pasos[n]?.verificado;
  const todos = pasos.every((_, i) => ver(i + 1));
  const m = hito(p.bautismo);
  let h = head("Mi camino", false);
  if (m) h += `<div class="card">🎉 ¡Hoy cumples ${m} ${m === 1 ? "mes" : "meses"} desde tu bautismo, ${esc(p.nombre)}! ¡Felicidades!</div>`;
  if (todos) h += `<div class="card">${esc(mensajeFinal(p))}</div>`;
  h += pasos.map(([nombre], i) => {
    const n = i + 1, ok = ver(n), lleno = S.pasos[n]?.llenado;
    return `<button class="step ${ok ? (lleno ? "done" : "") : "locked"}" ${ok ? `onclick="location.hash='#/paso/${n}'"` : "disabled"}>
      <span class="n">${ok ? (lleno ? "✓" : n) : "🔒"}</span><span>${esc(nombre)}</span></button>`;
  }).join("");
  h += `<button class="btn sec" onclick="location.hash='#/perfil'">Mi perfil</button>`;
  $app.innerHTML = h;
}

// ---------- Paso ----------
function vPaso(n) {
  const p = S.perfil, def = caminoDe(p.sexo)[n - 1];
  if (!def || !S.pasos[n]?.verificado) return go("#/");
  const datos = S.pasos[n].datos || {};
  const pre = (k) => datos[k] ?? (n === 1 && k === "fecha" ? p.bautismo : "");
  $app.innerHTML = `${head(`Paso ${n}`)}<h2>${esc(def[0])}</h2>
  ${def[1].map(([k, l, t]) => `<label>${esc(l)}</label><input id="f_${k}" type="${t}" value="${esc(pre(k))}">`).join("")}
  <div class="err" id="err"></div>
  <button class="btn" id="ok">Guardar</button>`;
  $("ok").onclick = async () => {
    const nuevo = {};
    for (const [k] of def[1]) { nuevo[k] = $("f_" + k).value.trim(); if (!nuevo[k]) return ($("err").textContent = "Completa todos los campos."); }
    if (n === 2 && nuevo.fecha < p.bautismo) return ($("err").textContent = "La confirmación no puede ser anterior al bautismo.");
    try {
      await setDoc(doc(db, "users", S.user.uid, "pasos", String(n)), { datos: nuevo, llenado: true }, { merge: true });
      if (n === 1) await updateDoc(doc(db, "users", S.user.uid), { bautismo: nuevo.fecha });
      if (n === 1) S.perfil.bautismo = nuevo.fecha;
      history.back();
    } catch (e) { $("err").textContent = "No se pudo guardar: " + e.code; }
  };
}

// ---------- Perfil ----------
function vPerfil() {
  const p = S.perfil;
  $app.innerHTML = `${head("Mi perfil")}
  <label>Nombre</label><input id="nom" value="${esc(p.nombre)}">
  <label>WhatsApp</label><input id="wa" type="tel" value="${esc(p.whatsapp)}">
  <label>¿Tienes hijos?</label><select id="hi"><option value="si" ${p.hijos === "si" ? "selected" : ""}>Sí</option><option value="no" ${p.hijos === "no" ? "selected" : ""}>No</option></select>
  <p class="hint">Correo: ${esc(p.email)}. Para cambiar otros datos, habla con un administrador.</p>
  <div class="err" id="err"></div>
  <button class="btn" id="ok">Guardar cambios</button>
  <button class="btn red" id="out">Cerrar sesión</button>`;
  $("ok").onclick = async () => {
    const d = { nombre: $("nom").value.trim(), whatsapp: $("wa").value.trim(), hijos: $("hi").value };
    try { await updateDoc(doc(db, "users", S.user.uid), d); Object.assign(S.perfil, d); $("err").style.color = "#2e7d32"; $("err").textContent = "Guardado."; }
    catch (e) { $("err").textContent = "No se pudo guardar: " + e.code; }
  };
  $("out").onclick = () => signOut(auth).then(() => go("#/"));
}
