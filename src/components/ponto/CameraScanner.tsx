import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  active: boolean
  onDecode: (rawText: string) => void
}

const REGION_ID = 'camera-scanner-region'
const CAMERA_ID_KEY = 'ponto:lastCameraId'
const DUPLICATE_COOLDOWN_MS = 4000

export default function CameraScanner({ active, onDecode }: Props) {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [cameraId, setCameraId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const onDecodeRef = useRef(onDecode)
  onDecodeRef.current = onDecode

  const lastSeenRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (!active) return
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices)
        const saved = localStorage.getItem(CAMERA_ID_KEY)
        const preferred = devices.find((d) => d.id === saved) ?? devices[devices.length - 1] ?? devices[0]
        if (preferred) setCameraId(preferred.id)
      })
      .catch(() => setError('Não foi possível acessar as câmeras do dispositivo.'))
  }, [active])

  useEffect(() => {
    if (!active || !cameraId) return

    const scanner = new Html5Qrcode(REGION_ID, { verbose: false })
    let cancelled = false
    setError(null)

    scanner
      .start(
        cameraId,
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          const now = Date.now()
          const last = lastSeenRef.current.get(decodedText) ?? 0
          if (now - last < DUPLICATE_COOLDOWN_MS) return
          lastSeenRef.current.set(decodedText, now)
          onDecodeRef.current(decodedText)
        },
        () => {
          /* leitura não encontrada neste frame — ignorar */
        },
      )
      .then(() => {
        if (!cancelled) setRunning(true)
      })
      .catch((err) => {
        if (!cancelled) setError(`Não foi possível iniciar a câmera: ${String(err)}`)
      })

    return () => {
      cancelled = true
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
      setRunning(false)
    }
  }, [active, cameraId])

  function handleCameraChange(id: string) {
    setCameraId(id)
    localStorage.setItem(CAMERA_ID_KEY, id)
  }

  if (!active) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className={`h-2 w-2 rounded-full ${running ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {running ? 'Câmera ativa — modo contínuo (bipe várias pessoas)' : 'Iniciando câmera...'}
        </div>

        {cameras.length > 1 && (
          <select
            value={cameraId ?? ''}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || c.id}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mx-auto max-w-md overflow-hidden rounded-xl border-4 border-slate-800 bg-black">
        <div id={REGION_ID} className="[&_video]:w-full" />
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <p className="text-center text-xs text-slate-400">
        Aponte a câmera para o LMS de cada colaborador. A leitura continua ativa — é possível bipar
        várias pessoas em sequência sem reiniciar.
      </p>
    </div>
  )
}
