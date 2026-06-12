import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Post } from '../types'

interface ContentState {
  posts: Post[]
  loading: boolean
  error: string | null
  fetchPosts: () => Promise<void>
  addPost: (post: Omit<Post, 'id' | 'created_at'>) => Promise<void>
  updatePost: (id: string, updates: Partial<Post>) => Promise<void>
  deletePost: (id: string) => Promise<void>
  clearError: () => void
}

export const useContentStore = create<ContentState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchPosts: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      set({ posts: data || [] })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch posts' })
    } finally {
      set({ loading: false })
    }
  },

  addPost: async (post) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([post])
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        posts: [data, ...state.posts],
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.message || 'Failed to create post', loading: false })
      throw err
    }
  },

  updatePost: async (id, updates) => {
    const previousPosts = [...get().posts]

    // Optimistic local update
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...updates } : p))
    }))

    try {
      const { error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    } catch (err: any) {
      // Rollback
      set({ posts: previousPosts, error: err.message || 'Failed to update post' })
      throw err
    }
  },

  deletePost: async (id) => {
    const previousPosts = [...get().posts]

    set((state) => ({
      posts: state.posts.filter((p) => p.id !== id)
    }))

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (err: any) {
      set({ posts: previousPosts, error: err.message || 'Failed to delete post' })
      throw err
    }
  }
}))
