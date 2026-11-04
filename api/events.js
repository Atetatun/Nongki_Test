const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');
const crypto = require('crypto');

const supabase = createClient(
  'https://aphnnkggramqnsvdxjfj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwaG5ua2dncmFtcW5zdmR4amZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MzQzOTUsImV4cCI6MjEwOTMxMDM5NX0.gx7QYq3puQ5JgG95Fr9Egy1SkWX_zqslLbGpMuF17cU'
);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = req.url.split('?')[0];
  const parts = url.split('/').filter(Boolean);
  // parts: ['api', 'events'] or ['api', 'events', 'room-xxx'] etc.
  const apiIndex = parts.indexOf('events');
  const routeParts = apiIndex !== -1 ? parts.slice(apiIndex) : parts;
  // routeParts: ['events'] or ['events', 'room-xxx'] etc.

  try {
    // 1. POST /api/events
    if (req.method === 'POST' && routeParts.length === 1 && routeParts[0] === 'events') {
      const { name, days, owner, ownerChibi } = req.body || {};
      if (!name || !days || !owner || !ownerChibi) {
        return res.status(400).json({ error: { code: 'missing_fields', message: 'Field tidak lengkap' } });
      }
      const id = 'room-' + nanoid(6);
      const editToken = nanoid(32);
      
      const { error: eventError } = await supabase.from('events').insert({
        id, name, start_date: days[0], end_date: days[days.length - 1]
      });
      if (eventError) return res.status(500).json({ error: eventError.message });

      const { error: partError } = await supabase.from('participants').insert({
        event_id: id, name: owner, chibi: ownerChibi, edit_token_hash: hashToken(editToken)
      });
      if (partError) return res.status(500).json({ error: partError.message });

      return res.json({ id, url: `https://atetatun.github.io/Nongki_Test/#${id}`, editToken });
    }

    // 2. GET /api/events/:id
    if (req.method === 'GET' && routeParts.length === 2 && routeParts[0] === 'events') {
      const id = routeParts[1];
      const { data: event, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (error || !event) return res.status(404).json({ error: 'Not found' });

      const { data: participants } = await supabase.from('participants').select('*').eq('event_id', id);
      const partIds = (participants || []).map(p => p.id);
      const { data: availability } = await supabase.from('availability').select('*').in('participant_id', partIds);

      const availabilityMap = {};
      (availability || []).forEach(a => {
        if (!availabilityMap[a.participant_id]) availabilityMap[a.participant_id] = {};
        availabilityMap[a.participant_id][a.slot_key] = a.status;
      });

      const people = {};
      (participants || []).forEach(p => {
        people[p.name] = { c: p.chibi, s: availabilityMap[p.id] || {} };
      });

      const days = [];
      let d = new Date(event.start_date + 'T00:00');
      const end = new Date(event.end_date + 'T00:00');
      while (d <= end) {
        days.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
      }

      return res.json({ id: event.id, name: event.name, days, people, owner: Object.keys(people)[0] || '', t: new Date(event.created_at).getTime() });
    }

    // 3. POST /api/events/:id/participants
    if (req.method === 'POST' && routeParts.length === 3 && routeParts[0] === 'events' && routeParts[2] === 'participants') {
      const id = routeParts[1];
      const { name, chibi } = req.body || {};
      const editToken = nanoid(32);
      const { data, error } = await supabase.from('participants').insert({
        event_id: id, name, chibi, edit_token_hash: hashToken(editToken)
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ participantId: data.id, editToken });
    }

    // 4. PUT /api/events/:id/participants/:pid/availability
    if (req.method === 'PUT' && routeParts.length === 5 && routeParts[0] === 'events' && routeParts[2] === 'participants' && routeParts[4] === 'availability') {
      const id = routeParts[1];
      const pid = routeParts[3];
      const { slots, editToken } = req.body || {};
      const { data: participant } = await supabase.from('participants').select('*').eq('id', pid).eq('event_id', id).single();
      if (!participant || participant.edit_token_hash !== hashToken(editToken)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      await supabase.from('availability').delete().eq('participant_id', pid);
      if (slots && Object.keys(slots).length > 0) {
        const records = Object.entries(slots).map(([slot_key, status]) => ({ participant_id: pid, slot_key, status }));
        await supabase.from('availability').insert(records);
      }
      return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Endpoint not found', routeParts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
