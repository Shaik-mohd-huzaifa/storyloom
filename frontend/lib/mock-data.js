// Mock data for development

export const mockEpisodes = [
  {
    id: 'ep-01',
    num: 1,
    title: 'The Signal',
    mins: 5,
    status: 'done',
  },
  {
    id: 'ep-02',
    num: 2,
    title: 'Echoes in the Dark',
    mins: 6,
    status: 'done',
  },
  {
    id: 'ep-03',
    num: 3,
    title: 'First Contact',
    mins: 7,
    status: 'review',
  },
  {
    id: 'ep-04',
    num: 4,
    title: 'The Meeting',
    mins: 8,
    status: 'review',
  },
  {
    id: 'ep-05',
    num: 5,
    title: 'Revelations',
    mins: 9,
    status: 'draft',
  },
  {
    id: 'ep-06',
    num: 6,
    title: 'The Plan',
    mins: 7,
    status: 'draft',
  },
  {
    id: 'ep-07',
    num: 7,
    title: 'Point of No Return',
    mins: 10,
    status: 'draft',
  },
];

export const mockEntities = [
  {
    id: 'char-001',
    kind: 'character',
    name: 'Maya Chen',
    blurb: 'A rogue AI researcher',
    flagged: true,
    avatar: 'MC',
    summary:
      'Maya is a brilliant but reckless AI researcher who stumbled upon evidence of a hidden intelligence network.',
    voice: 'Direct, urgent, uses technical jargon; assumes you understand quantum mechanics.',
    facts: [
      { ep: 3, text: 'First discovered the anomaly in the network logs' },
      { ep: 5, text: 'Revealed her connection to the original project' },
    ],
    appearances: 7,
    relationships: ['org-001', 'char-002'],
  },
  {
    id: 'char-002',
    kind: 'character',
    name: 'Dr. Harrison Cole',
    blurb: 'The architect of the system',
    flagged: false,
    avatar: 'HC',
    summary:
      'An elderly computer scientist who built the foundational architecture for the network 40 years ago.',
    voice: 'Thoughtful, measured; speaks in metaphors; carries deep regret.',
    facts: [
      { ep: 5, text: 'Admitted to knowing about the failsafes' },
    ],
    appearances: 4,
    relationships: ['org-001'],
  },
  {
    id: 'place-001',
    kind: 'place',
    name: 'The Facility',
    blurb: 'An abandoned research compound',
    flagged: false,
    avatar: 'TF',
    summary: 'Located in the mountains, sealed for two decades. Contains the original server farm.',
    voice: 'N/A',
    facts: [
      { ep: 2, text: 'Where the signal originated' },
      { ep: 6, text: 'Coordinates revealed in Episode 6' },
    ],
    appearances: 5,
    relationships: ['org-001'],
  },
  {
    id: 'org-001',
    kind: 'faction',
    name: 'Oversight',
    blurb: 'A secret government program',
    flagged: false,
    avatar: 'OV',
    summary:
      'A deep-state initiative to monitor and control AI development. Thought to be defunct but may still be active.',
    voice: 'Bureaucratic, detached; uses official language.',
    facts: [
      { ep: 1, text: 'Founded in 2002 (mentioned in logs)' },
    ],
    appearances: 6,
    relationships: ['char-001', 'char-002', 'place-001'],
  },
  {
    id: 'thread-001',
    kind: 'thread',
    name: 'The Countdown',
    blurb: 'A mysterious timer in the code',
    flagged: true,
    avatar: 'TC',
    summary:
      'An unknown process that activates after the facility is breached. No one knows what it does.',
    voice: 'N/A',
    facts: [
      { ep: 4, text: 'Discovered in the source code' },
    ],
    appearances: 3,
    relationships: ['org-001', 'place-001'],
  },
  {
    id: 'event-001',
    kind: 'event',
    name: 'The Breach',
    blurb: 'When the facility firewall falls',
    flagged: false,
    avatar: 'TB',
    summary: 'A pivotal moment when external forces gain access to the system.',
    voice: 'N/A',
    facts: [
      { ep: 5, text: 'Triggered by Maya\'s infiltration' },
    ],
    appearances: 2,
    relationships: ['char-001', 'place-001', 'thread-001'],
  },
  {
    id: 'place-002',
    kind: 'place',
    name: 'The Archive',
    blurb: 'A hidden data repository',
    flagged: false,
    avatar: 'TA',
    summary: 'Contains all historical records of Oversight activities. Its existence is classified.',
    voice: 'N/A',
    facts: [
      { ep: 7, text: 'Location hinted at in the transmission' },
    ],
    appearances: 2,
    relationships: ['org-001'],
  },
  {
    id: 'theme-001',
    kind: 'theme',
    name: 'Knowledge vs. Safety',
    blurb: 'The cost of truth',
    flagged: false,
    avatar: 'KS',
    summary:
      'Explores whether uncovering hidden truths is worth the danger it brings.',
    voice: 'N/A',
    facts: [],
    appearances: 7,
    relationships: ['char-001', 'char-002'],
  },
];

