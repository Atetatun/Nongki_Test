const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  'https://aphnnkggramqnsvdxjfj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwaG5ua2dncmFtcW5zdmR4amZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MzQzOTUsImV4cCI6MjEwOTMxMDM5NX0.gx7QYq3puQ5JgG95Fr9Egy1SkWX_zqslLbGpMuF17cU'
);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// POST /events - Buat acara baru
app.post('/events', async (req, res) => {
  const { name, days, owner, ownerChibi } = req.body;
  
  if (!name || !days || !owner || !ownerChibi) {
    return res.status(400).json({ error: { code: 'missing_fields', message: 'Nama, days, owner, dan ownerChibi wajib diisi' } });
  }

  const id = 'room-' + nanoid(6);
  const editToken = nanoid(32);
  
  const { error: eventError } = await supabase.from('events').insert({
    id,
    name,
    start_date: days[0],
    end_date: days[days.length - 1]
  });

  if (eventError) {
    return res.status(500).json({ error: { code: 'create_failed', message: eventError.message } });
  }

  const { error: participantError } = await supabase.from('participants').insert({
    event_id: id,
    name: owner,
    chibi: ownerChibi,
    edit_token_hash: hashToken(editToken)
  });

  if (participantError) {
    return res.status(500).json({ error: { code: 'participant_failed', message: participantError.message } });
  }

  res.json({ id, url: `https://atetatun.github.io/Nongki_Test/#${id}`, editToken });
});

// GET /events/:id - Dapatkan detail acara
app.get('/events/:id', async (req, res) => {
  const { id } = req.params;

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (eventError || !event) {
    return res.status(404).json({ error: { code: 'not_found', message: 'Acara tidak ditemukan' } });
  }

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, chibi, created_at')
    .eq('event_id', id);

  const participantIds = (participants || []).map(p => p.id);
  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .in('participant_id', participantIds);

  const availabilityMap = {};
  (availability || []).forEach(a => {
    if (!availabilityMap[a.participant_id]) availabilityMap[a.participant_id] = {};
    availabilityMap[a.participant_id][a.slot_key] = a.status;
  });

  const people = {};
  (participants || []).forEach(p => {
    people[p.name] = {
      c: p.chibi,
      s: availabilityMap[p.id] || {}
    };
  });

  const days = [];
  let d = new Date(event.start_date + 'T00:00');
  const end = new Date(event.end_date + 'T00:00');
  while (d <= end) {
    days.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }

  res.json({
    id: event.id,
    name: event.name,
    days,
    people,
    owner: Object.keys(people)[0] || '',
    t: new Date(event.created_at).getTime()
  });
});

// POST /events/:id/participants - Gabung sebagai partisipan
app.post('/events/:id/participants', async (req, res) => {
  const { id } = req.params;
  const { name, chibi } = req.body;

  if (!name || !chibi) {
    return res.status(400).json({ error: { code: 'missing_fields', message: 'Nama dan chibi wajib diisi' } });
  }

  const editToken = nanoid(32);

  const { data, error } = await supabase.from('participants').insert({
    event_id: id,
    name,
    chibi,
    edit_token_hash: hashToken(editToken)
  }).select().single();

  if (error) {
    return res.status(400).json({ error: { code: 'insert_failed', message: error.message } });
  }

  res.json({ participantId: data.id, editToken });
});

// PUT /events/:id/participants/:pid/availability - Update ketersediaan
app.put('/events/:id/participants/:pid/availability', async (req, res) => {
  const { id, pid } = req.params;
  const { slots, editToken } = req.body;

  if (!editToken) {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'Token edit diperlukan' } });
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('*')
    .eq('id', pid)
    .eq('event_id', id)
    .single();

  if (!participant || participant.edit_token_hash !== hashToken(editToken)) {
    return res.status(403).json({ error: { code: 'forbidden', message: 'Token tidak valid' } });
  }

  await supabase.from('availability').delete().eq('participant_id', pid);

  if (slots && Object.keys(slots).length > 0) {
    const records = Object.entries(slots).map(([slot_key, status]) => ({
      participant_id: pid,
      slot_key,
      status
    }));

    const { error } = await supabase.from('availability').insert(records);
    if (error) {
      return res.status(500).json({ error: { code: 'update_failed', message: error.message } });
    }
  }

  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
