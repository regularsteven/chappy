// Taxonomy definitions for service categorization
export const taxonomies = {
  chat: { label: 'Chat', color: '#38bdf8' },
  social: { label: 'Social', color: '#a855f7' },
  productivity: { label: 'Productivity', color: '#10b981' },
  ai: { label: 'AI', color: '#f97316' },
  streaming: { label: 'Streaming', color: '#f43f5e' },
  news: { label: 'News', color: '#eab308' }
};

export const accentColors = ['#38bdf8', '#a855f7', '#f97316', '#10b981', '#f43f5e', '#eab308'];

export const serviceCatalogBase = [
  // Existing Chat Services
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    url: 'https://web.whatsapp.com',
    color: accentColors[0],
    description: 'Rich, encrypted messaging on the web.',
    taxonomies: ['chat']
  },
  {
    id: 'messenger',
    title: 'Messenger',
    url: 'https://www.facebook.com/messages/',
    color: accentColors[1],
    description: "Facebook's chat client for text, audio, and video.",
    taxonomies: ['chat', 'social']
  },
  {
    id: 'instagram',
    title: 'Instagram DMs',
    url: 'https://www.instagram.com/direct/inbox/',
    color: accentColors[2],
    description: 'Manage Instagram direct messages in a dedicated tab.',
    taxonomies: ['chat', 'social']
  },
  {
    id: 'discord',
    title: 'Discord',
    url: 'https://discord.com/app',
    color: accentColors[2],
    description: 'Community chats, servers, and DMs in one app.',
    taxonomies: ['chat', 'social']
  },
  {
    id: 'telegram',
    title: 'Telegram',
    url: 'https://web.telegram.org',
    color: accentColors[3],
    description: 'Secure messenger with powerful desktop web client.',
    taxonomies: ['chat']
  },
  {
    id: 'signal',
    title: 'Signal',
    url: 'https://signal.org',
    color: accentColors[3],
    description: 'Privacy-focused encrypted messenger.',
    taxonomies: ['chat']
  },
  // Productivity
  {
    id: 'slack',
    title: 'Slack',
    url: 'https://app.slack.com/client',
    color: accentColors[0],
    description: 'Team channels, threads, and DMs for day-to-day work.',
    taxonomies: ['productivity', 'chat']
  },
  {
    id: 'teams',
    title: 'Microsoft Teams',
    url: 'https://teams.microsoft.com',
    color: accentColors[1],
    description: 'Channels, chat, and meetings in one Microsoft workspace.',
    taxonomies: ['productivity', 'chat']
  },
  {
    id: 'linkedin',
    title: 'LinkedIn',
    url: 'https://www.linkedin.com',
    color: accentColors[2],
    description: 'Professional network - connect, message, and network.',
    taxonomies: ['social', 'productivity']
  },
  {
    id: 'googlechat',
    title: 'Google Chat',
    url: 'https://chat.google.com',
    color: accentColors[3],
    description: 'Google Workspace chats and spaces in a focused tab.',
    taxonomies: ['chat', 'productivity']
  },
  {
    id: 'gmail',
    title: 'Gmail',
    url: 'https://mail.google.com',
    color: accentColors[0],
    description: 'Keep tabs on your inbox while staying in Chappy.',
    taxonomies: ['productivity']
  },
  {
    id: 'trello',
    title: 'Trello',
    url: 'https://trello.com',
    color: accentColors[1],
    description: 'Kanban boards and cards for planning sprints.',
    taxonomies: ['productivity']
  },
  {
    id: 'calendar',
    title: 'Google Calendar',
    url: 'https://calendar.google.com',
    color: accentColors[2],
    description: 'See your day, week, or month without leaving the rail.',
    taxonomies: ['productivity']
  },
  // New Social Services
  {
    id: 'facebook',
    title: 'Facebook',
    url: 'https://facebook.com',
    color: '#1877f2',
    description: "Meta's main social platform - feed, notifications, and more.",
    taxonomies: ['social']
  },
  {
    id: 'bluesky',
    title: 'BlueSky',
    url: 'https://bsky.app',
    color: '#0285ff',
    description: 'Decentralized social microblogging platform.',
    taxonomies: ['social']
  },
  {
    id: 'mastodon',
    title: 'Mastodon',
    url: 'https://mastodon.social',
    color: '#6364ff',
    description: 'Open-source federated social network.',
    taxonomies: ['social']
  },
  {
    id: 'x',
    title: 'X (Twitter)',
    url: 'https://x.com',
    color: '#000000',
    description: 'Social microblogging platform.',
    taxonomies: ['social', 'news']
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    url: 'https://www.tiktok.com',
    color: '#ff0050',
    description: 'Short-form video platform.',
    taxonomies: ['social', 'streaming']
  },
  // Streaming
  {
    id: 'youtube',
    title: 'YouTube',
    color: '#ff0000',
    url: 'https://www.youtube.com',
    description: 'Video sharing and streaming platform.',
    taxonomies: ['streaming', 'social']
  },
  {
    id: 'spotify',
    title: 'Spotify',
    url: 'https://open.spotify.com',
    color: '#1db954',
    description: 'Music streaming platform.',
    taxonomies: ['streaming']
  },
  // AI Services
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    url: 'https://chat.openai.com',
    color: '#10a37f',
    description: "OpenAI's AI chatbot and assistant.",
    taxonomies: ['ai']
  },
  {
    id: 'claude',
    title: 'Claude',
    url: 'https://claude.ai',
    color: '#d97706',
    description: "Anthropic's AI assistant.",
    taxonomies: ['ai']
  },
  {
    id: 'xai',
    title: 'xAI / Grok',
    url: 'https://x.ai',
    color: '#000000',
    description: "xAI's Grok chatbot.",
    taxonomies: ['ai']
  },
  {
    id: 'zai',
    title: 'Z.ai',
    url: 'https://z.ai',
    color: '#2563eb',
    description: "Zhipu AI's assistant.",
    taxonomies: ['ai']
  },
  {
    id: 'deepseek',
    title: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    color: '#4f46e5',
    description: 'DeepSeek AI assistant.',
    taxonomies: ['ai']
  },
  {
    id: 'perplexity',
    title: 'Perplexity',
    url: 'https://www.perplexity.ai',
    color: '#9333ea',
    description: 'AI-powered search engine and assistant.',
    taxonomies: ['ai']
  },
  // More Productivity
  {
    id: 'notion',
    title: 'Notion',
    url: 'https://www.notion.so',
    color: '#000000',
    description: 'All-in-one workspace for notes and projects.',
    taxonomies: ['productivity']
  },
  {
    id: 'linear',
    title: 'Linear',
    url: 'https://linear.app',
    color: '#5e6ad2',
    description: 'Issue tracking for modern teams.',
    taxonomies: ['productivity']
  },
  {
    id: 'asana',
    title: 'Asana',
    url: 'https://app.asana.com',
    color: '#f06a6a',
    description: 'Work management platform.',
    taxonomies: ['productivity']
  }
];
