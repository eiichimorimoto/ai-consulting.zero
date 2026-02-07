/**
 * PPT生成テストボタン（プロトタイプ用）
 * 開発環境でのみ表示
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TestPPTButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  /**
   * PPT生成を実行
   */
  const handleGeneratePPT = async () => {
    setIsGenerating(true);
    setDownloadUrl(null);

    try {
      toast.info('PPTを生成中...', { description: '数秒お待ちください' });

      const response = await fetch('/api/tools/generate-presentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'AI経営コンサルティング',
          authorName: 'AI参謀',
        }),
      });

      if (!response.ok) {
        throw new Error('PPT生成に失敗しました');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'PPT生成に失敗しました');
      }

      const { base64, fileName: generatedFileName, mimeType } = result.data;

      // Base64からBlobを作成
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // ダウンロードURL生成
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setFileName(generatedFileName);

      toast.success('PPT生成完了！', {
        description: 'ダウンロードボタンをクリックしてください',
      });
    } catch (error) {
      console.error('PPT生成エラー:', error);
      toast.error('エラー', {
        description: error instanceof Error ? error.message : 'PPT生成に失敗しました',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * ダウンロードを実行
   */
  const handleDownload = () => {
    if (!downloadUrl) return;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('ダウンロード開始', {
      description: `${fileName} をダウンロードしています`,
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 bg-white p-4 rounded-lg shadow-xl border border-gray-200">
      <div className="text-xs font-semibold text-gray-600 mb-1">
        🧪 プロトタイプテスト
      </div>
      
      <Button
        onClick={handleGeneratePPT}
        disabled={isGenerating}
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            PPT生成テスト
          </>
        )}
      </Button>

      {downloadUrl && (
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
        >
          <Download className="w-4 h-4" />
          ダウンロード
        </Button>
      )}
    </div>
  );
}
