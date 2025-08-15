// src/lib/apiClient.js
export async function listASN() {
  const r = await fetch('/api/asn');
  if (!r.ok) throw new Error('Failed list');
  return r.json();
}

export async function createASN(payload) {
  const r = await fetch('/api/asn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('Failed create');
  return r.json();
}

export async function getASN(id) {
  const r = await fetch(`/api/asn/${id}`);
  if (!r.ok) throw new Error('Failed get');
  return r.json();
}

export async function updateASN(id, payload) {
  const r = await fetch(`/api/asn/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('Failed update');
  return r.json();
}

export async function deleteASN(id) {
  const r = await fetch(`/api/asn/${id}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error('Failed delete');
  return true;
}

export async function listNotif() {
  const r = await fetch('/api/notif');
  if (!r.ok) throw new Error('Failed notif');
  return r.json();
}

export async function health() {
  const r = await fetch('/api/health');
  return r.json();
}
