'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Settings,
  PlusCircle,
  ArrowLeft
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/sidebar'

interface ConsultingSidebarProps {
  sessions?: Array<{
    id: string
    title: string
    category: string
    current_round: number
    max_rounds: number
  }>
}

export function ConsultingSidebar({ sessions = [] }: ConsultingSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarContent>
        {/* ナビゲーション */}
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <ArrowLeft />
                    <span>ダッシュボードに戻る</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/consulting/start'}>
                  <Link href="/consulting/start">
                    <PlusCircle />
                    <span>新規相談</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* セッション一覧 */}
        <SidebarGroup>
          <SidebarGroupLabel>相談履歴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  まだ相談履歴がありません
                </div>
              ) : (
                sessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === `/consulting/sessions/${session.id}`}
                    >
                      <Link href={`/consulting/sessions/${session.id}`}>
                        <MessageSquare />
                        <div className="flex flex-col overflow-hidden">
                          <span className="truncate">{session.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {session.current_round}/{session.max_rounds}回
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/settings">
                <Settings />
                <span>設定</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
