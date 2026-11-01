/* Toasts (with optional Undo) and confirmation sheets, available from any screen. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill, Txt } from '@/ui/kit';
import { Sheet } from '@/ui/Sheet';
import { useTheme } from '@/ui/theme';

interface ToastOpts { action?: string; onAction?: () => void; ms?: number }
interface ConfirmOpts { title: string; message?: string; ok?: string; cancel?: string; danger?: boolean }

interface Feedback {
  toast: (msg: string, opts?: ToastOpts) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

const Ctx = createContext<Feedback | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [toastState, setToast] = useState<{ msg: string; opts: ToastOpts; key: number } | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, opts: ToastOpts = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, opts, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), opts.ms ?? 2600);
  }, []);

  useEffect(() => {
    opacity.setValue(0);
    if (toastState) Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [toastState, opacity]);

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []);
  const close = (v: boolean) => { dialog?.resolve(v); setDialog(null); };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastState ? (
        <Animated.View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 150, alignItems: 'center', opacity }}
        >
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 520, borderRadius: 999,
              backgroundColor: t.ink, paddingLeft: 18, paddingRight: toastState.opts.action ? 8 : 18, paddingVertical: 8,
            }}
          >
            <Txt v="bold" size={14} color={t.panel} style={{ flexShrink: 1 }}>{toastState.msg}</Txt>
            {toastState.opts.action ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => { setToast(null); toastState.opts.onAction?.(); }}
                style={{ backgroundColor: t.pink, borderRadius: 999, minHeight: 34, paddingHorizontal: 14, justifyContent: 'center' }}
              >
                <Txt v="heavy" size={14} color="#2b1530">{toastState.opts.action}</Txt>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
      <Sheet
        visible={!!dialog}
        onClose={() => close(false)}
        title={dialog?.title}
        footer={dialog ? (
          <>
            <Pill label={dialog.cancel || 'Cancel'} onPress={() => close(false)} style={{ flex: 1 }} />
            <Pill label={dialog.ok || 'OK'} kind={dialog.danger ? 'danger' : 'pink'} onPress={() => close(true)} style={{ flex: 1 }} />
          </>
        ) : null}
      >
        {dialog?.message ? <Txt color={t.ink2}>{dialog.message}</Txt> : null}
      </Sheet>
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFeedback outside FeedbackProvider');
  return v;
}
