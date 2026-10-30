import { useEffect, useState } from 'react';
import api from './api';

// Os ficheiros enviados já não são públicos: são lidos por /api/files com o
// token da sessão e mostrados a partir de um blob local.

/** Aceita "/uploads/feedback/x.png" (formato guardado) ou categoria + nome. */
export function protectedFilePath(categoryOrPath, filename) {
  if (filename) return `/files/${categoryOrPath}/${encodeURIComponent(filename)}`;
  const match = /^\/?uploads\/([a-z]+)\/(.+)$/.exec(categoryOrPath || '');
  return match ? `/files/${match[1]}/${encodeURIComponent(match[2])}` : null;
}

async function fetchBlobUrl(path) {
  const { data } = await api.get(path, { responseType: 'blob' });
  return URL.createObjectURL(data);
}

/** Abre o ficheiro num separador novo. A janela abre antes do pedido para não ser bloqueada. */
export async function openProtectedFile(path) {
  const tab = window.open('', '_blank');
  try {
    const url = await fetchBlobUrl(path);
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    if (tab) tab.close();
    throw error;
  }
}

/** URL local (blob:) de um ficheiro protegido, para usar em <img src>. */
export function useProtectedFileUrl(path) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!path) return undefined;
    let objectUrl = null;
    let cancelled = false;
    fetchBlobUrl(path)
      .then((value) => {
        objectUrl = value;
        if (cancelled) URL.revokeObjectURL(value);
        else setUrl(value);
      })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return url;
}
