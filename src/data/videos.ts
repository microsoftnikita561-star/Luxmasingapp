// Обучающие видео с YouTube для техник и упражнений.
// Все ролики проверены через YouTube oEmbed: существуют и разрешают встраивание;
// названия каналов взяты оттуда же.

export interface Video {
  id: string
  title: string
  channel: string
  lang: 'ru' | 'en'
}

export const VIDEOS: Record<string, Video[]> = {
  squinch: [
    { id: 'ff7nltdBCHs', title: "The Squinch — Look Confident in Every Photo", channel: 'Peter Hurley', lang: 'en' },
  ],
  'jawline-photo': [
    { id: 'uQfVFilXGMk', title: "It's all about the Jaw", channel: 'Kevin Scott', lang: 'en' },
  ],
  duchenne: [{ id: 'cQAOFE4QgC4', title: 'How to SMILE NATURALLY in photos!', channel: 'Chris Hau', lang: 'en' }],
  'relaxed-face': [
    {
      id: 'Iu14BN5LuUA',
      title: 'How to Get the Best Facial Expressions for Portraits with Peter Hurley',
      channel: 'Westcott Lighting',
      lang: 'en',
    },
  ],
  'chin-tucks': [
    {
      id: 'ekJzJTnd43s',
      title: 'Physical Therapist Explains How To Perform Chin Tucks (Fix Forward Head Posture)',
      channel: 'Office Athlete',
      lang: 'en',
    },
  ],
  'wall-angels': [
    {
      id: 'T_lqxtTAKM8',
      title: 'Wall Angels Exercise to Improve Posture',
      channel: 'Health-Fit — Boca Raton Sports Chiropractic',
      lang: 'en',
    },
  ],
  'doorway-stretch': [
    {
      id: 'bZ-eaBPOGiM',
      title: 'How to do Doorway Pec Stretch - Flexibility - Wellen',
      channel: 'Wellen',
      lang: 'en',
    },
  ],
  'face-pulls': [
    {
      id: 'UMGpxwhsy_k',
      title: 'Jeff Cavaliere Shows Andrew Huberman the "Face Pull"',
      channel: 'Huberman Lab Clips',
      lang: 'en',
    },
  ],
  'lateral-raise': [
    {
      id: 'ezNquXfB5Mk',
      title: 'How to Lateral Raise for Maximum Muscle Growth',
      channel: 'Mind Pump TV',
      lang: 'en',
    },
  ],
  'neck-training': [
    {
      id: '4rK-m6GvNCk',
      title: 'Isometric Cervical Flexion for Neck Strengthening - Ask Doctor Jo',
      channel: 'AskDoctorJo',
      lang: 'en',
    },
    {
      id: 'wjiZaCJ6tCA',
      title: 'Neck Exercises that KILL Your Neck (DO THESE INSTEAD!!)',
      channel: 'ATHLEAN-X',
      lang: 'en',
    },
  ],
  'tongue-posture': [{ id: 'P2vBu0j4rCQ', title: 'Where to Rest Your Tongue (Myofunctional Therapy)', channel: 'Marie McElderry', lang: 'en' }],
  'spf-apply': [
    { id: 'j6wki7Bpw3w', title: 'How much sunscreen & how often?| Dr Dray', channel: 'Dr Dray', lang: 'en' },
  ],
  'retinoid-start': [
    {
      id: 'U7PjrPWp3X0',
      title: 'Starting tretinoin: WHAT TO USE & AVOID| Dermatologist @DrDrayzday',
      channel: 'Dr Dray',
      lang: 'en',
    },
  ],
  'beard-neckline': [
    {
      id: 'Bb1oM69g6bQ',
      title:
        'Оформление бороды / Моделирование бороды / Как стричь бороду / Окантовка триммером и электробритвой',
      channel: 'KvadratBarber',
      lang: 'ru',
    },
    {
      id: '2xeGDo7rIVE',
      title: 'How To Trim The PERFECT Neckline For Your Beard',
      channel: 'VOLT Lifeproof Grooming',
      lang: 'en',
    },
  ],
  'brows-men': [
    {
      id: 'W6hejZ3EVqc',
      title: 'Eyebrow grooming for men - How to shape eyebrows ✖ James Welsh',
      channel: 'James Welsh',
      lang: 'en',
    },
  ],
  'hair-blowdry': [
    {
      id: '08L9JZnhKKA',
      title: 'Как уложить волосы феном? ®️REBEL l Мужская укладка',
      channel: 'REBEL BIBLE',
      lang: 'ru',
    },
    {
      id: 'NFj5vxsny_I',
      title: "How To Blow Dry Men's Hair",
      channel: 'Behind The Chair',
      lang: 'en',
    },
  ],
  'clothes-fit': [
    {
      id: 'w2zfNYwxhM0',
      title: 'Want Clothes With Perfect Fit? Follow These 10 Guidelines!',
      channel: "Gentleman's Gazette",
      lang: 'en',
    },
    {
      id: 'ZQzvKaqu8gY',
      title: "How A Suit Should Fit - Men's Suits Fit Guide - Gentleman's Gazette",
      channel: "Gentleman's Gazette",
      lang: 'en',
    },
  ],
  'portrait-light': [
    {
      id: 'NM2BIcg8GLE',
      title: '5 Window Light Portrait Positions',
      channel: 'The Slanted Lens',
      lang: 'en',
    },
  ],
}
