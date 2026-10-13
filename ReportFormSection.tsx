import React, { useState } from 'react';

interface ReportFormSectionProps {
  formUrl?: string;
}

export const ReportFormSection: React.FC<ReportFormSectionProps> = ({
  formUrl = 'https://minpd77.github.io/DMEL/dm119.html',
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  return (
    <section 
      id="report-form-section" 
      className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Embedded Form Page Only - Clean and direct */}
      <div className="relative w-full bg-white min-h-[720px] h-[85vh]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-300">신고 및 보고 양식을 불러오는 중입니다...</p>
          </div>
        )}

        <iframe
          src={formUrl}
          title="신고 및 보고 양식"
          className="w-full h-full border-0 bg-white"
          onLoad={() => setIsLoading(false)}
          allow="clipboard-read; clipboard-write; forms"
        />
      </div>
    </section>
  );
};
