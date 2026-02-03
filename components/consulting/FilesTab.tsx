'use client';

import { useState, useRef, DragEvent } from "react";
import { Upload, FileText, X, Eye, Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  budgetData?: BudgetDataItem[];
}

interface BudgetDataItem {
  actual: number;
  budget?: number;
}

interface FilesTabProps {
  onBudgetDataImported?: (data: BudgetDataItem[]) => void;
  onBudgetGenerated?: (data: BudgetDataItem[]) => void;
}

export function FilesTab({ onBudgetDataImported, onBudgetGenerated }: FilesTabProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showGrowthRateDialog, setShowGrowthRateDialog] = useState(false);
  const [selectedFileForBudget, setSelectedFileForBudget] = useState<UploadedFile | null>(null);
  const [growthRate, setGrowthRate] = useState<number>(20);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (newFiles: File[]) => {
    setIsUploading(true);

    for (const file of newFiles) {
      try {
        // Check if it's Excel or CSV
        const isExcelOrCSV = /\.(xlsx?|csv)$/i.test(file.name);

        let budgetData: BudgetDataItem[] | undefined;

        if (isExcelOrCSV) {
          // For demo purposes, create mock budget data
          budgetData = [
            { actual: 12500000 },
            { actual: 7200000 },
            { actual: 5300000 },
          ];

          // Notify parent component about new budget data
          if (onBudgetDataImported && budgetData) {
            onBudgetDataImported(budgetData);
          }
        }

        const uploadedFile: UploadedFile = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          budgetData,
        };

        setFiles(prev => [...prev, uploadedFile]);
        toast.success(`${file.name} をアップロードしました`);
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(`${file.name} のアップロードに失敗しました`);
      }
    }

    setIsUploading(false);
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleGenerateBudget = () => {
    if (!selectedFileForBudget || !selectedFileForBudget.budgetData) {
      toast.error('ファイルデータが見つかりません');
      return;
    }

    try {
      // Calculate budget from actual with growth rate
      const multiplier = 1 + (growthRate / 100);
      const generatedBudget = selectedFileForBudget.budgetData.map((item) => ({
        ...item,
        budget: Math.round(item.actual * multiplier),
      }));

      // Notify parent component
      if (onBudgetGenerated) {
        onBudgetGenerated(generatedBudget);
      }

      toast.success(`予算を生成しました（増減率: ${growthRate > 0 ? '+' : ''}${growthRate}%）`);
      setShowGrowthRateDialog(false);
    } catch (error) {
      console.error('Budget generation error:', error);
      toast.error('予算の生成に失敗しました');
    }
  };

  const handleClickDropZone = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-6">
      <h3 className="text-sm font-bold text-foreground mb-1">ファイル</h3>
      <p className="text-xs text-muted-foreground mb-4">ドラッグ&ドロップで追加</p>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClickDropZone}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
          }
        `}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-sm text-muted-foreground mb-2">
          {isDragging ? 'ここにドロップ' : 'ファイルをドラッグ&ドロップ'}
        </p>
        <p className="text-xs text-muted-foreground">または クリックして選択</p>
        <p className="text-xs text-muted-foreground mt-2">
          対応形式: PDF, Excel, Word, 画像 (最大10MB)
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
        accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.gif"
      />

      {/* Uploaded Files List */}
      <div className="mt-6">
        <h4 className="text-xs font-semibold text-muted-foreground mb-3">
          アップロード済みファイル ({files.length})
        </h4>

        {files.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">ファイルがありません</p>
        ) : (
          <div className="space-y-2">
            {files.map(file => (
              <Card key={file.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {file.budgetData && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedFileForBudget(file);
                            setShowGrowthRateDialog(true);
                          }}
                          title="予算を生成"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {/* TODO: Preview */}}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFile(file.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Growth Rate Dialog */}
      <Dialog open={showGrowthRateDialog} onOpenChange={setShowGrowthRateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予算を自動生成</DialogTitle>
            <DialogDescription>
              実績データから目標増減率を設定して予算を計算します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="growth-rate">目標増減率 (%)</Label>
              <Input
                id="growth-rate"
                type="number"
                value={growthRate}
                onChange={(e) => setGrowthRate(Number(e.target.value))}
                placeholder="20"
              />
              <p className="text-xs text-muted-foreground">
                例: +20% で入力すると、実績の1.2倍が予算になります
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrowthRateDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleGenerateBudget}>
              予算を生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
