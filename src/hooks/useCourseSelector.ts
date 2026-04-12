import { useState, useEffect, useRef, useCallback } from 'react';
import {
  searchCourseGroups,
  getCourseHoles,
  getSlopeDetail,
  getElevationDetail,
  type CourseSearchResult,
  type GreenRenderDetail,
  type ScoringHole,
} from '../lib/golfIntelligence';

const LS_COURSE   = 'gi-selected-course';   // JSON-encoded CourseSearchResult
const LS_HOLE_NUM = 'gi-selected-hole';      // number string

function readCourse(): CourseSearchResult | null {
  try {
    const v = localStorage.getItem(LS_COURSE);
    return v ? (JSON.parse(v) as CourseSearchResult) : null;
  } catch {
    return null;
  }
}

function readHoleNum(): number {
  const v = localStorage.getItem(LS_HOLE_NUM);
  const n = v ? parseInt(v, 10) : NaN;
  return isNaN(n) ? 1 : n;
}

export type ImageMode = 'slope' | 'elevation';

export interface CourseSelectorState {
  // Search
  query: string;
  setQuery: (q: string) => void;
  searchResults: CourseSearchResult[];
  searching: boolean;
  searchError: string | null;

  // Selected course
  selectedCourse: CourseSearchResult | null;
  selectCourse: (c: CourseSearchResult) => void;
  clearCourse: () => void;

  // Holes
  holes: ScoringHole[];
  holesLoading: boolean;
  selectedHoleNum: number;
  setSelectedHoleNum: (n: number) => void;

  // Image
  imageMode: ImageMode;
  setImageMode: (m: ImageMode) => void;
  renderDetail: GreenRenderDetail | null;
  imageLoading: boolean;
  imageError: string | null;
  loadImage: () => void;
}

export function useCourseSelector(): CourseSelectorState {
  const [query, setQueryRaw] = useState('');
  const [searchResults, setSearchResults] = useState<CourseSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<CourseSearchResult | null>(readCourse);
  const [holes, setHoles] = useState<ScoringHole[]>([]);
  const [holesLoading, setHolesLoading] = useState(false);

  const [selectedHoleNum, setSelectedHoleNumRaw] = useState<number>(readHoleNum);

  const [imageMode, setImageMode] = useState<ImageMode>('slope');
  const [renderDetail, setRenderDetail] = useState<GreenRenderDetail | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced course search ─────────────────────────────────────────────────
  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
    setSearchError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCourseGroups(q.trim());
        setSearchResults(results);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : 'Search failed');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  // ── Select a course → fetch its holes ──────────────────────────────────────
  const selectCourse = useCallback((c: CourseSearchResult) => {
    setSelectedCourse(c);
    setSearchResults([]);
    setQueryRaw('');
    setRenderDetail(null);
    setImageError(null);
    localStorage.setItem(LS_COURSE, JSON.stringify(c));

    setHolesLoading(true);
    getCourseHoles(c.publicId)
      .then(h => {
        setHoles(h);
        // Clamp selected hole to valid range for this course
        setSelectedHoleNumRaw(prev => {
          const clamped = h.find(x => x.holeNumber === prev) ? prev : (h[0]?.holeNumber ?? 1);
          localStorage.setItem(LS_HOLE_NUM, String(clamped));
          return clamped;
        });
      })
      .catch(() => setHoles([]))
      .finally(() => setHolesLoading(false));
  }, []);

  // Reload holes on mount if we have a persisted course
  useEffect(() => {
    if (selectedCourse && holes.length === 0) {
      setHolesLoading(true);
      getCourseHoles(selectedCourse.publicId)
        .then(setHoles)
        .catch(() => setHoles([]))
        .finally(() => setHolesLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearCourse = useCallback(() => {
    setSelectedCourse(null);
    setHoles([]);
    setRenderDetail(null);
    setImageError(null);
    localStorage.removeItem(LS_COURSE);
  }, []);

  const setSelectedHoleNum = useCallback((n: number) => {
    setSelectedHoleNumRaw(n);
    setRenderDetail(null);
    setImageError(null);
    localStorage.setItem(LS_HOLE_NUM, String(n));
  }, []);

  // ── Load green image (explicit user action, costs 1 credit) ────────────────
  const loadImage = useCallback(async () => {
    if (!selectedCourse) { setImageError('No course selected'); return; }
    if (holes.length === 0) { setImageError('Holes not loaded yet — please wait'); return; }

    const hole = holes.find(h => h.holeNumber === selectedHoleNum);
    if (!hole) { setImageError(`Hole ${selectedHoleNum} not found in course data`); return; }

    setImageLoading(true);
    setImageError(null);
    try {
      const detail = imageMode === 'slope'
        ? await getSlopeDetail(hole.holeId)
        : await getElevationDetail(hole.holeId);
      setRenderDetail(detail);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Failed to load image');
    } finally {
      setImageLoading(false);
    }
  }, [selectedCourse, holes, selectedHoleNum, imageMode]);

  // Auto-reload image when mode changes (if we already had one loaded)
  useEffect(() => {
    if (renderDetail) loadImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageMode]);

  return {
    query, setQuery,
    searchResults, searching, searchError,
    selectedCourse, selectCourse, clearCourse,
    holes, holesLoading,
    selectedHoleNum, setSelectedHoleNum,
    imageMode, setImageMode,
    renderDetail, imageLoading, imageError, loadImage,
  };
}
