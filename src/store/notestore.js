import { create } from 'zustand'

export const useNoteStore = create((set) => ({
  notes: JSON.parse(localStorage.getItem('sb-notes') || '[]'),

  addNote() {
    const note = {
      id: Date.now(),
      title: 'Untitled note',
      content: '',
      date: new Date().toLocaleDateString(),
    }
    set((s) => {
      const notes = [note, ...s.notes]
      localStorage.setItem('sb-notes', JSON.stringify(notes))
      return { notes }
    })
    return note.id
  },

  updateNote(id, patch) {
    set((s) => {
      const notes = s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n))
      localStorage.setItem('sb-notes', JSON.stringify(notes))
      return { notes }
    })
  },

  deleteNote(id) {
    set((s) => {
      const notes = s.notes.filter((n) => n.id !== id)
      localStorage.setItem('sb-notes', JSON.stringify(notes))
      return { notes }
    })
  },
}))