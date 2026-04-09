# Vidstack Player UX Audit & Improvement Checklist

**Last Updated:** April 9, 2026  
**Status:** Based on Vidstack documentation and industry best practices

---

## 📋 Current Implementation Analysis

### ✅ Strengths
- Modern React integration with Vidstack hooks
- Proper gesture handling (click to play/pause, double-click for fullscreen)
- Responsive mobile-aware controls
- Context menu with advanced options
- Settings menu with comprehensive options
- Good accessibility foundation (ARIA labels, keyboard support)
- Touch-friendly button sizing on mobile
- Auto-hide controls on desktop with configurable delays

### ⚠️ Areas for Improvement

---

## 🎯 UX Improvement Checklist

### 1. **Touch Target Sizing (Accessibility - WCAG 2.1 44x44px minimum)**

**Current State:**
- Desktop buttons: `h-12 w-12` (48x48px) ✅ Good
- Mobile buttons: `h-11 w-11` (44x44px) marginal
- Some elements use `min-w-11` which is cramped

**Recommendations:**
- [ ] Increase mobile button targets to minimum 48x48px for better UX
- [ ] Add padding around interactive areas to meet WCAG AAA (48x48px+)
- [ ] Use container queries to adapt button sizing based on player width
- [ ] Test with large fingers on actual mobile devices

**Code Example:**
```tsx
// Current: h-11 (44px)
// Recommended: h-12 (48px) minimum
const TOUCH_ICON_BTN = 'h-12 min-w-12 px-3'; // Changed from h-11, min-w-11
```

---

### 2. **Mobile Controls Layout Optimization**

**Current State:**
- Volume slider takes up space on mobile (known issue from Vidstack discussions)
- Time display hidden on small viewports
- Compact controls cramped at ~390px

**Recommendations:**
- [ ] Hide volume slider entirely on viewports < 576px
- [ ] Show volume as icon-button only on mobile (tap to open vertical slider)
- [ ] Implement vertical volume slider in settings instead of inline
- [ ] Reduce control bar height on mobile from 44px to 40px
- [ ] Stack controls vertically on extremely narrow viewports

**Code Example:**
```tsx
// Hide volume slider on small screens
showInlineVolumeControl = !isCompactViewport || isRemoteActive;
// But show mute button regardless
showMuteButton = true;
```

---

### 3. **Gesture Enhancements (Multi-touch Gestures)**

**Current State:**
- Single tap: Play/Pause
- Double tap: Fullscreen
- Right-click: Context menu

**Missing Gestures (Vidstack Supports):**
- Swipe left/right: Seek forward/backward
- Swipe up/down: Volume control
- Three-finger tap: Settings menu
- Long press: Show timeline preview

**Recommendations:**
- [ ] Add swipe-to-seek gesture (±10-30 seconds)
- [ ] Add pinch-to-zoom for fullscreen content
- [ ] Add long-press for showing timeline thumbnails
- [ ] Disable gestures when menus are open
- [ ] Provide visual feedback for gesture actions

**Code Example:**
```tsx
// Swipe handlers (add to PlayerControlLayer)
const [lastTouchX, setLastTouchX] = useState(0);
const handleTouchStart = (e) => setLastTouchX(e.touches[0].clientX);
const handleTouchEnd = (e) => {
  const diff = lastTouchX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    seekBySeconds(diff > 0 ? 10 : -10); // Swipe left = forward, right = back
  }
};
```

---

### 4. **Focus Management & Keyboard Navigation**

**Current State:**
- Keyboard shortcuts implemented ✅
- Tab navigation works ✅

**Gaps:**
- No focus trap in modal/settings menus
- Focus doesn't auto-return after closing menu
- No announcement of menu state changes (accessibility)

**Recommendations:**
- [ ] Implement focus trap in settings popup (FocusScope)
- [ ] Return focus to settings button when menu closes
- [ ] Add `aria-expanded` to menu buttons
- [ ] Announce menu open/close to screen readers
- [ ] Use `useAnnouncer` from Vidstack for state changes
- [ ] Add skip-to-content keyboard shortcut

**Code Example:**
```tsx
// After menu closes, return focus
const handleSettingsClose = () => {
  setSettingsView(null);
  settingsRef.current?.querySelector('button')?.focus();
};
```

---

### 5. **Loading & Buffering States**

**Current State:**
- Shows spinner text "Đang tải"
- Basic buffered progress bar

