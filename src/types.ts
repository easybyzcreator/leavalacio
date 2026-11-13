export interface Category {
  id: string;
  title: string;
  order: number;
  catalog?: 'catalog1' | 'catalog2' | 'both';
}

export type PriceType = 'fixed' | 'starting' | 'consult';

export interface Side {
  id: string;
  name: string;
  price: number;
  type?: 'side' | 'swap';
}

export interface ProductSize {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  unitPrice?: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  priceType?: PriceType;
  image: string; // Base64
  categoryId?: string;
  isMeal?: boolean;
  isCustomCake?: boolean;
  ingredients?: string; // Comma separated
  allowedSides?: string[]; // IDs of sides
  isActive?: boolean;
  hasSizes?: boolean;
  sizes?: ProductSize[];
  cakeGalleryId?: string; // Associated image gallery
  order?: number;
  tag?: string;
  b2bFromPriceMode?: 'default' | 'min_total' | 'max_total' | 'min_unit' | 'max_unit';
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  mealOptions?: {
    removals: string[];
    sides: Side[];
  };
  selectedSize?: ProductSize;
  cakeOptions?: {
    size?: string;
    dough?: string;
    fillings?: string[];
    topping?: string;
    topper?: string;
    styleNumber?: number; // Selected image style number from gallery
  };
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  street?: string;
  number?: string;
  zipCode?: string;
  city?: string;
  pickupDate?: string;
  birthday: string;
  observation: string;
  email: string;
  items: {
    title: string;
    quantity: number;
    price: number;
    priceType?: PriceType;
    mealOptions?: {
      removals: string[];
      sides: Side[];
    };
    selectedSize?: ProductSize;
    cakeOptions?: {
      size?: string;
      dough?: string;
      fillings?: string[];
      topping?: string;
      topper?: string;
      styleNumber?: number; // Selected style image number from gallery
    };
  }[];
  total: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  createdAt: any;
  orderLanguage?: string;
  isB2B?: boolean;
  isPJ?: boolean;
  b2bManagerName?: string;
  b2bFrequency?: 'one-time' | 'weekly' | 'biweekly' | 'monthly' | string;
  b2bCompanyName?: string;
  b2bAddress?: string;
  b2bZipCode?: string;
  b2bCity?: string;
  paymentStatus?: 'not_paid' | '50_deposit' | 'paid_full';
  productionValidated?: boolean;
  deliveryStatus?: 'pending' | 'delivered';
  isDelivered?: boolean;
  deliveredAt?: any;
  pickupTime?: string;
  salesRep?: string;
  commissionRate?: number;
  commissionAmount?: number;
  commissionStatus?: 'pending' | 'paid';
  commissionPaidAt?: any;
  totalPackages?: number;
}

export interface ImageGallery {
  id: string;
  title: string;
  images: string[]; // maximum 6 base64 images
}

export interface Settings {
  logo: string;
  primaryColor: string;
  whatsappNumber: string;
  whatsappCountryCode?: string;
  slug: string;
  brandName: string;
  adminPassword?: string;
  slogan?: string;
  whatsappClosingMessage?: string;
  backgroundImage?: string;
  glassColor?: string;
  textColor?: string;
  itemElementsColor?: string;
  language?: 'pt' | 'en';
  currency?: 'BRL' | 'USD';
  checkoutTitle?: string;
  infoBlock1Title?: string;
  infoBlock1Text?: string;
  infoBlock2Title?: string;
  infoBlock2Text?: string;
  // Intro screen settings
  introEnabled?: boolean;
  introTitle?: string;
  introSubtitle?: string;
  introDescription?: string;
  introButtonText?: string;
  introBottomText?: string;
  // Catalog selector settings
  selectorEnabled?: boolean;
  selectorTitle?: string;
  selectorSubtitle?: string;
  catalog1Title?: string;
  catalog1Image?: string;
  catalog1Desc?: string;
  catalog1Slogan?: string;
  catalog1Active?: boolean;
  catalog2Title?: string;
  catalog2Image?: string;
  catalog2Desc?: string;
  catalog2Slogan?: string;
  catalog2Active?: boolean;
  // Custom Cake settings
  cakeSizes?: string[];
  cakeDoughs?: string[];
  cakeFillings?: string[];
  cakeFillingsMax?: number;
  cakeToppings?: string[];
  cakeToppers?: string[];
  b2bButtonText?: string;
  b2bActive?: boolean;
  b2bSlogan?: string;
  b2bBannerTitle?: string;
  b2bBannerText?: string;
  b2bPriceDetailsTitle?: string;
  b2bPriceDetailsText?: string;
  b2bFromPriceMode?: 'min_total' | 'max_total' | 'min_unit' | 'max_unit';
  salesReps?: string[];
}
