"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { GM } from "@/types/game"

interface GMCreationProps {
  onGMCreated: (gm: GM) => void
}

export function GMCreation({ onGMCreated }: GMCreationProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      return
    }

    const gm: GM = {
      id: Math.random().toString(36).substr(2, 9),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      createdAt: new Date(),
    }

    onGMCreated(gm)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Basketball GM</h1>
          <p className="text-muted-foreground text-lg">Manage your dynasty</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create Your GM</CardTitle>
            <CardDescription className="text-center">
              Enter your name to begin your journey as a General Manager
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                />
              </div>

              <Button type="submit" className="w-full text-lg py-6" disabled={!firstName.trim() || !lastName.trim()}>
                Create GM Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
