import React, { useState, useMemo, useEffect } from 'react';
import { Order, Settings } from '../types';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, 
  CheckCircle2, AlertCircle, Rocket, X, Printer, Phone, Mail, 
  MapPin, Cake, Layers, FileText, Check, ArrowRight, Truck,
  RotateCcw, PackageCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface OrdersCalendarProps {
  orders: Order[];
  settings: Settings;
  onPrintOrder: (order: Order) => void;
  onSwitchToList?: (orderId?: string) => void;
}

export function parseOrderDate(order: Order): Date {
  if (order.pickupDate) {
    const raw = order.pickupDate.trim();
    if (raw.includes('-')) {
      const parts = raw.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          d.setHours(0, 0, 0, 0);
          return d;
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY or MM-DD-YYYY
          const p0 = parseInt(parts[0]);
          const p1 = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          let month = p0;
          let day = p1;
          if (p0 > 12) {
            day = p0;
            month = p1;
          }
          const d = new Date(year, month - 1, day);
          d.setHours(0, 0, 0, 0);
          return d;
        }
      }
    }
    if (raw.includes('/')) {
      const parts = raw.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY/MM/DD
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          d.setHours(0, 0, 0, 0);
          return d;
        }
        let p0 = parseInt(parts[0]);
        let p1 = parseInt(parts[1]);
        let p2 = parseInt(parts[2]);
        let month = p0;
        let day = p1;
        let year = p2;
        if (p0 > 12) {
          day = p0;
          month = p1;
        }
        const d = new Date(year, month - 1, day);
        d.setHours(0, 0, 0, 0);
        return d;
      }
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  if (order.createdAt?.toDate) {
    const d = order.createdAt.toDate();
    const cleanDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    cleanDate.setHours(0, 0, 0, 0);
    return cleanDate;
  }
  if (order.createdAt && typeof order.createdAt === 'string') {
    const d = new Date(order.createdAt);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function getOrderTimeDisplay(order: Order): string {
  if (order.pickupTime) return order.pickupTime;
  if (order.createdAt?.toDate) {
    const d = order.createdAt.toDate();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }
  return '06:00';
}

const WEEKDAYS_PT = [
  { short: 'DOM', full: 'Domingo' },
  { short: 'SEG', full: 'Segunda-feira' },
  { short: 'TER', full: 'Terça-feira' },
  { short: 'QUA', full: 'Quarta-feira' },
  { short: 'QUI', full: 'Quinta-feira' },
  { short: 'SEX', full: 'Sexta-feira' },
  { short: 'SÁB', full: 'Sábado' }
];

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function OrdersCalendar({
  orders,
  settings,
  onPrintOrder,
  onSwitchToList
}: OrdersCalendarProps) {
  const [viewMode, setViewMode] = useState<'week' | 'list' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [filterValidation, setFilterValidation] = useState<'all' | 'validated' | 'pending'>('all');
  const [filterDelivery, setFilterDelivery] = useState<'all' | 'delivered' | 'pending'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'half' | 'unpaid'>('all');

  const currencySymbol = settings.currency === 'USD' ? '$' : 'R$';

  // Navigate dates
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  };

  // Week range calculations (starts Sunday)
  const currentWeekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Month grid calculations
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const grid: { date: Date; isCurrentMonth: boolean; dayNum: number }[] = [];

    // Prev month padding
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      d.setHours(0, 0, 0, 0);
      grid.push({ date: d, isCurrentMonth: false, dayNum: prevMonthDays - i });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      d.setHours(0, 0, 0, 0);
      grid.push({ date: d, isCurrentMonth: true, dayNum: i });
    }

    // Next month padding to fill complete rows of 7
    const remaining = 7 - (grid.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        d.setHours(0, 0, 0, 0);
        grid.push({ date: d, isCurrentMonth: false, dayNum: i });
      }
    }

    return grid;
  }, [currentDate]);

  // Filtered orders list by validation / delivery / payment
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const isDelivered = order.deliveryStatus === 'delivered' || !!order.isDelivered;
      if (filterValidation === 'validated' && !order.productionValidated) return false;
      if (filterValidation === 'pending' && order.productionValidated) return false;
      if (filterDelivery === 'delivered' && !isDelivered) return false;
      if (filterDelivery === 'pending' && isDelivered) return false;
      if (filterPayment === 'paid' && order.paymentStatus !== 'paid_full') return false;
      if (filterPayment === 'half' && order.paymentStatus !== '50_deposit') return false;
      if (filterPayment === 'unpaid' && (order.paymentStatus === 'paid_full' || order.paymentStatus === '50_deposit')) return false;
      return true;
    });
  }, [orders, filterValidation, filterDelivery, filterPayment]);

  // Map orders by date string YYYY-MM-DD
  const ordersByDateMap = useMemo(() => {
    const map = new Map<string, Order[]>();

    filteredOrders.forEach(order => {
      const date = parseOrderDate(order);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(order);
    });

    // Sort orders within each date by time or creation
    map.forEach(list => {
      list.sort((a, b) => {
        const timeA = getOrderTimeDisplay(a);
        const timeB = getOrderTimeDisplay(b);
        return timeA.localeCompare(timeB);
      });
    });

    return map;
  }, [filteredOrders]);

  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Unique dates with orders
  const datesWithOrders = useMemo(() => {
    const map = new Map<string, { date: Date; count: number; hasB2B: boolean }>();
    orders.forEach(o => {
      const d = parseOrderDate(o);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isB2B = !!(o.isB2B || o.isPJ || o.b2bCompanyName);
      if (!map.has(key)) {
        map.set(key, { date: d, count: 0, hasB2B: false });
      }
      const entry = map.get(key)!;
      entry.count += 1;
      if (isB2B) entry.hasB2B = true;
    });
    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [orders]);

  // Orders count in currently viewed period
  const periodOrdersCount = useMemo(() => {
    if (viewMode === 'month') {
      let count = 0;
      monthGridDays.forEach(item => {
        if (item.isCurrentMonth) {
          const list = ordersByDateMap.get(getDateKey(item.date)) || [];
          count += list.length;
        }
      });
      return count;
    } else {
      let count = 0;
      currentWeekDays.forEach(day => {
        const list = ordersByDateMap.get(getDateKey(day)) || [];
        count += list.length;
      });
      return count;
    }
  }, [viewMode, monthGridDays, currentWeekDays, ordersByDateMap]);

  // Auto-focus calendar on orders if current period is empty and orders exist
  useEffect(() => {
    if (orders.length > 0) {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const hasOrderInWeek = orders.some(o => {
        const d = parseOrderDate(o);
        return d >= startOfWeek && d <= endOfWeek;
      });

      if (!hasOrderInWeek && datesWithOrders.length > 0) {
        // Encontrar o pedido mais relevante
        const nowTime = new Date().getTime();
        const futureDates = datesWithOrders.filter(d => d.date.getTime() >= nowTime - 86400000);
        const target = futureDates.length > 0 ? futureDates[0].date : datesWithOrders[datesWithOrders.length - 1].date;
        const newD = new Date(target);
        newD.setHours(0, 0, 0, 0);
        setCurrentDate(newD);
      }
    }
  }, [orders, datesWithOrders]);

  // Period label
  const periodTitle = useMemo(() => {
    if (viewMode === 'month') {
      return `Mês de ${MONTHS_PT[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    }
    const start = currentWeekDays[0];
    const end = currentWeekDays[6];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = MONTHS_PT[start.getMonth()];
    const endMonth = MONTHS_PT[end.getMonth()];

    if (start.getMonth() === end.getMonth()) {
      return `Semana de ${startDay} a ${endDay} de ${startMonth} de ${start.getFullYear()}`;
    }
    return `Semana de ${startDay} de ${startMonth} a ${endDay} de ${endMonth} de ${end.getFullYear()}`;
  }, [viewMode, currentDate, currentWeekDays]);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Status updates in real-time
  const updatePaymentStatus = async (orderId: string, status: 'not_paid' | '50_deposit' | 'paid_full') => {
    try {
      setIsUpdatingStatus(true);
      await updateDoc(doc(db, 'pedidos', orderId), {
        paymentStatus: status
      });
      toast.success(
        status === 'paid_full' 
          ? 'Pagamento 100% confirmado!' 
          : status === '50_deposit' 
            ? 'Sinal de 50% registrado!' 
            : 'Marcado como Não Pago.'
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: status });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status de pagamento.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleProductionValidation = async (order: Order) => {
    const nextVal = !order.productionValidated;
    try {
      setIsUpdatingStatus(true);
      await updateDoc(doc(db, 'pedidos', order.id), {
        productionValidated: nextVal
      });
      toast.success(nextVal ? '🚀 Pedido validado para produção!' : 'Pedido desvalidado da produção.');
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder({ ...selectedOrder, productionValidated: nextVal });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao alterar validação de produção.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleDeliveryStatus = async (order: Order) => {
    const isCurrentlyDelivered = order.deliveryStatus === 'delivered' || !!order.isDelivered;
    const nextDelivered = !isCurrentlyDelivered;
    try {
      setIsUpdatingStatus(true);
      await updateDoc(doc(db, 'pedidos', order.id), {
        deliveryStatus: nextDelivered ? 'delivered' : 'pending',
        isDelivered: nextDelivered,
        deliveredAt: nextDelivered ? new Date() : null
      });
      toast.success(nextDelivered ? '✅ Pedido marcado como ENTREGUE!' : 'Status de entrega marcado como pendente.');
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder({
          ...selectedOrder,
          deliveryStatus: nextDelivered ? 'delivered' : 'pending',
          isDelivered: nextDelivered,
          deliveredAt: nextDelivered ? new Date() : null
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status de entrega.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 orders-calendar-container admin-area text-gray-900">
      {/* Calendar Card Container */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200/80 space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm bg-gray-100 text-gray-900"
            >
              <CalendarIcon size={24} strokeWidth={2.2} className="text-gray-800" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 leading-tight" style={{ color: '#111827' }}>
                Cronograma de Pedidos
              </h2>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Visualização dinâmica dos pedidos agendados
              </p>
            </div>
          </div>

          {/* Controls: View Mode Switcher + Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-gray-100 p-1 rounded-2xl flex items-center shadow-inner">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'week'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Semana (7 Colunas)
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'list'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Lista Detalhada
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'month'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Mensal
              </button>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={handlePrev}
                className="p-2 rounded-xl hover:bg-white text-gray-600 hover:text-gray-900 transition-all cursor-pointer"
                title="Período Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-white text-gray-700 transition-all cursor-pointer"
              >
                Hoje
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-xl hover:bg-white text-gray-600 hover:text-gray-900 transition-all cursor-pointer"
                title="Próximo Período"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Bar (Validação de Produção & Pagamento) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1">Filtrar:</span>
            
            <button
              onClick={() => setFilterValidation('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filterValidation === 'all'
                  ? "bg-gray-800 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Todos ({orders.length})
            </button>

            <button
              onClick={() => setFilterValidation(filterValidation === 'validated' ? 'all' : 'validated')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                filterValidation === 'validated'
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              )}
            >
              <Rocket size={13} />
              <span>Validados para Produção</span>
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-white/20 rounded-full font-black">
                {orders.filter(o => o.productionValidated).length}
              </span>
            </button>

            <button
              onClick={() => setFilterValidation(filterValidation === 'pending' ? 'all' : 'pending')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                filterValidation === 'pending'
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              )}
            >
              <Clock size={13} />
              <span>Aguardando Validação</span>
            </button>

            <button
              onClick={() => setFilterDelivery(filterDelivery === 'delivered' ? 'all' : 'delivered')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                filterDelivery === 'delivered'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
              )}
            >
              <Truck size={13} />
              <span>Entregues</span>
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-white/20 rounded-full font-black">
                {orders.filter(o => o.deliveryStatus === 'delivered' || o.isDelivered).length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 font-medium">Pagamento:</span>
            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value as any)}
              className="bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-bold text-gray-700 cursor-pointer outline-none"
            >
              <option value="all">Todos Pagamentos</option>
              <option value="paid">🟢 100% Pago</option>
              <option value="half">🟡 50% Sinal</option>
              <option value="unpaid">🔴 Não Pago</option>
            </select>
          </div>
        </div>

        {/* Period Subheader */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
          <h3 className="text-lg sm:text-xl font-serif font-bold text-gray-900" style={{ color: '#111827' }}>
            {periodTitle}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold uppercase tracking-wide w-fit">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              {periodOrdersCount} {periodOrdersCount === 1 ? 'PEDIDO NO PERÍODO' : 'PEDIDOS NO PERÍODO'}
            </div>
            {datesWithOrders.length > 0 && (
              <span className="text-xs text-gray-500 font-medium">
                ({orders.length} pedidos no total da lista)
              </span>
            )}
          </div>
        </div>

        {/* Quick Date Jumper Chips */}
        {datesWithOrders.length > 0 && (
          <div className="bg-white/70 border border-gray-200 p-2.5 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
            <span className="font-extrabold text-gray-700 flex items-center gap-1 shrink-0 text-[11px] uppercase tracking-wider">
              <CalendarIcon size={13} className="text-blue-600" />
              Datas com Pedidos:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {datesWithOrders.map(({ date, count, hasB2B }) => {
                const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const isSelectedWeek = currentWeekDays.some(d => getDateKey(d) === getDateKey(date));
                return (
                  <button
                    key={getDateKey(date)}
                    type="button"
                    onClick={() => {
                      const d = new Date(date);
                      d.setHours(0, 0, 0, 0);
                      setCurrentDate(d);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                      isSelectedWeek
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200"
                    )}
                  >
                    <span>{dateStr}</span>
                    <span className={cn(
                      "px-1.5 py-0.2 text-[10px] rounded-full font-black",
                      isSelectedWeek ? "bg-white/20 text-white" : "bg-gray-300 text-gray-800"
                    )}>
                      {count}
                    </span>
                    {hasB2B && (
                      <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-950/20 px-1 rounded">
                        PJ
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Banner if 0 orders in period but orders exist */}
        {periodOrdersCount === 0 && datesWithOrders.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Nenhum pedido nesta semana visualizada.</span>
                <span className="text-amber-800 ml-1">
                  Existem {orders.length} pedidos cadastrados em outras datas.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const target = datesWithOrders[0].date;
                const d = new Date(target);
                d.setHours(0, 0, 0, 0);
                setCurrentDate(d);
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Ir para o pedido mais próximo</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: WEEK VIEW (7 COLUNAS)                        */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 sm:gap-2">
            {currentWeekDays.map((day, idx) => {
              const dateKey = getDateKey(day);
              const dayOrders = ordersByDateMap.get(dateKey) || [];
              const dayIsToday = isToday(day);
              const formattedDate = `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col rounded-2xl border transition-all min-h-[360px] p-2 sm:p-2.5",
                    dayIsToday 
                      ? "bg-blue-50/40 border-blue-400 ring-2 ring-blue-400/20" 
                      : "bg-gray-50/70 border-gray-200/80"
                  )}
                >
                  {/* Column Header */}
                  <div className="text-center pb-2.5 mb-2 border-b border-gray-200/70">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      {WEEKDAYS_PT[day.getDay()].short}
                    </div>
                    <div className="inline-flex items-center justify-center my-1">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-extrabold",
                        dayIsToday
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white text-gray-800 border border-gray-200"
                      )}>
                        {formattedDate}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400">
                      {dayOrders.length} {dayOrders.length === 1 ? 'pedido' : 'pedidos'}
                    </div>
                  </div>

                  {/* Column Body: Orders Cards */}
                  <div className="flex-1 flex flex-col gap-2.5">
                    {dayOrders.length > 0 ? (
                      dayOrders.map(order => {
                        const isDelivered = order.deliveryStatus === 'delivered' || !!order.isDelivered;
                        const isValidated = !!order.productionValidated;
                        const timeStr = getOrderTimeDisplay(order);
                        const itemsSummary = order.items
                          .map(i => `${i.quantity}x ${i.title}`)
                          .join(', ');

                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={cn(
                              "p-3 rounded-xl border transition-all cursor-pointer space-y-2 group relative overflow-hidden",
                              isDelivered
                                ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-300/60 shadow-sm"
                                : isValidated 
                                  ? "bg-white border-blue-300 ring-1 ring-blue-200 shadow-sm hover:shadow-md" 
                                  : "bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                            )}
                          >
                            {/* Card Top: Badges */}
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              {isDelivered ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                                  <CheckCircle2 size={10} /> ENTREGUE
                                </span>
                              ) : isValidated ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                                  <Rocket size={10} /> PRODUÇÃO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[9px] font-bold uppercase tracking-wider">
                                  <Clock size={10} /> PENDENTE
                                </span>
                              )}

                              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                                <Clock size={11} className="text-gray-400" />
                                {timeStr}
                              </span>
                            </div>

                            {/* Customer Name */}
                            <div className="space-y-0.5">
                              {(order.isB2B || order.isPJ || order.b2bCompanyName) && (
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded font-black text-[9px] uppercase tracking-wider">
                                  🏢 Corporativo PJ
                                </div>
                              )}
                              <div className={cn(
                                "font-bold text-xs line-clamp-1 transition-colors",
                                isDelivered 
                                  ? "text-emerald-950 font-black group-hover:text-emerald-700"
                                  : "text-gray-900 group-hover:text-blue-600"
                              )}>
                                {order.isB2B || order.isPJ
                                  ? (order.b2bCompanyName || order.customerName)
                                  : order.customerName}
                              </div>
                            </div>

                            {/* Items Preview */}
                            <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                              {itemsSummary}
                            </p>

                            {/* Card Bottom: Payment & Total */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                              {/* Payment Status Pill */}
                              {order.paymentStatus === 'paid_full' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  Pago 100%
                                </span>
                              ) : order.paymentStatus === '50_deposit' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  50% Sinal
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Não Pago
                                </span>
                              )}

                              <span className="text-xs font-extrabold text-gray-900">
                                {currencySymbol} {order.total.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-4 text-gray-400">
                        <Clock size={22} className="opacity-30 mb-1" />
                        <span className="text-[11px] font-medium opacity-60">Sem pedidos</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 2: DETAILED LIST VIEW (LISTA DETALHADA)         */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {currentWeekDays.map((day, idx) => {
              const dateKey = getDateKey(day);
              const dayOrders = ordersByDateMap.get(dateKey) || [];
              const dayIsToday = isToday(day);
              const dayName = WEEKDAYS_PT[day.getDay()].short;
              const formattedDate = `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`;

              return (
                <div
                  key={idx}
                  className={cn(
                    "rounded-2xl border p-4 sm:p-5 transition-all space-y-3",
                    dayIsToday
                      ? "bg-blue-50/30 border-blue-300 ring-1 ring-blue-200"
                      : "bg-gray-50/50 border-gray-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider",
                        dayIsToday
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-800 border border-gray-200"
                      )}>
                        {dayName} - {formattedDate}
                      </span>
                      {dayIsToday && (
                        <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-100 px-2 py-0.5 rounded-full">
                          Hoje
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {dayOrders.length} {dayOrders.length === 1 ? 'pedido' : 'pedidos'}
                    </span>
                  </div>

                  {dayOrders.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dayOrders.map(order => {
                        const isDelivered = order.deliveryStatus === 'delivered' || !!order.isDelivered;
                        const isValidated = !!order.productionValidated;
                        const timeStr = getOrderTimeDisplay(order);
                        const itemsSummary = order.items
                          .map(i => `${i.quantity}x ${i.title}`)
                          .join(', ');

                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={cn(
                              "p-4 rounded-xl border transition-all cursor-pointer space-y-2.5",
                              isDelivered
                                ? "border-emerald-400 bg-emerald-50/80 ring-1 ring-emerald-300/60 shadow-sm"
                                : isValidated 
                                  ? "border-blue-300 ring-1 ring-blue-100 bg-white shadow-sm hover:shadow-md" 
                                  : "border-gray-200 bg-white shadow-sm hover:shadow-md"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              {isDelivered ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                  <CheckCircle2 size={11} /> ENTREGUE
                                </span>
                              ) : isValidated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                  <Rocket size={11} /> PRODUÇÃO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                                  <Clock size={11} /> PENDENTE
                                </span>
                              )}

                              <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                                <Clock size={12} className="text-gray-400" />
                                {timeStr}
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              {(order.isB2B || order.isPJ || order.b2bCompanyName) && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-md font-black text-[10px] uppercase tracking-wider">
                                  🏢 Corporativo PJ
                                </div>
                              )}
                              <div className={cn(
                                "font-bold text-sm line-clamp-1",
                                isDelivered ? "text-emerald-950 font-black" : "text-gray-900"
                              )}>
                                {order.isB2B || order.isPJ
                                  ? (order.b2bCompanyName || order.customerName)
                                  : order.customerName}
                              </div>
                            </div>

                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                              {itemsSummary}
                            </p>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                              {order.paymentStatus === 'paid_full' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  Pago 100%
                                </span>
                              ) : order.paymentStatus === '50_deposit' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  50% Sinal
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Não Pago
                                </span>
                              )}

                              <span className="text-sm font-black text-gray-900">
                                {currencySymbol} {order.total.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs italic text-gray-400 py-1">
                      Nenhum pedido agendado para este dia.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 3: MONTH VIEW (GRADE MENSAL)                    */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'month' && (
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Weekday Columns Header */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {WEEKDAYS_PT.map((w, idx) => (
                <div key={idx} className="py-2.5 text-center text-xs font-extrabold uppercase tracking-wider text-gray-600">
                  {w.short}
                </div>
              ))}
            </div>

            {/* Month Day Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
              {monthGridDays.map((cell, idx) => {
                const dateKey = getDateKey(cell.date);
                const dayOrders = ordersByDateMap.get(dateKey) || [];
                const dayIsToday = isToday(cell.date);

                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[105px] p-2 flex flex-col justify-between transition-colors",
                      !cell.isCurrentMonth && "bg-gray-50/40 text-gray-300 opacity-60",
                      cell.isCurrentMonth && "bg-white",
                      dayIsToday && "bg-blue-50/40 ring-1 ring-inset ring-blue-400"
                    )}
                  >
                    {/* Day Number and Count */}
                    <div className="flex items-center justify-between mb-1.5">
                      {dayIsToday ? (
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                          {cell.dayNum}
                        </span>
                      ) : (
                        <span className={cn(
                          "text-xs font-bold",
                          cell.isCurrentMonth ? "text-gray-700" : "text-gray-400"
                        )}>
                          {cell.dayNum}
                        </span>
                      )}

                      {dayOrders.length > 0 && (
                        <span className="text-[10px] font-extrabold text-gray-400">
                          {dayOrders.length}
                        </span>
                      )}
                    </div>

                    {/* Orders Pills inside the day */}
                    <div className="space-y-1 overflow-hidden flex-1">
                      {dayOrders.slice(0, 3).map(order => {
                        const isDelivered = order.deliveryStatus === 'delivered' || !!order.isDelivered;
                        const isValidated = !!order.productionValidated;
                        const isPaid = order.paymentStatus === 'paid_full';
                        const isHalf = order.paymentStatus === '50_deposit';
                        const name = order.isB2B || order.isPJ 
                          ? (order.b2bCompanyName || order.customerName)
                          : order.customerName;

                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold flex items-center justify-between gap-1 cursor-pointer transition-all hover:scale-[1.02]",
                              isDelivered
                                ? "bg-emerald-600 text-white font-black border border-emerald-700 shadow-xs"
                                : isValidated 
                                  ? "bg-blue-100 text-blue-900 border border-blue-200"
                                  : isPaid
                                    ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                    : isHalf
                                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                                      : "bg-gray-100 text-gray-700 border border-gray-200"
                            )}
                            title={`${isDelivered ? '✅ ENTREGUE - ' : ''}${name} - ${currencySymbol} ${order.total.toFixed(2)}`}
                          >
                            <span className="truncate flex items-center gap-1">
                              {isDelivered && <CheckCircle2 size={9} className="text-white shrink-0" />}
                              {!isDelivered && isValidated && <Rocket size={9} className="text-blue-700 shrink-0" />}
                              {!isDelivered && !isValidated && isPaid && <Check size={9} className="text-emerald-700 shrink-0" />}
                              <span className="truncate">{name}</span>
                            </span>
                            <span className={cn(
                              "shrink-0 text-[9px]",
                              isDelivered ? "text-white font-black" : "font-extrabold"
                            )}>
                              {currencySymbol}{Math.round(order.total)}
                            </span>
                          </div>
                        );
                      })}

                      {dayOrders.length > 3 && (
                        <div 
                          onClick={() => {
                            setCurrentDate(cell.date);
                            setViewMode('week');
                          }}
                          className="text-[9px] font-extrabold text-blue-600 hover:underline cursor-pointer text-center pt-0.5"
                        >
                          +{dayOrders.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* ORDER DETAILS MODAL (GERENCIAMENTO EM TEMPO REAL)    */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden my-auto admin-modal text-gray-900"
            >
              {/* Modal Top Header */}
              <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4 bg-gray-50/80">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-600" style={{ color: '#4b5563' }}>
                      DETALHES DO PEDIDO
                    </span>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-800 text-[10px] font-mono font-bold rounded-md">
                      #{selectedOrder.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-gray-900 leading-snug" style={{ color: '#111827' }}>
                    {selectedOrder.isB2B || selectedOrder.isPJ 
                      ? (selectedOrder.b2bCompanyName || selectedOrder.customerName)
                      : selectedOrder.customerName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 font-medium">
                    <CalendarIcon size={13} className="text-gray-400" />
                    Criado em: {selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleString('pt-BR') : 'N/A'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-900">
                
                {/* Real-Time Management Panel */}
                <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-blue-600" />
                      <span className="text-xs font-black uppercase tracking-wider text-blue-950">
                        Gerenciamento de Status em Tempo Real
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-600 font-medium">
                      Clique nos botões para alterar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Status Pagamento Card */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                      <div className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                        Status Pagamento
                      </div>
                      <div>
                        {selectedOrder.paymentStatus === 'paid_full' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            PAGO 100%
                          </span>
                        ) : selectedOrder.paymentStatus === '50_deposit' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            50% SINAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-rose-600" />
                            NÃO PAGO
                          </span>
                        )}
                      </div>

                      {/* Action Buttons for Payment */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          disabled={isUpdatingStatus}
                          onClick={() => updatePaymentStatus(selectedOrder.id, 'not_paid')}
                          className={cn(
                            "py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer text-center",
                            (!selectedOrder.paymentStatus || selectedOrder.paymentStatus === 'not_paid')
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          Não Pago
                        </button>
                        <button
                          disabled={isUpdatingStatus}
                          onClick={() => updatePaymentStatus(selectedOrder.id, '50_deposit')}
                          className={cn(
                            "py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer text-center",
                            selectedOrder.paymentStatus === '50_deposit'
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          50% Sinal
                        </button>
                        <button
                          disabled={isUpdatingStatus}
                          onClick={() => updatePaymentStatus(selectedOrder.id, 'paid_full')}
                          className={cn(
                            "py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer text-center",
                            selectedOrder.paymentStatus === 'paid_full'
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          Pago 100%
                        </button>
                      </div>
                    </div>

                    {/* Validação Produção Card */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                      <div className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                        Validação Produção
                      </div>
                      <div>
                        {selectedOrder.productionValidated ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                            <Rocket size={13} />
                            VALIDADO PRODUÇÃO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider">
                            <Clock size={13} />
                            AGUARDANDO VALIDAÇÃO
                          </span>
                        )}
                      </div>

                      {/* Action Button for Validation */}
                      <div className="pt-1">
                        <button
                          disabled={isUpdatingStatus}
                          onClick={() => toggleProductionValidation(selectedOrder)}
                          className={cn(
                            "w-full py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs",
                            selectedOrder.productionValidated
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          )}
                        >
                          {selectedOrder.productionValidated ? (
                            <>
                              <X size={14} /> DESVALIDAR
                            </>
                          ) : (
                            <>
                              <Rocket size={14} /> VALIDAR PRODUÇÃO
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Status da Entrega Card */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                      <div className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                        Status da Entrega
                      </div>
                      <div>
                        {(selectedOrder.deliveryStatus === 'delivered' || selectedOrder.isDelivered) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                            <CheckCircle2 size={13} />
                            PEDIDO ENTREGUE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                            <Clock size={13} />
                            A ENTREGAR
                          </span>
                        )}
                      </div>

                      {/* Action Button for Delivery */}
                      <div className="pt-1">
                        <button
                          disabled={isUpdatingStatus}
                          onClick={() => toggleDeliveryStatus(selectedOrder)}
                          className={cn(
                            "w-full py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs",
                            (selectedOrder.deliveryStatus === 'delivered' || selectedOrder.isDelivered)
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          )}
                        >
                          {(selectedOrder.deliveryStatus === 'delivered' || selectedOrder.isDelivered) ? (
                            <>
                              <RotateCcw size={14} /> DESMARCAR ENTREGUE
                            </>
                          ) : (
                            <>
                              <Truck size={14} /> MARCAR COMO ENTREGUE
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scheduled Date & Time Header */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-gray-500" style={{ color: '#6b7280' }}>
                      Horário e Data Agendada
                    </div>
                    <div className="text-sm font-extrabold text-gray-900" style={{ color: '#111827' }}>
                      {getOrderTimeDisplay(selectedOrder)} • {selectedOrder.pickupDate || (selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleDateString('pt-BR') : 'Data não informada')}
                    </div>
                  </div>
                </div>

                {/* Customer Data */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5" style={{ color: '#374151' }}>
                    <FileText size={14} className="text-gray-500" /> Dados do Cliente / Contato
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-gray-400">Nome do Cliente</span>
                      <div className="font-extrabold text-gray-900" style={{ color: '#111827' }}>{selectedOrder.customerName}</div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-gray-400">Telefone / WhatsApp</span>
                      <div>
                        <a
                          href={`https://wa.me/${selectedOrder.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-extrabold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Phone size={12} /> {selectedOrder.phone}
                        </a>
                      </div>
                    </div>

                    {selectedOrder.email && (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-gray-400">E-mail</span>
                        <div className="font-bold text-gray-700 flex items-center gap-1">
                          <Mail size={12} /> {selectedOrder.email}
                        </div>
                      </div>
                    )}

                    {selectedOrder.birthday && (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-gray-400">Aniversário</span>
                        <div className="font-bold text-pink-600 flex items-center gap-1">
                          <Cake size={12} /> {selectedOrder.birthday}
                        </div>
                      </div>
                    )}

                    {selectedOrder.address && (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 space-y-0.5 sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase text-gray-400">Endereço de Entrega</span>
                        <div className="font-medium text-gray-800 flex items-start gap-1">
                          <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
                          <span>{selectedOrder.address}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5" style={{ color: '#374151' }}>
                    <Layers size={14} className="text-gray-500" /> Itens do Pedido ({selectedOrder.items.length})
                  </h4>

                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start border-b border-gray-200/60 pb-2.5 last:border-0 last:pb-0">
                        <div className="space-y-1 pr-2">
                          <div className="font-extrabold text-sm text-gray-900" style={{ color: '#111827' }}>
                            {item.quantity}x {item.title}
                          </div>

                          {item.mealOptions && (
                            <div className="text-[11px] text-gray-500 space-y-0.5">
                              {item.mealOptions.removals.length > 0 && (
                                <div>
                                  <span className="font-bold text-gray-700">Remover:</span> {item.mealOptions.removals.join(', ')}
                                </div>
                              )}
                              {item.mealOptions.sides.length > 0 && (
                                <div>
                                  <span className="font-bold text-gray-700">Acompanhamentos:</span> {item.mealOptions.sides.map(s => s.name).join(', ')}
                                </div>
                              )}
                            </div>
                          )}

                          {item.cakeOptions && (
                            <div className="text-[11px] text-gray-500 space-y-0.5">
                              {item.cakeOptions.size && <div><span className="font-bold">Tamanho:</span> {item.cakeOptions.size}</div>}
                              {item.cakeOptions.dough && <div><span className="font-bold">Massa:</span> {item.cakeOptions.dough}</div>}
                              {item.cakeOptions.fillings && item.cakeOptions.fillings.length > 0 && (
                                <div><span className="font-bold">Recheios:</span> {item.cakeOptions.fillings.join(' + ')}</div>
                              )}
                              {item.cakeOptions.topping && <div><span className="font-bold">Cobertura:</span> {item.cakeOptions.topping}</div>}
                              {item.cakeOptions.topper && <div><span className="font-bold">Topo:</span> {item.cakeOptions.topper}</div>}
                              {item.cakeOptions.styleNumber && <div><span className="font-bold">Estilo Foto nº:</span> {item.cakeOptions.styleNumber}</div>}
                            </div>
                          )}
                        </div>

                        <div className="font-bold text-xs text-gray-700 whitespace-nowrap">
                          {currencySymbol} {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    ))}

                    {/* Financial Summary */}
                    <div className="border-t border-gray-300 pt-3 space-y-1 text-xs">
                      {selectedOrder.subtotal && selectedOrder.subtotal !== selectedOrder.total && (
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal:</span>
                          <span>{currencySymbol} {selectedOrder.subtotal.toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                      {selectedOrder.taxAmount && (
                        <div className="flex justify-between text-gray-600">
                          <span>Tax ({selectedOrder.taxRate || 8.75}%):</span>
                          <span>+ {currencySymbol} {selectedOrder.taxAmount.toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black text-gray-900 border-t border-gray-200 pt-2" style={{ color: '#111827' }}>
                        <span>Total:</span>
                        <span className="font-black text-emerald-800" style={{ color: '#065f46' }}>
                          {currencySymbol} {selectedOrder.total.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observations */}
                {selectedOrder.observation && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-900" style={{ color: '#78350f' }}>Observações do Cliente</span>
                    <p className="text-xs text-amber-950 italic">{selectedOrder.observation}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                {onSwitchToList && (
                  <button
                    onClick={() => {
                      const id = selectedOrder.id;
                      setSelectedOrder(null);
                      onSwitchToList(id);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={14} /> Ver na Lista Geral
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => onPrintOrder(selectedOrder)}
                    className="px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer size={14} /> Imprimir Comanda
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-6 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-black text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
