import { Site, Feedback, FeedbackStatus, SiteCategory } from '../types';

const SITES_STORAGE_KEY = 'daemyung_portal_sites_v8';
const FEEDBACKS_STORAGE_KEY = 'daemyung_portal_feedbacks_v8';

export const INITIAL_SITES: Site[] = [
  {
    id: 'site-2',
    name: '현장지도',
    description: '',
    category: '업무',
    siteUrl: 'https://minpd77.github.io/DMEL/map2.html',
    icon: 'building',
    createdAt: '2026-03-01T09:00:00.000Z',
    favorite: true,
  },
  {
    id: 'site-3',
    name: '신고 및 보고 양식',
    description: '',
    category: '고장',
    siteUrl: '#report-form',
    icon: 'file-text',
    createdAt: '2026-03-02T09:00:00.000Z',
    favorite: true,
  },
  {
    id: 'site-cal',
    name: '일정 캘린더',
    description: '',
    category: '일정',
    siteUrl: '#calendar',
    icon: 'calendar',
    createdAt: '2026-03-03T09:00:00.000Z',
    favorite: true,
  },
  {
    id: 'site-1',
    name: '현장 검사조건부 조회',
    description: '',
    category: '검사',
    siteUrl: '#inspection-db',
    icon: 'wrench',
    createdAt: '2026-03-04T09:00:00.000Z',
    favorite: true,
  },
];

export const INITIAL_FEEDBACKS: Feedback[] = [
  {
    id: 'fb-1',
    siteId: 'site-1',
    siteName: '현장 검사조건부 조회',
    type: '기능 추가',
    content: '검사일 및 건물명 기준으로 기간별 필터링하여 엑셀 다운로드할 수 있는 기능을 추가해주세요.',
    status: '작업중',
    createdAt: '2026-03-15T10:15:00.000Z',
  },
  {
    id: 'fb-2',
    siteId: 'site-3',
    siteName: '신고 및 보고 양식',
    type: '개선 의견',
    content: '신고 양식에서 자주 입력하는 조치 부품 항목을 드롭다운으로 자동 완성할 수 있으면 좋겠습니다.',
    status: '확인',
    createdAt: '2026-03-18T13:40:00.000Z',
  },
  {
    id: 'fb-3',
    siteId: 'site-2',
    siteName: '현장지도',
    type: '기능 추가',
    content: '현재 위치 반경 2km 이내 승강기만 우선 필터링하는 버튼이 추가되면 이동 시 편리할 것 같습니다.',
    status: '미처리',
    createdAt: '2026-03-19T17:20:00.000Z',
  },
];

export class StorageService {
  // Site operations
  static getSites(): Site[] {
    try {
      const raw = localStorage.getItem(SITES_STORAGE_KEY);
      let list: Site[] = [];
      if (!raw) {
        list = INITIAL_SITES;
      } else {
        list = JSON.parse(raw);
      }

      // Auto migrate "신고 내용 자동화 양식" -> "신고 및 보고 양식"
      let needsSave = !raw;
      list = list.map((site) => {
        if (
          site.id === 'site-3' ||
          site.name === '신고 내용 자동화 양식' ||
          site.name.includes('신고 내용 자동화')
        ) {
          needsSave = true;
          return {
            ...site,
            name: '신고 및 보고 양식',
            siteUrl: '#report-form',
          };
        }
        return site;
      });

      if (needsSave) {
        this.saveSites(list);
      }
      return list;
    } catch (e) {
      console.error('Failed to read sites from localStorage', e);
      return INITIAL_SITES;
    }
  }

  static saveSites(sites: Site[]): void {
    try {
      localStorage.setItem(SITES_STORAGE_KEY, JSON.stringify(sites));
    } catch (e) {
      console.error('Failed to save sites to localStorage', e);
    }
  }

