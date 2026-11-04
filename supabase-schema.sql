-- Skema database untuk Nongkrong Yuk!
-- Jalankan di Supabase SQL Editor

-- Table: events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT DEFAULT 'Asia/Jakarta',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  day_start_min INTEGER DEFAULT 600, -- 10:00 = 600 menit
  day_end_min INTEGER DEFAULT 1380,  -- 23:00 = 1380 menit
  slot_minutes INTEGER DEFAULT 30,
  min_duration_min INTEGER DEFAULT 120,
  locked_start_utc TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_events_expires ON events(expires_at);

-- Table: participants
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  chibi TEXT NOT NULL,
  edit_token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_unique_name 
  ON participants(event_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);

-- Table: availability (menyimpan slot waktu per partisipan)
CREATE TABLE IF NOT EXISTS availability (
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL, -- format: "dayIndex-hour" (e.g., "0-19")
  status TEXT NOT NULL CHECK (status IN ('g', 'y', 'r')), -- green/yellow/red
  PRIMARY KEY (participant_id, slot_key)
);

CREATE INDEX IF NOT EXISTS idx_availability_participant ON availability(participant_id);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Policies: semua orang bisa read (karena tanpa login)
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Public read availability" ON availability FOR SELECT USING (true);

-- Insert policies (via API dengan validasi)
CREATE POLICY "Public insert events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert availability" ON availability FOR INSERT WITH CHECK (true);

-- Update/delete policies (nanti bisa ditambahkan token check)
CREATE POLICY "Public update availability" ON availability FOR UPDATE USING (true);
CREATE POLICY "Public delete availability" ON availability FOR DELETE USING (true);

-- Function untuk cleanup acara expired (cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_events()
RETURNS void AS $$
BEGIN
  DELETE FROM events WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
