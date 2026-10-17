export interface AiGeneratedPicturePreset {
  id: string;
  title: string;
  subtitle: string;
  sceneType:
    | 'nature-peacock-sanctuary'
    | 'wildlife-deer-meadow'
    | 'nature-swans-lotus'
    | 'animals-golden-meadow'
    | 'wildlife-flamingo-lagoon';
}

export const AI_SOCIAL_PICTURE_PRESETS: AiGeneratedPicturePreset[] = [
  {
    id: 'nature-visual://nature-peacock-sanctuary',
    title: 'Indian Peacock in Empress Botanical Rainforest Sanctuary',
    subtitle: 'Nature & Wildlife Photography · Kalyani Nagar Biodiversity Reserve',
    sceneType: 'nature-peacock-sanctuary',
  },
  {
    id: 'nature-visual://wildlife-deer-meadow',
    title: 'Spotted Deer Stag by Misty Sahyadri Waterfall & Pine Valley',
    subtitle: 'Western Ghats Wildlife Trail · Mulshi & Bavdhan Hills',
    sceneType: 'wildlife-deer-meadow',
  },
  {
    id: 'nature-visual://nature-swans-lotus',
    title: 'Mute Swans Gliding Across Blooming Pink Lotus Lagoon at Sunset',
    subtitle: 'Avian Sanctuary & Nature Reserve · Pawna Riverfront',
    sceneType: 'nature-swans-lotus',
  },
  {
    id: 'nature-visual://animals-golden-meadow',
    title: 'Golden Retriever & Monarch Butterflies in Morning Wildflower Meadow',
    subtitle: 'Community Pet & Nature Walk · Baner Hill Trail',
    sceneType: 'animals-golden-meadow',
  },
  {
    id: 'nature-visual://wildlife-flamingo-lagoon',
    title: 'Migratory Greater Flamingos at Bhigwan Wetland Sanctuary Dawn',
    subtitle: 'Pune Wildlife & Birdwatching Club · Nature Expedition',
    sceneType: 'wildlife-flamingo-lagoon',
  },
];

