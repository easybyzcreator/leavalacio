import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, query, orderBy } from 'firebase/firestore';
import { Product, Order, Settings, Category, CartItem, Side, ProductSize, ImageGallery } from '../types';
import { Plus, Minus, ShoppingBag, X, MessageCircle, MessageSquare, Check, Calendar, Building2, User, Phone, MapPin, RefreshCw, ChevronDown, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const translations = {
  pt: {
    cartTitle: 'Seu Carrinho',
    emptyCart: 'Seu carrinho está vazio',
    total: 'Total',
    next: 'Próximo: Seus Dados',
    back: 'Voltar',
    finish: 'Finalizar Pedido',
    fullName: 'Nome Completo',
    phone: 'Telefone',
    email: 'E-mail',
    birthday: 'Aniversário (Mês/Dia)',
    birthdayPlaceholder: 'MM/DD',
    street: 'Rua/Avenida',
    number: 'Nº/Apto',
    zipCode: 'CEP',
    city: 'Cidade',
    observation: 'Observação',
    orderDetails: 'Detalhes do seu Pedido',
    customCakeTitle: 'Opções de Personalização',
    chooseModel: 'Escolha o Modelo',
    chooseSize: 'Escolha o Tamanho',
    chooseDough: 'Escolha a Massa',
    chooseFillings: 'Escolha os Recheios',
    chooseFrosting: 'Escolha a Cobertura',
    chooseSides: 'Escolha os Acompanhamentos',
    excludeIngredients: 'Excluir Ingredientes',
    limitReached: 'Limite atingido',
    addToCart: 'Adicionar ao Carrinho',
    whatsappOrder: 'Pedido',
    whatsappData: 'Dados do Cliente',
    whatsappItems: 'Itens do Pedido',
    whatsappTotal: 'Total do Pedido',
    whatsappDate: 'Data',
    whatsappAt: 'às',
    pickupDate: 'Data de Entrega/Retirada',
    pickupDatePlaceholder: 'MM/DD/AAAA',
    consultMessage: 'Existem itens no pedido com valores a consultar. Aguarde a confirmação pelo WhatsApp.'
  },
  en: {
    cartTitle: 'Your Cart',
    emptyCart: 'Your cart is empty',
    total: 'Total',
    next: 'Next: Your Details',
    back: 'Back',
    finish: 'Finish Order',
    fullName: 'Full Name',
    phone: 'Phone',
    email: 'E-mail',
    birthday: 'Birthday (Month/Day)',
    birthdayPlaceholder: 'MM/DD',
    street: 'Street/Avenue',
    number: 'No./Apt',
    zipCode: 'Zip Code',
    city: 'City',
    observation: 'Observation',
    orderDetails: 'Order Details',
    customCakeTitle: 'Customize your Order',
    chooseModel: 'Choose Model',
    chooseSize: 'Choose Size',
    chooseDough: 'Choose Dough',
    chooseFillings: 'Choose Fillings',
    chooseFrosting: 'Choose Frosting',
    chooseSides: 'Choose Sides',
    excludeIngredients: 'Exclude Ingredients',
    limitReached: 'Limit reached',
    addToCart: 'Add to Cart',
    whatsappOrder: 'Order',
    whatsappData: 'Customer Data',
    whatsappItems: 'Order Items',
    whatsappTotal: 'Order Total',
    whatsappDate: 'Date',
    whatsappAt: 'at',
    pickupDate: 'Pickup/Delivery Date',
    pickupDatePlaceholder: 'MM/DD/YYYY',
    consultMessage: 'There are items with values to be consulted. Please wait for confirmation via WhatsApp.'
  }
};

export const getContrastText = (hexColor?: string): string => {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
  );
  return hsp > 155 ? '#000000' : '#ffffff';
};

export const getColorWithLegibility = (hexColor?: string, defaultColor: string = '#865d39'): string => {
  if (!hexColor) return defaultColor;
  let hex = hexColor.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) return defaultColor;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance > 0.6) {
    return defaultColor;
  }
  return `#${hex}`;
};

export const formatScriptTitle = (str?: string): string => {
  if (!str) return '';
  const trimmed = str.trim();
  if (trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()) {
    return trimmed.toLowerCase().replace(/(?:^|\s|-|\/)\S/g, (c) => c.toUpperCase());
  }
  return trimmed;
};

