'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Home, MessageSquare, CreditCard, FileText, Settings, HelpCircle,
  Menu, X, Bell, Search, Plus, Camera, Upload, Send, User, Building2,
  TrendingUp, Sparkles, CheckCircle, AlertTriangle, Info, Loader2,
  Mail, Phone, MapPin, Globe, ChevronRight, ChevronDown, Eye, EyeOff,
  Download, ArrowRight, LogOut, Users, Briefcase, Clock, Shield,
  Database, Zap, Target, Check, ArrowLeft
} from 'lucide-react'
import { checkPasswordStrength, isValidEmail, isValidPassword } from '@/lib/auth-utils'

// ============================================
// TYPES
// ============================================
interface UserProfile {
  id: string
  name: string
  nameKana?: string
  email: string
  phone?: string
  mobile?: string
  position?: string
  department?: string
  avatarUrl?: string
  plan: 'free' | 'standard' | 'enterprise'
}

interface Company {
  id: string
  name: string
  nameKana?: string
  corporateNumber?: string
  postalCode?: string
  prefecture?: string
  city?: string
  address?: string
  building?: string
  phone?: string
  fax?: string
  email?: string
  website?: string
  industry?: string
  employeeCount?: string
  annualRevenue?: string
  capital?: string
  establishedDate?: string
  representativeName?: string
  businessDescription?: string
  characteristics?: string
  currentChallenges?: string[]
  uploadedDocuments?: Array<{ id: string; name: string; url: string; uploadedAt: string }>
}

interface BusinessCard {
  id: string
  personName: string
  personNameKana?: string
  position?: string
  department?: string
  email?: string
  phone?: string
  mobile?: string
  fax?: string
  postalCode?: string
  address?: string
  website?: string
  companyName?: string
  companyId?: string
  imageUrl?: string
  notes?: string
  createdAt: string
}

interface ConsultingSession {
  id: string
  title: string
  status: 'active' | 'completed'
  messageCount: number
  createdAt: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// ============================================
// TOAST COMPONENT
// ============================================
const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.95 }}
    className={`flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-xl text-white ${
      type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
      type === 'warning' ? 'bg-yellow-500' : 'bg-gray-900'
    }`}
  >
    {type === 'success' && <CheckCircle size={20} />}
    {type === 'error' && <AlertTriangle size={20} />}
    {type === 'warning' && <AlertTriangle size={20} />}
    {type === 'info' && <Info size={20} />}
    <span>{message}</span>
    <button onClick={onClose} className="ml-2 hover:opacity-70">
      <X size={16} />
    </button>
  </motion.div>
)

// ============================================
// MODAL COMPONENT
// ============================================
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = '', 
  footer 
}: { 
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: string
  footer?: React.ReactNode
}) => {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-white rounded-2xl w-full overflow-hidden flex flex-col max-h-[90vh] ${
          size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">{footer}</div>}
      </motion.div>
    </div>
  )
}

