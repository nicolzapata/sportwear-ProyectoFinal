import { useState, useEffect, useRef } from "react";
import api from "../../../../shared/services/api";
import { useToast } from "../../../../shared/contexts/ToastContext";
import { useConfirm } from "../../../../shared/contexts/ConfirmContext";
import { IconStar, IconTrash, IconUpload, IconPlay } from "./icons";

const ID_HOME = 1;

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
  const [cargando, setCargando]     = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoVideo, setSubiendoVideo] = useState(false);

  const inputFotos = useRef(null);
  const inputVideo = useRef(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const [fotosRes, videoRes] = await Promise.all([
        api.get(`/imagenes?tipo=Home&id=${ID_HOME}`),
        api.get(`/imagenes?tipo=HomeVideo&id=${ID_HOME}`),
      ]);
      setFotos(fotosRes.data || []);
      setVideo(videoRes.data?.[0] || null);
    } catch {
      showToast("error", "No se pudo cargar el contenido del inicio.");
    } finally {
      setCargando(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(); }, []);

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
              <div key={f.id_imagen} className={`catadmin-inicio-foto${f.es_principal ? " es-principal" : ""}`}>
                <img src={f.url} alt="" />
                <div className="catadmin-inicio-foto-acciones">
                  <button
                    type="button"
                    title={f.es_principal ? "Ya es la principal" : "Marcar como principal"}
                    disabled={f.es_principal}
                    onClick={() => marcarPrincipal(f.id_imagen)}
                  >
                    <IconStar />
                  </button>
                  <button type="button" title="Eliminar" onClick={() => eliminarFoto(f.id_imagen)}>
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
        </div>

        {/* ── Video ── */}
        <div className="catadmin-inicio-card">
          <h3>Video del catálogo</h3>
          <p className="catadmin-inicio-hint">
            Se muestra después del 6º producto en el catálogo público. Formatos MP4, WEBM o MOV, máx. 30&nbsp;MB.
          </p>

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
      </div>
    </section>
  );
}