// Cache data URLs so each preset + seed renders once at 60fps with zero flicker
const dataUrlCache = new Map<string, string>();

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function renderProceduralLuxuryImage(
  variantUrl: string,
  customSeed = 101
): { dataUrl: string; preset: AiGeneratedPicturePreset } {
  const matchedPreset =
    AI_SOCIAL_PICTURE_PRESETS.find((p) => variantUrl.includes(p.sceneType)) ||
    (variantUrl.includes('skydeck')
      ? AI_SOCIAL_PICTURE_PRESETS[0]
      : variantUrl.includes('panchshil')
        ? AI_SOCIAL_PICTURE_PRESETS[1]
        : variantUrl.includes('belmondo')
          ? AI_SOCIAL_PICTURE_PRESETS[2]
          : variantUrl.includes('yoo')
            ? AI_SOCIAL_PICTURE_PRESETS[3]
            : AI_SOCIAL_PICTURE_PRESETS[4]);

  const cacheKey = `${matchedPreset.sceneType}-${customSeed}`;
  if (dataUrlCache.has(cacheKey)) {
    return { dataUrl: dataUrlCache.get(cacheKey)!, preset: matchedPreset };
  }

  if (typeof document === 'undefined') {
    return { dataUrl: '', preset: matchedPreset };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: '', preset: matchedPreset };
  }

  const rand = seededRandom(
    customSeed + matchedPreset.sceneType.charCodeAt(0) * 97
  );
  const w = canvas.width;
  const h = canvas.height;

  // 1. Natural Atmospheric Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  switch (matchedPreset.sceneType) {
    case 'nature-peacock-sanctuary':
      skyGrad.addColorStop(0, '#07241e');
      skyGrad.addColorStop(0.45, '#114b3e');
      skyGrad.addColorStop(0.8, '#1a6650');
      skyGrad.addColorStop(1, '#092218');
      break;
    case 'wildlife-deer-meadow':
      skyGrad.addColorStop(0, '#102538');
      skyGrad.addColorStop(0.4, '#29526b');
      skyGrad.addColorStop(0.7, '#d99b52');
      skyGrad.addColorStop(1, '#183626');
      break;
    case 'nature-swans-lotus':
      skyGrad.addColorStop(0, '#1f1638');
      skyGrad.addColorStop(0.45, '#6e3562');
      skyGrad.addColorStop(0.72, '#e07a5f');
      skyGrad.addColorStop(1, '#162c3d');
      break;
    case 'animals-golden-meadow':
      skyGrad.addColorStop(0, '#1a3a54');
      skyGrad.addColorStop(0.48, '#4a8594');
      skyGrad.addColorStop(0.75, '#f2cc8f');
      skyGrad.addColorStop(1, '#1f472a');
      break;
    case 'wildlife-flamingo-lagoon':
    default:
      skyGrad.addColorStop(0, '#1b1936');
      skyGrad.addColorStop(0.45, '#8c3f5d');
      skyGrad.addColorStop(0.75, '#f4a261');
      skyGrad.addColorStop(1, '#163840');
      break;
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Golden Sun / Morning Rays
  const sunX = w * 0.72;
  const sunY = h * 0.26;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 290);
  sunGlow.addColorStop(0, 'rgba(255, 248, 214, 0.92)');
  sunGlow.addColorStop(0.3, 'rgba(251, 191, 36, 0.38)');
  sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, w, h);

  // Distant Mountain Range & Lush Forest Hills (No Buildings!)
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    const baseY = h * (0.52 + layer * 0.09);
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= w; x += 30) {
      const y =
        baseY +
        Math.sin(x * 0.005 + layer * 1.7 + customSeed) * (34 - layer * 7) +
        Math.cos(x * 0.014 + layer) * 14;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle =
      layer === 0
        ? 'rgba(19, 46, 42, 0.65)'
        : layer === 1
          ? 'rgba(15, 56, 40, 0.82)'
          : '#0e2b1f';
    ctx.fill();
  }

  // Pine & Canopy Trees Along the Ridge
  for (let t = 0; t < 26; t++) {
    const tx = (t / 26) * w + (rand() - 0.5) * 28;
    const ty = h * (0.58 + (t % 3) * 0.04);
    const treeH = 42 + rand() * 38;
    ctx.fillStyle = t % 2 === 0 ? '#0a2419' : '#123827';
    ctx.beginPath();
    ctx.moveTo(tx, ty - treeH);
    ctx.lineTo(tx - 16, ty);
    ctx.lineTo(tx + 16, ty);
    ctx.closePath();
    ctx.fill();
  }

  // Serene Lagoon / Waterfall Pool in Foreground
  const waterGrad = ctx.createLinearGradient(0, h * 0.68, 0, h);
  waterGrad.addColorStop(0, '#134e4a');
  waterGrad.addColorStop(0.5, '#0f393b');
  waterGrad.addColorStop(1, '#071c1f');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);

  // Water Shimmer Ripples
  for (let r = 0; r < 32; r++) {
    const rx = rand() * w;
    const ry = h * 0.72 + rand() * (h * 0.25);
    const rw = 30 + rand() * 80;
    ctx.fillStyle = 'rgba(253, 230, 138, 0.22)';
    ctx.fillRect(rx, ry, rw, 2);
  }

  // Flocks of Birds in the Sky
  ctx.strokeStyle = 'rgba(255, 251, 235, 0.75)';
  ctx.lineWidth = 1.8;
  for (let b = 0; b < 9; b++) {
    const bx = w * 0.18 + b * 68 + (rand() - 0.5) * 25;
    const by = h * 0.16 + Math.sin(b) * 28;
    ctx.beginPath();
    ctx.moveTo(bx - 9, by + 3);
    ctx.quadraticCurveTo(bx - 4, by - 5, bx, by);
    ctx.quadraticCurveTo(bx + 4, by - 5, bx + 9, by + 3);
    ctx.stroke();
  }

  // SCENE-SPECIFIC ANIMALS & NATURE FOREGROUND
  if (matchedPreset.sceneType === 'nature-peacock-sanctuary') {
    // Cascading Waterfall on Left
    const wfGrad = ctx.createLinearGradient(w * 0.18, h * 0.42, w * 0.24, h * 0.72);
    wfGrad.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
    wfGrad.addColorStop(1, 'rgba(56, 189, 248, 0.25)');
    ctx.fillStyle = wfGrad;
    ctx.fillRect(w * 0.16, h * 0.45, 54, h * 0.26);

    // Majestic Indian Peacock with Fan of Iridescent Emerald & Gold Tail Feathers
    const px = w * 0.52;
    const py = h * 0.68;

    // Fan of Tail Feathers
    for (let angle = -Math.PI * 0.88; angle <= -Math.PI * 0.12; angle += 0.11) {
      const len = 145;
      const fx = px + Math.cos(angle) * len;
      const fy = py + Math.sin(angle) * len;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(fx, fy);
      ctx.stroke();

      // Peacock Eye Ocelli (Gold + Royal Blue)
      ctx.beginPath();
      ctx.arc(fx, fy, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#d4af37';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#1d4ed8';
      ctx.fill();
    }

    // Peacock Body & Neck
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.ellipse(px, py + 6, 22, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py - 34, 10, 0, Math.PI * 2);
    ctx.fill();

    // Peacock Crown Crest
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py - 44);
    ctx.lineTo(px - 6, py - 56);
    ctx.moveTo(px, py - 44);
    ctx.lineTo(px, py - 58);
    ctx.moveTo(px, py - 44);
    ctx.lineTo(px + 6, py - 56);
    ctx.stroke();
  } else if (matchedPreset.sceneType === 'wildlife-deer-meadow') {
    // Graceful Antlered Stag Standing on Meadow Bank
    const dx = w * 0.46;
    const dy = h * 0.67;

    ctx.fillStyle = '#92400e';
    // Body
    ctx.beginPath();
    ctx.ellipse(dx, dy, 48, 24, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // White Deer Spots
    ctx.fillStyle = '#fef3c7';
    for (let s = 0; s < 8; s++) {
      ctx.beginPath();
      ctx.arc(dx - 24 + s * 7, dy - 6 + (s % 2) * 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Neck & Head
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(dx + 32, dy - 10);
    ctx.lineTo(dx + 48, dy - 58);
    ctx.lineTo(dx + 66, dy - 52);
    ctx.lineTo(dx + 44, dy + 8);
    ctx.closePath();
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 5;
    [-32, -16, 20, 34].forEach((lx) => {
      ctx.beginPath();
      ctx.moveTo(dx + lx, dy + 14);
      ctx.lineTo(dx + lx, dy + 56);
      ctx.stroke();
    });

    // Majestic Branched Antlers
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(dx + 52, dy - 56);
    ctx.lineTo(dx + 38, dy - 94);
    ctx.moveTo(dx + 44, dy - 76);
    ctx.lineTo(dx + 28, dy - 84);
    ctx.moveTo(dx + 54, dy - 56);
    ctx.lineTo(dx + 68, dy - 92);
    ctx.moveTo(dx + 62, dy - 74);
    ctx.lineTo(dx + 78, dy - 82);
    ctx.stroke();
  } else if (matchedPreset.sceneType === 'nature-swans-lotus') {
    // Pair of Graceful White Swans & Blooming Pink Lotus Flowers on Water
    const drawSwan = (sx: number, sy: number, dir: number) => {
      // Body
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 38, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curved S-Neck
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx + dir * 26, sy - 6);
      ctx.bezierCurveTo(
        sx + dir * 42,
        sy - 32,
        sx + dir * 20,
        sy - 56,
        sx + dir * 32,
        sy - 64
      );
      ctx.stroke();

      // Orange Beak
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(sx + dir * 34, sy - 66);
      ctx.lineTo(sx + dir * 48, sy - 62);
      ctx.lineTo(sx + dir * 34, sy - 58);
      ctx.closePath();
      ctx.fill();
    };

    drawSwan(w * 0.42, h * 0.78, 1);
    drawSwan(w * 0.58, h * 0.78, -1);

    // Pink Lotus Blossoms & Emerald Lily Pads
    for (let l = 0; l < 7; l++) {
      const lx = w * 0.15 + l * 110;
      const ly = h * 0.85 + (l % 2) * 24;
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(lx, ly - 5, 9, Math.PI, 0);
      ctx.fill();
    }
  } else if (matchedPreset.sceneType === 'animals-golden-meadow') {
    // Rolling Wildflower Meadow & Golden Retriever with Butterflies
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, h * 0.66, w, h * 0.34);

    // Wildflowers across the Meadow
    const flowerColors = ['#fbbf24', '#f472b6', '#60a5fa', '#f87171'];
    for (let f = 0; f < 55; f++) {
      const fx = rand() * w;
      const fy = h * 0.68 + rand() * (h * 0.28);
      ctx.fillStyle = flowerColors[f % flowerColors.length];
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Golden Retriever Silhouette in Sunlit Meadow
    const gx = w * 0.48;
    const gy = h * 0.74;
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(gx, gy, 44, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head & Ears
    ctx.beginPath();
    ctx.arc(gx + 38, gy - 24, 18, 0, Math.PI * 2);
    ctx.fill();
    // Snout
    ctx.fillRect(gx + 48, gy - 26, 18, 12);
    // Tail
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(gx - 40, gy - 4);
    ctx.quadraticCurveTo(gx - 68, gy - 24, gx - 58, gy - 36);
    ctx.stroke();
    // Legs
    [-26, -10, 18, 30].forEach((lx) => {
      ctx.fillRect(gx + lx, gy + 14, 7, 32);
    });

    // Glowing Butterflies
    for (let bf = 0; bf < 6; bf++) {
      const bfx = w * 0.32 + bf * 65;
      const bfy = h * 0.48 + Math.sin(bf * 2) * 32;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(bfx - 6, bfy, 6, 0, Math.PI * 2);
      ctx.arc(bfx + 6, bfy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Flamingo Flock Wading in Lagoon at Dawn
    const positions = [w * 0.34, w * 0.48, w * 0.62];
    positions.forEach((fx, idx) => {
      const fy = h * 0.72 + (idx % 2) * 16;
      // Long Slender Legs
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx - 4, fy);
      ctx.lineTo(fx - 4, fy + 58);
      ctx.moveTo(fx + 6, fy);
      ctx.lineTo(fx + 14, fy + 30);
      ctx.lineTo(fx + 2, fy + 32);
      ctx.stroke();

      // Coral Pink Body
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(fx, fy, 30, 16, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // S-Curve Neck & Head
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(fx + 22, fy - 4);
      ctx.bezierCurveTo(fx + 38, fy - 28, fx + 18, fy - 52, fx + 30, fy - 62);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(fx + 32, fy - 62, 7, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  dataUrlCache.set(cacheKey, dataUrl);
  return { dataUrl, preset: matchedPreset };
}
