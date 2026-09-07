function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const skins = ["#f4d0b5", "#e8b892", "#c68642", "#8d5524", "#f6dec8", "#d9a066"];
const hairs = ["#1b1b1b", "#3a2415", "#6b3b1f", "#c4592a", "#d4b483", "#2c1b4d", "#4a2c17"];
const shirts = ["#3d6b4f", "#8b3a3a", "#2f4f6f", "#c4a35a", "#5a4a7a", "#6d4c41"];
const backgrounds = ["#efe4c8", "#dce8d5", "#f3ddd6", "#dde4ef", "#efe8da", "#e8f0e4"];

function pick<T>(list: T[], hash: number, salt: number) {
  return list[(hash + salt) % list.length];
}

export function portraitFileName(name: string) {
  return `${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}.svg`;
}

export function portraitSvg(name: string) {
  const hash = hashSeed(name);
  const skin = pick(skins, hash, 1);
  const hair = pick(hairs, hash, 7);
  const shirt = pick(shirts, hash, 13);
  const background = pick(backgrounds, hash, 19);
  const hairStyle = hash % 5;
  const glasses = hash % 7 === 0;
  const beard = hash % 5 === 1;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  const hairPath =
    hairStyle === 0
      ? "M70 78 C40 18 200 10 210 78 C190 48 90 48 70 78Z"
      : hairStyle === 1
        ? "M68 92 C72 28 208 24 214 96 C200 52 86 50 68 92Z"
        : hairStyle === 2
          ? "M78 70 C90 24 190 22 204 72 C176 44 108 44 78 70Z"
          : hairStyle === 3
            ? "M64 110 C58 30 222 18 218 118 C200 46 84 52 64 110Z"
            : "M86 84 C96 36 186 34 196 86 C168 58 114 58 86 84Z";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 350" role="img" aria-label="${name}">
  <rect width="280" height="350" fill="${background}"/>
  <circle cx="140" cy="138" r="62" fill="${skin}"/>
  <path d="${hairPath}" fill="${hair}"/>
  <ellipse cx="118" cy="136" rx="7" ry="8" fill="#2b2118"/>
  <ellipse cx="162" cy="136" rx="7" ry="8" fill="#2b2118"/>
  <path d="M126 162 C140 172 154 172 166 162" fill="none" stroke="#8a5a44" stroke-width="3" stroke-linecap="round"/>
  ${glasses ? `<path d="M96 136 H128 M152 136 H184" fill="none" stroke="#2b2118" stroke-width="3"/><circle cx="118" cy="136" r="16" fill="none" stroke="#2b2118" stroke-width="3"/><circle cx="162" cy="136" r="16" fill="none" stroke="#2b2118" stroke-width="3"/>` : ""}
  ${beard ? `<path d="M108 168 C118 198 162 198 172 168 C156 186 124 186 108 168Z" fill="${hair}" opacity="0.85"/>` : ""}
  <path d="M78 230 C88 196 192 196 202 230 C210 286 70 286 78 230Z" fill="${shirt}"/>
  <text x="140" y="328" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#3d4a38">${initials}</text>
</svg>
`;
}
