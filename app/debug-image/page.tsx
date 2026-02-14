"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"

export default function DebugImagePage() {
  const [imageStatus, setImageStatus] = useState<Record<string, string>>({})
  const [windowInfo, setWindowInfo] = useState<string>("")

  const images = ["/logo.png", "/lp-bg.jpg", "/icon.svg"]

  useEffect(() => {
    setWindowInfo(`Origin: ${window.location.origin}\nPathname: ${window.location.pathname}`)
  }, [])

  const checkImage = async (src: string) => {
    try {
      const res = await fetch(src, { method: "HEAD" })
      setImageStatus((prev) => ({
        ...prev,
        [src]: `${res.status} ${res.statusText} (Type: ${res.headers.get("content-type")})`,
      }))
    } catch (e: any) {
      setImageStatus((prev) => ({ ...prev, [src]: `Error: ${e.message}` }))
    }
  }

  useEffect(() => {
    images.forEach(checkImage)
  }, [])

  return (
    <div className="p-8 font-mono text-sm">
      <h1 className="mb-4 text-2xl font-bold">Image Debugger</h1>

      <div className="mb-6 rounded bg-slate-100 p-4">
        <h2 className="mb-2 font-bold">Environment Info</h2>
        <pre className="whitespace-pre-wrap">{windowInfo}</pre>
      </div>

      <div className="space-y-8">
        {images.map((src) => (
          <div key={src} className="rounded border p-4">
            <h3 className="mb-2 text-lg font-bold">{src}</h3>

            <div className="mb-2">
              <span className="font-bold">Fetch Status: </span>
              <span
                className={imageStatus[src]?.startsWith("200") ? "text-green-600" : "text-red-600"}
              >
                {imageStatus[src] || "Checking..."}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="mb-1 font-bold">img tag:</h4>
                <div className="border border-dashed bg-slate-50 p-2">
                  <img
                    src={src}
                    alt={`img tag: ${src}`}
                    className="h-auto max-w-[100px] border"
                    onError={(e) => (e.currentTarget.style.border = "2px solid red")}
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-1 font-bold">next/image:</h4>
                <div className="relative h-[100px] w-[100px] border border-dashed bg-slate-50 p-2">
                  <Image
                    src={src}
                    alt={`next/image: ${src}`}
                    fill
                    className="object-contain"
                    onError={() => console.error(`Failed to load ${src} via next/image`)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2">
              <h4 className="mb-1 font-bold">Direct Link:</h4>
              <a href={src} target="_blank" className="text-blue-500 underline" rel="noreferrer">
                Open {src}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
