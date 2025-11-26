"use client"

import { useState } from "react"
import { MessageSquare, Check } from "lucide-react"

const steps = [
  { number: 1, title: "対話で課題発見", active: true },
  { number: 2, title: "データ分析", active: false },
  { number: 3, title: "戦略立案", active: false },
  { number: 4, title: "実行支援", active: false },
  { number: 5, title: "成果検証", active: false },
]

const features = ["自然な会話形式で課題をヒアリング", "複雑に絡み合った問題を整理", "見えていなかった潜在課題も発見"]

export function ProcessSection() {
  const [activeStep, setActiveStep] = useState(1)

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-blue-600 text-sm mb-4">
            <span className="text-blue-500">✦</span>
            <span>5-Step AI Consulting Process</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            対話から成果まで
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
              AIが伴走する経営支援
            </span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mt-6">
            課題発見から戦略立案、実行支援まで、人間のコンサルタントを超える分析力で、
            <br className="hidden md:block" />
            24時間休まない継続性で、あなたの経営を次のレベルへ導きます。
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className="text-sm text-gray-500">対話から始めましょう</span>
          <div className="flex items-center gap-2">
            {steps.map((step) => (
              <button
                key={step.number}
                onClick={() => setActiveStep(step.number)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step.number === activeStep
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                    : step.number < activeStep
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {step.number}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="text-sm text-blue-600 mb-2">STEP 1/5</div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">対話で課題発見</h3>
            </div>
            <p className="text-gray-600 mb-8 leading-relaxed">
              まずはAIとの対話から。経営課題や悩みを自由に話すだけで、AIが本質的な問題を特定し、優先順位を整理します。
            </p>

            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img src="/humanoid-ai-robot-with-blue-glowing-elements-havin.jpg" alt="AI対話イメージ" className="w-full h-auto" />
            </div>
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
              <span className="text-sm text-gray-600">👤 AI対話中</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