// ============================================
// PASSWORD INPUT WITH VISIBILITY TOGGLE
// ============================================
const PasswordInput = ({
  value,
  onChange,
  placeholder,
  showStrength = false,
  className = ''
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  showStrength?: boolean
  className?: string
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const strength = showStrength ? checkPasswordStrength(value) : null

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      
      {showStrength && value && (
        <div className="space-y-2">
          {/* Strength bar */}
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < strength!.score ? strength!.color : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          {/* Strength label */}
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${
              strength!.score <= 1 ? 'text-red-500' :
              strength!.score === 2 ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              {strength!.label}
            </span>
          </div>
          
          {/* Feedback */}
          {strength!.feedback.length > 0 && (
            <ul className="text-xs text-gray-500 space-y-1">
              {strength!.feedback.map((f, i) => (
                <li key={i} className="flex items-center gap-1">
                  <Info size={12} /> {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// LOGIN FORM
// ============================================
const LoginForm = ({
  onLogin,
  onSwitchToSignup,
  onBack,
  showToast
}: {
  onLogin: () => void
  onSwitchToSignup: () => void
  onBack: () => void
  showToast: (message: string, type: string) => void
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: typeof errors = {}
    if (!email) {
      newErrors.email = 'メールアドレスを入力してください'
    } else if (!isValidEmail(email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
    }
    if (!password) {
      newErrors.password = 'パスワードを入力してください'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    
    // Simulate login (replace with actual Supabase auth)
    setTimeout(() => {
      setIsLoading(false)
      showToast('ログインしました', 'success')
      onLogin()
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>トップページに戻る</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white">
              <Brain size={28} />
            </div>
            <span className="text-xl font-bold gradient-text">AI Consulting</span>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">ログイン</h1>
          <p className="text-gray-500 text-center mb-8">アカウントにログインしてください</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.com"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                パスワード
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <span className="text-gray-600">ログイン状態を保持</span>
              </label>
              <button type="button" className="text-blue-600 hover:text-blue-700">
                パスワードを忘れた方
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-500">アカウントをお持ちでない方は</span>
            <button
              onClick={onSwitchToSignup}
              className="text-blue-600 hover:text-blue-700 font-medium ml-1"
            >
              新規登録
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// SIGNUP FORM
// ============================================
const SignupForm = ({
  onSignup,
  onSwitchToLogin,
  onBack,
  showToast
}: {
  onSignup: () => void
  onSwitchToLogin: () => void
  onBack: () => void
  showToast: (message: string, type: string) => void
}) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    nameKana: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    companyName: '',
    companyNameKana: '',
    position: '',
    department: '',
    industry: '',
    annualRevenue: '',
    employeeCount: '',
    website: '',
    characteristics: '',
    agreeTerms: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showCardScanModal, setShowCardScanModal] = useState(false)
  const [scanStep, setScanStep] = useState(1)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<Partial<BusinessCard & { companyIndustry?: string; companyEmployeeCount?: string }> | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ id: string; name: string; url: string; uploadedAt: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  
  const industries = [
    '情報通信業', '製造業', '卸売業・小売業', 'サービス業', '建設業',
    '不動産業', '金融業・保険業', '運輸業・郵便業', '医療・福祉', '教育・学習支援業', 'その他'
  ]
  
  const employeeRanges = [
    '1-9名', '10-29名', '30-49名', '50-99名', '100-299名', '300-499名', '500-999名', '1000名以上'
  ]
  
  const revenueRanges = [
    '1億円未満', '1-5億円', '5-10億円', '10-50億円', '50-100億円', '100-500億円', '500億円以上'
  ]
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string)
        setScanStep(2)
        processOCR()
      }
      reader.readAsDataURL(file)
    }
  }
  
  const processOCR = () => {
    setIsProcessing(true)
    setTimeout(() => {
      const mockData = {
        personName: '田中 一郎',
        personNameKana: 'タナカ イチロウ',
        position: '営業部長',
        department: '営業本部',
        companyName: '株式会社テックソリューションズ',
        email: 'tanaka@techsolutions.co.jp',
        phone: '03-1234-5678',
        mobile: '090-1234-5678',
        postalCode: '150-0001',
        address: '東京都渋谷区恵比寿1-1-1',
        website: 'https://techsolutions.co.jp'
      }
      setOcrResult(mockData)
      setIsProcessing(false)
      setScanStep(3)
    }, 2000)
  }
  
  const applyOCRData = () => {
    if (ocrResult) {
      setFormData(prev => ({
        ...prev,
        name: ocrResult.personName || prev.name,
        nameKana: ocrResult.personNameKana || prev.nameKana,
        position: ocrResult.position || prev.position,
        department: ocrResult.department || prev.department,
        companyName: ocrResult.companyName || prev.companyName,
        email: ocrResult.email || prev.email,
        phone: ocrResult.phone || prev.phone,
        website: ocrResult.website || prev.website,
      }))
      setShowCardScanModal(false)
      setScanStep(1)
      setUploadedImage(null)
      setOcrResult(null)
      showToast('名刺情報を入力欄に反映しました', 'success')
    }
  }
  
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (event) => {
          const newDoc = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            url: event.target?.result as string,
            uploadedAt: new Date().toISOString()
          }
          setUploadedDocuments(prev => [...prev, newDoc])
          showToast(`${file.name}をアップロードしました`, 'success')
        }
        reader.readAsDataURL(file)
      })
    }
  }
  
  const removeDocument = (id: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== id))
    showToast('資料を削除しました', 'info')
  }

  const updateForm = (key: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }))
    }
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '氏名を入力してください'
    }
    if (!formData.email) {
      newErrors.email = 'メールアドレスを入力してください'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
    }
    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください'
    } else {
      const pwCheck = isValidPassword(formData.password)
      if (!pwCheck.valid) {
        newErrors.password = pwCheck.message
      }
    }
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = 'パスワードが一致しません'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = '会社名を入力してください'
    }
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = '利用規約に同意してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep2()) return

    setIsLoading(true)
    
    // Simulate signup (replace with actual Supabase auth)
    setTimeout(() => {
      setIsLoading(false)
      showToast('アカウントを作成しました', 'success')
      onSignup()
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>トップページに戻る</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white">
              <Brain size={28} />
            </div>
            <span className="text-xl font-bold gradient-text">AI Consulting</span>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">アカウント作成</h1>
          
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 1 ? <Check size={16} /> : '1'}
            </div>
            <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 2 ? <Check size={16} /> : '2'}
            </div>
            <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    氏名 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCardScanModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Camera size={14} /> 名刺から読み取る
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="山田 太郎"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    氏名（カナ）
                  </label>
                  <input
                    type="text"
                    value={formData.nameKana}
                    onChange={(e) => updateForm('nameKana', e.target.value)}
                    placeholder="ヤマダ タロウ"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    placeholder="03-1234-5678"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    placeholder="example@company.com"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    パスワード <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    value={formData.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    placeholder="8文字以上、大小英数字を含む"
                    showStrength
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    パスワード（確認） <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    value={formData.passwordConfirm}
                    onChange={(e) => updateForm('passwordConfirm', e.target.value)}
                    placeholder="パスワードを再入力"
                  />
                  {errors.passwordConfirm && <p className="mt-1 text-sm text-red-500">{errors.passwordConfirm}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  次へ <ArrowRight size={18} />
                </button>
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    会社名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateForm('companyName', e.target.value)}
                    placeholder="株式会社サンプル"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                      errors.companyName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    同じ会社の方がすでに登録済みの場合、会社情報が共有されます
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    会社名（カナ）
                  </label>
                  <input
                    type="text"
                    value={formData.companyNameKana}
                    onChange={(e) => updateForm('companyNameKana', e.target.value)}
                    placeholder="カブシキガイシャサンプル"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    役職
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => updateForm('position', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="">選択してください</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    部署
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => updateForm('department', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="">選択してください</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    戻る
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    次へ <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Info size={16} />
                    <span className="font-semibold text-sm">会社情報について</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    これらの情報はAIコンサルティングの精度向上に役立ちます。任意項目ですので、後から追加・修正も可能です。
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      業種
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => updateForm('industry', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="">選択してください</option>
                      {industries.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      従業員数
                    </label>
                    <select
                      value={formData.employeeCount}
                      onChange={(e) => updateForm('employeeCount', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="">選択してください</option>
                      {employeeRanges.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      売上規模
                    </label>
                    <select
                      value={formData.annualRevenue}
                      onChange={(e) => updateForm('annualRevenue', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="">選択してください</option>
                      {revenueRanges.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      ホームページ
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => updateForm('website', e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    特徴・強み
                  </label>
                  <textarea
                    value={formData.characteristics}
                    onChange={(e) => updateForm('characteristics', e.target.value)}
                    placeholder="会社の特徴、強み、独自性などを記入してください"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    その他資料（カタログ、課題判断に役立つ資料など）
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      ref={documentInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center text-center">
                      <Upload size={24} className="text-gray-400 mb-2" />
                      <button
                        type="button"
                        onClick={() => documentInputRef.current?.click()}
                        className="text-sm text-blue-600 hover:text-blue-700 mb-2"
                      >
                        ファイルを選択
                      </button>
                      <p className="text-xs text-gray-500">
                        PDF, Word, Excel, PowerPoint, 画像ファイルに対応
                      </p>
                    </div>
                    {uploadedDocuments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadedDocuments.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText size={16} className="text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocument(doc.id)}
                              className="p-1 text-red-500 hover:text-red-700 flex-shrink-0"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.agreeTerms}
                      onChange={(e) => updateForm('agreeTerms', e.target.checked)}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-600">
                      <a href="#" className="text-blue-600 hover:underline">利用規約</a>
                      および
                      <a href="#" className="text-blue-600 hover:underline">プライバシーポリシー</a>
                      に同意します
                    </span>
                  </label>
                  {errors.agreeTerms && <p className="mt-1 text-sm text-red-500">{errors.agreeTerms}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-3.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    戻る
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        作成中...
                      </>
                    ) : (
                      'アカウント作成'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-500">すでにアカウントをお持ちの方は</span>
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-medium ml-1"
            >
              ログイン
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Business Card Scan Modal */}
      <Modal
        isOpen={showCardScanModal}
        onClose={() => {
          setShowCardScanModal(false)
          setScanStep(1)
          setUploadedImage(null)
          setOcrResult(null)
        }}
        title="名刺スキャン"
        size="lg"
        footer={
          scanStep === 3 ? (
            <>
              <button 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                onClick={() => { setScanStep(1); setUploadedImage(null); setOcrResult(null) }}
              >
                やり直す
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                onClick={applyOCRData}
              >
                <CheckCircle size={18} /> 入力欄に反映
              </button>
            </>
          ) : null
        }
      >
        {scanStep === 1 && (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">
              クリックまたはドラッグ＆ドロップで名刺画像をアップロード
            </p>
            <p className="text-sm text-gray-400">JPEG, PNG形式に対応（最大10MB）</p>
            <div className="mt-5">
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 inline-flex items-center gap-2 hover:bg-gray-50">
                <Camera size={18} /> カメラで撮影
              </button>
            </div>
          </div>
        )}
        
        {scanStep === 2 && isProcessing && (
          <div className="text-center py-12">
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
            <div className="font-semibold mb-2">OCR処理中...</div>
            <p className="text-gray-500">名刺から情報を抽出しています</p>
          </div>
        )}
        
        {scanStep === 3 && ocrResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-center min-h-[200px]">
              {uploadedImage && (
                <img src={uploadedImage} alt="名刺" className="max-w-full max-h-[280px] rounded-lg shadow" />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">抽出情報</h4>
              </div>
              
              <div className="space-y-3 text-sm">
                {ocrResult.personName && (
                  <div>
                    <span className="text-gray-500">氏名:</span> {ocrResult.personName}
                  </div>
                )}
                {ocrResult.position && (
                  <div>
                    <span className="text-gray-500">役職:</span> {ocrResult.position}
                  </div>
                )}
                {ocrResult.department && (
                  <div>
                    <span className="text-gray-500">部署:</span> {ocrResult.department}
                  </div>
                )}
                {ocrResult.companyName && (
                  <div>
                    <span className="text-gray-500">会社名:</span> {ocrResult.companyName}
                  </div>
                )}
                {ocrResult.email && (
                  <div>
                    <span className="text-gray-500">メール:</span> {ocrResult.email}
                  </div>
                )}
                {ocrResult.phone && (
                  <div>
                    <span className="text-gray-500">電話:</span> {ocrResult.phone}
                  </div>
                )}
                {ocrResult.website && (
                  <div>
                    <span className="text-gray-500">Webサイト:</span> {ocrResult.website}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ============================================
// SIDEBAR
// ============================================
const Sidebar = ({
  currentPage,
  setCurrentPage,
  isOpen,
  onClose,
  onLogout
}: {
  currentPage: string
  setCurrentPage: (page: string) => void
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
}) => {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'ダッシュボード' },
    { id: 'consulting', icon: MessageSquare, label: 'AIコンサルティング', badge: 'AI' },
    { id: 'business-cards', icon: CreditCard, label: '名刺・連絡先管理' },
    { id: 'reports', icon: FileText, label: 'レポート' },
  ]
  
  const settingsItems = [
    { id: 'settings', icon: Settings, label: '設定' },
    { id: 'help', icon: HelpCircle, label: 'ヘルプ' },
  ]
  
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden" 
          onClick={onClose} 
        />
      )}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200
        flex flex-col h-screen
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white">
              <Brain size={24} />
            </div>
            <span className="text-lg font-bold gradient-text">AI Consulting</span>
          </div>
        </div>
        
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="mb-6">
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              メインメニュー
            </div>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); onClose() }}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1
                  transition-colors text-left
                  ${currentPage === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    currentPage === item.id ? 'bg-white/20' : 'bg-red-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              その他
            </div>
            {settingsItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); onClose() }}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1
                  transition-colors text-left
                  ${currentPage === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">ログアウト</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// ============================================
// HEADER
// ============================================
const Header = ({
  title,
  onMenuClick,
  user,
  onLogoClick,
  onBackToLP
}: {
  title: string
  onMenuClick: () => void
  user: UserProfile
  onLogoClick: () => void
  onBackToLP: () => void
}) => (
  <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-16 flex items-center justify-between sticky top-0 z-30">
    <div className="flex items-center gap-4">
      <button 
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        onClick={onMenuClick}
      >
        <Menu size={24} />
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
    
    <div className="flex items-center gap-3">
      {/* Back to LP button */}
      <button 
        onClick={onBackToLP}
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors hidden sm:flex items-center gap-1"
      >
        <Home size={16} />
        <span>トップページ</span>
      </button>
      
      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hidden sm:flex">
        <Search size={20} />
      </button>
      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative">
        <Bell size={20} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
      </button>
      
      {/* User profile */}
      <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
        <div 
          className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
          onClick={onLogoClick}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
            {user.name?.[0] || 'U'}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-gray-800">{user.name}</div>
            <div className="text-xs text-gray-500">{user.plan === 'free' ? 'Free' : user.plan === 'standard' ? 'Standard' : 'Enterprise'}</div>
          </div>
        </div>
      </div>
    </div>
  </header>
)

// ============================================
// DASHBOARD PAGE
// ============================================
const DashboardPage = ({
  setCurrentPage,
  user,
  company,
  businessCards,
  sessions
}: {
  setCurrentPage: (page: string) => void
  user: UserProfile
  company: Company | null
  businessCards: BusinessCard[]
  sessions: ConsultingSession[]
}) => {
  const stats = [
    { label: '今月のセッション', value: sessions.length, icon: MessageSquare, color: 'blue', change: '+3' },
    { label: '登録連絡先', value: businessCards.length, icon: CreditCard, color: 'green', change: '+5' },
    { label: 'レポート数', value: 2, icon: FileText, color: 'purple', change: '+1' },
    { label: 'AI分析スコア', value: '85', icon: TrendingUp, color: 'orange', change: '+8' },
  ]
  
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }
  
  return (
    <div className="p-6">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">おかえりなさい、{user.name}さん</h2>
        <p className="text-gray-500">
          {company?.name || '会社未設定'} • 今日も経営課題の解決をサポートします
        </p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                <stat.icon size={22} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <TrendingUp size={14} />
              <span>{stat.change} 今月</span>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold">クイックアクション</h3>
        </div>
        <div className="p-6 flex flex-wrap gap-3">
          <button
            onClick={() => setCurrentPage('consulting')}
            className="btn-gradient px-5 py-2.5 rounded-lg text-white font-medium flex items-center gap-2"
          >
            <Sparkles size={18} /> AIに相談する
          </button>
          <button
            onClick={() => setCurrentPage('business-cards')}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Camera size={18} /> 名刺をスキャン
          </button>
          <button
            onClick={() => setCurrentPage('reports')}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <FileText size={18} /> レポートを見る
          </button>
        </div>
      </div>
      
      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold">最近のセッション</h3>
            <button 
              onClick={() => setCurrentPage('consulting')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              すべて表示 <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">セッションがありません</p>
              </div>
            ) : (
              sessions.slice(0, 3).map(session => (
                <div key={session.id} className="py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{session.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {session.messageCount}件のメッセージ
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${
                      session.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {session.status === 'active' ? '進行中' : '完了'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Business Cards */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold">最近の連絡先</h3>
            <button 
              onClick={() => setCurrentPage('business-cards')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              すべて表示 <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-4">
            {businessCards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">連絡先がありません</p>
              </div>
            ) : (
              businessCards.slice(0, 3).map(card => (
                <div key={card.id} className="py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
                      {card.personName?.[0]}
                    </div>
                    <div>
                      <div className="font-medium">{card.personName}</div>
                      <div className="text-sm text-gray-500">
                        {card.position} • {card.companyName}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// BUSINESS CARDS PAGE
// ============================================
const BusinessCardsPage = ({
  businessCards,
  setBusinessCards,
  companies,
  setCompanies,
  user,
  showToast
}: {
  businessCards: BusinessCard[]
  setBusinessCards: React.Dispatch<React.SetStateAction<BusinessCard[]>>
  companies: Company[]
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>
  user: UserProfile
  showToast: (message: string, type: string) => void
}) => {
  const [showScanModal, setShowScanModal] = useState(false)
  const [scanStep, setScanStep] = useState(1)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<Partial<BusinessCard & { companyIndustry?: string; companyEmployeeCount?: string }> | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchingCompany, setIsSearchingCompany] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const filteredCards = businessCards.filter(c => 
    c.personName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string)
        setScanStep(2)
        processOCR()
      }
      reader.readAsDataURL(file)
    }
  }
  
  const processOCR = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setOcrResult({
        personName: '田中 一郎',
        personNameKana: 'タナカ イチロウ',
        position: '営業部長',
        department: '営業本部',
        companyName: '株式会社テックソリューションズ',
        email: 'tanaka@techsolutions.co.jp',
        phone: '03-1234-5678',
        mobile: '090-1234-5678',
        postalCode: '150-0001',
        address: '東京都渋谷区恵比寿1-1-1',
        website: 'https://techsolutions.co.jp'
      })
      setIsProcessing(false)
      setScanStep(3)
    }, 2000)
  }
  
  const searchCompanyInfo = () => {
    if (!ocrResult?.companyName) return
    setIsSearchingCompany(true)
    setTimeout(() => {
      setOcrResult(prev => ({
        ...prev,
        companyIndustry: '情報通信業',
        companyEmployeeCount: '100-299名',
      }))
      setIsSearchingCompany(false)
      showToast('会社情報を取得しました', 'success')
    }, 1500)
  }
  
  const saveBusinessCard = () => {
    if (!ocrResult) return
    
    let companyId: string | undefined = undefined
    const existingCompany = companies.find(c => 
      c.name.toLowerCase() === ocrResult.companyName?.toLowerCase()
    )
    
    if (existingCompany) {
      companyId = existingCompany.id
    } else if (ocrResult.companyName) {
      const newCompany: Company = {
        id: Date.now().toString(),
        name: ocrResult.companyName,
        industry: ocrResult.companyIndustry || '',
        employeeCount: ocrResult.companyEmployeeCount || '',
        website: ocrResult.website || '',
        address: ocrResult.address || '',
      }
      setCompanies(prev => [newCompany, ...prev])
      companyId = newCompany.id
    }
    
    const newCard: BusinessCard = {
      id: Date.now().toString(),
      personName: ocrResult.personName || '',
      personNameKana: ocrResult.personNameKana,
      position: ocrResult.position,
      department: ocrResult.department,
      email: ocrResult.email,
      phone: ocrResult.phone,
      mobile: ocrResult.mobile,
      postalCode: ocrResult.postalCode,
      address: ocrResult.address,
      website: ocrResult.website,
      companyName: ocrResult.companyName,
      companyId,
      imageUrl: uploadedImage || undefined,
      createdAt: new Date().toISOString()
    }
    setBusinessCards(prev => [newCard, ...prev])
    
    setShowScanModal(false)
    setScanStep(1)
    setUploadedImage(null)
    setOcrResult(null)
    showToast('名刺と会社情報を保存しました', 'success')
  }
  
  const resetModal = () => {
    setShowScanModal(false)
    setScanStep(1)
    setUploadedImage(null)
    setOcrResult(null)
  }
  
  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="名前・会社名で検索..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setShowScanModal(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Camera size={18} /> 名刺をスキャン
        </button>
      </div>
      
      {filteredCards.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">連絡先が登録されていません</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            名刺をスキャンして、連絡先と会社情報を自動で取得しましょう。
          </p>
          <button
            onClick={() => setShowScanModal(true)}
            className="btn-gradient px-6 py-3 rounded-lg text-white font-medium inline-flex items-center gap-2"
          >
            <Camera size={18} /> 名刺をスキャン
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map(card => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                {card.imageUrl && (
                  <img 
                    src={card.imageUrl} 
                    alt="名刺" 
                    className="w-16 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{card.personName}</div>
                  <div className="text-sm text-gray-500 truncate">
                    {card.position} • {card.department}
                  </div>
                  <div className="text-sm text-blue-600 truncate mt-1">{card.companyName}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {card.email && (
                  <div className="flex items-center gap-2 text-gray-600 truncate">
                    <Mail size={14} /> {card.email}
                  </div>
                )}
                {card.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} /> {card.phone}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Scan Modal */}
      <Modal
        isOpen={showScanModal}
        onClose={resetModal}
        title="名刺スキャン"
        size="lg"
        footer={
          scanStep === 3 ? (
            <>
              <button 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                onClick={() => { setScanStep(1); setUploadedImage(null); setOcrResult(null) }}
              >
                やり直す
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                onClick={saveBusinessCard}
              >
                <CheckCircle size={18} /> 保存する
              </button>
            </>
          ) : null
        }
      >
        {scanStep === 1 && (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">
              クリックまたはドラッグ＆ドロップで名刺画像をアップロード
            </p>
            <p className="text-sm text-gray-400">JPEG, PNG形式に対応（最大10MB）</p>
            <div className="mt-5">
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 inline-flex items-center gap-2 hover:bg-gray-50">
                <Camera size={18} /> カメラで撮影
              </button>
            </div>
          </div>
        )}
        
        {scanStep === 2 && isProcessing && (
          <div className="text-center py-12">
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
            <div className="font-semibold mb-2">OCR処理中...</div>
            <p className="text-gray-500">名刺から情報を抽出しています</p>
          </div>
        )}
        
        {scanStep === 3 && ocrResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-center min-h-[200px]">
              {uploadedImage && (
                <img src={uploadedImage} alt="名刺" className="max-w-full max-h-[280px] rounded-lg shadow" />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">抽出情報（編集可能）</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">氏名</label>
                  <input 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={ocrResult.personName || ''}
                    onChange={e => setOcrResult({ ...ocrResult, personName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">役職</label>
                  <input 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={ocrResult.position || ''}
                    onChange={e => setOcrResult({ ...ocrResult, position: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">会社名</label>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={ocrResult.companyName || ''}
                    onChange={e => setOcrResult({ ...ocrResult, companyName: e.target.value })}
                  />
                  <button 
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1 whitespace-nowrap"
                    onClick={searchCompanyInfo}
                    disabled={isSearchingCompany}
                  >
                    {isSearchingCompany ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                    検索
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">メール</label>
                  <input 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={ocrResult.email || ''}
                    onChange={e => setOcrResult({ ...ocrResult, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">電話番号</label>
                  <input 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={ocrResult.phone || ''}
                    onChange={e => setOcrResult({ ...ocrResult, phone: e.target.value })}
                  />
                </div>
              </div>
              
              {ocrResult.companyIndustry && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 mb-2">取得した会社情報</div>
                  <div className="text-sm space-y-1">
                    <div>業種: {ocrResult.companyIndustry}</div>
                    <div>従業員数: {ocrResult.companyEmployeeCount}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ============================================
// CONSULTING PAGE
// ============================================
const ConsultingPage = ({
  sessions,
  setSessions,
  user,
  showToast
}: {
  sessions: ConsultingSession[]
  setSessions: React.Dispatch<React.SetStateAction<ConsultingSession[]>>
  user: UserProfile
  showToast: (message: string, type: string) => void
}) => {
  const [selectedSession, setSelectedSession] = useState<ConsultingSession | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const startNewSession = () => {
    if (!newSessionTitle.trim()) {
      showToast('セッション名を入力してください', 'warning')
      return
    }
    
    const newSession: ConsultingSession = {
      id: Date.now().toString(),
      title: newSessionTitle,
      status: 'active',
      messageCount: 0,
      createdAt: new Date().toISOString()
    }
    setSessions(prev => [newSession, ...prev])
    setSelectedSession(newSession)
    setShowNewModal(false)
    setNewSessionTitle('')
    
    setMessages([{
      id: '1',
      role: 'assistant',
      content: `こんにちは、${user.name}さん！AI経営コンサルタントです。\n\n経営課題について、お気軽にご相談ください。\n\n以下のような内容でお手伝いできます：\n• 経営戦略の立案・見直し\n• 業務効率化・コスト削減\n• 人材育成・組織改善\n• DX推進のアドバイス\n• リスク分析と対策\n\n何からお話しましょうか？`
    }])
  }
  
  const sendMessage = () => {
    if (!inputMessage.trim()) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage
    }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'ご質問ありがとうございます。\n\nより詳しく理解させてください：\n\n1. この課題が顕在化したのはいつ頃からですか？\n2. 現在、どのような対策を講じていますか？\n3. 理想的な状態はどのようなものですか？\n\n詳細をお聞かせいただければ、より具体的なアドバイスができます。'
      }])
      setIsTyping(false)
      
      if (selectedSession) {
        setSessions(prev => prev.map(s => 
          s.id === selectedSession.id 
            ? { ...s, messageCount: s.messageCount + 2 }
            : s
        ))
      }
    }, 1500)
  }
  
  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Session List */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col flex-shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => setShowNewModal(true)}
            className="w-full btn-gradient px-4 py-2.5 rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <Plus size={18} /> 新規セッション
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              セッションがありません
            </div>
          ) : (
            sessions.map(session => (
              <button
                key={session.id}
                onClick={() => {
                  setSelectedSession(session)
                  setMessages([{
                    id: '1',
                    role: 'assistant',
                    content: `セッション「${session.title}」を再開しました。前回の続きからお話しましょう。`
                  }])
                }}
                className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedSession?.id === session.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="font-medium text-sm mb-1 truncate">{session.title}</div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{session.messageCount}件のメッセージ</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    session.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                  }`}>
                    {session.status === 'active' ? '進行中' : '完了'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
              <div>
                <div className="font-semibold">{selectedSession.title}</div>
                <div className="text-sm text-gray-500">AIコンサルタントとの対話</div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">進行中</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 mb-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-gray-200 text-gray-600' 
                      : 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={20} /> : <Brain size={20} />}
                  </div>
                  <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center">
                    <Brain size={20} />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                    <span className="animate-pulse">入力中...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="px-5 py-4 border-t border-gray-100 bg-white">
              <div className="flex gap-3 items-end">
                <textarea
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="経営課題を相談してください..."
                  rows={1}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full resize-none focus:outline-none focus:border-blue-500 max-h-32"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">AIコンサルタントに相談しましょう</h3>
              <p className="text-gray-500 mb-6">新規セッションを開始して、経営課題について相談してください</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="btn-gradient px-6 py-3 rounded-lg text-white font-medium inline-flex items-center gap-2"
              >
                <Sparkles size={18} /> 新規セッション開始
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* New Session Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="新規コンサルティングセッション"
        footer={
          <>
            <button 
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              onClick={() => setShowNewModal(false)}
            >
              キャンセル
            </button>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={startNewSession}
            >
              開始する
            </button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            セッション名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={newSessionTitle}
            onChange={e => setNewSessionTitle(e.target.value)}
            placeholder="例：売上向上戦略の検討、人材採用の改善など"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">相談したい内容を簡潔に入力してください</p>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Info size={16} className="text-blue-600" /> よく相談される内容
          </div>
          <div className="flex flex-wrap gap-2">
            {['売上向上', '業務効率化', '人材確保', 'DX推進', 'コスト削減', '新規事業'].map(topic => (
              <button 
                key={topic}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-colors"
                onClick={() => setNewSessionTitle(topic + 'について相談')}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================
// REPORTS PAGE
// ============================================
const ReportsPage = () => {
  const reports = [
    { id: '1', title: '経営診断レポート', type: 'diagnosis', status: 'published', createdAt: '2024-01-15', score: 85 },
    { id: '2', title: '月次分析レポート（2024年1月）', type: 'monthly', status: 'published', createdAt: '2024-02-01', score: 78 },
  ]
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">分析レポート</h2>
        <p className="text-gray-500">AIコンサルティングセッションから生成された分析レポート</p>
      </div>
      
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">レポートがありません</h3>
          <p className="text-gray-500">コンサルティングセッションを完了すると、自動でレポートが生成されます</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">タイトル</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">種類</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">スコア</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">作成日</th>
                  <th className="px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{report.title}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {report.type === 'diagnosis' ? '経営診断' : '月次分析'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${
                        report.score >= 80 ? 'text-green-600' : 
                        report.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {report.score}点
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs ${
                        report.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {report.status === 'published' ? '公開済み' : '下書き'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{report.createdAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                          <Eye size={16} />
                        </button>
                        <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// SETTINGS PAGE
// ============================================
const SettingsPage = ({
  user,
  setUser,
  company,
  setCompany,
  showToast
}: {
  user: UserProfile
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>
  company: Company | null
  setCompany: React.Dispatch<React.SetStateAction<Company | null>>
  showToast: (message: string, type: string) => void
}) => {
  const [activeTab, setActiveTab] = useState('profile')
  
  const industries = [
    '情報通信業', '製造業', '卸売業・小売業', 'サービス業', '建設業',
    '不動産業', '金融業・保険業', '運輸業・郵便業', '医療・福祉', '教育・学習支援業', 'その他'
  ]
  
  const employeeRanges = [
    '1-9名', '10-29名', '30-49名', '50-99名', '100-299名', '300-499名', '500-999名', '1000名以上'
  ]
  
  const revenueRanges = [
    '1億円未満', '1-5億円', '5-10億円', '10-50億円', '50-100億円', '100-500億円', '500億円以上'
  ]
  
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ id: string; name: string; url: string; uploadedAt: string }>>(
    company?.uploadedDocuments || []
  )
  const documentInputRef = useRef<HTMLInputElement>(null)
  
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (event) => {
          const newDoc = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            url: event.target?.result as string,
            uploadedAt: new Date().toISOString()
          }
          setUploadedDocuments(prev => [...prev, newDoc])
          setCompany(prev => prev ? { ...prev, uploadedDocuments: [...(prev.uploadedDocuments || []), newDoc] } : null)
          showToast(`${file.name}をアップロードしました`, 'success')
        }
        reader.readAsDataURL(file)
      })
    }
  }
  
  const removeDocument = (id: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== id))
    setCompany(prev => prev ? { ...prev, uploadedDocuments: prev.uploadedDocuments?.filter(doc => doc.id !== id) } : null)
    showToast('資料を削除しました', 'info')
  }
  
  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { id: 'profile', label: 'プロフィール' },
          { id: 'company', label: '会社情報' },
          { id: 'plan', label: 'プラン' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-medium text-sm border-b-2 -mb-px transition-colors ${
              activeTab === tab.id 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-6">プロフィール設定</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">氏名</label>
              <input
                type="text"
                value={user.name}
                onChange={e => setUser({ ...user, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">氏名（カナ）</label>
              <input
                type="text"
                value={user.nameKana || ''}
                onChange={e => setUser({ ...user, nameKana: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={user.email}
                onChange={e => setUser({ ...user, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">電話番号</label>
              <input
                type="tel"
                value={user.phone || ''}
                onChange={e => setUser({ ...user, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">部署</label>
              <input
                type="text"
                value={user.department || ''}
                onChange={e => setUser({ ...user, department: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">役職</label>
              <input
                type="text"
                value={user.position || ''}
                onChange={e => setUser({ ...user, position: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={() => showToast('プロフィールを更新しました', 'success')}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              保存する
            </button>
          </div>
        </div>
      )}
      
      {/* Company Tab */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Info size={16} />
              <span className="font-semibold text-sm">会社情報について</span>
            </div>
            <p className="text-sm text-blue-600">
              同じ会社の他のユーザーがすでに登録している場合、会社情報は共有されます。
              名刺スキャン時に会社情報を自動取得することもできます。
            </p>
          </div>
          
          <h3 className="text-lg font-semibold mb-6">会社情報設定</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={company?.name || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, name: e.target.value } : { id: '1', name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">会社名（カナ）</label>
              <input
                type="text"
                value={company?.nameKana || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, nameKana: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">法人番号</label>
              <input
                type="text"
                value={company?.corporateNumber || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, corporateNumber: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">業種</label>
              <select
                value={company?.industry || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, industry: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">選択してください</option>
                {industries.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">従業員数</label>
              <select
                value={company?.employeeCount || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, employeeCount: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">選択してください</option>
                {employeeRanges.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">売上規模</label>
              <select
                value={company?.annualRevenue || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, annualRevenue: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">選択してください</option>
                {revenueRanges.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">郵便番号</label>
              <input
                type="text"
                value={company?.postalCode || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, postalCode: e.target.value } : null)}
                placeholder="000-0000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">都道府県</label>
              <input
                type="text"
                value={company?.prefecture || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, prefecture: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">住所</label>
              <input
                type="text"
                value={company?.address || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, address: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">電話番号</label>
              <input
                type="tel"
                value={company?.phone || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, phone: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Webサイト</label>
              <input
                type="url"
                value={company?.website || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, website: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">代表者名</label>
              <input
                type="text"
                value={company?.representativeName || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, representativeName: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">設立日</label>
              <input
                type="date"
                value={company?.establishedDate || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, establishedDate: e.target.value } : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">事業内容</label>
              <textarea
                value={company?.businessDescription || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, businessDescription: e.target.value } : null)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">特徴・強み</label>
              <textarea
                value={company?.characteristics || ''}
                onChange={e => setCompany(prev => prev ? { ...prev, characteristics: e.target.value } : null)}
                placeholder="会社の特徴、強み、独自性などを記入してください"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                その他資料（カタログ、課題判断に役立つ資料など）
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  ref={documentInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center text-center mb-4">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <button
                    type="button"
                    onClick={() => documentInputRef.current?.click()}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    ファイルを選択
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    PDF, Word, Excel, PowerPoint, 画像ファイルに対応
                  </p>
                </div>
                {uploadedDocuments.length > 0 && (
                  <div className="space-y-2">
                    {uploadedDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText size={16} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {new Date(doc.uploadedAt).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="p-1 text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={() => showToast('会社情報を更新しました', 'success')}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              保存する
            </button>
          </div>
        </div>
      )}
      
      {/* Plan Tab */}
      {activeTab === 'plan' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Free', price: '0', desc: 'お試し利用', features: ['AIチャット 月5回', '名刺OCR 月10枚', '基本レポート'] },
            { name: 'Standard', price: '12,000', desc: '本格活用', featured: true, features: ['AIチャット 無制限', '名刺OCR 無制限', '詳細レポート', 'Web情報自動取得', '優先サポート'] },
            { name: 'Enterprise', price: 'お問い合わせ', desc: '大規模利用', features: ['全機能', 'API連携', '専任サポート', 'カスタム分析'] }
          ].map(plan => (
            <div 
              key={plan.name} 
              className={`bg-white rounded-xl p-6 border relative ${
                plan.featured ? 'border-blue-500 shadow-lg' : 'border-gray-200'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded-full">
                  人気
                </div>
              )}
              <div className="text-lg font-semibold mb-2">{plan.name}</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {plan.price === 'お問い合わせ' ? plan.price : `¥${plan.price}`}
                {plan.price !== 'お問い合わせ' && <span className="text-base font-normal text-gray-500">/月</span>}
              </div>
              <div className="text-sm text-gray-500 mb-6">{plan.desc}</div>
              <ul className="space-y-3 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-500" /> {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-3 rounded-lg font-medium ${
                plan.featured 
                  ? 'btn-gradient text-white' 
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
                {user.plan === plan.name.toLowerCase() ? '現在のプラン' : 
                  plan.name === 'Enterprise' ? '問い合わせる' : 'アップグレード'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// LANDING PAGE - Microsoft AI Style
// ============================================
const LandingPage = ({
  onLogin,
  onSignup
}: {
  onLogin: () => void
  onSignup: () => void
}) => {
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  const features = [
    { icon: Brain, title: '24時間AI経営相談', desc: 'いつでも経営課題を相談可能。待ち時間ゼロで専門家レベルの分析を提供。', color: 'from-blue-500 to-cyan-500' },
    { icon: CreditCard, title: '名刺OCRで簡単登録', desc: '名刺をスキャンするだけで連絡先と会社情報を自動取得。入力の手間を大幅削減。', color: 'from-purple-500 to-pink-500' },
    { icon: Globe, title: '企業情報自動収集', desc: '会社名からWeb検索で基本情報を自動取得。調査時間を短縮。', color: 'from-green-500 to-emerald-500' },
    { icon: TrendingUp, title: '経営診断レポート', desc: 'AIとの対話から経営状況を分析。課題と改善策を可視化。', color: 'from-orange-500 to-red-500' },
    { icon: Users, title: '社内共有機能', desc: '同じ会社のメンバーと情報を共有。チームでの活用も可能。', color: 'from-indigo-500 to-blue-500' },
    { icon: Shield, title: 'セキュアなデータ管理', desc: '企業情報は安全に保管。Row Level Securityで完全なデータ分離。', color: 'from-teal-500 to-cyan-500' },
  ]
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-x-hidden" style={{ perspective: '1000px' }}>
      {/* Header with Scroll Effect */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrollY > 50 
            ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg"
              >
                <Brain size={28} />
              </motion.div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Consulting
                </span>
                <p className="text-xs text-gray-500 hidden sm:block">経営課題をAIで解決</p>
              </div>
            </motion.div>
            <nav className="hidden md:flex items-center gap-8">
              {[
                { label: '機能', id: 'features' },
                { label: '料金', id: 'pricing' },
                { label: 'サービスについて', id: 'about' },
                { label: 'お問い合わせ', id: 'contact' },
              ].map((item) => (
                <motion.a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  whileHover={{ y: -2 }}
                  className={`font-medium transition-colors relative ${
                    scrollY > 50 ? 'text-gray-700 hover:text-blue-600' : 'text-white hover:text-blue-200'
                  }`}
                >
                  {item.label}
                  <motion.span
                    className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                    whileHover={{ width: '100%' }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogin}
                className={`px-4 py-2 font-medium transition-colors hidden sm:block ${
                  scrollY > 50 ? 'text-gray-700 hover:text-gray-900' : 'text-white hover:text-blue-200'
                }`}
              >
                ログイン
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)' }}
                whileTap={{ scale: 0.95 }}
                onClick={onSignup}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                無料で始める
                <ArrowRight size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>
      
      {/* Hero Section - Simple & Premium */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="AI Technology"
            className="w-full h-full object-cover"
            style={{
              transform: `translateY(${scrollY * 0.3}px) scale(1.1)`,
              transition: 'transform 0.1s ease-out'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-purple-900/30"></div>
        </div>
        
        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20"
            >
              <Sparkles size={20} className="text-white" />
              <span className="text-white font-medium">AI Powered Consulting</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              AIがあなたの<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300">
                経営パートナーに
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
              24時間365日、経営課題についてAIに相談できます。<br />
              名刺スキャンで簡単登録、企業情報も自動取得。
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSignup}
                className="px-10 py-4 bg-white text-gray-900 rounded-xl font-bold text-lg shadow-2xl hover:shadow-white/20 transition-all inline-flex items-center gap-3 group"
              >
                無料で始める
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogin}
                className="px-10 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all border border-white/30 inline-flex items-center gap-3"
              >
                ログイン
              </motion.button>
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-12 flex items-center justify-center gap-16 text-white"
            >
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">10,000+</div>
                <div className="text-gray-300 text-sm">利用企業数</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">98%</div>
                <div className="text-gray-300 text-sm">満足度</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">24/7</div>
                <div className="text-gray-300 text-sm">サポート</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/60"
        >
          <ChevronDown size={32} />
        </motion.div>
      </section>
      
      {/* Features Section with Images */}
      <section 
        id="features" 
        className="relative py-32 px-4 bg-white"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
              主な機能
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              入力負荷を最小限に、AIによる経営支援を最大限に
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 hover:shadow-xl transition-all duration-300"
              >
                {/* Feature Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={
                      i === 0 ? 'https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' :
                      i === 1 ? 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' :
                      i === 2 ? 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' :
                      i === 3 ? 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' :
                      i === 4 ? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' :
                      'https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
                    }
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className={`absolute top-4 right-4 w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-lg`}>
                    <feature.icon size={24} />
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-3 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Additional Image Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mt-20"
          >
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
                alt="経営者の課題解決"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
            <div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">AIによる経営課題の解決</h3>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                経営者が直面する複雑な課題を、AIの力で迅速かつ的確に解決します。
                データ分析から戦略立案まで、24時間365日サポートします。
              </p>
              <ul className="space-y-3">
                {['迅速な意思決定支援', 'データドリブンな分析', '継続的な改善提案'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* About Section with Images */}
      <section id="about" className="py-32 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
                  alt="経営会議"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                AIコンサルティングで<br />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  経営を変革
                </span>
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                私たちは、AI技術を活用して経営者の意思決定をサポートする次世代のコンサルティングサービスを提供しています。
                従来のコンサルティングでは時間とコストがかかっていた課題分析を、AIが24時間365日サポートします。
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                名刺スキャンや企業情報の自動取得により、入力負荷を最小限に抑えながら、
                専門家レベルの分析とアドバイスを提供します。
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={onSignup}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  無料で始める
                </button>
                <button 
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-blue-600 hover:text-blue-600 transition-all"
                >
                  お問い合わせ
                </button>
              </div>
            </motion.div>
          </div>
          
          {/* Image Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                img: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                icon: Zap,
                title: '迅速な対応',
                desc: '待ち時間ゼロで即座に分析結果を提供',
                color: 'from-blue-500 to-cyan-500'
              },
              { 
                img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                icon: Target,
                title: '精度の高い分析',
                desc: '専門家レベルの深い洞察を提供',
                color: 'from-purple-500 to-pink-500'
              },
              { 
                img: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                icon: Shield,
                title: 'セキュリティ',
                desc: '企業情報を安全に管理',
                color: 'from-green-500 to-emerald-500'
              },
              { 
                img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                icon: TrendingUp,
                title: '継続的改善',
                desc: 'AIが学習し続け精度が向上',
                color: 'from-orange-500 to-red-500'
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className={`absolute top-4 right-4 w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg`}>
                    <item.icon size={24} />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-2 text-gray-900">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">料金プラン</h2>
            <p className="text-xl text-gray-600">まずは無料プランでお試しください</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Free', price: '0', desc: 'お試し利用に', features: ['AIチャット 月5回', '名刺OCR 月10枚', '基本レポート'] },
              { name: 'Standard', price: '12,000', desc: '本格的な活用に', featured: true, features: ['AIチャット 無制限', '名刺OCR 無制限', '詳細レポート', 'Web情報自動取得', '優先サポート'] },
              { name: 'Enterprise', price: 'お問い合わせ', desc: '大規模利用に', features: ['全機能利用可能', 'API連携', '専任サポート', 'カスタム分析'] }
            ].map(plan => (
              <div 
                key={plan.name}
                className={`bg-white rounded-2xl p-6 relative ${
                  plan.featured ? 'border-2 border-blue-500 shadow-xl' : 'border border-gray-200'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded-full">
                    おすすめ
                  </div>
                )}
                <div className="text-lg font-semibold mb-2">{plan.name}</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {plan.price === 'お問い合わせ' ? plan.price : `¥${plan.price}`}
                  {plan.price !== 'お問い合わせ' && <span className="text-base font-normal text-gray-500">/月</span>}
                </div>
                <div className="text-sm text-gray-500 mb-6">{plan.desc}</div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle size={16} className="text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={onSignup}
                  className={`w-full py-3 rounded-xl font-medium transition-colors ${
                    plan.featured 
                      ? 'btn-gradient text-white' 
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.name === 'Enterprise' ? '問い合わせる' : '無料で始める'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Brain size={24} />
                </div>
                <span className="text-xl font-bold">AI Consulting</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                AIで経営課題を解決する次世代コンサルティングサービス
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                  <span className="text-sm">X</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                  <span className="text-sm">f</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                  <span className="text-sm">in</span>
                </a>
              </div>
            </div>
            
            {/* Product */}
            <div>
              <h3 className="font-semibold text-lg mb-4">サービス</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">機能一覧</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">料金プラン</a></li>
                <li><a href="#" className="hover:text-white transition-colors">導入事例</a></li>
                <li><a href="#" className="hover:text-white transition-colors">よくある質問</a></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h3 className="font-semibold text-lg mb-4">会社情報</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#about" className="hover:text-white transition-colors">サービスについて</a></li>
                <li><a href="#" className="hover:text-white transition-colors">企業情報</a></li>
                <li><a href="#" className="hover:text-white transition-colors">採用情報</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ニュース</a></li>
              </ul>
            </div>
            
            {/* Legal & Support */}
            <div>
              <h3 className="font-semibold text-lg mb-4">サポート</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">お問い合わせ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">利用規約</a></li>
                <li><a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a></li>
                <li><a href="#" className="hover:text-white transition-colors">特定商取引法</a></li>
              </ul>
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="border-t border-gray-800 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <Mail size={20} className="text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-400 mb-1">メール</div>
                  <a href="mailto:info@ai-consulting.jp" className="text-white hover:text-blue-400 transition-colors">
                    info@ai-consulting.jp
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={20} className="text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-400 mb-1">電話</div>
                  <a href="tel:03-1234-5678" className="text-white hover:text-blue-400 transition-colors">
                    03-1234-5678
                  </a>
                  <div className="text-xs text-gray-500 mt-1">平日 9:00-18:00</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-400 mb-1">所在地</div>
                  <div className="text-white text-sm">
                    〒100-0001<br />
                    東京都千代田区千代田1-1-1
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-sm">
                © 2024 AI Consulting Inc. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-gray-500">
                <a href="#" className="hover:text-white transition-colors">利用規約</a>
                <a href="#" className="hover:text-white transition-colors">プライバシー</a>
                <a href="#" className="hover:text-white transition-colors">Cookie</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [authState, setAuthState] = useState<'landing' | 'login' | 'signup' | 'authenticated'>('landing')
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: string }>>([])
  
  // User & Data
  const [user, setUser] = useState<UserProfile>({ 
    id: '1',
    name: '山田 太郎', 
    email: 'yamada@example.com', 
    phone: '03-1234-5678',
    department: '経営企画部',
    position: '部長',
    plan: 'free' 
  })
  const [company, setCompany] = useState<Company | null>({
    id: '1',
    name: '株式会社サンプル',
    industry: '情報通信業',
    employeeCount: '50-99名',
    prefecture: '東京都',
  })
  const [companies, setCompanies] = useState<Company[]>([])
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([])
  const [sessions, setSessions] = useState<ConsultingSession[]>([])
  
  const showToast = (message: string, type: string = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }
  
  const handleLogout = () => {
    showToast('ログアウトしました', 'success')
    setAuthState('landing')
  }
  
  const pageTitle: Record<string, string> = {
    dashboard: 'ダッシュボード',
    consulting: 'AIコンサルティング',
    'business-cards': '名刺・連絡先管理',
    reports: 'レポート',
    settings: '設定',
    help: 'ヘルプ'
  }
  
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage setCurrentPage={setCurrentPage} user={user} company={company} businessCards={businessCards} sessions={sessions} />
      case 'business-cards':
        return <BusinessCardsPage businessCards={businessCards} setBusinessCards={setBusinessCards} companies={companies} setCompanies={setCompanies} user={user} showToast={showToast} />
      case 'consulting':
        return <ConsultingPage sessions={sessions} setSessions={setSessions} user={user} showToast={showToast} />
      case 'reports':
        return <ReportsPage />
      case 'settings':
        return <SettingsPage user={user} setUser={setUser} company={company} setCompany={setCompany} showToast={showToast} />
      default:
        return <DashboardPage setCurrentPage={setCurrentPage} user={user} company={company} businessCards={businessCards} sessions={sessions} />
    }
  }
  
  // Render based on auth state
  if (authState === 'landing') {
    return <LandingPage onLogin={() => setAuthState('login')} onSignup={() => setAuthState('signup')} />
  }
  
  if (authState === 'login') {
    return (
      <LoginForm 
        onLogin={() => setAuthState('authenticated')} 
        onSwitchToSignup={() => setAuthState('signup')}
        onBack={() => setAuthState('landing')}
        showToast={showToast}
      />
    )
  }
  
  if (authState === 'signup') {
    return (
      <SignupForm 
        onSignup={() => setAuthState('authenticated')} 
        onSwitchToLogin={() => setAuthState('login')}
        onBack={() => setAuthState('landing')}
        showToast={showToast}
      />
    )
  }
  
  // Authenticated view
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <main className="flex-1 lg:ml-0">
        <Header 
          title={pageTitle[currentPage]} 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          user={user}
          onLogoClick={() => setCurrentPage('settings')}
          onBackToLP={() => setAuthState('landing')}
        />
        {renderPage()}
      </main>
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
