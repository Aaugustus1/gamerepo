require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('./models/Game');
const Review = require('./models/Review');
const QueueSetting = require('./models/QueueSetting');
const StreamingConfig = require('./models/StreamingConfig');
const TrendingConfig = require('./models/TrendingConfig');
const Notification = require('./models/Notification');
const SiteSetting = require('./models/SiteSetting');

const seedGames = [
  {
    title: 'Meccha Chameleon',
    publisher: 'Lemorion_1224',
    icon: '🦎',
    coverImage: 'images/meccha chameleon box art.htm',
    section: 'premium',
    starRating: 4.9,
    ratingCount: 4235,
    playersOnline: 4210,
    catalogCode: 'MM-2026-MCH',
    isNewBadge: true,
    genres: ['Action', 'Indie', 'Party']
  },
  {
    title: 'LEGO Batman: Legacy of The Dark Knight',
    publisher: 'TT GAMES / WB',
    icon: '🦇',
    coverImage: 'images/Lego Batman Legacy of The Dark Knight.avif',
    section: 'premium',
    starRating: 4.5,
    ratingCount: 8120,
    playersOnline: 3241,
    catalogCode: 'MM-2026-LBL',
    isNewBadge: true,
    genres: ['Action', 'Adventure']
  },
  {
    title: 'Tomodachi Life: Living the Dream',
    publisher: 'NINTENDO',
    icon: '🏝️',
    coverImage: 'images/tomodachi life living the dream.jpg',
    section: 'premium',
    starRating: 4.7,
    ratingCount: 14560,
    playersOnline: 2187,
    catalogCode: 'MM-2013-TML',
    genres: ['Simulation', 'Life Sim']
  },
  {
    title: 'Paralives',
    publisher: 'PARALIVES STUDIO',
    icon: '🏠',
    coverImage: 'images/paralives new box art.png',
    section: 'premium',
    starRating: 4.8,
    ratingCount: 3145,
    playersOnline: 1456,
    catalogCode: 'MM-2025-PAR',
    isNewBadge: true,
    genres: ['Simulation', 'Indie', 'Life Sim']
  },
  {
    title: 'Cyberpunk 2077',
    publisher: 'CD PROJEKT RED',
    icon: '⚡',
    coverImage: 'images/cyberpunk_2077_box_art.jpg',
    section: 'premium',
    starRating: 4.8,
    ratingCount: 654200,
    playersOnline: 45890,
    catalogCode: 'MM-2020-CPK',
    isNewBadge: true,
    genres: ['Action', 'RPG', 'Open World'],
    description: 'Cyberpunk 2077 is an open-world, action-adventure RPG set in the dark future of Night City — a dangerous megalopolis obsessed with power, glamor, and ceaseless body modification.',
    streamUrl: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/',
    screenshots: [
      'images/cyberpunk_2077_ss0.jpg',
      'images/cyberpunk_2077_ss1.jpg',
      'images/cyberpunk_2077_ss2.jpg',
      'images/cyberpunk_2077_ss3.jpg',
      'images/cyberpunk_2077_ss4.jpg'
    ]
  },
  {
    title: 'Super Mario World (1990)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🍄',
    coverImage: 'images/mario_world.jpg',
    section: 'retro',
    starRating: 4.9,
    ratingCount: 48912,
    playersOnline: 5892,
    catalogCode: 'LC-1990-SMW',
    genres: ['Platformer', 'Retro']
  },
  {
    title: 'The Legend of Zelda: Ocarina of Time (1998)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🗡️',
    coverImage: 'images/ocarina.jpg',
    section: 'retro',
    starRating: 5.0,
    ratingCount: 92451,
    playersOnline: 4124,
    catalogCode: 'LC-1998-LZO',
    genres: ['Action', 'Adventure', 'Retro']
  },
  {
    title: 'Tetris (1989)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🧩',
    coverImage: 'images/tetris.jpg',
    section: 'retro',
    starRating: 4.8,
    ratingCount: 35890,
    playersOnline: 2903,
    catalogCode: 'LC-1989-TET',
    genres: ['Puzzle', 'Retro']
  },
  {
    title: 'The Legend of Zelda: Twilight Princess',
    publisher: 'THE GAME REPOSITORY',
    icon: '🐺',
    coverImage: 'images/The_Legend_of_Zelda_Twilight_Princess_Game_Cover.jpg',
    section: 'retro',
    starRating: 4.7,
    ratingCount: 15632,
    playersOnline: 1547,
    catalogCode: 'LC-2006-LZT',
    genres: ['Action', 'Adventure']
  },
  {
    title: 'Snake II (2000)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🐍',
    coverImage: 'images/snake.jpg',
    section: 'mobile',
    starRating: 4.6,
    ratingCount: 9120,
    playersOnline: 743,
    catalogCode: 'MS-2000-SNK',
    genres: ['Arcade', 'Retro']
  },
  {
    title: 'Space Impact (2000)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🚀',
    coverImage: 'images/space_impact.jpg',
    section: 'mobile',
    starRating: 4.4,
    ratingCount: 4520,
    playersOnline: 512,
    catalogCode: 'MS-2000-SPI',
    genres: ['Shooter', 'Retro']
  },
  {
    title: 'Bounce (2001)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🔴',
    coverImage: 'images/bounce.jpg',
    section: 'mobile',
    starRating: 4.3,
    ratingCount: 6150,
    playersOnline: 389,
    catalogCode: 'MS-2001-BNC',
    genres: ['Platformer', 'Retro']
  },
  {
    title: 'Cave Story (2004)',
    publisher: 'THE GAME REPOSITORY',
    icon: '✨',
    coverImage: 'images/cave_story.jpg',
    section: 'niche',
    starRating: 4.8,
    ratingCount: 15780,
    playersOnline: 1201,
    catalogCode: 'ID-2004-CVS',
    genres: ['Metroidvania', 'Indie']
  },
  {
    title: 'Spelunky Classic (2008)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🌱',
    coverImage: 'images/spelunky.jpg',
    section: 'niche',
    starRating: 4.7,
    ratingCount: 10430,
    playersOnline: 876,
    catalogCode: 'ID-2008-SPL',
    genres: ['Roguelike', 'Indie']
  },
  {
    title: 'Dwarf Fortress Alpha (2006)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🔮',
    coverImage: 'images/dwarf_fortress.jpg',
    section: 'niche',
    starRating: 4.9,
    ratingCount: 19650,
    playersOnline: 634,
    catalogCode: 'ID-2006-DFF',
    genres: ['Simulation', 'Indie']
  },
  {
    title: 'Infinity Blade (2010)',
    publisher: 'THE GAME REPOSITORY',
    icon: '⚔️',
    coverImage: 'images/infinity_blade.jpg',
    section: 'ios',
    starRating: 4.8,
    ratingCount: 31240,
    playersOnline: 1893,
    catalogCode: 'MS-2010-IFB',
    genres: ['Action', 'iOS']
  },
  {
    title: 'Flappy Bird (2013)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🐤',
    coverImage: 'images/flappy_bird.png',
    section: 'ios',
    starRating: 4.5,
    ratingCount: 148350,
    playersOnline: 3456,
    catalogCode: 'MS-2013-FLB',
    genres: ['Arcade', 'iOS']
  },
  {
    title: 'Angry Birds Classic (2009)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🐦',
    coverImage: 'images/angry_birds.jpg',
    section: 'ios',
    starRating: 4.7,
    ratingCount: 102450,
    playersOnline: 2718,
    catalogCode: 'MS-2009-AGB',
    genres: ['Puzzle', 'iOS']
  },
  {
    title: 'Asphalt 6: Adrenaline (2010)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🏎️',
    coverImage: 'images/asphalt6.jpg',
    section: 'ios',
    starRating: 4.4,
    ratingCount: 13890,
    playersOnline: 1102,
    catalogCode: 'MS-2010-ASP6',
    genres: ['Racing', 'iOS']
  },
  {
    title: 'Bit.Trip Beat (2010)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🎵',
    coverImage: 'images/bittrip.jpg',
    section: 'ios',
    starRating: 4.2,
    ratingCount: 2150,
    playersOnline: 445,
    catalogCode: 'MS-2010-BTB',
    genres: ['Rhythm', 'iOS']
  },
  {
    title: 'Metal Gear Solid Touch (2009)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🕶️',
    coverImage: 'images/mgs_touch.jpg',
    section: 'ios',
    starRating: 4.1,
    ratingCount: 5230,
    playersOnline: 921,
    catalogCode: 'MS-2009-MGS',
    genres: ['Stealth', 'iOS']
  },
  {
    title: 'Serious Sam: Kamikaze Attack! (2011)',
    publisher: 'THE GAME REPOSITORY',
    icon: '💥',
    coverImage: 'images/serious_sam.jpg',
    section: 'ios',
    starRating: 3.9,
    ratingCount: 2480,
    playersOnline: 387,
    catalogCode: 'MS-2011-SSK',
    genres: ['Shooter', 'iOS']
  },
  {
    title: 'SimCity Deluxe (2010)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🏙️',
    coverImage: 'images/simcity.jpg',
    section: 'ios',
    starRating: 4.3,
    ratingCount: 8640,
    playersOnline: 1284,
    catalogCode: 'MS-2010-SCD',
    genres: ['Simulation', 'iOS']
  },
  {
    title: 'FIFA 11 (2010)',
    publisher: 'THE GAME REPOSITORY',
    icon: '⚽',
    coverImage: 'images/fifa11.jpg',
    section: 'ios',
    starRating: 4.2,
    ratingCount: 17120,
    playersOnline: 2091,
    catalogCode: 'MS-2010-F11',
    genres: ['Sports', 'iOS']
  },
  {
    title: 'Urban Crime (2012)',
    publisher: 'THE GAME REPOSITORY',
    icon: '🧨',
    coverImage: 'images/urban_crime.jpg',
    section: 'ios',
    starRating: 3.8,
    ratingCount: 3890,
    playersOnline: 673,
    catalogCode: 'MS-2012-URC',
    genres: ['Action', 'iOS']
  }
];

