"use client"

import Link from "next/link"
import type { Team } from "@/lib/types/database"

interface PageNavigationProps {
  userTeam: Team
  currentPage: "home" | "team" | "schedule" | "settings"
}

export function PageNavigation({ userTeam, currentPage }: PageNavigationProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <nav className="flex items-center gap-6">
        <Link 
          href="/home" 
          className={currentPage === "home" 
            ? "text-foreground font-medium border-b-2 border-primary pb-1" 
            : "text-muted-foreground hover:text-foreground transition-colors"
          }
        >
          Home
        </Link>
        <Link 
          href={`/team/${userTeam.team_id}`}
          className={currentPage === "team" 
            ? "text-foreground font-medium border-b-2 border-primary pb-1" 
            : "text-muted-foreground hover:text-foreground transition-colors"
          }
        >
          My Team
        </Link>
        <span className={currentPage === "schedule" 
          ? "text-foreground font-medium border-b-2 border-primary pb-1" 
          : "text-muted-foreground/50"
        }>
          Schedule
        </span>
        <Link
          href="/settings"
          className={currentPage === "settings" 
            ? "text-foreground font-medium border-b-2 border-primary pb-1" 
            : "text-muted-foreground hover:text-foreground transition-colors"
          }
        >
          Settings
        </Link>
      </nav>
    </div>
  )
}
