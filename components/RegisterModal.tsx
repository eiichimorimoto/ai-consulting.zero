'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RegisterModalProps {
  reportId: string;
  reportData?: {
    overallScore: number;
    topIssues: Array<{
      category: string;
      severity: string;
      issue: string;
      impact: string;
    }>;
    metrics?: any;
    url?: string;
  };
  onClose: () => void;
}

export function RegisterModal({ reportId, reportData, onClose }: RegisterModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 診断データを保存してレポートIDを取得
      const response = await fetch('/api/register-and-save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          companyName, 
          reportData: reportData || {
            overallScore: 0,
            topIssues: [],
            metrics: {},
            url: '',
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登録に失敗しました');
      }

      if (data.success && data.reportId) {
        // 完全レポートページへ遷移
        router.push(`/diagnosis/${data.reportId}`);
      } else {
        throw new Error('レポートIDの取得に失敗しました');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || '登録中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-md w-full border border-white/20 shadow-2xl">
        {/* ヘッダー */}
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                完全レポートを受け取る
              </h2>
              <p className="text-gray-400 text-sm">
                メールアドレスと会社名を入力してください
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              メールアドレス *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-500 border border-white/20 focus:outline-none focus:border-blue-400"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              会社名 *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="株式会社○○"
              className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-500 border border-white/20 focus:outline-none focus:border-blue-400"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-bold text-blue-300 mb-2">
              完全レポートに含まれる内容：
            </h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>✅ 詳細な課題分析（全項目）</li>
              <li>✅ パフォーマンス指標</li>
              <li>✅ Core Web Vitals分析</li>
              <li>✅ PDFダウンロード</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '登録中...' : '完全レポートを見る'}
          </button>

          <p className="text-center text-gray-400 text-xs">
            登録することで、利用規約とプライバシーポリシーに同意したものとみなされます
          </p>
        </form>
      </div>
    </div>
  );
}
