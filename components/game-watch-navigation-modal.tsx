"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface GameWatchNavigationModalProps {
  isOpen: boolean
  onClose: () => void
  onContinueWatching: () => void
  onLeaveAndSim: () => void
}

export function GameWatchNavigationModal({ 
  isOpen, 
  onClose, 
  onContinueWatching, 
  onLeaveAndSim 
}: GameWatchNavigationModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Game?</AlertDialogTitle>
          <AlertDialogDescription>
            You are currently watching a live game. If you leave now, the rest of the game will be automatically simulated and you'll see the final result.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onContinueWatching}>
            Continue Watching
          </AlertDialogCancel>
          <AlertDialogAction onClick={onLeaveAndSim}>
            Leave & Sim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
