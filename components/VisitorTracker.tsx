'use client';
import { useEffect } from 'react';

export default function VisitorTracker() {
  useEffect(() => {
    try {
      let sessionId = localStorage.getItem('bheeshma_visitor_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('bheeshma_visitor_id', sessionId);
      }

      // Check if we hit the API in the last 15 minutes to avoid spam API calls
      const lastHit = sessionStorage.getItem('bheeshma_visitor_hit');
      const now = Date.now();
      
      if (!lastHit || now - Number(lastHit) > 15 * 60 * 1000) {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        sessionStorage.setItem('bheeshma_visitor_hit', String(now));
      }
    } catch (err) {
      console.warn('Analytics failed gracefully.');
    }
  }, []);

  return null;
}