export default function Menu({
  settings: initialSettings,
  initialCatalog = null,
  isCorporateDirect = false
}: {
  settings: Settings;
  initialCatalog?: 'catalog1' | 'catalog2' | 'catalog_b2b' | null;
  isCorporateDirect?: boolean;
}) {
  const settings = { ...initialSettings, language: 'en' };
  const t = translations['en'];
  const currencySymbol = settings.currency === 'USD' ? '$' : 'R$';

  const DEFAULT_CAKE_SIZES = [
    '7" - 15 to 20 Slices (Approx. 1.5kg)',
    '9" - 25 to 30 Slices (Approx. 2.5kg)',
    '12" - 40 to 50 Slices (Approx. 4.0kg)'
  ];

  const DEFAULT_CAKE_DOUGHS = [
    'Vanilla Dough',
    'Chocolate 50% Cocoa Dough',
    'Red Velvet Dough'
  ];

  const DEFAULT_CAKE_FILLINGS = [
    'Gourmet Brigadeiro (Belgian Chocolate)',
    'Traditional Coconut (Beijinho)',
    'Dulce de Leche (Caramel)',
    'Milk Cream with Red Berries'
  ];

  const DEFAULT_CAKE_TOPPINGS = [
    'Creamy Whipped Milk Nest (Chantininho)',
    'Belgian Chocolate Ganache',
    'Classic Buttercream'
  ];

  const DEFAULT_CAKE_TOPPERS = [
    'None',
    'Happy Birthday',
    'Congratulations'
  ];

  const cakeSizesList = (settings.cakeSizes && settings.cakeSizes.length > 0) ? settings.cakeSizes : DEFAULT_CAKE_SIZES;
  const cakeDoughsList = (settings.cakeDoughs && settings.cakeDoughs.length > 0) ? settings.cakeDoughs : DEFAULT_CAKE_DOUGHS;
  const cakeFillingsList = (settings.cakeFillings && settings.cakeFillings.length > 0) ? settings.cakeFillings : DEFAULT_CAKE_FILLINGS;
  const cakeToppingsList = (settings.cakeToppings && settings.cakeToppings.length > 0) ? settings.cakeToppings : DEFAULT_CAKE_TOPPINGS;
  const cakeToppersList = (settings.cakeToppers && settings.cakeToppers.length > 0) ? settings.cakeToppers : DEFAULT_CAKE_TOPPERS;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [selectedProductForCustom, setSelectedProductForCustom] = useState<Product | null>(null);
  const [isDietsModalOpen, setIsDietsModalOpen] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [mealSelections, setMealSelections] = useState<{
    removals: string[];
    sides: Side[];
  }>({
    removals: [],
    sides: []
  });
  const [sideQuantities, setSideQuantities] = useState<Record<string, number>>({});
  const [selectedCakeSize, setSelectedCakeSize] = useState<string>('');
  const [selectedDough, setSelectedDough] = useState<string>('');
  const [selectedFillings, setSelectedFillings] = useState<string[]>([]);
  const [selectedTopping, setSelectedTopping] = useState<string>('');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]); // dummy if needed, but not used now
  const [selectedTopper, setSelectedTopper] = useState<string>('');
  const [b2bName, setB2bName] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).name || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bResponsibleName, setB2bResponsibleName] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).manager || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bPhone, setB2bPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).phone || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bAddress, setB2bAddress] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).address || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bZipCode, setB2bZipCode] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).zipCode || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bCity, setB2bCity] = useState(() => {
    try {
      const saved = localStorage.getItem('b2b_profile_save');
      return saved ? JSON.parse(saved).city || '' : '';
    } catch {
      return '';
    }
  });
  const [b2bFrequency, setB2bFrequency] = useState<'one-time' | 'weekly'>('one-time');
  const [isReturningB2b, setIsReturningB2b] = useState(() => {
    try {
      return localStorage.getItem('b2b_profile_save') ? true : false;
    } catch {
      return false;
    }
  });
  const [b2bSearchResults, setB2bSearchResults] = useState<any[]>([]);
  const [showB2bSearchDropdown, setShowB2bSearchDropdown] = useState(false);
  const [b2bProfiles, setB2bProfiles] = useState<any[]>([]);
  const [pqCoquetel, setPqCoquetel] = useState(0);
  const [pqMedio, setPqMedio] = useState(0);
  const [pqPremium, setPqPremium] = useState(0);
  const [b2bDate, setB2bDate] = useState('');
  const [b2bObservation, setB2bObservation] = useState('');
  const [b2bSalesRep, setB2bSalesRep] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'summary' | 'form' | 'channels' | 'b2b_channels'>('summary');
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [b2bSuccessUrls, setB2bSuccessUrls] = useState<{ whatsapp: string, sms: string } | null>(null);
  const [standardSuccessUrls, setStandardSuccessUrls] = useState<{ whatsapp: string, sms: string } | null>(null);
  const [galleries, setGalleries] = useState<ImageGallery[]>([]);
  const [selectedStyleNumber, setSelectedStyleNumber] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    street: '',
    number: '',
    zipCode: '',
    city: '',
    aniversario: '',
    observacao: '',
    email: ''
  });

  const [activeScreen, setActiveScreen] = useState<'intro' | 'selector' | 'menu'>(() => {
    if (isCorporateDirect || initialCatalog) return 'menu';
    if (settings.introEnabled !== false) return 'intro';
    if (settings.selectorEnabled !== false) return 'selector';
    return 'menu';
  });
  const [selectedCatalog, setSelectedCatalog] = useState<'catalog1' | 'catalog2' | 'catalog_b2b' | null>(
    () => initialCatalog || (isCorporateDirect ? 'catalog_b2b' : null)
  );

  useEffect(() => {
    if (isCorporateDirect || initialCatalog) {
      setActiveScreen('menu');
      setSelectedCatalog(initialCatalog || 'catalog_b2b');
      return;
    }
    if (settings) {
      if (settings.introEnabled === false && activeScreen === 'intro') {
        if (settings.selectorEnabled !== false) {
          setActiveScreen('selector');
        } else {
          setActiveScreen('menu');
        }
      } else if (settings.introEnabled === false && settings.selectorEnabled === false && activeScreen !== 'menu') {
        setActiveScreen('menu');
      }
    }
  }, [settings, isCorporateDirect, initialCatalog]);

  useEffect(() => {
    if (activeScreen === 'menu' && !selectedCatalog) {
      if (isCorporateDirect || initialCatalog) {
        setSelectedCatalog(initialCatalog || 'catalog_b2b');
      } else if (settings?.catalog1Active !== false) {
        setSelectedCatalog('catalog1');
      } else if (settings?.catalog2Active !== false) {
        setSelectedCatalog('catalog2');
      } else if (settings?.b2bActive !== false) {
        setSelectedCatalog('catalog_b2b');
      }
    }
  }, [activeScreen, selectedCatalog, settings, isCorporateDirect, initialCatalog]);

  useEffect(() => {
    if (selectedProductForDetails) {
      const product = selectedProductForDetails;
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      } else {
        setSelectedSize(null);
      }

      if (product.isCustomCake) {
        setSelectedCakeSize('');
        setSelectedDough('');
        setSelectedFillings([]);
        setSelectedTopping('');
        setSelectedTopper('');
        setSelectedStyleNumber(null);
      }

      setMealSelections({
        removals: []
      });
      setSideQuantities({});
    }
  }, [selectedProductForDetails]);

  useEffect(() => {
    console.log('Menu: Inicilizando listeners...');
    setLoading(true);
    
    const unsubProducts = onSnapshot(query(collection(db, 'produtos'), orderBy('title')), (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      console.log('Menu: Produtos carregados:', fetchedProducts.length);
      setProducts(fetchedProducts);
      setLoading(false);
    }, (error) => {
      console.error('Menu: Erro ao carregar produtos:', error);
      setLoading(false);
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categorias'), orderBy('order', 'asc')), (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      console.log('Menu: Categorias carregadas:', fetchedCategories.length);
      setCategories(fetchedCategories);
    }, (error) => {
      console.error('Menu: Erro ao carregar categorias:', error);
    });

    const unsubSides = onSnapshot(collection(db, 'acompanhamentos'), (snapshot) => {
      const fetchedSides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Side));
      setSides(fetchedSides);
    });

    const unsubGalleries = onSnapshot(collection(db, 'galerias'), (snapshot) => {
      setGalleries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageGallery)));
    });

    const unsubB2bProfiles = onSnapshot(collection(db, 'pedidos'), (snapshot) => {
      const b2bOrders = snapshot.docs
        .map(doc => doc.data())
        .filter((o: any) => o.isB2B || o.isPJ);
      const profilesMap: Record<string, any> = {};
      b2bOrders.forEach((o: any) => {
        const name = o.b2bCompanyName || o.customerName;
        if (name && !profilesMap[name.toLowerCase()]) {
          profilesMap[name.toLowerCase()] = {
            name: name,
            manager: o.b2bManagerName || '',
            phone: o.phone || '',
            address: o.b2bAddress || o.address || ''
          };
        }
      });
      setB2bProfiles(Object.values(profilesMap));
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSides();
      unsubGalleries();
      unsubB2bProfiles();
    };
  }, []);

  // Load B2B Profiles for Autocomplete
  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, 'pedidos'));
      const unsub = onSnapshot(q, (snapshot) => {
        const uniqueProfilesMap: Record<string, any> = {};
        snapshot.docs.forEach(docSnap => {
          const d = docSnap.data();
          if (d.isB2B || d.isPJ) {
            const companyName = d.b2bCompanyName || d.customerName || '';
            const key = companyName.toLowerCase().trim();
            if (key && !uniqueProfilesMap[key]) {
              uniqueProfilesMap[key] = {
                name: companyName,
                manager: d.b2bManagerName || '',
                phone: d.phone || '',
                address: d.b2bAddress || d.address || ''
              };
            }
          }
        });
        setB2bProfiles(Object.values(uniqueProfilesMap));
      });
      return () => unsub();
    } catch (e) {
      console.error("Error loading B2B profiles catalog:", e);
    }
  }, []);

  // Check localStorage for saved B2B profile
  useEffect(() => {
    const saved = localStorage.getItem('b2b_profile_save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) setB2bName(parsed.name);
        if (parsed.manager) setB2bResponsibleName(parsed.manager);
        if (parsed.phone) setB2bPhone(parsed.phone);
        if (parsed.address) setB2bAddress(parsed.address);
        setIsReturningB2b(true);
      } catch (e) {}
    }
  }, []);

  const addToCart = (product: Product) => {
    const hasSizesOpt = !!(product.sizes && product.sizes.length > 0);
    const hasExclusionsOpt = !!(product.isMeal && product.ingredients && product.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
    const hasSidesOpt = !!(product.isMeal && product.allowedSides && product.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
    const isCustomCakeOpt = !!product.isCustomCake;
    
    // If it requires complex customization (exclusions, sides, or cake selection)
    const requiresComplexCustomization = hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt;

    // If we have selectedSize from details modal and NO complex customization is needed, add directly!
    if (hasSizesOpt && selectedSize && !requiresComplexCustomization) {
      setCart(prev => {
        const existing = prev.find(item => item.productId === product.id && !item.mealOptions && item.selectedSize?.id === selectedSize.id);
        if (existing) {
          return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { id: Math.random().toString(36).substr(2, 9), productId: product.id, quantity: 1, selectedSize: selectedSize }];
      });
      return;
    }

    const requiresCustomization = hasSizesOpt || hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt;

    if (requiresCustomization) {
      setSelectedProductForCustom(product);
      setMealSelections({
        removals: []
      });
      setSideQuantities({});
      
      // Preserve existing selectedSize if valid for this product, otherwise set first option
      if (product.sizes && product.sizes.length > 0) {
        const isAlreadySelectedSizeValid = selectedSize && product.sizes.some(s => s.id === selectedSize.id);
        if (!isAlreadySelectedSizeValid) {
          setSelectedSize(product.sizes[0]);
        }
      } else {
        setSelectedSize(null);
      }
      
      if (product.isCustomCake) {
        setSelectedCakeSize('');
        setSelectedDough('');
        setSelectedFillings([]);
        setSelectedTopping('');
        setSelectedTopper('');
        setSelectedStyleNumber(null);
      }
      setIsCustomModalOpen(true);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && !item.mealOptions && !item.selectedSize);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: Math.random().toString(36).substr(2, 9), productId: product.id, quantity: 1 }];
    });
  };

  const incrementSizeQty = (product: Product, size: ProductSize) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.selectedSize?.id === size.id && !item.mealOptions && !item.cakeOptions);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: Math.random().toString(36).substr(2, 9), productId: product.id, quantity: 1, selectedSize: size }];
    });
  };

  const decrementSizeQty = (product: Product, size: ProductSize) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.selectedSize?.id === size.id && !item.mealOptions && !item.cakeOptions);
      if (existing) {
        if (existing.quantity <= 1) {
          return prev.filter(item => item !== existing);
        }
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev;
    });
  };

  const addMealToCart = () => {
    if (!selectedProductForCustom) return;

    if (selectedProductForCustom.isCustomCake) {
      const maxFillings = settings.cakeFillingsMax || 2;
      if (selectedFillings.length > maxFillings) {
        toast.error(`Choose at most ${maxFillings} fillings!`);
        return;
      }
      
      setCart(prev => {
        const newCakeOptions = {
          size: selectedCakeSize,
          dough: selectedDough,
          fillings: selectedFillings,
          topping: selectedTopping,
          topper: selectedTopper,
          styleNumber: selectedStyleNumber || undefined
        };
        
        const existing = prev.find(item => 
          item.productId === selectedProductForCustom.id && 
          item.cakeOptions &&
          item.cakeOptions.size === newCakeOptions.size &&
          item.cakeOptions.dough === newCakeOptions.dough &&
          item.cakeOptions.topping === newCakeOptions.topping &&
          item.cakeOptions.topper === newCakeOptions.topper &&
          item.cakeOptions.styleNumber === newCakeOptions.styleNumber &&
          JSON.stringify([...(item.cakeOptions.fillings || [])].sort()) === JSON.stringify([...newCakeOptions.fillings].sort())
        );

        if (existing) {
          return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
        }

        return [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            productId: selectedProductForCustom.id,
            quantity: 1,
            cakeOptions: newCakeOptions
          }
        ];
      });

      setIsCustomModalOpen(false);
      setSelectedProductForCustom(null);
      return;
    }
    
    const selectedSides: Side[] = [];
    Object.entries(sideQuantities).forEach(([id, qty]) => {
      const side = sides.find(s => s.id === id);
      if (side) {
        for (let i = 0; i < (qty as number); i++) {
          selectedSides.push(side);
        }
      }
    });

    const newMealOptions = selectedProductForCustom.isMeal ? {
      removals: mealSelections.removals,
      sides: selectedSides
    } : undefined;

    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === selectedProductForCustom.id && 
        ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
        (!newMealOptions || (
          JSON.stringify([...(item.mealOptions?.removals || [])].sort()) === JSON.stringify([...newMealOptions.removals].sort()) &&
          JSON.stringify([...(item.mealOptions?.sides || [])].map(s => s.id).sort()) === JSON.stringify([...newMealOptions.sides].map(s => s.id).sort())
        ))
      );

      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
      }

      return [
        ...prev, 
        { 
          id: Math.random().toString(36).substr(2, 9), 
          productId: selectedProductForCustom.id, 
          quantity: 1,
          mealOptions: newMealOptions,
          selectedSize: selectedSize || undefined
        }
      ];
    });

    setIsCustomModalOpen(false);
    setSelectedProductForCustom(null);
    setSelectedSize(null);
  };

  const addDetailedProductToCart = (product: Product) => {
    if (product.isCustomCake) {
      const maxFillings = settings.cakeFillingsMax || 2;
      if (selectedFillings.length > maxFillings) {
        toast.error(`Choose at most ${maxFillings} fillings!`);
        return;
      }
      
      setCart(prev => {
        const newCakeOptions = {
          size: selectedCakeSize,
          dough: selectedDough,
          fillings: selectedFillings,
          topping: selectedTopping,
          topper: selectedTopper,
          styleNumber: selectedStyleNumber || undefined
        };
        
        const existing = prev.find(item => 
          item.productId === product.id && 
          item.cakeOptions &&
          item.cakeOptions.size === newCakeOptions.size &&
          item.cakeOptions.dough === newCakeOptions.dough &&
          item.cakeOptions.topping === newCakeOptions.topping &&
          item.cakeOptions.topper === newCakeOptions.topper &&
          item.cakeOptions.styleNumber === newCakeOptions.styleNumber &&
          JSON.stringify([...(item.cakeOptions.fillings || [])].sort()) === JSON.stringify([...newCakeOptions.fillings].sort())
        );

        if (existing) {
          return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
        }

        return [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            productId: product.id,
            quantity: 1,
            cakeOptions: newCakeOptions
          }
        ];
      });

      setSelectedProductForDetails(null);
      toast.success(settings.language === 'en' ? 'Successfully added to request list!' : 'Adicionado com sucesso ao pedido!');
      return;
    }
    
    const selectedSides: Side[] = [];
    Object.entries(sideQuantities).forEach(([id, qty]) => {
      const side = sides.find(s => s.id === id);
      if (side) {
        for (let i = 0; i < (qty as number); i++) {
          selectedSides.push(side);
        }
      }
    });

    const newMealOptions = product.isMeal ? {
      removals: mealSelections.removals,
      sides: selectedSides
    } : undefined;

    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === product.id && 
        ((!item.selectedSize && !selectedSize) || (item.selectedSize?.id === selectedSize?.id)) &&
        (!newMealOptions || (
          JSON.stringify([...(item.mealOptions?.removals || [])].sort()) === JSON.stringify([...newMealOptions.removals].sort()) &&
          JSON.stringify([...(item.mealOptions?.sides || [])].map(s => s.id).sort()) === JSON.stringify([...newMealOptions.sides].map(s => s.id).sort())
        ))
      );

      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
      }

      return [
        ...prev, 
        { 
          id: Math.random().toString(36).substr(2, 9), 
          productId: product.id, 
          quantity: 1,
          mealOptions: newMealOptions,
          selectedSize: selectedSize || undefined
        }
      ];
    });

    setSelectedProductForDetails(null);
    setSelectedSize(null);
    toast.success(settings.language === 'en' ? 'Successfully added to request list!' : 'Adicionado com sucesso ao pedido!');
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === cartItemId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== cartItemId);
    });
  };

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    const basePrice = item.selectedSize ? item.selectedSize.price : ((product?.price && product.price > 0) ? product.price : (product?.oldPrice || 0));
    let itemPrice = basePrice;
    if (item.mealOptions?.sides) {
      itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
    }
    return total + itemPrice * item.quantity;
  }, 0);

  const checkMarmitifyLimit = () => {
    const totalMeals = cart.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product?.isMeal ? item.quantity : 0);
    }, 0);

    if (totalMeals > 0 && totalMeals < 10) {
      toast.error(settings.language === 'en' 
        ? `Marmitify orders require a minimum of 10 meals/marmitas! Your cart only has ${totalMeals}.` 
        : `Os pedidos da Marmitify exigem um mínimo de 10 marmitas/refeições! Seu carrinho possui apenas ${totalMeals}.`
      );
      return false;
    }
    return true;
  };

  const getB2bItemPackages = (item: CartItem): number => {
    const sizeName = item.selectedSize?.name || '';
    const match = sizeName.match(/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed * (item.quantity || 1);
      }
    }
    return 25 * (item.quantity || 1);
  };

  const totalB2bPackages = cart.reduce((sum, item) => sum + getB2bItemPackages(item), 0);

  const checkB2bLimit = () => {
    return true;
  };

  const handleFinalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkMarmitifyLimit()) {
      return;
    }
    
    const hasConsultItems = cart.some(item => {
      const p = products.find(prod => prod.id === item.productId);
      return p?.priceType === 'consult' || p?.isCustomCake === true;
    });
    
    const orderItems = cart.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      const basePrice = item.selectedSize ? item.selectedSize.price : ((product.price && product.price > 0) ? product.price : (product.oldPrice || 0));
      let itemPrice = basePrice;
      if (item.mealOptions?.sides) {
        itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
      }

      const cleanedMealOptions = item.mealOptions ? {
        removals: item.mealOptions.removals || [],
        sides: (item.mealOptions.sides || []).map(side => ({
          id: side.id,
          name: side.name,
          price: side.price,
          type: side.type || 'side'
        }))
      } : null;

      return {
        title: item.selectedSize ? `${product.title} (${item.selectedSize.name})` : product.title,
        quantity: item.quantity,
        price: itemPrice,
        priceType: product.priceType || 'fixed',
        mealOptions: cleanedMealOptions,
        selectedSize: item.selectedSize || null,
        cakeOptions: item.cakeOptions || null
      };
    });

    const calculatedTax = cartTotal * 0.0875;
    const finalTotalWithTax = cartTotal + calculatedTax;

    const orderData: Omit<Order, 'id'> = {
      customerName: formData.nome,
      phone: formData.telefone,
      address: `${formData.street}, ${formData.number || 'S/N'} - ${formData.city} (${formData.zipCode})`,
      street: formData.street,
      number: formData.number || '',
      zipCode: formData.zipCode,
      city: formData.city,
      birthday: formData.aniversario || '',
      observation: formData.observacao || '',
      email: formData.email || '',
      items: orderItems,
      total: finalTotalWithTax,
      subtotal: cartTotal,
      taxRate: 8.75,
      taxAmount: calculatedTax,
      createdAt: serverTimestamp(),
      orderLanguage: settings.language || 'pt'
    };

    try {
      console.log('Finalizando pedido...', orderData);
      await addDoc(collection(db, 'pedidos'), orderData);
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString(settings.language === 'en' ? 'en-US' : 'pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString(settings.language === 'en' ? 'en-US' : 'pt-BR', { timeZone: 'America/Sao_Paulo' });

      let message = `*${t.whatsappOrder} - ${settings.brandName || settings.slug}*\n`;
      message += `*${t.whatsappDate}:* ${dateStr} ${t.whatsappAt} ${timeStr}\n\n`;
      
      message += `*--- ${t.whatsappData} ---*\n`;
      message += `*${t.fullName}:* ${formData.nome}\n`;
      message += `*${t.phone}:* ${formData.telefone}\n`;
      message += `*${t.email}:* ${formData.email}\n`;
      message += `*${t.birthday}:* ${formData.aniversario}\n`;
      message += `*${t.street}:* ${formData.street}\n`;
      message += `*${t.number}:* ${formData.number || '-'}\n`;
      message += `*${t.zipCode}:* ${formData.zipCode}\n`;
      message += `*${t.city}:* ${formData.city}\n`;
      message += `*${t.observation}:* ${formData.observacao || '-'}\n\n`;

      message += `*--- ${t.whatsappItems} ---*\n`;
      orderItems.forEach((item, idx) => {
        const originalItem = cart[idx];
        if (item.priceType === 'consult') {
          message += `• ${item.quantity}x ${item.title} - (Value to Consult)\n`;
        } else {
          message += `• ${item.quantity}x ${item.title} - ${currencySymbol}${(item.price * item.quantity).toFixed(2)}\n`;
        }
        if (item.mealOptions) {
          if (item.mealOptions.removals.length > 0) {
            message += `  (Excluding: ${item.mealOptions.removals.join(', ')})\n`;
          }
          if (item.mealOptions.sides.length > 0) {
            const normalSidesArr = item.mealOptions.sides.filter(s => s.type !== 'swap');
            const swapSidesArr = item.mealOptions.sides.filter(s => s.type === 'swap');
            
            if (normalSidesArr.length > 0) {
              const grouped = normalSidesArr.reduce((acc: Record<string, number>, s) => { acc[s.name] = (acc[s.name] || 0) + 1; return acc; }, {});
              const str = Object.entries(grouped).map(([name, qty]) => `${name}${Number(qty) > 1 ? ` (${qty}x)` : ''}`).join(', ');
              message += `  (Sides: ${str})\n`;
            }
            if (swapSidesArr.length > 0) {
              const grouped = swapSidesArr.reduce((acc: Record<string, number>, s) => { acc[s.name] = (acc[s.name] || 0) + 1; return acc; }, {});
              const str = Object.entries(grouped).map(([name, qty]) => `${name}${Number(qty) > 1 ? ` (${qty}x)` : ''}`).join(', ');
              message += `  (Swaps: ${str})\n`;
            }
          }
        }
        if (originalItem && originalItem.cakeOptions) {
          const opts = originalItem.cakeOptions;
          if (opts.size) message += `  (Size: ${opts.size})\n`;
          if (opts.dough) message += `  (Dough: ${opts.dough})\n`;
          if (opts.fillings && opts.fillings.length > 0) message += `  (Fillings: ${opts.fillings.join(' + ')})\n`;
          if (opts.topping) message += `  (Topping: ${opts.topping})\n`;
          if (opts.topper) message += `  (Topper: ${opts.topper})\n`;
          if (opts.styleNumber) message += `  (Style Reference: Photo No. ${opts.styleNumber})\n`;
        }
      });

      const calculatedTax = cartTotal * 0.0875;
      const finalTotalWithTax = cartTotal + calculatedTax;

      message += `\n*Subtotal:* ${currencySymbol}${cartTotal.toFixed(2)}`;
      message += `\n*Sales Tax (8.75%):* ${currencySymbol}${calculatedTax.toFixed(2)}`;
      message += `\n*${t.whatsappTotal}:* ${currencySymbol}${finalTotalWithTax.toFixed(2)}\n`;
      
      if (hasConsultItems) {
        message += `\n⚠️ *${t.consultMessage}*\n`;
      }
      
      message += `\n${settings.whatsappClosingMessage || (settings.language === 'en' ? 'Thank you for your order, we will contact you shortly for confirmation!' : 'Obrigada pelo pedido, aguarde que entraremos em contato para confirmação!')}`;

      message += `\n\n*Please note:* The total amount shown above already includes an 8.75% sales tax. We will contact you soon to confirm your order and delivery details, after which we will send you a secure payment link including any applicable delivery fee.`;

      const encodedMessage = encodeURIComponent(message);
      const countryCode = settings.whatsappCountryCode?.replace(/\D/g, '') || '55';
      let whatsappNumber = settings.whatsappNumber?.replace(/\D/g, '') || '';
      
      // Remove country code from number if it's already there to avoid doubling (e.g. 5555...)
      if (whatsappNumber.startsWith(countryCode)) {
        whatsappNumber = whatsappNumber.slice(countryCode.length);
      }
      
      if (!whatsappNumber) {
        toast.error(settings.language === 'en' 
          ? 'Error: Representative contact number is not properly configured in the administration panel.' 
          : 'Erro: Número para contato não configurado corretamente no painel administrativo.'
        );
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const whatsappUrl = isIOS 
        ? `https://api.whatsapp.com/send?phone=${countryCode}${whatsappNumber}&text=${encodedMessage}`
        : `https://wa.me/${countryCode}${whatsappNumber}?text=${encodedMessage}`;
      const smsNumber = `${countryCode}${whatsappNumber}`;
      const smsUrl = `sms:${smsNumber}${isIOS ? '&' : '?'}body=${encodedMessage}`;

      setStandardSuccessUrls({ whatsapp: whatsappUrl, sms: smsUrl });
      setCheckoutStep('channels');
      toast.success(settings.language === 'en' ? 'Order saved! Select your dispatch method below.' : 'Pedido salvo! Selecione a forma de envio abaixo.');
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      toast.error(settings.language === 'en' ? 'Error finalizing order. Please try again.' : 'Erro ao finalizar pedido. Por favor, tente novamente.');
    }
  };

  const handleCompleteStandardOrder = (url: string) => {
    setCart([]);
    setIsModalOpen(false);
    setCheckoutStep('summary');
    setStandardSuccessUrls(null);
    setFormData({ 
      nome: '', 
      telefone: '', 
      endereco: '', 
      street: '',
      number: '',
      zipCode: '',
      city: '',
      aniversario: '', 
      observacao: '', 
      email: '' 
    });
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      window.location.href = url;
    } else {
      try {
        const win = window.open(url, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = url;
        }
      } catch (e) {
        window.location.href = url;
      }
    }
  };

  const handleCompleteB2bOrder = (url: string) => {
    setCart([]);
    setIsModalOpen(false);
    setCheckoutStep('summary');
    setB2bSuccessUrls(null);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      window.location.href = url;
    } else {
      try {
        const win = window.open(url, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = url;
        }
      } catch (e) {
        window.location.href = url;
      }
    }
  };

  const handleFinalizarB2b = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!b2bName.trim() || !b2bResponsibleName.trim() || !b2bPhone.trim() || !b2bAddress.trim() || !b2bZipCode.trim() || !b2bCity.trim() || !b2bDate) {
      toast.error('Please fill in all required fields!');
      return;
    }

    const orderItems = cart.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      const basePrice = item.selectedSize ? item.selectedSize.price : ((product.price && product.price > 0) ? product.price : (product.oldPrice || 0));
      let itemPrice = basePrice;
      if (item.mealOptions?.sides) {
        itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
      }
      const hasPrice = itemPrice > 0;

      let titleStr = item.selectedSize ? `${product.title} (${item.selectedSize.name})` : product.title;
      if (item.cakeOptions) {
        const parts = [];
        if (item.cakeOptions.size) parts.push(`Size: ${item.cakeOptions.size}`);
        if (item.cakeOptions.dough) parts.push(`Dough: ${item.cakeOptions.dough}`);
        if (item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0) parts.push(`Fillings: ${item.cakeOptions.fillings.join(' + ')}`);
        if (item.cakeOptions.topping) parts.push(`Topping: ${item.cakeOptions.topping}`);
        if (item.cakeOptions.topper) parts.push(`Topper: ${item.cakeOptions.topper}`);
        if (item.cakeOptions.styleNumber) parts.push(`Estilo nº ${item.cakeOptions.styleNumber}`);
        titleStr += ` [${parts.join(', ')}]`;
      }
      return {
        title: titleStr,
        quantity: item.quantity,
        price: itemPrice,
        priceType: hasPrice ? (product.priceType || 'fixed') : 'consult',
        selectedSize: item.selectedSize || null
      };
    });

    const b2bSubtotal = cartTotal;
    const b2bTax = b2bSubtotal * 0.0875;
    const b2bTotalWithTax = b2bSubtotal + b2bTax;

    const b2bOrderObj = {
      customerName: b2bName,
      phone: b2bPhone,
      address: b2bAddress,
      zipCode: b2bZipCode,
      city: b2bCity,
      pickupDate: b2bDate ? (() => {
        const [year, month, day] = b2bDate.split('-');
        return `${month}/${day}/${year}`;
      })() : '',
      birthday: '',
      observation: b2bObservation,
      email: '',
      items: orderItems,
      total: b2bTotalWithTax,
      subtotal: b2bSubtotal,
      taxRate: 8.75,
      taxAmount: b2bTax,
      commissionAmount: Number((b2bTotalWithTax * 0.10).toFixed(2)),
      createdAt: serverTimestamp(),
      orderLanguage: 'en',
      isB2B: true,
      isPJ: true,
      b2bManagerName: b2bResponsibleName,
      b2bFrequency: b2bFrequency,
      b2bCompanyName: b2bName,
      b2bAddress: b2bAddress,
      b2bZipCode: b2bZipCode,
      b2bCity: b2bCity,
      salesRep: b2bSalesRep.trim(),
      commissionRate: 0.10,
      commissionStatus: 'pending',
      totalPackages: totalB2bPackages
    };

    try {
      console.log('Sending corporate B2B order request...', b2bOrderObj);
      await addDoc(collection(db, 'pedidos'), b2bOrderObj);
      
      // Persist client details in localStorage so it autofills on subsequent visits!
      localStorage.setItem('b2b_profile_save', JSON.stringify({
        name: b2bName,
        manager: b2bResponsibleName,
        phone: b2bPhone,
        address: b2bAddress,
        zipCode: b2bZipCode,
        city: b2bCity
      }));
      setIsReturningB2b(true);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo' });

      let message = `*Corporate Order Request - ${settings.brandName || settings.slug}*\n`;
      message += `*Date:* ${dateStr} at ${timeStr}\n\n`;
      message += `*--- COMPANY DETAILS ---*\n`;
      message += `*Company Name:* ${b2bName}\n`;
      message += `*Contact Manager:* ${b2bResponsibleName}\n`;
      message += `*Phone:* ${b2bPhone}\n`;
      message += `*Delivery Address:* ${b2bAddress}\n`;
      message += `*Zip Code:* ${b2bZipCode}\n`;
      message += `*City:* ${b2bCity}\n`;
      message += `*Frequency:* ${b2bFrequency === 'weekly' ? 'Weekly Contract (Recurring)' : 'One-Time Order (Spot)'}\n`;
      message += `*Target Start Date:* ${b2bOrderObj.pickupDate}\n`;
      message += `*Total Packages:* ${totalB2bPackages} pkgs\n`;
      if (b2bSalesRep.trim()) {
        message += `*Sales Representative:* ${b2bSalesRep.trim()}\n`;
      }
      if (b2bObservation) {
        message += `*Notes:* ${b2bObservation}\n`;
      }
      message += `\n*--- ORDERED ITEMS ---*\n`;
      orderItems.forEach(item => {
        if (item.price > 0) {
          message += `• ${item.quantity}x ${item.title} - ${currencySymbol}${(item.price * item.quantity).toFixed(2)}\n`;
        } else {
          message += `• ${item.quantity}x ${item.title}\n`;
        }
      });
      if (b2bSubtotal > 0) {
        message += `\n*Subtotal:* ${currencySymbol}${b2bSubtotal.toFixed(2)}`;
        message += `\n*Sales Tax (8.75%):* ${currencySymbol}${b2bTax.toFixed(2)}`;
        message += `\n*Total:* ${currencySymbol}${b2bTotalWithTax.toFixed(2)}\n`;
      }
      message += `\n*Please note:* The total amount shown above already includes an 8.75% sales tax. We will contact you shortly to confirm your order and delivery details, after which we will send you a secure payment link including any applicable delivery fee.\n`;
      
      const encodedMessage = encodeURIComponent(message);
      const countryCode = settings.whatsappCountryCode?.replace(/\D/g, '') || '55';
      let whatsappNumber = settings.whatsappNumber?.replace(/\D/g, '') || '';
      if (whatsappNumber.startsWith(countryCode)) {
        whatsappNumber = whatsappNumber.slice(countryCode.length);
      }

      if (!whatsappNumber) {
        toast.error('Representative contact number is not fully configured in the Admin panel.');
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const whatsappUrl = isIOS 
        ? `https://api.whatsapp.com/send?phone=${countryCode}${whatsappNumber}&text=${encodedMessage}`
        : `https://wa.me/${countryCode}${whatsappNumber}?text=${encodedMessage}`;
      
      const smsNumber = `${countryCode}${whatsappNumber}`;
      const smsUrl = `sms:${smsNumber}${isIOS ? '&' : '?'}body=${encodedMessage}`;

      // Save URLs and go to success channels page
      setB2bSuccessUrls({ whatsapp: whatsappUrl, sms: smsUrl });
      setCheckoutStep('b2b_channels');
      toast.success('Corporate order saved! Choose how you would like to submit below.');
    } catch (error) {
      console.error('Error saving B2B corporate order details:', error);
      toast.error('Failed to submit corporate request. Please verify and try again.');
    }
  };

  if (activeScreen === 'intro') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen p-4 select-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass max-w-md w-full rounded-3xl p-8 border border-white/20 shadow-2xl flex flex-col items-center text-center space-y-8"
        >
          {/* Logo Frame */}
          <div className="relative mt-4">
            <div 
              className="w-36 h-36 rounded-full p-1 flex items-center justify-center overflow-hidden border-[1.5px] shadow-sm flex-shrink-0"
              style={{ borderColor: settings.primaryColor || '#6c4428' }}
            >
              <img 
                src={settings.logo} 
                alt="Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Texts Section */}
          <div className="space-y-4">
            <h1 
              className="text-5xl md:text-6xl font-brand-script font-normal tracking-normal text-center py-1"
              style={{ color: settings.textColor || '#000000' }}
            >
              {formatScriptTitle(settings.introTitle || settings.brandName || 'Lea Valacio')}
            </h1>
            
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="h-[1px] w-12 bg-black/20" />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
              <div className="h-[1px] w-12 bg-black/20" />
            </div>

            <p className="text-sm sm:text-base font-serif italic text-black/80 font-medium max-w-sm mx-auto leading-relaxed px-2">
              {settings.introSubtitle || 'From sacred nature to your plate'}
            </p>
            
            <p 
              className="text-sm font-medium italic max-w-xs mx-auto"
              style={{ color: settings.itemElementsColor || settings.primaryColor || '#865d39' }}
            >
              {settings.introDescription || 'Nourish your body, mind, and soul.'}
            </p>
          </div>

          {/* CTA Button */}
          <div className="w-full pt-4 space-y-4">
            <button
              onClick={() => {
                if (settings.selectorEnabled !== false) {
                  setActiveScreen('selector');
                } else {
                  setActiveScreen('menu');
                }
              }}
              className="w-full py-4 px-6 rounded-full font-bold text-sm tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
            >
              {settings.introButtonText || 'INICIAR MINHA JORNADA'}
            </button>
            
            <p className="text-[10px] font-mono font-bold tracking-widest opacity-60 uppercase text-black pt-2">
              {settings.introBottomText || '100% ARTESANAL & AFRO-BRASILEIRO'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (activeScreen === 'selector') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen p-4 select-none">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="w-full max-w-[605px] flex flex-col items-center space-y-4 sm:space-y-6 py-2 sm:py-6"
        >
          {/* Circular Header Logo */}
          <div 
            className="w-36 h-36 rounded-full p-1 flex items-center justify-center overflow-hidden border-[1.5px] shadow-sm flex-shrink-0"
            style={{ borderColor: settings.primaryColor || '#6c4428' }}
          >
            <img 
              src={settings.logo} 
              alt="Logo" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-5xl md:text-6xl font-brand-script font-normal tracking-normal text-center py-1" style={{ color: settings.textColor || '#000000' }}>
              {formatScriptTitle(settings.selectorTitle || settings.brandName || 'Lea Valacio')}
            </h2>
            <p className="text-xs font-bold tracking-wide uppercase" style={{ color: settings.primaryColor || '#865d39' }}>
              {settings.selectorSubtitle || 'Escolha sua experiência'}
            </p>
          </div>

          {/* Cards Grid - Lado a Lado na vertical e horizontal */}
          <div className="grid grid-cols-2 gap-3.5 w-full mt-4 sm:mt-6">
            {/* Card 1 - 20% mais opaco */}
            {settings.catalog1Active !== false && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedCatalog('catalog1');
                  setActiveScreen('menu');
                }}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.65)' }}
                className="backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center cursor-pointer text-center group border border-white/40 shadow-md justify-between"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/50 shadow-inner">
                  <img 
                    src={settings.catalog1Image || 'https://i.ibb.co/X0vYy7L/cakes.png'} 
                    alt="Catalog 1" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-2.5 space-y-1 w-full flex-grow flex flex-col justify-start">
                  <h3 
                    className="text-lg sm:text-xl font-brand-script font-normal tracking-normal transition-colors leading-tight"
                    style={{ color: settings.primaryColor || '#865d39' }}
                  >
                    {formatScriptTitle(settings.catalog1Title || 'Acarajé & Pratos')}
                  </h3>
                  {settings.catalog1Desc && (
                    <p className="text-[10px] text-black/75 font-semibold leading-tight px-1 block line-clamp-2">
                      {settings.catalog1Desc}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Card 2 - 20% mais opaco */}
            {settings.catalog2Active !== false && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedCatalog('catalog2');
                  setActiveScreen('menu');
                }}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.65)' }}
                className="backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center cursor-pointer text-center group border border-white/40 shadow-md justify-between"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/50 shadow-inner">
                  <img 
                    src={settings.catalog2Image || 'https://i.ibb.co/X0vYy7L/cakes.png'} 
                    alt="Catalog 2" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-2.5 space-y-1 w-full flex-grow flex flex-col justify-start">
                  <h3 
                    className="text-lg sm:text-xl font-brand-script font-normal tracking-normal transition-colors leading-tight"
                    style={{ color: settings.primaryColor || '#865d39' }}
                  >
                    {formatScriptTitle(settings.catalog2Title || 'Bebidas & Sobremesas')}
                  </h3>
                  {settings.catalog2Desc && (
                    <p className="text-[10px] text-black/75 font-semibold leading-tight px-1 block line-clamp-2">
                       {settings.catalog2Desc}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Personalized Diets Button - Styled as a pill button like image 3 but narrow & responsive */}
          {settings.b2bActive !== false && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSelectedCatalog('catalog_b2b');
                setActiveScreen('menu');
              }}
              className="w-full max-w-[220px] py-2 px-5 mt-1 sm:mt-2 rounded-full font-serif font-black text-[11px] tracking-wider uppercase shadow-md border border-white/20 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 focus:outline-none flex-shrink-0"
              style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
            >
              {settings.b2bButtonText || 'CORPORATE & WHOLESALE ORDERS'}
            </motion.button>
          )}
        </motion.div>
        {renderDietsModal()}
      </div>
    );
  }

  if (loading && activeScreen === 'menu') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[50vh] p-4 text-center select-none">
        <div 
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" 
          style={{ borderColor: settings.primaryColor }}
        />
        <p className="mt-4 font-sans font-semibold text-sm text-black/60">
          {settings.language === 'en' ? 'Loading catalog...' : 'Carregando catálogo...'}
        </p>
      </div>
    );
  }

  const filteredCategories = categories.filter(category => {
    const cat = category.catalog || 'catalog1';
    
    if (selectedCatalog === 'catalog_b2b') {
      return cat === 'catalog_b2b' || cat === 'b2b';
    }
    
    // If a category belongs specifically to b2b/corporate, hide it from normal catalogs
    if (cat === 'catalog_b2b' || cat === 'b2b') {
      return false;
    }
    
    if (selectedCatalog) {
      return cat === 'both' || cat === selectedCatalog;
    }
    
    return true;
  });

  return (
    <div className="flex-grow flex flex-col items-center p-4 pb-32">
      {settings.selectorEnabled !== false && !isCorporateDirect && (
        <button
          onClick={() => {
            setSelectedCatalog(null);
            setActiveScreen('selector');
          }}
          className="mt-4 mb-2 px-4 py-2 bg-white/50 backdrop-blur-md hover:bg-white/80 text-black text-xs font-bold rounded-full transition-transform active:scale-95 flex items-center gap-1 shadow-sm border border-white/20 cursor-pointer"
        >
          ← Back to Catalogs
        </button>
      )}

       <div className="mt-6 mb-4 relative flex items-center justify-center">
        <div 
          className="w-36 h-36 rounded-full p-1 flex items-center justify-center overflow-hidden border-[1.5px] shadow-sm flex-shrink-0"
          style={{ borderColor: settings.primaryColor || '#6c4428' }}
        >
          <img 
            src={
              selectedCatalog === 'catalog1'
                ? (settings.catalog1Image || 'https://i.ibb.co/X0vYy7L/cakes.png')
                : selectedCatalog === 'catalog2'
                  ? (settings.catalog2Image || 'https://i.ibb.co/68XwD57/meals.png')
                  : (settings.logo || 'https://i.ibb.co/1t0DZbPG/patitour-2026-06-05-T085539-099.png')
            } 
            alt="Logo" 
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <h1 className="text-4xl sm:text-5xl font-brand-script font-normal mb-2 text-center tracking-normal py-1" style={{ color: settings.primaryColor }}>
        {formatScriptTitle(settings.brandName || 'Easy Plate Menu')}
      </h1>

      {(() => {
        const text = selectedCatalog === 'catalog1'
          ? (settings.catalog1Slogan || settings.catalog1Desc || settings.slogan || '')
          : selectedCatalog === 'catalog2'
            ? (settings.catalog2Slogan || settings.catalog2Desc || settings.slogan || '')
            : selectedCatalog === 'catalog_b2b'
              ? (settings.b2bSlogan || 'Build your corporate order by adding items below. Prices are not displayed since we offer highly progressive volume discounts scaled by volume!')
              : (settings.slogan || 'O sabor que você merece, a um clique de distância.');

        if (selectedCatalog) {
          const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
          if (lines.length > 0) {
            return (
              <div className="flex flex-col items-center mb-12 max-w-sm mx-auto bg-white/40 backdrop-blur-md p-5 rounded-[2rem] border border-white/20 shadow-md">
                <ul className="text-left space-y-2.5 text-xs text-black/80 font-sans font-semibold">
                  {lines.map((line, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="shrink-0 select-none mt-0.5" style={{ color: settings.primaryColor || '#865d39' }}>✦</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
        }

        return (
          <p className="font-medium mb-12 text-center whitespace-pre-wrap max-w-md mx-auto" style={{ color: settings.textColor || '#3f2b1b' }}>
            {text}
          </p>
        );
      })()}



      <div className="w-full max-w-2xl space-y-12">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => {
            const categoryProducts = products
              .filter(p => p.categoryId === category.id && p.isActive !== false)
              .sort((a, b) => {
                const orderA = typeof a.order === 'number' ? a.order : 9999;
                const orderB = typeof b.order === 'number' ? b.order : 9999;
                if (orderA !== orderB) return orderA - orderB;
                return (a.title || '').localeCompare(b.title || '');
              });
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id} className="space-y-6">
                <div className="border-b border-white/20 pb-2">
                  <h2 className="text-2xl font-serif font-bold italic" style={{ color: settings.primaryColor }}>
                    {category.title}
                  </h2>
                </div>
                <div className="space-y-4">
                  {categoryProducts.map((product) => (
                    <motion.div 
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      onClick={(e) => {
                        // If user click is inside the cart button container, don't trigger card action
                        if ((e.target as HTMLElement).closest('.cart-button-area')) {
                          return;
                        }
                        
                        setSelectedProductForDetails(product);
                        if (product.sizes && product.sizes.length > 0) {
                          setSelectedSize(product.sizes[0]);
                        } else {
                          setSelectedSize(null);
                        }
                      }}
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.58)' }}
                      className="backdrop-blur-md rounded-2xl p-3.5 sm:p-5 flex gap-3.5 sm:gap-5 items-center cursor-pointer hover:shadow-md transition-all duration-300 w-full min-h-[110px] sm:min-h-[140px] border border-white/30"
                    >
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-white/50 shadow-sm border border-black/5">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow flex-shrink min-w-0 text-black flex flex-col items-start gap-1 pr-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap w-full">
                          <h3 
                            className="text-sm sm:text-base md:text-lg font-serif font-bold leading-tight break-words"
                            style={{ color: settings.itemElementsColor || settings.primaryColor || '#111827' }}
                          >
                            {product.title}
                          </h3>
                          {product.tag && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-black uppercase tracking-wider">
                              {product.tag}
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-[10px] sm:text-xs text-black/75 leading-tight break-words w-full">
                            {product.description.length > 70 
                              ? `${product.description.substring(0, 70)}...` 
                              : product.description}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductForDetails(product);
                            if (product.sizes && product.sizes.length > 0) {
                              setSelectedSize(product.sizes[0]);
                            } else {
                              setSelectedSize(null);
                            }
                          }}
                          className="text-[10px] uppercase tracking-wider font-extrabold underline block transition-all focus:outline-none cursor-pointer hover:opacity-80 py-0.5 text-left"
                          style={{ color: settings.itemElementsColor || settings.primaryColor }}
                        >
                          {settings.language === 'en' ? 'View Details' : 'Ver Detalhes'}
                        </button>
                        <div className="flex flex-col items-start mt-0.5">
                          {(product.isCustomCake || product.priceType === 'consult') ? (
                            <span className="text-[9px] sm:text-[10px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-500/20">
                              {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                            </span>
                          ) : product.sizes && product.sizes.length > 0 ? (
                            (() => {
                              const positivePrices = product.sizes.map(s => s.price).filter(p => typeof p === 'number' && p > 0);
                              const positiveUnits = product.sizes.map(s => s.unitPrice).filter((p): p is number => typeof p === 'number' && p > 0);

                              if (selectedCatalog === 'catalog_b2b') {
                                const mode = (product.b2bFromPriceMode && product.b2bFromPriceMode !== 'default')
                                  ? product.b2bFromPriceMode
                                  : (settings.b2bFromPriceMode || 'min_total');
                                const unitSuffix = settings.language === 'en' ? 'each' : '/ un.';

                                if (mode === 'min_unit' && positiveUnits.length > 0) {
                                  return (
                                    <p className="text-xs sm:text-base font-bold" style={{ color: settings.itemElementsColor || settings.primaryColor }}>
                                      From {currencySymbol}{Math.min(...positiveUnits).toFixed(2)} {unitSuffix}
                                    </p>
                                  );
                                }
                                if (mode === 'max_unit' && positiveUnits.length > 0) {
                                  return (
                                    <p className="text-xs sm:text-base font-bold" style={{ color: settings.itemElementsColor || settings.primaryColor }}>
                                      From {currencySymbol}{Math.max(...positiveUnits).toFixed(2)} {unitSuffix}
                                    </p>
                                  );
                                }
                                if (mode === 'max_total' && positivePrices.length > 0) {
                                  return (
                                    <p className="text-xs sm:text-base font-bold" style={{ color: settings.itemElementsColor || settings.primaryColor }}>
                                      From {currencySymbol}{Math.max(...positivePrices).toFixed(2)}
                                    </p>
                                  );
                                }
                                if (positivePrices.length > 0) {
                                  return (
                                    <p className="text-xs sm:text-base font-bold" style={{ color: settings.itemElementsColor || settings.primaryColor }}>
                                      From {currencySymbol}{Math.min(...positivePrices).toFixed(2)}
                                    </p>
                                  );
                                }
                                if (positiveUnits.length > 0) {
                                  return (
                                    <p className="text-xs sm:text-base font-bold" style={{ color: settings.itemElementsColor || settings.primaryColor }}>
                                      From {currencySymbol}{Math.min(...positiveUnits).toFixed(2)} {unitSuffix}
                                    </p>
                                  );
                                }
                              } else if (positivePrices.length > 0) {
                                return (
                                  <p className="text-xs sm:text-base font-bold" style={{ color: settings.itemElementsColor || settings.primaryColor }}>
                                    From {currencySymbol}{Math.min(...positivePrices).toFixed(2)}
                                  </p>
                                );
                              }

                              return (
                                <span className="text-[9px] sm:text-[10px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-500/20">
                                  {selectedCatalog === 'catalog_b2b' ? 'Contract Rate' : (settings.language === 'en' ? 'On Request' : 'A Consultar')}
                                </span>
                              );
                            })()
                          ) : ((product.price && product.price > 0) || (product.oldPrice && product.oldPrice > 0)) ? (
                            <>
                              {product.price && product.price > 0 && product.oldPrice && product.oldPrice > 0 ? (
                                <>
                                  <span className="text-[9px] sm:text-xs line-through opacity-40">
                                    {currencySymbol}{product.oldPrice.toFixed(2)}
                                  </span>
                                  <p className="text-xs sm:text-base font-bold" style={{ color: settings.itemElementsColor || settings.primaryColor }}>
                                    {currencySymbol}{product.price.toFixed(2)}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs sm:text-base font-bold" style={{ color: settings.itemElementsColor || settings.primaryColor }}>
                                  {currencySymbol}{(product.price && product.price > 0 ? product.price : product.oldPrice).toFixed(2)}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-[9px] sm:text-[10px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-950 border border-amber-500/20">
                              {selectedCatalog === 'catalog_b2b' ? 'Contract Rate' : (settings.language === 'en' ? 'On Request' : 'A Consultar')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center justify-center cart-button-area pl-1 z-10">
                        {(() => {
                          const requiresCustomization = !!((product.sizes && product.sizes.length > 0) || product.isCustomCake || product.isMeal);
                          const totalQty = cart.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);

                          if (requiresCustomization) {
                            if (totalQty > 0) {
                              return (
                                <div className="flex items-center gap-1 bg-white/75 backdrop-blur-sm p-1 rounded-full border border-black/10 shadow-md">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const productCartItems = cart.filter(item => item.productId === product.id);
                                      if (productCartItems.length > 0) {
                                        const lastItem = productCartItems[productCartItems.length - 1];
                                        removeFromCart(lastItem.id);
                                      }
                                    }}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm border border-gray-200 cursor-pointer active:scale-95 transition-all text-black focus:outline-none"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="font-bold text-xs sm:text-sm min-w-[14px] sm:min-w-[20px] text-center text-black">
                                    {totalQty}
                                  </span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProductForDetails(product);
                                      if (product.sizes && product.sizes.length > 0) {
                                        setSelectedSize(product.sizes[0]);
                                      } else {
                                        setSelectedSize(null);
                                      }
                                    }}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                    style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              );
                            } else {
                              return (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProductForDetails(product);
                                    if (product.sizes && product.sizes.length > 0) {
                                      setSelectedSize(product.sizes[0]);
                                    } else {
                                      setSelectedSize(null);
                                    }
                                  }}
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-lg font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                                  style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                >
                                  <Plus size={16} />
                                </button>
                              );
                            }
                          } else {
                            if (totalQty > 0) {
                              return (
                                <div className="flex items-center gap-1 bg-white/75 backdrop-blur-sm p-1 rounded-full border border-black/10 shadow-md">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const item = cart.find(i => i.productId === product.id);
                                      if (item) removeFromCart(item.id);
                                    }}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm border border-gray-200 cursor-pointer active:scale-95 transition-all text-black focus:outline-none"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="font-bold text-xs sm:text-sm min-w-[14px] sm:min-w-[20px] text-center text-black">
                                    {totalQty}
                                  </span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(product);
                                    }}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                    style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              );
                            } else {
                              return (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(product);
                                  }}
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-lg font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                                  style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                                >
                                  <Plus size={16} />
                                </button>
                              );
                            }
                          }
                        })()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center p-12 opacity-60 glass rounded-2xl">
            Nenhum produto encontrado.
          </div>
        )}
      </div>

      <AnimatePresence>
        {cartItemsCount > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-40"
          >
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full h-16 rounded-2xl shadow-2xl flex items-center justify-between px-6 font-bold text-lg transition-transform active:scale-95 cursor-pointer"
              style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
            >
              <div className="flex items-center gap-3 font-serif">
                <ShoppingBag size={24} />
                <span>{selectedCatalog === 'catalog_b2b' ? (settings.b2bButtonText || 'Ver Orçamento PJ') : 'View Order'}</span>
              </div>
              <div className="flex items-center gap-2 font-serif text-sm">
                <span className="bg-white/20 px-2.5 py-1 rounded-full">{cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}</span>
                {(selectedCatalog !== 'catalog_b2b' || cartTotal > 0) && (
                  <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
                )}
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setCheckoutStep('summary');
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] force-dark-headings"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold" style={{ color: '#000000' }}>
                  {checkoutStep === 'summary' ? t.cartTitle : t.finish}
                </h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setCheckoutStep('summary');
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  style={{ color: '#000000' }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                {checkoutStep === 'summary' ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {cart.map((item) => {
                        const product = products.find(p => p.id === item.productId);
                        if (!product) return null;
                        return (
                          <div key={item.id} className="flex items-center gap-3 bg-white/40 p-3 rounded-2xl border border-white/20 w-full justify-between">
                            <div className="flex items-center gap-3 min-w-0 flex-grow">
                              <img src={product.image} alt={product.title} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-white/50" />
                              <div className="flex-grow min-w-0">
                                <h4 className="font-bold text-sm text-black leading-tight break-words w-full">{product.title}</h4>
                                
                                {item.selectedSize && (
                                  <span className="inline-block bg-[#ffedd5] text-[#7c2d12] text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md leading-none mt-1 border border-[#fed7aa] whitespace-normal break-words max-w-full">
                                    {selectedCatalog === 'catalog_b2b'
                                      ? (settings.language === 'en' ? 'Qty' : 'Qtd')
                                      : (settings.language === 'en' ? 'Size' : 'Tamanho')
                                    }: {item.selectedSize.name}
                                  </span>
                                )}

                                {item.mealOptions && (
                                  <div className="text-[10px] leading-tight mt-1 text-black/60 break-words w-full">
                                    {item.mealOptions.removals.length > 0 && `Exclude: ${item.mealOptions.removals.join(', ')}`}
                                    {item.mealOptions.removals.length > 0 && item.mealOptions.sides.length > 0 && ' • '}
                                    {item.mealOptions.sides.length > 0 && (() => {
                                      const normalSidesArr = item.mealOptions.sides.filter(s => s.type !== 'swap');
                                      const swapSidesArr = item.mealOptions.sides.filter(s => s.type === 'swap');
                                      
                                      const formatter = (arr: any[]) => Object.entries(arr.reduce((acc: Record<string, number>, s) => { 
                                        acc[s.name] = (acc[s.name] || 0) + 1; 
                                        return acc; 
                                      }, {})).map(([name, qty]) => `${name}${Number(qty) > 1 ? ` (${qty}x)` : ''}`).join(', ');

                                      const listParts = [];
                                      if (normalSidesArr.length > 0) {
                                        listParts.push(`Sides: ${formatter(normalSidesArr)}`);
                                      }
                                      if (swapSidesArr.length > 0) {
                                        listParts.push(`Swaps: ${formatter(swapSidesArr)}`);
                                      }
                                      return listParts.join(' • ');
                                    })()}
                                  </div>
                                )}

                                {item.cakeOptions && (
                                  <div className="text-[10px] leading-tight mt-1.5 space-y-0.5 text-black/60 break-words w-full">
                                    {item.cakeOptions.size && (
                                      <div>Size: <span className="font-bold text-black">{item.cakeOptions.size}</span></div>
                                    )}
                                    {item.cakeOptions.dough && (
                                      <div>Dough: <span className="font-bold text-black">{item.cakeOptions.dough}</span></div>
                                    )}
                                    {item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0 && (
                                      <div>Filling: <span className="font-bold text-black">{item.cakeOptions.fillings.join(' + ')}</span></div>
                                    )}
                                    {item.cakeOptions.topping && (
                                      <div>Topping: <span className="font-bold text-black">{item.cakeOptions.topping}</span></div>
                                    )}
                                    {item.cakeOptions.topper && (
                                      <div>Topper: <span className="font-bold text-black">{item.cakeOptions.topper}</span></div>
                                    )}
                                    {item.cakeOptions.styleNumber && (
                                      <div>Cake Reference: <span className="font-bold text-black">Photo No. {item.cakeOptions.styleNumber}</span></div>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-col items-start mt-1.5">
                                  {(product.isCustomCake || product.priceType === 'consult') ? (
                                    <span className="text-[10px] uppercase font-serif font-black tracking-wider px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-950 border border-amber-500/20">
                                      {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                                    </span>
                                  ) : item.selectedSize && item.selectedSize.price > 0 ? (
                                    <>
                                      {item.selectedSize.oldPrice && item.selectedSize.oldPrice > 0 && (
                                        <span className="text-[10px] line-through opacity-40">
                                          {currencySymbol}{item.selectedSize.oldPrice.toFixed(2)}
                                        </span>
                                      )}
                                      <p className="text-xs font-bold text-black">
                                        {currencySymbol}{((item.selectedSize.price + (item.mealOptions?.sides.reduce((sum, s) => sum + s.price, 0) || 0)) * item.quantity).toFixed(2)}
                                      </p>
                                    </>
                                  ) : ((product.price && product.price > 0) || (product.oldPrice && product.oldPrice > 0)) ? (
                                    <>
                                      {product.price && product.price > 0 && product.oldPrice && product.oldPrice > 0 ? (
                                        <>
                                          <span className="text-[10px] line-through opacity-40">
                                            {currencySymbol}{product.oldPrice.toFixed(2)}
                                          </span>
                                          <p className="text-xs font-bold text-black">
                                            {currencySymbol}{((product.price + (item.mealOptions?.sides.reduce((sum, s) => sum + s.price, 0) || 0)) * item.quantity).toFixed(2)}
                                          </p>
                                        </>
                                      ) : (
                                        <p className="text-xs font-bold text-black">
                                          {currencySymbol}{(((product.price && product.price > 0 ? product.price : product.oldPrice) + (item.mealOptions?.sides.reduce((sum, s) => sum + s.price, 0) || 0)) * item.quantity).toFixed(2)}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[10px] uppercase font-serif font-black tracking-wider px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-950 border border-amber-500/20">
                                      {selectedCatalog === 'catalog_b2b' ? 'Contract Rate' : (settings.language === 'en' ? 'On Request' : 'A Consultar')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 flex-shrink-0 pl-2">
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-80 shadow-sm border border-gray-100 active:scale-95 transition-all select-none focus:outline-none"
                              >
                                <Minus size={16} style={{ color: '#000000' }} />
                              </button>
                              <span className="font-bold text-sm text-black min-w-[14px] text-center">{item.quantity}</span>
                              <button 
                                onClick={() => {
                                  setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm font-bold active:scale-95 transition-all select-none focus:outline-none"
                                style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200 flex flex-col gap-2">
                      {selectedCatalog === 'catalog_b2b' ? (
                        <div className="space-y-3">
                          {/* Packages Count Summary */}
                          <div className="p-3.5 rounded-2xl border border-stone-200 bg-white/70 text-stone-900 text-xs font-sans">
                            <div className="flex items-center justify-between font-bold text-sm">
                              <span className="flex items-center gap-1.5 text-stone-800">
                                <Package size={16} className="text-stone-700" />
                                Total Packages in Order:
                              </span>
                              <span className="text-sm font-black px-3 py-1 rounded-xl bg-stone-100 text-stone-900 border border-stone-200">
                                {totalB2bPackages} pkgs
                              </span>
                            </div>
                          </div>

                          {/* Corporate Pricing Breakdown with 8.75% Sales Tax */}
                          <div className="p-4 rounded-2xl bg-white/70 border border-stone-200 text-stone-900 font-sans space-y-2 shadow-xs">
                            <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                              <span>Subtotal:</span>
                              <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                              <span>Sales Tax (8.75%):</span>
                              <span>+ {currencySymbol}{(cartTotal * 0.0875).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                              <span className="text-base font-bold text-black">Total (incl. tax):</span>
                              <span className="text-xl font-black text-black">
                                {currencySymbol}{(cartTotal * 1.0875).toFixed(2)}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-100 text-[10px] text-amber-900 font-bold flex items-start gap-1.5 leading-relaxed mt-1">
                              <span>⚠️</span>
                              <span>An 8.75% sales tax is included in the final corporate order total above.</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold" style={{ color: '#000000' }}>{t.total}</span>
                            <span className="text-2xl font-bold" style={{ color: '#000000' }}>
                              {currencySymbol}{cartTotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-100 text-[10px] text-amber-900 font-bold flex items-start gap-1.5 leading-relaxed">
                            <span>⚠️</span>
                            <span>An 8.75% sales tax will be added to the final total before payment.</span>
                          </div>
                          {cart.some(item => {
                            const p = products.find(prod => prod.id === item.productId);
                            return p?.priceType === 'consult' || p?.isCustomCake === true;
                          }) && (
                            <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-100 text-[10px] text-yellow-800 font-medium">
                              {t.consultMessage}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        if (selectedCatalog === 'catalog_b2b') {
                          setCheckoutStep('form');
                        } else if (checkMarmitifyLimit()) {
                          setCheckoutStep('form');
                        }
                      }}
                      className="w-full py-4 rounded-xl font-bold text-base md:text-lg shadow-xl transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                      style={{ backgroundColor: settings.primaryColor, color: getContrastText(settings.primaryColor) }}
                    >
                      {selectedCatalog === 'catalog_b2b'
                        ? (settings.language === 'en' ? 'Proceed to Company Details' : 'Avançar para Dados da Empresa')
                        : t.next}
                    </button>
                  </div>
                ) : checkoutStep === 'channels' ? (
                  <div className="space-y-6 text-center py-4 font-sans text-black animate-fade-in">
                    <div className="mx-auto w-14 h-14 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-1">
                      <Check size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-serif font-black uppercase tracking-wide text-black">
                        {settings.language === 'en' ? 'Order Saved!' : 'Pedido Salvo!'}
                      </h3>
                      <p className="text-xs font-semibold text-black/60 max-w-sm mx-auto">
                        {settings.language === 'en' 
                          ? 'Your order details have been successfully recorded.' 
                          : 'Os detalhes do seu pedido foram registrados com sucesso.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-950 font-medium text-xs font-sans text-left leading-relaxed">
                      {settings.language === 'en' 
                        ? 'To complete and submit your order, please select one of the delivery messaging channels below to send the details directly to our representative:'
                        : 'Para finalizar e enviar seu pedido, selecione um dos botões de envio por mensagem abaixo para entrar em contato diretamente com o nosso representante:'}
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleCompleteStandardOrder(standardSuccessUrls?.whatsapp || '')}
                        className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0"
                      >
                        <MessageCircle size={18} />
                        <span>{settings.language === 'en' ? 'Send Order via WhatsApp' : 'Enviar Pedido por WhatsApp'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompleteStandardOrder(standardSuccessUrls?.sms || '')}
                        className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0"
                      >
                        <MessageSquare size={18} />
                        <span>{settings.language === 'en' ? 'Send Order via SMS' : 'Enviar Pedido por SMS'}</span>
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        setCheckoutStep('form');
                        setStandardSuccessUrls(null);
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-black hover:underline mt-4 uppercase tracking-wider block mx-auto cursor-pointer"
                    >
                      {settings.language === 'en' ? 'Back to Edit Details' : 'Voltar para os Detalhes'}
                    </button>
                  </div>
                ) : checkoutStep === 'b2b_channels' ? (
                  <div className="space-y-6 text-center py-4 font-sans text-black animate-fade-in">
                    <div className="mx-auto w-14 h-14 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-1">
                      <Check size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-serif font-black uppercase tracking-wide text-black">
                        Corporate Order Received!
                      </h3>
                      <p className="text-xs font-semibold text-black/60 max-w-sm mx-auto">
                        Your company details and order have been recorded.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-950 font-medium text-xs font-sans text-left leading-relaxed">
                      To finalize your order, please send your details to your account manager using one of the options below:
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleCompleteB2bOrder(b2bSuccessUrls?.whatsapp || '')}
                        className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0"
                      >
                        <MessageCircle size={18} />
                        <span>Send Order via WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompleteB2bOrder(b2bSuccessUrls?.sms || '')}
                        className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold font-sans text-sm shadow-md transition-all active:scale-95 cursor-pointer border-0"
                      >
                        <MessageSquare size={18} />
                        <span>Send Order via SMS</span>
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        setCheckoutStep('form');
                        setB2bSuccessUrls(null);
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-black hover:underline mt-4 uppercase tracking-wider block mx-auto cursor-pointer"
                    >
                      Back to Edit Details
                    </button>
                  </div>
                ) : selectedCatalog === 'catalog_b2b' ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-serif font-black uppercase tracking-wide" style={{ color: settings.primaryColor }}>
                        Corporate Order Details
                      </h3>
                      <p className="text-xs font-semibold text-black/60 font-sans max-w-sm mx-auto">
                        Enter your company details to apply your agreed pricing and send your order.
                      </p>
                    </div>

                    {isReturningB2b && (
                      <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-950 flex flex-col gap-1.5 font-sans">
                        <p className="text-xs font-bold flex items-center gap-1.5 text-teal-800">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
                          Corporate Account Saved
                        </p>
                        <p className="text-[10px] opacity-90 leading-tight font-medium">
                          Your details are saved on this device. Review them below or clear to enter new information.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem('b2b_profile_save');
                            setB2bName('');
                            setB2bResponsibleName('');
                            setB2bPhone('');
                            setB2bAddress('');
                            setIsReturningB2b(false);
                            toast.success('Fields cleared successfully!');
                          }}
                          className="self-start text-[9px] uppercase tracking-wider font-extrabold text-red-700 hover:underline mt-1 bg-white border border-red-200 px-2 py-1 rounded-lg border-0 cursor-pointer"
                        >
                          Clear Saved Profile
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleFinalizarB2b} className="space-y-4">
                      {/* Company Name */}
                      <div className="space-y-1 relative">
                        <label className="text-xs font-bold uppercase text-black">Company / Authorized Entity Name *</label>
                        <input 
                          required
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bName}
                          onChange={e => {
                            const val = e.target.value;
                            setB2bName(val);
                            if (val.trim().length > 1) {
                              const matched = b2bProfiles.filter(p => 
                                p.name.toLowerCase().includes(val.toLowerCase())
                              );
                              setB2bSearchResults(matched);
                              setShowB2bSearchDropdown(matched.length > 0);
                            } else {
                              setShowB2bSearchDropdown(false);
                            }
                          }}
                        />
                        {showB2bSearchDropdown && b2bSearchResults.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                            {b2bSearchResults.map((profile, i) => (
                              <button
                                key={i}
                                type="button"
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-xs font-semibold text-gray-800 border-b border-gray-50 last:border-b-0 border-0 cursor-pointer"
                                onClick={() => {
                                  setB2bName(profile.name);
                                  setB2bResponsibleName(profile.manager || '');
                                  setB2bPhone(profile.phone || '');
                                  setB2bAddress(profile.address || '');
                                  setShowB2bSearchDropdown(false);
                                }}
                              >
                                {profile.name} (Responsible: {profile.manager})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Responsible names */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Authorized Contact Manager *</label>
                          <input 
                            required
                            type="text" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bResponsibleName}
                            onChange={e => setB2bResponsibleName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Corporate/Business Phone *</label>
                          <input 
                            required
                            type="tel" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bPhone}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              const countryCode = settings.whatsappCountryCode || '+55';
                              if (countryCode === '+1') {
                                if (val.length > 10) val = val.slice(0, 10);
                                if (val.length > 6) val = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                                else if (val.length > 3) val = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                              } else {
                                if (val.length > 11) val = val.slice(0, 11);
                                if (val.length > 7) val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                                else if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                              }
                              setB2bPhone(val);
                            }}
                            placeholder={settings.whatsappCountryCode === '+1' ? '(999) 999-9999' : '(99) 99999-9999'}
                          />
                        </div>
                      </div>

                      {/* Commercial Address */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">Company Receiving Address *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Street, Number, Suite, Postal Code..."
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bAddress}
                          onChange={e => setB2bAddress(e.target.value)}
                        />
                      </div>

                      {/* Zip Code and City */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Zip Code *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="Zip Code"
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bZipCode}
                            onChange={e => setB2bZipCode(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">City *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="City"
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bCity}
                            onChange={e => setB2bCity(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Plan and Date */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase text-black block">Preferred Order Interval *</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setB2bFrequency('one-time')}
                              className={cn(
                                "py-2.5 px-3 rounded-xl font-bold font-sans text-xs border text-center transition-all cursor-pointer",
                                b2bFrequency === 'one-time'
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              One-Time Order (Spot)
                            </button>
                            <button
                              type="button"
                              onClick={() => setB2bFrequency('weekly')}
                              className={cn(
                                "py-2.5 px-3 rounded-xl font-bold font-sans text-xs border text-center transition-all cursor-pointer",
                                b2bFrequency === 'weekly'
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              Weekly Plan (Recurring)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">Target Deliver Date *</label>
                          <input 
                            required
                            type="date" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={b2bDate}
                            onChange={e => setB2bDate(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Sales Representative / Seller (Optional) */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black flex items-center justify-between">
                          <span>Sales Representative / Seller</span>
                          <span className="text-[10px] font-semibold text-gray-500 lowercase">(optional)</span>
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Lea/Jucilea..."
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black font-sans font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bSalesRep}
                          onChange={e => setB2bSalesRep(e.target.value)}
                        />
                      </div>

                      {/* Observations */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">Additional Handling Instructions / Notes</label>
                        <textarea 
                          rows={2}
                          placeholder="EX: Prefer receiving hours, special billing details or building receiving dock specs..."
                          className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black text-xs font-semibold"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={b2bObservation}
                          onChange={e => setB2bObservation(e.target.value)}
                        />
                      </div>

                      {/* Corporate Order Total Summary with Tax */}
                      {cartTotal > 0 && (
                        <div className="p-4 rounded-2xl bg-white/70 border border-stone-200 text-stone-900 font-sans space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                            <span>Subtotal ({totalB2bPackages} pkgs):</span>
                            <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                            <span>Sales Tax (8.75%):</span>
                            <span>+ {currencySymbol}{(cartTotal * 0.0875).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1.5 border-t border-stone-200">
                            <span className="text-sm font-bold text-black">Final Total:</span>
                            <span className="text-lg font-black text-black">
                              {currencySymbol}{(cartTotal * 1.0875).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <button 
                          type="button"
                          onClick={() => setCheckoutStep('summary')}
                          className="px-6 py-4 rounded-xl bg-white border border-gray-200 text-black font-bold cursor-pointer font-serif border-0 hover:bg-gray-50 transition-colors"
                        >
                          {t.back}
                        </button>
                        <button 
                          type="submit"
                          className="flex-grow py-4 rounded-xl font-bold text-lg shadow-xl transition-transform active:scale-95 cursor-pointer font-serif border-0"
                          style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                        >
                          Submit Corporate Order
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-serif font-bold" style={{ color: '#000000' }}>{t.orderDetails}</h3>
                      {settings.checkoutTitle && (
                        <p className="text-sm font-medium italic leading-relaxed px-4" style={{ color: '#000000' }}>
                          {settings.checkoutTitle}
                        </p>
                      )}
                    </div>

                    {(settings.infoBlock1Title || settings.infoBlock1Text || settings.infoBlock2Title || settings.infoBlock2Text) && (
                      <div className="grid grid-cols-1 gap-3">
                        {settings.infoBlock1Title && (
                          <div className="bg-white/50 p-4 rounded-2xl border border-white/20 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#000000' }}>{settings.infoBlock1Title}</h4>
                            <p className="text-[10px] leading-relaxed" style={{ color: '#000000' }}>{settings.infoBlock1Text}</p>
                          </div>
                        )}
                        {settings.infoBlock2Title && (
                          <div className="bg-white/50 p-4 rounded-2xl border border-white/20 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#000000' }}>{settings.infoBlock2Title}</h4>
                            <p className="text-[10px] leading-relaxed" style={{ color: '#000000' }}>{settings.infoBlock2Text}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <form onSubmit={handleFinalizar} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">{t.fullName}</label>
                        <input 
                          required
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.nome}
                          onChange={e => setFormData({...formData, nome: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.phone}</label>
                          <input 
                            required
                            type="tel" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.telefone}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              const countryCode = settings.whatsappCountryCode || '+55';
                              if (countryCode === '+1') {
                                if (val.length > 10) val = val.slice(0, 10);
                                if (val.length > 6) val = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                                else if (val.length > 3) val = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                              } else {
                                if (val.length > 11) val = val.slice(0, 11);
                                if (val.length > 7) val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                                else if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                              }
                              setFormData({...formData, telefone: val});
                            }}
                            placeholder={settings.whatsappCountryCode === '+1' ? '(999) 999-9999' : '(99) 99999-9999'}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">
                            {settings.whatsappCountryCode === '+55' ? 'Aniversário (Mês/Dia)' : t.birthday}
                          </label>
                          <input 
                            required
                            type="text" 
                            placeholder="MM/DD"
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.aniversario}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 4) val = val.slice(0, 4);
                              if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                              setFormData({...formData, aniversario: val});
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">{t.email}</label>
                        <input 
                          required
                          type="email" 
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.street}</label>
                          <input 
                            required
                            type="text" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.street}
                            onChange={e => setFormData({...formData, street: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-black">{t.number}</label>
                            <input 
                              type="text" 
                              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                              value={formData.number}
                              onChange={e => setFormData({...formData, number: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-black">{t.zipCode}</label>
                            <input 
                              required
                              type="text" 
                              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                              value={formData.zipCode}
                              onChange={e => setFormData({...formData, zipCode: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.city}</label>
                          <input 
                            required
                            type="text" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.city}
                            onChange={e => setFormData({...formData, city: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">{t.observation}</label>
                        <textarea 
                          rows={2}
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.observacao}
                          onChange={e => setFormData({...formData, observacao: e.target.value})}
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button 
                          type="button"
                          onClick={() => setCheckoutStep('summary')}
                          className="px-6 py-4 rounded-xl bg-white border border-gray-200 font-bold"
                          style={{ color: '#000000' }}
                        >
                          {t.back}
                        </button>
                        <button 
                          type="submit"
                          className="flex-grow py-4 rounded-xl font-bold text-lg shadow-xl transition-transform active:scale-95"
                          style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                        >
                          {t.finish}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProductForDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForDetails(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-black font-sans force-dark-headings"
              style={{ '--text-color': '#000000' } as any}
            >
              {/* Close button top right overlay */}
              <button
                onClick={() => setSelectedProductForDetails(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm rounded-full transition-all border-0 focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Scrollable Container */}
              <div className="overflow-y-auto w-full flex-grow">
                {/* Hero Product Image */}
                <div className="w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden">
                  <img 
                    src={selectedProductForDetails.image} 
                    alt={selectedProductForDetails.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {/* Title & Stats */}
                  <div className="space-y-1">
                    <h2 
                      className="text-2xl md:text-3xl font-serif font-black tracking-tight leading-tight"
                      style={{ color: settings.itemElementsColor || settings.primaryColor || '#111827' }}
                    >
                      {selectedProductForDetails.title}
                    </h2>
                    {selectedProductForDetails.categoryTitle && (
                      <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-950 rounded-lg">
                        {selectedProductForDetails.categoryTitle}
                      </span>
                    )}
                  </div>

                  {/* Pricing Display */}
                  <div className="p-4 rounded-2xl bg-white/50 border border-white/20">
                    <label className="text-[10px] font-black uppercase text-black/50 block tracking-wider mb-1">
                      Price Details
                    </label>
                    {selectedCatalog === 'catalog_b2b' ? (
                      <div className="space-y-4">
                        {selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-black/60 mb-2">
                              {settings.language === 'en' ? 'Available Options (Select to add):' : 'Opções Disponíveis (Selecione para adicionar):'}
                            </p>
                            <div className="space-y-2">
                              {selectedProductForDetails.sizes.map((s, idx) => {
                                const cartItem = cart.find(item => item.productId === selectedProductForDetails.id && item.selectedSize?.id === s.id && !item.mealOptions);
                                const qty = cartItem ? cartItem.quantity : 0;
                                return (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center p-3 bg-white/80 border border-gray-200/50 rounded-2xl font-bold text-black text-xs"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-black">{s.name}</span>
                                      {typeof s.price === 'number' && s.price > 0 && (
                                        <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                                          <span className="text-sm font-black" style={{ color: settings.itemElementsColor || settings.primaryColor || '#111827' }}>
                                            {currencySymbol}{s.price.toFixed(2)}
                                          </span>
                                          {typeof s.unitPrice === 'number' && s.unitPrice > 0 && (
                                            <span className="text-[10px] text-black/55 font-semibold">
                                              ({currencySymbol}{s.unitPrice.toFixed(2)} {settings.language === 'en' ? 'each' : '/ un.'})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {qty > 0 ? (
                                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full border border-gray-200">
                                          <button
                                            type="button"
                                            onClick={() => decrementSizeQty(selectedProductForDetails, s)}
                                            className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all focus:outline-none"
                                          >
                                            <Minus size={14} />
                                          </button>
                                          <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                          <button
                                            type="button"
                                            onClick={() => incrementSizeQty(selectedProductForDetails, s)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                            style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                          >
                                            <Plus size={14} />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => incrementSizeQty(selectedProductForDetails, s)}
                                          className="px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase shadow-md hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center gap-1 focus:outline-none"
                                          style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                        >
                                          <Plus size={12} />
                                          <span>{settings.language === 'en' ? 'Add' : 'Adicionar'}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : ((selectedProductForDetails.price && selectedProductForDetails.price > 0) || (selectedProductForDetails.oldPrice && selectedProductForDetails.oldPrice > 0)) ? (
                          <div className="flex items-baseline gap-2">
                            {selectedProductForDetails.price && selectedProductForDetails.price > 0 && selectedProductForDetails.oldPrice && selectedProductForDetails.oldPrice > 0 ? (
                              <>
                                <span className="text-sm line-through opacity-40">
                                  {currencySymbol}{selectedProductForDetails.oldPrice.toFixed(2)}
                                </span>
                                <span className="text-2xl font-bold" style={{ color: settings.primaryColor }}>
                                  {currencySymbol}{selectedProductForDetails.price.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-2xl font-bold" style={{ color: settings.primaryColor }}>
                                {currencySymbol}{(selectedProductForDetails.price && selectedProductForDetails.price > 0 ? selectedProductForDetails.price : selectedProductForDetails.oldPrice).toFixed(2)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-lg font-bold text-amber-950 block font-serif">
                              Contract Rate
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (selectedProductForDetails.isCustomCake || selectedProductForDetails.priceType === 'consult' || (!selectedProductForDetails.price && !selectedProductForDetails.oldPrice && (!selectedProductForDetails.sizes || selectedProductForDetails.sizes.length === 0))) ? (
                      <div className="space-y-1">
                        <span className="text-xl font-bold text-amber-950 block font-serif">
                          {settings.language === 'en' ? 'On Request' : 'A Consultar'}
                        </span>
                        <p className="text-[11px] text-black/60 font-semibold leading-relaxed">
                          {settings.language === 'en' 
                            ? 'Configure your preferences by clicking to add/customize.' 
                            : 'Personalize as especificações clicando para adicionar.'}
                        </p>
                      </div>
                    ) : selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-black/60 mb-2">
                          {settings.language === 'en' ? 'Available Options (Select to add):' : 'Opções Disponíveis (Selecione para adicionar):'}
                        </p>
                        <div className="space-y-2">
                          {selectedProductForDetails.sizes.map((s, idx) => {
                            const isSelected = selectedSize?.id === s.id;
                            const hasExclusionsOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.ingredients && selectedProductForDetails.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
                            const hasSidesOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
                            const isCustomCakeOpt = !!selectedProductForDetails.isCustomCake;
                            const requiresCustomization = hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt;

                            if (requiresCustomization) {
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedSize(s)}
                                  className={cn(
                                    "w-full flex justify-between items-center p-3.5 rounded-2xl font-bold text-black text-xs border-2 text-left transition-all cursor-pointer",
                                    isSelected 
                                      ? "border-blue-500 bg-white shadow-md scale-[1.01]" 
                                      : "border-gray-200/50 bg-white/80 hover:border-gray-300"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={cn(
                                      "w-4 h-4 rounded-full border flex items-center justify-center",
                                      isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 bg-white"
                                    )}>
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-black">{s.name}</span>
                                      {typeof s.price === 'number' && s.price > 0 && (
                                        <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                                          <span className="text-sm font-black" style={{ color: settings.itemElementsColor || settings.primaryColor || '#111827' }}>
                                            {currencySymbol}{s.price.toFixed(2)}
                                          </span>
                                          {typeof s.unitPrice === 'number' && s.unitPrice > 0 && (
                                            <span className="text-[10px] text-black/55 font-semibold">
                                              ({currencySymbol}{s.unitPrice.toFixed(2)} {settings.language === 'en' ? 'each' : '/ un.'})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && <Check size={14} className="text-blue-500" />}
                                </button>
                              );
                            }

                            const cartItem = cart.find(item => item.productId === selectedProductForDetails.id && item.selectedSize?.id === s.id && !item.mealOptions);
                            const qty = cartItem ? cartItem.quantity : 0;
                            return (
                              <div
                                key={idx}
                                className="flex justify-between items-center p-3.5 bg-white/80 border border-gray-200/50 rounded-2xl font-bold text-black text-xs"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-black">{s.name}</span>
                                  {typeof s.price === 'number' && s.price > 0 && (
                                    <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                                      <span className="text-sm font-black" style={{ color: settings.itemElementsColor || settings.primaryColor || '#111827' }}>
                                        {currencySymbol}{s.price.toFixed(2)}
                                      </span>
                                      {typeof s.unitPrice === 'number' && s.unitPrice > 0 && (
                                        <span className="text-[10px] text-black/55 font-semibold">
                                          ({currencySymbol}{s.unitPrice.toFixed(2)} {settings.language === 'en' ? 'each' : '/ un.'})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {qty > 0 ? (
                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full border border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => decrementSizeQty(selectedProductForDetails, s)}
                                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all focus:outline-none"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => incrementSizeQty(selectedProductForDetails, s)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all focus:outline-none"
                                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => incrementSizeQty(selectedProductForDetails, s)}
                                      className="px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase shadow-md hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center gap-1 focus:outline-none"
                                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                    >
                                      <Plus size={12} />
                                      <span>{settings.language === 'en' ? 'Add' : 'Adicionar'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-serif font-black text-black">
                          {currencySymbol}{(selectedProductForDetails.price > 0 ? selectedProductForDetails.price : (selectedProductForDetails.oldPrice || 0)).toFixed(2)}
                        </p>
                        {selectedProductForDetails.price > 0 && selectedProductForDetails.oldPrice && selectedProductForDetails.oldPrice > 0 && (
                          <span className="text-sm line-through opacity-40">
                            {currencySymbol}{selectedProductForDetails.oldPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Extended Description Section */}
                  <div className="space-y-2 text-black">
                    <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Product Description</h3>
                    <p className="text-sm leading-relaxed text-black/80 font-medium whitespace-pre-wrap">
                      {selectedProductForDetails.description || 'No detailed specifications supplied.'}
                    </p>
                  </div>

                  {/* Custom Cake Options in Details Modal */}
                  {selectedProductForDetails.isCustomCake && (
                    <div className="border-t border-gray-200/30 pt-6 space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-wider text-black/60">Cake Customization</h4>
                      
                      {/* Size Selection */}
                      {cakeSizesList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Size / Slices / Weight</p>
                          <div className="grid grid-cols-1 gap-2">
                            {cakeSizesList.map((sizeOpt, idx) => {
                              const isSelected = selectedCakeSize === sizeOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedCakeSize(sizeOpt)}
                                  className={cn(
                                    "p-3 rounded-xl border-2 transition-all flex justify-between items-center w-full text-left font-bold text-xs cursor-pointer",
                                    isSelected 
                                      ? "shadow-md scale-[1.01]" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  <span>{sizeOpt}</span>
                                  {isSelected && <Check size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dough Selection */}
                      {cakeDoughsList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Dough Selection</p>
                          <div className="grid grid-cols-2 gap-2">
                            {cakeDoughsList.map((doughOpt, idx) => {
                              const isSelected = selectedDough === doughOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedDough(doughOpt)}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all text-center text-xs font-bold w-full cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  {doughOpt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fillings Selection */}
                      {cakeFillingsList.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-baseline">
                            <p className="text-xs font-bold text-black/60">Filling Options</p>
                            <span className="text-[10px] text-gray-500 font-bold">Choose up to {settings.cakeFillingsMax || 2}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cakeFillingsList.map((fillingOpt, idx) => {
                              const isSelected = selectedFillings.includes(fillingOpt);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedFillings(selectedFillings.filter(f => f !== fillingOpt));
                                    } else {
                                      const maxFillings = settings.cakeFillingsMax || 2;
                                      if (selectedFillings.length >= maxFillings) {
                                        toast.error(`You can choose a maximum of ${maxFillings} fillings!`);
                                        return;
                                      }
                                      setSelectedFillings([...selectedFillings, fillingOpt]);
                                    }
                                  }}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all flex items-center justify-between font-bold text-xs cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  <span>{fillingOpt}</span>
                                  {isSelected && <Check size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Toppings Selection */}
                      {cakeToppingsList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Topping Selection</p>
                          <div className="grid grid-cols-2 gap-2">
                            {cakeToppingsList.map((toppingOpt, idx) => {
                              const isSelected = selectedTopping === toppingOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedTopping(toppingOpt)}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all text-center text-xs font-bold w-full cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  {toppingOpt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Topper Selection */}
                      {cakeToppersList.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-black/60">Cake Topper</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cakeToppersList.map((topperOpt, idx) => {
                              const isSelected = selectedTopper === topperOpt;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedTopper(topperOpt)}
                                  className={cn(
                                    "p-2.5 rounded-xl border-2 transition-all text-center text-xs font-bold w-full cursor-pointer",
                                    isSelected 
                                      ? "shadow-md" 
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{ 
                                    backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  {topperOpt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Style Selection Reference */}
                      {selectedProductForDetails.cakeGalleryId && (
                        (() => {
                          const associatedGallery = galleries.find(g => g.id === selectedProductForDetails.cakeGalleryId);
                          const validImages = associatedGallery?.images?.filter(img => img && img.trim() !== '') || [];
                          if (validImages.length === 0) return null;
                          
                          const noStyleText = settings.language === 'en' 
                            ? (selectedStyleNumber === null ? 'Selected: Standard (No Reference)' : 'Choose: Standard (No Reference)')
                            : (selectedStyleNumber === null ? 'Selecionado: Base Tradicional' : 'Selecionar: Base Tradicional');

                          return (
                            <div className="space-y-3 pt-2">
                              <p className="text-xs font-bold text-black/60">Cake Style / Visual Reference</p>
                              <div className="w-full mb-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStyleNumber(null)}
                                  className={cn(
                                    "w-full py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 border-2 cursor-pointer uppercase",
                                    selectedStyleNumber === null
                                      ? "shadow-md text-white border-transparent"
                                      : "bg-white border-gray-200 hover:border-gray-300 text-black"
                                  )}
                                  style={{
                                    backgroundColor: selectedStyleNumber === null ? (settings.primaryColor || '#865d39') : '#ffffff',
                                    color: selectedStyleNumber === null ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                    borderColor: settings.primaryColor || '#865d39'
                                  }}
                                >
                                  {selectedStyleNumber === null ? <Check size={12} /> : <X size={12} />}
                                  <span>{noStyleText}</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                {associatedGallery?.images?.map((img, idx) => {
                                  if (!img || img.trim() === '') return null;
                                  const isSelected = selectedStyleNumber === (idx + 1);
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setSelectedStyleNumber(idx + 1)}
                                      className={cn(
                                        "relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-white p-0 text-left cursor-pointer",
                                        isSelected ? "scale-[1.01]" : "border-gray-200 hover:border-gray-300"
                                      )}
                                      style={{ borderColor: isSelected ? (settings.primaryColor || '#865d39') : 'transparent' }}
                                    >
                                      <img
                                        src={img}
                                        alt={`Style ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute top-1 left-1 bg-black/75 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10">
                                        #{idx + 1}
                                      </div>
                                      {isSelected && (
                                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}>
                                            <Check size={12} />
                                          </div>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* Customizable Meal Options in Details Modal */}
                  {selectedProductForDetails.isMeal && (
                    <div className="border-t border-gray-200/30 pt-6 space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-wider text-black/60">Meal Customization</h4>
                      
                      {/* Exclusions */}
                      {selectedProductForDetails.ingredients && (() => {
                        const ingredientsList = selectedProductForDetails.ingredients
                          .split(',')
                          .map(i => i.trim())
                          .filter(Boolean);
                        if (ingredientsList.length === 0) return null;
                        return (
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-black/60">{t.excludeIngredients}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ingredientsList.map((ingredient, idx) => {
                                const isSelected = mealSelections.removals.includes(ingredient);
                                return (
                                  <button 
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setMealSelections({
                                          ...mealSelections,
                                          removals: mealSelections.removals.filter(r => r !== ingredient)
                                        });
                                      } else {
                                        setMealSelections({
                                          ...mealSelections,
                                          removals: [...mealSelections.removals, ingredient]
                                        });
                                      }
                                    }}
                                    className={cn(
                                      "px-3 py-1.5 rounded-full border-2 font-bold transition-all text-xs cursor-pointer",
                                      isSelected 
                                        ? "bg-red-500 border-red-500 text-white shadow-sm" 
                                        : "bg-white border-gray-200 text-black"
                                    )}
                                  >
                                    {ingredient}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Sides and Swaps */}
                      {selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.length > 0 && (
                        (() => {
                          const allowedSidesList = (selectedProductForDetails.allowedSides || [])
                            .map(id => sides.find(s => s.id === id))
                            .filter(Boolean) as Side[];
                          
                          const regularSides = allowedSidesList.filter(s => s.type !== 'swap');
                          const swapSides = allowedSidesList.filter(s => s.type === 'swap');

                          if (regularSides.length === 0 && swapSides.length === 0) return null;

                          const renderSideItem = (side: Side) => {
                            const qty = sideQuantities[side.id] || 0;
                            return (
                              <div 
                                key={side.id}
                                className={cn(
                                  "p-3 rounded-xl border border-gray-200 font-bold transition-all flex justify-between items-center bg-white text-xs text-black shadow-sm"
                                )}
                              >
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="font-bold text-black truncate">{side.name}</span>
                                  <span className="text-[10px] text-gray-500 font-extrabold mt-0.5">
                                    {side.price > 0 ? `+ ${currencySymbol}${side.price.toFixed(2)}` : 'Free / Grátis'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <button 
                                    type="button"
                                    onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: Math.max(0, (prev[side.id] || 0) - 1) }))}
                                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-black active:scale-95 transition-transform cursor-pointer border border-gray-200 focus:outline-none"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="w-4 text-center font-bold text-black">{qty}</span>
                                  <button 
                                    type="button"
                                    onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: (prev[side.id] || 0) + 1 }))}
                                    className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer focus:outline-none"
                                    style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          };

                          return (
                            <div className="space-y-4">
                              {regularSides.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-black/60">{t.chooseSides}</p>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {regularSides.map(renderSideItem)}
                                  </div>
                                </div>
                              )}
                              {swapSides.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-amber-800">
                                    {settings.language === 'en' ? 'Swap Options (Swap)' : 'Opções de Troca (Swap)'}
                                  </p>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {swapSides.map(renderSideItem)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Sticky Action Block */}
              <div className="p-4 pb-6 md:p-6 bg-white/40 border-t border-white/20 flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => setSelectedProductForDetails(null)}
                  className="px-5 py-3 rounded-xl border border-black/10 bg-white hover:bg-gray-50 text-black font-serif font-bold text-xs cursor-pointer transition-all border-0 focus:outline-none"
                >
                  Close
                </button>
                {(() => {
                  const hasSizesOpt = !!(selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0);
                  const hasExclusionsOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.ingredients && selectedProductForDetails.ingredients.split(',').map(i => i.trim()).filter(Boolean).length > 0);
                  const hasSidesOpt = !!(selectedProductForDetails.isMeal && selectedProductForDetails.allowedSides && selectedProductForDetails.allowedSides.filter(id => sides.some(s => s.id === id)).length > 0);
                  const isCustomCakeOpt = !!selectedProductForDetails.isCustomCake;
                  const requiresCustomization = hasSizesOpt || hasExclusionsOpt || hasSidesOpt || isCustomCakeOpt;

                  const isCakeIncomplete = selectedProductForDetails.isCustomCake && (
                    (cakeSizesList.length > 0 && !selectedCakeSize) ||
                    (cakeDoughsList.length > 0 && !selectedDough) ||
                    (cakeFillingsList.length > 0 && selectedFillings.length === 0) ||
                    (cakeToppingsList.length > 0 && !selectedTopping) ||
                    (cakeToppersList.length > 0 && !selectedTopper)
                  );

                  const basePrice = (selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0 && selectedSize) 
                    ? selectedSize.price 
                    : (selectedProductForDetails.price > 0 ? selectedProductForDetails.price : (selectedProductForDetails.oldPrice || 0));
                  
                  const sidesPrice = Object.entries(sideQuantities).reduce((sum, [id, qty]) => {
                    const side = sides.find(s => s.id === id);
                    return sum + (side ? side.price * (qty as number) : 0);
                  }, 0);

                  const totalPrice = basePrice + sidesPrice;

                  const hasItemsInCart = cart.some(item => item.productId === selectedProductForDetails.id);

                  const getButtonLabel = () => {
                    if (isCustomCakeOpt && isCakeIncomplete) {
                      return settings.language === 'en' ? 'Complete options first' : 'Complete as opções primeiro';
                    }
                    if (hasSizesOpt && hasItemsInCart) {
                      return settings.language === 'en' ? 'Done (Keep Selection)' : 'Concluir Seleção';
                    }
                    return selectedCatalog === 'catalog_b2b' ? 'Add To Corporate List' : 'Add To Order';
                  };

                  return (
                    <button
                      type="button"
                      disabled={!!isCakeIncomplete}
                      onClick={() => {
                        if (hasSizesOpt && hasItemsInCart) {
                          setSelectedProductForDetails(null);
                          toast.success(settings.language === 'en' ? 'Selection confirmed!' : 'Seleção confirmada!');
                          return;
                        }

                        if (requiresCustomization) {
                          addDetailedProductToCart(selectedProductForDetails);
                        } else {
                          addToCart(selectedProductForDetails);
                          setSelectedProductForDetails(null);
                          toast.success(settings.language === 'en' ? 'Successfully added to request list!' : 'Adicionado com sucesso ao pedido!');
                        }
                      }}
                      className={cn(
                        "flex-grow py-3 px-5 rounded-xl font-serif font-bold text-xs shadow-md transition-all text-center border-0 focus:outline-none cursor-pointer flex justify-center items-center gap-1.5",
                        isCakeIncomplete ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 active:scale-95"
                      )}
                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                    >
                      <span>{getButtonLabel()}</span>
                      {totalPrice > 0 && !hasItemsInCart && (
                        <span className="opacity-80 font-normal">
                          ({currencySymbol}{totalPrice.toFixed(2)})
                        </span>
                      )}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomModalOpen && selectedProductForCustom && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] force-dark-headings"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white/30">
                <h2 className="text-2xl font-serif font-bold" style={{ color: '#000000' }}>{t.customCakeTitle}</h2>
                <button 
                  onClick={() => setIsCustomModalOpen(false)} 
                  className="p-2 hover:bg-white/50 rounded-full transition-colors"
                  style={{ color: '#000000' }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                {selectedProductForCustom.isCustomCake ? (
                  <>
                    {/* Size Selection */}
                    {cakeSizesList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Size / Slices / Weight</h3>
                        <div className="grid grid-cols-1 gap-2.5">
                          {cakeSizesList.map((sizeOpt, idx) => {
                            const isSelected = selectedCakeSize === sizeOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedCakeSize(sizeOpt)}
                                className={cn(
                                  "p-4 rounded-2xl border-2 transition-all flex justify-between items-center w-full text-left font-bold",
                                  isSelected 
                                    ? "shadow-md scale-[1.01]" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <span className="font-bold text-sm">
                                  {sizeOpt}
                                </span>
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: getContrastText(settings.primaryColor || '#865d39'), color: settings.primaryColor || '#865d39' }}>
                                    <Check size={12} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Dough Selection */}
                    {cakeDoughsList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Dough Selection</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {cakeDoughsList.map((doughOpt, idx) => {
                            const isSelected = selectedDough === doughOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedDough(doughOpt)}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all text-center text-sm font-bold w-full",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                {doughOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fillings Selection */}
                    {cakeFillingsList.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Filling Options</h3>
                          <span className="text-xs text-gray-500 font-bold">Choose up to {settings.cakeFillingsMax || 2}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cakeFillingsList.map((fillingOpt, idx) => {
                            const isSelected = selectedFillings.includes(fillingOpt);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedFillings(selectedFillings.filter(f => f !== fillingOpt));
                                  } else {
                                    const maxFillings = settings.cakeFillingsMax || 2;
                                    if (selectedFillings.length >= maxFillings) {
                                      toast.error(`You can choose a maximum of ${maxFillings} fillings!`);
                                      return;
                                    }
                                    setSelectedFillings([...selectedFillings, fillingOpt]);
                                  }
                                }}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all flex items-center justify-between font-bold text-sm",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                <span>{fillingOpt}</span>
                                <div className={cn(
                                  "w-4 h-4 rounded-md border flex items-center justify-center",
                                  isSelected ? "border-transparent" : "border-gray-300 bg-white"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? getContrastText(settings.primaryColor || '#865d39') : 'transparent',
                                  color: isSelected ? (settings.primaryColor || '#865d39') : 'transparent'
                                }}
                                >
                                  {isSelected && <Check size={10} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Toppings Selection */}
                    {cakeToppingsList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Topping Selection</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {cakeToppingsList.map((toppingOpt, idx) => {
                            const isSelected = selectedTopping === toppingOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedTopping(toppingOpt)}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all text-center text-sm font-bold w-full",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                {toppingOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Topper Selection */}
                    {cakeToppersList.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Cake Topper</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {cakeToppersList.map((topperOpt, idx) => {
                            const isSelected = selectedTopper === topperOpt;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedTopper(topperOpt)}
                                className={cn(
                                  "p-3 rounded-2xl border-2 transition-all text-center text-sm font-bold w-full",
                                  isSelected 
                                    ? "shadow-md" 
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{ 
                                  backgroundColor: isSelected ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: isSelected ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                {topperOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Gallery Style Selection */}
                    {selectedProductForCustom.cakeGalleryId && (
                      (() => {
                        const associatedGallery = galleries.find(g => g.id === selectedProductForCustom.cakeGalleryId);
                        const validImages = associatedGallery?.images?.filter(img => img && img.trim() !== '') || [];
                        if (validImages.length === 0) return null;
                        
                        const noStyleText = settings.language === 'en' 
                          ? (selectedStyleNumber === null ? 'Selected: Standard Cake Base (No Reference)' : 'Choose: Standard Cake Base (No Reference)')
                          : (selectedStyleNumber === null ? 'Selecionado: Base Tradicional (Sem Referência)' : 'Selecionar: Base Tradicional (Sem Referência)');

                        return (
                          <div className="space-y-4 pt-2">
                            <h3 className="text-sm font-serif font-black uppercase tracking-widest text-black/80">Cake Style / Visual Reference</h3>
                            <p className="text-[11px] font-semibold text-gray-500 -mt-1 leading-normal">
                              Select one of the photos below as a model or visual reference for your customized cake. The corresponding photo number will be included with your order!
                            </p>

                            {/* Separate "No Style Reference" Button styled like Add to Cart */}
                            <div className="w-full">
                              <button
                                type="button"
                                onClick={() => setSelectedStyleNumber(null)}
                                className={cn(
                                  "w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-[0.99] flex items-center justify-center gap-2 border-2 cursor-pointer uppercase tracking-wider",
                                  selectedStyleNumber === null
                                    ? "shadow-md text-white border-transparent"
                                    : "bg-white border-gray-200/50 hover:border-gray-300 text-black"
                                )}
                                style={{
                                  backgroundColor: selectedStyleNumber === null ? (settings.primaryColor || '#865d39') : '#ffffff',
                                  color: selectedStyleNumber === null ? getContrastText(settings.primaryColor || '#865d39') : '#000000',
                                  borderColor: settings.primaryColor || '#865d39'
                                }}
                              >
                                {selectedStyleNumber === null ? <Check size={16} /> : <X size={15} />}
                                <span>{noStyleText}</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                              {associatedGallery?.images?.map((img, idx) => {
                                if (!img || img.trim() === '') return null;
                                const isSelected = selectedStyleNumber === (idx + 1);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedStyleNumber(idx + 1)}
                                    className={cn(
                                      "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all bg-white group p-0 text-left cursor-pointer shadow-sm hover:shadow",
                                      isSelected
                                        ? "scale-[1.01]"
                                        : "border-gray-200/50 hover:border-gray-300"
                                    )}
                                    style={{ borderColor: isSelected ? (settings.primaryColor || '#865d39') : 'transparent' }}
                                  >
                                    <img
                                      src={img}
                                      alt={`Style ${idx + 1}`}
                                      className="w-full h-full object-cover select-none"
                                      referrerPolicy="no-referrer"
                                    />
                                    {/* Number Badge */}
                                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full z-10">
                                      Photo {idx + 1}
                                    </div>
                                    
                                    {/* Select Highlight Overlay */}
                                    <div className={cn(
                                      "absolute inset-0 transition-opacity flex items-center justify-center p-2 text-center",
                                      isSelected 
                                        ? "bg-black/35 opacity-100" 
                                        : "bg-black/0 opacity-0 group-hover:bg-black/10 group-hover:opacity-100"
                                    )}>
                                      {isSelected ? (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}>
                                          <Check size={18} />
                                        </div>
                                      ) : (
                                        <span className="text-[9px] font-bold text-white uppercase tracking-widest bg-black/40 px-2 py-1 rounded-full">Select</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </>
                ) : (
                  <>
                    {/* Size Selection */}
                    {selectedProductForCustom.sizes && selectedProductForCustom.sizes.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                          {settings.language === 'en' ? 'Select Size / Portion' : 'Selecione o Tamanho / Porção'}
                        </h3>
                        <div className="space-y-2">
                          {selectedProductForCustom.sizes.map((s) => {
                            const cartItem = cart.find(item => item.productId === selectedProductForCustom.id && item.selectedSize?.id === s.id && !item.mealOptions);
                            const qty = cartItem ? cartItem.quantity : 0;
                            return (
                              <div
                                key={s.id}
                                className="flex justify-between items-center p-3.5 bg-white border border-gray-200 rounded-2xl font-bold text-black text-xs shadow-sm"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-black">{s.name}</span>
                                  {typeof s.price === 'number' && s.price > 0 && (
                                    <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                                      <span className="text-sm font-black" style={{ color: settings.itemElementsColor || settings.primaryColor || '#111827' }}>
                                        {currencySymbol}{s.price.toFixed(2)}
                                      </span>
                                      {typeof s.unitPrice === 'number' && s.unitPrice > 0 && (
                                        <span className="text-[10px] text-black/55 font-semibold">
                                          ({currencySymbol}{s.unitPrice.toFixed(2)} {settings.language === 'en' ? 'each' : '/ un.'})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {qty > 0 ? (
                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full border border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => decrementSizeQty(selectedProductForCustom, s)}
                                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-black shadow-sm cursor-pointer active:scale-95 transition-all"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <span className="text-sm font-black min-w-[20px] text-center text-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => incrementSizeQty(selectedProductForCustom, s)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer active:scale-95 transition-all"
                                        style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => incrementSizeQty(selectedProductForCustom, s)}
                                      className="px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase shadow-md hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center gap-1"
                                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                    >
                                      <Plus size={12} />
                                      <span>{settings.language === 'en' ? 'Add' : 'Adicionar'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ingredient Exclusions */}
                    {selectedProductForCustom.isMeal && selectedProductForCustom.ingredients && (() => {
                      const ingredientsList = selectedProductForCustom.ingredients
                        .split(',')
                        .map(i => i.trim())
                        .filter(Boolean);
                      if (ingredientsList.length === 0) return null;
                      return (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#000000' }}>{t.excludeIngredients}</h3>
                          <div className="flex flex-wrap gap-2">
                            {ingredientsList.map((ingredient, idx) => {
                              const isSelected = mealSelections.removals.includes(ingredient);
                              return (
                                <button 
                                  key={idx}
                                  onClick={() => {
                                    if (isSelected) {
                                      setMealSelections({
                                        ...mealSelections,
                                        removals: mealSelections.removals.filter(r => r !== ingredient)
                                      });
                                    } else {
                                      setMealSelections({
                                        ...mealSelections,
                                        removals: [...mealSelections.removals, ingredient]
                                      });
                                    }
                                  }}
                                  className={cn(
                                    "px-4 py-2 rounded-full border-2 font-bold transition-all text-sm",
                                    isSelected 
                                      ? "bg-red-500 border-red-500 text-white shadow-md" 
                                      : "bg-white/50 border-transparent text-black"
                                  )}
                                >
                                  {ingredient}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Sides & Swaps Selection */}
                    {selectedProductForCustom.isMeal && selectedProductForCustom.allowedSides && selectedProductForCustom.allowedSides.length > 0 && (
                      (() => {
                        const allowedSidesList = (selectedProductForCustom.allowedSides || [])
                          .map(id => sides.find(s => s.id === id))
                          .filter(Boolean) as Side[];
                        
                        const regularSides = allowedSidesList.filter(s => s.type !== 'swap');
                        const swapSides = allowedSidesList.filter(s => s.type === 'swap');

                        if (regularSides.length === 0 && swapSides.length === 0) return null;

                        const renderSideItem = (side: Side) => {
                          const qty = sideQuantities[side.id] || 0;
                          return (
                            <div 
                              key={side.id}
                              className={cn(
                                "p-4 rounded-xl border-2 font-bold transition-all flex flex-col gap-3",
                                qty > 0 
                                  ? "bg-white border-blue-500 shadow-md" 
                                  : "bg-white/50 border-transparent text-black"
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <span className={qty > 0 ? "text-blue-600" : "text-black"}>{side.name}</span>
                                <span className="text-xs opacity-60 text-black">
                                  {side.price > 0 ? `+ ${currencySymbol}${(side.price * (qty > 0 ? qty : 1)).toFixed(2)}` : 'Free'}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-4">
                                <button 
                                  onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: Math.max(0, (prev[side.id] || 0) - 1) }))}
                                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-black active:scale-95 transition-transform cursor-pointer"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="w-4 text-center text-black">{qty}</span>
                                <button 
                                  onClick={() => setSideQuantities(prev => ({ ...prev, [side.id]: (prev[side.id] || 0) + 1 }))}
                                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                  style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        };

                        return (
                          <div className="space-y-6">
                            {regularSides.length > 0 && (
                              <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-black">{t.chooseSides}</h3>
                                <div className="grid grid-cols-1 gap-2">
                                  {regularSides.map(renderSideItem)}
                                </div>
                              </div>
                            )}
                            {swapSides.length > 0 && (
                              <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800">
                                  {settings.language === 'en' ? 'Swap Options (Swap)' : 'Opções de Troca (Swap)'}
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                  {swapSides.map(renderSideItem)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </>
                )}
              </div>

              <div className="p-6 pb-8 sm:pb-6 bg-white/30 border-t border-gray-200">
                {(() => {
                  const isCakeIncomplete = selectedProductForCustom?.isCustomCake && (
                    (cakeSizesList.length > 0 && !selectedCakeSize) ||
                    (cakeDoughsList.length > 0 && !selectedDough) ||
                    (cakeFillingsList.length > 0 && selectedFillings.length === 0) ||
                    (cakeToppingsList.length > 0 && !selectedTopping) ||
                    (cakeToppersList.length > 0 && !selectedTopper)
                  );

                  return (
                    <button 
                      onClick={addMealToCart}
                      disabled={!!isCakeIncomplete}
                      className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${isCakeIncomplete ? 'opacity-50 cursor-not-allowed active:scale-100' : 'active:scale-95 cursor-pointer hover:brightness-110'}`}
                      style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                    >
                      {isCakeIncomplete ? (
                        <span>{settings.language === 'en' ? 'Complete custom items first' : 'Selecione todos os itens primeiro'}</span>
                      ) : (
                        <>
                          <span>{t.addToCart}</span>
                          <span className="text-sm opacity-80 font-normal">
                            ({currencySymbol} {(
                              (selectedProductForCustom.sizes && selectedProductForCustom.sizes.length > 0 && selectedSize ? selectedSize.price : (selectedProductForCustom.price > 0 ? selectedProductForCustom.price : (selectedProductForCustom.oldPrice || 0))) + 
                              Object.entries(sideQuantities).reduce((sum, [id, qty]) => {
                                const side = sides.find(s => s.id === id);
                                return sum + (side ? side.price * (qty as number) : 0);
                              }, 0)
                            ).toFixed(2)})
                          </span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderDietsModal()}
    </div>
  );

  function renderDietsModal() {
    return null;
  }
  function unused_old_modal() {
    return (
      <AnimatePresence>
        {isDietsModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDietsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] force-dark-headings text-black"
            >
              <div className="p-6 border-b border-gray-200/50 flex items-center justify-between bg-white/40 font-serif">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2" style={{ color: settings.primaryColor || '#000000' }}>
                  <Building2 size={24} />
                  {settings.b2bButtonText || 'CORPORATE & WHOLESALE'}
                </h2>
                <button 
                  onClick={() => setIsDietsModalOpen(false)} 
                  className="p-2 hover:bg-white/50 rounded-full transition-all text-black cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-white/50 p-4 rounded-2xl border border-white/40 space-y-2">
                  <p className="text-[11px] font-semibold leading-relaxed text-black/80">
                    💡 This is our dedicated wholesale scheduling and quote portal. Realize wholesale orders directly without retail premiums! Conditions automatically scale by volume.
                  </p>
                  
                  {isReturningB2b && (
                    <div className="flex items-center justify-between bg-[#865d39]/10 p-2.5 rounded-xl border border-[#865d39]/20 text-xs mt-1.5">
                      <span className="font-bold text-[#865d39]">✓ Returning Partner Profile Active</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          localStorage.removeItem('b2b_profile_save');
                          setB2bName('');
                          setB2bResponsibleName('');
                          setB2bPhone('');
                          setB2bAddress('');
                          setIsReturningB2b(false);
                          toast.info('Profile fields cleared.');
                        }}
                        className="text-[10px] font-extrabold text-red-600 bg-white px-2 py-1 rounded-lg border border-red-200 hover:bg-red-50"
                      >
                        Reset Profile
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Business Name (Nome Fantasia) with autocomplete dropdown */}
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Building2 size={12} /> Nom Fantasie / Business Name *
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Coffee Central or Starbucks L.A."
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bName}
                      onChange={e => {
                        const val = e.target.value;
                        setB2bName(val);
                        if (val.trim().length >= 2) {
                          const matched = b2bProfiles.filter(p => 
                            (p.name || '').toLowerCase().includes(val.toLowerCase()) || 
                            (p.phone || '').toLowerCase().includes(val.toLowerCase())
                          );
                          setB2bSearchResults(matched);
                          setShowB2bSearchDropdown(matched.length > 0);
                        } else {
                          setShowB2bSearchDropdown(false);
                        }
                      }}
                    />
                    
                    {showB2bSearchDropdown && b2bSearchResults.length > 0 && (
                      <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-gray-100 p-1">
                        <div className="text-[9px] font-bold text-gray-400 uppercase p-1.5 tracking-wider bg-gray-50/50">
                          Recurrent Profiles Found (Click to autofill):
                        </div>
                        {b2bSearchResults.map((profile, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full p-2.5 text-left text-xs text-black hover:bg-gray-100 flex flex-col gap-0.5 rounded-lg active:scale-95 transition-all text-black font-medium"
                            onClick={() => {
                              setB2bName(profile.name || '');
                              setB2bResponsibleName(profile.manager || '');
                              setB2bPhone(profile.phone || '');
                              setB2bAddress(profile.address || '');
                              setIsReturningB2b(true);
                              setShowB2bSearchDropdown(false);
                              toast.success(`Autocompleted profile for ${profile.name}!`);
                            }}
                          >
                            <span className="font-bold text-black">{profile.name}</span>
                            <span className="text-[10px] text-gray-500 font-normal">Contact: {profile.manager} • Phone: {profile.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Responsible Person Manager Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <User size={12} /> Responsible Manager / Contact Name *
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Smith"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bResponsibleName}
                      onChange={e => setB2bResponsibleName(e.target.value)}
                    />
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Phone size={12} /> Contact Tel / Phone *
                    </label>
                    <input 
                      type="tel" 
                      placeholder="e.g. (310) 555-0199"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bPhone}
                      onChange={e => setB2bPhone(e.target.value)}
                    />
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <MapPin size={12} /> Commercial Delivery Address *
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. 520 Broadway, Santa Monica, CA 90401"
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold shadow-sm focus:border-black transition-colors"
                      value={b2bAddress}
                      onChange={e => setB2bAddress(e.target.value)}
                    />
                  </div>

                  {/* Delivery Schedule Frequency */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black block mb-1">
                      🚚 Delivery Plan/Frequency *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button" 
                        onClick={() => setB2bFrequency('one-time')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${b2bFrequency === 'one-time' ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-300 text-black hover:border-black'}`}
                      >
                        <span>Single Delivery</span>
                        <span className="text-[9px] opacity-75 font-normal">One-time Order / Spot</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setB2bFrequency('weekly')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${b2bFrequency === 'weekly' ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-300 text-black hover:border-black'}`}
                      >
                        <span className={b2bFrequency === 'weekly' ? "text-yellow-300" : "text-amber-600"}>★ Weekly Plan</span>
                        <span className="text-[9px] opacity-75 font-normal">Recurring deliveries</span>
                      </button>
                    </div>
                  </div>

                  {/* Delivery Calendar (Data de entrega) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Calendar size={12} className="text-[#865d39]" /> 
                      Scheduled Delivery Date (Calendar) *
                    </label>
                    <input 
                      type="date" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-extrabold text-black active:border-black select-all"
                      style={{ color: '#000000' }}
                      value={b2bDate}
                      onChange={e => setB2bDate(e.target.value)}
                    />
                  </div>

                  {/* Quantity section */}
                  <div className="pt-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#865d39] block mb-3 border-b border-[#865d39]/20 pb-1">
                      📦 FROZEN CHEESE BREAD PACKAGES VOLUME (1KG / 2.2LBS PACKAGES)
                    </label>
                    
                    <div className="space-y-3">
                      {/* Item 1 */}
                      <div className="bg-white/70 p-3 rounded-2xl border border-white/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <h4 className="font-extrabold text-xs text-black">Cocktail Size Cheese Bread</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">1kg packet • bite-sized, ideal for cafes & catering</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setPqCoquetel(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black active:scale-90 transition-all font-extrabold cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-black">{pqCoquetel}</span>
                          <button 
                            type="button"
                            onClick={() => setPqCoquetel(prev => prev + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 hover:opacity-90 transition-all font-extrabold cursor-pointer"
                            style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="bg-white/70 p-3 rounded-2xl border border-white/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <h4 className="font-extrabold text-xs text-black">Medium Size Cheese Bread</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">1kg packet • traditional classic café snack sizing</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setPqMedio(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black active:scale-90 transition-all font-extrabold cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-black">{pqMedio}</span>
                          <button 
                            type="button"
                            onClick={() => setPqMedio(prev => prev + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 hover:opacity-90 transition-all font-extrabold cursor-pointer"
                            style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="bg-white/70 p-3 rounded-2xl border border-white/30 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                          <h4 className="font-extrabold text-xs text-black">Large Premium Cheese Bread</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">1kg packet • gourmet display-counter large size</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setPqPremium(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black active:scale-90 transition-all font-extrabold cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-black">{pqPremium}</span>
                          <button 
                            type="button"
                            onClick={() => setPqPremium(prev => prev + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 hover:opacity-90 transition-all font-extrabold cursor-pointer"
                            style={{ backgroundColor: settings.primaryColor || '#865d39', color: getContrastText(settings.primaryColor || '#865d39') }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observation box */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-black">Custom Notes / Route Details</label>
                    <textarea 
                      placeholder="Enter details on delivery access, loading dock, recurring schedulings or special B2B requests"
                      rows={2.5}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none text-black font-semibold resize-none"
                      value={b2bObservation}
                      onChange={e => setB2bObservation(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submission Options (Whats and SMS) */}
                <div className="pt-4 border-t border-gray-200/50 space-y-3">
                  <div className="text-[10px] font-extrabold text-center text-gray-500 uppercase tracking-widest">
                    Select Dispatch Method for Wholesale Quote:
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        // Submit via WhatsApp
                        if (!b2bName.trim() || !b2bResponsibleName.trim() || !b2bPhone.trim() || !b2bAddress.trim() || !b2bDate) {
                          toast.error('Please complete all fields with an asterisk (*).');
                          return;
                        }
                        if (pqCoquetel === 0 && pqMedio === 0 && pqPremium === 0) {
                          toast.error('Select at least one package size quantity.');
                          return;
                        }
                        
                        // Construct state map and trigger submitting method
                        const formattedDateForDb = (() => {
                          const [year, month, day] = b2bDate.split('-');
                          return `${month}/${day}/${year}`;
                        })();

                        const orderItems = [];
                        if (pqCoquetel > 0) orderItems.push({ title: 'Cocktail Frozen Cheese Bread (1kg package)', quantity: pqCoquetel, price: 0, priceType: 'consult' as const });
                        if (pqMedio > 0) orderItems.push({ title: 'Medium Frozen Cheese Bread (1kg package)', quantity: pqMedio, price: 0, priceType: 'consult' as const });
                        if (pqPremium > 0) orderItems.push({ title: 'Large Premium Frozen Cheese Bread (1kg package)', quantity: pqPremium, price: 0, priceType: 'consult' as const });

                        const b2bOrderDataObj = {
                          customerName: b2bName,
                          phone: b2bPhone,
                          address: b2bAddress,
                          pickupDate: formattedDateForDb,
                          birthday: '',
                          observation: b2bObservation,
                          email: '',
                          items: orderItems,
                          total: 0,
                          createdAt: serverTimestamp(),
                          orderLanguage: 'en',
                          isB2B: true,
                          isPJ: true,
                          b2bManagerName: b2bResponsibleName,
                          b2bFrequency: b2bFrequency,
                          b2bCompanyName: b2bName,
                          b2bAddress: b2bAddress
                        };

                        try {
                          addDoc(collection(db, 'pedidos'), b2bOrderDataObj);
                          localStorage.setItem('b2b_profile_save', JSON.stringify({
                            name: b2bName,
                            manager: b2bResponsibleName,
                            phone: b2bPhone,
                            address: b2bAddress
                          }));
                          setIsReturningB2b(true);

                          // Build message
                          let msg = `*B2B CORPORATE ORDER & QUOTATION*\n`;
                          msg += `----------------------------------------\n`;
                          msg += `*Company:* ${b2bName}\n`;
                          msg += `*Manager:* ${b2bResponsibleName}\n`;
                          msg += `*Phone:* ${b2bPhone}\n`;
                          msg += `*Address:* ${b2bAddress}\n`;
                          msg += `*Frequency:* ${b2bFrequency === 'weekly' ? 'Weekly Recurring Plan' : 'One-Time Delivery Order'}\n`;
                          msg += `*Delivery Date:* ${formattedDateForDb}\n\n`;
                          msg += `*Wholesale items requested:*\n`;
                          if (pqCoquetel > 0) msg += `- Cocktail Frozen Cheese Bread: ${pqCoquetel} package(s) (1kg / 2.2lbs)\n`;
                          if (pqMedio > 0) msg += `- Medium Frozen Cheese Bread: ${pqMedio} package(s) (1kg / 2.2lbs)\n`;
                          if (pqPremium > 0) msg += `- Large Premium Frozen Cheese Bread: ${pqPremium} package(s) (1kg / 2.2lbs)\n`;
                          if (b2bObservation) msg += `\n*Notes/Specs:* ${b2bObservation}\n`;
                          msg += `----------------------------------------\n`;
                          msg += `Hello! We would like to request B2B wholesale pricing and delivery scheduling. Thank you!`;

                          const num = (settings.whatsappNumber || '').replace(/\D/g, '');
                          const sendUrl = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
                          
                          toast.success('B2B Quote recorded! Redirecting to WhatsApp...');
                          setIsDietsModalOpen(false);

                          try {
                            const win = window.open(sendUrl, '_blank');
                            if (!win || win.closed || typeof win.closed === 'undefined') {
                              window.location.href = sendUrl;
                            }
                          } catch (e) {
                            window.location.href = sendUrl;
                          }
                        } catch (err) {
                          console.error(err);
                          toast.error('Error recording order.');
                        }
                      }}
                      className="py-3.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        // Submit via SMS
                        if (!b2bName.trim() || !b2bResponsibleName.trim() || !b2bPhone.trim() || !b2bAddress.trim() || !b2bDate) {
                          toast.error('Please complete all fields with an asterisk (*).');
                          return;
                        }
                        if (pqCoquetel === 0 && pqMedio === 0 && pqPremium === 0) {
                          toast.error('Select at least one package size quantity.');
                          return;
                        }
                        
                        // Construct state map and trigger submitting method
                        const formattedDateForDb = (() => {
                          const [year, month, day] = b2bDate.split('-');
                          return `${month}/${day}/${year}`;
                        })();

                        const orderItems = [];
                        if (pqCoquetel > 0) orderItems.push({ title: 'Cocktail Frozen Cheese Bread (1kg package)', quantity: pqCoquetel, price: 0, priceType: 'consult' as const });
                        if (pqMedio > 0) orderItems.push({ title: 'Medium Frozen Cheese Bread (1kg package)', quantity: pqMedio, price: 0, priceType: 'consult' as const });
                        if (pqPremium > 0) orderItems.push({ title: 'Large Premium Frozen Cheese Bread (1kg package)', quantity: pqPremium, price: 0, priceType: 'consult' as const });

                        const b2bOrderDataObj = {
                          customerName: b2bName,
                          phone: b2bPhone,
                          address: b2bAddress,
                          pickupDate: formattedDateForDb,
                          birthday: '',
                          observation: b2bObservation,
                          email: '',
                          items: orderItems,
                          total: 0,
                          createdAt: serverTimestamp(),
                          orderLanguage: 'en',
                          isB2B: true,
                          isPJ: true,
                          b2bManagerName: b2bResponsibleName,
                          b2bFrequency: b2bFrequency,
                          b2bCompanyName: b2bName,
                          b2bAddress: b2bAddress
                        };

                        try {
                          addDoc(collection(db, 'pedidos'), b2bOrderDataObj);
                          localStorage.setItem('b2b_profile_save', JSON.stringify({
                            name: b2bName,
                            manager: b2bResponsibleName,
                            phone: b2bPhone,
                            address: b2bAddress
                          }));
                          setIsReturningB2b(true);

                          // Build message
                          let msg = `*B2B CORPORATE ORDER & QUOTATION*\n`;
                          msg += `----------------------------------------\n`;
                          msg += `*Company:* ${b2bName}\n`;
                          msg += `*Manager:* ${b2bResponsibleName}\n`;
                          msg += `*Phone:* ${b2bPhone}\n`;
                          msg += `*Address:* ${b2bAddress}\n`;
                          msg += `*Frequency:* ${b2bFrequency === 'weekly' ? 'Weekly plan' : 'Spot'}\n`;
                          msg += `*Delivery Date:* ${formattedDateForDb}\n\n`;
                          msg += `*Wholesale items requested:*\n`;
                          if (pqCoquetel > 0) msg += `- Cocktail: ${pqCoquetel}\n`;
                          if (pqMedio > 0) msg += `- Medium: ${pqMedio}\n`;
                          if (pqPremium > 0) msg += `- Large: ${pqPremium}\n`;
                          if (b2bObservation) msg += `\n*Notes:* ${b2bObservation}\n`;
                          msg += `----------------------------------------\n`;
                          msg += `We request B2B wholesale pricing and delivery scheduling. Thanks!`;

                          const num = (settings.whatsappNumber || '').replace(/\D/g, '');
                          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                          const sendUrl = `sms:${num}${isIOS ? '&' : '?'}body=${encodeURIComponent(msg)}`;
                          
                          toast.success('B2B Quote recorded! Opening SMS app...');
                          setIsDietsModalOpen(false);

                          try {
                            const win = window.open(sendUrl, '_blank');
                            if (!win || win.closed || typeof win.closed === 'undefined') {
                              window.location.href = sendUrl;
                            }
                          } catch (e) {
                            window.location.href = sendUrl;
                          }
                        } catch (err) {
                          console.error(err);
                          toast.error('Error registering B2B order.');
                        }
                      }}
                      className="py-3.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase text-white bg-[#865d39] hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <MessageSquare size={15} /> SMS Message
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
}
