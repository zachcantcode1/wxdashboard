import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

// Utilities mirrored from ActiveAlertsPage to determine active alerts
const isAlertActive = (expiresTime) => {
  if (!expiresTime || expiresTime === 'N/A') return true;
  try {
    const expiryDate = new Date(expiresTime);
    const now = new Date();
    return expiryDate > now;
  } catch (error) {
    return true;
  }
};

const SOCKET_SERVER_URL = import.meta.env.PROD 
  ? 'https://wxdashboard-production.up.railway.app' 
  : 'http://localhost:3001';

function WeatherStatsPage() {
  // WSI state and history
  const [wsi, setWsi] = useState(0);
  const [wsiCategory, setWsiCategory] = useState('Tranquil');
  const [wsiWeights, setWsiWeights] = useState(null);
  const [wsiHistory, setWsiHistory] = useState([]);
  const [wsiError, setWsiError] = useState(null);
  const lastWsiRef = useRef(0);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(null);

  const [lsrReports, setLsrReports] = useState([]);
  const [lsrLoading, setLsrLoading] = useState(true);
  const [lsrError, setLsrError] = useState(null);

  // UI expand/collapse state
  const [expandedCard, setExpandedCard] = useState(null); // 'warnings' | 'reports' | null

  // Load alerts once (same API used in ActiveAlertsPage)
  useEffect(() => {
    let isMounted = true;

    const fetchExistingAlerts = async () => {
      try {
        const response = await fetch('/api/alerts');
        if (response.ok) {
          const existingAlerts = await response.json();
          if (isMounted) {
            setAlerts(existingAlerts || []);
            setAlertsError(null);
          }
        } else {
          if (isMounted) setAlertsError('Failed to fetch existing alerts');
        }
      } catch (error) {
        if (isMounted) setAlertsError('Failed to load existing alerts');
      } finally {
        if (isMounted) setAlertsLoading(false);
      }
    };

    fetchExistingAlerts();

    // Load WSI weights
    const fetchWsiWeights = async () => {
      try {
        const res = await fetch('/api/wsi-weights');
        if (!res.ok) throw new Error('Weights fetch failed');
        const json = await res.json();
        setWsiWeights(json);
      } catch (err) {
        console.error('WSI weights error:', err);
        setWsiError('Failed to load WSI weights');
      }
    };
    fetchWsiWeights();

    // Load WSI history
    const fetchWsiHistory = async () => {
      try {
        const res = await fetch('/api/wsi-history');
        if (!res.ok) throw new Error('History fetch failed');
        const json = await res.json();
        setWsiHistory(Array.isArray(json.points) ? json.points : []);
      } catch (err) {
        console.error('WSI history error:', err);
      }
    };
    fetchWsiHistory();

    // Also try websocket to keep in sync if available
    import('socket.io-client').then(({ io }) => {
      const socket = io(SOCKET_SERVER_URL);
      socket.on('connect', () => {});
      socket.on('new-alert', (parsedAlert) => {
        if (!isMounted) return;
        setAlerts(prev => {
          const filtered = prev.filter(a => a.id !== parsedAlert.id);
          return [parsedAlert, ...filtered];
        });
      });
      socket.on('disconnect', () => {});
      socket.on('connect_error', () => {});
      // Cleanup
      const cleanup = () => socket.disconnect();
      // Attach cleanup to effect return
      (WeatherStatsPage.__cleanup = cleanup);
    }).catch(() => {
      // If socket import fails (e.g., code splitting), it's fine; we already have initial stats
    });

    return () => {
      isMounted = false;
      if (typeof WeatherStatsPage.__cleanup === 'function') {
        try { WeatherStatsPage.__cleanup(); } catch {}
      }
    };
  }, []);

  // Load LSR once (reuse logic from LsrListPage but only need the count)
  useEffect(() => {
    let isMounted = true;

    const fetchReports = () => {
      setLsrLoading(true);
      fetch('https://mesonet.agron.iastate.edu/geojson/lsr.geojson?&hours=24')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (!isMounted) return;
          if (data && data.features) {
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

            const filteredReports = data.features
              .map(feature => {
                const p = feature.properties;
                return {
                  id: feature.id || p.product_id || p.id,
                  valid: p.valid,
                  type: p.typetext || p.type,
                  magnitude: Number(p.magnitude) || Number(p.magf) || null,
                  units: p.unit || '',
                  remarks: p.remark || '',
                };
              })
              .filter(report => {
                if (!report.valid) return false;
                const reportTime = new Date(report.valid);
                if (reportTime < todayStart || reportTime >= todayEnd) return false;

                const description = (report.type || '').toLowerCase();
                if (description.includes('rain') ||
                    description.includes('heavy rain') ||
                    description.includes('excessive rainfall') ||
                    description.includes('rainfall') ||
                    description.includes('precipitation') ||
                    description.includes('flooding rain') ||
                    description.includes('flood')) {
                  return false;
                }
                return true;
              });
 
              // Sort by most recent first
              const sortedReports = filteredReports.sort((a, b) => {
                const ta = a.valid ? new Date(a.valid).getTime() : 0;
                const tb = b.valid ? new Date(b.valid).getTime() : 0;
                return tb - ta; // descending: newest first
              });
 
              setLsrReports(sortedReports);
              setLsrError(null);
          } else {
            setLsrReports([]);
          }
          setLsrLoading(false);
        })
        .catch(err => {
          if (!isMounted) return;
          setLsrError(err.message);
          setLsrLoading(false);
        });
    };

    fetchReports();

    // periodic refresh to keep stats reasonably fresh
    const intervalId = setInterval(fetchReports, 300000); // 5 minutes
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const totalActiveWarnings = useMemo(() => {
    if (!alerts || alerts.length === 0) return 0;
    return alerts.filter(a => isAlertActive(a.expires)).length;
  }, [alerts]);
 
  const totalStormReports = useMemo(() => {
    return lsrReports?.length || 0;
  }, [lsrReports]);

  // Build histogram data for charts
  const warningsByType = useMemo(() => {
    const counts = new Map();
    alerts
      .filter(a => isAlertActive(a.expires))
      .forEach(a => {
        const key = (a.producttype || 'Alert').toString();
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
  }, [alerts]);

  const reportsByType = useMemo(() => {
    const counts = new Map();
    lsrReports.forEach(r => {
      const key = (r.type || 'Report').toString();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
  }, [lsrReports]);

  // --- WSI helpers (uses server-provided weights) ---
  // NOTE: WSI is now unbounded (no categorical caps); we still keep weights and decay the same.
  const parseInches = (val) => {
    if (!val && val !== 0) return null;
    const n = Number(String(val).replace(/[^0-9.]/g, ''));
    return isFinite(n) ? n : null;
  };
  const parseWind = (val) => {
    if (!val && val !== 0) return null;
    const n = Number(String(val).replace(/[^0-9.]/g, ''));
    return isFinite(n) ? n : null;
  };
  const parseEF = (remarks) => {
    if (!remarks) return null;
    const m = String(remarks).match(/EF\s*([0-5])/i);
    return m ? Number(m[1]) : null;
  };
  const decay = (ageHours, halfLife) => Math.exp(-Math.log(2) * ageHours / halfLife);
  const hoursSince = (ts) => {
    if (!ts) return 0;
    const t = new Date(ts).getTime();
    if (isNaN(t)) return 0;
    return (Date.now() - t) / 3600000;
  };
  const normalizeType = (s) => (s || '').toLowerCase();

  const computeWSI = useMemo(() => {
    if (!wsiWeights) return () => 0;
    const weights = wsiWeights;
    const now = Date.now();

    // Alerts score
    let alertsScore = 0;
    const halfLifeAlerts = (weights.halfLives?.alertsHours ?? 6);

    alerts.filter(a => isAlertActive(a.expires)).forEach(a => {
      const t = normalizeType(a.producttype || a.productType);
      const base =
        weights.alertBase?.[t] ??
        (t.includes('tornado warning') ? 10 :
         t.includes('severe thunderstorm warning') ? 6 :
         t.includes('flash flood warning') ? 5 :
         t.includes('tornado watch') ? 4 :
         t.includes('severe thunderstorm watch') ? 3 :
         t.includes('special weather statement') ? 2 :
         t.includes('advisory') ? 2 : 1);

      // bonuses
      let bonus = 0;
      // thunderstorm damage threat
      const tdt = normalizeType(a.thunderstormDamageThreat);
      if (tdt) {
        const tdtW = weights.alertBonuses?.thunderstormDamageThreat || {};
        if (tdt.includes('destructive')) bonus += tdtW.destructive ?? 8;
        else if (tdt.includes('considerable')) bonus += tdtW.considerable ?? 5;
        else bonus += tdtW.base ?? 2;
      }
      // tornado detection
      const td = normalizeType(a.tornado_detection);
      if (td) {
        const tdW = weights.alertBonuses?.tornadoDetection || {};
        if (td.includes('observed')) bonus += tdW.observed ?? 12;
        else bonus += tdW.radar ?? 8;
      }
      // hail
      const hailW = weights.alertBonuses?.hail || {};
      const hail = parseInches(a.max_hail_size);
      if (hail && hail > (hailW.thresholdInches ?? 0.75)) {
        const over = hail - (hailW.thresholdInches ?? 0.75);
        const inc = (hailW.perQuarterInch ?? 0.5) * Math.ceil(over / 0.25);
        bonus += Math.min(inc, hailW.maxBonus ?? 8);
      }
      // wind
      const windW = weights.alertBonuses?.wind || {};
      const wind = parseWind(a.max_wind_gust);
      if (wind && wind >= (windW.thresholdMph ?? 50)) {
        const extra = Math.max(0, wind - (windW.thresholdMph ?? 50));
        const add = (windW.atThreshold ?? 1) + (windW.per5Mph ?? 0.5) * Math.floor(extra / 5);
        bonus += Math.min(add, windW.maxBonus ?? 8);
      }
      // multi-state coverage
      if (Array.isArray(a.states) && a.states.length > 1) {
        const msW = weights.alertBonuses?.multiState || {};
        bonus += Math.min((a.states.length - 1) * (msW.perStateBeyondOne ?? 1), msW.maxBonus ?? 5);
      }

      const issuedTs = a.onset || a.sent || a.updated || a.expires;
      const ageHrs = hoursSince(issuedTs);
      const d = decay(ageHrs, halfLifeAlerts);
      alertsScore += (base + bonus) * d;
    });

    // Reports score
    let reportsScore = 0;
    const halfLifeReports = (weights.halfLives?.reportsHours ?? 9);

    lsrReports.forEach(r => {
      const t = normalizeType(r.type);
      const rb = weights.reportBase || {};
      let base = rb[t] ?? (
        t.includes('tornado') ? 12 :
        (t.includes('wind dmg') || t.includes('wind damage')) ? 6 :
        t.includes('wind gust') ? 4 :
        t.includes('hail') ? 4 :
        t.includes('funnel') ? 5 :
        (t.includes('blizzard') || t.includes('ice')) ? 6 :
        3
      );

      let bonus = 0;
      const rbon = weights.reportBonuses || {};

      if (t.includes('tornado')) {
        const ef = parseEF(r.remarks);
        const efMap = rbon.tornado?.ef || {};
        if (ef != null && efMap[String(ef)] != null) bonus += efMap[String(ef)];
        if ((r.remarks || '').toLowerCase().includes('debris')) bonus += rbon.tornado?.debris ?? 4;
      }
      if (t.includes('hail')) {
        const hailW = rbon.hail || {};
        const hail = parseInches(r.magnitude);
        if (hail && hail > (hailW.thresholdInches ?? 0.75)) {
          const over = hail - (hailW.thresholdInches ?? 0.75);
          const inc = (hailW.perQuarterInch ?? 0.5) * Math.ceil(over / 0.25);
          bonus += Math.min(inc, hailW.maxBonus ?? 6);
        }
      }
      if (t.includes('wind')) {
        const windW = rbon.wind || {};
        const wind = parseWind(r.magnitude);
        if (wind && wind >= (windW.thresholdMph ?? 50)) {
          const extra = Math.max(0, wind - (windW.thresholdMph ?? 50));
          const add = (windW.atThreshold ?? 1) + (windW.per5Mph ?? 0.5) * Math.floor(extra / 5);
          bonus += Math.min(add, windW.maxBonus ?? 6);
        }
      }
      const remarks = (r.remarks || '').toLowerCase();
      const boosts = rbon.remarksBoosts || {};
      if (remarks.includes('widespread')) bonus += boosts.widespread ?? 0;
      if (remarks.includes('significant')) bonus += boosts.significant ?? 0;
      if (remarks.includes('catastrophic')) bonus += boosts.catastrophic ?? 0;

      const ageHrs = hoursSince(r.valid);
      const d = decay(ageHrs, halfLifeReports);
      reportsScore += (base + bonus) * d;
    });

    // Restore original logic EXACTLY (pre-change), just don't clamp the final result.
    // raw = 100 * (aw * min(A,aCap)/aCap + rw * min(R,rCap)/rCap)
    const aCap = (wsiWeights.caps?.alertsScore ?? 250);
    const rCap = (wsiWeights.caps?.reportsScore ?? 250);
    const aw = (wsiWeights.blend?.alertsWeight ?? 0.6);
    const rw = (wsiWeights.blend?.reportsWeight ?? 0.4);

    const normAlerts = (aCap > 0) ? Math.min(alertsScore, aCap) / aCap : 0;
    const normReports = (rCap > 0) ? Math.min(reportsScore, rCap) / rCap : 0;

    const raw = 100 * (aw * normAlerts + rw * normReports);

    // If something upstream produced a non-finite, fall back to last known (prevents 0/Infinity issues)
    const safeRaw = Number.isFinite(raw) ? raw : (Number.isFinite(lastWsiRef.current) ? lastWsiRef.current : 0);

    // console.debug('WSI debug', { alertsScore, reportsScore, aCap, rCap, aw, rw, normAlerts, normReports, raw, safeRaw });
    return () => Math.round(safeRaw);
  }, [alerts, lsrReports, wsiWeights]);

  // compute and post WSI periodically (align with LSR refresh or alerts updates)
  useEffect(() => {
    if (!wsiWeights) return;
    const val = computeWSI();
    // smoothing + hysteresis (simple)
    const prev = lastWsiRef.current || 0;
    // Guard non-finite values; if val is not finite, don't update and keep previous
    const finiteVal = Number.isFinite(val) ? val : prev;
    const smoothed = Math.round(0.7 * prev + 0.3 * finiteVal);
    if (Number.isFinite(finiteVal) && Math.abs(smoothed - prev) >= 1) {
      lastWsiRef.current = smoothed;
      setWsi(smoothed);
      // category no longer used for display, but keep stable string for potential telemetry
      setWsiCategory('');
      // post to backend history
      fetch('/api/wsi-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: smoothed })
      }).then(() => {
        // refresh local history after append
        fetch('/api/wsi-history').then(r => r.json()).then(json => {
          setWsiHistory(Array.isArray(json.points) ? json.points : []);
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [computeWSI, wsiWeights]);

  // Prepare LineChart data
  const wsiLineData = useMemo(() => {
    return (wsiHistory || []).map(p => ({
      ts: new Date(p.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      value: p.value
    }));
  }, [wsiHistory]);

  // Category color no longer used; keep a neutral class for compatibility
  const categoryClass = 'text-slate-300';

  return (
    <motion.div 
      className="container mx-auto p-2 md:p-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <h1 className="text-2xl md:text-3xl font-bold mb-1 text-center">Weather Stats</h1>
      {/* WSI Display */}
      <div className="mx-auto max-w-5xl mb-4">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-1">
            <CardTitle className="text-slate-200 text-base md:text-lg">Weather Severity Index</CardTitle>
            {wsiError && <CardDescription className="text-red-300 text-xs md:text-sm">{wsiError}</CardDescription>}
            {!wsiError && (
              <CardDescription className="text-slate-400 text-xs md:text-sm">
                Composite severity from active alerts and verified reports with time decay and configurable weights.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <div className="text-4xl md:text-5xl font-extrabold text-slate-100">{Number.isFinite(wsi) ? wsi : 0}</div>
                </div>
                <div className="w-full h-24 md:h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={wsiLineData} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="ts" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#e2e8f0' }} />
                      <Line type="monotone" dataKey="value" stroke="#86efac" strokeWidth={1.75} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* WSI legend removed – unbounded index */}
            </div>
          </CardContent>
        </Card>
      </div>

      {(alertsError || lsrError) && (
        <div className="mb-4">
          {alertsError && (
            <Alert variant="destructive" className="mb-2">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Alerts data error: {alertsError}</AlertDescription>
            </Alert>
          )}
          {lsrError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Storm reports data error: {lsrError}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Make each card focusable and handle keyboard; ensure clicks inside content don't bubble */}
      {/* Restore original horizontal sizing: two summary cards side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Compact summary cards with value aligned to the right of the title */}
        <div
          role="button"
          tabIndex={0}
          className={`rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${expandedCard === 'warnings' ? 'ring-2 ring-blue-400' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpandedCard(prev => (prev === 'warnings' ? null : 'warnings'));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setExpandedCard(prev => (prev === 'warnings' ? null : 'warnings'));
            }
          }}
        >
          <Card className="border-blue-500 bg-blue-950 h-[64px] flex items-center">
            <CardHeader className="py-0 h-full w-full">
              <div className="flex items-center justify-between gap-2 h-full translate-y-[-4px]">
                <CardTitle className="text-blue-200 text-sm md:text-base">Total Active Weather Warnings</CardTitle>
                <div className="text-xl md:text-2xl font-bold text-blue-100 select-none leading-none">
                  {alertsLoading ? '…' : totalActiveWarnings}
                </div>
              </div>
            </CardHeader>
            <CardContent className="hidden">
              {expandedCard === 'warnings' && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {alertsLoading ? (
                    <div className="text-blue-200/80 text-xs md:text-sm">Loading alerts…</div>
                  ) : (
                    alerts
                      .filter(a => isAlertActive(a.expires))
                      .map((a, idx) => (
                        <div key={a.id || `${a.headline}-${a.expires}-${idx}`} className="rounded-md border border-blue-700/50 bg-blue-900/30 p-2">
                          <div className="text-blue-100 text-xs md:text-sm font-medium">
                            {a.producttype || 'Weather Alert'}
                          </div>
                          <div className="text-blue-200/80 text-[10px] md:text-[11px] mt-1">
                            {a.affectedarea || 'Area not specified'}
                          </div>
                          <div className="text-blue-300/70 text-[10px] md:text-[11px] mt-1">
                            Expires: {(() => {
                              try {
                                return a.expires ? new Date(a.expires).toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'N/A';
                              } catch { return a.expires || 'N/A'; }
                            })()}
                          </div>
                        </div>
                      ))
                  )}
                  {!alertsLoading && alerts.filter(a => isAlertActive(a.expires)).length === 0 && (
                    <div className="text-blue-200/80 text-xs md:text-sm">No active alerts.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
 
        <div
          role="button"
          tabIndex={0}
          className={`rounded-md outline-none focus-visible:ring-2 focus-visible:ring-green-400 ${expandedCard === 'reports' ? 'ring-2 ring-green-400' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpandedCard(prev => (prev === 'reports' ? null : 'reports'));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setExpandedCard(prev => (prev === 'reports' ? null : 'reports'));
            }
          }}
        >
          <Card className="border-green-500 bg-green-950 h-[64px] flex items-center">
            <CardHeader className="py-0 h-full w-full">
              <div className="flex items-center justify-between gap-2 h-full translate-y-[-4px]">
                <CardTitle className="text-green-200 text-sm md:text-base">Total Storm Reports (Today)</CardTitle>
                <div className="text-xl md:text-2xl font-bold text-green-100 select-none leading-none">
                  {lsrLoading ? '…' : totalStormReports}
                </div>
              </div>
            </CardHeader>
            <CardContent className="hidden">
              {expandedCard === 'reports' && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {lsrLoading ? (
                    <div className="text-green-200/80 text-xs md:text-sm">Loading storm reports…</div>
                  ) : (
                    lsrReports.map((r, idx) => (
                      <div key={r.id || `${r.type}-${r.valid}-${idx}`} className="rounded-md border border-green-700/50 bg-green-900/30 p-2">
                        <div className="text-green-100 text-xs md:text-sm font-medium">
                          {r.type || 'Storm Report'}
                        </div>
                        <div className="text-green-200/80 text-[10px] md:text-[11px] mt-1">
                          {r.valid ? new Date(r.valid).toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'N/A'}
                        </div>
                        {(r.magnitude !== null && r.magnitude !== undefined) && (
                          <div className="text-green-300/80 text-[10px] md:text-[11px] mt-1">
                            Magnitude: {r.magnitude} {r.units || ''}
                          </div>
                        )}
                        {r.remarks && (
                          <div className="text-green-200/70 text-[10px] md:text-[11px] mt-1">
                            {r.remarks}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {!lsrLoading && lsrReports.length === 0 && (
                    <div className="text-green-200/80 text-xs md:text-sm">No storm reports found for today.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
 
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Warnings by Type */}
        <Card className="bg-blue-950/40 border border-blue-800/40">
          <CardHeader className="py-3">
            <CardTitle className="text-blue-200 text-base">Active Warnings by Type</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 300, paddingBottom: 16 }}>
            {alertsLoading ? (
              <div className="text-blue-200/80 text-sm">Loading…</div>
            ) : warningsByType.length === 0 ? (
              <div className="text-blue-200/80 text-sm">No active warnings.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={warningsByType} margin={{ top: 6, right: 12, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="type" tick={{ fill: '#bfdbfe', fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#bfdbfe', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#e2e8f0' }} />
                  <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Reports by Type */}
        <Card className="bg-green-950/40 border border-green-800/40">
          <CardHeader className="py-3">
            <CardTitle className="text-green-200 text-base">Storm Reports by Type (Today)</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 300, paddingBottom: 16 }}>
            {lsrLoading ? (
              <div className="text-green-200/80 text-sm">Loading…</div>
            ) : reportsByType.length === 0 ? (
              <div className="text-green-200/80 text-sm">No reports found for today.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportsByType} margin={{ top: 6, right: 12, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="type" tick={{ fill: '#bbf7d0', fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#bbf7d0', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#052e1b', borderColor: '#064e3b', color: '#e2e8f0' }} />
                  <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 text-xs md:text-sm text-muted-foreground text-center">
        {alertsLoading || lsrLoading ? 'Loading data…' : 'Statistics updated periodically.'}
      </div>
    </motion.div>
  );
}

export default WeatherStatsPage;