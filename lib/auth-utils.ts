// Password strength checker
export interface PasswordStrength {
  score: number // 0-4
  label: string
  color: string
  feedback: string[]
}

export function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0
  const feedback: string[] = []

  if (!password) {
    return {
      score: 0,
      label: '',
      color: 'bg-gray-200',
      feedback: []
    }
  }

  // Length check
  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('8文字以上必要です')
  }

  if (password.length >= 12) {
    score += 1
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 0.5
  } else {
    feedback.push('小文字を含めてください')
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 0.5
  } else {
    feedback.push('大文字を含めてください')
  }

  // Number check
  if (/\d/.test(password)) {
    score += 0.5
  } else {
    feedback.push('数字を含めてください')
  }

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 0.5
  } else {
    feedback.push('記号を含めると強度が上がります')
  }

  // Round score
  score = Math.min(Math.round(score), 4)

  const labels = ['非常に弱い', '弱い', '普通', '強い', '非常に強い']
  const colors = ['strength-weak', 'strength-weak', 'strength-fair', 'strength-good', 'strength-strong']

  return {
    score,
    label: labels[score],
    color: colors[score],
    feedback: score < 3 ? feedback : []
  }
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation
export function isValidPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'パスワードは8文字以上必要です' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '小文字を含めてください' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '大文字を含めてください' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: '数字を含めてください' }
  }
  return { valid: true, message: '' }
}

