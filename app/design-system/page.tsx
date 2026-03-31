'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { StatusIndicator } from '@/components/status-indicator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/command-palette';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor, CheckCircle2, AlertCircle, AlertTriangle, XCircle, Clock, Activity, Zap, Shield, Eye, Keyboard, Command as CommandIcon, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const demoItems = [
  { id: 1, name: 'Dashboard', group: 'Navigation', shortcut: '⌘D' },
  { id: 2, name: 'Sessions', group: 'Navigation', shortcut: '⌘S' },
  { id: 3, name: 'Kanban', group: 'Navigation', shortcut: '⌘K' },
  { id: 4, name: 'Calendar', group: 'Navigation', shortcut: '⌘C' },
  { id: 5, name: 'Settings', group: 'System', shortcut: '⌘,' },
  { id: 6, name: 'Profile', group: 'System', shortcut: '⌘P' },
  { id: 7, name: 'Logout', group: 'System', shortcut: '⌘Q' },
  { id: 8, name: 'New Session', group: 'Actions', shortcut: '⌘N' },
  { id: 9, name: 'Export Data', group: 'Actions', shortcut: '⌘E' },
];

export default function DesignSystemPage() {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen space-y-12 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-2">Design System</h1>
            <p className="text-lg text-muted">
              Theme engine, glassmorphism tokens, and accessible components
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Theme Status */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5 text-accent" />
              Theme Status
            </CardTitle>
            <CardDescription>
              Current theme detection and persistence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Theme Engine</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Preference Detection</span>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">LocalStorage Persistence</span>
              <Badge variant="success">Working</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Instant Switching</span>
              <Badge variant="success">No Flicker</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Colors Section */}
        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-6">Semantic Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: 'primary', label: 'Primary', bg: 'bg-primary' },
              { name: 'secondary', label: 'Secondary', bg: 'bg-secondary' },
              { name: 'success', label: 'Success', bg: 'bg-success' },
              { name: 'warning', label: 'Warning', bg: 'bg-warning' },
              { name: 'error', label: 'Error', bg: 'bg-error' },
            ].map((color) => (
              <Card key={color.name} className="overflow-hidden">
                <div className={cn('h-24 w-full', color.bg)} aria-hidden="true" />
                <CardContent className="pt-4">
                  <p className="font-mono text-sm text-muted">{color.name}</p>
                  <p className="font-medium">{color.label}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant={color.name as any}>{color.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Glassmorphism Section */}
        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-6">Glassmorphism Tokens</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 pointer-events-none" />
              <CardHeader>
                <CardTitle>Glass Default</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  backdrop-blur-12px, opacity 70%, subtle glass border
                </p>
              </CardContent>
            </Card>

            <Card className="glass-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 pointer-events-none" />
              <CardHeader>
                <CardTitle>Glass Small</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  backdrop-blur-8px, lower opacity, lighter border
                </p>
              </CardContent>
            </Card>

            <Card className="glass-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 pointer-events-none" />
              <CardHeader>
                <CardTitle>Glass Large</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  backdrop-blur-16px, higher opacity, stronger border
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Status Indicators */}
        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-6">Status Indicators</h2>
          <div className="flex flex-wrap gap-8">
            {(['online', 'offline', 'warning', 'error', 'busy', 'idle'] as const).map((status) => (
              <div key={status} className="flex items-center gap-4">
                <StatusIndicator status={status} size="md" />
                <StatusIndicator status={status} size="lg" showLabel />
                <StatusIndicator status={status} size="sm" />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted mt-4">
            All indicators include appropriate ARIA labels for screen readers
          </p>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-6">Badges</h2>
          <div className="flex flex-wrap gap-4">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>Standard card with subtle shadow</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  Uses surface colors with border and shadow for depth.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="default">Standard</Badge>
              </CardFooter>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Glass Card</CardTitle>
                <CardDescription>Glassmorphism effect</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  Semi-transparent with backdrop blur for modern aesthetic.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="success">Glass</Badge>
              </CardFooter>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>Strong shadow depth</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  Prominent elevation for important content areas.
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="warning">Elevated</Badge>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Interactive Components */}
        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-6">Interactive Components</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tooltips */}
            <Card>
              <CardHeader>
                <CardTitle>Tooltips</CardTitle>
                <CardDescription>
                  Accessible tooltips with keyboard support
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover me</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This is a tooltip with helpful information</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="default">With Icon</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex items-center gap-2">
                        <Search size={14} aria-hidden="true" />
                        <span>Search command palette</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost">Disabled Button</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>You don&apos;t have permission to access this</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Command Palette Trigger */}
            <Card>
              <CardHeader>
                <CardTitle>Command Palette</CardTitle>
                <CardDescription>
                  Keyboard-driven command interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted mb-4">
                  Press <kbd className="px-2 py-1 text-xs border border-border rounded bg-surface">⌘K</kbd> or click below
                </p>
                <Button
                  onClick={() => setOpen(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Search className="mr-2 size-4" aria-hidden="true" />
                  Open Command Palette
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Accessibility Notes */}
        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-6">Accessibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Keyboard Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  <span>Tab navigation through interactive elements</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  <span>Arrow keys in command palette</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  <span>Escape to close dialogs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  <span>Enter to select items</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Screen Reader Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  <span>ARIA labels on all interactive elements</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  <span>Live regions for status updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  <span>Focus management in modals</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  <span>Proper heading hierarchy</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Command Palette Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {['Navigation', 'System', 'Actions'].map((group) => (
            <CommandGroup key={group} heading={group}>
              {demoItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      console.log(`Selected: ${item.name}`);
                      setOpen(false);
                    }}
                  >
                    {item.name}
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </TooltipProvider>
  );
}
