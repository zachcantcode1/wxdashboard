import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const formatDisplayDate = () => {
  const now = new Date();
  return now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const Paragraphs = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  return (
    <div className="space-y-4 leading-7 text-sm sm:text-base">
      {parts.map((p, idx) => (
        <p key={idx}>{p}</p>
      ))}
    </div>
  );
};

const FallbackFromParts = ({ parts }) => {
  // Join provided raw excerpts if LLM summary is unavailable
  const text = useMemo(() => {
    if (!Array.isArray(parts) || parts.length === 0) return '';
    return parts
      .map(p => `${p.title}:\n${(p.text || '').trim()}`)
      .join('\n\n')
      .slice(0, 2500);
  }, [parts]);
  return <Paragraphs text={text} />;
};

const TodaysWeatherPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchSummary = async (noCache = false) => {
    try {
      setLoading(true);
      setError(null);
      const url = `/api/summary/today${noCache ? '?nocache=1' : ''}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Request failed: ${resp.status}`);
      const json = await resp.json();
      setData(json);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generatedAtLocal = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString()
    : null;

  return (
    <motion.div
      className="p-4 sm:p-6 md:p-8 text-foreground"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header / Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold mr-auto">Today's Weather</h1>
        <Badge variant="outline" className="text-xs sm:text-sm whitespace-nowrap">
          {formatDisplayDate()}
        </Badge>
        <Button size="sm" onClick={() => fetchSummary(true)} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl">Daily Hazards Briefing</CardTitle>
              {generatedAtLocal && (
                <span className="text-xs text-muted-foreground">Generated {generatedAtLocal}</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
                <Separator className="my-2" />
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="h-5 w-10/12" />
              </div>
            )}

            {!loading && error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            {!loading && !error && (
              <div className="prose prose-invert max-w-none">
                {data?.summary ? (
                  <Paragraphs text={data.summary} />
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Summary temporarily unavailable; showing raw excerpts from official sources.
                    </p>
                    <FallbackFromParts parts={data?.parts || []} />
                  </div>
                )}
              </div>
            )}

            {!loading && data?.sourcesUsed?.length > 0 && (
              <div className="mt-6 text-xs text-muted-foreground">
                <span className="mr-2">Sources:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.sourcesUsed.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default TodaysWeatherPage;
