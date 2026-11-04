// API Backend Configuration
const API_URL = 'http://localhost:3001/api';

// Override localStorage functions dengan API calls
const originalEv = window.ev || {};
const originalMe = window.me || {};

// Helper: API fetch wrapper
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(API_URL + endpoint, opts);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'API Error');
  }
  return res.json();
}

// Override buat() function - create event via API
window.buatEventAPI = async function(name, days, owner, ownerChibi) {
  try {
    const result = await apiCall('/events', 'POST', {
      name,
      days,
      owner,
      ownerChibi
    });
    
    // Simpan editToken dan participantId ke localStorage untuk auth nanti
    const tokens = JSON.parse(localStorage.getItem('nk_tokens') || '{}');
    tokens[result.id] = { editToken: result.editToken };
    localStorage.setItem('nk_tokens', JSON.stringify(tokens));
    
    // Simpan me
    me[result.id] = owner;
    save('nk_me', me);
    
    return result.id;
  } catch (e) {
    console.error('Create event error:', e);
    throw e;
  }
};

// Override room() - load event from API
window.loadEventAPI = async function(id) {
  try {
    const event = await apiCall('/events/' + id);
    
    // Convert format dari API ke format localStorage
    ev[id] = {
      name: event.name,
      days: event.days,
      owner: event.owner,
      people: event.people,
      t: event.t
    };
    save('nk_ev', ev);
    
    return ev[id];
  } catch (e) {
    console.error('Load event error:', e);
    return null;
  }
};

// Override gabung partisipan
window.joinEventAPI = async function(eventId, name, chibi) {
  try {
    const result = await apiCall('/events/' + eventId + '/participants', 'POST', {
      name,
      chibi
    });
    
    // Simpan token
    const tokens = JSON.parse(localStorage.getItem('nk_tokens') || '{}');
    if (!tokens[eventId]) tokens[eventId] = {};
    tokens[eventId].participantId = result.participantId;
    tokens[eventId].editToken = result.editToken;
    localStorage.setItem('nk_tokens', JSON.stringify(tokens));
    
    // Simpan me
    me[eventId] = name;
    save('nk_me', me);
    
    return result;
  } catch (e) {
    console.error('Join event error:', e);
    throw e;
  }
};

// Override simpan availability
window.saveAvailabilityAPI = async function(eventId, participantId, slots, editToken) {
  try {
    await apiCall(
      '/events/' + eventId + '/participants/' + participantId + '/availability',
      'PUT',
      { slots, editToken }
    );
    return true;
  } catch (e) {
    console.error('Save availability error:', e);
    throw e;
  }
};

// Polling untuk auto-refresh data (setiap 5 detik)
let pollInterval = null;
window.startPolling = function(eventId) {
  if (pollInterval) clearInterval(pollInterval);
  
  pollInterval = setInterval(async () => {
    if (document.visibilityState === 'hidden') return;
    
    try {
      await loadEventAPI(eventId);
      // Trigger refresh UI jika di halaman room
      if (curId === eventId && typeof refresh === 'function') {
        refresh(eventId);
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
  }, 5000);
};

window.stopPolling = function() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

console.log('API integration loaded. Use window.buatEventAPI, loadEventAPI, joinEventAPI, saveAvailabilityAPI');
