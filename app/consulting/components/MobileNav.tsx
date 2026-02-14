"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, FileBarChart, FileText } from "lucide-react"

interface MobileNavProps {
  activeTab: "chat" | "context" | "proposal"
  onTabChange: (tab: "chat" | "context" | "proposal") => void
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <div className="bg-background border-b lg:hidden">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">チャット</span>
          </TabsTrigger>
          <TabsTrigger value="context" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            <span className="text-xs">情報</span>
          </TabsTrigger>
          <TabsTrigger value="proposal" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-xs">提案書</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
