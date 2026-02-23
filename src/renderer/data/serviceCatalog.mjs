import { accentColors, serviceCatalogBase } from './serviceCatalog.core.mjs';
import defaultIcon from '../assets/icons/custom.svg?url';

const iconFiles = import.meta.glob('../assets/icons/*.svg', {
  eager: true,
  import: 'default'
});

const iconMap = Object.entries(iconFiles).reduce((accumulator, [filePath, iconUrl]) => {
  const fileName = filePath.split('/').pop() || '';
  const serviceId = fileName.replace('.svg', '');
  accumulator[serviceId] = iconUrl;
  return accumulator;
}, {});

export { accentColors };

export const serviceCatalog = serviceCatalogBase.map((tab) => ({
  ...tab,
  icon: iconMap[tab.id] || defaultIcon
}));