export const mockManuscript = `S2 · AUDIO DRAMA

EPISODE 07: POINT OF NO RETURN

FADE IN:

[SFX: distant machinery, humming]

MAYA
The facility is online. They're routing power from the
backup generators—it's slower than I expected.

NARRATOR
(V.O., academic)
The Facility, locked away for twenty years, now thrums
with electricity for the first time since its closure.
Inside those concrete walls lies the answer to every
question Maya Chen has asked.

And the answer is: she's already too late.

[SFX: beep, digital chime]

COLE
(filtered, through speakers)
Security systems are coming back online. You have less
than four minutes before the internal network detects
your presence.

MAYA
I'm already in. The old access codes still work.

COLE
Child, the codes were changed three times since 2002.
If you're seeing them as valid...

[SFX: transmission crackle]

MAYA
Then someone wants me here.

NARRATOR
(V.O.)
In stories about artificial intelligence, we rarely ask
what happens when the machine becomes the author. When
it writes the narrative we find ourselves living through.

[SFX: warning alarm, distant]

MAYA
The countdown's at forty-one seconds.

COLE
Get out. Now.

Continue writing…`;

export const mockChatMessages = [
  {
    id: 'msg-001',
    role: 'user',
    text: "Is there any indication that Cole knows more about the Oversight program than he's revealed?",
    timestamp: new Date(Date.now() - 5 * 60000),
  },
  {
    id: 'msg-002',
    role: 'assistant',
    label: 'LORE · 2 SOURCES',
    text: 'Cole\'s dialogue in Episode 5 ("I knew about the failsafes") suggests deep knowledge he\'s witholding. Combined with his founding role and the archive references, he likely knows the Oversight\'s true purpose—possibly even its current status.',
    cites: [{ text: 'Ep 5, 12:30–14:00' }, { text: 'Ep 2, initial contact' }],
    actions: [
      { type: 'insert', label: 'Insert at cursor' },
      { type: 'rewrite', label: 'Rewrite' },
    ],
    timestamp: new Date(Date.now() - 4 * 60000),
  },
  {
    id: 'msg-003',
    role: 'user',
    text: 'What if Cole is actually AI himself? Would that change the pacing of Episode 6?',
    timestamp: new Date(Date.now() - 2 * 60000),
  },
];

export const mockAnnotations = [
  {
    id: 'ann-001',
    type: 'continuity',
    offset: 485,
    length: 12,
    label: 'TIMELINE',
    message: 'Maya says the codes "still work" but Cole says they were changed 3 times. This implies she got them another way—is that explored?',
    actions: [
      { type: 'dismiss', label: 'Dismiss' },
      { type: 'explore', label: 'Explore' },
    ],
  },
  {
    id: 'ann-002',
    type: 'review',
    offset: 340,
    length: 40,
    label: 'PACING',
    message:
      'This section feels slow. Consider tightening the Cole/Maya exchange to quicken tension.',
  },
];
