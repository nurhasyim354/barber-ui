/**
 * Preset tema warna per jenis bisnis tenant.
 * Setiap preset memiliki 4 warna yang sama dengan ITenantTheme.
 * Tenant tetap bisa override warna custom setelah memilih preset.
 */

export interface TenantThemePreset {
  key: string;
  label: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  paperColor: string;
}

// Tema default platform (Aero Glass biru Vista)
export const DEFAULT_PRESET: TenantThemePreset = {
  key: 'default',
  label: 'Aero Blue (Default)',
  description: 'Biru langit bersih — cocok untuk semua jenis bisnis',
  primaryColor: '#3788D9',
  accentColor: '#1E4873',
  bgColor: '#BFD8EF',
  paperColor: '#F7FBFF',
};

// Preset per jenis bisnis
export const THEME_PRESETS_BY_TYPE: Record<string, TenantThemePreset[]> = {
  barbershop: [
    {
      key: 'barbershop_dark',
      label: 'Barbershop Classic',
      description: 'Hitam elegan dengan aksen emas — nuansa barbershop premium',
      primaryColor: '#C9A84C',
      accentColor: '#8B6914',
      bgColor: '#1C1C1E',
      paperColor: '#2C2C2E',
    },
    {
      key: 'barbershop_retro',
      label: 'Barbershop Retro',
      description: 'Merah & krem — gaya barbershop klasik Amerika',
      primaryColor: '#C0392B',
      accentColor: '#96281B',
      bgColor: '#F5F0E8',
      paperColor: '#FFFDF7',
    },
    {
      key: 'barbershop_modern',
      label: 'Barbershop Modern',
      description: 'Abu gelap & tosca — tampilan salon modern minimalis',
      primaryColor: '#00B4A6',
      accentColor: '#007A6E',
      bgColor: '#F0F4F4',
      paperColor: '#FFFFFF',
    },
  ],
  klinik: [
    {
      key: 'klinik_clean',
      label: 'Medical Clean',
      description: 'Biru medis & putih — kesan bersih dan profesional',
      primaryColor: '#0077B6',
      accentColor: '#023E8A',
      bgColor: '#E8F4FB',
      paperColor: '#F8FEFF',
    },
    {
      key: 'klinik_teal',
      label: 'Medical Teal',
      description: 'Hijau-biru teal — nuansa kesehatan modern',
      primaryColor: '#0D9488',
      accentColor: '#0F766E',
      bgColor: '#E6FFFA',
      paperColor: '#F0FFFD',
    },
    {
      key: 'klinik_soft',
      label: 'Soft Healthcare',
      description: 'Ungu lembut & putih — cocok untuk klinik kecantikan/holistik',
      primaryColor: '#7C3AED',
      accentColor: '#5B21B6',
      bgColor: '#F5F3FF',
      paperColor: '#FDFCFF',
    },
  ],
  bengkel_motor: [
    {
      key: 'bengkel_industrial',
      label: 'Garage Industrial',
      description: 'Merah teknis & abu — nuansa bengkel bertenaga',
      primaryColor: '#DC2626',
      accentColor: '#991B1B',
      bgColor: '#F5F5F0',
      paperColor: '#FFFFFF',
    },
    {
      key: 'bengkel_orange',
      label: 'Mechanic Orange',
      description: 'Oranye & hitam — energik dan bertenaga',
      primaryColor: '#EA580C',
      accentColor: '#C2410C',
      bgColor: '#FFF7ED',
      paperColor: '#FFFBF8',
    },
    {
      key: 'bengkel_dark',
      label: 'Dark Garage',
      description: 'Hitam & kuning — kontras tajam ala bengkel balap',
      primaryColor: '#CA8A04',
      accentColor: '#A16207',
      bgColor: '#1C1A17',
      paperColor: '#2A2720',
    },
  ],
  spa_kecantikan: [
    {
      key: 'spa_rose',
      label: 'Spa Rose Gold',
      description: 'Mawar & krem lembut — elegan dan feminin',
      primaryColor: '#BE7B7B',
      accentColor: '#8B4A4A',
      bgColor: '#FDF0EE',
      paperColor: '#FFF9F8',
    },
    {
      key: 'spa_lavender',
      label: 'Lavender Spa',
      description: 'Ungu lavender & putih — menenangkan dan mewah',
      primaryColor: '#9B59B6',
      accentColor: '#6C3483',
      bgColor: '#F5EEF8',
      paperColor: '#FDFAFF',
    },
    {
      key: 'spa_earth',
      label: 'Earth Spa',
      description: 'Cokelat earth & krem — alami dan hangat',
      primaryColor: '#8B6344',
      accentColor: '#6B4226',
      bgColor: '#F5EFE8',
      paperColor: '#FFFDF9',
    },
  ],
  jasa_umum: [
    {
      key: 'jasa_blue',
      label: 'Professional Blue',
      description: 'Biru bersih — tema default profesional',
      primaryColor: '#3788D9',
      accentColor: '#1E4873',
      bgColor: '#BFD8EF',
      paperColor: '#F7FBFF',
    },
    {
      key: 'jasa_green',
      label: 'Business Green',
      description: 'Hijau kepercayaan — cocok untuk jasa konsultan & profesional',
      primaryColor: '#16A34A',
      accentColor: '#15803D',
      bgColor: '#F0FDF4',
      paperColor: '#FAFFFE',
    },
    {
      key: 'jasa_slate',
      label: 'Slate Corporate',
      description: 'Abu slate modern — tampilan korporat elegan',
      primaryColor: '#475569',
      accentColor: '#334155',
      bgColor: '#F1F5F9',
      paperColor: '#FAFBFC',
    },
  ],
  ppob: [
    {
      key: 'ppob_green',
      label: 'Fintech Green',
      description: 'Hijau segar — cocok untuk layanan keuangan & PPOB',
      primaryColor: '#059669',
      accentColor: '#047857',
      bgColor: '#ECFDF5',
      paperColor: '#F8FFFC',
    },
    {
      key: 'ppob_blue',
      label: 'Digital Blue',
      description: 'Biru digital — nuansa modern dan terpercaya',
      primaryColor: '#2563EB',
      accentColor: '#1D4ED8',
      bgColor: '#EFF6FF',
      paperColor: '#F8FBFF',
    },
    {
      key: 'ppob_purple',
      label: 'Tech Purple',
      description: 'Ungu teknologi — modern dan menarik',
      primaryColor: '#7C3AED',
      accentColor: '#6D28D9',
      bgColor: '#F5F3FF',
      paperColor: '#FDFCFF',
    },
  ],
  carwash: [
    {
      key: 'carwash_sky',
      label: 'Clean Sky',
      description: 'Biru langit cerah — segar dan bersih',
      primaryColor: '#0EA5E9',
      accentColor: '#0284C7',
      bgColor: '#E0F2FE',
      paperColor: '#F0FAFF',
    },
    {
      key: 'carwash_ocean',
      label: 'Ocean Wash',
      description: 'Biru tua & tosca — kesan air bersih premium',
      primaryColor: '#0096C7',
      accentColor: '#0077B6',
      bgColor: '#CAF0F8',
      paperColor: '#F0FAFF',
    },
    {
      key: 'carwash_fresh',
      label: 'Fresh Green',
      description: 'Hijau segar — eco-friendly car wash',
      primaryColor: '#22C55E',
      accentColor: '#16A34A',
      bgColor: '#DCFCE7',
      paperColor: '#F0FFF6',
    },
  ],
  restaurant: [
    {
      key: 'restaurant_warm',
      label: 'Warm Bistro',
      description: 'Merah-oranye hangat — membangkitkan selera makan',
      primaryColor: '#E76F51',
      accentColor: '#C1440E',
      bgColor: '#FFF3E0',
      paperColor: '#FFFBF5',
    },
    {
      key: 'restaurant_dark',
      label: 'Fine Dining',
      description: 'Hitam & emas — restoran premium dan elegan',
      primaryColor: '#D4A843',
      accentColor: '#A07C2A',
      bgColor: '#1A1810',
      paperColor: '#252218',
    },
    {
      key: 'restaurant_fresh',
      label: 'Fresh & Healthy',
      description: 'Hijau segar — restoran sehat & vegan friendly',
      primaryColor: '#4CAF50',
      accentColor: '#388E3C',
      bgColor: '#F1F8E9',
      paperColor: '#FAFFFA',
    },
  ],
  toko: [
    {
      key: 'toko_green',
      label: 'Shop Green',
      description: 'Hijau segar — toko & warung ramah',
      primaryColor: '#52B788',
      accentColor: '#2D6A4F',
      bgColor: '#D8F3DC',
      paperColor: '#F0FFF5',
    },
    {
      key: 'toko_orange',
      label: 'Market Orange',
      description: 'Oranye cerah — pasar & toko ramai',
      primaryColor: '#F97316',
      accentColor: '#C2580A',
      bgColor: '#FFF7ED',
      paperColor: '#FFFCF8',
    },
    {
      key: 'toko_blue',
      label: 'Mart Blue',
      description: 'Biru cerah — minimarket & toko modern',
      primaryColor: '#1E88E5',
      accentColor: '#1565C0',
      bgColor: '#E3F2FD',
      paperColor: '#F5FAFF',
    },
  ],
  laundry: [
    {
      key: 'laundry_fresh',
      label: 'Fresh Laundry',
      description: 'Biru muda & putih bersih — segar seperti cucian baru',
      primaryColor: '#0EA5E9',
      accentColor: '#0369A1',
      bgColor: '#E0F2FE',
      paperColor: '#F0FAFF',
    },
    {
      key: 'laundry_teal',
      label: 'Clean Teal',
      description: 'Teal & putih — kesan bersih dan modern',
      primaryColor: '#0D9488',
      accentColor: '#0F766E',
      bgColor: '#CCFBF1',
      paperColor: '#F0FDFB',
    },
    {
      key: 'laundry_soft',
      label: 'Soft Purple',
      description: 'Ungu lembut — laundry premium & boutique',
      primaryColor: '#7C3AED',
      accentColor: '#5B21B6',
      bgColor: '#EDE9FE',
      paperColor: '#FDFAFF',
    },
  ],
};

/**
 * Kembalikan preset untuk tipe tertentu + DEFAULT_PRESET selalu muncul.
 * Jika tipe tidak dikenal, hanya kembalikan DEFAULT_PRESET.
 */
export function getPresetsForType(tenantType?: string): TenantThemePreset[] {
  const typePresets = tenantType ? (THEME_PRESETS_BY_TYPE[tenantType] ?? []) : [];
  return [DEFAULT_PRESET, ...typePresets];
}
