"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Calendar, Settings } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { Team } from "@/lib/types/database"

interface AppSidebarProps {
  userTeam: Team
}

export function AppSidebar({ userTeam }: AppSidebarProps) {
  const pathname = usePathname()

  const navigationItems = [
    {
      title: "Home",
      url: "/home",
      icon: Home,
      isActive: pathname === "/home",
    },
    {
      title: "My Team",
      url: `/team/${userTeam.team_id}`,
      icon: Users,
      isActive: pathname.startsWith("/team/"),
    },
    {
      title: "Schedule",
      url: "#",
      icon: Calendar,
      isActive: false,
      disabled: true,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: pathname === "/settings",
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex items-center justify-center p-2">
              <SidebarTrigger />
            </div>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild={!item.disabled}
                    isActive={item.isActive}
                    tooltip={item.title}
                    disabled={item.disabled}
                  >
                    {item.disabled ? (
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                    ) : (
                      <Link href={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
