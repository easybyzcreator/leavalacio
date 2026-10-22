import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, 
  query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Product, Order, Settings, Category, Side, ImageGallery } from '../types';
import { 
  Settings as SettingsIcon, Package, History, LogOut, Plus, Trash2, Edit2, 
  Save, X, Copy, CheckCircle2, Loader2, Layers, Image as ImageIcon,
  ArrowUp, ArrowDown, ArrowUpDown, Sparkles, ListOrdered, MessageCircle, MessageSquare, Calendar, Printer, Cake, Eye, EyeOff,
  DollarSign, Coins, ChevronDown, ChevronUp, Users, Download, Truck, Rocket, UserPlus, Briefcase, Phone,
  Search, Filter, Clock, UserCheck, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import OrdersCalendar from './OrdersCalendar';

const getContrastText = (hexColor?: string): string => {
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

const getColorWithLegibility = (hexColor?: string, defaultColor: string = '#865d39'): string => {
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

export default function Admin({ settings, setSettings, setIsAdmin }: { 
  settings: Settings, 
  setSettings: React.Dispatch<React.SetStateAction<Settings>>,
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [galleryIdToDelete, setGalleryIdToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'menu' | 'orders' | 'categories' | 'sides' | 'customers' | 'cakeOptions' | 'galleries' | 'representatives' | 'orderMenu'>('orders');
  const [selectedCategoryForOrdering, setSelectedCategoryForOrdering] = useState<string>('');
  const [isReordering, setIsReordering] = useState(false);
  const [galleries, setGalleries] = useState<ImageGallery[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [newSide, setNewSide] = useState<Partial<Side>>({ name: '', price: 0, type: 'side' });
  const [isEditingSide, setIsEditingSide] = useState<Side | null>(null);
  const [sidePriceInput, setSidePriceInput] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isEditingProduct, setIsEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    title: '',
    description: '',
    price: 0,
    oldPrice: 0,
    priceType: 'fixed',
    image: '',
    categoryId: '',
    isMeal: true,
    isCustomCake: false,
    ingredients: '',
    allowedSides: [],
    isActive: true,
    hasSizes: false,
    sizes: [],
    cakeGalleryId: '',
    tag: ''
  });
  const [priceInput, setPriceInput] = useState('');
  const [sizeForm, setSizeForm] = useState({ name: '', price: '', oldPrice: '' });
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);

  const [isEditingCategory, setIsEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ title: '', order: 0, catalog: 'both' as 'catalog1' | 'catalog2' | 'both' | 'catalog_b2b' });

  const [copied, setCopied] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderTypeTab, setOrderTypeTab] = useState<'retail' | 'b2b' | 'all'>('retail');
  const [orderViewMode, setOrderViewMode] = useState<'calendar' | 'list'>('calendar');
  const [orderValidationFilter, setOrderValidationFilter] = useState<'all' | 'validated' | 'pending'>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showBirthdaysOnly, setShowBirthdaysOnly] = useState(false);
  const [showBatchSummary, setShowBatchSummary] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState<Order | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState<any | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState<{
    name: string;
    phone: string;
    email: string;
    birthday: string;
    street: string;
    number: string;
    zipCode: string;
    city: string;
    address: string;
    isB2B: boolean;
    managerName: string;
    frequency: string;
    observation: string;
  }>({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    street: '',
    number: '',
    zipCode: '',
    city: '',
    address: '',
    isB2B: false,
    managerName: '',
    frequency: 'weekly',
    observation: ''
  });
  const [viewingCustomerOrders, setViewingCustomerOrders] = useState<any | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState<any>({});
  const [editOrderForm, setEditOrderForm] = useState<Partial<Order>>({});
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addItemQuantity, setAddItemQuantity] = useState(1);

  const updateOrderFormWithItems = (updatedItems: any[]) => {
    const isCorp = editOrderForm.isB2B || editOrderForm.isPJ;
    const subtotalVal = updatedItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    if (isCorp) {
      setEditOrderForm({
        ...editOrderForm,
        items: updatedItems,
        total: subtotalVal,
        subtotal: subtotalVal,
        taxRate: 0,
        taxAmount: 0
      });
    } else {
      const taxAmountVal = subtotalVal * 0.0875;
      const totalWithTaxVal = subtotalVal + taxAmountVal;
      setEditOrderForm({
        ...editOrderForm,
        items: updatedItems,
        total: totalWithTaxVal,
        subtotal: subtotalVal,
        taxRate: 8.75,
        taxAmount: taxAmountVal
      });
    }
  };

  // Vendedores / Representantes & Comissões (10%)
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('all');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<'all' | 'pending' | 'paid' | 'unpriced'>('all');
  const [repSearchQuery, setRepSearchQuery] = useState<string>('');
  const [repPeriodFilter, setRepPeriodFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('all');
  const [repStartDate, setRepStartDate] = useState<string>('');
  const [repEndDate, setRepEndDate] = useState<string>('');
  const [newRepNameInput, setNewRepNameInput] = useState<string>('');
  const [assigningRepOrder, setAssigningRepOrder] = useState<{ id: string; customerName: string; currentRep: string } | null>(null);

  const uniqueSalesReps = useMemo(() => {
    const reps = new Set<string>();
    (settings?.salesReps || []).forEach(r => {
      if (r && r.trim()) reps.add(r.trim());
    });
    orders.forEach(o => {
      if (o.salesRep && o.salesRep.trim()) {
        reps.add(o.salesRep.trim());
      }
    });
    return Array.from(reps).sort((a, b) => a.localeCompare(b));
  }, [orders, settings?.salesReps]);

  const getOrderCreationDate = (o: Order): Date | null => {
    if (o.createdAt) {
      if (typeof o.createdAt.toDate === 'function') return o.createdAt.toDate();
      if (o.createdAt.seconds) return new Date(o.createdAt.seconds * 1000);
      if (o.createdAt instanceof Date) return o.createdAt;
      if (typeof o.createdAt === 'string') {
        const d = new Date(o.createdAt);
        if (!isNaN(d.getTime())) return d;
      }
    }
    if (o.pickupDate) {
      const parts = o.pickupDate.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
      const d = new Date(o.pickupDate);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const checkOrderInPeriod = (orderDate: Date | null, period: string, startStr: string, endStr: string): boolean => {
    if (period === 'all') return true;
    if (!orderDate) return false;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period === 'today') {
      return orderDate >= todayStart && orderDate <= todayEnd;
    }

    if (period === 'yesterday') {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(todayEnd);
      yEnd.setDate(yEnd.getDate() - 1);
      return orderDate >= yStart && orderDate <= yEnd;
    }

    if (period === 'this_week') {
      const day = now.getDay();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
      return orderDate >= weekStart && orderDate <= todayEnd;
    }

    if (period === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return orderDate >= monthStart && orderDate <= todayEnd;
    }

    if (period === 'last_month') {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
    }

    if (period === 'custom') {
      if (startStr) {
        const s = new Date(`${startStr}T00:00:00`);
        if (orderDate < s) return false;
      }
      if (endStr) {
        const e = new Date(`${endStr}T23:59:59.999`);
        if (orderDate > e) return false;
      }
      return true;
    }

    return true;
  };

  const repOrders = useMemo(() => {
    return orders.filter(o => {
      const isRelevant = o.isB2B || o.isPJ || Boolean(o.salesRep && o.salesRep.trim());
      if (!isRelevant) return false;

      if (selectedRepFilter !== 'all') {
        if ((o.salesRep || '').trim() !== selectedRepFilter) return false;
      }

      if (commissionStatusFilter === 'pending') {
        if (o.commissionStatus === 'paid' || !o.total || o.total <= 0) return false;
      } else if (commissionStatusFilter === 'paid') {
        if (o.commissionStatus !== 'paid') return false;
      } else if (commissionStatusFilter === 'unpriced') {
        if (o.total && o.total > 0) return false;
      }

      // Período de Vendas Filter
      if (repPeriodFilter !== 'all') {
        const orderDate = getOrderCreationDate(o);
        if (!checkOrderInPeriod(orderDate, repPeriodFilter, repStartDate, repEndDate)) {
          return false;
        }
      }

      if (repSearchQuery.trim()) {
        const q = repSearchQuery.toLowerCase();
        const repName = (o.salesRep || '').toLowerCase();
        const clientName = (o.customerName || '').toLowerCase();
        const companyName = (o.b2bCompanyName || '').toLowerCase();
        const phone = (o.phone || '').toLowerCase();
        if (!repName.includes(q) && !clientName.includes(q) && !companyName.includes(q) && !phone.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedRepFilter, commissionStatusFilter, repPeriodFilter, repStartDate, repEndDate, repSearchQuery]);

  const repStats = useMemo(() => {
    let totalSales = 0;
    let pendingCommission = 0;
    let paidCommission = 0;
    let unpricedCount = 0;
    let totalPackages = 0;

    repOrders.forEach(o => {
      const orderTotal = o.total || 0;
      totalSales += orderTotal;
      const commAmt = orderTotal * 0.10;

      if (!orderTotal || orderTotal <= 0) {
        unpricedCount += 1;
      } else if (o.commissionStatus === 'paid') {
        paidCommission += commAmt;
      } else {
        pendingCommission += commAmt;
      }

      if (o.totalPackages) {
        totalPackages += o.totalPackages;
      } else if (o.items) {
        o.items.forEach(item => {
          const match = (item.title || '').match(/(\d+)\s*(?:pkgs?|pacotes?)/i);
          if (match) {
            totalPackages += parseInt(match[1], 10) * (item.quantity || 1);
          } else {
            totalPackages += 25 * (item.quantity || 1);
          }
        });
      }
    });

    return {
      totalSales,
      pendingCommission,
      paidCommission,
      unpricedCount,
      totalOrders: repOrders.length,
      totalPackages
    };
  }, [repOrders]);

  const handleToggleCommission = async (order: Order) => {
    const newStatus = order.commissionStatus === 'paid' ? 'pending' : 'paid';
    try {
      await updateDoc(doc(db, 'pedidos', order.id), {
        commissionStatus: newStatus,
        commissionPaidAt: newStatus === 'paid' ? serverTimestamp() : null
      });
      toast.success(newStatus === 'paid' ? 'Comissão marcada como PAGA!' : 'Comissão retornada para PENDENTE.');
    } catch (err) {
      toast.error('Erro ao atualizar status da comissão.');
    }
  };

  const handleAddSalesRep = async (nameToAdd?: string) => {
    const rawName = nameToAdd !== undefined ? nameToAdd : newRepNameInput;
    const trimmed = rawName.trim();
    if (!trimmed) {
      toast.error('Informe o nome do vendedor!');
      return;
    }
    const currentList = settings?.salesReps || [];
    if (currentList.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`O vendedor "${trimmed}" já está cadastrado!`);
      return;
    }
    const updated = [...currentList, trimmed];
    setSettings(prev => ({ ...prev, salesReps: updated }));
    setNewRepNameInput('');
    try {
      await setDoc(doc(db, 'configuracoes', 'geral'), { salesReps: updated }, { merge: true });
      toast.success(`Vendedor "${trimmed}" cadastrado com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar vendedor.');
    }
  };

  const handleRemoveSalesRep = async (repToRemove: string) => {
    if (!window.confirm(`Deseja remover "${repToRemove}" da lista de vendedores cadastrados?`)) return;
    const currentList = settings?.salesReps || [];
    const updated = currentList.filter(r => r.toLowerCase() !== repToRemove.toLowerCase());
    setSettings(prev => ({ ...prev, salesReps: updated }));
    try {
      await setDoc(doc(db, 'configuracoes', 'geral'), { salesReps: updated }, { merge: true });
      toast.success(`Vendedor "${repToRemove}" removido!`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao remover vendedor.');
    }
  };

  const handleSaveOrderSalesRep = async (orderId: string, repName: string) => {
    try {
      const trimmed = repName.trim();
      await updateDoc(doc(db, 'pedidos', orderId), {
        salesRep: trimmed
      });
      // Auto-register to settings if new
      if (trimmed) {
        const currentList = settings?.salesReps || [];
        if (!currentList.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
          const updated = [...currentList, trimmed];
          setSettings(prev => ({ ...prev, salesReps: updated }));
          await setDoc(doc(db, 'configuracoes', 'geral'), { salesReps: updated }, { merge: true });
        }
      }
      toast.success('Vendedor do pedido atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar vendedor do pedido.');
    }
  };

  const handleUpdateSalesRep = (orderId: string, currentRep: string = '', customerName: string = '') => {
    setAssigningRepOrder({ id: orderId, currentRep, customerName });
  };

  const [pricingModalOrder, setPricingModalOrder] = useState<Order | null>(null);
  const [quickPriceInput, setQuickPriceInput] = useState<string>('');
  const [isSavingQuickPrice, setIsSavingQuickPrice] = useState<boolean>(false);

  const handleOpenQuickSetOrderTotal = (order: Order) => {
    setPricingModalOrder(order);
    setQuickPriceInput(order.total && order.total > 0 ? order.total.toString() : '');
  };

  const handleSaveQuickPrice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pricingModalOrder) return;
    const parsed = parseFloat(quickPriceInput.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Informe um valor numérico válido.');
      return;
    }
    try {
      setIsSavingQuickPrice(true);
      await updateDoc(doc(db, 'pedidos', pricingModalOrder.id), {
        total: parsed,
        commissionAmount: parsed * 0.10,
        commissionRate: 0.10
      });
      toast.success(`Valor atualizado: ${currencySymbol} ${parsed.toFixed(2)} (Comissão 10%: ${currencySymbol} ${(parsed * 0.10).toFixed(2)})`);
      setPricingModalOrder(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar valor do pedido.');
    } finally {
      setIsSavingQuickPrice(false);
    }
  };
  const [oldPriceInput, setOldPriceInput] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const uniqueCustomers = useMemo(() => {
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      email: string;
      birthday: string;
      address: string;
      orderLanguage?: string;
      lastOrder: any;
      totalOrders: number;
      isB2B: boolean;
      managerName: string;
      street: string;
      number: string;
      zipCode: string;
      city: string;
      frequency: string;
      orders: Order[];
    }>();

    orders.forEach(order => {
      const isCorp = !!(order.isB2B || order.isPJ);
      const name = isCorp ? (order.b2bCompanyName || order.customerName) : order.customerName;
      const phone = order.phone || '';
      const email = order.email || '';
      const key = phone || email || name;
      if (!key) return;

      const hasRealOrder = (order.items && order.items.length > 0) || (order.total && order.total > 0);

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: name,
          phone: phone,
          email: email,
          birthday: order.birthday || '',
          address: isCorp ? (order.b2bAddress || order.address || '') : (order.address || ''),
          orderLanguage: order.orderLanguage,
          lastOrder: order.createdAt,
          totalOrders: hasRealOrder ? 1 : 0,
          isB2B: isCorp,
          managerName: order.b2bManagerName || '',
          street: order.street || '',
          number: order.number || '',
          zipCode: isCorp ? (order.b2bZipCode || order.zipCode || '') : (order.zipCode || ''),
          city: isCorp ? (order.b2bCity || order.city || '') : (order.city || ''),
          frequency: order.b2bFrequency || '',
          orders: [order]
        });
      } else {
        const existing = customerMap.get(key)!;
        if (hasRealOrder) {
          existing.totalOrders += 1;
        }
        existing.orders.push(order);
        if (isCorp) {
          existing.isB2B = true;
          if (order.b2bCompanyName) existing.name = order.b2bCompanyName;
          if (order.b2bManagerName) existing.managerName = order.b2bManagerName;
          if (order.b2bAddress) existing.address = order.b2bAddress;
          if (order.b2bZipCode) existing.zipCode = order.b2bZipCode;
          if (order.b2bCity) existing.city = order.b2bCity;
          if (order.b2bFrequency) existing.frequency = order.b2bFrequency;
        } else {
          if (order.street) existing.street = order.street;
          if (order.number) existing.number = order.number;
          if (order.zipCode) existing.zipCode = order.zipCode;
          if (order.city) existing.city = order.city;
        }
        if (order.createdAt?.toDate && existing.lastOrder?.toDate) {
          if (order.createdAt.toDate() > existing.lastOrder.toDate()) {
            existing.lastOrder = order.createdAt;
            if (!isCorp) {
              existing.name = order.customerName;
              existing.birthday = order.birthday || existing.birthday;
              existing.address = order.address || existing.address;
            }
            existing.orderLanguage = order.orderLanguage || existing.orderLanguage;
          }
        }
      }
    });

    return Array.from(customerMap.values());
  }, [orders]);

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  };

  const handleBrandNameChange = (name: string) => {
    setSettings(prev => ({
      ...prev,
      brandName: name,
      slug: slugify(name)
    }));
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);

    const unsubProducts = onSnapshot(query(collection(db, 'produtos'), orderBy('title')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categorias'), orderBy('order', 'asc')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    const unsubOrders = onSnapshot(query(collection(db, 'pedidos'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const unsubSides = onSnapshot(collection(db, 'acompanhamentos'), (snapshot) => {
      setSides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Side)));
    });

    const unsubGalleries = onSnapshot(collection(db, 'galerias'), (snapshot) => {
      setGalleries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageGallery)));
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubOrders();
      unsubSides();
      unsubGalleries();
    };
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = settings?.adminPassword || 'admin123';
    if (password === correctPassword) {
      try {
        await signInAnonymously(auth);
        setIsLoggedIn(true);
        toast.success('Login realizado com sucesso!');
      } catch (error) {
        console.error('Erro ao autenticar com Firebase:', error);
        toast.error('Erro ao conectar com o servidor. Tente novamente.');
      }
    } else {
      toast.error('Senha incorreta!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void, isGallery: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image if it's too large
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions - smaller for gallery to save space in Firestore
          const MAX_WIDTH = isGallery ? 800 : 1200;
          const MAX_HEIGHT = isGallery ? 800 : 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.7 for good balance, 0.5 for gallery
          const compressedBase64 = canvas.toDataURL('image/jpeg', isGallery ? 0.5 : 0.7);
          callback(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const addCakeOptionItem = (key: 'cakeSizes' | 'cakeDoughs' | 'cakeFillings' | 'cakeToppings' | 'cakeToppers', defaultValue: string = '') => {
    setSettings(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), defaultValue]
    }));
  };

  const removeCakeOptionItem = (key: 'cakeSizes' | 'cakeDoughs' | 'cakeFillings' | 'cakeToppings' | 'cakeToppers', index: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const updateCakeOptionItem = (key: 'cakeSizes' | 'cakeDoughs' | 'cakeFillings' | 'cakeToppings' | 'cakeToppers', index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: (prev[key] || []).map((v: string, i: number) => i === index ? value : v)
    }));
  };

  const saveSettings = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const updatedSettings = {
        ...settings,
        language: 'en' as const,
        currency: 'USD' as const
      };
      
      await Promise.race([
        setDoc(doc(db, 'configuracoes', 'geral'), updatedSettings),
        timeoutPromise
      ]);
      
      toast.success('Configurações salvas com sucesso!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações. Verifique sua conexão ou o tamanho das imagens.');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handlePriceChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setPriceInput('0,00');
      setNewProduct(prev => ({ ...prev, price: 0 }));
      return;
    }
    
    const numericValue = parseInt(digits) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    setPriceInput(formatted);
    setNewProduct(prev => ({ ...prev, price: numericValue }));
  };

  const handleOldPriceChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setOldPriceInput('0,00');
      setNewProduct(prev => ({ ...prev, oldPrice: 0 }));
      return;
    }
    
    const numericValue = parseInt(digits) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    setOldPriceInput(formatted);
    setNewProduct(prev => ({ ...prev, oldPrice: numericValue }));
  };

  const handleAddSizeOption = () => {
    if (!sizeForm.name) {
      toast.error('Informe ao menos o nome do tamanho.');
      return;
    }
    const priceVal = sizeForm.price ? (parseFloat(sizeForm.price.replace(/\D/g, '')) / 100) : 0;
    
    if (editingSizeId) {
      setNewProduct((prev: any) => ({
        ...prev,
        sizes: (prev.sizes || []).map((s: any) => 
          s.id === editingSizeId ? { ...s, name: sizeForm.name, price: priceVal } : s
        )
      }));
      setEditingSizeId(null);
      setSizeForm({ name: '', price: '', oldPrice: '' });
      toast.success('Opção de tamanho atualizada!');
    } else {
      const newSizeOption = {
        id: Math.random().toString(36).substr(2, 9),
        name: sizeForm.name,
        price: priceVal
      };
      
      setNewProduct((prev: any) => ({
        ...prev,
        sizes: [...(prev.sizes || []), newSizeOption]
      }));
      
      setSizeForm({ name: '', price: '', oldPrice: '' });
      toast.success('Opção de tamanho adicionada!');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newProduct.title || !newProduct.categoryId) {
        toast.error('Por favor, preencha o título e a categoria.');
        return;
      }

      if (isEditingProduct) {
        await updateDoc(doc(db, 'produtos', isEditingProduct.id), newProduct);
        setIsEditingProduct(null);
        toast.success('Produto atualizado com sucesso!');
      } else {
        const categoryCount = products.filter(p => p.categoryId === newProduct.categoryId).length;
        await addDoc(collection(db, 'produtos'), { ...newProduct, order: categoryCount + 1, isActive: true });
        toast.success('Produto adicionado com sucesso!');
      }
      setNewProduct({ 
        title: '', 
        description: '', 
        price: 0, 
        priceType: 'fixed',
        image: '', 
        categoryId: '',
        isMeal: true,
        isCustomCake: false,
        ingredients: '',
        allowedSides: [],
        isActive: true,
        oldPrice: 0,
        hasSizes: false,
        sizes: [],
        cakeGalleryId: '',
        tag: ''
      });
      setPriceInput('');
      setOldPriceInput('');
      setEditingSizeId(null);
      setSizeForm({ name: '', price: '', oldPrice: '' });
    } catch (err) {
      toast.error('Erro ao salvar produto.');
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'produtos', product.id), {
        isActive: product.isActive === false ? true : false
      });
    } catch (err) {
      alert('Erro ao alterar status do produto.');
    }
  };

  const moveCategory = async (id: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    const current = categories[index];
    const other = categories[otherIndex];

    const currentOrder = current.order ?? index;
    const otherOrder = other.order ?? otherIndex;

    let newCurrentOrder = otherOrder;
    let newOtherOrder = currentOrder;

    if (newCurrentOrder === newOtherOrder) {
      if (direction === 'up') {
        newCurrentOrder = newOtherOrder - 1;
      } else {
        newCurrentOrder = newOtherOrder + 1;
      }
    }

    await updateDoc(doc(db, 'categorias', current.id), { order: newCurrentOrder });
    await updateDoc(doc(db, 'categorias', other.id), { order: newOtherOrder });
  };

  const handleAddSide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSide.name) return;

    try {
      if (isEditingSide) {
        await updateDoc(doc(db, 'acompanhamentos', isEditingSide.id), newSide);
        toast.success('Acompanhamento atualizado!');
      } else {
        await addDoc(collection(db, 'acompanhamentos'), newSide);
        toast.success('Acompanhamento adicionado!');
      }
      setNewSide({ name: '', price: 0, type: 'side' });
      setSidePriceInput('');
      setIsEditingSide(null);
    } catch (error) {
      console.error('Error adding side:', error);
      toast.error('Erro ao salvar acompanhamento');
    }
  };

  const deleteSide = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Acompanhamento',
      message: 'Tem certeza que deseja excluir este acompanhamento?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'acompanhamentos', id));
          toast.success('Acompanhamento excluído!');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          toast.error('Erro ao excluir');
        }
      }
    });
  };

  const handleSidePriceChange = (val: string) => {
    setSidePriceInput(val);
    const numeric = parseFloat(val.replace(',', '.'));
    if (!isNaN(numeric)) {
      setNewSide({ ...newSide, price: numeric });
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newCategory.title) {
        toast.error('Por favor, preencha o título da categoria.');
        return;
      }

      if (isEditingCategory) {
        await updateDoc(doc(db, 'categorias', isEditingCategory.id), { 
          title: newCategory.title,
          catalog: newCategory.catalog || 'both'
        });
        setIsEditingCategory(null);
        toast.success('Categoria atualizada com sucesso!');
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.order || 0), 0);
        await addDoc(collection(db, 'categorias'), {
          title: newCategory.title,
          order: maxOrder + 1,
          catalog: newCategory.catalog || 'both'
        });
        toast.success('Categoria adicionada com sucesso!');
      }
      setNewCategory({ title: '', order: 0, catalog: 'both' });
    } catch (err: any) {
      console.error('Erro ao salvar categoria:', err);
      if (err.message?.includes('permission-denied')) {
        toast.error('Erro de permissão: Você não tem autorização para salvar. Verifique se está logado corretamente.');
      } else {
        toast.error('Erro ao salvar categoria. Verifique sua conexão.');
      }
    }
  };

  const deleteProduct = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Produto',
      message: 'Deseja realmente excluir este produto? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'produtos', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          alert('Erro ao excluir produto.');
        }
      }
    });
  };

  const deleteCategory = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Categoria',
      message: 'Deseja realmente excluir esta categoria? Todos os produtos vinculados a ela ficarão sem categoria.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'categorias', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          alert('Erro ao excluir categoria.');
        }
      }
    });
  };

  const deleteOrder = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Pedido',
      message: 'Deseja realmente excluir este pedido permanentemente?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'pedidos', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setIsEditingOrder(null);
          toast.success('Pedido excluído com sucesso!');
        } catch (err) {
          toast.error('Erro ao excluir pedido.');
        }
      }
    });
  };

  const deleteCustomer = async (customer: any) => {
    const customerId = customer.phone || customer.email || customer.name;
    const customerOrders = orders.filter(o => (o.phone || o.email || o.customerName) === customerId);
    
    try {
      setIsSaving(true);
      for (const order of customerOrders) {
        await deleteDoc(doc(db, 'pedidos', order.id));
      }
      toast.success('Cliente e seus pedidos excluídos com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente');
    } finally {
      setIsSaving(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const updateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const originalId = isEditingCustomer.phone || isEditingCustomer.email || isEditingCustomer.name;
    const customerOrders = orders.filter(o => {
      const isCorp = o.isB2B || o.isPJ;
      const oName = isCorp ? (o.b2bCompanyName || o.customerName) : o.customerName;
      const oKey = o.phone || o.email || oName;
      return oKey === originalId;
    });

    try {
      setIsSaving(true);
      for (const order of customerOrders) {
        const updateData: any = {
          phone: editCustomerForm.phone,
          email: editCustomerForm.email,
          birthday: editCustomerForm.birthday || '',
        };

        if (editCustomerForm.isB2B) {
          updateData.b2bCompanyName = editCustomerForm.name;
          updateData.b2bManagerName = editCustomerForm.managerName || '';
          updateData.b2bAddress = editCustomerForm.address || '';
          updateData.b2bZipCode = editCustomerForm.zipCode || '';
          updateData.b2bCity = editCustomerForm.city || '';
          updateData.b2bFrequency = editCustomerForm.frequency || '';
          // Keep customerName in sync for fallback
          updateData.customerName = editCustomerForm.managerName || editCustomerForm.name;
          updateData.address = editCustomerForm.address || '';
        } else {
          updateData.customerName = editCustomerForm.name;
          updateData.street = editCustomerForm.street || '';
          updateData.number = editCustomerForm.number || '';
          updateData.zipCode = editCustomerForm.zipCode || '';
          updateData.city = editCustomerForm.city || '';
          
          // Rebuild full address from components
          const fullAddr = `${editCustomerForm.street || ''}, ${editCustomerForm.number || 'S/N'} - ${editCustomerForm.city || ''} (${editCustomerForm.zipCode || ''})`;
          updateData.address = fullAddr;
        }

        await updateDoc(doc(db, 'pedidos', order.id), updateData);
      }
      toast.success('Informações do cliente atualizadas!');
      setIsEditingCustomer(null);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name?.trim()) {
      toast.error('Por favor, informe o nome do cliente.');
      return;
    }
    if (!newCustomerForm.phone?.trim()) {
      toast.error('Por favor, informe o telefone/WhatsApp do cliente.');
      return;
    }

    try {
      setIsSaving(true);
      const isB2B = !!newCustomerForm.isB2B;
      const fullAddress = isB2B 
        ? (newCustomerForm.address?.trim() || '')
        : (newCustomerForm.address?.trim() || `${newCustomerForm.street?.trim() || ''}, ${newCustomerForm.number?.trim() || 'S/N'} - ${newCustomerForm.city?.trim() || ''} (${newCustomerForm.zipCode?.trim() || ''})`);

      const customerRecord: Omit<Order, 'id'> = {
        customerName: isB2B ? (newCustomerForm.managerName?.trim() || newCustomerForm.name.trim()) : newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email?.trim() || '',
        birthday: newCustomerForm.birthday?.trim() || '',
        street: newCustomerForm.street?.trim() || '',
        number: newCustomerForm.number?.trim() || '',
        zipCode: newCustomerForm.zipCode?.trim() || '',
        city: newCustomerForm.city?.trim() || '',
        address: fullAddress,
        isB2B: isB2B,
        isPJ: isB2B,
        b2bCompanyName: isB2B ? newCustomerForm.name.trim() : '',
        b2bManagerName: isB2B ? (newCustomerForm.managerName?.trim() || '') : '',
        b2bAddress: isB2B ? (newCustomerForm.address?.trim() || '') : '',
        b2bZipCode: isB2B ? (newCustomerForm.zipCode?.trim() || '') : '',
        b2bCity: isB2B ? (newCustomerForm.city?.trim() || '') : '',
        b2bFrequency: isB2B ? (newCustomerForm.frequency as any || 'weekly') : undefined,
        items: [],
        total: 0,
        subtotal: 0,
        taxRate: 0,
        taxAmount: 0,
        observation: newCustomerForm.observation?.trim() || 'Cliente cadastrado manualmente',
        createdAt: serverTimestamp(),
        orderLanguage: settings?.language || 'pt',
        paymentStatus: 'not_paid',
        productionValidated: false
      };

      await addDoc(collection(db, 'pedidos'), customerRecord);
      toast.success('Cliente cadastrado com sucesso!');
      setIsAddingCustomer(false);
      setNewCustomerForm({
        name: '',
        phone: '',
        email: '',
        birthday: '',
        street: '',
        number: '',
        zipCode: '',
        city: '',
        address: '',
        isB2B: false,
        managerName: '',
        frequency: 'weekly',
        observation: ''
      });
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast.error('Erro ao cadastrar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const closestUpcomingOrder = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseDateString = (str: string, lang?: string) => {
      if (!str || !str.includes('/')) return null;
      const parts = str.split('/');
      if (parts.length !== 3) return null;
      
      let month = parseInt(parts[0]);
      let day = parseInt(parts[1]);
      let year = parseInt(parts[2]);

      // Always treat as MM/DD/YYYY by default (USA pattern), but if the first part (month) is > 12, it is definitely DD/MM/YYYY
      if (month > 12) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
      }
      
      if (!day || !month || !year || month > 12) return null;
      return new Date(year, month - 1, day);
    };

    const upcomingOrders = orders
      .map(o => {
        if (!o.pickupDate) return null;
        const d = parseDateString(o.pickupDate, o.orderLanguage || settings.language || 'pt');
        if (!d) return null;
        d.setHours(0, 0, 0, 0);
        return { order: o, date: d };
      })
      .filter((item): item is { order: Order; date: Date } => item !== null && item.date >= today);

    if (upcomingOrders.length === 0) {
      // If none are in the future, get the closest one overall that has a pickupDate
      const allWithDate = orders
        .map(o => {
          if (!o.pickupDate) return null;
          const d = parseDateString(o.pickupDate, o.orderLanguage || settings.language || 'pt');
          if (!d) return null;
          d.setHours(0, 0, 0, 0);
          return { order: o, date: d };
        })
        .filter((item): item is { order: Order; date: Date } => item !== null);
      
      if (allWithDate.length === 0) return null;
      
      allWithDate.sort((a, b) => b.date.getTime() - a.date.getTime());
      return allWithDate[0].order;
    }

    upcomingOrders.sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcomingOrders[0].order;
  }, [orders, settings.language]);

  const printOrdersList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const listTitle = orderTypeTab === 'b2b' 
      ? 'Lista de Pedidos Corporativos / PJ (B2B)' 
      : orderTypeTab === 'all'
        ? 'Lista de Todos os Pedidos (Varejo + Corporativo)'
        : 'Lista de Pedidos Varejo (Retail)';

    const rowsHtml = filteredOrders.map((order, index) => {
      const dateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('en-US') : 'N/A';
      const itemsText = order.items.map(item => `${item.quantity}x ${item.title}`).join(', ');
      const name = order.isB2B || order.isPJ ? (order.b2bCompanyName || order.customerName) : order.customerName;
      const deliveryDate = order.pickupDate ? `Entrega: ${order.pickupDate}` : 'N/A';
      
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            <strong>${name}</strong><br/>
            <span style="font-size: 11px; color: #555;">${order.phone}</span>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px;">${itemsText}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; white-space: nowrap;">${deliveryDate}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; text-align: right; font-weight: bold;">
            ${currencySymbol} ${order.total.toFixed(2).replace('.', ',')}
          </td>
        </tr>
      `;
    }).join('');

    const totalSum = filteredOrders.reduce((sum, o) => sum + o.total, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>${listTitle}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { font-family: Arial, sans-serif; padding: 10px; color: #333; }
            h1 { font-size: 20px; margin-bottom: 5px; text-align: center; }
            .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #f5f5f5; padding: 10px; text-align: left; font-size: 12px; border-bottom: 2px solid #ddd; }
            .total-row { font-size: 16px; font-weight: bold; text-align: right; margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>${listTitle}</h1>
          <div class="subtitle">Gerado em: ${new Date().toLocaleString('pt-BR')} | Total de Pedidos: ${filteredOrders.length}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 25%;">Cliente</th>
                <th style="width: 45%;">Itens</th>
                <th style="width: 13%;">Agendado</th>
                <th style="width: 12%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">Nenhum pedido encontrado.</td></tr>'}
            </tbody>
          </table>
          <div class="total-row">
            SOMA TOTAL: ${currencySymbol} ${totalSum.toFixed(2).replace('.', ',')}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printProductionSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const listTitle = orderTypeTab === 'b2b'
      ? 'Resumo de Produção - Corporativo / PJ (B2B)'
      : orderTypeTab === 'all'
        ? 'Resumo de Produção - Todos os Pedidos'
        : 'Resumo de Produção - Varejo (Retail)';

    const itemsHtml = Object.entries(batchSummary.items).map(([title, qty]) => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px;">
        <span style="font-weight: bold;">${title}</span>
        <span style="font-weight: 800; background-color: #f0f0f0; padding: 2px 8px; border-radius: 4px;">${qty}x</span>
      </div>
    `).join('');

    const sidesHtml = Object.entries(batchSummary.sides).map(([name, qty]) => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px;">
        <span>${name}</span>
        <span style="font-weight: 800; background-color: #e6f7ed; padding: 2px 8px; border-radius: 4px; color: #1e7e34;">${qty}x</span>
      </div>
    `).join('');

    const dateRangeText = (startDate || endDate) 
      ? `Período: ${startDate || 'Início'} até ${endDate || 'Fim'}`
      : 'Todos os Pedidos';

    printWindow.document.write(`
      <html>
        <head>
          <title>${listTitle}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { font-family: Arial, sans-serif; padding: 10px; color: #333; }
            h1 { font-size: 20px; margin-bottom: 5px; text-align: center; }
            .subtitle { font-size: 12px; color: #666; margin-bottom: 25px; text-align: center; }
            .section { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; background-color: #fff; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 10px; color: #222; }
          </style>
        </head>
        <body>
          <h1>${listTitle}</h1>
          <div class="subtitle">Gerado em: ${new Date().toLocaleString('pt-BR')} | ${dateRangeText}</div>
          
          <div class="section">
            <div class="section-title">📦 Total de Itens</div>
            <div>
              ${itemsHtml || '<p style="color: #999; text-align: center; padding: 10px 0;">Nenhum item para produzir no período.</p>'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">➕ Total de Acompanhamentos</div>
            <div>
              ${sidesHtml || '<p style="color: #999; text-align: center; padding: 10px 0;">Nenhum acompanhamento no período.</p>'}
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingOrder) return;
    try {
      const updatedTotal = typeof editOrderForm.total === 'number' ? editOrderForm.total : parseFloat(String(editOrderForm.total || 0));
      const orderData = {
        ...editOrderForm,
        total: updatedTotal || 0,
        commissionRate: 0.10,
        commissionAmount: (updatedTotal || 0) * 0.10,
        salesRep: (editOrderForm.salesRep || '').trim()
      };
      await updateDoc(doc(db, 'pedidos', isEditingOrder.id), orderData);
      setIsEditingOrder(null);
      toast.success('Pedido atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro ao atualizar pedido.');
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const copyLink = () => {
    const url = `${window.location.origin}/?slug=${settings?.slug || 'easy-menu'}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('pt-BR') : 'N/A';
    const isB2B = order.isB2B || order.isPJ;
    const clientName = isB2B ? (order.b2bCompanyName || order.customerName) : order.customerName;

    let itemsHtml = order.items.map((item, idx) => {
      const unitPrice = item.price || 0;
      const itemTotal = unitPrice * item.quantity;
      
      let customizationDetails: string[] = [];
      if (item.cakeOptions) {
        if (item.cakeOptions.size) customizationDetails.push(`Tamanho: ${item.cakeOptions.size}`);
        if (item.cakeOptions.dough) customizationDetails.push(`Massa: ${item.cakeOptions.dough}`);
        if (item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0) customizationDetails.push(`Recheio: ${item.cakeOptions.fillings.join(', ')}`);
        if (item.cakeOptions.topping) customizationDetails.push(`Cobertura: ${item.cakeOptions.topping}`);
        if (item.cakeOptions.topper && item.cakeOptions.topper !== 'None') customizationDetails.push(`Topo: ${item.cakeOptions.topper}`);
      }
      if (item.mealOptions) {
        if (item.mealOptions.removals && item.mealOptions.removals.length > 0) {
          customizationDetails.push(`Remover: ${item.mealOptions.removals.join(', ')}`);
        }
        if (item.mealOptions.sides && item.mealOptions.sides.length > 0) {
          customizationDetails.push(`Acompanhamentos: ${item.mealOptions.sides.map(s => s.name).join(', ')}`);
        }
      }
      if (item.selectedSize) {
        customizationDetails.push(`Tamanho: ${item.selectedSize.name}`);
      }

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 8px; vertical-align: top; width: 45px; text-align: center; font-weight: bold; color: #6b7280;">
            ${idx + 1}
          </td>
          <td style="padding: 10px 8px; vertical-align: top;">
            <div style="font-size: 14px; font-weight: 700; color: #111827;">${item.title}</div>
            ${customizationDetails.length > 0 ? `
              <div style="font-size: 11px; color: #4b5563; margin-top: 4px; line-height: 1.4; background-color: #f9fafb; padding: 4px 8px; border-radius: 4px; border-left: 2px solid #9ca3af;">
                ${customizationDetails.join(' • ')}
              </div>
            ` : ''}
          </td>
          <td style="padding: 10px 8px; vertical-align: top; text-align: center; font-weight: 800; font-size: 14px; width: 60px;">
            <span style="background-color: #f3f4f6; padding: 3px 8px; border-radius: 6px;">${item.quantity}x</span>
          </td>
          <td style="padding: 10px 8px; vertical-align: top; text-align: right; font-size: 13px; color: #4b5563; width: 100px;">
            ${unitPrice > 0 ? `${currencySymbol} ${unitPrice.toFixed(2).replace('.', ',')}` : '-'}
          </td>
          <td style="padding: 10px 8px; vertical-align: top; text-align: right; font-weight: 800; font-size: 14px; color: #111827; width: 110px;">
            ${itemTotal > 0 ? `${currencySymbol} ${itemTotal.toFixed(2).replace('.', ',')}` : (isB2B ? 'A Faturar' : 'A Consultar')}
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Comanda A4 - ${clientName} - #${order.id.slice(-6).toUpperCase()}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #111827;
              background-color: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 13px;
              line-height: 1.4;
            }
            .a4-container {
              width: 100%;
              max-width: 180mm;
              margin: 0 auto;
            }
            .header-bar {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #111827;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .brand-title {
              font-size: 22px;
              font-weight: 900;
              color: #111827;
              letter-spacing: -0.5px;
              margin: 0;
            }
            .order-badge {
              display: inline-block;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 3px 8px;
              border-radius: 4px;
              margin-top: 4px;
            }
            .badge-retail {
              background-color: #f3f4f6;
              color: #374151;
            }
            .badge-b2b {
              background-color: #dbeafe;
              color: #1e40af;
              border: 1px solid #93c5fd;
            }
            .order-meta {
              text-align: right;
            }
            .order-number {
              font-size: 18px;
              font-weight: 900;
              color: #111827;
              margin: 0;
            }
            .meta-line {
              font-size: 11px;
              color: #6b7280;
              margin-top: 2px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 16px;
            }
            .info-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 10px 12px;
              background-color: #fafafa;
            }
            .info-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6b7280;
              margin-bottom: 6px;
              border-bottom: 1px solid #f0f0f0;
              padding-bottom: 3px;
            }
            .info-row {
              display: flex;
              margin-bottom: 4px;
              font-size: 12px;
            }
            .info-label {
              width: 80px;
              color: #6b7280;
              font-weight: 600;
              flex-shrink: 0;
            }
            .info-value {
              font-weight: 700;
              color: #111827;
            }
            .table-container {
              margin-bottom: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            thead th {
              background-color: #f3f4f6;
              border-top: 1px solid #d1d5db;
              border-bottom: 2px solid #9ca3af;
              padding: 8px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              color: #374151;
            }
            .obs-box {
              border: 1px dashed #d97706;
              background-color: #fffbeb;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 16px;
            }
            .obs-title {
              font-size: 11px;
              font-weight: 800;
              color: #b45309;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .obs-content {
              font-size: 12px;
              color: #78350f;
              font-style: italic;
            }
            .footer-grid {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 10px;
              border-top: 1px solid #e5e7eb;
              padding-top: 12px;
            }
            .summary-box {
              width: 250px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 10px 14px;
              background-color: #f9fafb;
            }
            .summary-line {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              margin-bottom: 4px;
              color: #4b5563;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              font-size: 16px;
              font-weight: 900;
              color: #111827;
              border-top: 2px solid #111827;
              padding-top: 6px;
              margin-top: 6px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="a4-container">
            <div class="header-bar">
              <div>
                <h1 class="brand-title">${settings.brandName || 'Easy Menu'}</h1>
                <span class="order-badge ${isB2B ? 'badge-b2b' : 'badge-retail'}">
                  ${isB2B ? '🏢 Pedido Corporativo (PJ)' : '🛒 Pedido Varejo (Retail)'}
                </span>
                ${isB2B && order.salesRep ? `
                  <div style="font-size: 11px; color: #4338ca; font-weight: bold; margin-top: 4px;">
                    Vendedor: ${order.salesRep} ${order.totalPackages ? `• ${order.totalPackages} Pacotes` : ''}
                  </div>
                ` : ''}
              </div>
              <div class="order-meta">
                <div class="order-number">PEDIDO #${order.id.slice(-6).toUpperCase()}</div>
                <div class="meta-line">Registrado em: ${dateStr}</div>
                <div class="meta-line">ID: ${order.id}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-card">
                <div class="info-title">👤 Informações do Cliente</div>
                <div class="info-row">
                  <span class="info-label">Nome:</span>
                  <span class="info-value">${clientName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Telefone:</span>
                  <span class="info-value">${order.phone || 'Não informado'}</span>
                </div>
                ${order.email ? `
                  <div class="info-row">
                    <span class="info-label">E-mail:</span>
                    <span class="info-value">${order.email}</span>
                  </div>
                ` : ''}
                ${order.birthday ? `
                  <div class="info-row">
                    <span class="info-label">Aniversário:</span>
                    <span class="info-value">${order.birthday}</span>
                  </div>
                ` : ''}
              </div>

              <div class="info-card">
                <div class="info-title">📍 Entrega & Agendamento</div>
                <div class="info-row">
                  <span class="info-label">Agendado:</span>
                  <span class="info-value" style="color: #b91c1c; font-size: 13px;">
                    ${order.pickupDate || 'A Combinar / Imediato'}
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Endereço:</span>
                  <span class="info-value">${order.address || 'Não especificado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Entrega:</span>
                  <span class="info-value" style="text-transform: uppercase;">${order.deliveryStatus === 'delivered' ? 'Entregue' : 'Pendente'}</span>
                </div>
              </div>
            </div>

            ${order.observation ? `
              <div class="obs-box">
                <div class="obs-title">⚠️ Observações Especiais do Pedido:</div>
                <div class="obs-content">"${order.observation}"</div>
              </div>
            ` : ''}

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">#</th>
                    <th style="text-align: left;">Item & Detalhes da Produção</th>
                    <th style="width: 60px; text-align: center;">Qtd</th>
                    <th style="width: 100px; text-align: right;">Unitário</th>
                    <th style="width: 110px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div class="footer-grid">
              <div style="font-size: 11px; color: #6b7280; max-width: 320px;">
                <p style="margin: 0 0 4px 0;"><strong>Comanda gerada para formato A4 (Epson XP-4200 / Jato de Tinta / Laser).</strong></p>
                <p style="margin: 0;">Impresso via Painel Administrativo em ${new Date().toLocaleString('pt-BR')}</p>
              </div>

              <div class="summary-box">
                ${(order.total > 0 && !isB2B) ? `
                  <div class="summary-line">
                    <span>Subtotal:</span>
                    <span>${currencySymbol} ${(order.subtotal || (order.total / 1.0875)).toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div class="summary-line">
                    <span>Sales Tax (8.75%):</span>
                    <span>+ ${currencySymbol} ${(order.taxAmount || (order.total - (order.total / 1.0875))).toFixed(2).replace('.', ',')}</span>
                  </div>
                ` : ''}
                <div class="total-line">
                  <span>TOTAL:</span>
                  <span>${currencySymbol} ${order.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isBirthdayThisWeek = (birthdayStr: string, orderLanguage?: string) => {
    if (!birthdayStr) return false;
    
    // Expected format is strictly MM/DD, but we will add a smart fallback for legacy DD/MM
    const parts = birthdayStr.split('/');
    if (parts.length < 2) return false;
    
    let month = parseInt(parts[0]) - 1; // 0-indexed month
    let day = parseInt(parts[1]);
    
    // Smart Fallback: if the first part is greater than 12, it is definitely DD/MM
    if (parseInt(parts[0]) > 12) {
      day = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
    }
    
    if (isNaN(day) || isNaN(month) || month < 0 || month > 11) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    
    // Check multiple years to handle boundary conditions safely
    const checkDates = [
      new Date(currentYear - 1, month, day),
      new Date(currentYear, month, day),
      new Date(currentYear + 1, month, day)
    ];
    
    return checkDates.some(bday => {
      const diffTime = bday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Capture birthdays from 3 days ago up to 14 days in the future (generous "Aniversários da Semana" window)
      return diffDays >= -3 && diffDays <= 14;
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(orderSearch.toLowerCase());
    
    const parseDateString = (str: string, lang?: string) => {
      if (!str || !str.includes('/')) return null;
      const parts = str.split('/');
      if (parts.length !== 3) return null;
      
      let month = parseInt(parts[0]);
      let day = parseInt(parts[1]);
      let year = parseInt(parts[2]);

      // Always treat as MM/DD/YYYY by default (USA pattern), but if the first part (month) is > 12, it is definitely DD/MM/YYYY
      if (month > 12) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
      }
      
      if (!day || !month || !year || month > 12) return null;
      const d = new Date(year, month - 1, day);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    let matchesDate = true;
    if (startDate || endDate) {
      // Try to use pickupDate first if available, otherwise use createdAt
      let orderDate: Date | null = null;
      if (order.pickupDate) {
        orderDate = parseDateString(order.pickupDate, order.orderLanguage || settings.language || 'pt');
      }
      
      if (!orderDate && order.createdAt?.toDate) {
        orderDate = order.createdAt.toDate();
        orderDate.setHours(0, 0, 0, 0);
      }

      if (orderDate) {
        if (startDate && startDate.length === 10) {
          const start = parseDateString(startDate, settings.language || 'pt');
          if (start && orderDate < start) matchesDate = false;
        }
        if (endDate && endDate.length === 10) {
          const end = parseDateString(endDate, settings.language || 'pt');
          if (end && orderDate > end) matchesDate = false;
        }
      } else {
        matchesDate = false;
      }
    }
    
    const isB2bOrder = order.isB2B === true || order.isPJ === true || String(order.isB2B) === 'true' || String(order.isPJ) === 'true' || Boolean(order.b2bCompanyName) || Boolean(order.salesRep && (order.b2bManagerName || order.totalPackages));
    const matchesTab = orderTypeTab === 'all' 
      ? true 
      : (orderTypeTab === 'b2b' ? isB2bOrder : !isB2bOrder);
    
    let matchesValidation = true;
    if (orderValidationFilter === 'validated') {
      matchesValidation = !!order.productionValidated;
    } else if (orderValidationFilter === 'pending') {
      matchesValidation = !order.productionValidated;
    }

    return matchesSearch && matchesDate && matchesTab && matchesValidation;
  }).sort((a, b) => {
    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return timeB - timeA;
  });

  const batchSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    const sidesSummary: { [key: string]: number } = {};

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.title;
        summary[key] = (summary[key] || 0) + item.quantity;

        if (item.mealOptions?.sides) {
          item.mealOptions.sides.forEach(side => {
            sidesSummary[side.name] = (sidesSummary[side.name] || 0) + item.quantity;
          });
        }
      });
    });

    return { items: summary, sides: sidesSummary };
  }, [filteredOrders]);

  const currencySymbol = settings?.currency === 'USD' ? '$' : 'R$';

  const activeOrderingCategoryId = selectedCategoryForOrdering || (categories.length > 0 ? categories[0].id : '');
  const activeOrderingCategory = categories.find(c => c.id === activeOrderingCategoryId);

  const sortedCategoryProducts = useMemo(() => {
    return products
      .filter(p => p.categoryId === activeOrderingCategoryId)
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 9999;
        const orderB = typeof b.order === 'number' ? b.order : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [products, activeOrderingCategoryId]);

  const handleStartEditProduct = (product: Product) => {
    setIsEditingProduct(product);
    setNewProduct({
      title: product.title,
      description: product.description,
      price: product.price,
      oldPrice: product.oldPrice || 0,
      priceType: product.priceType || 'fixed',
      image: product.image,
      categoryId: product.categoryId,
      isMeal: product.isMeal || false,
      isCustomCake: product.isCustomCake || false,
      ingredients: product.ingredients || '',
      allowedSides: product.allowedSides || [],
      isActive: product.isActive ?? true,
      hasSizes: product.hasSizes || false,
      sizes: product.sizes || [],
      cakeGalleryId: product.cakeGalleryId || '',
      order: product.order,
      tag: product.tag || ''
    });
    setPriceInput(product.price ? product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
    setEditingSizeId(null);
    setSizeForm({ name: '', price: '', oldPrice: '' });
    setOldPriceInput(product.oldPrice ? product.oldPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
    setActiveTab('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMoveProduct = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedCategoryProducts.length) return;

    const currentProduct = sortedCategoryProducts[index];
    const targetProduct = sortedCategoryProducts[targetIndex];

    setIsReordering(true);
    try {
      const newItems = [...sortedCategoryProducts];
      newItems[index] = targetProduct;
      newItems[targetIndex] = currentProduct;

      const updatePromises = newItems.map((prod, idx) => 
        updateDoc(doc(db, 'produtos', prod.id), { order: idx + 1 })
      );
      await Promise.all(updatePromises);
      toast.success(`"${currentProduct.title}" movido para #${targetIndex + 1}!`);
    } catch (error) {
      console.error('Erro ao reordenar produto:', error);
      toast.error('Erro ao salvar nova posição.');
    } finally {
      setIsReordering(false);
    }
  };

  const handleSequentialNumbering = async () => {
    if (sortedCategoryProducts.length === 0) return;
    setIsReordering(true);
    try {
      const updatePromises = sortedCategoryProducts.map((prod, idx) => 
        updateDoc(doc(db, 'produtos', prod.id), { order: idx + 1 })
      );
      await Promise.all(updatePromises);
      toast.success('Numeração sequencial (1, 2, 3...) aplicada com sucesso!');
    } catch (error) {
      console.error('Erro ao aplicar numeração sequencial:', error);
      toast.error('Erro ao salvar nova numeração.');
    } finally {
      setIsReordering(false);
    }
  };

  const handleAlphabeticalSort = async () => {
    if (sortedCategoryProducts.length === 0) return;
    setIsReordering(true);
    try {
      const alphabeticalItems = [...sortedCategoryProducts].sort((a, b) => 
        (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' })
      );
      const updatePromises = alphabeticalItems.map((prod, idx) => 
        updateDoc(doc(db, 'produtos', prod.id), { order: idx + 1 })
      );
      await Promise.all(updatePromises);
      toast.success('Pratos reordenados em ordem alfabética (A-Z)!');
    } catch (error) {
      console.error('Erro ao ordenar A-Z:', error);
      toast.error('Erro ao ordenar em ordem alfabética.');
    } finally {
      setIsReordering(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-grow flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-3xl w-full max-w-md shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="h-24 w-24 flex items-center justify-center mb-4 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
              <img src={settings?.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-2xl font-serif font-bold opacity-90">Painel adm - Easy menu</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Senha de acesso"
              className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 outline-none"
              style={{ '--tw-ring-color': settings?.primaryColor || '#865d39' } as any}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button 
              type="submit"
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all"
              style={{ 
                backgroundColor: settings?.primaryColor || '#865d39',
                color: getContrastText(settings?.primaryColor || '#865d39')
              }}
            >
              Entrar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col md:flex-row md:h-screen md:overflow-hidden text-gray-900 admin-area">
      <div className="w-full md:w-64 glass border-r border-white/20 p-4 md:p-6 flex flex-col gap-4 md:gap-8 md:overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 flex items-center justify-center rounded-full overflow-hidden border border-white/50 bg-white shadow-sm">
            <img src={settings?.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <span className="font-serif font-bold text-lg text-gray-900" style={{ color: '#111827' }}>{settings?.brandName || 'Easy Plate Menu'}</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'orders' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'orders' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <History size={20} /> Histórico de Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'customers' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'customers' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <Users size={20} /> Clientes
          </button>
          <button 
            onClick={() => setActiveTab('representatives')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'representatives' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'representatives' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <Briefcase size={20} /> Vendedores & Comissões
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'categories' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'categories' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <Layers size={20} /> Categorias
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'menu' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'menu' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <Package size={20} /> Gerenciar Cardápio
          </button>
          <button 
            onClick={() => setActiveTab('orderMenu')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'orderMenu' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'orderMenu' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <ArrowUpDown size={20} /> Ordenar Cardápio
          </button>
          <button 
            onClick={() => setActiveTab('sides')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'sides' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'sides' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <Plus size={20} /> Acompanhamentos
          </button>
          <button 
            onClick={() => setActiveTab('cakeOptions')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'cakeOptions' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'cakeOptions' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <Cake size={20} /> Opções de Bolos
          </button>
          <button 
            onClick={() => setActiveTab('galleries')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'galleries' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'galleries' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <ImageIcon size={20} /> Galerias de Imagem
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold",
              activeTab === 'settings' ? "shadow-lg font-bold" : "hover:bg-white/30 text-black"
            )}
            style={activeTab === 'settings' ? { backgroundColor: settings?.primaryColor || '#865d39', color: getContrastText(settings?.primaryColor || '#865d39') } : {}}
          >
            <SettingsIcon size={20} /> Configurações
          </button>
        </nav>

        <button 
          onClick={() => {
            setIsLoggedIn(false);
            setIsAdmin(false);
            window.history.pushState({}, '', '/');
          }}
          className="mt-auto flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 transition-all font-bold"
        >
          <LogOut size={20} /> Sair
        </button>
      </div>

      <main className="flex-grow p-4 md:p-10 overflow-y-auto min-w-0 w-full">
        {activeTab === 'galleries' && (
          <div className="max-w-5xl space-y-8 pb-10">
            <div className="flex items-center justify-between border-b border-gray-200/50 pb-4">
              <div>
                <h1 className="text-3xl font-serif font-black" style={{ color: settings.primaryColor || '#865d39' }}>Galerias de Imagem</h1>
                <p className="text-sm text-black font-semibold opacity-100" style={{ color: '#000000' }}>Crie e gerencie até 6 galerias com 6 fotos cada para exibir como referências de estilo para bolos personalizados.</p>
              </div>
              <div>
                <button
                  type="button"
                  disabled={galleries.length >= 6}
                  onClick={async () => {
                    if (galleries.length >= 6) {
                      toast.error("O limite é de no máximo 6 galerias!");
                      return;
                    }
                    try {
                      await addDoc(collection(db, "galerias"), {
                        name: `Galeria ${galleries.length + 1}`,
                        images: ["", "", "", "", "", ""]
                      });
                      toast.success("Galeria criada com sucesso!");
                    } catch (e) {
                      toast.error("Erro ao criar galeria.");
                    }
                  }}
                className={cn(
                    "flex items-center gap-1.5 py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow border-0",
                    galleries.length >= 6 ? "bg-gray-400 text-white cursor-not-allowed" : "hover:scale-[1.02] cursor-pointer"
                  )}
                  style={galleries.length >= 6 ? {} : { 
                    backgroundColor: settings.primaryColor || '#865d39',
                    color: getContrastText(settings.primaryColor || '#865d39')
                  }}
                >
                  <Plus size={16} /> Criar Nova Galeria ({galleries.length}/6)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {galleries.map((gallery) => (
                <div key={gallery.id} className="glass p-6 rounded-3xl space-y-4 relative flex flex-col justify-between">
                  <div>
                    {/* Gallery Title Input and Delete Button */}
                    <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3 mb-2">
                      <input
                        type="text"
                        value={gallery.name}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await updateDoc(doc(db, "galerias", gallery.id), {
                            name: val
                          });
                        }}
                        className="font-serif font-black text-lg bg-transparent border-b border-transparent hover:border-black/20 focus:border-black/50 focus:outline-none transition-all w-3/4 pb-0.5 text-black"
                        placeholder="Nome da Galeria"
                      />
                      {galleryIdToDelete === gallery.id ? (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await deleteDoc(doc(db, "galerias", gallery.id));
                                toast.success("Galeria removida com sucesso!");
                                setGalleryIdToDelete(null);
                              } catch (e) {
                                toast.error("Erro ao remover galeria.");
                              }
                            }}
                            className="px-2 py-1 text-xs text-white rounded-lg font-bold transition-all border-0 cursor-pointer shadow-sm"
                            style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGalleryIdToDelete(null);
                            }}
                            className="px-2 py-1 text-xs text-black bg-gray-200 hover:bg-gray-300 rounded-lg font-bold transition-all border-0 cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setGalleryIdToDelete(gallery.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors font-medium border-0 cursor-pointer"
                          title="Excluir Galeria"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Image uploads grid - 6 separate slots */}
                    <div className="bg-white/60 border border-white/30 rounded-2xl p-3 mt-2 shadow-sm">
                      <p className="text-[11px] font-bold text-gray-950 leading-relaxed text-center">
                        Gerencie as 6 imagens da galeria de forma independente abaixo. Clique em um espaço para fazer upload ou apague para remover.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3.5 mt-3">
                      {[0, 1, 2, 3, 4, 5].map((index) => {
                        const currentImg = gallery.images?.[index] || "";
                        return (
                          <div key={index} className="flex flex-col items-center gap-1.5">
                            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/40 border border-black/10 flex items-center justify-center group shadow-sm">
                              {currentImg ? (
                                <>
                                  <img
                                    src={currentImg}
                                    alt={`Slot ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1.5 p-1">
                                    {/* Edit Upload */}
                                    <label className="p-1.5 bg-white text-gray-800 rounded-full cursor-pointer hover:scale-105 shadow hover:text-black">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          handleFileChange(e, async (b64) => {
                                            const updatedImages = [...(gallery.images || ["", "", "", "", "", ""])];
                                            updatedImages[index] = b64;
                                            await updateDoc(doc(db, "galerias", gallery.id), {
                                              images: updatedImages
                                            });
                                            toast.success(`Foto ${index + 1} alterada com sucesso!`);
                                          }, true);
                                        }}
                                      />
                                      <Edit2 size={12} />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const updatedImages = [...(gallery.images || ["", "", "", "", "", ""])];
                                        updatedImages[index] = "";
                                        await updateDoc(doc(db, "galerias", gallery.id), {
                                          images: updatedImages
                                        });
                                        toast.success(`Foto ${index + 1} removida!`);
                                      }}
                                      className="p-1.5 bg-red-500 text-white rounded-full hover:scale-105 shadow border-0 cursor-pointer"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-white/50 transition-colors p-2 text-center text-gray-500 hover:text-black select-none">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      handleFileChange(e, async (b64) => {
                                        const updatedImages = [...(gallery.images || ["", "", "", "", "", ""])];
                                        updatedImages[index] = b64;
                                        await updateDoc(doc(db, "galerias", gallery.id), {
                                          images: updatedImages
                                        });
                                        toast.success(`Foto ${index + 1} adicionada com sucesso!`);
                                      }, true);
                                    }}
                                  />
                                  <Plus size={16} className="text-gray-400" />
                                  <span className="text-[9px] font-black uppercase tracking-wider mt-1 opacity-60">Enviar</span>
                                </label>
                              )}
                            </div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/60">Foto {index + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {galleries.length === 0 && (
                <div className="md:col-span-2 glass p-10 rounded-3xl text-center space-y-3">
                  <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <ImageIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-lg text-black">Nenhuma galeria criada</h3>
                    <p className="text-xs font-semibold text-gray-500 max-w-sm mx-auto leading-normal">Comece criando uma nova galeria de fotos separadas acima e vincule-a nos seus bolos personalizados!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cakeOptions' && (
          <div className="max-w-4xl space-y-8 pb-10">
            <div className="flex items-center justify-between border-b border-gray-200/50 pb-4">
              <div>
                <h1 className="text-3xl font-serif font-black" style={{ color: settings.primaryColor || '#865d39' }}>Opções de Bolos</h1>
                <p className="text-sm text-black font-semibold opacity-100" style={{ color: '#000000' }}>Gerencie tamanhos, massas, recheios, coberturas e toppers que poderão ser customizados pelo cliente.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TAMANHOS */}
              <div className="glass p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Tamanhos / Fatias / Peso</h3>
                  <button 
                    onClick={() => addCakeOptionItem('cakeSizes', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeSizes || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhum tamanho adicionado.</p>
                  ) : (
                    (settings.cakeSizes || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text"
                          value={item}
                          placeholder="Ex: 7 inches - 20 fatias - 1,5 kg"
                          onChange={(e) => updateCakeOptionItem('cakeSizes', idx, e.target.value)}
                          className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                        />
                        <button 
                          onClick={() => removeCakeOptionItem('cakeSizes', idx)}
                          className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MASSAS */}
              <div className="glass p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Tipos de Massa</h3>
                  <button 
                    onClick={() => addCakeOptionItem('cakeDoughs', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeDoughs || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhuma massa adicionada.</p>
                  ) : (
                    (settings.cakeDoughs || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text"
                          value={item}
                          placeholder="Ex: Chocolate, Branca, Mesclado"
                          onChange={(e) => updateCakeOptionItem('cakeDoughs', idx, e.target.value)}
                          className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                        />
                        <button 
                          onClick={() => removeCakeOptionItem('cakeDoughs', idx)}
                          className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RECHEIOS */}
              <div className="glass p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <div className="space-y-1">
                    <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Recheios</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-black font-extrabold" style={{ color: '#000000' }}>Máximo de opções:</span>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        value={settings.cakeFillingsMax || 2}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setSettings(prev => ({ ...prev, cakeFillingsMax: val }));
                        }}
                        className="w-16 bg-white/60 border border-gray-200 py-1 px-2 rounded-lg text-sm text-center font-bold"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => addCakeOptionItem('cakeFillings', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeFillings || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhum recheio adicionado.</p>
                  ) : (
                    (settings.cakeFillings || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text"
                          value={item}
                          placeholder="Ex: Chocolate, Morango, Cereja, Abacaxi"
                          onChange={(e) => updateCakeOptionItem('cakeFillings', idx, e.target.value)}
                          className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                        />
                        <button 
                          onClick={() => removeCakeOptionItem('cakeFillings', idx)}
                          className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* COBERTURAS */}
              <div className="glass p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Coberturas</h3>
                  <button 
                    onClick={() => addCakeOptionItem('cakeToppings', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeToppings || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhuma cobertura adicionada.</p>
                  ) : (
                    (settings.cakeToppings || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text"
                          value={item}
                          placeholder="Ex: Chocolate, Chantilly"
                          onChange={(e) => updateCakeOptionItem('cakeToppings', idx, e.target.value)}
                          className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                        />
                        <button 
                          onClick={() => removeCakeOptionItem('cakeToppings', idx)}
                          className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TOPO DO BOLO */}
              <div className="glass p-6 rounded-3xl space-y-4 md:col-span-2">
                <div className="flex justify-between items-center pb-2 border-b border-black/10">
                  <h3 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#000000]" style={{ color: '#000000' }}>Topo do Bolo (Topper)</h3>
                  <button 
                    onClick={() => addCakeOptionItem('cakeToppers', '')}
                    className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-62 overflow-y-auto pr-1">
                  {(settings.cakeToppers || []).length === 0 ? (
                    <p className="text-xs text-black font-semibold italic py-2" style={{ color: '#000000' }}>Nenhum topo de bolo adicionado.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(settings.cakeToppers || []).map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input 
                            type="text"
                            value={item}
                            placeholder="Ex: Flores, Topper"
                            onChange={(e) => updateCakeOptionItem('cakeToppers', idx, e.target.value)}
                            className="flex-grow bg-white/60 border border-gray-200 py-2.5 px-4 rounded-xl text-sm"
                          />
                          <button 
                            onClick={() => removeCakeOptionItem('cakeToppers', idx)}
                            className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:scale-95 transition-transform"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-4 font-extrabold rounded-2xl shadow-xl transition-all active:scale-[0.98] select-none hover:shadow-2xl cursor-pointer disabled:opacity-50"
                style={{ 
                  backgroundColor: settings.primaryColor || '#865d39',
                  color: getContrastText(settings.primaryColor || '#865d39')
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Salvar Opções de Bolos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8 pb-10">
            <h2 className="text-3xl font-serif font-bold">Configure seu app</h2>
            
            <div className="glass p-6 rounded-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">faça o upload do seu logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white p-1 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      <img src={settings?.logo} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="file" 
                        id="logo-upload"
                        accept="image/*"
                        onChange={e => handleFileChange(e, (b64) => setSettings({...settings, logo: b64}))}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <label 
                          htmlFor="logo-upload"
                          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 transition-colors text-black"
                        >
                          Selecionar Imagem
                        </label>
                        <button
                          type="button"
                          onClick={() => setSettings({...settings, logo: 'https://i.ibb.co/SXRBhD32/dende.png'})}
                          className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                        >
                          Remover Logo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor Primária</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={settings?.primaryColor || '#865d39'}
                      onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                      className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50"
                      value={settings?.primaryColor || ''}
                      onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor do Efeito Glass</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={settings?.glassColor?.startsWith('#') ? settings.glassColor : '#ffffff'}
                      onChange={e => setSettings(prev => ({...prev, glassColor: e.target.value}))}
                      className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50"
                      value={settings?.glassColor || ''}
                      onChange={e => setSettings(prev => ({...prev, glassColor: e.target.value}))}
                      placeholder="Ex: rgba(255, 255, 255, 0.4)"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor da Fonte (Textos)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={settings?.textColor || '#000000'}
                      onChange={e => setSettings({...settings, textColor: e.target.value})}
                      className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50 text-black"
                      value={settings?.textColor || ''}
                      onChange={e => setSettings({...settings, textColor: e.target.value})}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor dos Itens (Nome, Detalhes e Preço)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={settings?.itemElementsColor || settings?.primaryColor || '#865d39'}
                      onChange={e => setSettings({...settings, itemElementsColor: e.target.value})}
                      className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50 text-black"
                      value={settings?.itemElementsColor || ''}
                      onChange={e => setSettings({...settings, itemElementsColor: e.target.value})}
                      placeholder={settings?.primaryColor || "#865d39"}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium block">
                    Define a cor do nome do produto, do link "Ver Detalhes" e do preço nos cards do cliente.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Slogan do App</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.slogan || ''}
                    onChange={e => setSettings({...settings, slogan: e.target.value})}
                    placeholder="Ex: O sabor que você merece..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Mensagem Final WhatsApp</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.whatsappClosingMessage || ''}
                    onChange={e => setSettings({...settings, whatsappClosingMessage: e.target.value})}
                    placeholder="Ex: Obrigada pelo pedido..."
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 my-6 pt-6">
                <h3 className="text-base font-extrabold uppercase tracking-wide text-gray-800 mb-4 flex items-center gap-2">
                  💼 Configurações do Menu CONTRACT (B2B / Corporativo)
                </h3>
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold uppercase text-gray-700">Ativar Canal de Pedidos Corporativos / Wholesales B2B</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings?.b2bActive === true}
                      onChange={e => setSettings({...settings, b2bActive: e.target.checked})}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 block">Nome/Texto do Botão Corporativo (Ex: CORPORATE & WHOLESALE ORDERS)</label>
                  <input 
                    type="text"
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs font-semibold"
                    value={settings?.b2bButtonText || ''}
                    onChange={e => setSettings({...settings, b2bButtonText: e.target.value})}
                    placeholder="CONTRACT & WHOLESALE ORDERS"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 block">Slogan / Texto de Cabeçalho Corporativo B2B (Em Inglês para o Cliente)</label>
                  <textarea 
                    rows={3}
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs font-semibold resize-y"
                    value={settings?.b2bSlogan || ''}
                    onChange={e => setSettings({...settings, b2bSlogan: e.target.value})}
                    placeholder="E.g., Build your corporate order by adding items below. Prices are not shown because we offer highly progressive wholesale discounts scaled by volume!"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 block">Título do Banner Informativo no Carrinho B2B (Português)</label>
                  <input 
                    type="text"
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs font-semibold"
                    value={settings?.b2bBannerTitle || ''}
                    onChange={e => setSettings({...settings, b2bBannerTitle: e.target.value})}
                    placeholder="MODO ORÇAMENTO CORPORATIVO PJ Activo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 block">Texto / Descrição do Banner Informativo no Carrinho B2B (Português)</label>
                  <textarea 
                    rows={3}
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs font-semibold resize-y"
                    value={settings?.b2bBannerText || ''}
                    onChange={e => setSettings({...settings, b2bBannerText: e.target.value})}
                    placeholder="Seus itens do cardápio foram adicionados para cotação! Na próxima etapa, preencha os dados da sua empresa. Os descontos de atacado serão calculados com base no volume selecionado."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 block">Título do Price Details B2B (Popup de Detalhes - Inglês)</label>
                  <input 
                    type="text"
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs font-semibold"
                    value={settings?.b2bPriceDetailsTitle || ''}
                    onChange={e => setSettings({...settings, b2bPriceDetailsTitle: e.target.value})}
                    placeholder="Wholesale Price upon consultation"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500 block">Texto do Price Details B2B (Popup de Detalhes - Inglês)</label>
                  <textarea 
                    rows={3}
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs font-semibold resize-y"
                    value={settings?.b2bPriceDetailsText || ''}
                    onChange={e => setSettings({...settings, b2bPriceDetailsText: e.target.value})}
                    placeholder="Minimum orders apply. Add items to list to request our tiered custom progressive wholesale catalog."
                  />
                </div>
              </div>
            </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase opacity-60">Imagem de Fundo do App</label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {settings?.backgroundImage ? (
                        <img 
                          key={settings.backgroundImage}
                          src={settings.backgroundImage} 
                          alt="Background Preview" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Sem fundo</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="file" 
                        id="bg-upload"
                        accept="image/*"
                        onChange={e => handleFileChange(e, (b64) => setSettings(prev => ({...prev, backgroundImage: b64})))}
                        className="hidden"
                      />
                      <label 
                        htmlFor="bg-upload"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 transition-colors text-black"
                      >
                        Fazer Upload
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-40">Ou cole o link da imagem direta</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 text-sm"
                      value={settings?.backgroundImage?.startsWith('data:image/') ? '' : (settings?.backgroundImage || '')}
                      onChange={e => setSettings(prev => ({...prev, backgroundImage: e.target.value}))}
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Nome da Marca</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.brandName || ''}
                    onChange={e => handleBrandNameChange(e.target.value)}
                    placeholder="Ex: Easy Plate Menu"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Slug da Loja (URL)</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50"
                    value={settings?.slug || ''}
                    onChange={e => setSettings({...settings, slug: slugify(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">WhatsApp</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select 
                      className="p-3 rounded-xl border border-gray-300 bg-white font-bold w-full sm:w-auto"
                      value={settings?.whatsappCountryCode || '+55'}
                      onChange={e => setSettings({...settings, whatsappCountryCode: e.target.value})}
                    >
                      <option value="+55">+55 (BR)</option>
                      <option value="+1">+1 (US)</option>
                    </select>
                    <input 
                      type="text" 
                      className="flex-grow p-3 rounded-xl border border-gray-300 w-full"
                      value={settings?.whatsappNumber || ''}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        const countryCode = settings?.whatsappCountryCode || '+55';
                        
                        if (countryCode === '+55') {
                          if (val.length > 11) val = val.slice(0, 11);
                          if (val.length > 7) val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                          else if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                        } else {
                          if (val.length > 10) val = val.slice(0, 10);
                          if (val.length > 6) val = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                          else if (val.length > 3) val = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                        }
                        
                        setSettings({...settings, whatsappNumber: val});
                      }}
                      placeholder={settings?.whatsappCountryCode === '+1' ? '(999) 999-9999' : '(99) 99999-9999'}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Senha do Painel Adm</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.adminPassword || ''}
                    onChange={e => setSettings({...settings, adminPassword: e.target.value})}
                    placeholder="admin123"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-xl font-serif font-bold">Idioma e Checkout</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Título do Checkout (Abaixo de "Detalhes do Pedido")</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={settings?.checkoutTitle || ''}
                    onChange={e => setSettings({...settings, checkoutTitle: e.target.value})}
                    placeholder="Ex: Ficamos muito felizes com seu pedido!..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 p-4 bg-white/50 rounded-2xl border border-gray-100">
                    <label className="text-xs font-bold uppercase opacity-60">Bloco Informativo 1</label>
                    <input 
                      type="text" 
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm font-bold"
                      value={settings?.infoBlock1Title || ''}
                      onChange={e => setSettings({...settings, infoBlock1Title: e.target.value})}
                      placeholder="Título (Ex: CONFIRMAÇÃO DO PEDIDO)"
                    />
                    <textarea 
                      rows={3}
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm"
                      value={settings?.infoBlock1Text || ''}
                      onChange={e => setSettings({...settings, infoBlock1Text: e.target.value})}
                      placeholder="Texto informativo..."
                    />
                  </div>
                  <div className="space-y-3 p-4 bg-white/50 rounded-2xl border border-gray-100">
                    <label className="text-xs font-bold uppercase opacity-60">Bloco Informativo 2</label>
                    <input 
                      type="text" 
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm font-bold"
                      value={settings?.infoBlock2Title || ''}
                      onChange={e => setSettings({...settings, infoBlock2Title: e.target.value})}
                      placeholder="Título (Ex: RETIRADA NO LOCAL)"
                    />
                    <textarea 
                      rows={3}
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm"
                      value={settings?.infoBlock2Text || ''}
                      onChange={e => setSettings({...settings, infoBlock2Text: e.target.value})}
                      placeholder="Texto informativo..."
                    />
                  </div>
                </div>
              </div>

              {/* CONFIGURAÇÃO DA TELA DE BOAS VINDAS (TELA 1) */}
              <div className="glass p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-lg text-black">Tela de Boas-Vindas (Apresentação)</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings?.introEnabled !== false}
                      onChange={e => setSettings({...settings, introEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-xs font-bold uppercase opacity-65 text-black">Ativada</span>
                  </label>
                </div>
                
                {settings?.introEnabled !== false && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-50 text-black">Título Principal</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                          value={settings?.introTitle || ''}
                          onChange={e => setSettings({...settings, introTitle: e.target.value})}
                          placeholder="Ex: Dendê Foods"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-50 text-black">Texto do Botão</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                          value={settings?.introButtonText || ''}
                          onChange={e => setSettings({...settings, introButtonText: e.target.value})}
                          placeholder="Ex: INICIAR OPERAÇÃO"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-50 text-black">Subtítulo Prato/Frase Cursiva</label>
                      <input 
                        type="text" 
                        className="w-full p-2.5 rounded-xl border border-gray-300 text-sm font-medium bg-white"
                        value={settings?.introSubtitle || ''}
                        onChange={e => setSettings({...settings, introSubtitle: e.target.value})}
                        placeholder="Ex: From sacred nature to your plate"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-50 text-black">Texto de Apresentação (Pequeno)</label>
                      <textarea 
                        rows={2}
                        className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                        value={settings?.introDescription || ''}
                        onChange={e => setSettings({...settings, introDescription: e.target.value})}
                        placeholder="Ex: Descrição sobre o propósito do restaurante..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-50 text-black">Texto Inferior (Rodapé)</label>
                      <input 
                        type="text" 
                        className="w-full p-2.5 rounded-xl border border-gray-300 text-sm font-mono bg-white"
                        value={settings?.introBottomText || ''}
                        onChange={e => setSettings({...settings, introBottomText: e.target.value})}
                        placeholder="Ex: 100% ARTESANAL & AFRO-BRASILEIRO"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CONFIGURAÇÃO DO SELETOR DE CATÁLOGOS (TELA 2) */}
              <div className="glass p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-lg text-black">Seletor de Catálogos / Multi-Menu</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings?.selectorEnabled !== false}
                      onChange={e => setSettings({...settings, selectorEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-xs font-bold uppercase opacity-65 text-black">Ativado</span>
                  </label>
                </div>

                {settings?.selectorEnabled !== false && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-50 text-black">Título Superior</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                          value={settings?.selectorTitle || ''}
                          onChange={e => setSettings({...settings, selectorTitle: e.target.value})}
                          placeholder="Ex: Dendê Foods"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-50 text-black">Subtítulo Informativo</label>
                        <input 
                          type="text" 
                          className="w-full p-2.5 rounded-xl border border-gray-300 text-sm bg-white"
                          value={settings?.selectorSubtitle || ''}
                          onChange={e => setSettings({...settings, selectorSubtitle: e.target.value})}
                          placeholder="Ex: Escolha sua experiência"
                        />
                      </div>
                    </div>

                    {/* Configuração do Catálogo 1 */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                        <span className="text-xs font-extrabold uppercase text-gray-600">Item do Catálogo 1 (Esquerda)</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings?.catalog1Active !== false}
                            onChange={e => setSettings({...settings, catalog1Active: e.target.checked})}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Nome do Catálogo 1</label>
                            <input 
                              type="text" 
                              className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white"
                              value={settings?.catalog1Title || ''}
                              onChange={e => setSettings({...settings, catalog1Title: e.target.value})}
                              placeholder="Ex: Pratos Executivos"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Descrição/Resumo do Catálogo 1 (Abaixo da imagem)</label>
                            <input 
                              type="text" 
                              className="w-full p-2 rounded-lg border border-gray-300 text-xs bg-white text-black"
                              value={settings?.catalog1Desc || ''}
                              onChange={e => setSettings({...settings, catalog1Desc: e.target.value})}
                              placeholder="Ex: Almoços saudáveis e pratos"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Slogan do Catálogo 1 (Mostrado no cabeçalho do menu)</label>
                            <textarea 
                              rows={3}
                              className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white text-black font-medium resize-y"
                              value={settings?.catalog1Slogan || ''}
                              onChange={e => setSettings({...settings, catalog1Slogan: e.target.value})}
                              placeholder="Ex: Coleque cada frase em uma linha para que fiquem bem formatadas de forma legível!"
                            />
                          </div>
                        </div>
                        <div className="space-y flex flex-col items-center">
                          <label className="text-[9px] font-bold uppercase opacity-50 self-start text-gray-500">Imagem de Capa</label>
                          <div className="w-full h-20 rounded-lg bg-white border border-gray-300 flex items-center justify-center overflow-hidden mb-1 shadow-sm relative">
                            {settings?.catalog1Image ? (
                              <img src={settings.catalog1Image} alt="Cover 1" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] text-gray-400">Sem Imagem</span>
                            )}
                          </div>
                          <input 
                            type="file" 
                            id="catalog1-upload"
                            accept="image/*"
                            onChange={e => handleFileChange(e, (b64) => setSettings({...settings, catalog1Image: b64}))}
                            className="hidden"
                          />
                          <label 
                            htmlFor="catalog1-upload"
                            className="px-2 py-1 bg-white border border-gray-300 rounded text-[9px] font-bold cursor-pointer hover:bg-gray-50 text-black text-center w-full"
                          >
                            Selecionar
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Configuração do Catálogo 2 */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                        <span className="text-xs font-extrabold uppercase text-gray-600">Item do Catálogo 2 (Direita)</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                              className="sr-only peer" 
                              checked={settings?.catalog2Active !== false}
                              onChange={e => setSettings({...settings, catalog2Active: e.target.checked})}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 space-y-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Nome do Catálogo 2</label>
                              <input 
                                type="text" 
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs font-bold bg-white"
                                value={settings?.catalog2Title || ''}
                                onChange={e => setSettings({...settings, catalog2Title: e.target.value})}
                                placeholder="Ex: Bebidas & Sobremesas"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Descrição/Resumo do Catálogo 2 (Abaixo da imagem)</label>
                              <input 
                                type="text" 
                                className="w-full p-2 rounded-lg border border-gray-300 text-xs bg-white text-black"
                                value={settings?.catalog2Desc || ''}
                                onChange={e => setSettings({...settings, catalog2Desc: e.target.value})}
                                placeholder="Ex: Sucos refrescantes, bolos e doces"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase opacity-50 text-gray-500">Slogan do Catálogo 2 (Mostrado no cabeçalho do menu)</label>
                              <textarea 
                                rows={3}
                                className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white text-black font-medium resize-y"
                                value={settings?.catalog2Slogan || ''}
                                onChange={e => setSettings({...settings, catalog2Slogan: e.target.value})}
                                placeholder="Ex: Coloques cada frase em uma linha para que fiquem bem formatadas de forma legível!"
                              />
                            </div>
                          </div>
                          <div className="space-y flex flex-col items-center">
                            <label className="text-[9px] font-bold uppercase opacity-50 self-start text-gray-500">Imagem de Capa</label>
                            <div className="w-full h-20 rounded-lg bg-white border border-gray-300 flex items-center justify-center overflow-hidden mb-1 shadow-sm relative">
                              {settings?.catalog2Image ? (
                                <img src={settings.catalog2Image} alt="Cover 2" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-gray-400">Sem Imagem</span>
                              )}
                            </div>
                            <input 
                              type="file" 
                              id="catalog2-upload"
                              accept="image/*"
                              onChange={e => handleFileChange(e, (b64) => setSettings({...settings, catalog2Image: b64}))}
                              className="hidden"
                            />
                            <label 
                              htmlFor="catalog2-upload"
                              className="px-2 py-1 bg-white border border-gray-300 rounded text-[9px] font-bold cursor-pointer hover:bg-gray-50 text-black text-center w-full"
                            >
                              Selecionar
                            </label>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              <div className="bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-6 border border-stone-200 shadow-md">
                <div className="space-y-1">
                  <h3 className="text-2xl font-serif font-black text-stone-900">Seu Cardápio Digital está Online!</h3>
                  <p className="text-sm font-semibold text-stone-600">Compartilhe o link ou o QR Code abaixo com seus clientes:</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex-grow w-full bg-stone-50 p-4 rounded-2xl font-mono text-xs sm:text-sm font-bold break-all border-2 border-stone-200 text-stone-900 shadow-inner select-all">
                        {`${window.location.origin}/?slug=${settings?.slug || 'easy-cake-menu'}`}
                      </div>
                      <button 
                        onClick={copyLink}
                        className="w-full sm:w-auto px-6 py-4 rounded-2xl font-black transition-all uppercase tracking-wider text-xs active:scale-95 text-center cursor-pointer shadow-sm text-white bg-stone-900 hover:bg-black whitespace-nowrap flex-shrink-0"
                      >
                        {copied ? '✓ COPIADO!' : 'COPIAR LINK'}
                      </button>
                    </div>

                    <div className="text-xs space-y-2.5 leading-relaxed text-stone-700 font-medium bg-amber-50/70 p-4 rounded-2xl border border-amber-200/70">
                      <p>💡 <strong className="text-stone-900 font-bold">Dica de Sucesso:</strong> Imprima o QR Code e coloque-o nas suas mesas, no balcão de atendimento ou nas embalagens de entrega para que os clientes acessem seu cardápio instantaneamente!</p>
                      <p>📸 Você também pode publicá-lo nos Stories do Instagram, enviar no WhatsApp ou colocar no link da sua bio.</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="p-3 bg-white rounded-xl shadow-md">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/?slug=${settings?.slug || 'easy-cake-menu'}`)}`}
                        alt="QR Code do Cardápio" 
                        className="w-32 h-32 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const appLink = `${window.location.origin}/?slug=${settings?.slug || 'easy-cake-menu'}`;
                          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(appLink)}`;
                          const response = await fetch(qrUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `qrcode-cardapio-${settings?.slug || 'menu'}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                          toast.success('QR Code baixado com sucesso!');
                        } catch (error) {
                          console.error('Error downloading QR code:', error);
                          const appLink = `${window.location.origin}/?slug=${settings?.slug || 'easy-cake-menu'}`;
                          window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(appLink)}`, '_blank');
                        }
                      }}
                      className="w-full py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 cursor-pointer text-black shadow-sm"
                      style={{ backgroundColor: '#efedea', color: '#000000' }}
                    >
                      <Download size={14} className="text-black" />
                      <span className="text-black">Baixar QR Code</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 items-center">
                <button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg disabled:opacity-50"
                  style={{ 
                    backgroundColor: settings?.primaryColor || '#865d39',
                    color: getContrastText(settings?.primaryColor || '#865d39')
                  }}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Salvar Alterações
                </button>
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold shadow-sm border border-green-200"
                    >
                      <CheckCircle2 size={18} /> Salvo com sucesso!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sides' && (
          <div className="max-w-4xl space-y-8">
            <h2 className="text-3xl font-serif font-bold">Gerenciar Acompanhamentos</h2>
            
            <form onSubmit={handleAddSide} className="glass p-6 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Nome da Customização</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Troca por Quinoa"
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black"
                    value={newSide.name || ''}
                    onChange={e => setNewSide({...newSide, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Tipo de Customização</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white font-bold text-gray-700"
                    value={newSide.type || 'side'}
                    onChange={e => setNewSide({...newSide, type: e.target.value as 'side' | 'swap'})}
                  >
                    <option value="side">Acompanhamento (Normal)</option>
                    <option value="swap">Troca (Swap)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Preço Adicional ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold opacity-40">{currencySymbol}</span>
                    <input 
                      type="text" 
                      className="w-full p-3 pl-10 rounded-xl border border-gray-300 bg-white text-black"
                      value={sidePriceInput}
                      onChange={e => handleSidePriceChange(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  style={{ 
                    backgroundColor: settings?.primaryColor || '#865d39',
                    color: getContrastText(settings?.primaryColor || '#865d39')
                  }}
                >
                  {isEditingSide ? <Save size={20} /> : <Plus size={20} />}
                  {isEditingSide ? 'Salvar' : 'Adicionar'}
                </button>
                {isEditingSide && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditingSide(null);
                      setNewSide({ name: '', price: 0, type: 'side' });
                      setSidePriceInput('');
                    }}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gray-200 font-bold cursor-pointer text-black"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sides.map(side => (
                <div key={side.id} className="glass p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-bold text-black text-base">{side.name}</div>
                      <span className={cn(
                        "text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border",
                        side.type === 'swap' 
                          ? "bg-amber-100 text-amber-800 border-amber-200" 
                          : "bg-blue-100 text-blue-800 border-blue-200"
                      )}>
                        {side.type === 'swap' ? 'Troca (Swap)' : 'Acompanhamento'}
                      </span>
                    </div>
                    <div className="text-sm opacity-70 text-black font-semibold mt-0.5">{currencySymbol} {side.price.toFixed(2).replace('.', ',')}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditingSide(side);
                        setNewSide(side);
                        setSidePriceInput(side.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                      }}
                      className="p-2.5 text-blue-700 bg-blue-50/95 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      title="Editar acompanhamento"
                    >
                      <Edit2 size={17} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => deleteSide(side.id)}
                      className="p-2.5 text-red-700 bg-red-50/95 hover:bg-red-100 border border-red-200 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      title="Excluir acompanhamento"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {activeTab === 'categories' && (
          <div className="max-w-2xl space-y-8">
            <h2 className="text-3xl font-serif font-bold">Gerenciar Categorias</h2>
            
            <form onSubmit={handleAddCategory} className="glass p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  placeholder="Nome da categoria (Ex: Pratos Executivos)"
                  className="flex-grow p-3 rounded-xl border border-gray-300 w-full"
                  value={newCategory.title || ''}
                  onChange={e => setNewCategory({...newCategory, title: e.target.value})}
                />
                <select
                  className="p-3 rounded-xl border border-gray-300 bg-white font-bold text-gray-700 sm:w-56"
                  value={newCategory.catalog || 'both'}
                  onChange={e => setNewCategory({...newCategory, catalog: e.target.value as any})}
                >
                  <option value="both">Ambos os Catálogos</option>
                  <option value="catalog1">Apenas no {settings?.catalog1Title || 'Catálogo 1'}</option>
                  <option value="catalog2">Apenas no {settings?.catalog2Title || 'Catálogo 2'}</option>
                  <option value="catalog_b2b">{settings?.b2bButtonText || 'Corporativo / PJ (B2B)'}</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  type="submit"
                  className="px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  style={{ 
                    backgroundColor: settings?.primaryColor || '#865d39',
                    color: getContrastText(settings?.primaryColor || '#865d39')
                  }}
                >
                  {isEditingCategory ? <Save size={20} /> : <Plus size={20} />}
                  {isEditingCategory ? 'Salvar' : 'Adicionar'}
                </button>
                {isEditingCategory && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditingCategory(null);
                      setNewCategory({ title: '', order: 0, catalog: 'both' });
                    }}
                    className="px-6 py-3 rounded-xl bg-gray-200 font-bold cursor-pointer text-black"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              {categories.map((cat, idx) => (
                <motion.div 
                  layout
                  key={cat.id} 
                  className="glass p-4 rounded-xl flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => moveCategory(cat.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:bg-white/50 rounded disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        onClick={() => moveCategory(cat.id, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-1 hover:bg-white/50 rounded disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="font-bold text-lg text-black">{cat.title}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/10 text-black/60 w-max">
                        {cat.catalog === 'catalog1' 
                          ? (settings?.catalog1Title || 'Catálogo 1') 
                          : cat.catalog === 'catalog2' 
                            ? (settings?.catalog2Title || 'Catálogo 2') 
                            : cat.catalog === 'catalog_b2b' || cat.catalog === 'b2b'
                              ? (settings?.b2bButtonText || 'Corporativo / PJ (B2B)')
                              : 'Varejo (Ambos)'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditingCategory(cat);
                        setNewCategory({ title: cat.title, order: cat.order || 0, catalog: (cat.catalog || 'both') as any });
                      }}
                      className="p-2.5 text-blue-700 bg-blue-50/95 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      title="Editar categoria"
                    >
                      <Edit2 size={17} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => deleteCategory(cat.id)}
                      className="p-2.5 text-red-700 bg-red-50/95 hover:bg-red-100 border border-red-200 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      title="Excluir categoria"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-serif font-bold">Gerenciar Cardápio</h2>
            </div>

            <form onSubmit={handleAddProduct} className="glass p-8 rounded-2xl space-y-6 text-black">
              <h3 className="text-xl font-serif font-bold text-gray-900">{isEditingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Título do Produto</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white"
                      value={newProduct.title || ''}
                      onChange={e => setNewProduct({...newProduct, title: e.target.value})}
                      placeholder="Ex: Prato Executivo de Frango"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Descrição</label>
                    <textarea 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white"
                      rows={3}
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      placeholder="Detalhes do produto..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Selo / Tag em Destaque (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white"
                      value={newProduct.tag || ''}
                      onChange={e => setNewProduct({...newProduct, tag: e.target.value})}
                      placeholder="Ex: COMBO 5 MARMITAS, Mais Vendido, Fit..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Preço Original (De) ({currencySymbol})</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold opacity-50 text-gray-600">{currencySymbol}</span>
                        <input 
                          type="text" 
                          className="w-full p-3 pl-10 rounded-xl border border-gray-300 bg-white"
                          value={oldPriceInput}
                          onChange={e => handleOldPriceChange(e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Preço Promocional (Por) ({currencySymbol})</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold opacity-50 text-gray-600">{currencySymbol}</span>
                        <input 
                          type="text" 
                          className="w-full p-3 pl-10 rounded-xl border border-gray-300 bg-white"
                          value={priceInput}
                          onChange={e => handlePriceChange(e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Categoria</label>
                    {categories.length === 0 ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-black">
                        <p className="text-xs text-red-700 font-bold leading-relaxed">
                          ⚠️ Nenhuma categoria cadastrada. Crie uma abaixo para poder cadastrar produtos:
                        </p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Ex: Hambúrgueres, Bebidas..." 
                            className="flex-grow p-2 text-xs rounded-lg border border-red-300 bg-white text-black"
                            id="quick-category-input"
                          />
                          <button 
                            type="button" 
                            onClick={async () => {
                              const input = document.getElementById('quick-category-input') as HTMLInputElement;
                              if (!input || !input.value.trim()) {
                                toast.error('Digite o nome da categoria.');
                                return;
                              }
                              const title = input.value.trim();
                              try {
                                await addDoc(collection(db, 'categorias'), {
                                  title,
                                  order: 0,
                                  catalog: 'both'
                                });
                                toast.success('Categoria adicionada com sucesso!');
                              } catch (err) {
                                toast.error('Erro ao adicionar categoria.');
                              }
                            }}
                            className="px-3 py-2 bg-[#865d39] text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-1"
                          >
                            <Plus size={12} /> Criar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select 
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-black font-sans"
                        value={newProduct.categoryId}
                        onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})}
                      >
                        <option value="">Selecionar categoria...</option>
                        {categories.map(cat => {
                          const catName = cat.catalog === 'catalog1' 
                            ? (settings?.catalog1Title || 'Catálogo 1') 
                            : cat.catalog === 'catalog2' 
                              ? (settings?.catalog2Title || 'Catálogo 2') 
                              : cat.catalog === 'catalog_b2b' || cat.catalog === 'b2b'
                                ? (settings?.b2bButtonText || 'Corporativo PJ')
                                : 'Ambos os Cardápios';
                          return (
                            <option key={cat.id} value={cat.id}>
                              {cat.title} — ({catName})
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-gray-700 opacity-90">Imagem do Produto</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                        {newProduct.image ? (
                          <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="text-gray-300" size={32} />
                        )}
                      </div>
                      <input 
                        type="file" 
                        id="product-image"
                        accept="image/*"
                        onChange={e => handleFileChange(e, (b64) => setNewProduct({...newProduct, image: b64}))}
                        className="hidden"
                      />
                      <label 
                        htmlFor="product-image"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 transition-colors text-black font-sans"
                      >
                        Selecionar Imagem
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 p-4 bg-white/50 rounded-2xl border border-gray-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-gray-300"
                        checked={newProduct.isMeal}
                        onChange={e => setNewProduct({...newProduct, isMeal: e.target.checked, isCustomCake: false})}
                      />
                      <span className="font-bold text-sm text-gray-800">Habilitar Opções de Personalização (Marmitas)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-gray-300"
                        checked={newProduct.isCustomCake || false}
                        onChange={e => setNewProduct({...newProduct, isCustomCake: e.target.checked, isMeal: false})}
                      />
                      <span className="font-bold text-sm text-gray-800">Bolo Personalizado (Bolo de Festa)</span>
                    </label>

                    {newProduct.isCustomCake && (
                      <div className="space-y-4 pl-8 pt-1">
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[10px] font-bold uppercase opacity-60 text-black">Vincular Galeria de Estilos (Opcional)</label>
                          <select
                            value={newProduct.cakeGalleryId || ''}
                            onChange={e => setNewProduct({...newProduct, cakeGalleryId: e.target.value})}
                            className="p-2.5 rounded-xl border border-gray-300 text-sm font-bold bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-sm cursor-pointer"
                          >
                            <option value="">Nenhuma galeria vinculada</option>
                            {galleries.map(gal => (
                              <option key={gal.id} value={gal.id}>{gal.name}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-gray-500 font-semibold leading-normal mt-0.5">
                            Escolha uma galeria de fotos para o cliente selecionar uma imagem como referência da decoração do bolo no menu.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {newProduct.isMeal && (
                      <div className="space-y-4 pl-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase opacity-60">Itens para Exclusão (Separados por vírgula)</label>
                          <input 
                            type="text" 
                            className="w-full p-2 rounded-lg border border-gray-300 text-sm"
                            value={newProduct.ingredients || ''}
                            onChange={e => setNewProduct({...newProduct, ingredients: e.target.value})}
                            placeholder="Ex: Cebola, Alho, Pimenta"
                          />
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase opacity-60">Acompanhamentos Permitidos</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {sides.filter(s => s.type !== 'swap').map(side => (
                                <label key={side.id} className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={newProduct.allowedSides?.includes(side.id)}
                                    onChange={e => {
                                      const current = newProduct.allowedSides || [];
                                      if (e.target.checked) {
                                        setNewProduct({...newProduct, allowedSides: [...current, side.id]});
                                      } else {
                                        setNewProduct({...newProduct, allowedSides: current.filter(id => id !== side.id)});
                                      }
                                    }}
                                  />
                                  <span className="text-xs text-black">{side.name}</span>
                                </label>
                              ))}
                              {sides.filter(s => s.type !== 'swap').length === 0 && (
                                <span className="text-xs opacity-40">Nenhum cadastrado</span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase opacity-60 text-amber-800">Opções de Troca Permitidas (Swap)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {sides.filter(s => s.type === 'swap').map(side => (
                                <label key={side.id} className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={newProduct.allowedSides?.includes(side.id)}
                                    onChange={e => {
                                      const current = newProduct.allowedSides || [];
                                      if (e.target.checked) {
                                        setNewProduct({...newProduct, allowedSides: [...current, side.id]});
                                      } else {
                                        setNewProduct({...newProduct, allowedSides: current.filter(id => id !== side.id)});
                                      }
                                    }}
                                  />
                                  <span className="text-xs text-black">{side.name}</span>
                                </label>
                              ))}
                              {sides.filter(s => s.type === 'swap').length === 0 && (
                                <span className="text-xs opacity-40">Nenhuma cadastrada</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-3 cursor-pointer mt-3 pt-3 border-t border-gray-200">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-gray-300"
                        checked={!!newProduct.hasSizes}
                        onChange={e => {
                          const checked = e.target.checked;
                          setNewProduct({
                            ...newProduct,
                            hasSizes: checked,
                            sizes: newProduct.sizes || []
                          });
                        }}
                      />
                      <span className="font-bold text-sm text-gray-800">Habilitar Múltiplos Tamanhos, Quantidades ou Preços (Variações)</span>
                    </label>

                    {newProduct.hasSizes && (
                      <div className="space-y-4 pl-8 mt-2 text-black">
                        <div className="bg-white/40 p-4 rounded-xl border border-gray-200 space-y-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900 opacity-95">Adicionar Tamanho/Preço</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase text-gray-700 opacity-90">Nome da Opção</label>
                              <input 
                                type="text"
                                placeholder="Ex: Pequeno / 10 Pessoas"
                                className="w-full p-2 text-xs rounded-lg border border-gray-300 bg-white text-black font-sans"
                                value={sizeForm.name}
                                onChange={e => setSizeForm({ ...sizeForm, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase text-gray-700 opacity-90">Preço ({currencySymbol})</label>
                              <input 
                                type="text"
                                placeholder="0,00"
                                className="w-full p-2 text-xs rounded-lg border border-gray-300 bg-white text-black font-sans"
                                value={sizeForm.price}
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  if (!digits) {
                                    setSizeForm({ ...sizeForm, price: '' });
                                    return;
                                  }
                                  const val = parseInt(digits) / 100;
                                  setSizeForm({ ...sizeForm, price: val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) });
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleAddSizeOption}
                              className="flex-grow py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              {editingSizeId ? (
                                <>
                                  <Save size={14} /> Salvar Alterações
                                </>
                              ) : (
                                <>
                                  <Plus size={14} /> Adicionar Opção de Tamanho
                                </>
                              )}
                            </button>
                            {editingSizeId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSizeId(null);
                                  setSizeForm({ name: '', price: '', oldPrice: '' });
                                }}
                                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* List of defined sizes */}
                        <div className="space-y-2">
                          {(newProduct.sizes || []).map((size, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3.5 bg-white/60 rounded-xl border border-gray-200">
                              <div>
                                <span className="font-bold text-xs text-black block">{size.name}</span>
                                <span className="text-[10px] text-gray-700 font-mono">
                                  Preço: {size.price && size.price > 0 ? `${currencySymbol} ${size.price.toFixed(2).replace('.', ',')}` : 'Sob Consulta (Sem valor)'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSizeId(size.id);
                                    setSizeForm({
                                      name: size.name,
                                      price: (size.price && size.price > 0) ? size.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
                                      oldPrice: ''
                                    });
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingSizeId === size.id) {
                                      setEditingSizeId(null);
                                      setSizeForm({ name: '', price: '', oldPrice: '' });
                                    }
                                    setNewProduct({
                                      ...newProduct,
                                      sizes: (newProduct.sizes || []).filter((_, sIdx) => sIdx !== idx)
                                    });
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {(newProduct.sizes || []).length === 0 && (
                            <div className="text-center p-4 bg-gray-50/20 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500">
                              Nenhum tamanho adicionado ainda. É necessário adicionar pelo menos 1 tamanho.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: settings?.primaryColor || '#865d39',
                    color: getContrastText(settings?.primaryColor || '#865d39')
                  }}
                >
                  {isEditingProduct ? <Save size={20} /> : <Plus size={20} />}
                  {isEditingProduct ? 'Salvar Alterações' : 'Adicionar ao Cardápio'}
                </button>
                {isEditingProduct && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditingProduct(null);
                      setNewProduct({ 
                        title: '', description: '', price: 0, oldPrice: 0, priceType: 'fixed',
                        image: '', categoryId: '', isMeal: true, isCustomCake: false, ingredients: '', allowedSides: [], isActive: true,
                        hasSizes: false, sizes: []
                      });
                      setPriceInput('');
                      setOldPriceInput('');
                      setEditingSizeId(null);
                      setSizeForm({ name: '', price: '', oldPrice: '' });
                    }}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gray-200 font-bold text-black cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <motion.div 
                  layout
                  key={product.id} 
                  className={cn(
                    "glass rounded-2xl overflow-hidden flex flex-col border transition-all",
                    product.isActive === false ? "opacity-50 grayscale" : "border-white/20"
                  )}
                >
                  <div className="h-48 relative">
                    <img src={product.image} alt={product.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button 
                        onClick={() => toggleProductStatus(product)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-gray-700 hover:text-black"
                        title={product.isActive === false ? "Ativar" : "Desativar"}
                      >
                        {product.isActive === false ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button 
                        onClick={() => handleStartEditProduct(product)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-blue-600"
                        title="Editar Produto"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 flex-grow flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-serif font-bold text-lg">{product.title}</h4>
                      <div className="flex flex-col items-end">
                        {product.sizes && product.sizes.length > 0 ? (
                          <>
                            <span className="text-[10px] font-bold uppercase opacity-40">Tamanhos múltiplos</span>
                            <span className="font-bold text-blue-600">
                              A partir de: {currencySymbol} {Math.min(...product.sizes.map(s => s.price)).toFixed(2).replace('.', ',')}
                            </span>
                          </>
                        ) : (
                          <>
                            {product.price > 0 && product.oldPrice && product.oldPrice > 0 && (
                              <span className="text-xs line-through opacity-40">
                                {currencySymbol} {product.oldPrice.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                            <span className="font-bold text-blue-600">
                              {currencySymbol} {(product.price > 0 ? product.price : (product.oldPrice || 0)).toFixed(2).replace('.', ',')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm opacity-60 line-clamp-2">{product.description}</p>
                    
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="bg-black/5 p-2 rounded-xl text-[11px] space-y-1 mt-2">
                        <span className="font-bold opacity-60">Tamanhos:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {product.sizes.map((s, idx) => (
                            <span key={idx} className="bg-white/70 px-2 py-0.5 rounded border border-black/5 font-medium text-black">
                              {s.name} ({currencySymbol} {s.price.toFixed(2).replace('.', ',')})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-black/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                        {categories.find(c => c.id === product.categoryId)?.title || 'Sem categoria'}
                      </span>
                      <div className="flex gap-1.5">
                        {product.isMeal && (
                          <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase">
                            Opções de Personalização
                          </span>
                        )}
                        {product.sizes && product.sizes.length > 0 && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase">
                            Múltiplos Tamanhos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orderMenu' && (
          <div className="space-y-6">
            {/* Top Page Header */}
            <div className="glass p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/40 shadow-sm text-black">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-100/90 border border-black/5 flex items-center justify-center shrink-0 shadow-inner">
                  <ArrowUpDown className="text-gray-700" size={26} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 leading-tight">
                    Ordenar Cardápio
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">
                    Defina a sequência exata em que os pratos e combos aparecerão para os clientes no cardápio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start md:self-auto shrink-0"
              >
                <Package size={17} className="text-gray-600" />
                Ir para Cadastro de Pratos
              </button>
            </div>

            {/* 1. Escolha a Categoria para Reordenar */}
            <div className="glass p-6 rounded-3xl space-y-4 border border-white/40 shadow-sm text-black">
              <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
                  <Layers size={16} className="text-gray-500" />
                  <span>1. ESCOLHA A CATEGORIA PARA REORDENAR</span>
                </div>
                <span className="text-xs text-gray-500 font-semibold">
                  {categories.length} categoria(s) cadastradas
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {categories.length === 0 ? (
                  <div className="text-xs text-gray-500 italic py-2">
                    Nenhuma categoria cadastrada. Cadastre categorias na aba "Categorias".
                  </div>
                ) : (
                  categories.map(cat => {
                    const isSelected = activeOrderingCategoryId === cat.id;
                    const count = products.filter(p => p.categoryId === cat.id).length;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryForOrdering(cat.id)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer",
                          isSelected
                            ? "bg-stone-800 text-white shadow-md font-bold scale-[1.02]"
                            : "bg-white/80 hover:bg-white text-gray-800 border border-gray-200/80 shadow-xs hover:border-gray-400"
                        )}
                      >
                        <span>{cat.title}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[11px] font-bold",
                          isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                        )}>
                          {count} {count === 1 ? 'item' : 'itens'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Category Header & Instant Order Actions */}
            {activeOrderingCategory && (
              <div className="glass p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/40 shadow-sm text-black">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gray-200/80 text-gray-800 font-serif font-bold text-xl flex items-center justify-center shrink-0 shadow-inner">
                    {(activeOrderingCategory.title || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900">
                        {activeOrderingCategory.title}
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        {sortedCategoryProducts.filter(p => p.isActive !== false).length} pratos ativos
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Use as setas para alterar a posição ou reordenar instantaneamente.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-stretch sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={handleSequentialNumbering}
                    disabled={isReordering || sortedCategoryProducts.length === 0}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Aplica sequência automática 1, 2, 3..."
                  >
                    <ListOrdered size={16} className="text-gray-600" />
                    <span>Numerar Sequencial</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAlphabeticalSort}
                    disabled={isReordering || sortedCategoryProducts.length === 0}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Organiza de A a Z por ordem alfabética"
                  >
                    <Sparkles size={16} className="text-amber-500" />
                    <span>Ordem A-Z</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Products in Category */}
            <div className="space-y-3">
              {sortedCategoryProducts.length === 0 ? (
                <div className="glass p-12 rounded-3xl text-center space-y-4 border border-white/30 text-black">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                    <Package size={32} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-800">
                      Nenhum prato cadastrado nesta categoria
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                      Adicione novos pratos a esta categoria para organizá-los e ordená-los aqui.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProduct(prev => ({ ...prev, categoryId: activeOrderingCategoryId }));
                      setActiveTab('menu');
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:brightness-110 transition-all cursor-pointer text-white"
                    style={{ backgroundColor: settings?.primaryColor || '#865d39' }}
                  >
                    Cadastrar Prato Nesta Categoria
                  </button>
                </div>
              ) : (
                sortedCategoryProducts.map((product, index) => {
                  const isFirst = index === 0;
                  const isLast = index === sortedCategoryProducts.length - 1;

                  return (
                    <motion.div
                      layout
                      key={product.id}
                      className={cn(
                        "glass p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 sm:gap-4 shadow-sm hover:shadow-md text-black",
                        product.isActive === false ? "opacity-60 bg-gray-50/60 border-gray-300" : "border-white/50"
                      )}
                    >
                      {/* Left: Reorder Arrows & Number Badge */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveProduct(index, 'up')}
                            disabled={isFirst || isReordering}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                            title="Subir posição"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveProduct(index, 'down')}
                            disabled={isLast || isReordering}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                            title="Descer posição"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        {/* Order Number Badge */}
                        <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-mono font-bold text-xs sm:text-sm text-gray-700 shadow-inner">
                          #{index + 1}
                        </div>
                      </div>

                      {/* Product Thumbnail */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 shadow-xs relative">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package size={22} />
                          </div>
                        )}
                        {product.isActive === false && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white uppercase bg-red-600/80 px-1 rounded">
                              Inativo
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Middle: Details */}
                      <div className="flex-grow min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-gray-900 truncate">
                            {product.title}
                          </h4>
                          {product.tag ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                              🏷️ {product.tag}
                            </span>
                          ) : product.isMeal ? (
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 border border-orange-200 text-orange-800 text-[10px] font-bold uppercase tracking-wider">
                              Marmita
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs text-gray-600 line-clamp-1">
                          {product.description || 'Sem descrição'}
                        </p>

                        <div className="font-bold text-xs sm:text-sm text-gray-900 pt-0.5">
                          {product.hasSizes && product.sizes && product.sizes.length > 0 ? (
                            <span>A partir de: {currencySymbol} {Math.min(...product.sizes.map(s => s.price)).toFixed(2).replace('.', ',')}</span>
                          ) : (
                            <span>{currencySymbol} {(product.price > 0 ? product.price : (product.oldPrice || 0)).toFixed(2).replace('.', ',')}</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Quick secondary arrows & Edit button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex flex-col text-gray-400 opacity-60">
                          <ArrowUp size={12} className={isFirst ? "opacity-20" : ""} />
                          <ArrowDown size={12} className={isLast ? "opacity-20" : ""} />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartEditProduct(product)}
                          className="p-2 sm:p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 text-gray-600 transition-colors shadow-xs cursor-pointer"
                          title="Editar prato"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-3xl font-serif font-bold">Histórico de Pedidos</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="MM/DD/AAAA"
                    className="pl-10 p-2 rounded-xl border border-gray-300 text-sm w-32"
                    value={startDate}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 8) val = val.slice(0, 8);
                      if (val.length > 4) val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
                      else if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      setStartDate(val);
                    }}
                  />
                </div>
                <span className="text-gray-400">até</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="MM/DD/AAAA"
                    className="pl-10 p-2 rounded-xl border border-gray-300 text-sm w-32"
                    value={endDate}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 8) val = val.slice(0, 8);
                      if (val.length > 4) val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
                      else if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      setEndDate(val);
                    }}
                  />
                </div>
                <button 
                  onClick={() => {
                    setShowBatchSummary(false);
                    setStartDate('');
                    setEndDate('');
                    setOrderValidationFilter('all');
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer",
                    (!startDate && !endDate && !showBatchSummary && orderValidationFilter === 'all') 
                      ? "bg-gray-800 text-white shadow-md" 
                      : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <History size={18} /> Todos os Pedidos
                </button>

                <button 
                  onClick={() => {
                    setOrderValidationFilter(orderValidationFilter === 'validated' ? 'all' : 'validated');
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer border",
                    orderValidationFilter === 'validated'
                      ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                      : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  )}
                >
                  <Rocket size={18} />
                  <span>Pedidos Validados</span>
                  <span className="ml-1 px-2 py-0.5 text-[10px] bg-white/20 rounded-full font-black">
                    {orders.filter(o => o.productionValidated).length}
                  </span>
                </button>

                <button 
                  onClick={() => {
                    if (!startDate || !endDate) {
                      toast.error('Por favor, selecione um intervalo de datas primeiro.');
                      return;
                    }
                    setShowBatchSummary(!showBatchSummary);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer",
                    showBatchSummary ? "bg-blue-600 text-white shadow-md" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Layers size={18} /> Resumo de Produção
                </button>
                {showBatchSummary ? (
                  <button 
                    onClick={printProductionSummary}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-md cursor-pointer"
                  >
                    <Printer size={18} /> Imprimir Resumo
                  </button>
                ) : (
                  <button 
                    onClick={printOrdersList}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-md cursor-pointer"
                  >
                    <Printer size={18} /> Imprimir Lista
                  </button>
                )}
              </div>
            </div>

            {/* View Mode Switcher + Retail/B2B Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Retail vs Corporate PJ */}
              <div className="flex bg-gray-200/50 p-1 rounded-2xl w-full max-w-lg transition-all">
                <button
                  onClick={() => setOrderTypeTab('retail')}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    orderTypeTab === 'retail' 
                      ? "bg-white text-black shadow-md border-b border-gray-300/40" 
                      : "text-gray-500 hover:text-black"
                  )}
                >
                  🛒 Varejo
                </button>
                <button
                  onClick={() => setOrderTypeTab('b2b')}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    orderTypeTab === 'b2b' 
                      ? "bg-white text-black shadow-md border-b border-gray-300/40" 
                      : "text-gray-500 hover:text-black"
                  )}
                >
                  🏢 Corporativo (PJ)
                </button>
                <button
                  onClick={() => setOrderTypeTab('all')}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    orderTypeTab === 'all' 
                      ? "bg-white text-black shadow-md border-b border-gray-300/40" 
                      : "text-gray-500 hover:text-black"
                  )}
                >
                  🌐 Todos
                </button>
              </div>

              {/* View Mode Toggle: Calendar vs Traditional List */}
              <div className="flex bg-gray-200/70 p-1 rounded-2xl shadow-inner w-fit self-end">
                <button
                  onClick={() => setOrderViewMode('calendar')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                    orderViewMode === 'calendar'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Calendar size={15} />
                  <span>Calendário / Cronograma</span>
                </button>
                <button
                  onClick={() => setOrderViewMode('list')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                    orderViewMode === 'list'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Package size={15} />
                  <span>Lista Tradicional ({filteredOrders.length})</span>
                </button>
              </div>
            </div>

            {/* CALENDAR VIEW MODE */}
            {orderViewMode === 'calendar' && !showBatchSummary && (
              <OrdersCalendar 
                orders={filteredOrders}
                settings={settings}
                onPrintOrder={printOrder}
                onSwitchToList={(orderId) => {
                  setOrderViewMode('list');
                  if (orderId) {
                    setExpandedOrders(prev => prev.includes(orderId) ? prev : [...prev, orderId]);
                    setTimeout(() => {
                      document.getElementById('order-' + orderId)?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }
                }}
              />
            )}

            {/* TRADITIONAL LIST VIEW OR BATCH SUMMARY */}
            {(orderViewMode === 'list' || showBatchSummary) && (
              <>
                <div className="glass p-4 rounded-2xl">
                  <input 
                    type="text" 
                    placeholder={orderTypeTab === 'b2b' ? "Buscar por nome fantasia ou contato..." : "Buscar por nome do cliente..."}
                    className="w-full p-3 rounded-xl border border-gray-300"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                  />
                </div>

                {showBatchSummary ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="glass p-6 rounded-2xl space-y-4">
                      <h3 className="text-xl font-serif font-bold flex items-center gap-2">
                        <Package size={20} className="text-blue-600" />
                        Total de Itens
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(batchSummary.items).length > 0 ? (
                          Object.entries(batchSummary.items).map(([title, qty]) => (
                            <div key={title} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/20">
                              <span className="font-bold">{title}</span>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">{qty}x</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-center opacity-40 py-4">Nenhum item no período</p>
                        )}
                      </div>
                    </div>

                    <div className="glass p-6 rounded-2xl space-y-4">
                      <h3 className="text-xl font-serif font-bold flex items-center gap-2">
                        <Plus size={20} className="text-green-600" />
                        Total de Acompanhamentos
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(batchSummary.sides).length > 0 ? (
                          Object.entries(batchSummary.sides).map(([name, qty]) => (
                            <div key={name} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/20">
                              <span className="font-bold">{name}</span>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">{qty}x</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-center opacity-40 py-4">Nenhum acompanhamento no período</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map(order => (
                    <motion.div 
                      layout
                      key={order.id} 
                      id={`order-${order.id}`}
                      className="glass p-6 rounded-2xl space-y-4 border border-white/20"
                    >
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-xl font-serif font-bold">
                              {order.isB2B || order.isPJ 
                                ? (order.b2bCompanyName || order.customerName)
                                : order.customerName
                              }
                            </h3>
                            {order.productionValidated && (
                              <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-md flex items-center gap-1 uppercase tracking-wider shadow-xs">
                                <Rocket size={11} /> Produção
                              </span>
                            )}
                            {order.paymentStatus === 'paid_full' ? (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Pago 100%
                              </span>
                            ) : order.paymentStatus === '50_deposit' ? (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md flex items-center gap-1 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 50% Sinal
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md flex items-center gap-1 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Não Pago
                              </span>
                            )}
                            {(order.isB2B || order.isPJ) && (
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full flex items-center gap-1 border border-amber-200 uppercase tracking-widest">
                                ★ Corporate PJ {order.totalPackages ? `(${order.totalPackages} pkgs)` : ''}
                              </span>
                            )}
                            {order.salesRep && (
                              <span className="px-3 py-1 bg-purple-100 text-purple-900 text-xs font-bold rounded-full flex items-center gap-1 border border-purple-200">
                                <Briefcase size={12} className="text-purple-700" /> Vendedor: {order.salesRep}
                                {order.total > 0 && ` (Comissão: ${currencySymbol}${(order.total * 0.10).toFixed(2)})`}
                                {order.commissionStatus === 'paid' ? (
                                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full font-black ml-1">Paga</span>
                                ) : (
                                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full font-black ml-1">Pendente</span>
                                )}
                              </span>
                            )}
                            {isBirthdayThisWeek(order.birthday, order.orderLanguage) && (
                              <span className="px-3 py-1 bg-pink-100 text-pink-600 text-xs font-bold rounded-full flex items-center gap-1">
                                <Cake size={12} /> Aniversariante! ({order.birthday})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm opacity-60">
                            <a 
                              href={`https://wa.me/${order.phone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-green-600 transition-colors font-bold text-black"
                            >
                              <MessageCircle size={14} className="text-green-600" /> {order.phone}
                            </a>
                            <span className="flex items-center gap-1"><Calendar size={14} /> Criado em: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('en-US') : 'N/A'}</span>
                            {order.pickupDate && (
                              <span 
                                className="flex items-center gap-1.5 font-black px-3 py-1 rounded-xl shadow-sm text-xs"
                                style={{ 
                                  backgroundColor: settings?.primaryColor || '#865d39',
                                  color: getContrastText(settings?.primaryColor || '#865d39')
                                }}
                              >
                                🚚 Agendado para: {order.pickupDate}
                              </span>
                            )}
                          </div>

                          {/* Real-time quick toggle bar on list card */}
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const nextVal = !order.productionValidated;
                                try {
                                  await updateDoc(doc(db, 'pedidos', order.id), { productionValidated: nextVal });
                                  toast.success(nextVal ? '🚀 Pedido validado para produção!' : 'Pedido desvalidado da produção.');
                                } catch (err) {
                                  toast.error('Erro ao atualizar validação.');
                                }
                              }}
                              className={cn(
                                "px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
                                order.productionValidated
                                  ? "bg-blue-600 text-white shadow-blue-200"
                                  : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200"
                              )}
                            >
                              <Rocket size={13} />
                              {order.productionValidated ? 'VALIDADO PRODUÇÃO' : 'VALIDAR PRODUÇÃO'}
                            </button>

                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const isDelivered = order.deliveryStatus === 'delivered' || !!order.isDelivered;
                                const nextDelivered = !isDelivered;
                                try {
                                  await updateDoc(doc(db, 'pedidos', order.id), {
                                    deliveryStatus: nextDelivered ? 'delivered' : 'pending',
                                    isDelivered: nextDelivered,
                                    deliveredAt: nextDelivered ? new Date() : null
                                  });
                                  toast.success(nextDelivered ? '✅ Pedido marcado como ENTREGUE!' : 'Status de entrega pendente.');
                                } catch (err) {
                                  toast.error('Erro ao alterar status de entrega.');
                                }
                              }}
                              className={cn(
                                "px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
                                (order.deliveryStatus === 'delivered' || order.isDelivered)
                                  ? "bg-emerald-600 text-white shadow-emerald-200"
                                  : "bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200"
                              )}
                            >
                              <Truck size={13} />
                              {(order.deliveryStatus === 'delivered' || order.isDelivered) ? 'ENTREGUE' : 'MARCAR ENTREGUE'}
                            </button>

                            <div className="flex items-center gap-1 bg-white/80 border border-gray-200 p-0.5 rounded-xl shadow-xs">
                              <span className="text-[9px] font-extrabold uppercase px-1 text-gray-400">Pagamento:</span>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await updateDoc(doc(db, 'pedidos', order.id), { paymentStatus: 'not_paid' });
                                  toast.success('Status: Não Pago');
                                }}
                                className={cn(
                                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                                  (!order.paymentStatus || order.paymentStatus === 'not_paid')
                                    ? "bg-rose-600 text-white"
                                    : "text-gray-600 hover:bg-gray-100"
                                )}
                              >
                                Não Pago
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await updateDoc(doc(db, 'pedidos', order.id), { paymentStatus: '50_deposit' });
                                  toast.success('Status: 50% Sinal');
                                }}
                                className={cn(
                                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                                  order.paymentStatus === '50_deposit'
                                    ? "bg-amber-600 text-white"
                                    : "text-gray-600 hover:bg-gray-100"
                                )}
                              >
                                50% Sinal
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await updateDoc(doc(db, 'pedidos', order.id), { paymentStatus: 'paid_full' });
                                  toast.success('Status: Pago 100%');
                                }}
                                className={cn(
                                  "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                                  order.paymentStatus === 'paid_full'
                                    ? "bg-emerald-600 text-white"
                                    : "text-gray-600 hover:bg-gray-100"
                                )}
                              >
                                Pago 100%
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-4 w-full md:w-auto">
                          <div className="flex flex-wrap items-center gap-2">
                            <button 
                              onClick={() => printOrder(order)}
                              className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm cursor-pointer"
                              title="Imprimir Comanda"
                            >
                              <Printer size={20} />
                            </button>
                            <button 
                              onClick={() => {
                                setIsEditingOrder(order);
                                setEditOrderForm(order);
                              }}
                              className="p-3 bg-white border border-gray-200 rounded-xl text-blue-600 hover:bg-blue-50 shadow-sm cursor-pointer"
                            >
                              <Edit2 size={20} />
                            </button>
                            <button 
                              onClick={() => deleteOrder(order.id)}
                              className="p-3 bg-white border border-gray-200 rounded-xl text-red-600 hover:bg-red-50 shadow-sm cursor-pointer"
                            >
                              <Trash2 size={20} />
                            </button>
                            <button 
                              onClick={() => toggleOrder(order.id)}
                              className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm transition-all cursor-pointer"
                              title={expandedOrders.includes(order.id) ? "Recolher" : "Expandir"}
                            >
                              {expandedOrders.includes(order.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase opacity-40">
                              Total do Pedido
                            </div>
                            <div className="text-xl font-extrabold" style={{ color: settings?.primaryColor || '#865d39' }}>
                              {currencySymbol} {order.total.toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                        </div>
                      </div>

                  <AnimatePresence>
                    {expandedOrders.includes(order.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div className="bg-white/30 rounded-xl p-4 space-y-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start border-b border-black/5 last:border-0 pb-2 last:pb-0">
                              <div className="space-y-1">
                                <div className="font-bold">{item.quantity}x {item.title}</div>
                                {item.mealOptions && (
                                  <div className="text-xs opacity-60 space-y-1">
                                    {item.mealOptions.removals.length > 0 && (
                                      <div><span className="font-bold">Remover:</span> {item.mealOptions.removals.join(', ')}</div>
                                    )}
                                    {item.mealOptions.sides.length > 0 && (
                                      <div><span className="font-bold">Acompanhamentos:</span> {item.mealOptions.sides.map(s => s.name).join(', ')}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="font-bold opacity-60">{currencySymbol} {(item.price * item.quantity).toFixed(2).replace('.', ',')}</div>
                            </div>
                          ))}
                          
                          {order.total > 0 && !(order.isB2B || order.isPJ) && (
                            <div className="border-t border-black/10 pt-3 mt-3 space-y-1.5 text-xs text-black font-semibold">
                              <div className="flex justify-between">
                                <span className="opacity-60 font-medium">Subtotal:</span>
                                <span>{currencySymbol} {(order.subtotal || (order.total / 1.0875)).toFixed(2).replace('.', ',')}</span>
                              </div>
                              <div className="flex justify-between text-amber-900">
                                <span className="opacity-60 font-medium">Sales Tax (8.75%):</span>
                                <span>+ {currencySymbol} {(order.taxAmount || (order.total - (order.total / 1.0875))).toFixed(2).replace('.', ',')}</span>
                              </div>
                              <div className="flex justify-between text-base font-extrabold border-t border-black/5 pt-1.5" style={{ color: settings?.primaryColor || '#865d39' }}>
                                <span>Total com Tax:</span>
                                <span>{currencySymbol} {order.total.toFixed(2).replace('.', ',')}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                          <div className="space-y-1">
                            <div className="font-bold uppercase opacity-40 text-[10px]">
                              {(order.isB2B || order.isPJ) ? "Endereço Comercial / Delivery" : "Endereço de Entrega/Retirada"}
                            </div>
                            <div className="p-3 bg-white/50 rounded-lg border border-white/20 font-medium">
                              {order.b2bAddress || order.address}
                            </div>
                          </div>

                          {(order.isB2B || order.isPJ) ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <div className="font-bold uppercase opacity-40 text-[10px]">Responsável / Contato</div>
                                  <div className="p-2.5 bg-black/5 rounded-lg border border-black/10 font-bold text-black">{order.b2bManagerName || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-bold uppercase opacity-40 text-[10px]">Frequência do Plano</div>
                                  <div className="p-2.5 bg-amber-500/10 text-amber-900 rounded-lg border border-amber-500/20 font-extrabold uppercase text-xs flex items-center justify-center text-center">
                                    {order.b2bFrequency === 'weekly' ? '🔄 Weekly' : '📦 One-Time'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          <div className="space-y-1 md:col-span-2">
                            <div className="font-bold uppercase opacity-40 text-[10px]">Observações / Requisitos Especiais</div>
                            <div className="p-3 bg-white/50 rounded-lg border border-white/20 italic">
                              {order.observation || 'Nenhuma observação informada.'}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                ))}
                {filteredOrders.length === 0 && (
                  <div className="glass p-12 rounded-2xl text-center text-gray-500">
                    Nenhum pedido encontrado com os filtros aplicados.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )}

      {activeTab === 'customers' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-serif font-bold text-gray-900">Clientes</h2>
              <p className="text-sm text-gray-500 font-medium">Gerencie sua base de clientes, contatos e datas especiais</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setShowBirthdaysOnly(!showBirthdaysOnly)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-xs",
                  showBirthdaysOnly ? "bg-pink-600 text-white shadow-md" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                )}
              >
                <Cake size={18} /> Aniversários da Semana
              </button>
              <button 
                onClick={() => {
                  setNewCustomerForm({
                    name: '',
                    phone: '',
                    email: '',
                    birthday: '',
                    street: '',
                    number: '',
                    zipCode: '',
                    city: '',
                    address: '',
                    isB2B: false,
                    managerName: '',
                    frequency: 'weekly',
                    observation: ''
                  });
                  setIsAddingCustomer(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <UserPlus size={18} /> Novo Cliente
              </button>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200/90 shadow-sm">
            <input 
              type="text" 
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uniqueCustomers
              .filter(c => {
                const matchesSearch = 
                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  c.phone.includes(customerSearch) ||
                  c.email.toLowerCase().includes(customerSearch.toLowerCase());
                
                let matchesBirthday = true;
                if (showBirthdaysOnly) {
                  matchesBirthday = isBirthdayThisWeek(c.birthday, c.orderLanguage);
                }
                
                return matchesSearch && matchesBirthday;
              })
              .sort((a, b) => {
                const timeA = a.lastOrder?.toDate ? a.lastOrder.toDate().getTime() : 0;
                const timeB = b.lastOrder?.toDate ? b.lastOrder.toDate().getTime() : 0;
                return timeB - timeA;
              })
              .map((customer, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] space-y-4 relative overflow-hidden group shadow-md hover:shadow-lg transition-all border border-gray-200 text-gray-900"
                >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-grow pr-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-serif font-bold text-gray-900" style={{ color: '#111827' }}>{customer.name}</h3>
                            {customer.isB2B && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-black rounded-md border border-amber-300 uppercase tracking-wider">
                                PJ
                              </span>
                            )}
                          </div>
                          <a 
                            href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá, ${customer.name}! Tudo bem? Gostaria de falar com você sobre seu cadastro no ${settings?.brandName || 'Dendê Foods'}.`
                            )}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 transition-colors"
                          >
                            <MessageCircle size={14} className="text-green-600" />
                            <span className="text-gray-800 font-medium">{customer.phone}</span>
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button 
                            onClick={() => setViewingCustomerOrders(customer)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap cursor-pointer transition-all border border-amber-200 shadow-xs"
                            title="Ver Histórico de Pedidos"
                          >
                            {customer.totalOrders} {customer.totalOrders === 1 ? 'Pedido' : 'Pedidos'}
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditingCustomer(customer);
                              setEditCustomerForm({
                                name: customer.name,
                                phone: customer.phone,
                                email: customer.email,
                                birthday: customer.birthday,
                                address: customer.address,
                                isB2B: customer.isB2B,
                                managerName: customer.managerName,
                                street: customer.street,
                                number: customer.number,
                                zipCode: customer.zipCode,
                                city: customer.city,
                                frequency: customer.frequency
                              });
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 bg-white shadow-xs border border-gray-200 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                            title="Editar Cliente"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                  isOpen: true,
                                  title: 'Excluir Cliente',
                                  message: `Tem certeza que deseja excluir o cliente ${customer.name} e todos os seus ${customer.totalOrders} pedidos?`,
                                  onConfirm: () => deleteCustomer(customer)
                              });
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 bg-white shadow-xs border border-gray-200 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                            title="Excluir Cliente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">E-mail:</span>
                            <span className="text-gray-700 font-medium">{customer.email}</span>
                          </div>
                        )}
                        {customer.birthday && (() => {
                          const isBdayUpcoming = isBirthdayThisWeek(customer.birthday, customer.orderLanguage);
                          return (
                            <div className="space-y-2">
                              {isBdayUpcoming ? (
                                <>
                                  <div className="flex items-center gap-2 text-pink-700 font-bold">
                                    <Cake size={14} className="text-pink-600" />
                                    <span>Aniversário: {customer.birthday} (Esta semana! 🎉)</span>
                                  </div>
                                  <div className="flex flex-col gap-1.5 p-3 bg-pink-50 border border-pink-200 rounded-2xl mt-1.5">
                                    <span className="text-[10px] uppercase font-black text-pink-900 tracking-wider">
                                      🎁 Enviar Mensagem de Feliz Aniversário:
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                      <a 
                                        href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                          `Parabéns, ${customer.name}! 🎉 A equipe do ${settings?.brandName || 'Dendê Foods'} te deseja um feliz aniversário! Que o seu dia seja repleto de alegria, paz e muito sabor. Como nosso presente para comemorar seu dia, preparamos uma oferta especial com surpresa no seu próximo pedido! 🎂🎁`
                                        )}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                                      >
                                        <MessageCircle size={13} className="text-white" />
                                        <span>WhatsApp</span>
                                      </a>
                                      <a 
                                        href={`sms:${customer.phone.replace(/\D/g, '')}?&body=${encodeURIComponent(
                                          `Parabéns, ${customer.name}! 🎉 A equipe do ${settings?.brandName || 'Dendê Foods'} lhe deseja um feliz aniversário! Que seu dia de hoje seja muito especial. Temos um presente surpresa para você no próximo pedido! 🎂🎁`
                                        )}`}
                                        className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                                      >
                                        <MessageSquare size={13} className="text-white" />
                                        <span>SMS</span>
                                      </a>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900">Aniversário:</span>
                                  <span className="text-gray-700 font-medium">{customer.birthday}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {customer.address && (
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-gray-900 shrink-0">Endereço:</span>
                            <span className="line-clamp-2 text-gray-700 font-medium">{customer.address}</span>
                          </div>
                        )}
                      </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 font-medium">
                    <span>Último pedido:</span>
                    <span className="font-bold text-gray-700">
                      {customer.lastOrder?.toDate 
                        ? customer.lastOrder.toDate().toLocaleDateString('en-US') 
                        : 'N/A'}
                    </span>
                  </div>
                </motion.div>
              ))}

            {uniqueCustomers.filter(c => {
              const matchesSearch = 
                c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                c.phone.includes(customerSearch) ||
                c.email.toLowerCase().includes(customerSearch.toLowerCase());
              
              let matchesBirthday = true;
              if (showBirthdaysOnly) {
                matchesBirthday = isBirthdayThisWeek(c.birthday, c.orderLanguage);
              }
              
              return matchesSearch && matchesBirthday;
            }).length === 0 && (
              <div className="col-span-full bg-white/95 p-12 rounded-3xl text-center text-gray-500 border border-gray-200 shadow-sm">
                <Users size={40} className="mx-auto mb-3 text-gray-400" />
                <h4 className="text-base font-bold text-gray-800">Nenhum cliente encontrado</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  {customerSearch || showBirthdaysOnly 
                    ? 'Tente ajustar os filtros ou a busca acima.' 
                    : 'Cadastre seu primeiro cliente clicando no botão "+ Novo Cliente" acima.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewCustomerForm({
                      name: '',
                      phone: '',
                      email: '',
                      birthday: '',
                      street: '',
                      number: '',
                      zipCode: '',
                      city: '',
                      address: '',
                      isB2B: false,
                      managerName: '',
                      frequency: 'weekly',
                      observation: ''
                    });
                    setIsAddingCustomer(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <UserPlus size={16} /> Cadastrar Cliente
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'representatives' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border-2 border-purple-200/90 shadow-md">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-100 text-purple-900 border border-purple-200">
                  <Briefcase size={26} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-black text-gray-900">Vendedores & Comissões</h2>
                  <p className="text-sm text-gray-600 font-medium mt-0.5">Controle de pedidos corporativos, vendedores e pagamento de comissão (10%)</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-3.5 py-2 rounded-xl bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                Taxa Fixa de Comissão: 10%
              </span>
            </div>
          </div>

          {/* Cards de Métricas (100% Opacos e Nítidos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-md space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Total Vendido</span>
              <p className="text-2xl font-black text-gray-900">
                {currencySymbol}{repStats.totalSales.toFixed(2)}
              </p>
              <p className="text-xs text-gray-600 font-semibold">
                {repStats.totalOrders} pedidos ({repStats.totalPackages} pkgs total)
              </p>
            </div>

            <div className="bg-[#fffdf5] p-5 rounded-2xl border-2 border-amber-300 shadow-md space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900">Comissões Pendentes</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">A PAGAR</span>
              </div>
              <p className="text-2xl font-black text-amber-950">
                {currencySymbol}{repStats.pendingCommission.toFixed(2)}
              </p>
              <p className="text-xs text-amber-800 font-semibold">
                10% sobre pedidos já precificados
              </p>
            </div>

            <div className="bg-[#f0fdf4] p-5 rounded-2xl border-2 border-emerald-300 shadow-md space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900">Comissões Pagas</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 border border-emerald-300">QUITADO</span>
              </div>
              <p className="text-2xl font-black text-emerald-950">
                {currencySymbol}{repStats.paidCommission.toFixed(2)}
              </p>
              <p className="text-xs text-emerald-800 font-semibold">
                Total já pago aos representantes
              </p>
            </div>

            <div className="bg-[#f0f7ff] p-5 rounded-2xl border-2 border-blue-300 shadow-md space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-900">Aguardando Valor</span>
                {repStats.unpricedCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-200 text-blue-950 border border-blue-300 animate-pulse">
                    {repStats.unpricedCount} pendente{repStats.unpricedCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-blue-950">
                {repStats.unpricedCount}
              </p>
              <p className="text-xs text-blue-800 font-semibold">
                Pedidos para Jucilea inserir o valor
              </p>
            </div>
          </div>

          {/* Card: Cadastrar & Gerenciar Vendedores */}
          <div className="bg-white p-5 rounded-2xl border-2 border-purple-200 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Cadastrar & Gerenciar Vendedores</h3>
                  <p className="text-xs text-gray-600 font-medium">Adicione os vendedores da equipe para vincular aos pedidos corporativos e relatórios de comissão</p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200">
                {uniqueSalesReps.length} Vendedor{uniqueSalesReps.length === 1 ? '' : 'es'}
              </span>
            </div>

            {/* Input e botão para adicionar vendedor */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Digite o nome do novo vendedor (Ex: Lea, Jucilea, Carlos)..."
                  value={newRepNameInput}
                  onChange={e => setNewRepNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSalesRep();
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-600 outline-none text-sm font-bold text-gray-900 bg-white placeholder-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddSalesRep()}
                className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Plus size={18} /> Cadastrar Vendedor
              </button>
            </div>

            {/* Chips de Vendedores Registrados */}
            {uniqueSalesReps.length > 0 ? (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Vendedores disponíveis no sistema:</span>
                <div className="flex flex-wrap gap-2">
                  {uniqueSalesReps.map(rep => {
                    const isExplicit = (settings?.salesReps || []).includes(rep);
                    return (
                      <div 
                        key={rep}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs font-bold shadow-2xs"
                      >
                        <Briefcase size={13} className="text-purple-700" />
                        <span>{rep}</span>
                        {isExplicit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSalesRep(rep)}
                            title={`Remover ${rep} do cadastro`}
                            className="p-0.5 hover:bg-purple-200 text-purple-700 hover:text-red-700 rounded-md transition-colors cursor-pointer ml-0.5"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 font-medium italic">
                Nenhum vendedor cadastrado ainda. Digite um nome acima para cadastrar.
              </p>
            )}
          </div>

          {/* Filtros e Busca (100% Opaco com Filtro de Período) */}
          <div className="bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-md space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtro por Vendedor */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                  <Briefcase size={14} className="text-purple-700" /> Filtrar por Vendedor
                </label>
                <select 
                  className="w-full p-2.5 rounded-xl border-2 border-gray-200 font-bold text-sm bg-white text-gray-900 focus:border-purple-600 outline-none"
                  value={selectedRepFilter}
                  onChange={e => setSelectedRepFilter(e.target.value)}
                >
                  <option value="all">Todos os Vendedores ({uniqueSalesReps.length})</option>
                  {uniqueSalesReps.map(rep => (
                    <option key={rep} value={rep}>{rep}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Período de Vendas */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-700" /> Período de Vendas
                </label>
                <select 
                  className="w-full p-2.5 rounded-xl border-2 border-gray-200 font-bold text-sm bg-white text-gray-900 focus:border-blue-600 outline-none"
                  value={repPeriodFilter}
                  onChange={e => setRepPeriodFilter(e.target.value as any)}
                >
                  <option value="all">Todo o Período (Geral)</option>
                  <option value="today">Hoje</option>
                  <option value="yesterday">Ontem</option>
                  <option value="this_week">Esta Semana</option>
                  <option value="this_month">Este Mês</option>
                  <option value="last_month">Mês Passado</option>
                  <option value="custom">Data Personalizada...</option>
                </select>
              </div>

              {/* Filtro por Status da Comissão */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                  <DollarSign size={14} className="text-emerald-700" /> Status da Comissão
                </label>
                <select 
                  className="w-full p-2.5 rounded-xl border-2 border-gray-200 font-bold text-sm bg-white text-gray-900 focus:border-emerald-600 outline-none"
                  value={commissionStatusFilter}
                  onChange={e => setCommissionStatusFilter(e.target.value as any)}
                >
                  <option value="all">Todas as Situações</option>
                  <option value="pending">🟡 Pendentes de Pagamento</option>
                  <option value="paid">🟢 Comissões Já Pagas</option>
                  <option value="unpriced">⚠️ Aguardando Lançamento de Valor</option>
                </select>
              </div>

              {/* Campo de Busca */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                  <Search size={14} className="text-gray-500" /> Buscar
                </label>
                <input 
                  type="text" 
                  placeholder="Cliente, empresa, vendedor..."
                  className="w-full p-2.5 rounded-xl border-2 border-gray-200 text-sm bg-white text-gray-900 font-semibold focus:border-purple-600 outline-none"
                  value={repSearchQuery}
                  onChange={e => setRepSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Barra de Intervalo de Datas quando personalizado */}
            {(repPeriodFilter === 'custom' || repStartDate || repEndDate) && (
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Calendar size={14} className="text-purple-700" /> Filtrar intervalo de datas específico:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-bold">De:</span>
                  <input
                    type="date"
                    value={repStartDate}
                    onChange={e => {
                      setRepStartDate(e.target.value);
                      if (repPeriodFilter !== 'custom') setRepPeriodFilter('custom');
                    }}
                    className="p-1.5 px-3 rounded-lg border border-gray-300 text-xs font-bold bg-white text-gray-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-bold">Até:</span>
                  <input
                    type="date"
                    value={repEndDate}
                    onChange={e => {
                      setRepEndDate(e.target.value);
                      if (repPeriodFilter !== 'custom') setRepPeriodFilter('custom');
                    }}
                    className="p-1.5 px-3 rounded-lg border border-gray-300 text-xs font-bold bg-white text-gray-900"
                  />
                </div>
                {(repStartDate || repEndDate || repPeriodFilter === 'custom') && (
                  <button
                    type="button"
                    onClick={() => {
                      setRepStartDate('');
                      setRepEndDate('');
                      setRepPeriodFilter('all');
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-bold underline cursor-pointer ml-auto"
                  >
                    Limpar filtro de data
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Lista de Pedidos Corporativos & Comissões (Cards 100% Opacos) */}
          <div className="space-y-3">
            {repOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border-2 border-gray-200 shadow-md text-center text-gray-600 font-medium">
                Nenhum pedido de vendedor ou corporativo encontrado com os filtros selecionados.
              </div>
            ) : (
              repOrders.map(order => {
                const orderTotal = order.total || 0;
                const hasPrice = orderTotal > 0;
                const commission = orderTotal * 0.10;
                const isPaid = order.commissionStatus === 'paid';
                const pkgsCount = order.totalPackages || order.items.reduce((s, i) => {
                  const match = (i.title || '').match(/(\d+)\s*(?:pkgs?|pacotes?)/i);
                  if (match) return s + (parseInt(match[1], 10) * (i.quantity || 1));
                  return s + (25 * (i.quantity || 1));
                }, 0);

                return (
                  <div 
                    key={order.id} 
                    className="bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-md hover:shadow-lg hover:border-purple-300 transition-all space-y-4"
                  >
                    {/* Linha de Cima: Vendedor, Empresa, Status */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex flex-wrap items-center gap-2">
                        {order.salesRep ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-950 text-xs font-black border border-purple-300 shadow-2xs">
                            <Briefcase size={14} className="text-purple-700" />
                            Vendedor: {order.salesRep}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateSalesRep(order.id, '', order.b2bCompanyName || order.customerName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                          >
                            <Plus size={13} /> Atribuir Vendedor
                          </button>
                        )}

                        <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 text-xs font-black border border-amber-300">
                          ★ {order.b2bCompanyName || order.customerName}
                        </span>

                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                          {pkgsCount} pacotes (pkgs)
                        </span>

                        <span className="text-xs text-gray-500 font-semibold">
                          Pedido #{order.id.slice(-5)} • {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('pt-BR') : 'Hoje'}
                        </span>
                      </div>

                      {/* Status da Comissão Badge */}
                      <div className="flex items-center gap-2">
                        {!hasPrice ? (
                          <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-950 text-xs font-black border border-amber-300 flex items-center gap-1">
                            ⚠️ Aguardando Preço Manual
                          </span>
                        ) : isPaid ? (
                          <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-950 text-xs font-black border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 size={14} className="text-emerald-700" /> Comissão Paga
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-950 text-xs font-black border border-amber-300 flex items-center gap-1">
                            🟡 Comissão Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Linha do Meio: Detalhes, Valores e Comissão */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      {/* Cliente e Contato */}
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">Contato</p>
                        <p className="text-sm font-black text-gray-900">
                          {order.b2bManagerName || order.customerName}
                        </p>
                        <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" />
                          <a 
                            href={`https://wa.me/${order.phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-emerald-700 underline font-bold"
                          >
                            {order.phone}
                          </a>
                        </p>
                        {order.pickupDate && (
                          <p className="text-xs text-blue-700 font-bold flex items-center gap-1">
                            <Calendar size={12} /> Entrega: {order.pickupDate}
                          </p>
                        )}
                      </div>

                      {/* Itens do Pedido */}
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">Itens ({order.items.length})</p>
                        <div className="max-h-20 overflow-y-auto space-y-0.5 text-xs text-gray-800 font-semibold pr-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="truncate" title={`${item.quantity}x ${item.title}`}>
                              • <strong>{item.quantity}x</strong> {item.title}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Valor do Pedido (Inserção manual por Jucilea) */}
                      <div className="space-y-1 bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-stone-600 tracking-wider">Valor do Pedido</span>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickSetOrderTotal(order)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                              hasPrice 
                                ? "text-blue-600 hover:text-blue-800 hover:bg-blue-50 underline" 
                                : "bg-blue-600 text-white hover:bg-blue-700 no-underline shadow-xs font-extrabold"
                            )}
                          >
                            {hasPrice ? 'Alterar' : '+ Inserir Valor'}
                          </button>
                        </div>
                        {hasPrice ? (
                          <p className="text-lg font-black text-emerald-800">
                            {currencySymbol}{orderTotal.toFixed(2)}
                          </p>
                        ) : (
                          <p className="text-xs font-black text-amber-800 flex items-center gap-1">
                            ⚠️ Não informado
                          </p>
                        )}
                        <p className="text-[10px] text-stone-500 font-medium">
                          Definido manualmente no adm
                        </p>
                      </div>

                      {/* Comissão 10% e Botão de Ação */}
                      <div className="space-y-2 bg-purple-50 p-3 rounded-xl border-2 border-purple-200">
                        <div>
                          <span className="text-xs font-bold uppercase text-purple-900 tracking-wider">Comissão (10%)</span>
                          {hasPrice ? (
                            <p className="text-lg font-black text-purple-900">
                              {currencySymbol}{commission.toFixed(2)}
                            </p>
                          ) : (
                            <p className="text-xs font-bold text-gray-500 italic">
                              Aguardando valor
                            </p>
                          )}
                        </div>

                        {hasPrice && (
                          <button
                            type="button"
                            onClick={() => handleToggleCommission(order)}
                            className={cn(
                              "w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer",
                              isPaid 
                                ? "bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50" 
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 size={14} /> Paga (Clique p/ Reverter)
                              </>
                            ) : (
                              <>
                                <DollarSign size={14} /> Marcar como Paga
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rodapé do Card: Ações Adicionais */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-2">
                        {order.salesRep && (
                          <button
                            type="button"
                            onClick={() => handleUpdateSalesRep(order.id, order.salesRep, order.b2bCompanyName || order.customerName)}
                            className="text-gray-600 hover:text-purple-700 underline font-bold cursor-pointer"
                          >
                            Alterar vendedor ({order.salesRep})
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => deleteOrder(order.id)}
                          className="px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="Excluir este pedido permanentemente"
                        >
                          <Trash2 size={14} /> Excluir Pedido
                        </button>
                        <button
                          type="button"
                          onClick={() => printOrder(order)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Printer size={14} /> Imprimir Pedido
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingOrder(order);
                            setEditOrderForm(order);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Edit2 size={14} /> Editar Pedido Completo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
      </main>

      <AnimatePresence>
        {assigningRepOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border-2 border-gray-200 space-y-5 text-gray-900"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800">
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Vincular Vendedor</h3>
                    <p className="text-xs text-gray-500 font-medium">Pedido #{assigningRepOrder.id.slice(-5)} • {assigningRepOrder.customerName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAssigningRepOrder(null)} 
                  className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {uniqueSalesReps.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                      Escolher da lista de vendedores cadastrados:
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {uniqueSalesReps.map(rep => (
                        <button
                          key={rep}
                          type="button"
                          onClick={() => {
                            handleSaveOrderSalesRep(assigningRepOrder.id, rep);
                            setAssigningRepOrder(null);
                          }}
                          className={cn(
                            "px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer flex items-center justify-between text-left",
                            assigningRepOrder.currentRep === rep
                              ? "bg-purple-700 text-white border-purple-700 shadow-sm"
                              : "bg-gray-50 hover:bg-purple-50 text-gray-800 border-gray-200"
                          )}
                        >
                          <span className="truncate">{rep}</span>
                          {assigningRepOrder.currentRep === rep && <CheckCircle2 size={14} className="shrink-0 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Ou digitar / cadastrar novo vendedor:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome do vendedor..."
                      className="flex-grow p-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-600 outline-none text-sm font-bold text-gray-900 bg-white"
                      defaultValue={assigningRepOrder.currentRep}
                      id="custom-rep-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value;
                          handleSaveOrderSalesRep(assigningRepOrder.id, val);
                          setAssigningRepOrder(null);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('custom-rep-input') as HTMLInputElement;
                        if (input) {
                          handleSaveOrderSalesRep(assigningRepOrder.id, input.value);
                          setAssigningRepOrder(null);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-98 text-white text-xs font-black cursor-pointer transition-all shadow-sm"
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                {assigningRepOrder.currentRep && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveOrderSalesRep(assigningRepOrder.id, '');
                        setAssigningRepOrder(null);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-bold underline cursor-pointer"
                    >
                      Remover vendedor deste pedido
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isEditingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-gray-200 text-gray-900"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-2xl font-serif font-bold text-gray-900" style={{ color: '#111827' }}>Editar Cliente</h3>
                <button 
                  onClick={() => setIsEditingCustomer(null)} 
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>
              
              <form onSubmit={updateCustomer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Nome do Cliente</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                      value={editCustomerForm.name || ''}
                      onChange={e => setEditCustomerForm({...editCustomerForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">WhatsApp</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                      value={editCustomerForm.phone || ''}
                      onChange={e => setEditCustomerForm({...editCustomerForm, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">E-mail</label>
                    <input 
                      type="email" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                      value={editCustomerForm.email || ''}
                      onChange={e => setEditCustomerForm({...editCustomerForm, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Aniversário (MM/DD)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                      value={editCustomerForm.birthday || ''}
                      onChange={e => setEditCustomerForm({...editCustomerForm, birthday: e.target.value})}
                      placeholder="MM/DD"
                    />
                  </div>
                </div>
                {editCustomerForm.isB2B ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Nome do Responsável</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                          value={editCustomerForm.managerName || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, managerName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Frequência de Pedidos</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                          value={editCustomerForm.frequency || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, frequency: e.target.value})}
                          placeholder="Ex: Semanal, Mensal"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Endereço Corporativo</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                        value={editCustomerForm.address || ''}
                        onChange={e => setEditCustomerForm({...editCustomerForm, address: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">CEP</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                          value={editCustomerForm.zipCode || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, zipCode: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Cidade / Estado</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                          value={editCustomerForm.city || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, city: e.target.value})}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Rua / Logradouro</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                          value={editCustomerForm.street || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, street: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Número</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                          value={editCustomerForm.number || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, number: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">CEP</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                          value={editCustomerForm.zipCode || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, zipCode: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Cidade / Estado</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                          value={editCustomerForm.city || ''}
                          onChange={e => setEditCustomerForm({...editCustomerForm, city: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Endereço Completo</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-300"
                        value={editCustomerForm.address || ''}
                        onChange={e => setEditCustomerForm({...editCustomerForm, address: e.target.value})}
                      />
                    </div>
                  </>
                )}
                 <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 text-white bg-gray-900 hover:bg-black transition-all cursor-pointer"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-gray-200 text-gray-900"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-gray-900" style={{ color: '#111827' }}>Cadastrar Novo Cliente</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Adicione um novo cliente diretamente ao cadastro</p>
                </div>
                <button 
                  onClick={() => setIsAddingCustomer(false)} 
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setNewCustomerForm(prev => ({ ...prev, isB2B: false }))}
                  className={cn(
                    "py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer",
                    !newCustomerForm.isB2B 
                      ? "bg-white text-gray-900 shadow-xs border border-gray-200" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Users size={16} /> Pessoa Física / Varejo
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustomerForm(prev => ({ ...prev, isB2B: true }))}
                  className={cn(
                    "py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer",
                    newCustomerForm.isB2B 
                      ? "bg-amber-600 text-white shadow-xs font-black" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Package size={16} /> Pessoa Jurídica / B2B
                </button>
              </div>
              
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                      {newCustomerForm.isB2B ? 'Nome da Empresa / Razão Social *' : 'Nome Completo *'}
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                      value={newCustomerForm.name}
                      onChange={e => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                      placeholder={newCustomerForm.isB2B ? "Ex: Padaria Bela Vista" : "Ex: Maria Silva"}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                      Telefone / WhatsApp *
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                      value={newCustomerForm.phone}
                      onChange={e => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                      placeholder="Ex: (11) 98765-4321"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">E-mail</label>
                    <input 
                      type="email" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                      value={newCustomerForm.email}
                      onChange={e => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                      placeholder="cliente@exemplo.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Aniversário (DD/MM ou MM/DD)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                      value={newCustomerForm.birthday}
                      onChange={e => setNewCustomerForm({ ...newCustomerForm, birthday: e.target.value })}
                      placeholder="Ex: 15/04"
                    />
                  </div>
                </div>

                {newCustomerForm.isB2B ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Nome do Responsável / Contato</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                          value={newCustomerForm.managerName}
                          onChange={e => setNewCustomerForm({ ...newCustomerForm, managerName: e.target.value })}
                          placeholder="Ex: Carlos Oliveira"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Frequência Estimada</label>
                        <select 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                          value={newCustomerForm.frequency}
                          onChange={e => setNewCustomerForm({ ...newCustomerForm, frequency: e.target.value })}
                        >
                          <option value="weekly">Semanal (Recorrente)</option>
                          <option value="biweekly">Quinzenal</option>
                          <option value="monthly">Mensal</option>
                          <option value="one-time">Sob Demanda / Avulso</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Endereço Corporativo</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                        value={newCustomerForm.address}
                        onChange={e => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                        placeholder="Ex: Av. Paulista, 1000, Sala 52"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">CEP</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                          value={newCustomerForm.zipCode}
                          onChange={e => setNewCustomerForm({ ...newCustomerForm, zipCode: e.target.value })}
                          placeholder="Ex: 01310-100"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Cidade / Estado</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                          value={newCustomerForm.city}
                          onChange={e => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                          placeholder="Ex: São Paulo - SP"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Rua / Logradouro</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                          value={newCustomerForm.street}
                          onChange={e => setNewCustomerForm({ ...newCustomerForm, street: e.target.value })}
                          placeholder="Ex: Rua das Flores"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Número / Compl.</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                          value={newCustomerForm.number}
                          onChange={e => setNewCustomerForm({ ...newCustomerForm, number: e.target.value })}
                          placeholder="Ex: 123 Apto 4"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">CEP</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                          value={newCustomerForm.zipCode}
                          onChange={e => setNewCustomerForm({ ...newCustomerForm, zipCode: e.target.value })}
                          placeholder="Ex: 01234-567"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Cidade / Estado</label>
                        <input 
                          type="text" 
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                          value={newCustomerForm.city}
                          onChange={e => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                          placeholder="Ex: Salvador - BA"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Endereço Completo (Opcional)</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-400"
                        value={newCustomerForm.address}
                        onChange={e => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                        placeholder="Ex: Rua das Flores, 123 - Centro, Salvador - BA"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Observações / Anotações Internas</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-400 text-sm"
                    value={newCustomerForm.observation}
                    onChange={e => setNewCustomerForm({ ...newCustomerForm, observation: e.target.value })}
                    placeholder="Preferências do cliente, restrições alimentares ou observações gerais..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => setIsAddingCustomer(false)}
                    className="w-1/3 py-3.5 rounded-xl font-bold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-2/3 py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : (
                      <>
                        <UserPlus size={18} /> Cadastrar Cliente
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isEditingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border-2 border-gray-200 text-gray-900 flex flex-col max-h-[90vh] overflow-hidden"
            >
              <form onSubmit={handleEditOrder} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                {/* Cabeçalho fixo no topo do modal */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0 bg-white">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-gray-900" style={{ color: '#111827' }}>Editar Pedido</h3>
                    <p className="text-xs text-gray-500 font-medium">Pedido #{isEditingOrder.id.slice(-5)} • {isEditingOrder.customerName}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsEditingOrder(null)} 
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    <X size={22} />
                  </button>
                </div>
                
                {/* Corpo do formulário com rolagem interna suave e espaçosa */}
                <div className="flex-1 overflow-y-auto p-6 md:p-7 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Nome do Cliente</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900"
                      value={editOrderForm.customerName || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, customerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">WhatsApp</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900"
                      value={editOrderForm.phone || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Email</label>
                    <input 
                      type="email" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900"
                      value={editOrderForm.email || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, email: e.target.value})}
                    />
                  </div>
                   <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Aniversário (MM/DD)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900"
                      value={editOrderForm.birthday || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, birthday: e.target.value})}
                      placeholder="MM/DD"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Endereço</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900"
                    value={editOrderForm.address || ''}
                    onChange={e => setEditOrderForm({...editOrderForm, address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Data de Entrega (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900"
                      value={editOrderForm.pickupDate || ''}
                      onChange={e => setEditOrderForm({...editOrderForm, pickupDate: e.target.value})}
                      placeholder="MM/DD/AAAA"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Preço Final (Total)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">{currencySymbol}</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="w-full p-3 pl-10 rounded-xl border border-gray-300 font-bold text-emerald-700 bg-white"
                        value={editOrderForm.total || 0}
                        onChange={e => setEditOrderForm({...editOrderForm, total: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Status do Pagamento</label>
                    <select 
                      className="w-full p-3 rounded-xl border border-gray-300 font-semibold bg-white text-gray-900"
                      value={editOrderForm.paymentStatus || 'not_paid'}
                      onChange={e => setEditOrderForm({...editOrderForm, paymentStatus: e.target.value as any})}
                    >
                      <option value="not_paid">🔴 Não Pago</option>
                      <option value="50_deposit">🟡 50% de Sinal Pago</option>
                      <option value="paid_full">🟢 Pago Integral (100%)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Validação para Produção</label>
                    <button
                      type="button"
                      onClick={() => setEditOrderForm({...editOrderForm, productionValidated: !editOrderForm.productionValidated})}
                      className={cn(
                        "w-full p-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer",
                        editOrderForm.productionValidated
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      )}
                    >
                      <Rocket size={16} />
                      {editOrderForm.productionValidated ? "Validado para Produção (Sim)" : "Aguardando Validação (Não)"}
                    </button>
                  </div>
                </div>

                {/* --- SEÇÃO VENDEDOR & COMISSÃO --- */}
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      <Briefcase size={15} className="text-purple-700" /> Vendedor & Comissão (10%)
                    </span>
                    {(editOrderForm.total || 0) > 0 && (
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Comissão: {currencySymbol}{((editOrderForm.total || 0) * 0.10).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Nome do Vendedor / Representante</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Lea, Jucilea (opcional)"
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold"
                        value={editOrderForm.salesRep || ''}
                        onChange={e => setEditOrderForm({...editOrderForm, salesRep: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Status do Pagamento da Comissão</label>
                      <select 
                        className="w-full p-3 rounded-xl border border-gray-300 font-semibold bg-white text-gray-900"
                        value={editOrderForm.commissionStatus || 'pending'}
                        onChange={e => setEditOrderForm({...editOrderForm, commissionStatus: e.target.value as any})}
                      >
                        <option value="pending">🟡 Pendente</option>
                        <option value="paid">🟢 Paga</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* --- SEÇÃO DE ITENS DO PEDIDO --- */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-800">Itens do Pedido</h4>
                  
                  {editOrderForm.items && editOrderForm.items.length > 0 ? (
                    <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
                      {editOrderForm.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200 gap-3 text-gray-900">
                          <div className="flex-grow">
                            <p className="font-bold text-sm text-gray-900">{item.title}</p>
                            {item.selectedSize && (
                              <p className="text-xs text-gray-600 font-semibold">Tamanho: {item.selectedSize.name}</p>
                            )}
                            {item.cakeOptions && (
                              <div className="text-xs text-gray-600 space-y-0.5 mt-0.5">
                                {item.cakeOptions.size && <p>Tamanho: {item.cakeOptions.size}</p>}
                                {item.cakeOptions.dough && <p>Massa: {item.cakeOptions.dough}</p>}
                                {item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0 && (
                                  <p>Recheios: {item.cakeOptions.fillings.join(', ')}</p>
                                )}
                                {item.cakeOptions.topping && <p>Cobertura: {item.cakeOptions.topping}</p>}
                                {item.cakeOptions.topper && <p>Topper: {item.cakeOptions.topper}</p>}
                              </div>
                            )}
                            {item.mealOptions && (
                              <div className="text-xs text-gray-600 space-y-0.5 mt-0.5">
                                {item.mealOptions.removals && item.mealOptions.removals.length > 0 && (
                                  <p>Sem: {item.mealOptions.removals.join(', ')}</p>
                                )}
                                {item.mealOptions.sides && item.mealOptions.sides.length > 0 && (
                                  <p>Extras: {item.mealOptions.sides.map(s => s.name).join(', ')}</p>
                                )}
                              </div>
                            )}
                            
                            {/* Editable price input for high usability */}
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                              <span className="font-bold text-gray-600">Preço: {currencySymbol}</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                className="w-20 px-2 py-0.5 rounded-lg border border-gray-300 bg-white text-gray-900 font-bold text-xs" 
                                value={item.price} 
                                onChange={e => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  const updatedItems = [...(editOrderForm.items || [])];
                                  updatedItems[index].price = newPrice;
                                  updateOrderFormWithItems(updatedItems);
                                }} 
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedItems = [...(editOrderForm.items || [])];
                                  if (updatedItems[index].quantity > 1) {
                                    updatedItems[index].quantity -= 1;
                                    updateOrderFormWithItems(updatedItems);
                                  }
                                }}
                                className="px-2.5 py-1 hover:bg-gray-100 font-bold border-r border-gray-300 text-gray-900"
                              >
                                -
                              </button>
                              <span className="px-3 py-1 font-bold text-sm min-w-[24px] text-center text-gray-900">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedItems = [...(editOrderForm.items || [])];
                                  updatedItems[index].quantity += 1;
                                  updateOrderFormWithItems(updatedItems);
                                }}
                                className="px-2.5 py-1 hover:bg-gray-100 font-bold border-l border-gray-300 text-gray-900"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedItems = (editOrderForm.items || []).filter((_, idx) => idx !== index);
                                updateOrderFormWithItems(updatedItems);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Excluir item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nenhum item neste pedido.</p>
                  )}

                  {/* Add item interface */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Adicionar Novo Item ao Pedido</p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="flex-1 min-w-0">
                        <select
                          value={selectedProductId}
                          onChange={e => setSelectedProductId(e.target.value)}
                          className="w-full min-w-0 p-3 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 truncate"
                        >
                          <option value="">-- Selecione um produto --</option>
                          {products.map(p => {
                            const activePrice = p.hasSizes && p.sizes && p.sizes.length > 0 
                              ? Math.min(...p.sizes.map(s => s.price)) 
                              : ((p.price && p.price > 0) ? p.price : (p.oldPrice || 0));
                            return (
                              <option key={p.id} value={p.id}>
                                {p.title} ({currencySymbol} {activePrice.toFixed(2)})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min="1"
                          className="w-16 p-3 rounded-xl border border-gray-300 text-center font-bold text-gray-900 bg-white shrink-0 text-sm"
                          value={addItemQuantity}
                          onChange={e => setAddItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedProductId) return;
                            const prod = products.find(p => p.id === selectedProductId);
                            if (!prod) return;
                            
                            const activePrice = prod.hasSizes && prod.sizes && prod.sizes.length > 0 
                              ? Math.min(...prod.sizes.map(s => s.price)) 
                              : ((prod.price && prod.price > 0) ? prod.price : (prod.oldPrice || 0));
                            
                            const newItem = {
                              title: prod.title,
                              quantity: addItemQuantity,
                              price: activePrice,
                              cakeOptions: {},
                              mealOptions: {
                                removals: [],
                                sides: []
                              }
                            };
                            
                            const updatedItems = [...(editOrderForm.items || []), newItem];
                            updateOrderFormWithItems(updatedItems);
                            
                            // Reset selection
                            setSelectedProductId('');
                            setAddItemQuantity(1);
                          }}
                          disabled={!selectedProductId}
                          className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap uppercase tracking-wider shrink-0 cursor-pointer shadow-sm"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pb-2">
                  <label className="text-xs font-bold uppercase text-gray-700 tracking-wider">Observações</label>
                  <textarea 
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-900"
                    rows={3}
                    value={editOrderForm.observation || ''}
                    onChange={e => setEditOrderForm({...editOrderForm, observation: e.target.value})}
                  />
                </div>
              </div>

              {/* Rodapé fixo na base dentro do card */}
              <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-b-3xl">
                <button 
                  type="button"
                  onClick={() => deleteOrder(isEditingOrder.id)}
                  className="px-4 py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Excluir este pedido permanentemente"
                >
                  <Trash2 size={16} /> Excluir Pedido
                </button>

                <div className="flex items-center gap-2.5 ml-auto">
                  <button 
                    type="button"
                    onClick={() => setIsEditingOrder(null)}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold text-sm transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 rounded-xl font-bold text-sm shadow-md text-white bg-gray-900 hover:bg-black transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Save size={16} /> Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
        )}

        {viewingCustomerOrders && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-gray-200 text-gray-900"
            >
              <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                <div className="space-y-1">
                  <span className="text-xs uppercase font-extrabold tracking-widest bg-amber-50 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
                    Histórico do Cliente
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-gray-900 mt-1" style={{ color: '#111827' }}>{viewingCustomerOrders.name}</h3>
                  <p className="text-sm text-gray-600 font-medium">
                    {viewingCustomerOrders.phone} | {viewingCustomerOrders.email || 'Sem e-mail'}
                  </p>
                </div>
                <button 
                  onClick={() => setViewingCustomerOrders(null)} 
                  className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-full cursor-pointer transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-600">
                  Pedidos Realizados ({viewingCustomerOrders.orders.length})
                </h4>
                
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {viewingCustomerOrders.orders.map((order: Order, index: number) => (
                    <div 
                      key={order.id} 
                      className="p-5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs"
                    >
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-gray-200 text-gray-800 rounded">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('en-US') : 'N/A'}
                          </span>
                          {order.pickupDate && (
                            <span 
                              className="text-[10px] font-black px-2 py-0.5 rounded-md text-white whitespace-nowrap bg-gray-800"
                            >
                              🚚 Entrega: {order.pickupDate}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-900">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between font-medium">
                                <span>{item.quantity}x {item.title}</span>
                                <span className="text-gray-600 font-semibold">{currencySymbol} {((item.price || 0) * item.quantity).toFixed(2).replace('.', ',')}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 italic py-1">Cadastro de cliente (nenhum item neste registro).</p>
                          )}
                          
                          {order.total > 0 && !(order.isB2B || order.isPJ) && (
                            <div className="border-t border-gray-200 pt-2 space-y-1 text-xs text-gray-600 font-semibold">
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{currencySymbol} {(order.subtotal || (order.total / 1.0875)).toFixed(2).replace('.', ',')}</span>
                              </div>
                              <div className="flex justify-between text-amber-900 font-bold">
                                <span>Sales Tax (8.75%):</span>
                                <span>+ {currencySymbol} {(order.taxAmount || (order.total - (order.total / 1.0875))).toFixed(2).replace('.', ',')}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {order.observation && (
                          <p className="text-xs italic bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200 font-medium">
                            <strong>Obs:</strong> {order.observation}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-3 border-t md:border-t-0 border-gray-200 pt-3 md:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-gray-500 block">Valor Pago</span>
                          <span className="text-xl font-black text-gray-950">
                            {currencySymbol} {order.total.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => printOrder(order)}
                            className="p-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 shadow-xs cursor-pointer"
                            title="Imprimir"
                          >
                            <Printer size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditingOrder(order);
                              setEditOrderForm(order);
                              setViewingCustomerOrders(null);
                            }}
                            className="p-2 bg-white border border-gray-200 rounded-xl text-blue-600 hover:bg-blue-50 shadow-xs cursor-pointer"
                            title="Editar Pedido"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center space-y-6 border border-gray-200 text-gray-900"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-gray-900" style={{ color: '#111827' }}>{confirmModal.title}</h3>
                <p className="text-sm text-gray-600">{confirmModal.message}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {pricingModalOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-5 border border-gray-200 text-gray-900"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                    {currencySymbol}
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-gray-900" style={{ color: '#111827' }}>
                      Definir Valor do Pedido
                    </h3>
                    <p className="text-xs text-gray-500">
                      Pedido #{pricingModalOrder.id.slice(-6).toUpperCase()} • {pricingModalOrder.isB2B || pricingModalOrder.isPJ ? (pricingModalOrder.b2bCompanyName || pricingModalOrder.customerName) : pricingModalOrder.customerName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPricingModalOrder(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Pedido Resumo */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-1.5 text-xs text-stone-700">
                <div className="flex justify-between">
                  <span className="font-bold text-stone-500">Vendedor Atribuído:</span>
                  <span className="font-extrabold text-stone-900">{pricingModalOrder.salesRep || 'Não atribuído'}</span>
                </div>
                {pricingModalOrder.totalPackages && (
                  <div className="flex justify-between">
                    <span className="font-bold text-stone-500">Pacotes Solicitados:</span>
                    <span className="font-extrabold text-blue-700">{pricingModalOrder.totalPackages} pacotes (pkgs)</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span className="font-bold text-stone-500 shrink-0">Itens:</span>
                  <span className="font-medium text-stone-800 truncate">
                    {pricingModalOrder.items.map(i => `${i.quantity}x ${i.title}`).join(', ')}
                  </span>
                </div>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSaveQuickPrice} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Valor Total do Pedido ({currencySymbol})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">
                      {currencySymbol}
                    </span>
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="0.00"
                      value={quickPriceInput}
                      onChange={e => setQuickPriceInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none text-xl font-black text-gray-900 transition-all bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Exemplo: 350.00 ou 450,50</p>
                </div>

                {/* Cálculo Dinâmico de Comissão 10% */}
                {(() => {
                  const val = parseFloat(quickPriceInput.replace(',', '.'));
                  if (!isNaN(val) && val > 0) {
                    const comm = val * 0.10;
                    return (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
                        <span className="font-bold text-purple-900">Comissão do Vendedor (10%):</span>
                        <span className="font-black text-sm text-purple-800 bg-white px-2.5 py-1 rounded-lg shadow-xs">
                          {currencySymbol} {comm.toFixed(2)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setPricingModalOrder(null)}
                    className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingQuickPrice || !quickPriceInput.trim()}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSavingQuickPrice ? 'Salvando...' : 'Salvar Valor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
