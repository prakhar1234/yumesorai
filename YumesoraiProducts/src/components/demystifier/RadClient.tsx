'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from './TopBar';

/* ── screen data ── */

interface Screen {
  id: string;
  label: string;
  elements: ScreenElement[];
}

interface ScreenElement {
  type: 'status-bar' | 'header' | 'search' | 'card' | 'list-item' | 'tab-bar' | 'button' | 'text' | 'input' | 'image-placeholder' | 'divider' | 'bottom-nav';
  text?: string;
  subtext?: string;
  icon?: string;
  items?: { icon: string; label: string; active?: boolean }[];
  badge?: string;
  variant?: string;
}

const SCREENS: Screen[] = [
  {
    id: 'home',
    label: 'Home',
    elements: [
      { type: 'status-bar' },
      { type: 'header', text: 'My App', icon: '=' },
      { type: 'search', text: 'Search...' },
      { type: 'card', text: 'Welcome back!', subtext: 'You have 3 new notifications', variant: 'accent' },
      { type: 'card', text: 'Quick Actions', subtext: 'View recent activity and manage your tasks' },
      { type: 'card', text: 'Analytics', subtext: 'Revenue up 12% this week', badge: '+12%' },
      { type: 'bottom-nav', items: [
        { icon: '\u2302', label: 'Home', active: true },
        { icon: '\u2605', label: 'Favorites' },
        { icon: '+', label: 'Create' },
        { icon: '\u263A', label: 'Profile' },
      ]},
    ],
  },
  {
    id: 'list',
    label: 'List View',
    elements: [
      { type: 'status-bar' },
      { type: 'header', text: 'Tasks', icon: '\u2190' },
      { type: 'list-item', text: 'Design system setup', subtext: 'In progress', badge: '\u25CF' },
      { type: 'list-item', text: 'API integration', subtext: 'Review needed' },
      { type: 'list-item', text: 'User authentication', subtext: 'Completed', badge: '\u2713' },
      { type: 'list-item', text: 'Push notifications', subtext: 'Planned' },
      { type: 'list-item', text: 'Offline support', subtext: 'Backlog' },
      { type: 'list-item', text: 'Analytics dashboard', subtext: 'In progress', badge: '\u25CF' },
      { type: 'button', text: '+ Add Task', variant: 'primary' },
      { type: 'bottom-nav', items: [
        { icon: '\u2302', label: 'Home' },
        { icon: '\u2605', label: 'Favorites' },
        { icon: '+', label: 'Create' },
        { icon: '\u263A', label: 'Profile' },
      ]},
    ],
  },
  {
    id: 'detail',
    label: 'Detail View',
    elements: [
      { type: 'status-bar' },
      { type: 'header', text: 'Task Detail', icon: '\u2190' },
      { type: 'image-placeholder', text: 'Preview Image' },
      { type: 'text', text: 'Design System Setup', variant: 'title' },
      { type: 'text', text: 'Create a unified component library with tokens for colors, typography, spacing, and elevation. Ensure cross-platform consistency.', variant: 'body' },
      { type: 'divider' },
      { type: 'text', text: 'Assignee', variant: 'label' },
      { type: 'text', text: 'Prakhar T.', variant: 'body' },
      { type: 'text', text: 'Due Date', variant: 'label' },
      { type: 'text', text: 'Nov 15, 2026', variant: 'body' },
      { type: 'divider' },
      { type: 'button', text: 'Mark Complete', variant: 'primary' },
      { type: 'button', text: 'Edit Task', variant: 'secondary' },
    ],
  },
  {
    id: 'form',
    label: 'Form',
    elements: [
      { type: 'status-bar' },
      { type: 'header', text: 'New Task', icon: '\u2190' },
      { type: 'text', text: 'Title', variant: 'label' },
      { type: 'input', text: 'Enter task name...' },
      { type: 'text', text: 'Description', variant: 'label' },
      { type: 'input', text: 'Add details...', variant: 'textarea' },
      { type: 'text', text: 'Priority', variant: 'label' },
      { type: 'card', text: 'Low  /  Medium  /  High', variant: 'toggle' },
      { type: 'text', text: 'Due Date', variant: 'label' },
      { type: 'input', text: 'Select date...' },
      { type: 'divider' },
      { type: 'button', text: 'Create Task', variant: 'primary' },
      { type: 'button', text: 'Cancel', variant: 'secondary' },
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    elements: [
      { type: 'status-bar' },
      { type: 'header', text: 'Profile', icon: '\u2190' },
      { type: 'card', text: 'PT', subtext: 'Prakhar Tripathi\nprakhar@yumesorai.com', variant: 'avatar' },
      { type: 'divider' },
      { type: 'list-item', text: 'Account Settings', icon: '\u2699' },
      { type: 'list-item', text: 'Notifications', icon: '\u266A', badge: '3' },
      { type: 'list-item', text: 'Privacy & Security', icon: '\u26BF' },
      { type: 'list-item', text: 'Help & Support', icon: '?' },
      { type: 'divider' },
      { type: 'list-item', text: 'Sign Out', icon: '\u2192' },
      { type: 'bottom-nav', items: [
        { icon: '\u2302', label: 'Home' },
        { icon: '\u2605', label: 'Favorites' },
        { icon: '+', label: 'Create' },
        { icon: '\u263A', label: 'Profile', active: true },
      ]},
    ],
  },
];

/* ── element renderer ── */

function PhoneElement({ el }: { el: ScreenElement }) {
  switch (el.type) {
    case 'status-bar':
      return (
        <div className="flex items-center justify-between px-5 pt-2 pb-1">
          <span className="text-[10px] text-white/60 font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>9:41</span>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-white/60">{'●●●●'}</span>
            <span className="text-[10px] text-white/60">5G</span>
            <span className="text-[10px] text-white/60">{'▮▮▮'}</span>
          </div>
        </div>
      );

    case 'header':
      return (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {el.icon && <span className="text-[16px] text-white/70">{el.icon}</span>}
            <span className="text-[16px] font-semibold text-white">{el.text}</span>
          </div>
          <span className="text-[14px] text-white/40">{'⋯'}</span>
        </div>
      );

    case 'search':
      return (
        <div className="mx-4 mb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08]">
            <span className="text-[12px] text-white/30">{'⌕'}</span>
            <span className="text-[12px] text-white/30">{el.text}</span>
          </div>
        </div>
      );

    case 'card':
      if (el.variant === 'avatar') {
        return (
          <div className="mx-4 mb-3 flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <div className="w-12 h-12 rounded-full bg-[#45c4b0]/20 flex items-center justify-center shrink-0">
              <span className="text-[14px] font-bold text-[#45c4b0]">{el.text}</span>
            </div>
            <div className="min-w-0">
              {el.subtext?.split('\n').map((line, i) => (
                <div key={i} className={i === 0 ? 'text-[13px] font-semibold text-white' : 'text-[11px] text-white/50 mt-0.5'}>{line}</div>
              ))}
            </div>
          </div>
        );
      }
      if (el.variant === 'toggle') {
        return (
          <div className="mx-4 mb-3 flex items-center justify-center gap-0 p-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            {el.text?.split('  /  ').map((opt, i) => (
              <span key={i} className={`flex-1 text-center py-1.5 rounded-md text-[11px] font-medium ${i === 1 ? 'bg-[#45c4b0]/20 text-[#45c4b0]' : 'text-white/40'}`}>{opt}</span>
            ))}
          </div>
        );
      }
      return (
        <div className={`mx-4 mb-3 p-4 rounded-xl border ${el.variant === 'accent' ? 'bg-[#45c4b0]/10 border-[#45c4b0]/20' : 'bg-white/[0.04] border-white/[0.08]'}`}>
          <div className="flex items-start justify-between">
            <span className={`text-[13px] font-semibold ${el.variant === 'accent' ? 'text-[#45c4b0]' : 'text-white'}`}>{el.text}</span>
            {el.badge && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">{el.badge}</span>
            )}
          </div>
          {el.subtext && <div className="text-[11px] text-white/50 mt-1">{el.subtext}</div>}
        </div>
      );

    case 'list-item':
      return (
        <div className="mx-4 mb-1 flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors">
          {el.icon && <span className="text-[14px] text-white/40 w-5 text-center">{el.icon}</span>}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-white/90">{el.text}</div>
            {el.subtext && <div className="text-[10px] text-white/40 mt-0.5">{el.subtext}</div>}
          </div>
          {el.badge && (
            <span className={`text-[10px] font-medium ${el.badge === '\u2713' ? 'text-emerald-400' : el.badge === '\u25CF' ? 'text-amber-400' : 'text-[#45c4b0] bg-[#45c4b0]/10 px-1.5 py-0.5 rounded-full'}`}>
              {el.badge}
            </span>
          )}
        </div>
      );

    case 'button':
      return (
        <div className="mx-4 mb-2">
          <div className={`w-full text-center py-2.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${
            el.variant === 'primary'
              ? 'bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3ab3a0]'
              : 'bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.1]'
          }`}>
            {el.text}
          </div>
        </div>
      );

    case 'text':
      return (
        <div className={`mx-4 ${el.variant === 'title' ? 'mb-1' : el.variant === 'label' ? 'mb-1 mt-3' : 'mb-2'}`}>
          <span className={`${
            el.variant === 'title' ? 'text-[16px] font-semibold text-white' :
            el.variant === 'label' ? 'text-[10px] font-medium text-white/40 uppercase tracking-wider' :
            'text-[12px] text-white/60 leading-relaxed'
          }`}>
            {el.text}
          </span>
        </div>
      );

    case 'input':
      return (
        <div className="mx-4 mb-3">
          <div className={`px-3 rounded-lg bg-white/[0.04] border border-white/[0.1] text-[12px] text-white/30 ${el.variant === 'textarea' ? 'py-3 min-h-[60px]' : 'py-2.5'}`}>
            {el.text}
          </div>
        </div>
      );

    case 'image-placeholder':
      return (
        <div className="mx-4 mb-3">
          <div className="w-full h-36 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <span className="text-[11px] text-white/20">{el.text}</span>
          </div>
        </div>
      );

    case 'divider':
      return <div className="mx-4 my-2 border-t border-white/[0.06]" />;

    case 'bottom-nav':
      return (
        <div className="mt-auto flex items-center justify-around px-2 py-2 border-t border-white/[0.08] bg-black/20">
          {el.items?.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <span className={`text-[16px] ${item.active ? 'text-[#45c4b0]' : 'text-white/30'}`}>{item.icon}</span>
              <span className={`text-[9px] ${item.active ? 'text-[#45c4b0] font-medium' : 'text-white/30'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

/* ── main client ── */

export function RadClient() {
  const router = useRouter();
  const [activeScreen, setActiveScreen] = useState('home');

  const handleProductChange = useCallback((product: string) => {
    if (product === 'demystifier') router.push('/demystifier');
    else if (product === 'codeflux') router.push('/demystifier/codeflux');
    else if (product === 'transformer') router.push('/demystifier/transformer');
    else if (product === 'business-review') router.push('/demystifier/business-review');
  }, [router]);

  const screen = SCREENS.find(s => s.id === activeScreen) || SCREENS[0];

  return (
    <div className="flex flex-col h-screen bg-[#0a0e14]">
      <TopBar activeProduct="rad" onProductChange={handleProductChange} />

      <div className="flex-1 flex overflow-hidden">
        {/* ── left: screen list ── */}
        <div className="w-56 border-r border-[#1e2736] bg-[#0c1018] flex flex-col">
          <div className="px-4 py-3 border-b border-[#1e2736]">
            <span className="text-[11px] font-semibold text-[#7a869a] uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Screens
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {SCREENS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveScreen(s.id)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
                  s.id === activeScreen
                    ? 'bg-[#182233] text-[#45c4b0]'
                    : 'text-[#9fb0c6] hover:bg-[#111823] hover:text-[#dbe4f0]'
                }`}
              >
                <span className="w-5 h-5 rounded bg-white/[0.06] flex items-center justify-center text-[10px]">
                  {s.id === 'home' ? '\u2302' : s.id === 'list' ? '\u2261' : s.id === 'detail' ? '\u25A2' : s.id === 'form' ? '+' : '\u263A'}
                </span>
                <span className="text-[12px] font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[#1e2736]">
            <div className="w-full text-center py-2 rounded-md text-[11px] font-medium text-[#45c4b0] border border-[#45c4b0]/20 bg-[#45c4b0]/5 hover:bg-[#45c4b0]/10 cursor-pointer transition-colors">
              + New Screen
            </div>
          </div>
        </div>

        {/* ── center: phone preview ── */}
        <div className="flex-1 flex items-center justify-center bg-[#080b10]">
          <div className="relative">
            {/* phone frame */}
            <div className="w-[300px] h-[620px] rounded-[36px] border-[3px] border-[#2a3140] bg-[#111823] shadow-2xl shadow-black/40 overflow-hidden flex flex-col">
              {/* notch */}
              <div className="flex justify-center pt-1.5">
                <div className="w-24 h-5 rounded-full bg-black/60" />
              </div>

              {/* screen content */}
              <div className="flex-1 flex flex-col overflow-y-auto pb-1">
                {screen.elements.map((el, i) => (
                  <PhoneElement key={i} el={el} />
                ))}
              </div>

              {/* home indicator */}
              <div className="flex justify-center pb-2">
                <div className="w-28 h-1 rounded-full bg-white/20" />
              </div>
            </div>
          </div>
        </div>

        {/* ── right: properties panel ── */}
        <div className="w-64 border-l border-[#1e2736] bg-[#0c1018] flex flex-col">
          <div className="px-4 py-3 border-b border-[#1e2736]">
            <span className="text-[11px] font-semibold text-[#7a869a] uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Properties
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* screen name */}
            <div>
              <label className="block text-[10px] font-medium text-[#7a869a] uppercase tracking-wider mb-1.5">Screen Name</label>
              <div className="px-3 py-2 rounded-md bg-[#111823] border border-[#232c3c] text-[12px] text-[#dbe4f0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {screen.label}
              </div>
            </div>
            {/* element count */}
            <div>
              <label className="block text-[10px] font-medium text-[#7a869a] uppercase tracking-wider mb-1.5">Elements</label>
              <div className="px-3 py-2 rounded-md bg-[#111823] border border-[#232c3c] text-[12px] text-[#dbe4f0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {screen.elements.length} components
              </div>
            </div>
            {/* screen type */}
            <div>
              <label className="block text-[10px] font-medium text-[#7a869a] uppercase tracking-wider mb-1.5">Type</label>
              <div className="px-3 py-2 rounded-md bg-[#111823] border border-[#232c3c] text-[12px] text-[#dbe4f0]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {screen.id === 'home' ? 'Dashboard' : screen.id === 'list' ? 'Collection' : screen.id === 'detail' ? 'Detail' : screen.id === 'form' ? 'Form Input' : 'Settings'}
              </div>
            </div>
            {/* components breakdown */}
            <div>
              <label className="block text-[10px] font-medium text-[#7a869a] uppercase tracking-wider mb-1.5">Component Breakdown</label>
              <div className="space-y-1">
                {Object.entries(
                  screen.elements.reduce<Record<string, number>>((acc, el) => {
                    acc[el.type] = (acc[el.type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between px-3 py-1.5 rounded bg-[#111823] border border-[#1e2736]">
                    <span className="text-[10px] text-[#9fb0c6]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{type}</span>
                    <span className="text-[10px] text-[#5b6577]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
