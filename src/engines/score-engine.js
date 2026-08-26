function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function scoreMemePotential(topic, styleCount = 1, weirdness = 7) {
  const text = topic.trim();
  if (!text) return { total: 0, breakdown: {} };

  const words = text.split(/\s+/).filter(Boolean);
  const lengthScore = Math.max(45, Math.min(95, 100 - Math.abs(words.length - 6) * 6));
  const specificity = Math.min(96, 48 + new Set(words.map(word => word.toLowerCase())).size * 6);
  const remix = Math.min(98, 58 + styleCount * 7 + weirdness * 2);
  const visual = Math.min(96, 55 + Math.min(text.length, 50) * 0.55);
  const novelty = 62 + (hashString(text) % 31);

  const total = Math.round(
    lengthScore * 0.15 +
    specificity * 0.20 +
    remix * 0.30 +
    visual * 0.20 +
    novelty * 0.15
  );

  return {
    total: Math.max(1, Math.min(99, total)),
    breakdown: {
      captionFit: Math.round(lengthScore),
      specificity: Math.round(specificity),
      remixPotential: Math.round(remix),
      visualPotential: Math.round(visual),
      noveltyHeuristic: Math.round(novelty)
    },
    note: 'V0 creative heuristic — not a live popularity or virality prediction.'
  };
}
