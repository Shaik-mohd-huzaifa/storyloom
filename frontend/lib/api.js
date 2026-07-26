// Shared fetch helper for the backend API. Tries the Docker-internal hostname first
// (works when the frontend container calls the backend container), then falls back to
// localhost (works when running the frontend outside Docker, e.g. `npm run dev`).

const CANDIDATE_BASES = ['http://backend:8000', 'http://localhost:8000'];

async function apiFetch(path, options) {
  let lastError;
  for (const base of CANDIDATE_BASES) {
    try {
      const response = await fetch(`${base}${path}`, options);
      return response;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function getEntities() {
  const response = await apiFetch('/api/entities');
  if (!response.ok) throw new Error(`GET /api/entities failed: ${response.status}`);
  const data = await response.json();
  return data.entities || [];
}

export async function getEpisodes() {
  const response = await apiFetch('/api/episodes');
  if (!response.ok) throw new Error(`GET /api/episodes failed: ${response.status}`);
  const data = await response.json();
  return data.episodes || [];
}

export async function startChat({ message, mode, contextChips, episode, cursorContext, nOptions, history }) {
  const response = await apiFetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      mode,
      context_chips: contextChips || [],
      episode: episode || null,
      cursor_context: cursorContext || null,
      n_options: nOptions || null,
      history: history || [],
    }),
  });
  if (!response.ok) throw new Error(`POST /chat failed: ${response.status}`);
  return response.json(); // { run_id }
}

export async function getChatStatus(runId) {
  const response = await apiFetch(`/chat/${runId}/status`);
  if (!response.ok) throw new Error(`GET /chat/${runId}/status failed: ${response.status}`);
  return response.json(); // { run_id, status, current_step, message, error }
}
