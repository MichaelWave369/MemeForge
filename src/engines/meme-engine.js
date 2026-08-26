export const STYLE_PRESETS = [
  { id: 'absurd', label: 'Absurd' },
  { id: 'nerdy', label: 'Nerdy' },
  { id: 'corporate', label: 'Corporate dystopia' },
  { id: 'deadpan', label: 'Deadpan' },
  { id: 'surreal', label: 'Surreal' },
  { id: 'wholesome', label: 'Wholesome' },
  { id: 'classic', label: 'Classic internet' },
  { id: 'highbrow', label: 'Highbrow' }
];

const factories = {
  absurd: [
    topic => ({ top: `NOBODY ASKED FOR ${topic.toUpperCase()}`, bottom: 'SO NATURALLY WE BUILT A DASHBOARD FOR IT', note: 'Turns unnecessary complexity into the joke.' }),
    topic => ({ top: `HUMANITY: WE SHOULD PROBABLY DISCUSS ${topic.toUpperCase()}`, bottom: 'THE RACCOONS HAVE ALREADY FORMED A STEERING COMMITTEE', note: 'Escalates the topic into bureaucratic nonsense.' }),
    topic => ({ top: `ME TRYING TO UNDERSTAND ${topic.toUpperCase()}`, bottom: 'THE CEILING FAN HAS BEEN PROMOTED TO SENIOR ANALYST', note: 'Pairs confusion with an impossible authority figure.' })
  ],
  nerdy: [
    topic => ({ top: `${topic.toUpperCase()} LOOKED SIMPLE IN THE README`, bottom: 'THREE DEPENDENCY TREES LATER: WE HAVE SUMMONED A NEW PROTOCOL', note: 'Developer pain without needing a specific technology.' }),
    topic => ({ top: `ME: LET’S MODEL ${topic.toUpperCase()}`, bottom: 'THE MODEL: PLEASE DEFINE “LET’S”', note: 'A recursive specification joke.' }),
    topic => ({ top: `OBSERVING ${topic.toUpperCase()}`, bottom: 'RESULT: MORE EDGE CASES THAN EDGES', note: 'Frames the topic like a failed experiment.' })
  ],
  corporate: [
    topic => ({ top: `LEADERSHIP: ${topic.toUpperCase()} WILL INCREASE EFFICIENCY`, bottom: 'THE NEW EFFICIENCY IS FOUR MEETINGS ABOUT THE EFFICIENCY', note: 'Corporate optimism collides with process overhead.' }),
    topic => ({ top: `WE HEARD YOUR CONCERNS ABOUT ${topic.toUpperCase()}`, bottom: 'SO WE REBRANDED THEM AS OPPORTUNITIES', note: 'Classic management-language inversion.' }),
    topic => ({ top: `${topic.toUpperCase()} HAS ENTERED THE ROADMAP`, bottom: 'ESTIMATED DELIVERY: AFTER THE NEXT REORG', note: 'Product planning meets organizational chaos.' })
  ],
  deadpan: [
    topic => ({ top: `${topic.toUpperCase()}`, bottom: 'THIS WILL PROBABLY BE FINE.', note: 'Maximum understatement.' }),
    topic => ({ top: `CURRENT STATUS: ${topic.toUpperCase()}`, bottom: 'NO FURTHER QUESTIONS AT THIS TIME.', note: 'Treats a cultural signal like an incident report.' }),
    topic => ({ top: `I HAVE REVIEWED ${topic.toUpperCase()}`, bottom: 'UNFORTUNATELY, IT CONTINUES TO EXIST.', note: 'Dry disapproval with no extra machinery.' })
  ],
  surreal: [
    topic => ({ top: `${topic.toUpperCase()} BUT IT’S 3:17 AM`, bottom: 'AND THE VENDING MACHINE KNOWS YOUR MIDDLE NAME', note: 'Dream logic with a mundane object.' }),
    topic => ({ top: `THE ALGORITHM EXPLAINED ${topic.toUpperCase()}`, bottom: 'NOW THE MOON IS UNIONIZED', note: 'Causal nonsense for high-weirdness topics.' }),
    topic => ({ top: `YOU OPEN THE DOOR LABELED ${topic.toUpperCase()}`, bottom: 'IT OPENS BACK INTO THE SAME MEETING', note: 'Looping liminal-office energy.' })
  ],
  wholesome: [
    topic => ({ top: `EVERYONE ARGUING ABOUT ${topic.toUpperCase()}`, bottom: 'ONE PERSON QUIETLY MAKES SNACKS FOR THE GROUP', note: 'Redirects conflict toward kindness.' }),
    topic => ({ top: `${topic.toUpperCase()} IS CONFUSING`, bottom: 'GOOD THING WE CAN FIGURE IT OUT TOGETHER', note: 'Simple communal reframing.' }),
    topic => ({ top: `WHEN ${topic.toUpperCase()} GETS WEIRD`, bottom: 'SEND THE FRIEND WHO READ THE WHOLE ARTICLE', note: 'Celebrates the research friend.' })
  ],
  classic: [
    topic => ({ top: `EXPECTATION: I UNDERSTAND ${topic.toUpperCase()}`, bottom: 'REALITY: I HAVE OPENED 17 TABS', note: 'Expectation-versus-reality structure.' }),
    topic => ({ top: `NOBODY:`, bottom: `THE INTERNET AT 2 AM: LET’S ARGUE ABOUT ${topic.toUpperCase()}`, note: 'Classic nobody-format adaptation.' }),
    topic => ({ top: `ME BEFORE ${topic.toUpperCase()}`, bottom: 'ME AFTER: NEW PERSONALITY UNLOCKED', note: 'Before-and-after identity gag.' })
  ],
  highbrow: [
    topic => ({ top: `${topic.toUpperCase()}: A BRIEF INQUIRY`, bottom: 'VOLUME VII: WHY DID WE MAKE IT LIKE THIS?', note: 'Turns the topic into an over-serious academic work.' }),
    topic => ({ top: `THE DIALECTIC OF ${topic.toUpperCase()}`, bottom: 'THESIS. ANTITHESIS. GROUP CHAT.', note: 'Philosophy compressed into internet behavior.' }),
    topic => ({ top: `AN EPISTEMOLOGICAL CRISIS ABOUT ${topic.toUpperCase()}`, bottom: 'RESOLVED BY SOMEONE SAYING “SOURCE?”', note: 'Academic vocabulary meets comment-section culture.' })
  ]
};

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededOrder(items, seed) {
  return [...items].sort((a, b) => {
    const aHash = hashString(`${seed}:${a.key}`);
    const bHash = hashString(`${seed}:${b.key}`);
    return aHash - bHash;
  });
}