**Recommendations:**
- [ ] Show visual buffering indicator (animated dots or spinner)
- [ ] Display buffer percentage in player stats
- [ ] Implement network prediction (when buffering happens frequently)
- [ ] Add "retry" button on network error
- [ ] Show fallback message for unsuitable networks

**Code Example:**
```tsx
// Enhanced buffering state
{waiting || seeking ? (
  <motion.div className="absolute inset-0 z-10 flex items-center justify-center">
    <Spinner className="h-12 w-12 animate-spin" />
    <span className="ml-2">{bufferedPercent.toFixed(0)}%</span>
  </motion.div>
) : null}
```

---

### 6. **Mobile Control Bar Positioning**

**Current State:**
- Controls slide up from bottom (good UX)
- Gradient overlays prevent reading text under buttons

**Recommendations:**
- [ ] Add safe area insets for notched devices (iPhone, Android)
- [ ] Implement `padding-bottom: max(1rem, env(safe-area-inset-bottom))`
- [ ] Test on iOS with home indicator
- [ ] Adjust gradient height for better text visibility
- [ ] Hide top gradient on mobile to show episode label

**Code Example:**
```css
/* In globals.css or component */
video-player {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

@supports (padding: max(1px)) {
  .player-controls {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

---

### 7. **Quality & Subtitle Selection UX**

**Current State:**
- Settings menu with submenu navigation
- Auto quality selection available

**Recommendations:**
- [ ] Show current quality in bottom-right badge (after controls hide)
- [ ] Add quick quality toggle for common selections (720p, 1080p, Auto)
- [ ] Persist quality selection in localStorage
- [ ] Add network indicator (current bandwidth speed)
- [ ] Show subtitle track count in main menu
- [ ] Implement subtitle preview on hover

**Code Example:**
```tsx
// Persist quality selection
useEffect(() => {
  if (quality?.height) {
    localStorage.setItem('preferred-quality', quality.height.toString());
  }
}, [quality]);
```

---

### 8. **Mobile Landscape Orientation Handling**

**Current State:**
- Fullscreen works, but controls might overlap
- Video can be played in landscape

**Recommendations:**
- [ ] Detect orientation change and auto-fullscreen on landscape
- [ ] Hide non-essential buttons in landscape (time display on very small screens)
- [ ] Adjust control bar height for landscape (36px instead of 44px)
- [ ] Implement landscape-specific layout using CSS Container Queries
- [ ] Always show settings button in landscape

**Code Example:**
```tsx
useEffect(() => {
  const handleOrientationChange = () => {
    if (window.innerHeight < window.innerWidth) {
      // Landscape
      player?.enterFullscreen();
    }
  };
  window.addEventListener('orientationchange', handleOrientationChange);
  return () => window.removeEventListener('orientationchange', handleOrientationChange);
}, [player]);
```

---

### 9. **Control Visibility Improvements**

**Current State:**
- Desktop: 900ms hide delay ✅
- Mobile: 1800ms hide delay ✅
- Shows on pause, seeking, ended

**Recommendations:**
- [ ] Show controls on ANY user interaction (click, tap, keyboard)
- [ ] Don't hide while user is interacting with slider
- [ ] Implement smart hide (hide faster if not interacting with controls)
- [ ] Add visual indicator when controls will auto-hide (countdown)
- [ ] Option to "pin" controls (toggle persistent mode)
- [ ] Show controls immediately on fullscreen exit

---

### 10. **Error Handling & Recovery**

**Current State:**
- Shows error state, but limited recovery options
- No indication of what went wrong

**Recommendations:**
- [ ] Implement retry mechanism with exponential backoff
- [ ] Show detailed error messages (network error, codec unsupported, etc.)
- [ ] Add fallback source switching automatically
- [ ] Implement error tracking/logging
- [ ] Graceful degradation (try different formats/codecs)
- [ ] Show helpful suggestions based on error type

**Code Example:**
```tsx
// Error mapping and recovery
const getErrorMessage = (error) => {
  if (!error) return null;
  if (error.code === 'NETWORK_ERROR') {
    return 'Lỗi mạng. Kiểm tra kết nối internet.';
  }
  if (error.code === 'UNSUPPORTED_CODEC') {
    return 'Định dạng video không được hỗ trợ. Thử nguồn khác.';
  }
  return 'Lỗi phát video.';
};
```

---

### 11. **Subtitle/Caption Improvements**

**Current State:**
- Basic subtitle toggle in settings
- Shows "Tắt" (Off) option

**Recommendations:**
- [ ] Add caption size control (small, normal, large)
- [ ] Implement caption style customization (background, font color)
- [ ] Auto-enable captions if user has hearing loss (prefers-reduced-hearing)
- [ ] Show default language subtitles automatically
- [ ] Implement WebVTT cue positioning (don't overlap with controls)
- [ ] Add caption search functionality for long videos

---

### 12. **Picture-in-Picture (PiP) Enhancements**

**Current State:**
- PiP button available in context menu
- PiP toggle in settings

**Recommendations:**
- [ ] Show PiP button in control bar on desktop (remove from context only)
- [ ] Add keyboard shortcut (P key) with announcement
- [ ] Remember PiP preference
- [ ] Implement resizable PiP window
- [ ] Allow dragging PiP window on desktop
- [ ] Show PiP indicator when active

---

### 13. **Tooltips & Help Text**

**Current State:**
- Basic title attributes on buttons
- Settings menu has descriptive text

**Recommendations:**
- [ ] Implement animated Vidstack `Tooltip` component
- [ ] Show keyboard shortcuts in tooltips
- [ ] Delay tooltip appearance (300-500ms on hover)
- [ ] Position tooltips above controls (not overlapping)
- [ ] Add "?" help button with player feature overview
- [ ] Implement keyboard shortcut cheat sheet (existing, but enhance)

---

### 14. **Performance & Animations**

**Current State:**
- Smooth Framer Motion animations ✅
- Good initial render performance

**Recommendations:**
- [ ] Respect `prefers-reduced-motion` media query
- [ ] Throttle control visibility updates
- [ ] Debounce resize/orientation handlers
- [ ] Lazy-load settings menu on first open
- [ ] Use `will-change` CSS for animated elements
- [ ] Monitor layout shifts (CLS metric)

**Code Example:**
```tsx
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const animationDuration = prefersReducedMotion ? 0 : 0.3;
```

---

### 15. **Mobile Fallback for Old Browsers**

**Current State:**
- No fallback UI for browsers without Vidstack support

**Recommendations:**
- [ ] Implement feature detection with graceful fallback
- [ ] Use native HTML5 video controls as fallback
- [ ] Provide alternative embedded player option
- [ ] Test on older Safari (iOS 12+), older Android Chrome
- [ ] Document browser support matrix

---

## 🔍 Testing Checklist

- [ ] Test on iOS Safari (iPhone 12, 14, latest)
- [ ] Test on Chrome Android (multiple screen sizes)
- [ ] Test on Firefox Android
- [ ] Test with physical keyboard (external keyboards)
- [ ] Test with screen reader (VoiceOver, TalkBack, NVDA)
- [ ] Test with network throttling (Fast 3G, Slow 3G, Offline)
- [ ] Test with touch events (no mouse)
- [ ] Test on tablet landscape/portrait
- [ ] Test with `prefers-reduced-motion` enabled
- [ ] Test with high contrast mode enabled
- [ ] Performance audit (Lighthouse)
- [ ] Accessibility audit (axe DevTools)

---

## 📚 Vidstack Reference Links

- [Accessibility Guidelines](https://vidstack.io/docs/player/getting-started/accessibility/)
- [Responsive Design Patterns](https://vidstack.io/docs/player/styling/responsive-design/)
- [Gesture Component](https://vidstack.io/docs/player/components/display/gesture/)
- [Controls Component](https://vidstack.io/docs/player/components/display/controls/)
- [Keyboard API](https://vidstack.io/docs/player/api/keyboard/)
- [GitHub Discussions](https://github.com/vidstack/player/discussions)
- [Default Layout Reference](https://vidstack.io/docs/player/components/layouts/default-layout/)

---

## 🚀 Implementation Priority

### High (Do First)
1. Touch target sizing (accessibility compliance)
2. Mobile controls layout optimization (volume slider)
3. Gesture enhancements (swipe-to-seek)
4. Error handling improvements
5. Orientation handling for mobile

### Medium (Do Next)
6. Focus management & keyboard navigation
7. Loading/buffering state improvements
8. Quality persistence
9. Tooltip animations
10. Safe area insets for notched devices

### Low (Nice to Have)
11. Advanced subtitle features
12. PiP window resizing
13. Network speed indicator
14. Caption customization

---

## ✨ Notes

- Current implementation is **solid foundational work**
- Focus on **mobile UX improvements** will yield best results
- **Accessibility** should be prioritized for compliance
- Consider user testing on actual devices to validate improvements
- Monitor analytics for user interaction patterns