  static addSite(siteData: Omit<Site, 'id' | 'createdAt'>): Site {
    const sites = this.getSites();
    const newSite: Site = {
      ...siteData,
      id: `site-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    sites.unshift(newSite);
    this.saveSites(sites);
    return newSite;
  }

  static updateSite(id: string, updates: Partial<Omit<Site, 'id' | 'createdAt'>>): Site | null {
    const sites = this.getSites();
    const index = sites.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updatedSite = { ...sites[index], ...updates };
    sites[index] = updatedSite;
    this.saveSites(sites);

    // Also update cached siteName in feedbacks if name changed
    if (updates.name) {
      const feedbacks = this.getFeedbacks();
      let feedbackChanged = false;
      const updatedFeedbacks = feedbacks.map((fb) => {
        if (fb.siteId === id) {
          feedbackChanged = true;
          return { ...fb, siteName: updates.name! };
        }
        return fb;
      });
      if (feedbackChanged) {
        this.saveFeedbacks(updatedFeedbacks);
      }
    }

    return updatedSite;
  }

  static deleteSite(id: string): boolean {
    const sites = this.getSites();
    const filtered = sites.filter((s) => s.id !== id);
    if (filtered.length === sites.length) return false;
    this.saveSites(filtered);
    return true;
  }

  static toggleFavorite(id: string): boolean {
    const sites = this.getSites();
    const site = sites.find((s) => s.id === id);
    if (!site) return false;
    site.favorite = !site.favorite;
    this.saveSites(sites);
    return site.favorite;
  }

  // Feedback operations
  static getFeedbacks(): Feedback[] {
    try {
      const raw = localStorage.getItem(FEEDBACKS_STORAGE_KEY);
      if (!raw) {
        this.saveFeedbacks(INITIAL_FEEDBACKS);
        return INITIAL_FEEDBACKS;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read feedbacks from localStorage', e);
      return INITIAL_FEEDBACKS;
    }
  }

  static saveFeedbacks(feedbacks: Feedback[]): void {
    try {
      localStorage.setItem(FEEDBACKS_STORAGE_KEY, JSON.stringify(feedbacks));
    } catch (e) {
      console.error('Failed to save feedbacks to localStorage', e);
    }
  }

  static addFeedback(feedbackData: Omit<Feedback, 'id' | 'createdAt'>): Feedback {
    const feedbacks = this.getFeedbacks();
    const newFeedback: Feedback = {
      ...feedbackData,
      id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    feedbacks.unshift(newFeedback);
    this.saveFeedbacks(feedbacks);
    return newFeedback;
  }

  static updateFeedbackStatus(id: string, status: FeedbackStatus): Feedback | null {
    const feedbacks = this.getFeedbacks();
    const target = feedbacks.find((f) => f.id === id);
    if (!target) return null;
    target.status = status;
    this.saveFeedbacks(feedbacks);
    return target;
  }

  static deleteFeedback(id: string): boolean {
    const feedbacks = this.getFeedbacks();
    const filtered = feedbacks.filter((f) => f.id !== id);
    if (filtered.length === feedbacks.length) return false;
    this.saveFeedbacks(filtered);
    return true;
  }

  // Backup and Restore
  static exportAllData(): string {
    const data = {
      sites: this.getSites(),
      feedbacks: this.getFeedbacks(),
      exportedAt: new Date().toISOString(),
      app: '대명엘리 GitHub 사이트 관리센터',
      version: '1.0.0',
    };
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.sites || !Array.isArray(parsed.sites)) {
        return { success: false, message: '올바른 백업 데이터 형식이 아닙니다 (sites 누락).' };
      }
      this.saveSites(parsed.sites);
      if (parsed.feedbacks && Array.isArray(parsed.feedbacks)) {
        this.saveFeedbacks(parsed.feedbacks);
      }
      return { success: true, message: `사이트 ${parsed.sites.length}개, 피드백 ${(parsed.feedbacks || []).length}개를 성공적으로 복원했습니다.` };
    } catch (e: any) {
      return { success: false, message: `데이터 파싱 오류: ${e?.message || '알 수 없는 오류'}` };
    }
  }

  static resetToDefaults(): void {
    this.saveSites(INITIAL_SITES);
    this.saveFeedbacks(INITIAL_FEEDBACKS);
  }
}
