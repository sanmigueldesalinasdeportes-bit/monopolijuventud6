// API pública: configuración, comprobación de código y envío de la jugada.
import {
  codigos, votos, codigosObligatorios, json, error, leerJSON,
  normalizarCodigo, validarReparto, nuevoId, IDS,
} from "../lib/comun.mjs";

export const config = { path: ["/api/config", "/api/codigo", "/api/votar"] };

async function estadoCodigo(codigo) {
  if (!codigo) return { estado: "invalido" };
  const res = await codigos().getWithMetadata(codigo, { type: "json" });
  if (!res || !res.data) return { estado: "invalido" };
  return { estado: res.data.usado ? "usado" : "libre", datos: res.data, etag: res.etag };
}

const MENSAJES = {
  invalido: "Ese código no existe. Revisa que esté bien escrito.",
  usado: "Ese código ya se ha usado para enviar una jugada.",
};

export default async (req) => {
  const ruta = new URL(req.url).pathname;

  if (ruta === "/api/config") {
    if (req.method !== "GET") return error(405, "metodo", "Método no permitido.");
    return json({ ok: true, codigos: codigosObligatorios(), categorias: IDS });
  }

  if (req.method !== "POST") return error(405, "metodo", "Método no permitido.");
  const cuerpo = await leerJSON(req);
  if (!cuerpo) return error(400, "formato", "No se ha podido leer la petición.");

  try {
    if (ruta === "/api/codigo") {
      if (!codigosObligatorios()) return json({ ok: true, estado: "libre" });
      const { estado } = await estadoCodigo(normalizarCodigo(cuerpo.codigo));
      if (estado !== "libre") return error(estado === "usado" ? 409 : 404, estado, MENSAJES[estado]);
      return json({ ok: true, estado });
    }

    // /api/votar
    const v = validarReparto(cuerpo.reparto);
    if (!v.ok) return error(400, "reparto", v.mensaje);

    if (codigosObligatorios()) {
      const codigo = normalizarCodigo(cuerpo.codigo);
      const est = await estadoCodigo(codigo);
      if (est.estado !== "libre") return error(est.estado === "usado" ? 409 : 404, est.estado, MENSAJES[est.estado]);
      // Marca el código como usado con escritura condicional (si el código cambió
      // entre la lectura y la escritura, otra jugada lo ha usado primero).
      const r = await codigos().setJSON(
        codigo,
        { ...est.datos, usado: true, usadoEn: new Date().toISOString().slice(0, 10) },
        est.etag ? { onlyIfMatch: est.etag } : undefined
      );
      if (r && r.modified === false) return error(409, "usado", MENSAJES.usado);
    }

    // La jugada se guarda con un id aleatorio: no se enlaza con el código ni
    // se guardan IP, nombre ni dispositivo. Solo la fecha (día) del envío.
    await votos().setJSON(`v/${nuevoId()}`, {
      reparto: v.reparto,
      fecha: new Date().toISOString().slice(0, 10),
    });
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return error(500, "servidor", "No hemos podido guardar tu jugada. Inténtalo de nuevo en un momento.");
  }
};
