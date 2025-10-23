"use client";

import { useState, useEffect } from 'react';
import { AppState, TabType, User, JobAnalysis, CVAnalysis, MatchResult } from '@/lib/types';
import Cookies from 'js-cookie';

const initialState: AppState = {
  currentTab: 'welcome',
  user: null,
  isAuthenticated: false,
  jobAnalysis: null,
  cvAnalysis: null,
  matchResult: null,
  userProfile: {
    name: '',
    email: '',
    phone: '',
    education: '',
    extraActivities: ''
  }
};

export function useAppState() {
  const [state, setState] = useState<AppState>(initialState);

  // Carregar estado do localStorage na inicialização
  useEffect(() => {
    const savedState = localStorage.getItem('cv-analyzer-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setState(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Erro ao carregar estado:', error);
      }
    }

    // Verificar autenticação via cookie
    const authToken = Cookies.get('auth-token');
    if (authToken) {
      setState(prev => ({ 
        ...prev, 
        isAuthenticated: true,
        user: { 
          id: '1', 
          name: 'Usuário', 
          email: 'usuario@email.com', 
          createdAt: new Date() 
        }
      }));
    }
  }, []);

  // Salvar estado no localStorage sempre que mudar
  useEffect(() => {
    const stateToSave = {
      currentTab: state.currentTab,
      jobAnalysis: state.jobAnalysis,
      cvAnalysis: state.cvAnalysis,
      matchResult: state.matchResult,
      userProfile: state.userProfile
    };
    localStorage.setItem('cv-analyzer-state', JSON.stringify(stateToSave));
  }, [state]);

  const setCurrentTab = (tab: TabType) => {
    setState(prev => ({ ...prev, currentTab: tab }));
  };

  const login = (user: User) => {
    setState(prev => ({ 
      ...prev, 
      user, 
      isAuthenticated: true,
      currentTab: 'welcome'
    }));
    Cookies.set('auth-token', 'dummy-token', { expires: 7 });
  };

  const logout = () => {
    setState(initialState);
    localStorage.removeItem('cv-analyzer-state');
    Cookies.remove('auth-token');
  };

  const setJobAnalysis = (analysis: JobAnalysis) => {
    setState(prev => ({ ...prev, jobAnalysis: analysis }));
  };

  const setCVAnalysis = (analysis: CVAnalysis) => {
    setState(prev => ({ 
      ...prev, 
      cvAnalysis: analysis,
      userProfile: {
        name: analysis.candidate.name,
        email: analysis.candidate.email,
        phone: analysis.candidate.phone,
        education: analysis.candidate.education,
        extraActivities: analysis.candidate.extraActivities
      }
    }));
  };

  const setMatchResult = (result: MatchResult) => {
    setState(prev => ({ ...prev, matchResult: result }));
  };

  const updateUserProfile = (profile: Partial<AppState['userProfile']>) => {
    setState(prev => ({ 
      ...prev, 
      userProfile: { ...prev.userProfile, ...profile }
    }));
  };

  const resetAnalysis = () => {
    setState(prev => ({
      ...prev,
      jobAnalysis: null,
      cvAnalysis: null,
      matchResult: null,
      currentTab: 'welcome'
    }));
  };

  return {
    state,
    setCurrentTab,
    login,
    logout,
    setJobAnalysis,
    setCVAnalysis,
    setMatchResult,
    updateUserProfile,
    resetAnalysis
  };
}