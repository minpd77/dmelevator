import React from 'react';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* 헤더 부분에 ThemeToggle 배치 */}
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center max-w-6xl mx-auto">
        <h1 className="text-xl font-bold">대명엘리베이터</h1>
        {/* 다크/라이트 모드 토글 버튼 */}
        <ThemeToggle />
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">승강기 주요 업무 포털</h2>
        <p className="text-slate-600 dark:text-slate-400">
          우측 상단의 버튼을 클릭하면 다크 모드와 라이트 모드를 변경할 수 있습니다.
        </p>
      </main>
    </div>
  );
}
