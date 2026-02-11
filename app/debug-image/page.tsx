"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

export default function DebugImagePage() {
    const [imageStatus, setImageStatus] = useState<Record<string, string>>({});
    const [windowInfo, setWindowInfo] = useState<string>("");

    const images = [
        "/logo.png",
        "/lp-bg.jpg",
        "/icon.svg"
    ];

    useEffect(() => {
        setWindowInfo(`Origin: ${window.location.origin}\nPathname: ${window.location.pathname}`);
    }, []);

    const checkImage = async (src: string) => {
        try {
            const res = await fetch(src, { method: "HEAD" });
            setImageStatus(prev => ({ ...prev, [src]: `${res.status} ${res.statusText} (Type: ${res.headers.get("content-type")})` }));
        } catch (e: any) {
            setImageStatus(prev => ({ ...prev, [src]: `Error: ${e.message}` }));
        }
    };

    useEffect(() => {
        images.forEach(checkImage);
    }, []);

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-2xl font-bold mb-4">Image Debugger</h1>

            <div className="mb-6 p-4 bg-slate-100 rounded">
                <h2 className="font-bold mb-2">Environment Info</h2>
                <pre className="whitespace-pre-wrap">{windowInfo}</pre>
            </div>

            <div className="space-y-8">
                {images.map(src => (
                    <div key={src} className="border p-4 rounded">
                        <h3 className="font-bold text-lg mb-2">{src}</h3>

                        <div className="mb-2">
                            <span className="font-bold">Fetch Status: </span>
                            <span className={imageStatus[src]?.startsWith("200") ? "text-green-600" : "text-red-600"}>
                                {imageStatus[src] || "Checking..."}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-bold mb-1">img tag:</h4>
                                <div className="border border-dashed p-2 bg-slate-50">
                                    <img
                                        src={src}
                                        alt={`img tag: ${src}`}
                                        className="max-w-[100px] h-auto border"
                                        onError={(e) => (e.currentTarget.style.border = "2px solid red")}
                                    />
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold mb-1">next/image:</h4>
                                <div className="border border-dashed p-2 bg-slate-50 relative h-[100px] w-[100px]">
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
                            <h4 className="font-bold mb-1">Direct Link:</h4>
                            <a href={src} target="_blank" className="text-blue-500 underline" rel="noreferrer">Open {src}</a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
