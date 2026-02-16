import { SavedLesson } from '../types.ts';

const LIBRARY_KEY = 'ryuu_offline_library';

export const saveLessonToLibrary = (lesson: SavedLesson) => {
  const library = getLibrary();
  const existingIdx = library.findIndex(l => l.id === lesson.id);
  
  if (existingIdx >= 0) {
    // Update existing
    library[existingIdx] = { ...library[existingIdx], ...lesson };
  } else {
    library.push(lesson);
  }
  
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
};

export const getLibrary = (): SavedLesson[] => {
  const data = localStorage.getItem(LIBRARY_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteLessonFromLibrary = (id: string) => {
  const library = getLibrary();
  const filtered = library.filter(l => l.id !== id);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(filtered));
};

export const getLessonFromLibrary = (id: string): SavedLesson | undefined => {
  return getLibrary().find(l => l.id === id);
};