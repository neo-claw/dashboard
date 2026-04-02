'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatusData {
  hasCache: boolean;
  status?: 'fresh' | 'stale' | 'old';
  lastCheck?: string;
  ageMinutes?: number;
  campgroundIds?: string[];
  campgroundNames?: Record<string, string>;
  startDate?: string;
  endDate?: string;
  hadAvailability?: boolean;
  availableSitesCount?: number;
  error?: string;
}

export default function RecreationCheckWidget() {
  const [data, setData] = useState<StatusData>({ hasCache: false });
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/recreation-check/status');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData({ hasCache: false, error: 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    if (!data.hasCache) {
      return <Badge variant="destructive">No Data</Badge>;
    }
    switch (data.status) {
      case 'fresh':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
      case 'stale':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Stale</Badge>;
      case 'old':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Old</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatLastCheck = (ts?: string) => {
    if (!ts) return 'Never';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasAvail = data.hadAvailability && (data.availableSitesCount || 0) > 0;
  const campgroundCount = data.campgroundIds?.length || 0;

  return (
    <Card className="bg-surface-glass backdrop-blur-xs border border-border/30 hover:border-accent/40 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar size={18} className="text-accent" />
            Campsite Check
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted animate-pulse">Loading...</div>
        ) : !data.hasCache ? (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <XCircle size={16} />
            <span>No check data available yet</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted text-xs uppercase tracking-wide">Campgrounds</p>
                <p className="font-medium">{campgroundCount} monitored</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide">Available Sites</p>
                <p className={cn(
                  'font-medium',
                  hasAvail ? 'text-emerald-400' : 'text-muted'
                )}>
                  {hasAvail ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      {data.availableSitesCount}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <XCircle size={14} />
                      0
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <Clock size={12} />
              <span>Last check: {formatLastCheck(data.lastCheck)}</span>
              {data.ageMinutes !== undefined && (
                <span className="text-xs">({Math.round(data.ageMinutes)}m ago)</span>
              )}
            </div>

            <div className="text-xs text-muted border-t border-border/20 pt-2">
              <span>{data.startDate} → {data.endDate}</span>
            </div>

            {hasAvail && (
              <div className="pt-1">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 w-full justify-center">
                  AVAILABILITY FOUND!
                </Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
