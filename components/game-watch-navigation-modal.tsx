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
            You are currently watching a live game. If you navigate away before the game ends, the game will not be saved and your progress will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onContinueWatching}>
            Continue Watching
          </AlertDialogCancel>
          <AlertDialogAction onClick={onLeaveAndSim}>
            Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
