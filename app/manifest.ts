import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GoodsFlow',
    short_name: 'GoodsFlow',
    description: '轻量、自然的库存与流水管理。',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDFCF8',
    theme_color: '#FDFCF8',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}

