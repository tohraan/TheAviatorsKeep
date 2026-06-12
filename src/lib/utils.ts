import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, addHours } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert UTC timestamp (e.g. timestamptz) to GST (UTC+4) and format
export function formatGST(dateString: string | null | undefined, formatStr: string = 'dd/MM/yyyy HH:mm') {
  if (!dateString) return '-'
  try {
    const date = parseISO(dateString)
    const gstDate = addHours(date, 4)
    return format(gstDate, formatStr)
  } catch (e) {
    return '-'
  }
}

// Format date-only columns (e.g. "2026-06-12") directly
export function formatLocalDate(dateString: string | null | undefined, formatStr: string = 'dd/MM/yyyy') {
  if (!dateString) return '-'
  try {
    const date = parseISO(dateString)
    return format(date, formatStr)
  } catch (e) {
    return '-'
  }
}
