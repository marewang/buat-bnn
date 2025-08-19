export async function updateASN(id, payload) {
  const r = await fetch(`/api/asn/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { let t=''; try{t=await r.text();}catch{}; throw new Error(`Failed update (${r.status}): ${t}`); }
  return r.json();
}

export async function deleteASN(id) {
  const r = await fetch(`/api/asn/${id}`, { method: 'DELETE' });
  if (!r.ok) { let t=''; try{t=await r.text();}catch{}; throw new Error(`Failed delete (${r.status}): ${t}`); }
  return true;
}
