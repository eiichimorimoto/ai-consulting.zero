'use client';

import { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BudgetItem {
  id: string;
  category: string;
  budget: number;
  actual: number;
}

type PeriodUnit = 'monthly' | 'quarterly' | 'yearly';

export function BudgetTab() {
  const [hasData, setHasData] = useState(false);
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>('monthly');
  const [budgetData] = useState<BudgetItem[]>([
    { id: '1', category: '売上', budget: 18000000, actual: 12500000 },
    { id: '2', category: 'コスト', budget: 8000000, actual: 7200000 },
    { id: '3', category: '利益', budget: 10000000, actual: 5300000 },
  ]);

  const calculateDifference = (budget: number, actual: number) => {
    return actual - budget;
  };

  const calculateAchievementRate = (budget: number, actual: number) => {
    if (budget === 0) return 0;
    return Math.round((actual / budget) * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleShowData = () => {
    setHasData(true);
  };

  if (!hasData) {
    return (
      <div className="p-6">
        <h3 className="text-sm font-bold text-foreground mb-1">予実管理</h3>
        <p className="text-xs text-muted-foreground mb-4">予算と実績の比較</p>

        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">予実データを入力してください</p>
          <Button
            size="sm"
            onClick={handleShowData}
            className="text-xs"
          >
            サンプルデータを表示
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground mb-1">予実管理</h3>
          <p className="text-xs text-muted-foreground">予算と実績の比較</p>
        </div>
        <Select value={periodUnit} onValueChange={(value) => setPeriodUnit(value as PeriodUnit)}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly" className="text-xs">月次</SelectItem>
            <SelectItem value="quarterly" className="text-xs">四半期</SelectItem>
            <SelectItem value="yearly" className="text-xs">年次</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="space-y-3 mb-6">
        {budgetData.map(item => {
          const difference = calculateDifference(item.budget, item.actual);
          const achievementRate = calculateAchievementRate(item.budget, item.actual);
          const isPositive = difference >= 0;

          return (
            <Card key={item.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">{item.category}</h4>
                  <Badge
                    variant={achievementRate >= 100 ? "default" : achievementRate >= 80 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {achievementRate}%
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">予算</p>
                    <p className="text-sm font-mono font-semibold">{formatCurrency(item.budget)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">実績</p>
                    <p className="text-sm font-mono font-semibold">{formatCurrency(item.actual)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <p className={`text-xs font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(difference)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({isPositive ? '予算超過' : '予算未達'})
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        achievementRate >= 100 ? 'bg-green-500' :
                        achievementRate >= 80 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(achievementRate, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall Summary */}
      <Card className="border-border/50 bg-accent/50">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold mb-3">総合サマリー</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">総予算</span>
              <span className="font-semibold font-mono">
                {formatCurrency(budgetData.reduce((sum, item) => sum + item.budget, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">総実績</span>
              <span className="font-semibold font-mono">
                {formatCurrency(budgetData.reduce((sum, item) => sum + item.actual, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">総差異</span>
              <span className={`font-semibold font-mono ${
                budgetData.reduce((sum, item) => sum + (item.actual - item.budget), 0) >= 0
                  ? 'text-green-500'
                  : 'text-red-500'
              }`}>
                {formatCurrency(budgetData.reduce((sum, item) => sum + (item.actual - item.budget), 0))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 text-center">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
        >
          データを編集
        </Button>
      </div>
    </div>
  );
}