const seedReviews = [
  {
    username: 'NightOwl_42',
    avatarColor: '#7c6dfa',
    stars: 5,
    text: 'Cloud streaming works flawlessly, no lag. Best retro collection online.',
    timestampLabel: '1 day ago'
  },
  {
    username: 'PixelHunter',
    avatarColor: '#fa6d9a',
    stars: 4,
    text: 'Awesome preservation effort. Some titles need a faster connection.',
    timestampLabel: '3 days ago'
  },
  {
    username: 'VaultDiver',
    avatarColor: '#42f5a1',
    stars: 5,
    text: 'The cloud ready badge is no joke - 60fps on a Chromebook.',
    timestampLabel: '1 week ago'
  }
];

const seedHowItWorks = [
  {
    title: 'Create Account',
    description: 'Sign up in seconds. No credit card required for the free tier.',
    icon: '👤'
  },
  {
    title: 'Browse Library',
    description: 'Choose from hundreds of curated games across every era of gaming history.',
    icon: '🎮'
  },
  {
    title: 'Stream Instantly',
    description: 'Click play. Our high-performance pods stream the game directly to your browser.',
    icon: '☁️'
  },
  {
    title: 'Play Anywhere',
    description: 'Pick up where you left off on any device. Your progress is always in sync.',
    icon: '🌐'
  }
];

