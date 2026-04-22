'use client';
import { create } from 'zustand';

export interface AuthUser {
  _id: string;
  phone: string;
  /** Nomor baru yang menunggu verifikasi (tautan WA) */
  pendingPhone?: string | null;
  name: string;
  role: 'super_admin' | 'tenant_admin' | 'customer' | 'staff';
  tenantId?: string | null;
  staffId?: string | null;
  /** Dari JWT — tagihan langganan outlet melewati jatuh tempo (tenant admin & staff) */
  isOverdue?: boolean;
  /** Dari tenant aktif — untuk salinan UI per vertikal */
  tenantType?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isLoading: false });
  },

  loadFromStorage: () => {
    try {
      const token = localStorage.getItem('token');
      const raw = localStorage.getItem('user');
      if (token && raw) {
        const user = JSON.parse(raw) as AuthUser;
        set({ user, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
