"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface UseVoiceInputReturn {
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  error: string | null
  enableAICorrection: boolean
  setEnableAICorrection: (enabled: boolean) => void
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [enableAICorrection, setEnableAICorrection] = useState(false)
  const enableAICorrectionRef = useRef(enableAICorrection)
  enableAICorrectionRef.current = enableAICorrection

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // アンマウント時・停止時にマイクを確実に解放する
  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      stopAllTracks()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [stopAllTracks])

  const startListening = useCallback(async () => {
    setError(null)
    setTranscript("")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stopAllTracks()
        if (chunksRef.current.length === 0) {
          setError("音声が記録されていません。もう一度お試しください。")
          setIsListening(false)
          return
        }
        const blob = new Blob(chunksRef.current, { type: mimeType })
        try {
          const formData = new FormData()
          formData.append("audio", blob, "audio.webm")
          const res = await fetch("/api/stt", {
            method: "POST",
            body: formData,
          })
          const data = await res.json()
          if (!res.ok) {
            setError(data?.error || "音声の認識に失敗しました")
            return
          }
          let text = data.text && typeof data.text === "string" ? data.text.trim() : ""
          if (text && enableAICorrectionRef.current) {
            try {
              const correctRes = await fetch("/api/voice-correct", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
              })
              const correctData = await correctRes.json()
              if (correctRes.ok && correctData?.text && typeof correctData.text === "string") {
                text = correctData.text.trim()
              }
            } catch {
              // 補正失敗時は元のテキストを使用
            }
          }
          if (text) setTranscript(text)
        } catch (e) {
          console.error("STT request error:", e)
          setError("音声の送信に失敗しました。ネットワークを確認してください。")
        } finally {
          setIsListening(false)
        }
      }

      recorder.onerror = () => {
        setError("録音中にエラーが発生しました")
        stopAllTracks()
        setIsListening(false)
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setIsListening(true)
    } catch (err) {
      console.error("useVoiceInput start error:", err)
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("マイクの使用が許可されていません。ブラウザの設定を確認してください。")
        } else if (err.name === "NotFoundError") {
          setError("マイクが見つかりません。")
        } else {
          setError("音声認識を開始できませんでした")
        }
      } else {
        setError("音声認識を開始できませんでした")
      }
      setIsListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      // 録音停止直後にマイクを解放し、ブラウザのマイク表示をすぐ消す
      stopAllTracks()
    }
    setIsListening(false)
  }, [stopAllTracks])

  const resetTranscript = useCallback(() => {
    setTranscript("")
  }, [])

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    error,
    enableAICorrection,
    setEnableAICorrection,
  }
}
