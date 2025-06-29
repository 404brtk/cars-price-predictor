'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getPredictionHistory, PaginatedPredictions, Prediction, HistoryQueryParams } from '../api/services';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import FilterInput from '@/components/ui/FilterInput';

const initialQueryParams: HistoryQueryParams = {
  page: 1,
  page_size: 10,
  sort: '-timestamp',
  brand: '',
  car_model: '',
  start_date: '',
  end_date: '',
  min_price: undefined,
  max_price: undefined,
};

const HistoryPage = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<PaginatedPredictions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryParams, setQueryParams] = useState<HistoryQueryParams>(initialQueryParams);

  const [showFilters, setShowFilters] = useState(false);

  const debouncedParams = useDebounce(queryParams, 750);

  const fetchHistory = useCallback(async (params: HistoryQueryParams) => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);

    // Clean up empty string parameters before sending
    const cleanedParams: HistoryQueryParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key as keyof HistoryQueryParams] = value;
      }
      return acc;
    }, {} as HistoryQueryParams);

    try {
      const data = await getPredictionHistory(cleanedParams);
      setHistory(data);
    } catch (err) {
      setError('Failed to load prediction history. Please try again later.');
      console.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {

      }
    }
  }, [isAuthLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
        fetchHistory(debouncedParams);
    }
  }, [isAuthenticated, debouncedParams, fetchHistory]);

  const handleFilterChange = (field: keyof HistoryQueryParams, value: string | number) => {
    setQueryParams(prev => ({ ...prev, page: 1, [field]: value }));
  };

  const handleClearFilters = () => {
    setQueryParams(initialQueryParams);
  };

  const handlePageChange = (newPage: number) => {
    setQueryParams(prev => ({ ...prev, page: newPage }));
  };

  const handleSortChange = (field: string) => {
    const newSort = queryParams.sort === field ? `-${field}` : field;
    setQueryParams(prev => ({ ...prev, sort: newSort, page: 1 }));
  };

  const renderSortIcon = (field: string) => {
    if (queryParams.sort?.endsWith(field)) {
      return queryParams.sort.startsWith('-') ? ' ▼' : ' ▲';
    }
    return null;
  };

  const activeFilterCount = useMemo(() => {
    return Object.entries(queryParams).filter(([key, value]) => {
        if (['page', 'page_size', 'sort'].includes(key)) return false;
        return value !== '' && value !== undefined && value !== null;
    }).length;
  }, [queryParams]);

  if (isAuthLoading || (!history && isLoading)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-[#778DA9]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 py-16 text-white">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-[#778DA9]">
              Prediction History
            </h1>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className="relative mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-md hover:bg-white/20 transition-colors"
            >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                    <span className='absolute -top-2 -right-2 bg-[#415A77] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
                        {activeFilterCount}
                    </span>
                )}
            </button>
        </div>

        <AnimatePresence>
        {showFilters && (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
            >
                <div className="bg-white/5 p-4 rounded-lg mb-8 border border-white/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Brand and Model */}
                        <FilterInput label="Brand" value={queryParams.brand || ''} onChange={e => handleFilterChange('brand', e.target.value)} placeholder="Brand name or first letters" />

                        <FilterInput label="Car Model" value={queryParams.car_model || ''} onChange={e => handleFilterChange('car_model', e.target.value)} placeholder="Model name or first letters" />

                        {/* Price Range */}
                        <FilterInput label="Min Price" type="number" placeholder="e.g., 5 000" value={queryParams.min_price || ''} onChange={e => handleFilterChange('min_price', e.target.value)} />
                        <FilterInput label="Max Price" type="number" placeholder="e.g., 20 000" value={queryParams.max_price || ''} onChange={e => handleFilterChange('max_price', e.target.value)} />

                        {/* Date Range */}
                        <FilterInput label="Start Date" type="date" value={queryParams.start_date || ''} onChange={e => handleFilterChange('start_date', e.target.value)} />
                        <FilterInput label="End Date" type="date" value={queryParams.end_date || ''} onChange={e => handleFilterChange('end_date', e.target.value)} />
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={handleClearFilters} className="flex items-center gap-2 text-sm text-[#778DA9] hover:text-white transition-colors">
                            <X className="h-4 w-4"/> Clear All Filters
                        </button>
                    </div>
                </div>
            </motion.div>
        )}
        </AnimatePresence>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex items-center mb-6">
            <AlertCircle className="h-5 w-5 mr-3" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white/5 rounded-lg backdrop-blur-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/10 text-sm font-semibold text-[#E0E1DD]/80">
                <tr>
                  <th className="px-6 py-4">Car</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-white/20 transition-colors" onClick={() => handleSortChange('predicted_price')}>
                    Predicted Price{renderSortIcon('predicted_price')}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-white/20 transition-colors" onClick={() => handleSortChange('timestamp')}>
                    Date{renderSortIcon('timestamp')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isLoading ? (
                    <tr><td colSpan={4} className='text-center py-16'><Loader2 className="h-8 w-8 animate-spin text-[#778DA9] mx-auto" /></td></tr>
                ) : history && history.results.length > 0 ? (
                  history.results.map((p: Prediction) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="hover:bg-white/10 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold">{p.brand} {p.car_model}</div>
                        <div className="text-sm text-[#778DA9]">{p.year_of_production}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#E0E1DD]/90 align-top">
                        {p.mileage.toLocaleString('sv-SE')} km · {p.fuel_type} · {p.transmission} <br />
                        {p.engine_capacity.toFixed(1)} dm³ · {p.power} HP · {p.color}
                      </td>
                      <td className="px-6 py-4 font-mono text-lg align-top">
                        {p.predicted_price.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#778DA9] align-top">
                        {new Date(p.timestamp).toLocaleDateString('pl-PL')}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                    <tr><td colSpan={4} className='text-center py-16'>
                        <h2 className="text-xl font-semibold mb-2">No Results Found</h2>
                        <p className="text-[#778DA9]">Try adjusting your filters or clear them to see all predictions.</p>
                    </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {history && history.results.length > 0 && (
            <div className="flex justify-between items-center mt-6 text-sm text-[#778DA9]">
              <p>
                Page {history.current_page} of {history.total_pages} ({history.count} results)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(history.current_page - 1)}
                  disabled={history.current_page <= 1}
                  className="px-3 py-2 bg-white/10 rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(history.current_page + 1)}
                  disabled={history.current_page >= history.total_pages}
                  className="px-3 py-2 bg-white/10 rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
        )}
      </motion.div>
    </div>
  );
};



export default HistoryPage;