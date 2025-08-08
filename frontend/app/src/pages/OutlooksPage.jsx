import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function OutlooksPage() {
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const outlooks = [
    { day: 1, title: 'Day 1 Severe Weather Outlook' },
    { day: 2, title: 'Day 2 Severe Weather Outlook' },
    { day: 3, title: 'Day 3 Severe Weather Outlook' },
  ];

  const [summaries, setSummaries] = useState({ 1: null, 2: null, 3: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRefresh = () => setCacheBust(Date.now());

  useEffect(() => {
    let isCancelled = false;
    async function loadSummaries() {
      try {
        setLoading(true);
        setError(null);
        const days = [1, 2, 3];
        const results = await Promise.all(
          days.map(async (d) => {
            const res = await fetch(`/api/spc/outlook/summary`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ day: d })
            });
            if (!res.ok) throw new Error(`Failed to summarize day ${d} outlook`);
            const json = await res.json();
            return [d, json.summary];
          })
        );
        if (!isCancelled) {
          const map = results.reduce((acc, [d, t]) => { acc[d] = t; return acc; }, {});
          setSummaries(map);
        }
      } catch (e) {
        if (!isCancelled) setError(e.message || 'Failed to load outlook summaries');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    loadSummaries();
    return () => { isCancelled = true; };
  }, [cacheBust]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SPC Outlooks</h1>
          <p className="text-sm text-muted-foreground">From NOAA Storm Prediction Center</p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          Refresh images and text
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {outlooks.map((o, idx) => {
          const src = `https://www.spc.noaa.gov/products/outlook/day${o.day}otlk.gif?${cacheBust}`;
          return (
            <motion.div
              key={`day${o.day}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 * idx }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{o.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.img
                    src={src}
                    alt={`${o.title}`}
                    className="w-full h-auto rounded-md border"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    loading="eager"
                  />
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Summary</div>
                    {loading ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : error ? (
                      <div className="text-sm text-red-600">{error}</div>
                    ) : (
                      <pre className="text-xs md:text-sm whitespace-pre-wrap font-mono bg-muted/30 border rounded-md p-3 max-h-80 overflow-auto">
                        {summaries[o.day] || 'No summary available.'}
                      </pre>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default OutlooksPage;
