import { useState, useEffect, useRef } from "react";
import api from "../../../../shared/services/api";
import { useToast } from "../../../../shared/contexts/ToastContext";
import { useConfirm } from "../../../../shared/contexts/ConfirmContext";
import { IconStar, IconTrash, IconUpload, IconPlay } from "./icons";

const ID_HOME = 1;
const POSICION_DEFECTO = "50% 25%";

// "Contenido del inicio" — panel de Catálogo admin para subir/cambiar las
// fotos grandes del hero y el video que se intercala en el catálogo público,
// sin tocar código. Reutiliza la misma infraestructura de imágenes que ya
// usan los productos (tabla "Imagenes" en Cloudinary), solo con
// tipo_referencia="Home" / "HomeVideo" en vez de "Producto".
export default function InicioContenido() {
  const showToast = useToast();
  const confirmar = useConfirm();

  const [fotos, setFotos]           = useState([]);
  const [video, setVideo]           = useState(null);
  const [fotoVideo, setFotoVideo]   = useState(null);
  const [cargando, setCargando]     = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [subiendoFotoVideo, setSubiendoFotoVideo] = useState(false);
  // Foto que se está ajustando en la vista previa grande de abajo — arranca
  // en la principal (la que de verdad se ve en el catálogo) para que la
  // vista previa muestre algo relevante apenas se carga el panel.
  const [fotoEditandoId, setFotoEditandoId] = useState(null);

  const inputFotos = useRef(null);
  const inputVideo = useRef(null);
  const inputFotoVideo = useRef(null);
  const previewRef = useRef(null);
  const arrastrandoRef = useRef(false);
  const posicionArrastreRef = useRef(POSICION_DEFECTO);

  const cargar = async () => {
    setCargando(true);
    try {
      const [fotosRes, videoRes, fotoVideoRes] = await Promise.all([
        api.get(`/imagenes?tipo=Home&id=${ID_HOME}`),
        api.get(`/imagenes?tipo=HomeVideo&id=${ID_HOME}`),
        api.get(`/imagenes?tipo=HomeVideoFoto&id=${ID_HOME}`),
      ]);
      setFotos(fotosRes.data || []);
      setVideo(videoRes.data?.[0] || null);
      setFotoVideo(fotoVideoRes.data?.[0] || null);
    } catch {
      showToast("error", "No se pudo cargar el contenido del inicio.");
    } finally {
      setCargando(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(); }, []);

  // Si la foto que se estaba editando se elimina (o todavía no hay ninguna
  // seleccionada), cae de nuevo a la principal.
  useEffect(() => {
    if (fotos.length === 0) { setFotoEditandoId(null); return; }
    if (!fotos.some((f) => f.id_imagen === fotoEditandoId)) {
      setFotoEditandoId((fotos.find((f) => f.es_principal) || fotos[0]).id_imagen);
    }
  }, [fotos, fotoEditandoId]);

  const fotoEditando = fotos.find((f) => f.id_imagen === fotoEditandoId) || null;

  const subirFotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSubiendoFoto(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("imagenes", f));
      fd.append("tipo_referencia", "Home");
      fd.append("id_referencia", ID_HOME);
      await api.post("/imagenes", fd, { headers: { "Content-Type": "multipart/form-data" } });
      showToast("exito", "Foto del inicio agregada.");
      cargar();
    } catch (err) {
      showToast("error", err.response?.data?.message || "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
      if (inputFotos.current) inputFotos.current.value = "";
    }
  };

  // ── Encuadre de la foto (qué parte se ve al recortarla en el hero) ──────
  // Se arrastra directamente sobre la vista previa grande de abajo, que usa
  // las MISMAS proporciones que el hero real — lo que se ve acá es lo que se
  // va a ver en el catálogo público, sin tener que salir a comprobarlo.
  const posicionDesdeEvento = (e) => {
    const rect = previewRef.current.getBoundingClientRect();
    const punto = e.touches ? e.touches[0] : e;
    const x = Math.round(((punto.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((punto.clientY - rect.top) / rect.height) * 100);
    return `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`;
  };

  const moverFoco = (e) => {
    if (!fotoEditandoId) return;
    const posicion_foco = posicionDesdeEvento(e);
    posicionArrastreRef.current = posicion_foco;
    setFotos((prev) => prev.map((f) => f.id_imagen === fotoEditandoId ? { ...f, posicion_foco } : f));
  };

  const iniciarArrastre = (e) => {
    if (!fotoEditandoId) return;
    e.preventDefault();
    arrastrandoRef.current = true;
    moverFoco(e);
  };

  useEffect(() => {
    const mover = (e) => { if (arrastrandoRef.current) moverFoco(e); };
    const soltar = async () => {
      if (!arrastrandoRef.current) return;
      arrastrandoRef.current = false;
      try {
        await api.patch(`/imagenes/${fotoEditandoId}/posicion`, { posicion_foco: posicionArrastreRef.current });
      } catch {
        showToast("error", "No se pudo guardar el encuadre.");
      }
    };
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
    window.addEventListener("touchmove", mover, { passive: false });
    window.addEventListener("touchend", soltar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("touchend", soltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoEditandoId]);

  const marcarPrincipal = async (id_imagen) => {
    try {
      await api.patch(`/imagenes/${id_imagen}/principal`);
      cargar();
    } catch {
      showToast("error", "No se pudo marcar como principal.");
    }
  };

  const eliminarFoto = async (id_imagen) => {
    const ok = await confirmar({ title: "Eliminar foto", message: "¿Eliminar esta foto del inicio?", confirmLabel: "Sí, eliminar" });
    if (!ok) return;
    try {
      await api.delete(`/imagenes/${id_imagen}`);
      cargar();
    } catch {
      showToast("error", "No se pudo eliminar la foto.");
    }
  };

  const subirVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoVideo(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      await api.post("/imagenes/video", fd, { headers: { "Content-Type": "multipart/form-data" } });
      showToast("exito", "Video del inicio actualizado.");
      cargar();
    } catch (err) {
      showToast("error", err.response?.data?.message || "No se pudo subir el video.");
    } finally {
      setSubiendoVideo(false);
      if (inputVideo.current) inputVideo.current.value = "";
    }
  };

  const eliminarVideo = async () => {
    if (!video) return;
    const ok = await confirmar({ title: "Eliminar video", message: "¿Eliminar el video del inicio?", confirmLabel: "Sí, eliminar" });
    if (!ok) return;
    try {
      await api.delete(`/imagenes/${video.id_imagen}`);
      cargar();
    } catch {
      showToast("error", "No se pudo eliminar el video.");
    }
  };

  // Foto que acompaña al video en el catálogo público — para que un video
  // vertical no quede solo/flotando en medio de una franja vacía.
  const subirFotoVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoFotoVideo(true);
    try {
      const fd = new FormData();
      fd.append("imagen", file);
      fd.append("id_referencia", ID_HOME);
      await api.post("/imagenes/video-foto", fd, { headers: { "Content-Type": "multipart/form-data" } });
      showToast("exito", "Foto del video actualizada.");
      cargar();
    } catch (err) {
      showToast("error", err.response?.data?.message || "No se pudo subir la foto.");
    } finally {
      setSubiendoFotoVideo(false);
      if (inputFotoVideo.current) inputFotoVideo.current.value = "";
    }
  };

  const eliminarFotoVideo = async () => {
    if (!fotoVideo) return;
    const ok = await confirmar({ title: "Eliminar foto", message: "¿Eliminar la foto que acompaña al video?", confirmLabel: "Sí, eliminar" });
    if (!ok) return;
    try {
      await api.delete(`/imagenes/${fotoVideo.id_imagen}`);
      cargar();
    } catch {
      showToast("error", "No se pudo eliminar la foto.");
    }
  };

  if (cargando) return null;

  return (
    <section className="catadmin-inicio">
      <div className="catadmin-inicio-head">
        <h2>Contenido del inicio</h2>
        <p>Las fotos grandes del hero y el video que aparece en el catálogo público se administran acá.</p>
      </div>

      <div className="catadmin-inicio-grid">
        {/* ── Fotos del hero ── */}
        <div className="catadmin-inicio-card">
          <h3>Fotos del hero</h3>
          <p className="catadmin-inicio-hint">
            La marcada con <IconStar /> es la que se muestra de fondo. Formatos JPG, PNG, WEBP o GIF.
          </p>

          <div className="catadmin-inicio-fotos">
            {fotos.map((f) => (
              <div
                key={f.id_imagen}
                className={`catadmin-inicio-foto${f.es_principal ? " es-principal" : ""}${f.id_imagen === fotoEditandoId ? " seleccionada" : ""}`}
                onClick={() => setFotoEditandoId(f.id_imagen)}
                title="Clic para ajustar el encuadre en la vista previa de abajo"
              >
                <img src={f.url} alt="" style={{ objectPosition: f.posicion_foco || POSICION_DEFECTO }} />
                <div className="catadmin-inicio-foto-acciones">
                  <button
                    type="button"
                    title={f.es_principal ? "Ya es la principal" : "Marcar como principal"}
                    disabled={f.es_principal}
                    onClick={(e) => { e.stopPropagation(); marcarPrincipal(f.id_imagen); }}
                  >
                    <IconStar />
                  </button>
                  <button type="button" title="Eliminar" onClick={(e) => { e.stopPropagation(); eliminarFoto(f.id_imagen); }}>
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="catadmin-inicio-agregar"
              onClick={() => inputFotos.current?.click()}
              disabled={subiendoFoto}
            >
              <IconUpload />
              <span>{subiendoFoto ? "Subiendo..." : "Agregar foto"}</span>
            </button>
            <input
              ref={inputFotos}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={subirFotos}
            />
          </div>

          {/* ── Vista previa en vivo: mismas proporciones que el hero real.
              Arrastrar acá ajusta el encuadre sin tener que ir al catálogo
              público a comprobar cómo queda. ── */}
          {fotoEditando && (
            <div className="catadmin-inicio-preview-wrap">
              <p className="catadmin-inicio-hint">
                Vista previa real — arrastra sobre la foto para elegir qué parte se ve.
              </p>
              <div
                ref={previewRef}
                className="catadmin-inicio-preview"
                style={{
                  backgroundImage: `url(${fotoEditando.url})`,
                  backgroundPosition: fotoEditando.posicion_foco || POSICION_DEFECTO,
                }}
                onMouseDown={iniciarArrastre}
                onTouchStart={iniciarArrastre}
              >
                <span
                  className="catadmin-inicio-preview-punto"
                  style={(() => {
                    const [x, y] = (fotoEditando.posicion_foco || POSICION_DEFECTO).split(" ").map((n) => parseFloat(n));
                    return { left: `${Number.isFinite(x) ? x : 50}%`, top: `${Number.isFinite(y) ? y : 25}%` };
                  })()}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Video ── */}
        <div className="catadmin-inicio-card">
          <h3>Video del catálogo</h3>
          <p className="catadmin-inicio-hint">
            Se muestra después del 6º producto en el catálogo público. Formatos MP4, WEBM o MOV, máx. 30&nbsp;MB.
            Un video vertical se ve solo en medio de una franja vacía — agrégale una foto al lado para llenar ese espacio.
          </p>

          <div className="catadmin-inicio-video-foto-row">
            <div className="catadmin-inicio-video-foto-col">
              {video ? (
                <div className="catadmin-inicio-video">
                  <video src={video.url} controls preload="metadata" />
                  <div className="catadmin-inicio-video-acciones">
                    <button type="button" onClick={() => inputVideo.current?.click()} disabled={subiendoVideo}>
                      <IconUpload /> {subiendoVideo ? "Subiendo..." : "Reemplazar"}
                    </button>
                    <button type="button" className="catadmin-inicio-video-eliminar" onClick={eliminarVideo}>
                      <IconTrash /> Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="catadmin-inicio-agregar catadmin-inicio-agregar-video"
                  onClick={() => inputVideo.current?.click()}
                  disabled={subiendoVideo}
                >
                  <IconPlay />
                  <span>{subiendoVideo ? "Subiendo..." : "Subir video"}</span>
                </button>
              )}
              <input
                ref={inputVideo}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                hidden
                onChange={subirVideo}
              />
            </div>

            <div className="catadmin-inicio-video-foto-col">
              {fotoVideo ? (
                <div className="catadmin-inicio-video">
                  <img src={fotoVideo.url} alt="" />
                  <div className="catadmin-inicio-video-acciones">
                    <button type="button" onClick={() => inputFotoVideo.current?.click()} disabled={subiendoFotoVideo}>
                      <IconUpload /> {subiendoFotoVideo ? "Subiendo..." : "Reemplazar"}
                    </button>
                    <button type="button" className="catadmin-inicio-video-eliminar" onClick={eliminarFotoVideo}>
                      <IconTrash /> Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="catadmin-inicio-agregar catadmin-inicio-agregar-video"
                  onClick={() => inputFotoVideo.current?.click()}
                  disabled={subiendoFotoVideo}
                >
                  <IconUpload />
                  <span>{subiendoFotoVideo ? "Subiendo..." : "Agregar foto al lado"}</span>
                </button>
              )}
              <input
                ref={inputFotoVideo}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={subirFotoVideo}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
