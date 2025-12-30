// Basic client-side statistics utilities for collecting drawing and recognition data
export type DrawRecord = {
  timestamp: number;
  durationMs: number;
  brushSize: number;
  brushColor: string;
  result?: string;
  localResults?: { label: string; prob: number }[];
};

const recordsKey = 'draw_stats_v1';

export function saveRecord(record: DrawRecord) {
  const raw = localStorage.getItem(recordsKey);
  const arr: DrawRecord[] = raw ? JSON.parse(raw) : [];
  arr.push(record);
  localStorage.setItem(recordsKey, JSON.stringify(arr));
}

export function loadRecords(): DrawRecord[] {
  const raw = localStorage.getItem(recordsKey);
  return raw ? JSON.parse(raw) : [];
}

export function computeAccuracy() {
  const recs = loadRecords();
  let total = 0;
  let correct = 0;
  for (const r of recs) {
    if (r.result && r.localResults) {
      total += 1;
      const match = r.localResults.some(l => r.result!.includes(l.label));
      if (match) correct += 1;
    }
  }
  return { total, correct, accuracy: total ? correct / total : 0 };
}

