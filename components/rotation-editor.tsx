/**
 * Rotation Editor Component
 * 
 * Wrapper component for rotation management with presets and controls.
 */

"use client"

import React from 'react'
import { RotationChart } from './rotation-chart'
import type { TeamRotationConfig, Player } from '@/lib/types/database'

interface RotationEditorProps {
  players: Player[]
  rotationConfig: TeamRotationConfig | null
  teamId: number
  onSave: (config: TeamRotationConfig) => void
  onReset: () => void
}

export function RotationEditor({ players, rotationConfig, teamId, onSave, onReset }: RotationEditorProps) {
  return (
    <RotationChart 
      players={players}
      rotationConfig={rotationConfig}
      teamId={teamId}
      onSave={onSave}
      onReset={onReset}
    />
  )
}
