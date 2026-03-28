'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Brain, Code, LayoutDashboard, CheckSquare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Overview from '@/app/components/Overview';
import Kanban from '@/app/components/Kanban';
import Learnings from '@/app/components/Learnings';
import Trinity from '@/app/components/Trinity';
import CalendarComp from '@/app/components/Calendar';

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="flex justify-between items-center py-4 border-b border-border mb-6">
        <h1 className="text-2xl font-bold text-accent">Neo & Trinity Dashboard</h1>
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${activeTab === 'overview' ? 'bg-accent text-bg' : 'text-muted hover:text-fg'}`}
          >
            <LayoutDashboard size={16} /> Overview
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${activeTab === 'kanban' ? 'bg-accent text-bg' : 'text-muted hover:text-fg'}`}
          >
            <CheckSquare size={16} /> Kanban
          </button>
          <button
            onClick={() => setActiveTab('learnings')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${activeTab === 'learnings' ? 'bg-accent text-bg' : 'text-muted hover:text-fg'}`}
          >
            <Brain size={16} /> Learnings
          </button>
          <button
            onClick={() => setActiveTab('trinity')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${activeTab === 'trinity' ? 'bg-accent text-bg' : 'text-muted hover:text-fg'}`}
          >
            <Code size={16} /> Trinity
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${activeTab === 'calendar' ? 'bg-accent text-bg' : 'text-muted hover:text-fg'}`}
          >
            <CalendarIcon size={16} /> Calendar
          </button>
        </nav>
      </header>

      <main>
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'kanban' && <Kanban />}
        {activeTab === 'learnings' && <Learnings />}
        {activeTab === 'trinity' && <Trinity />}
        {activeTab === 'calendar' && <CalendarComp />}
      </main>

      <footer className="mt-8 text-muted text-sm text-center">
        Built by Trinity ◈ Data from <code>neo-claw/brain</code>
      </footer>
    </div>
  );
}