export function buildConcepts(topic, selectedStyles = ['absurd'], weirdness = 7, count = 12) {
  const safeTopic = topic.trim() || 'the internet';
  const styles = selectedStyles.length ? selectedStyles : ['classic'];
  const candidates = [];

  styles.forEach(style => {
    const styleFactories = factories[style] || factories.classic;
    styleFactories.forEach((factory, index) => {
      const result = factory(safeTopic);
      candidates.push({
        ...result,
        key: `${style}-${index}-${safeTopic}`,
        style,
        weirdness,
        title: `${STYLE_PRESETS.find(item => item.id === style)?.label || 'Meme'} angle`
      });
    });
  });

  // If only a few styles are selected, backfill from classic and absurd so we can
  // still produce a full concept board without repeating the exact same joke.
  if (candidates.length < count) {
    ['classic', 'absurd', 'deadpan', 'nerdy'].forEach(style => {
      factories[style].forEach((factory, index) => {
        const result = factory(safeTopic);
        const key = `${style}-${index}-${safeTopic}`;
        if (!candidates.some(item => item.key === key)) {
          candidates.push({
            ...result,
            key,
            style,
            weirdness,
            title: `${STYLE_PRESETS.find(item => item.id === style)?.label || 'Meme'} angle`
          });
        }
      });
    });
  }

  return seededOrder(candidates, `${safeTopic}:${weirdness}:${styles.join(',')}`)
    .slice(0, count)
    .map((concept, index) => ({
      ...concept,
      rank: index + 1,
      caption: `${concept.top} — ${concept.bottom}`
    }));
}
