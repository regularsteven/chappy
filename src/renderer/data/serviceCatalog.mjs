import { accentColors, serviceCatalogBase } from './serviceCatalog.core.mjs';
import whatsappIcon from '../assets/icons/whatsapp.svg?url';
import messengerIcon from '../assets/icons/messenger.svg?url';
import discordIcon from '../assets/icons/discord.svg?url';
import telegramIcon from '../assets/icons/telegram.svg?url';
import signalIcon from '../assets/icons/signal.svg?url';
import gmailIcon from '../assets/icons/gmail.svg?url';
import trelloIcon from '../assets/icons/trello.svg?url';
import calendarIcon from '../assets/icons/calendar.svg?url';

const iconMap = {
  whatsapp: whatsappIcon,
  messenger: messengerIcon,
  discord: discordIcon,
  telegram: telegramIcon,
  signal: signalIcon,
  gmail: gmailIcon,
  trello: trelloIcon,
  calendar: calendarIcon
};

export { accentColors };

export const serviceCatalog = serviceCatalogBase.map((tab) => ({
  ...tab,
  icon: iconMap[tab.id]
}));
