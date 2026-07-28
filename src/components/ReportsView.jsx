import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Eye,
  Printer,
  Calendar,
  ArrowRightLeft,
  LockKeyhole,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const REPORTS_PIN = '19851985';
const INVOICES_PER_PAGE = 12;

const timeFilters = [
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'all', label: 'الكلي' }
];

function getDateRange(filterKey) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (filterKey === 'today') return { start, end: now };
  if (filterKey === 'week') {
    start.setDate(start.getDate() - start.getDay());
    return { start, end: now };
  }
  if (filterKey === 'month') {
    start.setDate(1);
    return { start, end: now };
  }
  return { start: null, end: null };
}

function isSaleInRange(sale, filterKey) {
  const { start, end } = getDateRange(filterKey);
  if (!start || !end) return true;
  const saleDate = new Date(sale.date);
  return saleDate >= start && saleDate <= end;
}

function buildPageNumbers(totalPages, currentPage) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) pages.add(page);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export default function ReportsView() {
  const sales = useLiveQuery(() => db.sales.toArray()) || [];
  const saleItems = useLiveQuery(() => db.saleItems.toArray()) || [];

  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState([]);
  const [isReportsUnlocked, setIsReportsUnlocked] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeFilter, setActiveFilter] = useState('today');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredSales = useMemo(() => {
    return sales
      .filter(sale => isSaleInRange(sale, activeFilter))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, activeFilter]);

  const stats = useMemo(() => {
    const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + Number(sale.finalAmount || 0), 0);
    let totalProfitAmount = 0;

    filteredSales.forEach(sale => {
      const currentItems = saleItems.filter(item => item.saleId === sale.id);
      const itemsProfit = currentItems.reduce((sum, item) => {
        const margin = Number(item.unitPrice || 0) - Number(item.unitBuyPrice || 0);
        return sum + (margin * Number(item.quantity || 0));
      }, 0);
      totalProfitAmount += itemsProfit - Number(sale.discount || 0);
    });

    return {
      totalSales: totalSalesAmount,
      totalProfit: Math.max(0, totalProfitAmount),
      invoiceCount: filteredSales.length
    };
  }, [filteredSales, saleItems]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / INVOICES_PER_PAGE));
  const visiblePageNumbers = useMemo(() => buildPageNumbers(totalPages, currentPage), [totalPages, currentPage]);
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * INVOICES_PER_PAGE;
    return filteredSales.slice(startIndex, startIndex + INVOICES_PER_PAGE);
  }, [filteredSales, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleUnlockReports = (event) => {
    event.preventDefault();

    if (pinValue === REPORTS_PIN) {
      setIsReportsUnlocked(true);
      setPinValue('');
      setPinError('');
      return;
    }

    setPinError('رمز المرور غير صحيح');
  };

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setSelectedSaleItems(saleItems.filter(item => item.saleId === sale.id));
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isReportsUnlocked) {
    return (
      <div className="p-4 overflow-y-auto h-full pb-20">
        <div className="min-h-[70vh] flex items-center justify-center">
          <form onSubmit={handleUnlockReports} className="w-full max-w-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 text-center shadow-md backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <LockKeyhole className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">التقارير محمية</h2>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-4">
              أدخل رمز المرور لعرض المبيعات والأرباح وسجل الفواتير.
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={pinValue}
              onChange={(event) => {
                setPinValue(event.target.value);
                setPinError('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-center text-lg font-black tracking-[0.35em] text-slate-900 dark:text-slate-100"
              placeholder="••••••••"
              autoFocus
            />
            {pinError && <div className="text-[11px] text-red-500 font-bold mt-2">{pinError}</div>}
            <button type="submit" className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-md shadow-amber-950/20 transition-colors">
              فتح التقارير
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full pb-20">
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 px-1 flex items-center gap-1.5">
          <Calendar className="h-4.5 w-4.5 text-amber-500" />
          <span>ملخص المبيعات</span>
        </h3>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-3 text-right shadow-sm dark:shadow-md">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
              <DollarSign className="h-3 w-3 text-amber-500" />
              <span>إجمالي المبيعات</span>
            </div>
            <div className="text-xs font-black text-amber-600 dark:text-amber-400 truncate">
              {stats.totalSales.toLocaleString()} <span className="text-[8px]">د.ع</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-3 text-right shadow-sm dark:shadow-md">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>إجمالي الأرباح</span>
            </div>
            <div className="text-xs font-black text-green-600 dark:text-green-400 truncate">
              {stats.totalProfit.toLocaleString()} <span className="text-[8px]">د.ع</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-3 text-right shadow-sm dark:shadow-md">
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
              <FileText className="h-3 w-3 text-amber-500" />
              <span>عدد الفواتير</span>
            </div>
            <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
              {stats.invoiceCount} <span className="text-[8px] font-normal text-slate-500 dark:text-slate-400">فاتورة</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 px-1 flex items-center gap-1.5">
          <ArrowRightLeft className="h-4.5 w-4.5 text-amber-500" />
          <span>سجل الفواتير السابقة ({filteredSales.length})</span>
        </h3>

        <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-2 shadow-sm dark:shadow-md">
          <div className="grid grid-cols-4 gap-1.5">
            {timeFilters.map(filter => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all ${activeFilter === filter.key ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">لا توجد فواتير ضمن الفترة المحددة.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedSales.map(sale => {
                const saleDate = new Date(sale.date);
                return (
                  <div key={sale.id} className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-3.5 flex items-center justify-between shadow-sm dark:shadow-md backdrop-blur-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">فاتورة #{sale.id}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                          {saleDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {sale.syncStatus === 'pending' ? (
                          <span className="text-[9px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded-md border border-amber-550/20 animate-pulse">أوفلاين</span>
                        ) : (
                          <span className="text-[9px] bg-green-500/10 text-green-550 dark:text-green-400 font-bold px-1.5 py-0.5 rounded-md border border-green-550/20">مزامنة</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1.5 font-bold">{saleDate.toLocaleDateString('ar-EG')}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                          {Number(sale.finalAmount || 0).toLocaleString()} د.ع
                        </div>
                        {Number(sale.discount || 0) > 0 && (
                          <div className="text-[9px] text-red-500 dark:text-red-400 font-bold mt-0.5">
                            خصم: -{Number(sale.discount || 0).toLocaleString()} د.ع
                          </div>
                        )}
                      </div>

                      <button onClick={() => handleViewSale(sale)} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shadow-sm" title="عرض تفاصيل الفاتورة">
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage === 1} className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-[11px] font-bold shadow-sm">
                <ChevronRight className="h-4 w-4" />
                <span>السابق</span>
              </button>

              {visiblePageNumbers.map((page, index) => {
                const previousPage = visiblePageNumbers[index - 1];
                const hasGap = previousPage && page - previousPage > 1;
                return (
                  <React.Fragment key={page}>
                    {hasGap && <span className="text-xs text-slate-400 px-1">...</span>}
                    <button onClick={() => setCurrentPage(page)} className={`h-9 min-w-9 px-3 rounded-xl border text-xs font-black transition-all ${currentPage === page ? 'bg-amber-500 border-amber-500 text-slate-950' : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200'}`}>
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

              <button onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-[11px] font-bold shadow-sm">
                <span>التالي</span>
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 overflow-y-auto max-h-[90vh] flex flex-col justify-between backdrop-blur-md shadow-sm dark:shadow-md">
            <div className="print-area bg-white text-slate-950 p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="mb-4">
                <h2 className="text-lg font-black tracking-wide text-slate-900">متجر O2</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">متجر فيب، أراكيل، معسل وملحقات</p>
                <div className="border-b border-dashed border-slate-300 my-3"></div>
                <div className="flex justify-between items-center text-[10px] text-slate-600 px-1">
                  <span>التاريخ: {new Date(selectedSale.date).toLocaleDateString('ar-EG')}</span>
                  <span>الوقت: {new Date(selectedSale.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-[10px] text-slate-700 font-bold bg-slate-100 py-1 rounded-md mt-2">
                  فاتورة مبيعات رقم: #{selectedSale.id}
                </div>
              </div>

              <table className="w-full text-right text-[11px] mb-4">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="pb-1 text-right">المادة</th>
                    <th className="pb-1 text-center">الكمية</th>
                    <th className="pb-1 text-left">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSaleItems.map(item => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 text-slate-800 font-semibold max-w-[150px] truncate">{item.productName}</td>
                      <td className="py-2 text-center text-slate-700">{item.quantity}</td>
                      <td className="py-2 text-left font-bold text-slate-900">{(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-[11px] text-slate-700 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-semibold">{Number(selectedSale.totalAmount || 0).toLocaleString()} د.ع</span>
                </div>
                {Number(selectedSale.discount || 0) > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>الخصم:</span>
                    <span>-{Number(selectedSale.discount || 0).toLocaleString()} د.ع</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-1.5 border-t border-slate-200">
                  <span>المجموع الكلي:</span>
                  <span>{Number(selectedSale.finalAmount || 0).toLocaleString()} د.ع</span>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-[10px] text-slate-400 font-bold">شكراً لزيارتكم! نتشرف بزيارتكم دائماً.</p>
              </div>
            </div>

            <div className="no-print flex gap-2.5 mt-5">
              <button onClick={handlePrint} className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/30 text-xs transition-colors">
                <Printer className="h-4 w-4 text-slate-950" />
                <span>إعادة طباعة</span>
              </button>

              <button onClick={() => setSelectedSale(null)} className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold py-2.5 px-6 rounded-xl text-xs transition-colors">
                <span>إغلاق</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