const seedFooter = [
  {
    title: 'Product',
    links: [
      { label: 'Browse Library', href: '#' },
      { label: 'Cloud Streaming', href: '#' },
      { label: 'Pricing', href: '#' },
      { label: 'Roadmap', href: '#' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Press', href: '#' },
      { label: 'Contact', href: '#' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help Center', href: '#' },
      { label: 'Community', href: '#' },
      { label: 'Status', href: '#' },
      { label: 'API Docs', href: '#' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Cookies', href: '#' },
      { label: 'DMCA', href: '#' }
    ]
  }
];

const defaultGpuOptions = [
  {
    name: 'NVIDIA RTX 2060',
    ping: '12ms',
    nodeLocation: 'US-East Nodes',
    freeSlots: 8,
    isFull: false,
    isLocked: false
  },
  {
    name: 'NVIDIA RTX 3060',
    ping: '18ms',
    nodeLocation: 'US-East Nodes',
    freeSlots: 18,
    isFull: false,
    isLocked: false
  },
  {
    name: 'NVIDIA RTX 4080',
    ping: '32ms',
    nodeLocation: 'Backup Node',
    freeSlots: 0,
    isFull: false,
    isLocked: true
  }
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[mongo] connected');

  console.log('[seed] clearing collections...');
  await Promise.all([
    Game.deleteMany({}),
    Review.deleteMany({}),
    QueueSetting.deleteMany({}),
    StreamingConfig.deleteMany({}),
    TrendingConfig.deleteMany({}),
    Notification.deleteMany({}),
    SiteSetting.deleteMany({})
  ]);

  console.log('[seed] inserting games...');
  const games = await Game.insertMany(seedGames);
  console.log(`[seed] inserted ${games.length} games`);

  console.log('[seed] inserting reviews (linked to first 3 games)...');
  const sampleGameIds = games.slice(0, 3).map((g) => g._id);
  const reviewDocs = seedReviews.map((r, i) => ({
    ...r,
    game: sampleGameIds[i % sampleGameIds.length]
  }));
  await Review.insertMany(reviewDocs);

  console.log('[seed] inserting queue + streaming settings per game...');
  const queueDocs = games.map((g, i) => ({
    game: g._id,
    position: Math.floor(Math.random() * 4000) + 200,
    estimatedWait: `${Math.floor(Math.random() * 5) + 1}h ${Math.floor(
      Math.random() * 60
    )}m`,
    onlineNow: g.playersOnline
  }));
  await QueueSetting.insertMany(queueDocs);

  const streamDocs = games.map((g) => ({
    game: g._id,
    gpuOptions: defaultGpuOptions
  }));
  await StreamingConfig.insertMany(streamDocs);

  console.log('[seed] inserting trending config...');
  const sorted = [...games]
    .sort((a, b) => b.playersOnline - a.playersOnline)
    .slice(0, 6);
  await TrendingConfig.create({
    title: 'Trending This Week',
    enabled: true,
    items: sorted.map((g, i) => ({
      game: g._id,
      rank: i + 1,
      rankLabel: `#${i + 1}`
    }))
  });

  console.log('[seed] inserting notification + site settings...');
  await Notification.create({});
  await SiteSetting.create({
    howItWorksSteps: seedHowItWorks,
    footerColumns: seedFooter
  });

  console.log('[seed] done.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[seed failed]', err);
  process.exit(1);
});