export type SkillSeed = {
  name: string;
  tier: 'beginner' | 'intermediate' | 'advanced';
  // description is rendered on the skill detail screen when non-null.
  // Leave null until per-skill copy is written.
  description: string | null;
  video_url: string | null;
  sort_order: number;
};

// Kendama USA trick curriculum — 69 skills across 3 tiers.
// Tutorial URLs are from Kendama USA's YouTube channel (@kendamausa).
export const SKILL_CATALOG: SkillSeed[] = [
  // ── Beginner (18 skills) ─────────────────────────────────────────────────
  { name: 'Big Cup',          tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=xSKYv5BcdQE', sort_order: 1  },
  { name: 'Small Cup',        tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=WDQzNMNibXY', sort_order: 2  },
  { name: 'Base Cup',         tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=nrh2a5_Iras', sort_order: 3  },
  { name: 'Moshikame',        tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=gyCbfVgVoGg', sort_order: 4  },
  { name: 'Tap Back',         tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=-7xndl4BvcY', sort_order: 5  },
  { name: 'Candle Stick',     tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=S-hkMEKNjOs', sort_order: 6  },
  { name: 'Baseball Bat',     tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=onZqagzD_jg', sort_order: 7  },
  { name: 'Spike',            tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=wa9lJReYZlM', sort_order: 8  },
  { name: 'Orbit',            tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=BbHdESnnr14', sort_order: 9  },
  { name: 'Airplane',         tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=g-bf2UsAKnU', sort_order: 10 },
  { name: 'Flying Top',       tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=4-s9UnJhrEU', sort_order: 11 },
  { name: 'Around Japan',     tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=M-nZF_MKfcw', sort_order: 12 },
  { name: 'Around the World', tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=xOY4nD9bVts', sort_order: 13 },
  { name: 'Wrap It Up B',     tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=0vxBPaOKh0I', sort_order: 14 },
  { name: 'Penguin Catch',    tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=PpbaKzqlMyY', sort_order: 15 },
  { name: 'Lighthouse',       tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=ppVjCcVCzxg', sort_order: 16 },
  { name: 'Zero Spin',        tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=A8lYSbHkSr8', sort_order: 17 },
  { name: 'Stunt Plane',      tier: 'beginner', description: null, video_url: 'https://www.youtube.com/watch?v=8AcDtoLiO-M', sort_order: 18 },

  // ── Intermediate (24 skills) ──────────────────────────────────────────────
  { name: 'Swing Spike',            tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=w-RfbsOIsHg', sort_order: 19 },
  { name: 'Jumping Stick',          tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=S-hegB60WPs', sort_order: 20 },
  { name: 'Faster Than Gravity',    tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=Z0cBnMcB_uk', sort_order: 21 },
  { name: 'Bottom Cup Down Spike',  tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=u2bDYtV-QfQ', sort_order: 22 },
  { name: 'Bird',                   tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=Ek5juKEFtek', sort_order: 23 },
  { name: 'Cold Pizza',             tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=MB1S4YZGtlg', sort_order: 24 },
  { name: 'Flying V',               tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=GzuT7VIBK4Y', sort_order: 25 },
  { name: '1 Turn Lighthouse',      tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=YeniKtb-GL0', sort_order: 26 },
  { name: '1 Turn Airplane',        tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=mGAodkUNJ_0', sort_order: 27 },
  { name: 'Fast Hand Spike',        tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=W4LdwfaAHRs', sort_order: 28 },
  { name: 'Lazy Lighthouse',        tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=9ZDRk_WpHgY', sort_order: 29 },
  { name: 'Tama Turn',              tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=35QOpAqL_3k', sort_order: 30 },
  { name: 'Moon Circle',            tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=2_swZRQUYl4', sort_order: 31 },
  { name: 'Hand Roll',              tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=RZ_o5Lf74hs', sort_order: 32 },
  { name: 'Air Whip',               tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=m89QQ4ZgX-I', sort_order: 33 },
  { name: 'Lighthouse Trade Spike', tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=mqFv-aiKth8', sort_order: 34 },
  { name: 'Lighthouse Flip',        tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=R3WqyCwGf8c', sort_order: 35 },
  { name: 'Drop Step',              tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=FFqPng1ds1g', sort_order: 36 },
  { name: 'Fun House',              tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=EBcGSW_qrSo', sort_order: 37 },
  { name: 'Kick Spike',             tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=tShBmurwnWE', sort_order: 38 },
  { name: 'Space Walk',             tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=kPXuwr7rxLU', sort_order: 39 },
  { name: 'Arm Bounce',             tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=jYYTFzdN95o', sort_order: 40 },
  { name: 'Earth Turn',             tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=qDoZRhDER0Y', sort_order: 41 },
  { name: 'Fast Hands',             tier: 'intermediate', description: null, video_url: 'https://www.youtube.com/watch?v=cl37WShmRNg', sort_order: 42 },

  // ── Advanced (27 skills) ──────────────────────────────────────────────────
  { name: 'UFO',                          tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=F1mH031HMFk', sort_order: 43 },
  { name: 'Whirlwind',                    tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=e0yzlVvpfjU', sort_order: 44 },
  { name: 'Around USA',                   tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=MjQ_khAeB-k', sort_order: 45 },
  { name: 'Tornado',                      tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=x3fJOs725iY', sort_order: 46 },
  { name: 'Trade Spike',                  tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=ZBlXA7zkMrw', sort_order: 47 },
  { name: 'The Turner',                   tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=JwMfhroy21Q', sort_order: 48 },
  { name: 'Base Cup, Flip In',            tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=FvNSuqMo_54', sort_order: 49 },
  { name: 'Lunar',                        tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=qNd-T1VrAxk', sort_order: 50 },
  { name: 'Stilt',                        tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=tPseqXxxyXE', sort_order: 51 },
  { name: 'Moon Circle Quick Spike',      tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=H7Mlt8so8bo', sort_order: 52 },
  { name: 'Boarders Balance',             tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=4w-ztBZdhzI', sort_order: 53 },
  { name: 'Lunar Tré Flip',               tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=K684UXuJBfw', sort_order: 54 },
  { name: 'The Ken Drop',                 tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=vB7c_nEroPE', sort_order: 55 },
  { name: 'Butterfly',                    tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=Zp9JL-mX0XU', sort_order: 56 },
  { name: '1 Turn Tap Airplane',          tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=Dlyt5Tl14Nw', sort_order: 57 },
  { name: 'Jet Plane',                    tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=FFS8FTqf2to', sort_order: 58 },
  { name: 'Juggle',                       tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=GhPl-EKhjz0', sort_order: 59 },
  { name: 'Juggle Up To Lighthouse',      tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=k9oiDND4xBw', sort_order: 60 },
  { name: 'Lighthouse Juggle Lighthouse', tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=2mPymrnsUDY', sort_order: 61 },
  { name: 'Inverted Forward Jumping Stick', tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=SWZrj0HkD08', sort_order: 62 },
  { name: 'Surface Spin',                 tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=NA4WkGq62no', sort_order: 63 },
  { name: 'Handle Stall',                 tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=-c-AZIyGafg', sort_order: 64 },
  { name: 'Root Canal',                   tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=szMkJODN-10', sort_order: 65 },
  { name: 'Inward Lunar',                 tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=PnrNsjEazTk', sort_order: 66 },
  { name: 'UFO Tap Back',                 tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=H9X2ef2LreQ', sort_order: 67 },
  { name: 'Lightning Drop Knee Bounce',   tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=s6ZXuq4D08Y', sort_order: 68 },
  { name: 'Gunslinger',                   tier: 'advanced', description: null, video_url: 'https://www.youtube.com/watch?v=HwbVOsmPfNU', sort_order: 69 },
];
