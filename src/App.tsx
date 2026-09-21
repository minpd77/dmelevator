import React, { useState, useEffect, useCallback } from 'react';
import { Site, ElevatorRecord } from './types';
import { StorageService } from './services/storage';
import { SheetsService } from './services/sheetsService';
import { Header } from './components/Header';
import { SiteCard } from './components/SiteCard';
import { ElevatorDataTable } from './components/ElevatorDataTable';
import { CalendarSection } from './components/CalendarSection';
import { ReportFormSection } from './components/ReportFormSection';

const GOOGLE_CALENDAR_URL =
  'https://calendar.google.com/calendar/embed?src=2e9b26406360e509de22bf93385e651ac80edf9f70cfa23ddaa3fb2e80a56560%40group.calendar.google.com&ctz=Asia%2FSeoul';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'inspection-db' | 'calendar' | 'report-form'>('home');
  const [sites, setSites] = useState<Site[]>([]);
  const [elevatorRecords, setElevatorRecords] = useState<ElevatorRecord[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [lastDbUpdated, setLastDbUpdated] = useState<string | null>(null);

  // Sync view with URL hash (#inspection-db, #calendar, #report-form)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash || '';
      if (hash.includes('inspection-db')) {
        setCurrentView('inspection-db');
      } else if (hash.includes('calendar')) {
        setCurrentView('calendar');
      } else if (hash.includes('report-form') || hash.includes('dm119')) {
        setCurrentView('report-form');
      } else {
        setCurrentView('home');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Load sites
  const refreshData = () => {
    const loadedSites = StorageService.getSites();
    setSites(loadedSites);
  };

  // Fetch Google Sheets DB data
  const loadElevatorData = useCallback(async () => {
    setIsLoadingDb(true);
    setDbError(null);
    try {
      const records = await SheetsService.fetchElevatorRecords();
      setElevatorRecords(records);
      setLastDbUpdated(new Date().toISOString());
    } catch (err: any) {
      console.error('Failed to fetch spreadsheet data:', err);
      setDbError(err?.message || '스프레드시트 데이터를 불러오는 데 실패했습니다.');
    } finally {
      setIsLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Instant local cache load
    const cached = SheetsService.getStoredData();
    if (cached && cached.length > 0) {
      setElevatorRecords(cached);
      setLastDbUpdated(SheetsService.getLastFetchTime());
    }

    // Live fetch
    loadElevatorData();
  }, [loadElevatorData]);

  const handleToggleFavorite = (id: string) => {
    StorageService.toggleFavorite(id);
    refreshData();
  };

  const navigateToDb = () => {
    setCurrentView('inspection-db');
    try {
      if (window.location.hash !== '#inspection-db') {
        window.location.hash = 'inspection-db';
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCalendar = () => {
    setCurrentView('calendar');
    try {
      if (window.location.hash !== '#calendar') {
        window.location.hash = 'calendar';
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToReportForm = () => {
    setCurrentView('report-form');
    try {
      if (window.location.hash !== '#report-form') {
        window.location.hash = 'report-form';
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    setCurrentView('home');
    try {
      if (window.location.hash) {
        window.location.hash = '';
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Main Header with single top-right '이전 (홈으로)' button */}
      <Header 
        currentView={currentView}
        onNavigateHome={navigateToHome}
        onNavigateDb={navigateToDb}
        onNavigateCalendar={navigateToCalendar}
        onNavigateReportForm={navigateToReportForm}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentView === 'home' ? (
          <div className="space-y-6">
            {/* Site Cards Grid: Clean boxes only */}
            <section aria-label="주요 업무 사이트 바로가기">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {sites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    onOpenDb={navigateToDb}
                    onOpenCalendar={navigateToCalendar}
                    onOpenReportForm={navigateToReportForm}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : currentView === 'inspection-db' ? (
          /* Dedicated Inspection DB Page View */
          <div className="animate-in fade-in duration-150">
            <ElevatorDataTable
              records={elevatorRecords}
              isLoading={isLoadingDb}
              error={dbError}
              lastUpdated={lastDbUpdated}
              onRefresh={loadElevatorData}
            />
          </div>
        ) : currentView === 'calendar' ? (
          /* Dedicated Calendar Page View */
          <div className="animate-in fade-in duration-150">
            <CalendarSection 
              calendarUrl={GOOGLE_CALENDAR_URL} 
            />
          </div>
        ) : (
          /* Dedicated Report & Notification Form Page View */
          <div className="animate-in fade-in duration-150">
            <ReportFormSection 
              formUrl="https://minpd77.github.io/DMEL/dm119.html"
            />
          </div>
        )}
      </main>

      {/* Clean Dark Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <p className="font-semibold text-slate-400">
            대명엘리베이터 &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
